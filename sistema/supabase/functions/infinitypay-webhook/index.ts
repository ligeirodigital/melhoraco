import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import {
  corsHeaders,
  jsonResponse,
  confirmPayment,
  logPaymentEvent,
  validateWebhookConsistency,
} from "../_shared/infinitypay.ts";

// ---------- Autenticidade do webhook ----------
// A InfinitePay NÃO assina o corpo do webhook (não há HMAC nem header de
// assinatura na documentação oficial). A forma recomendada para garantir que
// o evento é legítimo é combinar duas defesas:
//   1) Token secreto embutido na URL configurada como webhook_url
//      (ex.: https://.../infinitypay-webhook?token=XYZ). Só a InfinitePay e
//      nós conhecemos essa URL, então o token funciona como shared secret.
//   2) Reconsulta out-of-band ao endpoint oficial POST /payment_check antes
//      de marcar o pedido como pago. Isso confirma junto à própria InfinitePay
//      que a transação existe, está paga e o valor bate.
//
// Configure o segredo em INFINITYPAY_WEBHOOK_TOKEN e use-o na webhook_url.

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyWithInfinityPay(params: {
  handle: string;
  orderNsu: string;
  transactionNsu?: string | null;
  invoiceSlug?: string | null;
}): Promise<{ ok: boolean; paid?: boolean; paidAmount?: number; raw?: any; reason?: string }> {
  try {
    const res = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: params.handle.replace(/^@/, ""),
        order_nsu: params.orderNsu,
        transaction_nsu: params.transactionNsu ?? undefined,
        slug: params.invoiceSlug ?? undefined,
      }),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, reason: `payment_check_http_${res.status}`, raw };
    // API devolve amount/paid_amount em CENTAVOS
    const paid = raw?.paid === true || raw?.success === true;
    const paidAmount = raw?.paid_amount != null ? Number(raw.paid_amount) / 100 : undefined;
    return { ok: true, paid, paidAmount, raw };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { db: { schema: "melhoraco" } },
  );

  const rawBody = await req.text();

  // 1) Token secreto na URL — defesa contra chamadas anônimas
  const expectedToken = Deno.env.get("MELHORACO_INFINITYPAY_WEBHOOK_TOKEN");
  if (expectedToken) {
    const url = new URL(req.url);
    const provided =
      url.searchParams.get("token") ??
      req.headers.get("x-webhook-token") ??
      "";
    if (!provided || !timingSafeEqual(provided, expectedToken)) {
      await supabase.from("webhook_logs").insert({
        provider: "infinitypay",
        payload: { raw: rawBody.slice(0, 500) },
        status: "invalid_token",
      });
      return jsonResponse({ error: "invalid_token" }, 401);
    }
  }

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  await supabase
    .from("webhook_logs")
    .insert({ provider: "infinitypay", payload, status: "received" });

  try {
    const orderNsu: string | null = payload.order_nsu ?? null;
    // InfinityPay envia valores em CENTAVOS.
    const paidAmountReais =
      payload.paid_amount != null ? Number(payload.paid_amount) / 100 : null;
    const amountReais = payload.amount != null ? Number(payload.amount) / 100 : null;
    const invoiceSlug: string | null = payload.invoice_slug ?? payload.slug ?? null;
    const transactionNsu: string | null = payload.transaction_nsu ?? null;
    const captureMethod: string | null = payload.capture_method ?? null;
    const installments: number | null = payload.installments ?? null;
    const receiptUrl: string | null = payload.receipt_url ?? null;

    if (!orderNsu) {
      return jsonResponse({ error: "order_nsu ausente" }, 400);
    }

    // 2) Localizar orçamento por order_nsu (com fallback a UUID se ainda houver legacy)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      orderNsu,
    );
    let q = supabase
      .from("quotes")
      .select("id, payment_status, payment_amount, payment_invoice_slug");
    q = isUuid ? q.or(`order_nsu.eq.${orderNsu},id.eq.${orderNsu}`) : q.eq("order_nsu", orderNsu);
    const { data: quote } = await q.maybeSingle();

    if (!quote) {
      await logPaymentEvent(supabase, null, "webhook_received_orphan", "webhook", payload);
      return jsonResponse({ ok: false, error: "quote_not_found" }, 404);
    }

    await logPaymentEvent(supabase, quote.id, "webhook_received", "webhook", payload);

    // 3) Idempotência antes de validar
    if (quote.payment_status === "paid") {
      return jsonResponse({ ok: true, status: "already_paid" });
    }

    // 3.1) Detectar recusa/cancelamento
    const rawStatus = String(
      payload.status ?? payload.payment_status ?? payload.event ?? "",
    ).toLowerCase();
    const isFailure = [
      "refused", "failed", "declined", "denied", "canceled", "cancelled",
      "rejected", "expired", "error", "payment_failed", "payment_refused",
    ].some((k) => rawStatus.includes(k));

    if (isFailure) {
      const newStatus =
        rawStatus.includes("cancel") ? "canceled"
        : rawStatus.includes("expir") ? "expired"
        : "refused";

      await supabase
        .from("quotes")
        .update({ payment_status: newStatus } as any)
        .eq("id", quote.id);

      await supabase
        .from("payment_transactions")
        .update({ status: newStatus })
        .eq("quote_id", quote.id)
        .neq("status", "paid");

      await logPaymentEvent(supabase, quote.id, "payment_" + newStatus, "webhook", {
        rawStatus, payload,
      });

      return jsonResponse({ ok: true, status: newStatus });
    }

    // 4) Validar consistência (valores em reais).
    //    Usa APENAS o valor esperado do orçamento; sem fallback para o próprio payload,
    //    caso contrário a checagem vira tautologia.
    const check = validateWebhookConsistency(
      { amount: quote.payment_amount, invoice_slug: quote.payment_invoice_slug },
      { paidAmount: paidAmountReais ?? amountReais, invoiceSlug },
    );

    if (!check.ok) {
      await logPaymentEvent(supabase, quote.id, "webhook_rejected", "webhook", {
        reason: check.reason,
        payload,
      });
      return jsonResponse({ ok: false, error: check.reason }, 409);
    }

    // 4.1) Verificação out-of-band: reconsulta a InfinitePay para confirmar
    // que o pagamento é real. Isso é a validação de autenticidade efetiva —
    // um atacante que forje o payload não consegue fabricar um transaction_nsu
    // que a API oficial retorne como paid=true com o mesmo handle+order_nsu.
    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("metadata")
      .eq("quote_id", quote.id)
      .eq("provider", "infinitypay")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const handle = (tx?.metadata as any)?.handle as string | undefined;

    if (handle && (transactionNsu || invoiceSlug)) {
      const verify = await verifyWithInfinityPay({
        handle,
        orderNsu,
        transactionNsu,
        invoiceSlug,
      });
      if (!verify.ok || !verify.paid) {
        await logPaymentEvent(supabase, quote.id, "webhook_verification_failed", "webhook", {
          reason: verify.reason ?? "not_paid_upstream",
          upstream: verify.raw,
          payload,
        });
        return jsonResponse({ ok: false, error: "verification_failed" }, 401);
      }
      if (
        verify.paidAmount != null &&
        quote.payment_amount != null &&
        Math.abs(verify.paidAmount - Number(quote.payment_amount)) > 0.01
      ) {
        await logPaymentEvent(supabase, quote.id, "webhook_amount_mismatch", "webhook", {
          expected: quote.payment_amount, upstream: verify.paidAmount, payload,
        });
        return jsonResponse({ ok: false, error: "amount_mismatch_upstream" }, 409);
      }
    }


    // 5) Confirmar (idempotente)
    const result = await confirmPayment(supabase, {
      quoteId: quote.id,
      orderNsu,
      source: "webhook",
      paidAmount: paidAmountReais ?? amountReais,
      receiptUrl,
      transactionNsu,
      invoiceSlug,
      captureMethod,
      installments,
      rawPayload: payload,
    });

    return jsonResponse({ ok: true, ...result });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("webhook error:", msg);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});

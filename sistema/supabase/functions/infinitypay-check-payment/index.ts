import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import {
  corsHeaders,
  jsonResponse,
  confirmPayment,
  logPaymentEvent,
} from "../_shared/infinitypay.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { db: { schema: "melhoraco" } },
  );

  try {
    // Auth JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { db: { schema: "melhoraco" }, global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claims?.claims) return jsonResponse({ error: "Unauthorized" }, 401);
    const userEmail = (claims.claims as any).email as string | undefined;

    const { quoteId, manual, receiptUrl, captureMethod } = await req.json();
    if (!quoteId) return jsonResponse({ error: "quoteId obrigatório" }, 400);

    // Carrega orçamento + tx mais recente
    const { data: quote } = await supabase
      .from("quotes")
      .select(
        "id, user_id, payment_status, payment_amount, order_nsu, payment_invoice_slug",
      )
      .eq("id", quoteId)
      .maybeSingle();

    if (!quote) return jsonResponse({ error: "Orçamento não encontrado" }, 404);

    // Idempotência
    if (quote.payment_status === "paid") {
      return jsonResponse({ status: "paid", source: "cache" });
    }

    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("quote_id", quoteId)
      .eq("provider", "infinitypay")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tx) return jsonResponse({ error: "Nenhuma transação InfinityPay" }, 404);

    // ============ Modo manual ============
    if (manual) {
      await logPaymentEvent(supabase, quoteId, "manual_confirmation", "manual", {
        by: userEmail,
      });
      const result = await confirmPayment(supabase, {
        quoteId,
        orderNsu: quote.order_nsu,
        source: "manual",
        paidAmount: Number(tx.amount),
        receiptUrl: receiptUrl || tx.payment_link || null,
        captureMethod: captureMethod || "manual",
        confirmedBy: userEmail,
      });
      return jsonResponse({ status: result.status, source: "manual" });
    }

    // ============ Consulta oficial /payment_check ============
    const handle =
      (tx.metadata && (tx.metadata as any).handle) || undefined;
    const orderNsu = quote.order_nsu || tx.order_nsu || quoteId;
    const slug = quote.payment_invoice_slug || tx.invoice_slug || undefined;

    let apiData: any = null;
    let apiOk = false;

    try {
      const r = await fetch(
        "https://api.checkout.infinitepay.io/payment_check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: handle ? String(handle).replace(/^[@$]+/, "") : undefined,
            order_nsu: orderNsu,
            transaction_nsu: tx.transaction_nsu || undefined,
            slug,
          }),
        },
      );
      apiOk = r.ok;
      apiData = await r.json().catch(() => null);
    } catch (e) {
      console.error("payment_check fetch error:", (e as Error).message);
    }

    await supabase
      .from("payment_transactions")
      .update({ checked_at: new Date().toISOString() })
      .eq("id", tx.id);

    await logPaymentEvent(supabase, quoteId, "payment_check", "payment_check", {
      apiOk,
      apiData,
    });

    // Doc oficial: { success, paid, amount, paid_amount, installments, capture_method } — valores em CENTAVOS.
    const paid = apiOk && apiData && apiData.paid === true;

    if (paid) {
      const paidAmountReais =
        apiData.paid_amount != null ? Number(apiData.paid_amount) / 100 : Number(tx.amount);
      const result = await confirmPayment(supabase, {
        quoteId,
        orderNsu,
        source: "payment_check",
        paidAmount: paidAmountReais,
        receiptUrl: apiData.receipt_url ?? null,
        transactionNsu: apiData.transaction_nsu ?? null,
        invoiceSlug: apiData.invoice_slug ?? apiData.slug ?? slug ?? null,
        captureMethod: apiData.capture_method ?? null,
        installments: apiData.installments ?? null,
        confirmedBy: userEmail,
        rawPayload: apiData,
      });
      return jsonResponse({ status: result.status, source: "payment_check" });
    }

    return jsonResponse({
      status: "pending",
      source: apiOk ? "payment_check" : "unavailable",
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("check-payment error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});

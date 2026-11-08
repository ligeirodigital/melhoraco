// Utilitários compartilhados da integração InfinityPay.
// Centraliza confirmação de pagamento (idempotente), geração de order_nsu
// e registro de eventos de auditoria.

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export interface ConfirmPaymentInput {
  orderNsu?: string | null;
  quoteId?: string | null;
  source: "webhook" | "payment_check" | "manual";
  paidAmount?: number | null;
  receiptUrl?: string | null;
  transactionNsu?: string | null;
  invoiceSlug?: string | null;
  captureMethod?: string | null;
  installments?: number | null;
  paidAt?: string | null;
  confirmedBy?: string | null;
  rawPayload?: unknown;
}

export interface ConfirmPaymentResult {
  status: "paid" | "already_paid" | "not_found" | "mismatch";
  quoteId?: string;
  reason?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const corsHeaders = CORS_HEADERS;

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Gera identificador legível: MEL-YYYYMMDD-XXXXXX */
export function generateOrderNsu(seed?: string): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const base = (seed || crypto.randomUUID()).replace(/[^a-zA-Z0-9]/g, "");
  const suffix = base.slice(0, 6).toUpperCase().padEnd(6, "0");
  return `MEL-${y}${m}${day}-${suffix}`;
}

/** Registra evento na tabela payment_events (falha silenciosa). */
export async function logPaymentEvent(
  supabase: SupabaseClient,
  quoteId: string | null | undefined,
  event: string,
  source: string,
  payload?: unknown,
): Promise<void> {
  if (!quoteId) return;
  try {
    await supabase.from("payment_events").insert({
      quote_id: quoteId,
      event,
      source,
      payload: (payload ?? null) as unknown,
    });
  } catch (e) {
    console.error("logPaymentEvent failed:", (e as Error).message);
  }
}

/**
 * Confirmação idempotente. Nunca atualiza duas vezes.
 * Localiza o orçamento por quoteId OU order_nsu.
 */
export async function confirmPayment(
  supabase: SupabaseClient,
  input: ConfirmPaymentInput,
): Promise<ConfirmPaymentResult> {
  const {
    orderNsu,
    quoteId: quoteIdIn,
    source,
    paidAmount,
    receiptUrl,
    transactionNsu,
    invoiceSlug,
    captureMethod,
    installments,
    paidAt,
    confirmedBy,
    rawPayload,
  } = input;

  // 1) Localizar orçamento
  let quoteQuery = supabase
    .from("quotes")
    .select(
      "id, user_id, payment_status, payment_amount, order_nsu, payment_invoice_slug, payment_transaction_nsu",
    );

  if (quoteIdIn) quoteQuery = quoteQuery.eq("id", quoteIdIn);
  else if (orderNsu) quoteQuery = quoteQuery.eq("order_nsu", orderNsu);
  else return { status: "not_found", reason: "missing_identifier" };

  const { data: quote, error: qErr } = await quoteQuery.maybeSingle();
  if (qErr || !quote) {
    return { status: "not_found", reason: qErr?.message || "quote_not_found" };
  }

  // 2) Idempotência
  if (quote.payment_status === "paid") {
    return { status: "already_paid", quoteId: quote.id };
  }

  const nowIso = new Date().toISOString();
  const confirmedAt = paidAt || nowIso;

  // 3) Atualiza quote — só grava campos vindos na confirmação (não sobrescreve com null)
  const quotePatch: Record<string, unknown> = {
    payment_status: "paid",
    payment_date: confirmedAt,
    status: "aprovado",
    payment_method: "infinitypay",
    confirmed_source: source,
    payment_checked_at: nowIso,
    updated_at: nowIso,
  };
  if (paidAmount != null) quotePatch.payment_amount = paidAmount;
  if (installments != null) quotePatch.payment_installments = installments;
  if (transactionNsu) quotePatch.payment_transaction_nsu = transactionNsu;
  if (invoiceSlug) quotePatch.payment_invoice_slug = invoiceSlug;
  if (receiptUrl) quotePatch.payment_receipt_url = receiptUrl;
  await supabase.from("quotes").update(quotePatch).eq("id", quote.id);


  // 4) Atualiza payment_transactions (mais recente do orçamento)
  const { data: tx } = await supabase
    .from("payment_transactions")
    .select("id, metadata, status")
    .eq("quote_id", quote.id)
    .eq("provider", "infinitypay")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tx && tx.status !== "paid") {
    const metadata = {
      ...(tx.metadata || {}),
      paid_amount: paidAmount,
      receipt_url: receiptUrl,
      transaction_nsu: transactionNsu,
      invoice_slug: invoiceSlug,
      capture_method: captureMethod,
      installments,
      paid_at: confirmedAt,
      confirmed_by: confirmedBy,
      raw: rawPayload,
    };
    const txPatch: Record<string, unknown> = {
      status: "paid",
      paid_amount: paidAmount ?? null,
      transaction_nsu: transactionNsu ?? null,
      invoice_slug: invoiceSlug ?? null,
      capture_method: captureMethod ?? null,
      confirmed_source: source,
      checked_at: nowIso,
      metadata,
    };
    if (source === "webhook") txPatch.webhook_received_at = nowIso;
    await supabase.from("payment_transactions").update(txPatch).eq("id", tx.id);
  }

  // 5) Auditoria
  try {
    await supabase.rpc("log_activity", {
      p_action: "payment_confirmed",
      p_entity_type: "quote",
      p_entity_id: quote.id,
      p_details: {
        provider: "infinitypay",
        source,
        amount: paidAmount,
        transaction_nsu: transactionNsu,
        invoice_slug: invoiceSlug,
        capture_method: captureMethod,
        installments,
        receipt_url: receiptUrl,
        confirmed_by: confirmedBy,
      },
    });
  } catch (e) {
    console.error("log_activity failed:", (e as Error).message);
  }

  await logPaymentEvent(supabase, quote.id, "payment_confirmed", source, {
    paidAmount,
    transactionNsu,
    invoiceSlug,
    captureMethod,
  });

  return { status: "paid", quoteId: quote.id };
}

/** Validação de consistência antes de confirmar via webhook. */
export function validateWebhookConsistency(
  expected: {
    amount?: number | null;
    invoice_slug?: string | null;
    transaction_nsu?: string | null;
  },
  received: {
    paidAmount?: number | null;
    invoiceSlug?: string | null;
    transactionNsu?: string | null;
  },
): { ok: boolean; reason?: string } {
  if (
    expected.amount != null &&
    received.paidAmount != null &&
    Math.abs(Number(expected.amount) - Number(received.paidAmount)) > 0.01
  ) {
    return { ok: false, reason: "amount_mismatch" };
  }
  if (
    expected.invoice_slug &&
    received.invoiceSlug &&
    expected.invoice_slug !== received.invoiceSlug
  ) {
    return { ok: false, reason: "invoice_slug_mismatch" };
  }
  return { ok: true };
}

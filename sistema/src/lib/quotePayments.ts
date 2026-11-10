import { supabase } from "@/integrations/supabase/client";
import { computeQuoteTotals, roundMoney } from "@/lib/quoteCalculations";

/** Pagamento registrado em um pedido (uma linha por valor recebido). */
export type PaymentKind = "sinal" | "parcial" | "saldo";

export interface QuotePayment {
  id: string;
  quote_id: string;
  kind: PaymentKind;
  amount: number;
  paid_at: string;
  method: string | null;
  note: string | null;
  created_at: string;
}

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  sinal: "Sinal",
  parcial: "Pagamento parcial",
  saldo: "Saldo",
};

/** Tabela ainda não está no tipo gerado do Supabase: acesso tipado manualmente. */
const table = () => (supabase as any).from("quote_payments");

export function quotePaymentsKey(quoteId: string) {
  return ["quote-payments", quoteId] as const;
}

export async function fetchQuotePayments(quoteId: string): Promise<QuotePayment[]> {
  const { data, error } = await table().select("*").eq("quote_id", quoteId).order("paid_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as QuotePayment[] | null) || []).map((p) => ({ ...p, amount: Number(p.amount) }));
}

export async function createQuotePayment(input: {
  quoteId: string;
  kind: PaymentKind;
  amount: number;
  paidAt: string;
  method?: string | null;
  note?: string | null;
}): Promise<void> {
  const { error } = await table().insert({
    quote_id: input.quoteId,
    kind: input.kind,
    amount: roundMoney(input.amount),
    paid_at: input.paidAt,
    method: input.method || null,
    note: input.note || null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteQuotePayment(id: string): Promise<void> {
  const { error } = await table().delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Totais de um pedido a partir dos pagamentos registrados. */
export function summarizePayments(payments: QuotePayment[], total: number) {
  const received = roundMoney(payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0));
  const remaining = Math.max(0, roundMoney(total - received));
  return { received, remaining, paid: total > 0 && remaining <= 0 };
}

/** Recebido até (inclusive) um pagamento, na ordem cronológica. */
export function receivedUpTo(payments: QuotePayment[], payment: QuotePayment): number {
  const ordered = [...payments].sort((a, b) => a.paid_at.localeCompare(b.paid_at));
  let acc = 0;
  for (const p of ordered) {
    acc += Number(p.amount) || 0;
    if (p.id === payment.id) break;
  }
  return roundMoney(acc);
}

/**
 * Espelha os botões de "recebido" (sinal, saldo, quitação) nos lançamentos.
 * Marcar cria o lançamento do tipo, se ainda não existir; desmarcar remove os lançamentos do tipo.
 * O saldo considera o que já foi recebido em outros lançamentos (sinal e parciais).
 */
export async function syncLedgerKind(quoteId: string, kind: "sinal" | "saldo", paidAt: string | null): Promise<void> {
  if (!paidAt) {
    const { error } = await table().delete().eq("quote_id", quoteId).eq("kind", kind);
    if (error) throw new Error(error.message);
    return;
  }

  const existing = await fetchQuotePayments(quoteId);
  if (existing.some((p) => p.kind === kind)) return;

  const { data: quote, error: quoteError } = await (supabase as any)
    .from("quotes")
    .select("*, quote_items(*)")
    .eq("id", quoteId)
    .single();
  if (quoteError) throw new Error(quoteError.message);

  const totals = computeQuoteTotals({ ...quote, items: quote.quote_items } as any);
  const others = existing.filter((p) => p.kind !== "saldo").reduce((acc, p) => acc + Number(p.amount), 0);
  const amount = kind === "sinal" ? totals.downPayment : Math.max(0, roundMoney(totals.total - others));
  if (amount <= 0) return;

  await createQuotePayment({ quoteId, kind, amount, paidAt, method: null });
}

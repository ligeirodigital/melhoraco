import { supabase } from "@/integrations/supabase/client";
import { roundMoney } from "@/lib/quoteCalculations";

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

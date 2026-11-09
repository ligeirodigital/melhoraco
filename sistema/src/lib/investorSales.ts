import { supabase } from "@/integrations/supabase/client";
import { computeQuoteTotals } from "@/lib/quoteCalculations";

/** Venda (orçamento aprovado) como o investidor vê: somente leitura. */
export interface InvestorSaleItem {
  product_name: string | null;
  quantity: number;
  unit_price: number;
  unit_discount: number | null;
  unit_discount_type: string | null;
}

interface RawSale {
  id: string;
  sale_date: string;
  client_name: string | null;
  delivery_fee: number | null;
  installation_fee: number | null;
  discount_type: string | null;
  discount_amount: number | null;
  down_payment: number | null;
  remaining_balance: number | null;
  payment_status: string | null;
  down_payment_paid_at: string | null;
  final_payment_paid_at: string | null;
  payment_date: string | null;
  items: InvestorSaleItem[];
}

export type SalePaymentState = "pago" | "sinal_pago" | "a_receber";

export const SALE_PAYMENT_LABEL: Record<SalePaymentState, string> = {
  pago: "Pago",
  sinal_pago: "Sinal pago",
  a_receber: "A receber",
};

export interface InvestorSale {
  id: string;
  date: string;
  /** "YYYY-MM" no horário de Fortaleza. */
  month: string;
  clientName: string;
  items: { name: string; quantity: number }[];
  total: number;
  received: number;
  toReceive: number;
  payment: SalePaymentState;
}

/** Mês ("YYYY-MM") de uma data, no fuso de Fortaleza (UTC-3). */
export function monthOf(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "Números de inox 15 cm (9)" → "Números de inox 15 cm": junta os caracteres do mesmo modelo. */
export function baseProductName(name: string | null | undefined): string {
  return (name || "").replace(/\s*\([^)]*\)\s*$/, "").trim() || "Produto";
}

function groupItems(items: InvestorSaleItem[]): { name: string; quantity: number }[] {
  const map = new Map<string, number>();
  for (const i of items) {
    const name = baseProductName(i.product_name);
    map.set(name, (map.get(name) || 0) + (Number(i.quantity) || 0));
  }
  return [...map.entries()].map(([name, quantity]) => ({ name, quantity }));
}

export function toInvestorSale(raw: RawSale): InvestorSale {
  const totals = computeQuoteTotals(raw as never);
  const hasDown = totals.downPayment > 0;
  const fullyPaid =
    raw.payment_status === "paid" ||
    (!!raw.final_payment_paid_at && (!hasDown || !!raw.down_payment_paid_at)) ||
    (!hasDown && !!raw.payment_date);
  const downPaid = hasDown && !!raw.down_payment_paid_at;
  const payment: SalePaymentState = fullyPaid ? "pago" : downPaid ? "sinal_pago" : "a_receber";
  const received = payment === "pago" ? totals.total : payment === "sinal_pago" ? totals.downPayment : 0;
  return {
    id: raw.id,
    date: raw.sale_date,
    month: monthOf(raw.sale_date),
    clientName: raw.client_name?.trim() || "Cliente",
    items: groupItems(raw.items || []),
    total: totals.total,
    received,
    toReceive: Math.max(0, Math.round((totals.total - received) * 100) / 100),
    payment,
  };
}

export async function fetchInvestorSales(): Promise<InvestorSale[]> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("get_investor_sales");
  if (error) throw new Error(error.message);
  return ((data as RawSale[] | null) || []).map(toInvestorSale);
}

export interface MonthSummary {
  month: string;
  revenue: number;
  count: number;
  received: number;
  toReceive: number;
  averageTicket: number;
}

/** Resumo por mês, do mais recente para o mais antigo. */
export function summarizeByMonth(sales: InvestorSale[]): MonthSummary[] {
  const map = new Map<string, MonthSummary>();
  for (const s of sales) {
    const m = map.get(s.month) || { month: s.month, revenue: 0, count: 0, received: 0, toReceive: 0, averageTicket: 0 };
    m.revenue += s.total;
    m.count += 1;
    m.received += s.received;
    m.toReceive += s.toReceive;
    map.set(s.month, m);
  }
  return [...map.values()]
    .map((m) => ({ ...m, averageTicket: m.count ? m.revenue / m.count : 0 }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

/** Produtos mais vendidos (por quantidade) num conjunto de vendas. */
export function topProducts(sales: InvestorSale[], limit = 5): { name: string; quantity: number }[] {
  const map = new Map<string, number>();
  for (const s of sales) for (const i of s.items) map.set(i.name, (map.get(i.name) || 0) + i.quantity);
  return [...map.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

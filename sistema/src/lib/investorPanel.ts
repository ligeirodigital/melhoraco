import { supabase } from "@/integrations/supabase/client";

export interface InvestorPanelMonth {
  month: string; // "YYYY-MM"
  net_profit: number;
  share_percentage: number;
  amount: number;
}

export interface InvestorPanelTransaction {
  id: string;
  date: string;
  type: "deposit" | "withdrawal";
  amount: number;
  description: string | null;
}

export type WithdrawalStatus = "pendente" | "pago" | "recusado" | "cancelado";

export interface WithdrawalRequest {
  id: string;
  amount: number;
  pix_key: string | null;
  note: string | null;
  status: WithdrawalStatus;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
}

export interface InvestorPanel {
  investor: { id: string; name: string; share_percentage: number };
  balance: number;
  pending: number;
  available: number;
  synced_at: string | null;
  months: InvestorPanelMonth[];
  transactions: InvestorPanelTransaction[];
  requests: WithdrawalRequest[];
}

// As funções RPC abaixo são novas e ainda não estão nos tipos gerados.
const rpc = supabase.rpc as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function fetchMyInvestorPanel(): Promise<InvestorPanel | null> {
  const { data, error } = await rpc("get_my_investor_panel");
  if (error) throw new Error(error.message);
  return (data as InvestorPanel | null) ?? null;
}

export async function requestWithdrawal(amount: number, pixKey: string, note: string) {
  const { data, error } = await rpc("request_withdrawal", { p_amount: amount, p_pix_key: pixKey, p_note: note });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function cancelWithdrawal(id: string) {
  const { error } = await rpc("cancel_withdrawal", { p_id: id });
  if (error) throw new Error(error.message);
}

export async function decideWithdrawal(id: string, paid: boolean, note?: string) {
  const { error } = await rpc("decide_withdrawal", { p_id: id, p_paid: paid, p_note: note ?? null });
  if (error) throw new Error(error.message);
}

export interface SnapshotRow {
  investor_id: string;
  month: string;
  net_profit: number;
  share_percentage: number;
  amount: number;
}

export async function syncInvestorSnapshots(rows: SnapshotRow[]) {
  const { error } = await rpc("sync_investor_profit_snapshots", { p_rows: rows });
  if (error) throw new Error(error.message);
}

/** Pedidos de saque de todos os investidores (somente administradores, via RLS). */
export async function fetchWithdrawalRequests() {
  const { data, error } = await supabase
    .from("withdrawal_requests" as never)
    .select("id, amount, pix_key, note, status, created_at, decided_at, decision_note, investor:investor_id(name)")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Array<WithdrawalRequest & { investor: { name: string } | null }>;
}

export const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} de ${y}`;
};

export const WITHDRAWAL_STATUS_LABEL: Record<WithdrawalStatus, string> = {
  pendente: "Em análise",
  pago: "Pago",
  recusado: "Recusado",
  cancelado: "Cancelado",
};

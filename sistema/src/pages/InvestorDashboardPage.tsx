import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fetchMyInvestorPanel, formatBRL, monthLabel } from "@/lib/investorPanel";
import { fetchInvestorSales, monthOf, summarizeByMonth, topProducts, type MonthSummary } from "@/lib/investorSales";

/** Mês anterior a "YYYY-MM". */
function previousMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Últimos `n` meses terminando em `ym`, do mais antigo para o mais novo. */
function lastMonths(ym: string, n: number): string[] {
  const out = [ym];
  while (out.length < n) out.unshift(previousMonth(out[0]));
  return out;
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const shortMonth = (ym: string) => capitalize(monthLabel(ym).slice(0, 3));
const axisBRL = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : v.toLocaleString("pt-BR"));

/** Visão geral da empresa para o investidor. Somente leitura. */
export default function InvestorDashboardPage() {
  const salesQuery = useQuery({ queryKey: ["investor-sales"], queryFn: fetchInvestorSales, staleTime: 60_000, refetchOnWindowFocus: true });
  const panelQuery = useQuery({ queryKey: ["my-investor-panel"], queryFn: fetchMyInvestorPanel, staleTime: 30_000 });

  const current = monthOf(new Date().toISOString());
  const prev = previousMonth(current);
  const sales = salesQuery.data || [];
  const byMonth = useMemo(() => new Map(summarizeByMonth(sales).map((m) => [m.month, m])), [sales]);
  const empty = (month: string): MonthSummary => ({ month, revenue: 0, count: 0, received: 0, toReceive: 0, averageTicket: 0 });
  const now = byMonth.get(current) || empty(current);
  const before = byMonth.get(prev) || empty(prev);
  const toReceiveAll = sales.reduce((acc, s) => acc + s.toReceive, 0);
  const top = topProducts(sales.filter((s) => s.month === current));

  const profitByMonth = new Map((panelQuery.data?.months || []).map((m) => [m.month, m]));
  const chart = lastMonths(current, 6).map((month) => ({
    month,
    label: shortMonth(month),
    revenue: Math.round((byMonth.get(month)?.revenue || 0) * 100) / 100,
    profit: Math.round((profitByMonth.get(month)?.net_profit || 0) * 100) / 100,
  }));
  const thisProfit = profitByMonth.get(current);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6 min-w-0">
        <header className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Visão geral</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">{capitalize(monthLabel(current))}</p>
        </header>

        {salesQuery.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : salesQuery.isError ? (
          <Card className="rounded-3xl"><CardContent className="p-6 space-y-3 text-center">
            <p className="font-black text-slate-900">Não conseguimos carregar os números agora.</p>
            <Button onClick={() => salesQuery.refetch()}>Tentar de novo</Button>
          </CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="Vendido no mês" value={formatBRL(now.revenue)} current={now.revenue} previous={before.revenue} />
              <Kpi label="Vendas no mês" value={String(now.count)} current={now.count} previous={before.count} />
              <Kpi label="Ticket médio" value={formatBRL(now.averageTicket)} current={now.averageTicket} previous={before.averageTicket} />
              <Kpi label="A receber (total)" value={formatBRL(toReceiveAll)} />
              {thisProfit && (
                <>
                  <Kpi label="Lucro do mês" value={formatBRL(thisProfit.net_profit)} />
                  <Kpi label="Sua comissão no mês" value={formatBRL(thisProfit.amount)} tone="text-emerald-600" />
                </>
              )}
            </div>

            <Card className="rounded-3xl border-slate-200">
              <CardContent className="p-5 space-y-3">
                <div>
                  <p className="font-black text-slate-900">Vendido por mês</p>
                  <p className="text-xs text-slate-500">Últimos 6 meses, em reais{panelQuery.data?.months?.length ? ", com o lucro de cada mês" : ""}</p>
                </div>
                <div className="h-56 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} width={52} tickFormatter={(v) => axisBRL(Number(v))} />
                      <Tooltip formatter={(v, name) => [formatBRL(Number(v)), name === "revenue" ? "Vendido" : "Lucro"]} labelFormatter={(_, p) => (p?.[0] ? capitalize(monthLabel(p[0].payload.month)) : "")} />
                      <Bar dataKey="revenue" fill="#0f172a" radius={[6, 6, 0, 0]} />
                      {panelQuery.data?.months?.length ? <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} /> : null}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-900" />Vendido</span>
                  {panelQuery.data?.months?.length ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" />Lucro</span> : null}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200">
              <CardContent className="p-5 space-y-3">
                <p className="font-black text-slate-900">Mais vendidos no mês</p>
                {top.length === 0 ? (
                  <p className="text-sm text-slate-500">Ainda sem vendas neste mês.</p>
                ) : (
                  <ul className="space-y-2">
                    {top.map((p) => (
                      <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-slate-700">{p.name}</span>
                        <span className="font-black tabular-nums text-slate-900 shrink-0">{p.quantity}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}

function Kpi({ label, value, current, previous, tone }: { label: string; value: string; current?: number; previous?: number; tone?: string }) {
  const showTrend = current !== undefined && previous !== undefined && previous > 0;
  const change = showTrend ? ((current! - previous!) / previous!) * 100 : 0;
  return (
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="p-4 space-y-1">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className={cn("text-lg sm:text-xl font-black tabular-nums break-words", tone || "text-slate-900")}>{value}</p>
        {showTrend && (
          <p className={cn("text-xs font-bold flex items-center gap-1", change >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {change >= 0 ? "+" : ""}{change.toFixed(0)}% vs mês anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShoppingBag } from "lucide-react";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBRL, monthLabel } from "@/lib/investorPanel";
import { fetchInvestorSales, SALE_PAYMENT_LABEL, summarizeByMonth, type SalePaymentState } from "@/lib/investorSales";

const PAYMENT_STYLE: Record<SalePaymentState, string> = {
  pago: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sinal_pago: "bg-amber-50 text-amber-700 border-amber-200",
  a_receber: "bg-slate-100 text-slate-600 border-slate-200",
};

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Fortaleza" });

/** Vendas da empresa para o investidor acompanhar. Somente leitura: não há edição. */
export default function InvestorSalesPage() {
  const salesQuery = useQuery({ queryKey: ["investor-sales"], queryFn: fetchInvestorSales, staleTime: 60_000, refetchOnWindowFocus: true });
  const sales = salesQuery.data || [];
  const months = useMemo(() => summarizeByMonth(sales), [sales]);
  const [selected, setSelected] = useState<string | null>(null);
  const month = selected ?? months[0]?.month ?? null;
  const summary = months.find((m) => m.month === month);
  const visible = sales.filter((s) => s.month === month).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6 min-w-0">
        <header className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Vendas da empresa</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Vendas</h1>
          <p className="text-sm text-slate-500">Pedidos aprovados, para acompanhar. Esta tela é só de consulta.</p>
        </header>

        {salesQuery.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : salesQuery.isError ? (
          <Card className="rounded-3xl"><CardContent className="p-6 space-y-3 text-center">
            <p className="font-black text-slate-900">Não conseguimos carregar as vendas agora.</p>
            <Button onClick={() => salesQuery.refetch()}>Tentar de novo</Button>
          </CardContent></Card>
        ) : months.length === 0 ? (
          <Card className="rounded-3xl"><CardContent className="p-6 text-center text-slate-500">Ainda não há vendas aprovadas.</CardContent></Card>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {months.map((m) => (
                <button key={m.month} type="button" onClick={() => setSelected(m.month)}
                  className={cn("shrink-0 rounded-full border px-4 h-10 text-sm font-bold",
                    m.month === month ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200")}>
                  {capitalize(monthLabel(m.month))}
                </button>
              ))}
            </div>

            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Vendido" value={formatBRL(summary.revenue)} />
                <Stat label="Vendas" value={String(summary.count)} />
                <Stat label="Recebido" value={formatBRL(summary.received)} tone="text-emerald-600" />
                <Stat label="A receber" value={formatBRL(summary.toReceive)} />
              </div>
            )}

            <div className="space-y-3">
              {visible.map((s) => (
                <Card key={s.id} className="rounded-2xl border-slate-200">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 truncate">{s.clientName}</p>
                        <p className="text-xs text-slate-400">{fmtDay(s.date)} · Pedido #{s.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <p className="font-black tabular-nums text-slate-900 shrink-0">{formatBRL(s.total)}</p>
                    </div>
                    <ul className="text-sm text-slate-600 space-y-0.5">
                      {s.items.map((i) => (
                        <li key={i.name} className="flex gap-2"><ShoppingBag className="w-4 h-4 mt-0.5 text-slate-300 shrink-0" /><span className="min-w-0">{i.quantity}× {i.name}</span></li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", PAYMENT_STYLE[s.payment])}>{SALE_PAYMENT_LABEL[s.payment]}</span>
                      {s.payment === "sinal_pago" && <span className="text-xs text-slate-500">Falta {formatBRL(s.toReceive)}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="p-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className={cn("text-lg font-black tabular-nums break-words", tone || "text-slate-900")}>{value}</p>
      </CardContent>
    </Card>
  );
}

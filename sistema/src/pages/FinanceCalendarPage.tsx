import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjectData } from "@/hooks/useProjectData";
import { formatCurrency, getQuoteTotal } from "@/lib/formatQuote";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowDownRight, ArrowUpRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { reportError } from "@/lib/reportError";

type Entry = {
  id: string;
  date: Date;
  amount: number;
  kind: "in" | "out";
  label: string;
  source: string;
  status?: string;
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function monthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default function FinanceCalendarPage() {
  const { user } = useAuth();
  const { quotes, settings } = useProjectData();
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [selected, setSelected] = useState<Date | null>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);

  const expenses = useQuery({
    queryKey: ["direct-expenses", user?.id, monthStart.toISOString(), monthEnd.toISOString()],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_expenses")
        .select("*")
        .gte("expense_date", monthStart.toISOString())
        .lte("expense_date", monthEnd.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const payments = useQuery({
    queryKey: ["payment-transactions", user?.id, monthStart.toISOString(), monthEnd.toISOString()],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const receivables = useQuery({
    queryKey: ["receivables", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_flow_transactions")
        .select("*")
        .eq("type", "income")
        .not("installment_number", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const entries: Entry[] = useMemo(() => {
    const list: Entry[] = [];

    const provisionedQuoteIds = new Set((receivables.data || []).map((r) => r.quote_id).filter(Boolean));

    // A receber: vendas aprovadas sem um cronograma parcelado próprio.
    for (const q of quotes.data || []) {
      if (q.status !== "aprovado") continue;
      if (provisionedQuoteIds.has(q.id)) continue;
      const d = new Date(q.created_at);
      if (d < monthStart || d > monthEnd) continue;
      list.push({
        id: `quote-${q.id}`,
        date: d,
        amount: getQuoteTotal(q as any),
        kind: "in",
        label: (q as any).clients?.name || "Cliente",
        source: "Orçamento aprovado",
      });
    }

    // Parcelas provisionadas: pendentes na data de vencimento; pagas na data recebida.
    for (const r of receivables.data || []) {
      const rawDate = r.status === "pago" && r.paid_at ? r.paid_at : (r.due_date || r.transaction_date);
      const d = new Date(rawDate);
      if (d < monthStart || d > monthEnd) continue;
      list.push({
        id: `receivable-${r.id}`,
        date: d,
        amount: Number(r.amount || 0),
        kind: "in",
        label: r.description,
        source: r.status === "pago" ? "Recebido" : "A receber",
        status: r.status ?? "pendente",
      });
    }

    // Pagamentos confirmados no mês
    for (const p of payments.data || []) {
      if ((p as any).status !== "paid" && (p as any).status !== "approved") continue;
      if (provisionedQuoteIds.has((p as any).quote_id)) continue;
      const d = new Date((p as any).paid_at || (p as any).created_at);
      if (d < monthStart || d > monthEnd) continue;
      list.push({
        id: `pay-${(p as any).id}`,
        date: d,
        amount: Number((p as any).amount || 0),
        kind: "in",
        label: `Pagamento ${(p as any).method || ""}`.trim(),
        source: (p as any).invoice_slug || (p as any).order_nsu || "",
      });
    }

    // A pagar: despesas diretas
    for (const ex of expenses.data || []) {
      const d = new Date((ex as any).expense_date);
      list.push({
        id: `exp-${(ex as any).id}`,
        date: d,
        amount: Number((ex as any).amount || 0),
        kind: "out",
        label: (ex as any).description || "Despesa",
        source: (ex as any).category || "Direta",
      });
    }

    // Custos fixos mensais projetados dia 5
    const monthlyFixed = Number(settings.data?.monthly_expenses || 0);
    if (monthlyFixed > 0) {
      list.push({
        id: `fixed-${cursor.getFullYear()}-${cursor.getMonth()}`,
        date: new Date(cursor.getFullYear(), cursor.getMonth(), 5),
        amount: monthlyFixed,
        kind: "out",
        label: "Custos fixos mensais",
        source: "business_settings",
      });
    }

    return list.filter((e) => filter === "all" || e.kind === filter);
  }, [quotes.data, payments.data, receivables.data, expenses.data, settings.data, monthStart.getTime(), monthEnd.getTime(), filter, cursor]);

  const totalsIn = entries.filter((e) => e.kind === "in").reduce((a, e) => a + e.amount, 0);
  const totalsOut = entries.filter((e) => e.kind === "out").reduce((a, e) => a + e.amount, 0);
  const net = totalsIn - totalsOut;

  const firstDayOfWeek = monthStart.getDay();
  const totalDays = monthEnd.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const entriesByDay = (day: Date) => entries.filter((e) => sameDay(e.date, day));

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  const selectedEntries = selected ? entriesByDay(selected) : [];

  return (
    <MainLayout>
      <div className="p-4 md:p-10 max-w-7xl mx-auto pb-32 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">
              Calendário Financeiro
            </h1>
            <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest mt-1 opacity-80">
              Entradas e saídas por dia
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goPrev} aria-label="Mês anterior">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-[180px] text-center font-black uppercase tracking-widest text-sm">
              {monthLabel(cursor)}
            </div>
            <Button variant="outline" size="icon" onClick={goNext} aria-label="Próximo mês">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <ArrowDownRight className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Entradas</span>
            </div>
            <p className="font-black text-2xl text-emerald-900">{formatCurrency(totalsIn)}</p>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-rose-700 mb-1">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Saídas</span>
            </div>
            <p className="font-black text-2xl text-rose-900">{formatCurrency(totalsOut)}</p>
          </div>
          <div className={cn("border rounded-2xl p-5", net >= 0 ? "bg-slate-900 border-slate-900 text-white" : "bg-amber-50 border-amber-200 text-amber-900")}>
            <div className="flex items-center gap-2 opacity-70 mb-1">
              <CalendarIcon className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Saldo do mês</span>
            </div>
            <p className="font-black text-2xl">{formatCurrency(net)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(["all", "in", "out"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="rounded-xl"
            >
              {f === "all" ? "Tudo" : f === "in" ? "Entradas" : "Saídas"}
            </Button>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="p-3 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} className="h-24 md:h-28 border-b border-r border-slate-50 bg-slate-50/30" />;
              const dayEntries = entriesByDay(day);
              const dayIn = dayEntries.filter((e) => e.kind === "in").reduce((a, e) => a + e.amount, 0);
              const dayOut = dayEntries.filter((e) => e.kind === "out").reduce((a, e) => a + e.amount, 0);
              const isToday = sameDay(day, new Date());
              const isSelected = selected && sameDay(day, selected);
              return (
                <button
                  key={idx}
                  onClick={() => setSelected(day)}
                  className={cn(
                    "h-24 md:h-28 border-b border-r border-slate-50 p-2 text-left flex flex-col gap-1 hover:bg-slate-50/70 transition-colors",
                    isSelected && "bg-primary/5 ring-2 ring-inset ring-primary",
                  )}
                >
                  <span className={cn("text-xs font-bold", isToday ? "bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center" : "text-slate-500")}>
                    {day.getDate()}
                  </span>
                  {dayIn > 0 && <span className="text-[10px] font-bold text-emerald-600 truncate">+{formatCurrency(dayIn)}</span>}
                  {dayOut > 0 && <span className="text-[10px] font-bold text-rose-600 truncate">-{formatCurrency(dayOut)}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {selected && (
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
            <h3 className="font-black text-lg mb-4">
              {selected.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </h3>
            {selectedEntries.length === 0 ? (
              <p className="text-slate-400 text-sm">Sem lançamentos neste dia.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {selectedEntries.map((e) => (
                  <div key={e.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{e.label}</p>
                      <p className={cn("text-xs truncate", e.status === "pendente" ? "text-amber-600" : "text-slate-400")}>{e.source}</p>
                    </div>
                    <div className={cn("font-black tabular-nums whitespace-nowrap", e.kind === "in" ? "text-emerald-600" : "text-rose-600")}>
                      {e.kind === "in" ? "+" : "-"}
                      {formatCurrency(e.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(expenses.isError || payments.isError || receivables.isError) && (
          <p className="text-xs text-rose-500">
            {(() => {
              const err = expenses.error || payments.error || receivables.error;
              return reportError(err, { scope: "finance-calendar", silent: true, fallbackMessage: "Falha ao carregar dados" });
            })()}
          </p>
        )}
      </div>
    </MainLayout>
  );
}

import { useMemo, useState } from "react";
import { useProjectData } from "@/hooks/useProjectData";
import { getQuoteTotal, formatCurrency } from "@/lib/formatQuote";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Target, CalendarDays, TrendingUp, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { reportError } from "@/lib/reportError";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Props = { className?: string };

function compactBRL(value: number): string {
  if (!Number.isFinite(value)) return "R$ 0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (abs >= 1_000) {
    const v = value / 1_000;
    const s = v >= 100 ? v.toFixed(0) : v.toFixed(1);
    return `R$ ${s.replace(".", ",")}k`;
  }
  return `R$ ${Math.round(value)}`;
}

export function SalesTargetWidget({ className }: Props) {
  const { user } = useAuth();
  const { quotes, salesTargets } = useProjectData();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const daysInMonth = monthEnd.getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = Math.max(0, daysInMonth - dayOfMonth);

  const target = useMemo(
    () =>
      salesTargets.data?.find(
        (t) => t.month === now.getMonth() + 1 && t.year === now.getFullYear(),
      )?.target_amount || 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [salesTargets.data, now.getMonth(), now.getFullYear()],
  );

  const realized = useMemo(() => {
    return (quotes.data || [])
      .filter((q) => {
        if (q.status !== "aprovado") return false;
        const d = new Date(q.created_at);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((acc, q) => acc + getQuoteTotal(q as any), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes.data, monthStart.getTime(), monthEnd.getTime()]);

  const pct = target > 0 ? Math.min(100, (realized / target) * 100) : 0;
  const missing = Math.max(0, target - realized);
  const dailyNeeded = daysLeft > 0 ? missing / daysLeft : missing;
  const paceOk = pct >= (dayOfMonth / daysInMonth) * 100;

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>(target ? String(target) : "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amount = Number(value.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!user || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("sales_targets").upsert(
        {
          user_id: user.id,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          target_amount: amount,
        },
        { onConflict: "user_id,month,year" },
      );
      if (error) throw error;
      await salesTargets.refetch();
      toast.success("Meta atualizada");
      setOpen(false);
    } catch (e) {
      reportError(e, { scope: "sales-target/save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "glass-card premium-border rounded-[2rem] md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-sm hover:shadow-premium-hover transition-all duration-500 group min-w-0 overflow-hidden",
        className,
      )}
    >
      {target > 0 ? (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <Target className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="label-caps !mb-0 opacity-50">Meta do Mês</p>
                <p className="font-black text-slate-900 tracking-tighter text-lg sm:text-2xl md:text-3xl whitespace-nowrap">
                  {formatCurrency(target)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setValue(target ? String(target) : "");
                setOpen(true);
              }}
              className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 hover:bg-primary hover:text-white hover:border-primary text-slate-400 flex items-center justify-center transition-colors shrink-0"
              aria-label="Editar meta"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Realizado + progress */}
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
            <div className="min-w-0">
              <p className="label-caps !mb-0 opacity-50">Realizado</p>
              <p className="font-black text-slate-900 tracking-tighter text-2xl sm:text-3xl md:text-4xl whitespace-nowrap">
                {formatCurrency(realized)}
              </p>
            </div>
            <div
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-black tabular-nums shrink-0",
                paceOk
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-primary/10 text-primary border border-primary/20",
              )}
            >
              {pct.toFixed(0)}%
            </div>
          </div>

          <div className="h-3 sm:h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-5 sm:mb-6">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700",
                paceOk
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : "bg-gradient-to-r from-primary to-orange-400",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <MetricBox
              icon={CalendarDays}
              label="Restam"
              value={`${daysLeft}d`}
              tone="slate"
            />
            <MetricBox
              icon={TrendingUp}
              label="Faltam"
              value={compactBRL(missing)}
              tone="slate"
            />
            <MetricBox
              icon={Rocket}
              label={
                <>
                  <span className="sm:hidden">Ritmo</span>
                  <span className="hidden sm:inline">Ritmo/dia</span>
                </>
              }
              value={compactBRL(dailyNeeded)}
              tone={paceOk ? "emerald" : "primary"}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" />
            </div>
            <div>
              <p className="label-caps !mb-0 opacity-50">Meta do Mês</p>
              <p className="font-black text-slate-900 tracking-tighter text-lg sm:text-xl">
                Nenhuma meta definida para este mês.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold h-12 px-6"
          >
            Definir meta
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Meta de vendas — {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="target-amount">Valor da meta (R$)</Label>
            <Input
              id="target-amount"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex: 25000"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: React.ReactNode;
  value: string;
  tone: "slate" | "emerald" | "primary";
}) {
  const toneClasses = {
    slate: { icon: "text-slate-400", value: "text-slate-900" },
    emerald: { icon: "text-emerald-500", value: "text-emerald-600" },
    primary: { icon: "text-primary", value: "text-primary" },
  }[tone];

  return (
    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 sm:p-4 min-w-0 flex flex-col justify-center">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("w-3.5 h-3.5 shrink-0", toneClasses.icon)} />
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 truncate">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-black tracking-tight tabular-nums text-base sm:text-lg md:text-base whitespace-nowrap truncate",
          toneClasses.value,
        )}
      >
        {value}
      </p>
    </div>
  );
}

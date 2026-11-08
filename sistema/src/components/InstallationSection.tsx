// Seção operacional da venda — fonte única: installation_schedule.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FullQuote } from "@/lib/cloudStore";
import { Button } from "@/components/ui/button";
import { CalendarClock, Trash2, Pencil, MapPin, User as UserIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { reportError } from "@/lib/reportError";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { InstallationScheduleForm } from "@/components/InstallationScheduleForm";
import {
  installationKeys,
  INSTALLATION_STATUS_LABELS,
  INSTALLATION_STATUS_STYLES,
  pickPrimarySchedule,
  ScheduleRow,
} from "@/lib/installationSchedule";

export function useQuoteInstallations(quoteId: string, enabled: boolean) {
  return useQuery({
    queryKey: installationKeys.byQuote(quoteId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installation_schedule")
        .select("*")
        .eq("quote_id", quoteId)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function InstallationSection({ quote }: { quote: FullQuote }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleRow | null>(null);

  const schedules = useQuoteInstallations(quote.id, !!user);
  const rows = (schedules.data ?? []) as ScheduleRow[];
  const primary = pickPrimarySchedule(rows);
  const history = rows.filter((r) => r.id !== primary?.id);

  const remove = async (id: string) => {
    const { error } = await supabase.from("installation_schedule").delete().eq("id", id);
    if (error) return reportError(error, { scope: "installation/remove" });
    toast.success("Agendamento removido");
    await Promise.all([
      qc.invalidateQueries({ queryKey: installationKeys.byQuote(quote.id) }),
      qc.invalidateQueries({ queryKey: installationKeys.all }),
    ]);
  };

  if (quote.status !== "aprovado") return null;

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (s: ScheduleRow) => {
    setEditing(s);
    setOpen(true);
  };

  return (
    <div className="space-y-3">
      {!primary ? (
        <>
          <div className="bg-slate-50 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500">
            Instalação ainda não agendada
          </div>
          <Button
            onClick={openCreate}
            variant="outline"
            className="w-full h-15 py-7 rounded-2xl gap-4 font-black border-slate-100 bg-white hover:bg-slate-50"
          >
            <CalendarClock className="w-6 h-6 text-purple-500" />
            Agendar Instalação
          </Button>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Instalação</p>
              <p className="font-black text-lg leading-tight">
                {format(new Date(primary.scheduled_date + "T00:00:00"), "EEE, dd 'de' MMM", { locale: ptBR })}
                {primary.scheduled_time && ` · ${String(primary.scheduled_time).slice(0, 5)}`}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                  INSTALLATION_STATUS_STYLES[primary.status ?? "agendado"] ?? INSTALLATION_STATUS_STYLES.agendado,
                )}>
                  {INSTALLATION_STATUS_LABELS[primary.status ?? "agendado"] ?? primary.status}
                </span>
                {primary.installer_name && (
                  <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" />{primary.installer_name}</span>
                )}
                {primary.address && (
                  <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{primary.address}</span>
                )}
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-11 w-11 shrink-0" onClick={() => openEdit(primary)} aria-label="Editar agendamento">
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-11 font-bold" onClick={() => openEdit(primary)}>
              Ver/Editar
            </Button>
            <Button asChild variant="ghost" className="h-11 font-bold gap-2">
              <Link to="/agenda"><ExternalLink className="w-4 h-4" />Abrir na Agenda</Link>
            </Button>
          </div>

          {history.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Histórico</p>
              {history.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {format(new Date(s.scheduled_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })} ·{" "}
                    {INSTALLATION_STATUS_LABELS[s.status ?? "agendado"] ?? s.status}
                  </span>
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500" onClick={() => remove(s.id!)} aria-label="Remover agendamento">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <InstallationScheduleForm open={open} onOpenChange={setOpen} quote={quote} schedule={editing} />
    </div>
  );
}

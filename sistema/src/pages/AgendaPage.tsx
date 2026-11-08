// Agenda de instalações — visão de semana + lista.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Phone, User as UserIcon, CalendarClock } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { reportError } from "@/lib/reportError";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["agendado", "confirmado", "em_andamento", "concluido", "cancelado"] as const;

export default function AgendaPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const items = useQuery({
    queryKey: ["installations-all", user?.id, weekStart.toISOString()],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installation_schedule")
        .select("*, quotes:quote_id (id, clients:client_id (name, phone))")
        .gte("scheduled_date", format(weekStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"))
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("installation_schedule").update({ status }).eq("id", id);
    if (error) reportError(error, { scope: "installation/update-status" });
    await items.refetch();
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-10 max-w-7xl mx-auto pb-32 space-y-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground flex items-center gap-3">
              <CalendarClock className="w-8 h-8 text-primary" />
              Agenda
            </h1>
            <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest mt-1 opacity-80">
              Instalações da semana
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-[200px] text-center font-black uppercase tracking-widest text-xs">
              {format(weekStart, "dd/MM", { locale: ptBR })} — {format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}
            </div>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Hoje
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {days.map((day) => {
            const dayItems = (items.data || []).filter((i: any) => isSameDay(new Date(i.scheduled_date + "T00:00:00"), day));
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className={cn("bg-white rounded-2xl border p-3 min-h-[200px]", isToday ? "border-primary shadow-md" : "border-slate-100")}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {format(day, "EEE", { locale: ptBR })}
                    </p>
                    <p className={cn("text-2xl font-black", isToday ? "text-primary" : "text-slate-900")}>
                      {format(day, "dd")}
                    </p>
                  </div>
                  {dayItems.length > 0 && (
                    <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full">
                      {dayItems.length}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {dayItems.map((s: any) => (
                    <Link
                      key={s.id}
                      to={`/quotes/${s.quote_id}`}
                      className="block bg-slate-50 hover:bg-slate-100 rounded-xl p-2 transition-colors"
                    >
                      {s.scheduled_time && (
                        <p className="text-xs font-black text-primary">{s.scheduled_time.slice(0, 5)}</p>
                      )}
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {s.quotes?.clients?.name || "Cliente"}
                      </p>
                      {s.installer_name && (
                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <UserIcon className="w-3 h-3" />
                          {s.installer_name}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl border border-border shadow-sm p-6 space-y-4">
          <h2 className="font-black text-lg">Detalhes da semana</h2>
          {items.isLoading ? (
            <p className="text-slate-400">Carregando...</p>
          ) : (items.data || []).length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhuma instalação agendada nesta semana.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.data!.map((s: any) => (
                <div key={s.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="font-black text-slate-900">
                        {format(new Date(s.scheduled_date + "T00:00:00"), "EEE dd/MM", { locale: ptBR })}
                        {s.scheduled_time && ` · ${s.scheduled_time.slice(0, 5)}`}
                      </p>
                      <Link to={`/quotes/${s.quote_id}`} className="text-sm text-primary underline underline-offset-2">
                        {s.quotes?.clients?.name || "Cliente"}
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                      {s.installer_name && <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" />{s.installer_name}</span>}
                      {s.installer_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.installer_phone}</span>}
                      {s.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</span>}
                    </div>
                  </div>
                  <Select value={s.status} onValueChange={(v) => updateStatus(s.id, v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((st) => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

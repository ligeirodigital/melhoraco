// Formulário ÚNICO de agendamento de instalação (criar/editar).
// Usado pela venda (InstallationSection), pelo contrato e pela /agenda.
// Sempre lê/grava o MESMO registro em installation_schedule.
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reportError } from "@/lib/reportError";
import {
  buildScheduleDefaults,
  installationKeys,
  INSTALLATION_STATUSES,
  INSTALLATION_STATUS_LABELS,
  ScheduleFormValues,
  ScheduleRow,
  toDbPayload,
} from "@/lib/installationSchedule";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quote: any;
  /** Registro existente → edição. Ausente → criação. */
  schedule?: ScheduleRow | null;
  onSaved?: (id: string) => void;
};

export function InstallationScheduleForm({ open, onOpenChange, quote, schedule, onSaved }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ScheduleFormValues>(() => buildScheduleDefaults(quote, schedule));

  useEffect(() => {
    if (open) setForm(buildScheduleDefaults(quote, schedule));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, schedule?.id]);

  const set = (k: keyof ScheduleFormValues, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (saving) return; // guarda contra duplo clique / mutações concorrentes
    if (!user) return;
    if (!form.scheduled_date) {
      toast.error("Informe a data da instalação");
      return;
    }
    setSaving(true);
    try {
      const payload = toDbPayload(form);
      let savedId = schedule?.id;
      if (schedule?.id) {
        const { error } = await supabase
          .from("installation_schedule")
          .update(payload)
          .eq("id", schedule.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("installation_schedule")
          .insert({ ...payload, user_id: user.id, quote_id: quote.id })
          .select("id")
          .single();
        if (error) throw error;
        savedId = data?.id;
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: installationKeys.byQuote(quote.id) }),
        qc.invalidateQueries({ queryKey: installationKeys.all }),
      ]);
      toast.success(schedule?.id ? "Agendamento atualizado" : "Instalação agendada");
      if (savedId) onSaved?.(savedId);
      onOpenChange(false);
    } catch (e) {
      reportError(e, { scope: "installation/save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (saving ? null : onOpenChange(v))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{schedule?.id ? "Editar agendamento" : "Agendar instalação"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sched-date">Data *</Label>
              <Input id="sched-date" className="h-12" type="date" value={form.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="sched-time">Hora</Label>
              <Input id="sched-time" className="h-12" type="time" value={form.scheduled_time} onChange={(e) => set("scheduled_time", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sched-duration">Duração (h)</Label>
              <Input id="sched-duration" className="h-12" type="number" inputMode="decimal" step="0.5" value={form.duration_hours} onChange={(e) => set("duration_hours", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sched-installer">Instalador</Label>
              <Input id="sched-installer" className="h-12" value={form.installer_name} onChange={(e) => set("installer_name", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="sched-phone">Telefone operacional</Label>
            <Input id="sched-phone" className="h-12" type="tel" inputMode="tel" autoComplete="tel" value={form.installer_phone} onChange={(e) => set("installer_phone", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sched-address">Endereço da instalação</Label>
            <Input id="sched-address" className="h-12" value={form.address} onChange={(e) => set("address", e.target.value)} />
            <p className="text-[11px] text-slate-400 mt-1">
              Sugerido pela venda/cliente. Alterar aqui não muda o cadastro do cliente.
            </p>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INSTALLATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{INSTALLATION_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sched-notes">Observações técnicas</Label>
            <Textarea id="sched-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="h-12 font-black">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : schedule?.id ? "Salvar alterações" : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

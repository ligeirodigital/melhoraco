import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, MessageCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { FullQuote } from "@/types/models";
import { contactDays, contactUrgency, followUpQueue, isFutureReturn, LOST_REASONS } from "@/lib/salesFollowUp";
import { formatCurrency, getQuoteTotal } from "@/lib/formatQuote";
import { leadOriginLabel } from "@/lib/attribution";
import { getStageTemplate, openWhatsApp } from "@/lib/whatsappTemplates";
import { useSalesFollowUp } from "@/hooks/useSalesFollowUp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FollowUpQueue({ quotes, stages = [], loading = false }: { quotes: FullQuote[]; stages?: { id: string; name: string }[]; loading?: boolean }) {
  const action = useSalesFollowUp();
  const [dialog, setDialog] = useState<{ quote: FullQuote; kind: "schedule" | "lost" } | null>(null);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("none");
  const queue = followUpQueue(quotes);
  const active = queue.filter(q => !isFutureReturn(q));
  const total = active.reduce((sum, q) => sum + getQuoteTotal(q), 0);
  const call = (q: FullQuote) => {
    const portalUrl = q.order_token ? `${window.location.origin}/p/${q.order_token}` : q.client_view_token ? `${window.location.origin}/p/q_${q.id}_${q.client_view_token}` : null;
    let text = getStageTemplate(stages.find(s => s.id === q.pipeline_stage_id)?.name, { clientName: q.client?.name, quoteNumber: q.id.slice(0, 8).toUpperCase(), daysStale: contactDays(q), portalUrl });
    if (!text.includes(q.id.slice(0, 8).toUpperCase())) text += `\nOrçamento #${q.id.slice(0, 8).toUpperCase()}`;
    if (portalUrl && !text.includes(portalUrl)) text += `\nSeu orçamento: ${portalUrl}`;
    if (!openWhatsApp(q.client?.phone, text)) { toast.error("Cliente sem telefone. Atualize o cadastro."); return; }
    action.mutate({ quote: q, kind: "contact", text });
  };
  return <section aria-labelledby="follow-up-title" className="space-y-4 min-w-0">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 id="follow-up-title" className="text-2xl font-black text-foreground">A cobrar <span className="text-muted-foreground text-base">({active.length})</span></h2><p className="text-sm text-muted-foreground">{formatCurrency(total)} em propostas paradas{queue.length > active.length ? ` · ${queue.length - active.length} retornos agendados` : ""}</p></div>
    </header>
    {loading ? <p role="status" className="text-muted-foreground">Carregando contatos…</p> : queue.length === 0 ? <p className="text-muted-foreground py-4">Nenhuma proposta pendente.</p> : <div className="max-h-[32rem] overflow-y-auto overscroll-contain divide-y divide-border border-y border-border">
      {queue.map(q => {
        const days = contactDays(q); const urgency = contactUrgency(days); const origin = leadOriginLabel(q);
        return <article key={q.id} className="py-4 flex flex-col lg:flex-row lg:items-center gap-4 min-w-0">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap gap-x-3 gap-y-1 items-baseline"><Link to={`/quotes/${q.id}`} className="font-bold text-foreground hover:underline break-words">{q.client?.name || "Cliente"}</Link><span className="font-bold tabular-nums">{formatCurrency(getQuoteTotal(q))}</span></div>
            <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
              <Badge className={cn("border-0", urgency === "success" ? "bg-success/10 text-success" : urgency === "warning" ? "bg-[hsl(var(--follow-up-warning)/0.18)] text-[hsl(var(--follow-up-warning-foreground))]" : "bg-destructive/10 text-destructive")}>{days} dias sem contato</Badge>
              {origin !== "Manual" && <span>{origin}</span>}
              {q.next_follow_up_at && <span className="font-semibold">Retornar em {format(parseISO(q.next_follow_up_at), "dd/MM")}</span>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 shrink-0">
            <Button disabled={action.isPending} onClick={() => call(q)} className="h-11"><MessageCircle />Chamar no WhatsApp</Button>
            <Button variant="outline" className="h-11" onClick={() => { setDate(q.next_follow_up_at || ""); setDialog({ quote: q, kind: "schedule" }); }}><CalendarClock />Agendar retorno</Button>
            <Button variant="ghost" className="h-11 text-destructive" onClick={() => { setReason("none"); setDialog({ quote: q, kind: "lost" }); }}><XCircle />Marcar como perdido</Button>
          </div>
        </article>;
      })}
    </div>}
    <Dialog open={Boolean(dialog)} onOpenChange={open => { if (!open && !action.isPending) setDialog(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{dialog?.kind === "lost" ? "Marcar como perdido?" : "Agendar retorno"}</DialogTitle><DialogDescription>{dialog?.kind === "lost" ? `O orçamento de ${dialog.quote.client?.name} ficará recusado. Nenhum pagamento será alterado.` : dialog?.quote.client?.name}</DialogDescription></DialogHeader>
        {dialog?.kind === "schedule" ? <div className="space-y-2"><Label htmlFor="return-date">Próximo contato</Label><Input id="return-date" type="date" min={format(new Date(), "yyyy-MM-dd")} value={date} onChange={e => setDate(e.target.value)} /></div> : <div className="space-y-2"><Label>Motivo (opcional)</Label><Select value={reason} onValueChange={setReason}><SelectTrigger aria-label="Motivo da perda"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem motivo</SelectItem>{LOST_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>}
        <DialogFooter className="gap-2"><Button variant="outline" disabled={action.isPending} onClick={() => setDialog(null)}>Cancelar</Button><Button variant={dialog?.kind === "lost" ? "destructive" : "default"} disabled={action.isPending || (dialog?.kind === "schedule" && (!date || date < format(new Date(), "yyyy-MM-dd")))} onClick={async () => { if (!dialog) return; try { await action.mutateAsync({ quote: dialog.quote, kind: dialog.kind, date, reason: reason === "none" ? null : reason }); setDialog(null); } catch { /* Mutation shows error. */ } }}>{action.isPending ? "Salvando…" : dialog?.kind === "lost" ? "Confirmar perda" : "Salvar retorno"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}

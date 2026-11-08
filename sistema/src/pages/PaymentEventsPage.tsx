import { useEffect, useMemo, useState } from "react";
import { supabase, FN_PREFIX } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, RefreshCw, Loader2, Search, RotateCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const REPROCESSABLE = /(orphan|rejected|mismatch|verification_failed|refused|canceled|cancelled|expired|failed)/i;
function canReprocess(event: string) {
  return REPROCESSABLE.test(event);
}

interface PaymentEvent {
  id: string;
  quote_id: string;
  event: string;
  source: string;
  payload: any;
  created_at: string;
}

const EVENT_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "confirmed", label: "Confirmados" },
  { value: "refused", label: "Recusados" },
  { value: "canceled", label: "Cancelados" },
  { value: "expired", label: "Expirados" },
  { value: "rejected", label: "Rejeitados/Verif." },
  { value: "orphan", label: "Órfãos" },
];

function eventTone(event: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  const e = event.toLowerCase();
  if (e.includes("confirmed")) return { label: "Confirmado", variant: "default" };
  if (e.includes("orphan")) return { label: "Órfão", variant: "outline" };
  if (e.includes("rejected") || e.includes("mismatch") || e.includes("verification_failed"))
    return { label: "Rejeitado", variant: "destructive" };
  if (e.includes("refused")) return { label: "Recusado", variant: "destructive" };
  if (e.includes("canceled") || e.includes("cancelled")) return { label: "Cancelado", variant: "secondary" };
  if (e.includes("expired")) return { label: "Expirado", variant: "secondary" };
  if (e.includes("received")) return { label: "Recebido", variant: "outline" };
  return { label: event, variant: "outline" };
}

export default function PaymentEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState<string | null>(null);

  const reprocess = async (e: PaymentEvent) => {
    if (!e.quote_id) {
      toast.error("Evento órfão sem quote_id — não é possível reprocessar automaticamente.");
      return;
    }
    setReprocessing(e.id);
    try {
      // Idempotência: infinitypay-check-payment já verifica se está pago
      // e reconsulta o gateway antes de confirmar.
      const { data, error } = await supabase.functions.invoke(`${FN_PREFIX}infinitypay-check-payment`, {
        body: { quoteId: e.quote_id, manual: true },
      });
      if (error) throw new Error(error.message);

      // Registra resultado como novo payment_event para auditoria
      await supabase.from("payment_events").insert({
        quote_id: e.quote_id,
        event: `reprocess_${data?.status ?? "unknown"}`,
        source: "admin",
        payload: { source_event_id: e.id, source_event: e.event, result: data },
      });

      toast.success(`Reprocessado: ${data?.status ?? "ok"}`);
      await load();
    } catch (err: any) {
      await supabase.from("payment_events").insert({
        quote_id: e.quote_id,
        event: "reprocess_failed",
        source: "admin",
        payload: { source_event_id: e.id, source_event: e.event, error: err?.message ?? String(err) },
      });
      toast.error(`Falha ao reprocessar: ${err?.message ?? err}`);
      await load();
    } finally {
      setReprocessing(null);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (!error && data) setEvents(data as PaymentEvent[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filter !== "all" && !e.event.toLowerCase().includes(filter)) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${e.event} ${e.source} ${e.quote_id} ${JSON.stringify(e.payload || {})}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [events, filter, search]);

  const stats = useMemo(() => {
    const s = { total: events.length, confirmed: 0, refused: 0, canceled: 0, expired: 0, rejected: 0 };
    for (const e of events) {
      const ev = e.event.toLowerCase();
      if (ev.includes("confirmed")) s.confirmed++;
      else if (ev.includes("refused")) s.refused++;
      else if (ev.includes("cancel")) s.canceled++;
      else if (ev.includes("expired")) s.expired++;
      else if (ev.includes("rejected") || ev.includes("mismatch") || ev.includes("verification_failed"))
        s.rejected++;
    }
    return s;
  }, [events]);

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Auditoria de pagamentos</h1>
              <p className="text-xs text-muted-foreground">
                Eventos crus do webhook e do payment_check (idempotência garantida)
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Card className="p-3"><div className="text-[10px] text-muted-foreground">Total</div><div className="text-lg font-bold">{stats.total}</div></Card>
          <Card className="p-3"><div className="text-[10px] text-muted-foreground">Confirmados</div><div className="text-lg font-bold text-emerald-600">{stats.confirmed}</div></Card>
          <Card className="p-3"><div className="text-[10px] text-muted-foreground">Recusados</div><div className="text-lg font-bold text-red-600">{stats.refused}</div></Card>
          <Card className="p-3"><div className="text-[10px] text-muted-foreground">Cancel/Exp</div><div className="text-lg font-bold text-amber-600">{stats.canceled + stats.expired}</div></Card>
          <Card className="p-3"><div className="text-[10px] text-muted-foreground">Rejeitados</div><div className="text-lg font-bold text-red-600">{stats.rejected}</div></Card>
        </div>

        <Card className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por quote, evento, payload..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVENT_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum evento encontrado.</Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => {
              const tone = eventTone(e.event);
              const isOpen = expanded === e.id;
              return (
                <Card key={e.id} className="p-3">
                  <button
                    onClick={() => setExpanded(isOpen ? null : e.id)}
                    className="w-full flex items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={tone.variant} className="text-[10px]">{tone.label}</Badge>
                        <span className="font-mono text-xs">{e.event}</span>
                        <Badge variant="outline" className="text-[10px]">{e.source}</Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 font-mono truncate">
                        quote {e.quote_id.slice(0, 8)}… — {format(new Date(e.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canReprocess(e.event) && e.quote_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-7 gap-1"
                          disabled={reprocessing === e.id}
                          onClick={(ev) => { ev.stopPropagation(); reprocess(e); }}
                          title="Reconsulta o gateway (idempotente) e registra o resultado"
                        >
                          {reprocessing === e.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <RotateCw className="w-3 h-3" />}
                          Reprocessar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-7"
                        onClick={(ev) => { ev.stopPropagation(); navigate(`/quotes/${e.quote_id}`); }}
                      >
                        Abrir
                      </Button>
                    </div>
                  </button>
                  {isOpen && (
                    <pre className="text-[10px] mt-2 p-2 bg-muted rounded overflow-auto max-h-80">
                      {JSON.stringify(e.payload, null, 2)}
                    </pre>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

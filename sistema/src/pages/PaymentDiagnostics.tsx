import { useState } from "react";
import { supabase, FN_PREFIX } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Clock, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

type StepStatus = "idle" | "running" | "success" | "error";
interface Step {
  id: string;
  label: string;
  status: StepStatus;
  startedAt?: Date;
  finishedAt?: Date;
  detail?: string;
  data?: any;
}

const INITIAL_STEPS: Step[] = [
  { id: "auth", label: "1. Verificar autenticação", status: "idle" },
  { id: "handle", label: "2. Verificar handle InfinityPay", status: "idle" },
  { id: "quote", label: "3. Buscar orçamento de teste", status: "idle" },
  { id: "create", label: "4. Chamar infinitypay-create-link", status: "idle" },
  { id: "tx", label: "5. Confirmar payment_transactions registrado", status: "idle" },
  { id: "check", label: "6. Chamar infinitypay-check-payment", status: "idle" },
  { id: "logs", label: "7. Ler webhook_logs recentes", status: "idle" },
];

export default function PaymentDiagnostics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [quoteId, setQuoteId] = useState("");

  const update = (id: string, patch: Partial<Step>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const run = async (id: string, fn: () => Promise<{ detail: string; data?: any }>) => {
    update(id, { status: "running", startedAt: new Date(), detail: undefined, data: undefined });
    try {
      const r = await fn();
      update(id, { status: "success", finishedAt: new Date(), detail: r.detail, data: r.data });
      return r.data;
    } catch (e: any) {
      update(id, { status: "error", finishedAt: new Date(), detail: e.message || String(e) });
      throw e;
    }
  };

  const runAll = async () => {
    setRunning(true);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "idle" as StepStatus })));

    try {
      // 1. Auth
      await run("auth", async () => {
        if (!user) throw new Error("Não autenticado");
        return { detail: `Logado como ${user.email}`, data: user };
      });

      // 2. Handle
      const handle = await run("handle", async () => {
        const h = localStorage.getItem(`infinitypay_handle_${user!.id}`);
        if (!h) throw new Error("Handle não configurado em Configurações");
        return { detail: `Handle: @${h.replace(/^@/, "")}`, data: h };
      });

      // 3. Quote
      let qId = quoteId;
      const quote = await run("quote", async () => {
        let q: { id: string; clients: any };
        if (qId) {
          const { data, error } = await supabase.from("quotes").select("id, clients(name)").eq("id", qId).maybeSingle();
          if (error) throw error;
          if (!data) throw new Error("Orçamento não encontrado");
          q = data as any;
        } else {
          const { data, error } = await supabase
            .from("quotes")
            .select("id, clients(name)")
            .eq("user_id", user!.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new Error("Nenhum orçamento encontrado. Crie um primeiro.");
          q = data as any;
          qId = q.id;
          setQuoteId(q.id);
        }
        return { detail: `Orçamento ${q.id.slice(0, 8)} — ${q.clients?.name || "sem cliente"}`, data: q };
      });

      // 4. Create link (valor simbólico de R$ 1 para teste)
      await run("create", async () => {
        const { data, error } = await supabase.functions.invoke(`${FN_PREFIX}infinitypay-create-link`, {
          body: {
            handle,
            amount: 1,
            description: `TESTE - ${(quote as any).clients?.name || "cliente"}`,
            quoteId: qId,
            redirectUrl: window.location.origin,
          },
        });
        if (error) throw new Error(error.message);
        if (!data?.url) throw new Error("Sem URL retornada");
        return { detail: `Link criado: ${data.url}`, data };
      });

      // 5. Transaction
      await run("tx", async () => {
        const { data, error } = await supabase
          .from("payment_transactions")
          .select("*")
          .eq("quote_id", qId)
          .eq("provider", "infinitypay")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Transação não gravada");
        return { detail: `Status: ${data.status} — R$ ${data.amount}`, data };
      });

      // 6. Check payment
      await run("check", async () => {
        const { data, error } = await supabase.functions.invoke(`${FN_PREFIX}infinitypay-check-payment`, {
          body: { quoteId: qId },
        });
        if (error) throw new Error(error.message);
        return { detail: `Retorno: ${data?.status || "?"} (fonte: ${data?.source || "?"})`, data };
      });

      // 7. Webhook logs
      await run("logs", async () => {
        const { data, error } = await supabase
          .from("webhook_logs")
          .select("*")
          .eq("provider", "infinitypay")
          .order("created_at", { ascending: false })
          .limit(5);
        if (error) throw error;
        return { detail: `${data?.length || 0} log(s) recentes`, data };
      });
    } catch {
      /* já registrado */
    } finally {
      setRunning(false);
    }
  };

  const statusIcon = (s: StepStatus) => {
    if (s === "running") return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (s === "success") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (s === "error") return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const dur = (s: Step) =>
    s.startedAt && s.finishedAt ? `${s.finishedAt.getTime() - s.startedAt.getTime()}ms` : "";

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Diagnóstico InfinityPay</h1>
            <p className="text-xs text-muted-foreground">
              Testa o fluxo inteiro com status e timestamp por etapa
            </p>
          </div>
        </div>

        <Card className="p-4 space-y-3">
          <label className="text-xs font-medium text-muted-foreground">
            Quote ID (opcional — usa o último se vazio)
          </label>
          <Input
            placeholder="uuid do orçamento"
            value={quoteId}
            onChange={(e) => setQuoteId(e.target.value)}
          />
          <Button onClick={runAll} disabled={running} className="w-full gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? "Executando..." : "Rodar diagnóstico completo"}
          </Button>
        </Card>

        <div className="space-y-2">
          {steps.map((s) => (
            <Card key={s.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{statusIcon(s.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium text-sm">{s.label}</span>
                    <div className="flex items-center gap-2">
                      {s.startedAt && (
                        <Badge variant="outline" className="text-[10px]">
                          {format(s.startedAt, "HH:mm:ss")}
                        </Badge>
                      )}
                      {dur(s) && (
                        <Badge variant="secondary" className="text-[10px]">
                          {dur(s)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {s.detail && (
                    <p
                      className={`text-xs mt-1 break-all ${
                        s.status === "error" ? "text-red-500" : "text-muted-foreground"
                      }`}
                    >
                      {s.detail}
                    </p>
                  )}
                  {s.data && s.status === "success" && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-muted-foreground cursor-pointer">
                        Ver payload
                      </summary>
                      <pre className="text-[10px] mt-1 p-2 bg-muted rounded overflow-auto max-h-40">
                        {JSON.stringify(s.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

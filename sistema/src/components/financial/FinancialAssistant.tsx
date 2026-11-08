import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase, functionUrl } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, ArrowUpRight, Square, Loader2, AlertCircle, Wallet, PackageCheck, Copy, Check } from "lucide-react";
import { consumeAssistantResponse, validateScenario, type AssistantSnapshot } from "@/lib/financialAssistant";
import { formatCurrency } from "@/lib/formatQuote";

const endpoint = functionUrl("financial-assistant");
const examples = {
  finance: [
    { label: "Venda parcelada", text: "Vendi R$ 1.000 em 4 parcelas no boleto. Como as parcelas provisionadas afetam meu caixa e o pagamento dos fornecedores?" },
    { label: "Recebimentos em atraso", text: "Tenho parcelas vencidas e preciso pagar fornecedores neste mês. Quais prioridades devo seguir?" },
  ],
  orders: [
    { label: "Priorizar pedidos", text: "Analise o panorama dos meus pedidos e me ajude a definir as próximas ações para aprovações, pagamentos e entregas." },
    { label: "Pedidos e caixa", text: "Como posso organizar os pedidos aprovados e os recebimentos parcelados para reduzir o risco de falta de caixa?" },
  ],
};

async function assistantFetch(payload: Record<string, unknown>, signal?: AbortSignal) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Entre novamente na sua conta para usar o assistente.");
  return fetch(endpoint, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
  });
}

export default function FinancialAssistant() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"finance" | "orders">("finance");
  const [scenario, setScenario] = useState("");
  const [balance, setBalance] = useState("");
  const [answer, setAnswer] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [block, setBlock] = useState<{ canResume?: boolean; blockType?: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const snapshot = useQuery({
    queryKey: ["financial-assistant-snapshot", user?.id], enabled: Boolean(user), retry: false, staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await assistantFetch({ action: "snapshot" }, signal);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar o panorama.");
      return data as AssistantSnapshot;
    },
  });
  useEffect(() => { if (snapshot.data?.blocked) { setBlock(snapshot.data); setError(snapshot.data.error ?? "IA indisponível."); } }, [snapshot.data]);
  useEffect(() => () => { abort.current?.abort(); }, []);
  const submit = async (resume = false) => {
    if (busy.current) return;
    const validation = validateScenario(scenario);
    if (validation) { setError(validation); return; }
    const amount = balance.trim() === "" ? null : Number(balance);
    if (amount !== null && !Number.isFinite(amount)) { setError("Informe um saldo válido."); return; }
    busy.current = true; setLoading(true); setError(""); setAnswer(""); setReasoning(""); setCopied(false);
    const controller = new AbortController(); abort.current = controller;
    try {
      const response = await assistantFetch({ scenario, mode, currentBalance: amount, action: resume ? "resume" : "analyze" }, controller.signal);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.blocked) setBlock({ canResume: data.canResume, blockType: data.blockType });
        throw new Error(data.error || `A IA retornou erro ${response.status}.`);
      }
      setBlock(null);
      await consumeAssistantResponse(response, (text, thinking) => { setAnswer(text); setReasoning(thinking); });
    } catch (caught) {
      if (controller.signal.aborted) setError("Análise cancelada. Nenhum lançamento foi alterado.");
      else setError(caught instanceof Error ? caught.message : "Não foi possível concluir a análise.");
    } finally { busy.current = false; setLoading(false); abort.current = null; }
  };
  const summary = snapshot.data?.context.installments;
  return (
    <section className="space-y-6 min-w-0" aria-labelledby="financial-assistant-heading">
      <header className="flex items-start gap-3">
        <Sparkles className="h-6 w-6 text-primary shrink-0 mt-1" />
        <div className="min-w-0">
          <h2 id="financial-assistant-heading" className="text-2xl font-bold text-foreground">Assistente de gestão</h2>
          <p className="text-sm text-muted-foreground mt-1">Pedidos e financeiro</p>
        </div>
      </header>
      {snapshot.isLoading && <p role="status" className="text-sm text-muted-foreground flex gap-2 items-center"><Loader2 className="h-4 w-4 animate-spin" /> Consultando seus dados…</p>}
      {snapshot.isError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{snapshot.error.message}</AlertDescription></Alert>}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-border py-5" aria-label="Panorama de parcelas provisionadas">
          {[["A receber", summary.pending], ["Vencidas", summary.overdue], ["Próximos 30 dias", summary.next30Days], ["Recebidas · histórico", summary.received]].map(([label, value]) => (
            <div key={String(label)} className="min-w-0">
              <p className="text-xs text-muted-foreground mb-2">{label}</p>
              <p className="font-bold text-lg tabular-nums break-words text-foreground">{formatCurrency(Number(value))}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 lg:gap-10">
        <form className="space-y-5 min-w-0" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <Tabs value={mode} onValueChange={(value) => setMode(value as "finance" | "orders")}>
            <TabsList className="grid grid-cols-2 w-full h-12">
              <TabsTrigger value="finance" className="gap-2 h-10"><Wallet className="w-4 h-4" /> Financeiro</TabsTrigger>
              <TabsTrigger value="orders" className="gap-2 h-10"><PackageCheck className="w-4 h-4" /> Pedidos</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-2">
            <Label htmlFor="financial-scenario">Qual situação você precisa avaliar?</Label>
            <Textarea id="financial-scenario" value={scenario} onChange={(event) => setScenario(event.target.value)} maxLength={4000} disabled={loading} rows={6} className="text-base resize-y rounded-lg" placeholder={mode === "finance" ? "Ex.: vendi em 4x no boleto e preciso pagar os materiais antes de receber…" : "Ex.: preciso organizar os pedidos aprovados e priorizar as entregas…"} />
            <div className="flex flex-wrap gap-2">
              {examples[mode].map((example) => <Button key={example.label} type="button" variant="outline" size="sm" disabled={loading} onClick={() => setScenario(example.text)} className="gap-1 rounded-lg"><ArrowUpRight className="w-3 h-3" /> {example.label}</Button>)}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="current-cash-balance">Saldo disponível hoje (opcional)</Label>
            <Input id="current-cash-balance" type="number" inputMode="decimal" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} disabled={loading} placeholder="R$ 0,00" className="h-12 text-base rounded-lg" />
          </div>
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          {loading ? <Button type="button" variant="outline" className="h-12 w-full gap-2 rounded-lg" onClick={() => abort.current?.abort()}><Square className="h-4 w-4" /> Parar análise</Button> : (
            <Button type="submit" className="h-12 w-full gap-2 rounded-lg" disabled={Boolean(block) || snapshot.isLoading || snapshot.isError || scenario.trim().length < 10}><Sparkles className="h-4 w-4" /> Analisar situação</Button>
          )}
          {block?.canResume && !loading && <Button type="button" variant="outline" className="w-full h-auto min-h-12 whitespace-normal rounded-lg" disabled={scenario.trim().length < 10} onClick={() => void submit(true)}>Acesso restaurado — iniciar nova análise</Button>}
          <p className="text-xs text-muted-foreground">Apoio gerencial · Nenhum pedido ou lançamento é alterado. O uso de IA consome créditos do workspace.</p>
        </form>
        <div className="min-w-0 space-y-4 lg:border-l lg:border-border lg:pl-8">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-foreground">Sua análise</h3>
            {answer && !loading && <Button variant="ghost" size="icon" aria-label="Copiar análise" title="Copiar análise" onClick={async () => { try { await navigator.clipboard.writeText(answer); setCopied(true); } catch { setError("Não foi possível copiar a análise."); } }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>}
          </div>
          {loading && <p role="status" className="text-sm flex gap-2 items-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analisando pedidos e recebimentos…</p>}
          {reasoning && <details className="text-sm text-muted-foreground"><summary className="cursor-pointer py-2">Raciocínio resumido</summary><p className="whitespace-pre-wrap break-words leading-relaxed mt-2">{reasoning}</p></details>}
          {answer ? <div aria-label="Resultado da análise" className="break-words text-sm leading-7 text-foreground space-y-3">{answer.split(/\n\s*\n/).map((paragraph, index) => /^#{1,6}\s/.test(paragraph) ? <h4 key={index} className="font-bold text-base">{paragraph.replace(/^#{1,6}\s+/, "")}</h4> : <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div> : !loading && <p className="text-sm text-muted-foreground">Nenhuma análise realizada.</p>}
          {snapshot.data && <p className="text-xs text-muted-foreground border-t border-border pt-4">{snapshot.data.context.orders.total} pedidos registrados · {summary?.pendingCount ?? 0} parcelas pendentes · Panorama de {summary?.asOf}</p>}
        </div>
      </div>
    </section>
  );
}

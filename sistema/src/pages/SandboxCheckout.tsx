import { functionUrl } from "@/integrations/supabase/client";
import { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const WEBHOOK_URL = functionUrl("infinitypay-webhook");

export default function SandboxCheckout() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const amount = Number(params.get("amount") || 0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<"paid" | "cancelled" | null>(null);

  const simulate = async (outcome: "paid" | "cancelled") => {
    if (!quoteId) return;
    setLoading(true);
    try {
      if (outcome === "paid") {
        const payload = {
          order_nsu: quoteId,
          paid_amount: amount,
          transaction_nsu: `SBX-${Date.now()}`,
          invoice_slug: `sandbox-${quoteId.slice(0, 8)}`,
          capture_method: "credit_card",
          installments: 1,
          receipt_url: `https://recibo.sandbox.local/${quoteId}`,
          sandbox: true,
        };
        const r = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`Webhook falhou (${r.status})`);
        toast.success("Pagamento sandbox confirmado!");
      } else {
        toast.info("Pagamento sandbox cancelado.");
      }
      setDone(outcome);
    } catch (e: any) {
      toast.error(e.message || "Erro ao simular pagamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">Checkout Sandbox</h1>
          </div>
          <Badge variant="outline" className="text-amber-500 border-amber-500">
            <ShieldCheck className="w-3 h-3 mr-1" /> TESTE
          </Badge>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Orçamento</p>
          <p className="font-mono text-xs">{quoteId}</p>
          <p className="text-2xl font-black mt-2">
            R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Ambiente simulado — nenhum valor real será cobrado. Escolha o resultado para testar o fluxo:
        </p>

        {done === "paid" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium text-sm">Pagamento confirmado. Webhook enviado.</span>
          </div>
        )}
        {done === "cancelled" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500">
            <XCircle className="w-5 h-5" />
            <span className="font-medium text-sm">Pagamento cancelado.</span>
          </div>
        )}

        {!done ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => simulate("cancelled")} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={() => simulate("paid")} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Aprovar
            </Button>
          </div>
        ) : (
          <Button onClick={() => navigate(`/quotes/${quoteId}`)} className="w-full">
            Voltar ao orçamento
          </Button>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase, FN_PREFIX } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, RefreshCw, ArrowLeft, FileDown, History, Pencil, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { generatePDFHtml } from "@/lib/formatQuote";
import EditOrderDialog from "@/components/store/EditOrderDialog";
import { POLL, queryKeys } from "@/lib/queryKeys";
import { trackPurchase, trackMetaEvent } from "@/lib/metaPixel";

type QuoteRow = {
  id: string;
  payment_status: string | null;
  payment_amount: number | null;
  payment_date: string | null;
  payment_receipt_url: string | null;
  order_nsu: string | null;
  client_id: string | null;
  deadline?: string | null;
};

const POLL_MAX_MS = 15 * 60_000;

export default function OrderSuccessPage() {
  const { id: quoteId } = useParams<{ id: string }>();
  const [checking, setChecking] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const stored = (() => {
    try {
      const raw = localStorage.getItem("melhoraco_last_order");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const token: string | null = stored?.id === quoteId ? stored.token : null;

  const quoteQuery = useQuery({
    queryKey: queryKeys.publicOrder(quoteId ?? ""),
    enabled: !!quoteId && !!token,
    queryFn: async () => {
      if (!quoteId || !token) return null;
      const { data, error } = await supabase.rpc("get_public_quote_by_id", { p_quote_id: quoteId, p_token: token });
      if (error) throw error;
      return (data as unknown as QuoteRow | null) ?? null;
    },
    // Para de consultar assim que o pagamento é confirmado ou após o tempo máximo.
    refetchInterval: (query) => {
      const row = query.state.data as QuoteRow | null | undefined;
      if (row?.payment_status === "paid") return false;
      if (Date.now() - startedAt > POLL_MAX_MS) return false;
      return POLL.order;
    },
    refetchIntervalInBackground: false,
  });

  const quote = quoteQuery.data ?? null;
  const loading = quoteQuery.isLoading;
  const isPaid = quote?.payment_status === "paid";

  useEffect(() => {
    if (!quote) return;
    const purchase = () => trackPurchase(quote);
    purchase();
    window.addEventListener("cookie-consent-change", purchase);
    window.addEventListener("storage", purchase);
    return () => { window.removeEventListener("cookie-consent-change", purchase); window.removeEventListener("storage", purchase); };
  }, [quote]);

  const fetchQuote = () => { void quoteQuery.refetch(); };

  const checkPayment = async (silent = false) => {
    if (!quoteId || isPaid) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke(`${FN_PREFIX}infinitypay-check-payment`, {
        body: { quoteId },
      });
      if (error) throw error;
      await quoteQuery.refetch();
      if (!silent && data?.status === "pending") {
        toast.info("Pagamento ainda não confirmado.");
      }
    } catch (e: any) {
      if (!silent) toast.error(e.message || "Falha ao verificar pagamento");
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!quoteId) return;
    try {
      if (!token) return toast.error("Link do pedido expirou neste dispositivo");

      const { data, error } = await supabase.rpc("get_public_quote_by_id", {
        p_quote_id: quoteId, p_token: token,
      });
      if (error) throw error;
      if (!data) return toast.error("Pedido não encontrado");

      const html = generatePDFHtml(data as any);
      const w = window.open("", "_blank");
      if (!w) return toast.error("Bloqueado pelo navegador — permita popups");
      w.document.write(html);
      w.document.close();
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar PDF");
    }
  };

  const regeneratePayment = async () => {
    if (!quoteId) return;
    trackMetaEvent("InitiateCheckout", { currency: "BRL", ...(quote?.payment_amount != null ? { value: quote.payment_amount } : {}) });
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(`${FN_PREFIX}infinitypay-create-link`, {
        body: { quoteId, redirectUrl: `${appUrl()}/pedido/${quoteId}/sucesso` },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Link indisponível");
      if (token) {
        localStorage.setItem("melhoraco_last_order", JSON.stringify({
          id: quoteId, token, paymentUrl: data.url,
        }));
      }
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar link de pagamento");
      setRegenerating(false);
    }
  };

  const elapsedTooLong = useMemo(
    () => Date.now() - startedAt > POLL_MAX_MS,
    // re-render triggered by checking/isPaid
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checking, isPaid],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Pedido não encontrado</h2>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full glass-card p-8 rounded-2xl text-center space-y-6">
        {isPaid ? (
          <>
            <div className="flex justify-center animate-in zoom-in duration-500">
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Pagamento confirmado</h1>
              <p className="text-muted-foreground">Pedido aprovado.</p>
            </div>
            <div className="text-left space-y-2 border rounded-lg p-4 bg-muted/30">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pedido</span>
                <span className="font-mono text-sm">
                  {quote.order_nsu || quote.id.slice(0, 8)}
                </span>
              </div>
              {quote.payment_amount != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-semibold">
                    R$ {Number(quote.payment_amount).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t space-y-1 text-sm">
                <p>📦 Prazo de fabricação: até 7 dias úteis.</p>
                <p>🚚 Entrega gratuita para Fortaleza.</p>
              </div>
            </div>
            {quote.payment_receipt_url && (
              <a
                href={quote.payment_receipt_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline text-sm"
              >
                Ver comprovante
              </a>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleDownloadPDF}>
                <FileDown className="w-4 h-4 mr-2" /> Baixar PDF
              </Button>
              <Link to="/loja/meus-pedidos">
                <Button variant="outline" className="w-full">
                  <History className="w-4 h-4 mr-2" /> Meus pedidos
                </Button>
              </Link>
            </div>
            <Link to="/loja">
              <Button className="w-full bg-orange-500 hover:bg-orange-600">Continuar comprando</Button>
            </Link>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Aguardando confirmação do pagamento
              </h1>
              <p className="text-muted-foreground">
                Assim que a InfinityPay confirmar, esta página será atualizada
                automaticamente.
              </p>
            </div>
            <div className="text-left border rounded-lg p-4 bg-muted/30 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pedido</span>
                <span className="font-mono">
                  {quote.order_nsu || quote.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span>Pendente</span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => checkPayment(false)}
              disabled={checking}
            >
              {checking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Verificar novamente
            </Button>
            <Button variant="outline" className="w-full" onClick={handleDownloadPDF}>
              <FileDown className="w-4 h-4 mr-2" /> Baixar PDF do pedido
            </Button>
            {token && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setEditOpen(true)} disabled={regenerating}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar itens
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={regeneratePayment}
                  disabled={regenerating}
                >
                  {regenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Novo link
                </Button>
              </div>
            )}
            {elapsedTooLong && (
              <p className="text-xs text-muted-foreground">
                Verificação automática pausada. Use o botão acima para tentar novamente.
              </p>
            )}
          </>
        )}
      </div>
      {token && quoteId && (
        <EditOrderDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          quoteId={quoteId}
          token={token}
          onSaved={fetchQuote}
        />
      )}
    </div>
  );
}

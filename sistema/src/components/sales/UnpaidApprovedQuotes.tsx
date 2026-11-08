import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, MessageCircle } from "lucide-react";
import { FullQuote } from "@/types/models";
import { Button } from "@/components/ui/button";
import { formatCurrency, getQuoteTotal } from "@/lib/formatQuote";
import { contactDays } from "@/lib/salesFollowUp";
import { openWhatsApp } from "@/lib/whatsappTemplates";
import { supabase, FN_PREFIX } from "@/integrations/supabase/client";
import { useSalesFollowUp } from "@/hooks/useSalesFollowUp";
import { toast } from "sonner";

export function UnpaidApprovedQuotes({ quotes, loading = false }: { quotes: FullQuote[]; loading?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const contact = useSalesFollowUp();
  const pending = quotes.filter(q => q.status === "aprovado" && q.payment_status === "pending");
  const resend = async (q: FullQuote) => {
    if (!q.client?.phone) { toast.error("Cliente sem telefone. Atualize o cadastro."); return; }
    // Reserve a tab during the user gesture: async checkout generation otherwise blocks mobile popups.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setBusy(q.id);
    try {
      const { data: transactions, error } = await supabase.from("payment_transactions").select("payment_link,checkout_url,status,metadata").eq("quote_id", q.id).eq("provider", "infinitypay").eq("status", "pending").order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      const tx = transactions?.[0];
      let url = tx?.checkout_url || tx?.payment_link;
      if (!url) {
        const { data, error: createError } = await supabase.functions.invoke(`${FN_PREFIX}infinitypay-create-link`, { body: { quoteId: q.id, redirectUrl: `${window.location.origin}/pedido/${q.id}/sucesso` } });
        if (createError || !data?.url) throw createError || new Error("Link indisponível");
        url = data.url;
      }
      const text = `Olá ${q.client.name.split(" ")[0]}! Seu orçamento #${q.id.slice(0, 8).toUpperCase()} da Melhoraço está aprovado e aguardando pagamento. Segue o link para concluir: ${url}`;
      // openWhatsApp stays the single phone normalization and message-opening utility.
      if (!openWhatsApp(q.client.phone, text, tab)) throw new Error("Telefone inválido");
      await contact.mutateAsync({ quote: q, kind: "payment", text });
    } catch { tab?.close(); toast.error("Não foi possível reenviar a cobrança. Abra o orçamento e tente novamente."); }
    finally { setBusy(null); }
  };
  return <section aria-labelledby="unpaid-title" className="space-y-4 min-w-0">
    <header className="flex flex-wrap items-end justify-between gap-2"><h2 id="unpaid-title" className="text-xl font-black text-foreground flex items-center gap-2"><CreditCard className="size-5 shrink-0" />Aprovados aguardando pagamento</h2><span className="text-sm font-bold text-muted-foreground">{pending.length} · {formatCurrency(pending.reduce((sum, q) => sum + getQuoteTotal(q), 0))}</span></header>
    {loading ? <p role="status" className="text-muted-foreground">Carregando pagamentos…</p> : pending.length === 0 ? <p className="text-muted-foreground py-4">Nenhum aprovado aguardando pagamento.</p> : <div className="max-h-96 overflow-y-auto divide-y divide-border border-y border-border">
      {pending.map(q => <article key={q.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0"><Link to={`/quotes/${q.id}`} className="font-bold hover:underline break-words">{q.client?.name}</Link><p className="font-semibold tabular-nums">{formatCurrency(getQuoteTotal(q))}</p><p className="text-xs text-muted-foreground">{q.approved_at || q.signed_at ? `${contactDays({ created_at: q.approved_at || q.signed_at || q.created_at })} dias desde a aprovação${q.approved_at ? "" : " assinada"}` : "Data de aprovação não registrada"}</p></div>
        <div className="grid gap-2 sm:flex sm:flex-wrap"><Button className="h-11" disabled={busy !== null} onClick={() => void resend(q)}><MessageCircle />{busy === q.id ? "Preparando…" : "Reenviar link de pagamento"}</Button><Button variant="outline" className="h-11" asChild><Link to={`/quotes/${q.id}`}>Já foi pago</Link></Button></div>
      </article>)}
    </div>}
  </section>;
}

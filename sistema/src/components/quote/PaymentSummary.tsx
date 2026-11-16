import { useQuery } from "@tanstack/react-query";
import { ArrowDown, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatQuote";
import { fetchQuotePayments, quotePaymentsKey, summarizePayments } from "@/lib/quotePayments";
import type { FullQuote } from "@/lib/cloudStore";

/**
 * Resumo do dinheiro do pedido (fundo escuro): total, recebido, falta e o próximo passo.
 * Os lançamentos são registrados na seção Pagamentos, abaixo.
 */
export function PaymentSummary({ quote, total }: { quote: FullQuote; total: number }) {
  const paymentsQuery = useQuery({
    queryKey: quotePaymentsKey(quote.id),
    queryFn: () => fetchQuotePayments(quote.id),
    enabled: !!quote.id,
  });

  const payments = paymentsQuery.data ?? [];
  const { received, remaining, paid } = summarizePayments(payments, total);
  const downPayment = Number((quote as any).down_payment) || 0;
  const sinalDue = downPayment > 0 ? downPayment : total;

  const nextStep = paid
    ? { text: "Pedido quitado. Emita o recibo de quitação.", tone: "text-emerald-400" }
    : received === 0
      ? { text: `Cobrar o sinal de ${formatCurrency(sinalDue)}.`, tone: "text-white" }
      : { text: `Cobrar o saldo de ${formatCurrency(remaining)}.`, tone: "text-amber-400" };

  const goToPayments = () => {
    document.getElementById("pagamentos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4">
      <label className="label-caps !text-white/30 !mb-0">Pagamentos</label>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Total</p>
          <p className="font-black tabular-nums text-sm sm:text-base">{formatCurrency(total)}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Recebido</p>
          <p className="font-black tabular-nums text-sm sm:text-base text-emerald-400">{formatCurrency(received)}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Falta</p>
          <p className="font-black tabular-nums text-sm sm:text-base text-amber-400">{formatCurrency(remaining)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 p-4 flex items-start gap-3">
        {paid ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <ArrowDown className="w-5 h-5 text-white/50 shrink-0 mt-0.5" />}
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Próximo passo</p>
          <p className={`font-bold text-sm ${nextStep.tone}`}>{nextStep.text}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={goToPayments}
        className="w-full h-12 rounded-2xl bg-white text-slate-900 font-black text-sm min-h-[44px] active:scale-[0.98] transition-transform"
      >
        Registrar pagamento
      </button>
    </div>
  );
}

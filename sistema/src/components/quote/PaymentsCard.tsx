import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatQuote";
import { computeQuoteTotals } from "@/lib/quoteCalculations";
import type { FullQuote } from "@/lib/cloudStore";
import {
  createQuotePayment, deleteQuotePayment, fetchQuotePayments, PAYMENT_KIND_LABEL, quotePaymentsKey,
  summarizePayments, type PaymentKind,
} from "@/lib/quotePayments";

const todayIso = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Fortaleza" });
const METHODS = ["Pix", "Cartão", "Boleto", "Dinheiro", "Transferência"];

/** Pagamentos recebidos do pedido: lista, registro de novo valor e remoção (somente o dono). */
export function PaymentsCard({ quote }: { quote: FullQuote }) {
  const queryClient = useQueryClient();
  const total = computeQuoteTotals(quote as any).total;
  const paymentsQuery = useQuery({
    queryKey: quotePaymentsKey(quote.id),
    queryFn: () => fetchQuotePayments(quote.id),
    staleTime: 30_000,
  });
  const payments = paymentsQuery.data || [];
  const summary = summarizePayments(payments, total);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [kind, setKind] = useState<PaymentKind>("parcial");
  const [method, setMethod] = useState("");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: quotePaymentsKey(quote.id) });
    queryClient.invalidateQueries({ queryKey: ["investor-sales"] });
  };

  const submit = async () => {
    const value = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    setSaving(true);
    try {
      await createQuotePayment({
        quoteId: quote.id,
        kind,
        amount: value,
        paidAt: new Date(`${date}T12:00:00-03:00`).toISOString(),
        method: method || null,
      });
      toast.success("Pagamento registrado.");
      setOpen(false);
      setAmount("");
      setMethod("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível registrar o pagamento.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteQuotePayment(id);
      refresh();
    } catch {
      toast.error("Não foi possível remover. Só o dono da empresa pode apagar um pagamento.");
    }
  };

  return (
    <Card className="rounded-3xl border-slate-200">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pagamentos</p>
          <Button size="sm" variant="outline" className="rounded-xl font-black gap-1" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Registrar
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[10px] font-black uppercase text-muted-foreground">Total</p><p className="font-black tabular-nums">{formatCurrency(total)}</p></div>
          <div><p className="text-[10px] font-black uppercase text-muted-foreground">Recebido</p><p className="font-black tabular-nums text-emerald-600">{formatCurrency(summary.received)}</p></div>
          <div><p className="text-[10px] font-black uppercase text-muted-foreground">Falta</p><p className="font-black tabular-nums">{formatCurrency(summary.remaining)}</p></div>
        </div>

        {paymentsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando pagamentos…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {payments.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">Recibo {i + 1}: {PAYMENT_KIND_LABEL[p.kind]}</p>
                  <p className="text-xs text-muted-foreground">{fmtDay(p.paid_at)}{p.method ? ` · ${p.method}` : ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black tabular-nums">{formatCurrency(p.amount)}</span>
                  <Button size="icon" variant="ghost" aria-label="Remover pagamento" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => remove(p.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="pay-amount" className="text-xs font-black uppercase text-muted-foreground">Valor (R$)</label>
              <input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00"
                className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold tabular-nums" />
              <p className="text-xs text-muted-foreground">Falta {formatCurrency(summary.remaining)} para quitar.</p>
            </div>
            <div className="space-y-1">
              <label htmlFor="pay-kind" className="text-xs font-black uppercase text-muted-foreground">Tipo</label>
              <select id="pay-kind" value={kind} onChange={(e) => setKind(e.target.value as PaymentKind)} className="w-full h-11 rounded-xl border border-slate-200 px-3">
                <option value="sinal">Sinal</option>
                <option value="parcial">Pagamento parcial</option>
                <option value="saldo">Saldo</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="pay-date" className="text-xs font-black uppercase text-muted-foreground">Data</label>
              <input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 px-3" />
            </div>
            <div className="space-y-1">
              <label htmlFor="pay-method" className="text-xs font-black uppercase text-muted-foreground">Forma (opcional)</label>
              <select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 px-3">
                <option value="">Não informar</option>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={submit}>{saving ? "Salvando…" : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, MessageCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { renderPdfBlob, downloadBlob } from "@/lib/pdfLoader";
import { formatCurrency } from "@/lib/formatQuote";
import { openWhatsApp } from "@/lib/whatsappTemplates";
import { toast } from "sonner";
import type { FullQuote } from "@/lib/cloudStore";
import { computeQuoteTotals } from "@/lib/quoteCalculations";
import { fetchQuotePayments, quotePaymentsKey, type QuotePayment } from "@/lib/quotePayments";
import { RECEIPT_META, availableReceipts, receiptAmount, receiptWarning, receiptWhatsAppText, type ReceiptType } from "@/lib/documents";

/** Um item da lista de recibos: quitação, ou um recibo parcial por pagamento registrado. */
type ReceiptItem = { type: ReceiptType; payment?: QuotePayment; seq?: number };

export function ReceiptActions({ quote, logoUrl, signatureUrl, documentSettings, onGoToPayment }: {
  quote: FullQuote; logoUrl?: string; signatureUrl?: string; documentSettings?: unknown; onGoToPayment: () => void;
}) {
  const [pending, setPending] = useState<ReceiptItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const paymentsQuery = useQuery({
    queryKey: quotePaymentsKey(quote.id),
    queryFn: () => fetchQuotePayments(quote.id),
    staleTime: 30_000,
  });
  const payments = paymentsQuery.data || [];
  const total = computeQuoteTotals(quote as any).total;

  const items: ReceiptItem[] = payments.length > 0
    ? [
        ...payments.map((payment, i) => ({ type: "partial" as const, payment, seq: i + 1 })),
        { type: "full" as const },
      ]
    : availableReceipts(quote).map((type) => ({ type }));

  const keyOf = (item: ReceiptItem) => (item.payment ? `p-${item.payment.id}` : item.type);
  const labelOf = (item: ReceiptItem) => (item.payment ? `Recibo parcial ${item.seq}: ${formatMoneyKind(item.payment)}` : RECEIPT_META[item.type].button);
  const amountOf = (item: ReceiptItem) => (item.payment ? item.payment.amount : item.type === "full" && payments.length > 0 ? total : receiptAmount(quote as any, item.type));
  const warnOf = (item: ReceiptItem) => (item.payment ? null : receiptWarning(quote as any, item.type));

  const generate = async (item: ReceiptItem) => {
    setPending(null);
    const k = keyOf(item);
    setBusy(k);
    try {
      const { ReceiptPDF } = await import("@/components/ReceiptPDF");
      const blob = await renderPdfBlob(
        <ReceiptPDF
          quote={quote}
          logoUrl={logoUrl}
          signatureUrl={signatureUrl}
          type={item.type}
          documentSettings={documentSettings}
          payment={item.payment}
          payments={payments}
          seq={item.seq}
        />,
      );
      const name = item.payment ? `recibo-P${item.seq}-${quote.id.slice(0, 8)}.pdf` : `recibo-${RECEIPT_META[item.type].suffix}-${quote.id.slice(0, 8)}.pdf`;
      downloadBlob(blob, name);
    } catch {
      toast.error("Não foi possível gerar o recibo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Recibos</p>
      {items.map((item) => {
        const k = keyOf(item);
        const text = labelOf(item);
        return (
          <div key={k} className="flex gap-2">
            <Button variant="outline" disabled={busy === k} className="flex-1 h-14 rounded-2xl justify-between font-black"
              onClick={() => (warnOf(item) ? setPending(item) : generate(item))}>
              <span className="flex items-center gap-2"><Printer className="w-5 h-5" />{busy === k ? "Gerando…" : text}</span>
              <span className="text-sm">{formatCurrency(amountOf(item))}</span>
            </Button>
            <Button variant="outline" aria-label={`Enviar ${text} pelo WhatsApp`} className="h-14 w-14 rounded-2xl"
              disabled={!quote.client?.phone}
              onClick={() => openWhatsApp(quote.client?.phone || "", receiptWhatsAppText(quote as any, item.type, formatCurrency, item.payment ? { amount: item.payment.amount } : undefined, item.seq))}>
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>
        );
      })}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-primary" />Atenção</DialogTitle>
            <DialogDescription>{pending && warnOf(pending)}. Deseja gerar o recibo mesmo assim?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setPending(null); onGoToPayment(); }}>Registrar pagamento</Button>
            <Button onClick={() => pending && generate(pending)}>Gerar mesmo assim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatMoneyKind(p: QuotePayment): string {
  return p.kind === "sinal" ? "sinal" : p.kind === "saldo" ? "saldo" : "parcial";
}

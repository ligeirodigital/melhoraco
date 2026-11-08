import { useState } from "react";
import { Printer, MessageCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { renderPdfBlob, downloadBlob } from "@/lib/pdfLoader";
import { formatCurrency } from "@/lib/formatQuote";
import { openWhatsApp } from "@/lib/whatsappTemplates";
import { toast } from "sonner";
import type { FullQuote } from "@/lib/cloudStore";
import { RECEIPT_META, availableReceipts, receiptAmount, receiptWarning, receiptWhatsAppText, type ReceiptType } from "@/lib/documents";

export function ReceiptActions({ quote, logoUrl, signatureUrl, documentSettings, onGoToPayment }: {
  quote: FullQuote; logoUrl?: string; signatureUrl?: string; documentSettings?: unknown; onGoToPayment: () => void;
}) {
  const [pending, setPending] = useState<ReceiptType | null>(null);
  const [busy, setBusy] = useState<ReceiptType | null>(null);

  const generate = async (type: ReceiptType) => {
    setPending(null);
    setBusy(type);
    try {
      const { ReceiptPDF } = await import("@/components/ReceiptPDF");
      const blob = await renderPdfBlob(<ReceiptPDF quote={quote} logoUrl={logoUrl} signatureUrl={signatureUrl} type={type} documentSettings={documentSettings} />);
      downloadBlob(blob, `recibo-${RECEIPT_META[type].suffix}-${quote.id.slice(0, 8)}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o recibo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Recibos</p>
      {availableReceipts(quote).map((type) => (
        <div key={type} className="flex gap-2">
          <Button variant="outline" disabled={busy === type} className="flex-1 h-14 rounded-2xl justify-between font-black"
            onClick={() => (receiptWarning(quote as any, type) ? setPending(type) : generate(type))}>
            <span className="flex items-center gap-2"><Printer className="w-5 h-5" />{busy === type ? "Gerando…" : RECEIPT_META[type].button}</span>
            <span className="text-sm">{formatCurrency(receiptAmount(quote as any, type))}</span>
          </Button>
          <Button variant="outline" aria-label={`Enviar ${RECEIPT_META[type].button} pelo WhatsApp`} className="h-14 w-14 rounded-2xl"
            disabled={!quote.client?.phone}
            onClick={() => openWhatsApp(quote.client?.phone || "", receiptWhatsAppText(quote as any, type, formatCurrency))}>
            <MessageCircle className="w-5 h-5" />
          </Button>
        </div>
      ))}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-primary" />Atenção</DialogTitle>
            <DialogDescription>{pending && receiptWarning(quote as any, pending)}. Deseja gerar o recibo mesmo assim?</DialogDescription>
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

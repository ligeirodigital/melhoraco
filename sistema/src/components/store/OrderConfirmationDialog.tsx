import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, MessageCircle, ExternalLink, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { openTrackedWhatsApp } from "@/lib/publicTracking";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  whatsappText: string;
  paymentUrl: string;
}

export default function OrderConfirmationDialog({ open, onOpenChange, whatsappText, paymentUrl }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      toast.success("Texto copiado");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const waUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pedido criado ✅</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Você pode copiar o resumo abaixo ou enviar direto pelo WhatsApp e, quando quiser,
            ir para o pagamento.
          </p>

          <Textarea value={whatsappText} readOnly className="font-mono text-xs h-56" />

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copiado" : "Copiar texto"}
            </Button>
            <Button
              variant="outline"
              className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-700"
              onClick={() => openTrackedWhatsApp(waUrl)}
            >
              <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
            </Button>
          </div>

          <Button
            className="w-full bg-orange-500 hover:bg-orange-600"
            onClick={() => (window.location.href = paymentUrl)}
          >
            <ExternalLink className="w-4 h-4 mr-2" /> Ir para pagamento agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

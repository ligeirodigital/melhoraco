import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { brl } from "@/lib/storeHelpers";

type Item = {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quoteId: string;
  token: string;
  onSaved?: () => void;
};

export default function EditOrderDialog({ open, onOpenChange, quoteId, token, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_public_quote_by_id", {
          p_quote_id: quoteId, p_token: token,
        });
        if (error) throw error;
        const raw = (data as any)?.items || [];
        setItems(raw.map((i: any) => ({
          product_id: i.product_id,
          product_name: i.product_name || i.product?.name || "Item",
          unit_price: Number(i.unit_price || 0),
          quantity: Number(i.quantity || 1),
        })));
      } catch (e: any) {
        toast.error(e.message || "Erro ao carregar itens");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, quoteId, token]);

  const updateQty = (id: string, delta: number) =>
    setItems((prev) =>
      prev.map((i) => i.product_id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
          .filter((i) => i.quantity > 0));

  const remove = (id: string) =>
    setItems((prev) => prev.filter((i) => i.product_id !== id));

  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  const save = async () => {
    if (items.length === 0) return toast.error("Adicione ao menos 1 item");
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("update_public_quote_items", {
        p_quote_id: quoteId,
        p_token: token,
        p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })) as any,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) {
        if (res?.reason === "already_paid") throw new Error("Pedido já foi pago e não pode ser editado");
        throw new Error(res?.reason || "Erro ao atualizar");
      }
      toast.success("Pedido atualizado. Gere um novo link de pagamento.");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar itens do pedido</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum item.</p>
            )}
            {items.map((i) => (
              <div key={i.product_id} className="flex items-center gap-2 border rounded-lg p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{i.product_name}</p>
                  <p className="text-xs text-muted-foreground">{brl(i.unit_price)} · {brl(i.unit_price * i.quantity)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(i.product_id, -1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{i.quantity}</span>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(i.product_id, 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(i.product_id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-bold">{brl(total)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || loading} className="bg-orange-500 hover:bg-orange-600">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

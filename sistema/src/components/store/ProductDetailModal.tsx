import { CatalogPrice } from "@/components/catalog/CatalogPrice";
import { ProductImage } from "@/components/catalog/ProductImage";
import { isSoldOut, priceUnit } from "@/lib/catalog";
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import { StoreProduct, brl, extractDimensions } from "@/lib/storeHelpers";

interface Props {
  product: StoreProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: StoreProduct, quantity: number) => void;
}

export default function ProductDetailModal({ product, open, onOpenChange, onAdd }: Props) {
  const [qty, setQty] = useState(1);

  useEffect(() => { if (open) setQty(1); }, [open, product?.id]);

  if (!product) return null;
  const dimensions = extractDimensions(product.description);
  const outOfStock = isSoldOut(product);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        <div className="grid md:grid-cols-2 gap-0">
          <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
            <ProductImage src={product.image_url} name={product.name} className="w-full h-full" />
          </div>
          <div className="p-6 flex flex-col">
            {product.category && (
              <Badge variant="secondary" className="w-fit mb-2">{product.category}</Badge>
            )}
            <h2 className="text-xl font-bold">{product.name}</h2>
            <CatalogPrice product={product} price={product.price} />

            {dimensions && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Dimensões</p>
                <p className="font-medium">{dimensions}</p>
              </div>
            )}

            {product.description && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Descrição</p>
                <p className="text-sm whitespace-pre-line">{product.description}</p>
              </div>
            )}

            <div className="mt-auto pt-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Quantidade:</span>
                <Button size="icon" variant="outline" className="h-8 w-8"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center font-medium">{qty}</span>
                <Button size="icon" variant="outline" className="h-8 w-8"
                  onClick={() => setQty((q) => q + 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={outOfStock}
                onClick={() => { onAdd(product, qty); onOpenChange(false); }}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {outOfStock ? "Indisponível" : `Adicionar ${qty} ao carrinho`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

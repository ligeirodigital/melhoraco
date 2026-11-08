import { Badge } from "@/components/ui/badge";
import { discountPercent, orderLabel, priceUnit, type CatalogMetadata } from "@/lib/catalog";
import { brl } from "@/lib/storeHelpers";

export function CatalogPrice({ product, price, previous }: { product: CatalogMetadata; price: number; previous?: number | null }) {
  const old = previous === undefined ? product.compare_at_price : previous;
  const discount = discountPercent(price, old);
  return <div className="space-y-1 min-w-0">
    {discount !== null && <div className="flex items-center gap-2 flex-wrap text-sm">
      <span className="text-muted-foreground">de <s>{brl(old ?? 0)}</s></span>
      <Badge variant="secondary">{discount}% OFF</Badge>
    </div>}
    <p className="font-bold text-primary flex items-baseline gap-1 flex-wrap">
      {discount !== null && <span className="text-sm">por</span>}<span>{brl(price)}</span>
      {priceUnit(product.name) && <span className="text-sm font-normal">por dígito</span>}
    </p>
    {orderLabel(product) && <p className="text-xs text-muted-foreground">{orderLabel(product)}</p>}
  </div>;
}

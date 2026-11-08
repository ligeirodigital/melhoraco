export type CatalogMetadata = {
  name?: string | null;
  compare_at_price?: number | null;
  made_to_order?: boolean | null;
  lead_time_days?: number | null;
  stock_quantity?: number | null;
  image_url?: string | null;
};

export function discountPercent(price: number, previous?: number | null): number | null {
  if (!Number.isFinite(price) || price < 0 || previous == null || !Number.isFinite(previous) || previous <= price) return null;
  return Math.round((previous - price) / previous * 100);
}

export function isSoldOut(product: CatalogMetadata, variant?: { stock_quantity?: number | null } | null): boolean {
  if (product.made_to_order) return false;
  const stock = variant ? variant.stock_quantity : product.stock_quantity;
  return stock != null && stock <= 0;
}

export function sizeLabel(name?: string | null): string {
  const size = name?.match(/(\d+)\s*cm/i);
  return size ? `${size[1]} cm` : "Inox";
}

export function priceUnit(name?: string | null): string {
  return /n[uú]meros?/i.test(name ?? "") ? "por dígito" : "";
}

export function orderLabel(product: CatalogMetadata): string | null {
  if (!product.made_to_order) return null;
  return product.lead_time_days ? `Feito sob encomenda · pronto em até ${product.lead_time_days} dias` : "Feito sob encomenda";
}

export function itemCatalog(item: { product?: CatalogMetadata | null; products?: CatalogMetadata | null }): CatalogMetadata | null {
  return item.product ?? item.products ?? null;
}

export type StoreVariant = {
  id: string;
  name: string;
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number | null;
};

export type StoreProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compare_at_price?: number | null;
  made_to_order?: boolean;
  lead_time_days?: number | null;
  image_url: string | null;
  category: string | null;
  stock_quantity: number | null;
  created_at?: string;
  sort_order?: number | null;
  has_variants?: boolean;
  rating_avg?: number;
  rating_count?: number;
  sales_count?: number;
};

export type StoreProductDetail = StoreProduct & {
  sku?: string | null;
  variants: StoreVariant[];
  reviews: {
    rating: number;
    comment: string | null;
    photo: string | null;
    created_at: string;
    client_name: string;
  }[];
  related: Pick<StoreProduct, "id" | "name" | "price" | "image_url" | "category">[];
};

export type CartItem = {
  product: StoreProduct;
  quantity: number;
  variant?: StoreVariant | null;
};

export const brl = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function extractDimensions(description: string | null): string | null {
  if (!description) return null;
  const m = description.match(/dimens[õo]es?\s*[:\-]\s*([^\n\r]+)/i);
  return m ? m[1].trim() : null;
}

export function cartItemPrice(item: CartItem): number {
  const adj = item.variant?.price_adjustment ?? 0;
  return (item.product.price + adj) * item.quantity;
}

export function cartItemKey(item: CartItem): string {
  return `${item.product.id}:${item.variant?.id ?? "_"}`;
}

// ---------- Favorites (wishlist) ----------
const FAV_KEY = "melhoraco_favorites";
export function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
}
export function toggleFavorite(id: string): string[] {
  const cur = getFavorites();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  localStorage.setItem(FAV_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("favorites-changed"));
  return next;
}
export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}

// ---------- Shipping by CEP prefix (simple regional table) ----------
export type ShippingQuote = { fee: number; label: string; days: string };

const CEP_TABLE: { prefix: number[]; fee: number; label: string; days: string }[] = [
  { prefix: [1, 19], fee: 0, label: "Frete grátis — Grande São Paulo", days: "1-2 dias úteis" },
  { prefix: [20, 28], fee: 34.9, label: "Rio de Janeiro", days: "2-4 dias úteis" },
  { prefix: [29, 29], fee: 39.9, label: "Espírito Santo", days: "3-5 dias úteis" },
  { prefix: [30, 39], fee: 42.9, label: "Minas Gerais", days: "3-5 dias úteis" },
  { prefix: [40, 48], fee: 74.9, label: "Bahia / Sergipe / Alagoas", days: "5-8 dias úteis" },
  { prefix: [49, 56], fee: 84.9, label: "Pernambuco / Paraíba", days: "6-9 dias úteis" },
  { prefix: [57, 63], fee: 94.9, label: "Ceará / Piauí / Maranhão", days: "7-10 dias úteis" },
  { prefix: [64, 69], fee: 129.9, label: "Norte", days: "8-14 dias úteis" },
  { prefix: [70, 79], fee: 59.9, label: "Centro-Oeste / DF", days: "4-7 dias úteis" },
  { prefix: [80, 89], fee: 49.9, label: "Paraná / Santa Catarina", days: "3-6 dias úteis" },
  { prefix: [90, 99], fee: 64.9, label: "Rio Grande do Sul", days: "4-7 dias úteis" },
];

export function quoteShipping(cep: string): ShippingQuote | null {
  const digits = (cep || "").replace(/\D/g, "");
  if (digits.length < 5) return null;
  const p = parseInt(digits.slice(0, 2), 10);
  if (Number.isNaN(p)) return null;
  const match = CEP_TABLE.find((r) => p >= r.prefix[0] && p <= r.prefix[1]);
  return match ? { fee: match.fee, label: match.label, days: match.days } : null;
}

// ---------- WhatsApp order text ----------
export function buildOrderWhatsAppText(params: {
  clientName: string;
  items: CartItem[];
  total: number;
  orderNsu?: string | null;
  portalUrl?: string;
  paymentUrl?: string;
  shipping?: number;
  discount?: number;
}) {
  const { clientName, items, total, orderNsu, portalUrl, paymentUrl, shipping, discount } = params;
  const lines: string[] = [];
  lines.push(`🛒 *Novo pedido — Melhoraço*`);
  if (orderNsu) lines.push(`Nº ${orderNsu}`);
  lines.push("");
  lines.push(`👤 *Cliente:* ${clientName}`);
  lines.push("");
  lines.push(`🧱 *Itens:*`);
  for (const i of items) {
    const label = i.variant ? `${i.product.name} — ${i.variant.name}` : i.product.name;
    lines.push(`• ${i.quantity}x ${label} — ${brl(cartItemPrice(i))}`);
  }
  if (shipping && shipping > 0) lines.push(`🚚 Frete: ${brl(shipping)}`);
  if (discount && discount > 0) lines.push(`🎟️ Desconto: -${brl(discount)}`);
  lines.push("");
  lines.push(`💰 *Total: ${brl(total)}*`);
  if (portalUrl) { lines.push(""); lines.push(`🔗 Detalhes: ${portalUrl}`); }
  if (paymentUrl) lines.push(`💳 Pagamento: ${paymentUrl}`);
  return lines.join("\n");
}

export function orderStatusLabel(status: string | null, paymentStatus: string | null) {
  if (paymentStatus === "paid") return { label: "Pago", color: "bg-green-500" };
  if (status === "aprovado") return { label: "Confirmado", color: "bg-blue-500" };
  if (status === "recusado") return { label: "Recusado", color: "bg-red-500" };
  if (paymentStatus === "pending") return { label: "Aguardando pagamento", color: "bg-orange-500" };
  return { label: "Rascunho", color: "bg-gray-500" };
}

/**
 * Camada canônica de cálculo e normalização de orçamentos.
 *
 * Fonte única de verdade para: subtotal, desconto, frete/instalação, total,
 * entrada/saldo, nome exibido do produto e agrupamento de itens em documentos.
 *
 * Funções puras (sem React) — usadas por QuotePDF, ContractPDF, ServiceOrderPDF,
 * ReceiptPDF e formatQuote.
 *
 * REGRAS DE DOMÍNIO OBSERVADAS NO CÓDIGO/BANCO ATUAL (não alteradas aqui):
 * - `quotes.discount_type`: "fixed" (padrão quando null) | "percent".
 * - `quotes.discount_amount`: quando fixed → valor em R$; quando percent → o
 *   próprio número percentual (ex.: 10 = 10%).
 * - O percentual incide sobre (subtotal dos itens + entrega + instalação),
 *   comportamento já presente em QuotePDF/ReceiptPDF/ServiceOrderPDF/WhatsApp.
 * - `delivery_fee` e `installation_fee` somam ao total antes do desconto.
 * - `quote_items.unit_price` já é o preço unitário líquido gravado; os campos
 *   `unit_discount`/`unit_discount_type` são metadados da tela de edição e NÃO
 *   entram novamente no cálculo (evita desconto duplicado).
 * - `fixed_cost` é custo interno: nunca exibido nem usado como chave de
 *   agrupamento em documento do cliente.
 * - `down_payment` / `remaining_balance` são persistidos; quando ausentes o
 *   saldo é derivado de total - entrada.
 */

/** Arredondamento monetário consistente (2 casas, sem erro de ponto flutuante). */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type DiscountType = "fixed" | "percent";

export interface QuoteTotals {
  subtotal: number;
  shippingAmount: number;
  deliveryFee: number;
  installationFee: number;
  discountType: DiscountType;
  /** Valor bruto informado: R$ quando fixed, % quando percent. */
  discountValue: number;
  /** Desconto já convertido em R$. */
  discountAmountCalculated: number;
  total: number;
  downPayment: number;
  remainingBalance: number;
}

export interface QuoteLikeItem {
  product_name?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  variant_id?: string | null;
  product_id?: string | null;
  unit_discount?: number | null;
  unit_discount_type?: string | null;
  product?: { name?: string | null; description?: string | null } | null;
  products?: { name?: string | null; description?: string | null } | null;
}

export interface QuoteLike {
  items?: QuoteLikeItem[] | null;
  delivery_fee?: number | null;
  installation_fee?: number | null;
  discount_type?: string | null;
  discount_amount?: number | null;
  down_payment?: number | null;
  remaining_balance?: number | null;
}

export function normalizeDiscountType(raw: unknown): DiscountType {
  return raw === "percent" ? "percent" : "fixed";
}

/** Subtotal dos itens (quantidade × preço unitário). */
export function calcSubtotal(items: QuoteLikeItem[] | null | undefined): number {
  return roundMoney(
    (items || []).reduce((acc, i) => acc + num(i.unit_price) * num(i.quantity), 0)
  );
}

/**
 * Cálculo canônico de um orçamento. Nunca retorna NaN e nunca total negativo.
 */
export function computeQuoteTotals(quote: QuoteLike | null | undefined): QuoteTotals {
  const items = quote?.items || [];
  const subtotal = calcSubtotal(items);
  const deliveryFee = Math.max(0, roundMoney(num(quote?.delivery_fee)));
  const installationFee = Math.max(0, roundMoney(num(quote?.installation_fee)));
  const shippingAmount = roundMoney(deliveryFee + installationFee);

  const discountType = normalizeDiscountType(quote?.discount_type);
  const rawDiscount = num(quote?.discount_amount);
  const base = roundMoney(subtotal + shippingAmount);

  let discountValue = Math.max(0, rawDiscount);
  let discountAmountCalculated: number;

  if (discountType === "percent") {
    // percentual inválido é limitado a 0..100
    discountValue = Math.min(100, discountValue);
    discountAmountCalculated = roundMoney((base * discountValue) / 100);
  } else {
    discountAmountCalculated = roundMoney(discountValue);
  }

  // Desconto nunca pode ultrapassar a base (evita total negativo)
  discountAmountCalculated = Math.min(discountAmountCalculated, base);

  const total = Math.max(0, roundMoney(base - discountAmountCalculated));

  /**
   * REGRA CANÔNICA DO SALDO:
   * - Se houver `down_payment` informado, o saldo é SEMPRE derivado
   *   (total - entrada). O valor persistido em `remaining_balance` é apenas um
   *   snapshot gravado na criação/edição e pode ficar defasado quando o total
   *   muda depois (ex.: desconto de indicação aplicado na aprovação pública).
   * - Se não houver entrada informada, usa-se o saldo persistido quando existir
   *   (compatibilidade com registros históricos), senão o próprio total.
   * - Divergência entre persistido e derivado nunca é impressa: todos os
   *   documentos recebem o mesmo número derivado.
   */
  const downPayment = Math.min(Math.max(0, roundMoney(num(quote?.down_payment))), total);
  const persistedBalance = quote?.remaining_balance;
  const hasDownPayment = quote?.down_payment !== null && quote?.down_payment !== undefined;
  const remainingBalance =
    hasDownPayment || persistedBalance === null || persistedBalance === undefined
      ? Math.max(0, roundMoney(total - downPayment))
      : Math.max(0, roundMoney(num(persistedBalance)));


  return {
    subtotal,
    shippingAmount,
    deliveryFee,
    installationFee,
    discountType,
    discountValue,
    discountAmountCalculated,
    total,
    downPayment,
    remainingBalance,
  };
}

/** Total canônico do orçamento. */
export function calcQuoteTotal(quote: QuoteLike | null | undefined): number {
  return computeQuoteTotals(quote).total;
}

/**
 * Nome exibido do produto, com fallback explícito:
 * product_name → products/product.name → descrição válida → "Item".
 */
export function resolveItemName(item: QuoteLikeItem | null | undefined): string {
  const candidates = [
    item?.product_name,
    item?.products?.name,
    item?.product?.name,
    item?.products?.description,
    item?.product?.description,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "Item";
}

export interface DocumentItemGroup {
  /** Nome base, sem o sufixo entre parênteses. */
  mainName: string;
  /** Variações/detalhes extraídos dos parênteses (ex.: "1", "5", "A"). */
  details: string[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product_id?: string | null;
  variant_id?: string | null;
  indices: number[];
}

/** Separa "Número 15cm (A)" em { mainName, detail }. */
export function splitItemLabel(name: string): { mainName: string; detail: string } {
  const match = name.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) return { mainName: match[1].trim(), detail: match[2].trim() };
  return { mainName: name.trim(), detail: "" };
}

/**
 * Agrupamento único para documentos comerciais.
 *
 * IDENTIDADE COMERCIAL DO ITEM (chave canônica):
 *   product_id + variant_id + rótulo COMPLETO (nome base + detalhe entre
 *   parênteses: medida/acabamento/cor/modelo/especificação) + preço unitário +
 *   desconto individual (valor + tipo).
 *
 * Ou seja: dois itens só agrupam quando são exatamente o mesmo produto vendido
 * pelo mesmo preço. Variante/especificação diferente NUNCA agrupa, mesmo com
 * preço igual.
 *
 * NÃO participam da chave: fixed_cost, custo, margem ou qualquer dado interno.
 */
type InternalGroup = DocumentItemGroup & {
  _key: string;
};

export function groupDocumentItems(
  items: QuoteLikeItem[] | null | undefined
): DocumentItemGroup[] {
  const groups = (items || []).reduce((acc: InternalGroup[], item, index) => {
    const label = resolveItemName(item);
    const { mainName, detail } = splitItemLabel(label);
    const unitPrice = roundMoney(num(item.unit_price));
    const quantity = num(item.quantity);
    const unitDiscount = num(item.unit_discount);
    const unitDiscountType = normalizeDiscountType(item.unit_discount_type);

    const key = [
      item.product_id ?? "",
      item.variant_id ?? "",
      label,
      unitPrice,
      unitDiscount,
      unitDiscountType,
    ].join("|");

    const existing = acc.find((g) => g._key === key);

    if (existing) {
      existing.quantity = roundMoney(existing.quantity + quantity);
      existing.totalPrice = roundMoney(existing.unitPrice * existing.quantity);
      existing.indices.push(index);
    } else {
      acc.push({
        _key: key,
        mainName,
        details: detail ? [detail] : [],
        quantity,
        unitPrice,
        totalPrice: roundMoney(unitPrice * quantity),
        product_id: item.product_id ?? null,
        variant_id: item.variant_id ?? null,
        indices: [index],
      });
    }
    return acc;
  }, []);

  // A chave interna não é exposta em documento do cliente.
  return groups.map(({ _key, ...group }) => group);
}


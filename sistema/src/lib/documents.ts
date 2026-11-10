import { computeQuoteTotals, type QuoteLike } from "./quoteCalculations";

/** Editable company header + commercial terms (business_settings.document_settings). */
export interface DocumentSettings {
  company_name: string;
  tagline: string;
  address: string;
  whatsapp: string;
  validity_days: number;
  lead_time: string;
  delivery: string;
  installation: string;
  installments: string;
}

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  company_name: "Melhoraço Inox",
  tagline: "Números residenciais em inox",
  address: "Av. Vinte de Janeiro, 1657, Casa 48 – Fortaleza/CE",
  whatsapp: "",
  validity_days: 7,
  lead_time: "Números de 15 cm prontos em 24 horas; demais tamanhos em até 7 dias úteis.",
  delivery: "Entrega grátis em Fortaleza com pagamento no pedido.",
  installation: "Instalação por R$ 100, disponível somente em Fortaleza.",
  installments: "Parcelamento em até 3x sem juros no cartão.",
};

export function resolveDocumentSettings(raw: unknown): DocumentSettings {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_DOCUMENT_SETTINGS };
  (Object.keys(out) as (keyof DocumentSettings)[]).forEach((k) => {
    const v = src[k];
    if (k === "validity_days") {
      const n = Number(v);
      if (v !== undefined && v !== null && v !== "" && Number.isFinite(n) && n > 0) out.validity_days = Math.round(n);
    } else if (typeof v === "string" && v.trim()) {
      (out as any)[k] = v.trim();
    }
  });
  return out;
}

export function documentFooter(s: DocumentSettings): string {
  return [s.company_name, s.tagline, s.address].filter(Boolean).join(" · ");
}

// ---------------- Receipts ----------------

export type ReceiptType = "down_payment" | "remaining_balance" | "full";

type ReceiptQuote = QuoteLike & {
  id: string;
  down_payment_paid_at?: string | null;
  final_payment_paid_at?: string | null;
  payment_date?: string | null;
};

export const RECEIPT_META: Record<ReceiptType, { title: string; suffix: string; button: string; short: string }> = {
  down_payment: { title: "Recibo de sinal", suffix: "S", button: "Recibo do sinal", short: "sinal" },
  remaining_balance: { title: "Recibo de saldo", suffix: "R", button: "Recibo do saldo restante", short: "saldo restante" },
  full: { title: "Recibo de quitação", suffix: "Q", button: "Recibo total (quitação)", short: "quitação" },
};

/** Which receipt buttons the quote screen should show. */
export function availableReceipts(quote: { down_payment?: number | string | null } | null | undefined): ReceiptType[] {
  return Number(quote?.down_payment) > 0 ? ["down_payment", "remaining_balance", "full"] : ["full"];
}

export function receiptNumber(quoteId: string, type: ReceiptType): string {
  return `#${quoteId.slice(0, 8).toUpperCase()}-${RECEIPT_META[type].suffix}`;
}

export function receiptAmount(quote: ReceiptQuote, type: ReceiptType): number {
  const t = computeQuoteTotals(quote);
  if (type === "down_payment") return t.downPayment;
  if (type === "remaining_balance") return t.remainingBalance;
  return t.total;
}

export function receiptPaidAt(quote: ReceiptQuote, type: ReceiptType): string | null {
  if (type === "down_payment") return quote.down_payment_paid_at ?? null;
  if (type === "remaining_balance") return quote.final_payment_paid_at ?? null;
  if (Number(quote.down_payment) > 0) {
    return quote.down_payment_paid_at && quote.final_payment_paid_at ? quote.final_payment_paid_at : null;
  }
  return quote.final_payment_paid_at ?? quote.payment_date ?? null;
}

/** Warning shown before generating a receipt whose payment is not registered yet. */
export function receiptWarning(quote: ReceiptQuote, type: ReceiptType): string | null {
  if (receiptPaidAt(quote, type)) return null;
  if (type === "down_payment") return "O sinal ainda não foi registrado como pago";
  if (type === "remaining_balance") return "O saldo ainda não foi registrado como pago";
  return "A quitação ainda não foi registrada como paga";
}

/** Ids que descrevem entrega, não pagamento (a tela grava "retirada" como forma de pagamento). */
const DELIVERY_ONLY_IDS = new Set(["retirada", "entrega", "correios"]);

export function paymentMethodLabel(raw?: string | null): string | null {
  if (!raw) return null;
  const [kind, inst] = raw.toLowerCase().split(":");
  if (DELIVERY_ONLY_IDS.has(kind)) return null;
  if (kind === "sinal_retirada") return "Sinal no pedido + restante na retirada";
  if (kind === "sinal_entrega") return "Sinal no pedido + restante na entrega";
  if (kind === "avista_pedido") return "À vista";
  const n = inst?.match(/(\d+)x/)?.[1];
  const parcels = n && Number(n) > 1 ? ` em ${n}x` : "";
  if (kind.includes("pix")) return "Pix";
  if (kind.includes("cart") || kind.includes("credit") || kind.includes("card")) return `Cartão${parcels}`;
  if (kind.includes("boleto")) return `Boleto${parcels}`;
  if (kind.includes("dinheiro") || kind.includes("cash")) return "Dinheiro";
  if (kind.includes("transf")) return "Transferência";
  return raw;
}

export function receiptWhatsAppText(quote: ReceiptQuote & { client?: { name?: string | null } | null }, type: ReceiptType, fmt: (n: number) => string): string {
  const name = quote.client?.name?.split(" ")[0];
  return `Olá${name ? `, ${name}` : ""}! Segue o ${RECEIPT_META[type].title.toLowerCase()} ${receiptNumber(quote.id, type)} no valor de ${fmt(receiptAmount(quote, type))}. Obrigado pela preferência!`;
}

// ---------------- Valor por extenso ----------------

const UNITS = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const HUNDREDS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function below1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const parts: string[] = [];
  const h = Math.floor(n / 100), r = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (r < 20) { if (r) parts.push(UNITS[r]); }
  else { parts.push(TENS[Math.floor(r / 10)] + (r % 10 ? ` e ${UNITS[r % 10]}` : "")); }
  return parts.join(" e ");
}

function integerWords(n: number): string {
  if (n === 0) return "zero";
  const groups: [number, string, string][] = [[1e9, "bilhão", "bilhões"], [1e6, "milhão", "milhões"], [1e3, "mil", "mil"]];
  const parts: string[] = [];
  let rest = n;
  for (const [size, sing, plur] of groups) {
    const g = Math.floor(rest / size);
    rest %= size;
    if (!g) continue;
    parts.push(size === 1e3 && g === 1 ? "mil" : `${below1000(g)} ${g === 1 ? sing : plur}`);
  }
  if (rest) parts.push(below1000(rest));
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const joinLast = rest > 0 && (rest < 100 || rest % 100 === 0);
  return parts.slice(0, -1).join(" ") + (joinLast ? " e " : " ") + last;
}

export function amountInWords(value: number): string {
  const v = Number.isFinite(value) ? Math.max(0, Math.round(value * 100)) : 0;
  const reais = Math.floor(v / 100), cents = v % 100;
  const parts: string[] = [];
  if (reais > 0) {
    const big = reais % 1_000_000 === 0;
    parts.push(`${integerWords(reais)}${big ? " de" : ""} ${reais === 1 ? "real" : "reais"}`);
  }
  if (cents > 0) parts.push(`${integerWords(cents)} ${cents === 1 ? "centavo" : "centavos"}`);
  return parts.length ? parts.join(" e ") : "zero real";
}

// Regras de preço e entrega da loja. O servidor sempre recalcula o total:
// o valor enviado pelo navegador nunca é usado para cobrar.

// Preço por dígito de cada tamanho. "promo" vale até FIM_PROMO; depois vale "normal".
// Tamanho com preço null fica indisponível no site.
const TAMANHOS = {
  "15": { promo: 59, normal: 90 },
  "20": { promo: null, normal: 120 },
  "30": { promo: null, normal: 180 },
};
const FIM_PROMO = Date.parse("2026-11-01T03:00:00Z"); // 31/10/2026 23:59 em Fortaleza
const FRETE_GRATIS_A_PARTIR = 200; // pedidos a partir deste valor não pagam entrega
const TAXA_ENTREGA = 15;           // entrega para pedidos abaixo do valor acima
const MAX_DIGITOS = 6;
const CIDADES = ["Fortaleza", "Caucaia", "Eusébio", "Maracanaú", "Aquiraz", "Itaitinga", "Pacatuba"];

function precoPorDigito(tamanho, agora = Date.now()) {
  const t = TAMANHOS[String(tamanho)];
  if (!t) return null;
  const preco = agora < FIM_PROMO ? (t.promo ?? t.normal) : t.normal;
  return typeof preco === "number" && preco > 0 ? preco : null;
}

function calcular(numeroCasa, tamanho) {
  const digitos = String(numeroCasa || "").replace(/\D/g, "").length;
  const unitario = precoPorDigito(tamanho);
  if (!unitario) return null;
  const subtotal = digitos * unitario;
  const frete = subtotal >= FRETE_GRATIS_A_PARTIR ? 0 : TAXA_ENTREGA;
  return { tamanho: String(tamanho), digitos, unitario, subtotal, frete, total: subtotal + frete };
}

function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }
function texto(s, max = 120) { return String(s || "").replace(/\s+/g, " ").trim().slice(0, max); }

module.exports = {
  TAMANHOS, FIM_PROMO, FRETE_GRATIS_A_PARTIR, TAXA_ENTREGA, MAX_DIGITOS, CIDADES,
  precoPorDigito, calcular, soDigitos, texto,
};

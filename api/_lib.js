// Regras de preço e entrega da loja. O servidor sempre recalcula o total:
// o valor enviado pelo navegador nunca é usado para cobrar.

const PRECO_PROMO = 59;          // R$ por dígito na promoção
const PRECO_NORMAL = 90;         // R$ por dígito depois da promoção
const FIM_PROMO = Date.parse("2026-11-01T03:00:00Z"); // 31/10/2026 23:59 em Fortaleza
const FRETE_GRATIS_A_PARTIR = 200; // pedidos a partir deste valor não pagam entrega
const TAXA_ENTREGA = 15;           // entrega para pedidos abaixo do valor acima
const MAX_DIGITOS = 6;
const MAX_JOGOS = 5;
const CIDADES = ["Fortaleza", "Caucaia", "Eusébio", "Maracanaú", "Aquiraz", "Itaitinga", "Pacatuba"];

function precoPorDigito(agora = Date.now()) {
  return agora < FIM_PROMO ? PRECO_PROMO : PRECO_NORMAL;
}

function calcular(numeroCasa, jogos) {
  const digitos = String(numeroCasa || "").replace(/\D/g, "").length;
  const qtd = Math.max(1, Math.min(MAX_JOGOS, parseInt(jogos, 10) || 1));
  const unitario = precoPorDigito();
  const subtotal = digitos * unitario * qtd;
  const frete = subtotal >= FRETE_GRATIS_A_PARTIR ? 0 : TAXA_ENTREGA;
  return { digitos, jogos: qtd, unitario, subtotal, frete, total: subtotal + frete };
}

function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }
function texto(s, max = 120) { return String(s || "").replace(/\s+/g, " ").trim().slice(0, max); }

module.exports = {
  PRECO_PROMO, PRECO_NORMAL, FIM_PROMO, FRETE_GRATIS_A_PARTIR, TAXA_ENTREGA,
  MAX_DIGITOS, MAX_JOGOS, CIDADES, precoPorDigito, calcular, soDigitos, texto,
};

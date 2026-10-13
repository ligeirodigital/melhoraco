// Cria o pagamento no Mercado Pago (Checkout Pro) a partir do pedido do site
// e devolve o link para o cliente pagar com Pix ou cartão.

const { calcular, soDigitos, texto, CIDADES, MAX_DIGITOS } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ erro: "Pagamento ainda não configurado. Fale com a gente pelo WhatsApp." });

  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

  const pedido = {
    numero_casa: soDigitos(b.numero_casa).slice(0, MAX_DIGITOS),
    nome: texto(b.nome, 80),
    telefone: soDigitos(b.telefone).slice(0, 13),
    cep: soDigitos(b.cep).slice(0, 8),
    rua: texto(b.rua, 120),
    numero_endereco: texto(b.numero_endereco, 20),
    complemento: texto(b.complemento, 80),
    bairro: texto(b.bairro, 60),
    cidade: texto(b.cidade, 40),
    instalacao: b.instalacao === true || b.instalacao === "true",
    observacao: texto(b.observacao, 200),
  };

  const erros = [];
  if (pedido.numero_casa.length < 1) erros.push("o número da casa");
  if (pedido.nome.length < 3) erros.push("seu nome");
  if (pedido.telefone.length < 10) erros.push("seu WhatsApp com DDD");
  if (pedido.cep.length !== 8) erros.push("o CEP");
  if (!pedido.rua) erros.push("a rua");
  if (!pedido.numero_endereco) erros.push("o número do endereço");
  if (!pedido.bairro) erros.push("o bairro");
  if (!CIDADES.includes(pedido.cidade)) erros.push("uma cidade atendida");
  if (erros.length) return res.status(400).json({ erro: "Confira " + erros.join(", ") + "." });

  const c = calcular(pedido.numero_casa, b.tamanho);
  if (!c) return res.status(400).json({ erro: "Escolha um tamanho disponível." });
  const id = "MLH-" + Date.now().toString(36).toUpperCase();
  const base = process.env.SITE_URL || `https://${req.headers.host}`;

  const itens = [{
    id: `numero-inox-${c.tamanho}cm`,
    title: `Número inox ${c.tamanho} cm "${pedido.numero_casa}" (${c.digitos} dígitos)`,
    quantity: 1,
    unit_price: c.subtotal,
    currency_id: "BRL",
  }];
  if (c.frete > 0) itens.push({ id: "entrega", title: "Entrega em " + pedido.cidade, quantity: 1, unit_price: c.frete, currency_id: "BRL" });

  const telefone = pedido.telefone.replace(/^55/, "");
  const preferencia = {
    items: itens,
    payer: {
      name: pedido.nome,
      phone: { area_code: telefone.slice(0, 2), number: telefone.slice(2) },
      address: { zip_code: pedido.cep, street_name: pedido.rua, street_number: pedido.numero_endereco },
    },
    external_reference: id,
    metadata: {
      pedido_id: id, ...pedido,
      tamanho: c.tamanho, digitos: c.digitos, unitario: c.unitario,
      subtotal: c.subtotal, frete: c.frete, total: c.total,
    },
    notification_url: `${base}/api/webhook`,
    back_urls: {
      success: `${base}/obrigado.html?v=${c.total}&o=${id}`,
      pending: `${base}/obrigado.html?v=${c.total}&o=${id}`,
      failure: `${base}/#pedido`,
    },
    auto_return: "approved",
    payment_methods: { installments: 3 },
    statement_descriptor: "MELHORACO",
  };

  try {
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": id },
      body: JSON.stringify(preferencia),
    });
    const data = await r.json();
    if (!r.ok || !data.init_point) {
      console.error("Mercado Pago recusou a preferência", r.status, JSON.stringify(data));
      return res.status(502).json({ erro: "Não foi possível abrir o pagamento agora. Tente de novo ou chame no WhatsApp." });
    }
    return res.status(200).json({ url: data.init_point, pedido_id: id, total: c.total });
  } catch (e) {
    console.error("Falha ao falar com o Mercado Pago", e);
    return res.status(502).json({ erro: "Não foi possível abrir o pagamento agora. Tente de novo ou chame no WhatsApp." });
  }
};

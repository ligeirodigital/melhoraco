// Recebe o aviso do Mercado Pago. Quando um pagamento é aprovado:
// 1) lança a venda na aba Vendas da planilha (via Apps Script, que ignora repetidos);
// 2) manda o pedido completo para o WhatsApp do Thiago (CallMeBot).
// Os dados do pagamento são sempre buscados de novo na API do Mercado Pago,
// então um aviso falso não consegue criar pedido.

module.exports = async (req, res) => {
  const q = req.query || {};
  const b = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
  const tipo = b.type || b.topic || q.type || q.topic;
  const pagamentoId = (b.data && b.data.id) || q["data.id"] || q.id;

  if (tipo !== "payment" || !pagamentoId) return res.status(200).json({ ignorado: true });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ erro: "MP_ACCESS_TOKEN ausente" });

  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(pagamentoId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      console.error("Não foi possível consultar o pagamento", pagamentoId, r.status);
      return res.status(500).json({ erro: "consulta falhou" });
    }
    const p = await r.json();
    if (p.status !== "approved") return res.status(200).json({ status: p.status });

    const m = p.metadata || {};
    const taxa = (p.fee_details || []).reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const total = Number(p.transaction_amount) || Number(m.total) || 0;
    const formaPagamento = p.payment_type_id === "bank_transfer" || p.payment_method_id === "pix" ? "Pix" : "Cartão";
    const endereco = [m.rua, m.numero_endereco, m.complemento].filter(Boolean).join(", ");

    const venda = {
      payment_id: String(p.id),
      pedido_id: m.pedido_id || p.external_reference || "",
      nome: m.nome || "",
      telefone: m.telefone || "",
      numero_casa: m.numero_casa || "",
      digitos: Number(m.digitos) || 0,
      tamanho: String(m.tamanho || "15"),
      total,
      frete: Number(m.frete) || 0,
      pagamento: formaPagamento,
      parcelas: p.installments || 1,
      taxa_pct: total > 0 ? Math.round((taxa / total) * 10000) / 10000 : 0,
      instalacao: m.instalacao === true || m.instalacao === "true",
      endereco, bairro: m.bairro || "", cidade: m.cidade || "", cep: m.cep || "",
      observacao: m.observacao || "",
    };

    let repetido = false;
    if (process.env.SHEETS_WEBHOOK_URL) {
      try {
        const s = await fetch(process.env.SHEETS_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret: process.env.SHEETS_SECRET || "", ...venda }),
          redirect: "follow",
        });
        const sr = safeJson(await s.text());
        repetido = !!(sr && sr.duplicate);
        if (!sr || !sr.ok) console.error("Planilha não confirmou o lançamento", JSON.stringify(sr));
      } catch (e) {
        console.error("Falha ao lançar na planilha", e);
      }
    }

    if (!repetido) await avisarWhatsApp(venda);
    return res.status(200).json({ ok: true, repetido });
  } catch (e) {
    console.error("Erro no webhook", e);
    return res.status(500).json({ erro: "falha interna" });
  }
};

async function avisarWhatsApp(v) {
  const apikey = process.env.CALLMEBOT_APIKEY;
  const fone = process.env.CALLMEBOT_PHONE;
  if (!apikey || !fone) return;
  const brl = (n) => "R$ " + Number(n).toFixed(2).replace(".", ",");
  const msg = [
    "✅ PEDIDO PAGO NO SITE",
    `Pedido: ${v.pedido_id}`,
    `Número: ${v.numero_casa} · ${v.tamanho} cm (${v.digitos} dígitos)`,
    `Total: ${brl(v.total)} no ${v.pagamento}${v.parcelas > 1 ? ` em ${v.parcelas}x` : ""}${v.frete ? ` (entrega ${brl(v.frete)})` : " (entrega grátis)"}`,
    `Cliente: ${v.nome} · wa.me/55${String(v.telefone).replace(/^55/, "")}`,
    `Endereço: ${v.endereco} · ${v.bairro} · ${v.cidade} · CEP ${v.cep}`,
    `Instalação: ${v.instalacao ? "SIM, combinar valor" : "não"}`,
    v.observacao ? `Obs.: ${v.observacao}` : "",
  ].filter(Boolean).join("\n");
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(fone)}&text=${encodeURIComponent(msg)}&apikey=${encodeURIComponent(apikey)}`;
    const r = await fetch(url);
    if (!r.ok) console.error("CallMeBot respondeu", r.status);
  } catch (e) {
    console.error("Falha ao avisar no WhatsApp", e);
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }

// Stage-specific WhatsApp templates for 1-click follow-up.
// Key = normalized stage name (lowercase, no accents). Falls back to "default".

export function normalizeStage(name?: string | null): string {
  if (!name) return "default";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

type TemplateCtx = {
  clientName?: string | null;
  companyName?: string;
  quoteNumber?: string | number | null;
  portalUrl?: string | null;
  daysStale?: number;
};

const first = (s?: string | null) => (s || "").split(" ")[0] || "";

const templates: Record<string, (c: TemplateCtx) => string> = {
  novo: (c) =>
    `Olá ${first(c.clientName)}! Aqui é da ${c.companyName || "Melhoraço"} 👋
Recebi seu contato e já estou preparando um orçamento sob medida para você.
Posso te fazer 2 perguntinhas rápidas para acertar 100% na proposta?`,

  "em contato": (c) =>
    `Oi ${first(c.clientName)}, tudo bem?
Passando aqui para confirmar as informações do seu projeto e agilizar o orçamento.
Prefere que eu te ligue ou seguimos por aqui mesmo?`,

  "orcamento enviado": (c) =>
    `Oi ${first(c.clientName)}! Enviei o orçamento #${c.quoteNumber ?? ""} pra você 📄
${c.portalUrl ? `Você pode revisar e aprovar aqui: ${c.portalUrl}\n` : ""}Ficou alguma dúvida? Estou à disposição para ajustar o que precisar 😉`,

  negociacao: (c) =>
    `${first(c.clientName)}, tudo certo por aí?
Sobre o orçamento #${c.quoteNumber ?? ""} — consegui rever aqui e temos margem para fechar em uma condição especial.
Quando podemos conversar 2 minutinhos?`,

  aprovado: (c) =>
    `Excelente, ${first(c.clientName)}! ✅
Orçamento #${c.quoteNumber ?? ""} aprovado. Já estou dando andamento.
Em breve confirmo a data de execução com você. Obrigado pela confiança! 🙌`,

  perdido: (c) =>
    `Oi ${first(c.clientName)}, tudo bem?
Notei que não seguimos com o projeto — sem problemas!
Se mudar de ideia ou surgir uma nova necessidade, é só chamar. Deixo aqui um voucher de 5% caso queira retomar 😉`,

  default: (c) =>
    `Olá ${first(c.clientName)}! Tudo bem?
Estou passando aqui para dar sequência no seu orçamento${c.quoteNumber ? ` #${c.quoteNumber}` : ""}.
${c.daysStale && c.daysStale >= 3 ? `Faz ${c.daysStale} dias que não falamos — ` : ""}posso te ajudar com alguma dúvida? 😊`,
};

export function getStageTemplate(stageName: string | null | undefined, ctx: TemplateCtx): string {
  const key = normalizeStage(stageName);
  const fn = templates[key] || templates.default;
  return fn(ctx);
}

export function openWhatsApp(phone: string | null | undefined, text: string, reservedWindow?: Window | null) {
  let digits = (phone || "").replace(/\D/g, "");
  if (!digits) return false;
  // Remove 0 inicial de DDD ("085..." -> "85...")
  if (digits.length >= 11 && digits.startsWith("0")) digits = digits.slice(1);
  // Se ainda não tiver DDI 55 e o tamanho for compatível com número BR (10-11), prefixa
  const withCountry =
    digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const url = `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
  if (reservedWindow && !reservedWindow.closed) reservedWindow.location.href = url;
  else window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

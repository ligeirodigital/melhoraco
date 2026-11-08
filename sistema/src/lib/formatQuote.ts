import { discountPercent, itemCatalog, priceUnit, sizeLabel } from "@/lib/catalog";
import { FullQuote } from "@/lib/cloudStore";
import { LOGO_BASE64 } from "@/lib/logoBase64";
import { calcQuoteTotal, computeQuoteTotals } from "@/lib/quoteCalculations";

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Parses "cartao_pedido:6x" → { base, installments: 6 }
// Parses "boleto:20d"      → { base: "boleto", dueDays: 20 }
export function parsePaymentMethod(raw?: string | null): { base: string; installments: number | null; dueDays: number | null } {
  if (!raw) return { base: "", installments: null, dueDays: null };
  const s = String(raw);
  // boleto:Nx:Dd → parcelado a cada D dias
  const boletoFull = s.match(/^(boleto):(\d+)x:(\d+)d$/);
  if (boletoFull) {
    const n = Number(boletoFull[2]);
    const d = Number(boletoFull[3]);
    return {
      base: boletoFull[1],
      installments: Number.isFinite(n) && n > 0 ? n : null,
      dueDays: Number.isFinite(d) && d > 0 ? d : null,
    };
  }
  const withInst = s.match(/^(.+):(\d+)x$/);
  if (withInst) {
    const n = Number(withInst[2]);
    return { base: withInst[1], installments: Number.isFinite(n) && n > 0 ? n : null, dueDays: null };
  }
  const withDays = s.match(/^(.+):(\d+)d$/);
  if (withDays) {
    const d = Number(withDays[2]);
    return { base: withDays[1], installments: null, dueDays: Number.isFinite(d) && d > 0 ? d : null };
  }
  return { base: s, installments: null, dueDays: null };
}

function smartProductName(name: string): string {
  // Se for um produto de número, melhora o nome apenas se for muito simples
  const sizeMatch = name.match(/(\d+)\s*cm/i);
  if (sizeMatch && /n[uú]mero|a[çc]o\s*inox/i.test(name)) {
    // Se o nome já contém o tamanho e parece descritivo, mantém
    if (name.toLowerCase().includes("inox") && name.includes(sizeMatch[0])) {
      return name;
    }
    return `Número residencial em aço inox 304 (${sizeMatch[1]}cm)`;
  }
  return name;
}

function formatInstallation(fee: number): string {
  if (!fee || fee <= 0) return "disponível sob solicitação";
  return formatCurrency(fee);
}

export function groupQuoteItems(items: any[]) {
  return items.reduce((acc: any[], item, index) => {
    // Extrai o nome base e o que estiver entre parênteses
    // Ex: "Numeros de casa de inox de 15cm (2)" -> mainName: "Numeros de casa de inox de 15cm", detail: "2"
    const match = item.product_name?.match(/^(.*?)\s*\((.*?)\)$/);
    const mainName = match ? match[1].trim() : (item.product_name || "").trim();
    const detail = match ? match[2].trim() : "";
    
    // Agrupamos pelo nome principal, preço unitário e custo fixo
    const existing = acc.find(g => 
      g.mainName === mainName && 
      g.unitPrice === item.unit_price && 
      g.fixedCost === item.fixedCost
    );
    
    if (existing) {
      existing.quantity += item.quantity;
      if (detail) {
        existing.details.push(detail);
      }
      existing.indices.push(item.originalIdx ?? index);
    } else {
      acc.push({
        mainName,
        details: detail ? [detail] : [],
        quantity: item.quantity,
        unitPrice: item.unit_price,
        fixedCost: item.fixedCost,
        product_id: item.product_id,
        variant_id: item.variant_id,
        indices: [item.originalIdx ?? index]
      });
    }
    return acc;
  }, []);
}

export function formatWhatsApp(quote: FullQuote, pixKey?: string, pixName?: string, portalUrl?: string): string {
  const groupedItems = groupQuoteItems(quote.items);

  const itemsText = groupedItems
    .map((group) => {
      const name = smartProductName(group.mainName);
      const variantsText = group.details.length > 0 ? ` (${group.details.join('')})` : '';
      const totalPrice = group.unitPrice * group.quantity;
      const product = itemCatalog(quote.items[group.indices[0]] ?? {});
      const pct = discountPercent(group.unitPrice, product?.compare_at_price);
      const promotion = pct !== null ? `de ~${formatCurrency(product?.compare_at_price ?? 0)}~ por ${formatCurrency(group.unitPrice)} (${pct}% OFF)` : formatCurrency(group.unitPrice);
      return `${group.quantity}x ${name}${variantsText} ${formatCurrency(totalPrice)}${priceUnit(name) || pct !== null ? `\n  ${promotion} ${priceUnit(name)}` : ""}`;
    })
    .join("\n");

  const total = getQuoteTotal(quote);

  let text = `📋 *Orçamento – Melhoraço*\n\n`;
  text += `👤 *Cliente:* ${quote.client.name}\n`;
  if (quote.delivery_address) text += `📍 *Entrega:* ${quote.delivery_address}\n`;
  text += `\n🧱 *Itens:*\n${itemsText}\n\n`;
  
  if (quote.delivery_fee > 0) text += `🚚 *Entrega:* ${formatCurrency(quote.delivery_fee)}\n`;
  if (quote.installation_fee > 0) text += `🛠 *Instalação:* ${formatCurrency(quote.installation_fee)}\n`;
  
  const discountType = (quote as any).discount_type || "fixed";
  const discountAmount = Number((quote as any).discount_amount || 0);
  if (discountAmount > 0) {
    const globalDiscount = computeQuoteTotals(quote as any).discountAmountCalculated;
    text += `📉 *Desconto:* -${formatCurrency(globalDiscount)}\n`;
  }

  text += `💰 *Total: ${formatCurrency(total)}*\n`;

  const pmInfo = parsePaymentMethod((quote as any).payment_method_type);
  if (pmInfo.base !== "boleto" && pmInfo.installments) {
    text += `💳 *Pagamento:* Cartão ${pmInfo.installments}x de ${formatCurrency(total / pmInfo.installments)} sem juros\n`;
  }
  if (pmInfo.base === "boleto" && pmInfo.dueDays) {
    if (pmInfo.installments && pmInfo.installments > 1) {
      text += `🧾 *Pagamento:* Boleto faturado ${pmInfo.installments}x de ${formatCurrency(total / pmInfo.installments)} a cada ${pmInfo.dueDays} dias\n`;
    } else {
      text += `🧾 *Pagamento:* Boleto com vencimento em ${pmInfo.dueDays} dias\n`;
    }
  }
  text += `\n`;

  if (portalUrl) {
    text += `🔗 *Link para aprovação:* ${portalUrl}\n\n`;
  }

  if (pixKey) {
    text += `📲 *PIX:* ${pixKey}\n`;
    if (pixName) text += `👤 *Favorecido:* ${pixName}\n\n`;
  }

  if (quote.deadline) text += `⏱ *Prazo:* ${quote.deadline}\n\n`;
  
  text += `💎 *Melhoraço Inox:* Aço 304 (não enferruja), Acabamento Premium.\n\n`;
  text += `📲 Qualquer dúvida, estou à disposição!`;

  return text;
}


export function getQuoteTotal(quote: FullQuote): number {
  return calcQuoteTotal(quote as any);
}

export function generatePDFHtml(quote: FullQuote): string {
  const total = getQuoteTotal(quote);
  const totals = computeQuoteTotals(quote as any);
  const subtotalItems = totals.subtotal;
  const groupedItems = groupQuoteItems(quote.items);
  const pmInfo = parsePaymentMethod((quote as any).payment_method_type);

  const itemsHtml = groupedItems
    .map((group) => {
      const name = smartProductName(group.mainName);
      const variantsText = group.details.length > 0 ? ` (${group.details.join('')})` : '';
      const totalPrice = group.unitPrice * group.quantity;
      const product = itemCatalog(quote.items[group.indices[0]] ?? {});
      const pct = discountPercent(group.unitPrice, product?.compare_at_price);
      const promo = pct !== null ? `de <s>${formatCurrency(product?.compare_at_price ?? 0)}</s> por (${pct}% OFF)<br>` : "";
      return `<tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb">${product?.image_url ? `<img src="${product.image_url.replace(/"/g, '&quot;')}" alt="" style="width:36px;height:36px;object-fit:contain;vertical-align:middle" onerror="this.style.display='none'">` : `<span style="font-size:11px">${sizeLabel(name)}</span>`} ${name}${variantsText}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center">${group.quantity}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right">${promo}${formatCurrency(group.unitPrice)} ${priceUnit(name)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${formatCurrency(totalPrice)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orçamento Melhoraço</title>
<style>
@page{size:A4;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a2332;max-width:100%;margin:0 auto;padding:20px;background:#fff;font-size:15px}
.header{display:flex;align-items:center;gap:14px;padding:18px 16px;background:linear-gradient(135deg,#1a2a3e 0%,#2a3f5f 100%);border-radius:12px;margin-bottom:16px}
.header img{width:52px;height:52px;border-radius:10px;object-fit:cover}
.header-text{flex:1}
.header h1{font-size:24px;color:#fff;letter-spacing:1px}
.header .subtitle{color:#f97316;font-size:13px;margin-top:2px;font-style:italic}
.section{margin:10px 0;padding:14px 16px;background:#fafbfc;border-radius:10px;border:1px solid #e5e7eb}
.section h3{color:#1a2a3e;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;font-weight:700}
.client-info{display:flex;gap:16px;flex-wrap:wrap}
.client-info div{font-size:15px;color:#4b5563}
.client-info strong{color:#1a2a3e}
table{width:100%;border-collapse:collapse;margin:4px 0}
th{background:#1a2a3e;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px}
th:first-child{border-radius:6px 0 0 0}th:last-child{border-radius:0 6px 0 0}
td{padding:10px 12px;font-size:14px;border-bottom:1px solid #e5e7eb}
.totals-section{background:#1a2a3e;border-radius:10px;padding:14px 18px;color:#fff;margin:10px 0}
.totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:14px;color:#94a3b8}
.totals-total{display:flex;justify-content:space-between;padding:8px 0 0;margin-top:6px;border-top:1px solid #334155;font-size:22px;font-weight:800;color:#f97316}
.features{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}
.feature{display:flex;align-items:center;gap:8px;font-size:13px;color:#4b5563;padding:8px 10px;background:#fff;border-radius:8px;border:1px solid #e5e7eb}
.feature .icon{font-size:14px}
.payment{display:flex;gap:10px;margin-top:6px;flex-wrap:wrap}
.payment span{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;color:#1a2a3e}
.validity{text-align:center;font-size:13px;color:#9ca3af;margin-top:12px;font-style:italic}
.footer{text-align:center;margin-top:14px;padding-top:10px;border-top:1px solid #e5e7eb}
.footer-logo{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px}
.footer-logo img{width:28px;height:28px;border-radius:6px;object-fit:cover}
.footer-logo span{font-weight:700;font-size:14px;color:#1a2a3e}
.footer p{font-size:11px;color:#9ca3af}
@media print{body{padding:12px 16px;font-size:11px}td{padding:6px 10px;font-size:11px}th{padding:6px 10px;font-size:9px}.header h1{font-size:20px}.totals-total{font-size:16px}.section{padding:10px 12px}.features{gap:4px}.feature{font-size:10px;padding:4px 8px}}
</style></head><body>

<div class="header">
  <img src="${LOGO_BASE64}" alt="Melhoraço" />
  <div class="header-text">
    <h1>MELHORAÇO</h1>
    <div class="subtitle">Valorizando sua fachada com acabamento premium em aço inox</div>
  </div>
</div>

<div class="section">
  <h3>👤 Cliente</h3>
  <div class="client-info">
    <div><strong>${quote.client.name}</strong></div>
     ${quote.client.phone ? `<div>📞 ${quote.client.phone}</div>` : ""}
     ${quote.delivery_address ? `<div>📍 ${quote.delivery_address}</div>` : ""}
  </div>
</div>

<div class="section">
  <h3>🧱 Itens do Orçamento</h3>
  <table>
    <thead><tr><th>Produto</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unitário</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
</div>

<div class="totals-section">
  <div class="totals-row"><span>Subtotal dos itens</span><span>${formatCurrency(subtotalItems)}</span></div>
  ${quote.delivery_fee > 0 ? `<div class="totals-row"><span>🚚 Entrega</span><span>${formatCurrency(quote.delivery_fee)}</span></div>` : ""}
  ${quote.installation_fee > 0 ? `<div class="totals-row"><span>🛠 Instalação</span><span>${formatCurrency(quote.installation_fee)}</span></div>` : ""}
  ${(quote as any).discount_amount > 0 ? `
    <div class="totals-row" style="color:#f87171">
      <span>📉 Desconto ${(quote as any).discount_type === 'percent' ? `(${(quote as any).discount_amount}%)` : ''}</span>
      <span>-${formatCurrency(
        totals.discountAmountCalculated
      )}</span>
    </div>
  ` : ""}
  <div class="totals-total"><span>TOTAL</span><span>${formatCurrency(total)}</span></div>
  ${pmInfo.base !== "boleto" && pmInfo.installments ? `
    <div class="totals-row" style="margin-top:6px;color:#fbbf24;font-weight:700">
      <span>💳 Cartão ${pmInfo.installments}x sem juros</span>
      <span>${pmInfo.installments}x de ${formatCurrency(total / pmInfo.installments)}</span>
    </div>
  ` : ""}
  ${pmInfo.base === "boleto" && pmInfo.dueDays ? `
    <div class="totals-row" style="margin-top:6px;color:#fbbf24;font-weight:700">
      <span>🧾 Boleto ${pmInfo.installments && pmInfo.installments > 1 ? `${pmInfo.installments}x faturado` : ''}</span>
      <span>${pmInfo.installments && pmInfo.installments > 1
        ? `${pmInfo.installments}x de ${formatCurrency(total / pmInfo.installments)} / ${pmInfo.dueDays} dias`
        : `Vencimento em ${pmInfo.dueDays} dias`}</span>
    </div>
  ` : ""}
</div>

${quote.deadline ? `<div class="section"><h3>⏱ Prazo de Entrega</h3><p style="font-size:14px;color:#4b5563">Até <strong>${quote.deadline}</strong></p></div>` : ""}

<div class="section">
  <h3>💎 Diferenciais Melhoraço</h3>
  <div class="features">
    <div class="feature"><span class="icon">🔩</span> Aço inox 304 (não enferruja)</div>
    <div class="feature"><span class="icon">🌊</span> Resistência à maresia</div>
    <div class="feature"><span class="icon">✨</span> Acabamento premium</div>
    <div class="feature"><span class="icon">📍</span> Produção em Fortaleza</div>
  </div>
</div>

<div class="section">
  <h3>💳 Formas de Pagamento</h3>
  <div class="payment">
    <span>Pix</span><span>Cartão</span><span>Dinheiro</span>
  </div>
</div>

<div class="validity">🔒 Orçamento válido por 3 dias</div>

<div class="footer">
  <div class="footer-logo">
    <img src="${LOGO_BASE64}" alt="Melhoraço" />
    <span>Melhoraço</span>
  </div>
  <p>Orçamento gerado em ${new Date(quote.updated_at).toLocaleDateString("pt-BR")}</p>
  <p style="margin-top:4px">📲 Qualquer dúvida, fico à disposição!</p>
</div>

<script>window.onload=()=>window.print()</script>
</body></html>`;
}

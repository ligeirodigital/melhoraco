import { discountPercent, itemCatalog, priceUnit, sizeLabel } from "@/lib/catalog";
import { Page, Text, View, Document, StyleSheet, Image, Link } from '@react-pdf/renderer';
import { FullQuote } from '../lib/cloudStore';
import { formatCurrency } from '../lib/formatQuote';
import { computeQuoteTotals, groupDocumentItems } from '../lib/quoteCalculations';
import { paymentMethodLabel, resolveDocumentSettings } from '../lib/documents';
import { DOC, doc, DocFooter, DocHeader } from './pdf/DocumentParts';

const s = StyleSheet.create({
  th: { flexDirection: 'row', backgroundColor: DOC.steel, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 6 },
  thText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase' },
  tr: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: DOC.line, alignItems: 'center' },
  cSize: { flex: 3 },
  cQty: { flex: 1.2, textAlign: 'center' },
  cPrice: { flex: 1.6, textAlign: 'right' },
  cTotal: { flex: 1.4, textAlign: 'right' },
  td: { fontSize: 11 },
  tdBold: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  small: { fontSize: 8, color: DOC.muted },
  term: { fontSize: 10, lineHeight: 1.5, marginBottom: 3 },
});

export const QuotePDF = ({
  quote, logoUrl, signatureUrl, documentSettings, paymentLink, portalUrl, pixQrBase64, pixKey,
}: {
  quote: FullQuote; logoUrl?: string; signatureUrl?: string; documentSettings?: unknown;
  paymentLink?: string | null; portalUrl?: string | null; pixQrBase64?: string | null; pixKey?: string | null;
}) => {
  const settings = resolveDocumentSettings(documentSettings);
  const { discountType, discountValue, discountAmountCalculated: globalDiscount, subtotal, total, downPayment, remainingBalance } = computeQuoteTotals(quote as any);
  const method = paymentMethodLabel(quote.payment_method_type);
  const created = new Date(quote.created_at);
  const validUntil = new Date(created.getTime() + settings.validity_days * 86400000);

  const groups = groupDocumentItems(quote.items as any).map(g => ({
    ...g,
    product: itemCatalog(quote.items[g.indices[0]] ?? {}),
  }));

  const qr = pixQrBase64 ? (pixQrBase64.startsWith('data:') ? pixQrBase64 : `data:image/png;base64,${pixQrBase64}`) : null;

  return (
    <Document title={`Orçamento #${quote.id.slice(0, 8).toUpperCase()}`}>
      <Page size="A4" style={doc.page}>
        <DocHeader settings={settings} logoUrl={logoUrl} title="Orçamento" number={`Nº #${quote.id.slice(0, 8).toUpperCase()} · Emitido em ${created.toLocaleDateString('pt-BR')} · Válido até ${validUntil.toLocaleDateString('pt-BR')}`} />

        <View style={doc.box}>
          <Text style={doc.sectionTitle}>Cliente</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold' }}>{quote.client?.name}</Text>
          {quote.client?.phone ? <Text style={s.small}>{quote.client.phone}</Text> : null}
          <Text style={[s.small, { marginTop: 4 }]}>
            {quote.delivery_type === 'retirada' ? `Retirada: ${settings.address}` : `Entrega: ${quote.delivery_address || 'endereço a combinar'}`}
          </Text>
        </View>

        <Text style={doc.sectionTitle}>Itens</Text>
        <View style={s.th}>
          <Text style={[s.thText, s.cSize]}>Tamanho</Text>
          <Text style={[s.thText, s.cQty]}>Dígitos</Text>
          <Text style={[s.thText, s.cPrice]}>Preço/dígito</Text>
          <Text style={[s.thText, s.cTotal]}>Subtotal</Text>
        </View>
        {groups.map((g, i) => {
          const off = discountPercent(g.unitPrice, g.product?.compare_at_price);
          const unit = priceUnit(g.mainName);
          return (
            <View key={i} style={s.tr} wrap={false}>
              <View style={[s.cSize, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                {g.product?.image_url ? <Image src={g.product.image_url} style={{ width: 28, height: 28, objectFit: 'contain' }} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={s.tdBold}>{sizeLabel(g.mainName) !== 'Inox' ? sizeLabel(g.mainName) : g.mainName}</Text>
                  <Text style={s.small}>{g.mainName}{g.details.length ? ` · ${g.details.join('')}` : ''}</Text>
                </View>
              </View>
              <Text style={[s.td, s.cQty]}>{g.quantity}</Text>
              <View style={s.cPrice}>
                {off !== null && <Text style={[s.small, { textDecoration: 'line-through', textAlign: 'right' }]}>de {formatCurrency(g.product?.compare_at_price ?? 0)}</Text>}
                <Text style={[s.td, { textAlign: 'right' }]}>{off !== null ? 'por ' : ''}{formatCurrency(g.unitPrice)}</Text>
                {off !== null && <Text style={[s.small, { color: DOC.accent, textAlign: 'right' }]}>{off}% OFF</Text>}
                {!unit && <Text style={[s.small, { textAlign: 'right' }]}>por unidade</Text>}
              </View>
              <Text style={[s.tdBold, s.cTotal]}>{formatCurrency(g.totalPrice)}</Text>
            </View>
          );
        })}

        <View style={{ marginTop: 10, marginBottom: 14 }}>
          <View style={doc.row}><Text style={doc.label}>Subtotal dos itens</Text><Text style={doc.value}>{formatCurrency(subtotal)}</Text></View>
          {quote.delivery_fee > 0 && <View style={doc.row}><Text style={doc.label}>Entrega</Text><Text style={doc.value}>{formatCurrency(quote.delivery_fee)}</Text></View>}
          {quote.installation_fee > 0 && <View style={doc.row}><Text style={doc.label}>Instalação</Text><Text style={doc.value}>{formatCurrency(quote.installation_fee)}</Text></View>}
          {globalDiscount > 0 && <View style={doc.row}><Text style={[doc.label, { color: '#dc2626' }]}>Desconto{discountType === 'percent' ? ` (${discountValue}%)` : ''}</Text><Text style={[doc.value, { color: '#dc2626' }]}>-{formatCurrency(globalDiscount)}</Text></View>}
        </View>

        <View wrap={false}>
          <Text style={doc.sectionTitle}>Pagamento</Text>
          <View style={doc.highlight}>
            <Text style={doc.highlightLabel}>Total</Text>
            <Text style={doc.highlightValue}>{formatCurrency(total)}</Text>
          </View>
          {downPayment > 0 && (
            <View style={{ marginBottom: 8 }}>
              <View style={doc.row}><Text style={doc.label}>Sinal</Text><Text style={doc.value}>{formatCurrency(downPayment)}</Text></View>
              <View style={doc.row}><Text style={doc.label}>Saldo na entrega</Text><Text style={doc.value}>{formatCurrency(remainingBalance)}</Text></View>
            </View>
          )}
          {method && <View style={doc.row}><Text style={doc.label}>Forma de pagamento</Text><Text style={doc.value}>{method}</Text></View>}
          {(paymentLink || portalUrl || qr || pixKey) && (
            <View style={[doc.box, { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 8 }]}>
              {qr && <Image src={qr} style={{ width: 90, height: 90 }} />}
              <View style={{ flex: 1 }}>
                {paymentLink && <Text style={s.term}>Pagar online: <Link src={paymentLink} style={{ color: DOC.steel }}>{paymentLink}</Link></Text>}
                {portalUrl && <Text style={s.term}>Acompanhar pedido: <Link src={portalUrl} style={{ color: DOC.steel }}>{portalUrl}</Link></Text>}
                {pixKey && <Text style={s.term}>Chave Pix: {pixKey}</Text>}
              </View>
            </View>
          )}
        </View>

        <View wrap={false} style={{ marginTop: 6 }}>
          <Text style={doc.sectionTitle}>Condições comerciais</Text>
          <Text style={s.term}>• Validade: {settings.validity_days} dias (até {validUntil.toLocaleDateString('pt-BR')}).</Text>
          <Text style={s.term}>• Prazo: {quote.deadline ? `${quote.deadline}. ` : ''}{settings.lead_time}</Text>
          <Text style={s.term}>• {settings.delivery}</Text>
          <Text style={s.term}>• {settings.installation}</Text>
          <Text style={s.term}>• {settings.installments}</Text>
        </View>

        <View style={{ marginTop: 24, flexDirection: 'row', gap: 30 }} wrap={false}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            {signatureUrl ? <Image src={signatureUrl} style={{ height: 46, objectFit: 'contain' }} /> : <View style={{ height: 46 }} />}
            <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: DOC.line, paddingTop: 4, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{settings.company_name.toUpperCase()}</Text>
            </View>
          </View>
          {(quote as any).customer_signature_url && (
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Image src={(quote as any).customer_signature_url} style={{ height: 46, objectFit: 'contain' }} />
              <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: DOC.line, paddingTop: 4, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{quote.client?.name?.toUpperCase()}</Text>
                <Text style={s.small}>Assinado em {new Date((quote as any).signed_at).toLocaleDateString('pt-BR')}</Text>
              </View>
            </View>
          )}
        </View>

        <DocFooter settings={settings} note="Obrigado pela preferência!" />
      </Page>
    </Document>
  );
};

import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { FullQuote } from '../lib/cloudStore';
import { formatCurrency } from '../lib/formatQuote';
import { computeQuoteTotals, groupDocumentItems } from '../lib/quoteCalculations';

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
  header: { borderBottomWidth: 2, borderBottomColor: '#f97316', paddingBottom: 15, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  meta: { fontSize: 10, color: '#64748b', marginTop: 5 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 5, marginBottom: 10 },
  itemRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemDesc: { flex: 3, fontSize: 10 },
  itemQty: { flex: 1, fontSize: 10, textAlign: 'center' },
  itemTotal: { flex: 1, fontSize: 10, textAlign: 'right', fontWeight: 'bold' },
  signatureSection: { marginTop: 40, flexDirection: 'row', justifyContent: 'space-between' },
  signatureBox: { width: '45%', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, textAlign: 'center', alignItems: 'center' },
  signatureImage: { height: 40, objectFit: 'contain', marginBottom: 5 },
  signatureText: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  signatureName: { fontSize: 10, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  totalBox: { marginTop: 20, padding: 15, backgroundColor: '#f8fafc', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between' }
});

export const ServiceOrderPDF = ({ quote, logoUrl, signatureUrl }: { quote: FullQuote, logoUrl?: string, signatureUrl?: string }) => {
  const totals = computeQuoteTotals(quote as any);
  const { discountType, discountValue: discountAmount, discountAmountCalculated: globalDiscount, total } = totals;

  const groupedItems = groupDocumentItems(quote.items as any).map(g => ({
    mainName: g.mainName,
    variants: g.details,
    totalQuantity: g.quantity,
    unitPrice: g.unitPrice,
    totalPrice: g.totalPrice,
  }));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ORDEM DE SERVIÇO</Text>
            <Text style={styles.meta}>OS Nº #{quote.id.slice(0, 8)} | Data: {new Date().toLocaleDateString('pt-BR')}</Text>
          </View>
          {logoUrl && <Image src={logoUrl} style={{ width: 50, height: 50, borderRadius: 10 }} />}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Cliente</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{quote.client?.name}</Text>
          <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{quote.client?.phone || 'Telefone não informado'}</Text>
          <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Endereço: {quote.delivery_address || 'Não informado'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição dos Serviços/Produtos</Text>
          <View style={{ backgroundColor: '#f8fafc', padding: 8, borderRadius: 5, flexDirection: 'row' }}>
            <Text style={[styles.itemDesc, { fontWeight: 'bold' }]}>Item</Text>
            <Text style={[styles.itemQty, { fontWeight: 'bold' }]}>Qtd</Text>
            <Text style={[styles.itemTotal, { fontWeight: 'bold' }]}>Total</Text>
          </View>
          {groupedItems.map((group, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={styles.itemDesc}>
                <Text style={{ fontWeight: 'bold' }}>{group.mainName}</Text>
                {group.variants.length > 0 && (
                  <Text style={{ color: '#f97316', marginTop: 2, fontSize: 11, fontWeight: 'bold' }}>
                    ({group.variants.join('')})
                  </Text>
                )}
              </View>
              <Text style={styles.itemQty}>{group.totalQuantity}</Text>
              <Text style={styles.itemTotal}>{formatCurrency(group.totalPrice)}</Text>
            </View>
          ))}
          {quote.delivery_fee > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.itemDesc}>Taxa de Entrega ({quote.delivery_type || 'entrega'})</Text>
              <Text style={styles.itemQty}>1</Text>
              <Text style={styles.itemTotal}>{formatCurrency(quote.delivery_fee)}</Text>
            </View>
          )}
          {quote.installation_fee > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.itemDesc}>Serviço de Instalação</Text>
              <Text style={styles.itemQty}>1</Text>
              <Text style={styles.itemTotal}>{formatCurrency(quote.installation_fee)}</Text>
            </View>
          )}
          {globalDiscount > 0 && (
            <View style={styles.itemRow}>
              <Text style={[styles.itemDesc, { color: '#dc2626' }]}>Desconto {discountType === 'percent' ? `(${discountAmount}%)` : ''}</Text>
              <Text style={styles.itemQty}>1</Text>
              <Text style={[styles.itemTotal, { color: '#dc2626' }]}>-{formatCurrency(globalDiscount)}</Text>
            </View>
          )}
        </View>

        <View style={styles.totalBox}>
          <Text style={{ fontSize: 12, fontWeight: 'bold' }}>VALOR TOTAL</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#f97316' }}>{formatCurrency(total)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <Text style={{ fontSize: 10, color: '#64748b' }}>Prazo de entrega: {quote.deadline || 'A combinar'}</Text>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            {signatureUrl ? (
              <Image src={signatureUrl} style={styles.signatureImage} />
            ) : (
              <View style={{ height: 40 }} />
            )}
            <Text style={styles.signatureName}>{quote.employee_name || 'MELHORAÇO INOX'}</Text>
            <Text style={styles.signatureText}>Responsável pela Emissão</Text>
          </View>

          <View style={styles.signatureBox}>
            {quote.signature_data ? (
              <View style={{ height: 40, justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, color: '#1e293b' }}>
                  {quote.signature_data}
                </Text>
              </View>
            ) : (
              <View style={{ height: 40 }} />
            )}
            <Text style={styles.signatureName}>{quote.client?.name}</Text>
            <Text style={styles.signatureText}>Assinatura do Cliente</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

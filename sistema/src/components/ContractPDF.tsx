// Contrato + Ordem de Serviço unificados num único PDF (2 páginas).
// Página 1: contrato com termos + assinatura. Página 2: Ordem de Serviço destacável.
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { FullQuote } from '../lib/cloudStore';
import { formatCurrency } from '../lib/formatQuote';
import { computeQuoteTotals, resolveItemName } from '../lib/quoteCalculations';

export interface ServiceOrderData {
  scheduled_date?: string;
  scheduled_time?: string;
  installer_name?: string;
  address?: string;
  technical_notes?: string;
}

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica', fontSize: 10, color: '#0f172a' },
  header: { borderBottomWidth: 2, borderBottomColor: '#f97316', paddingBottom: 12, marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 9, color: '#64748b', marginTop: 3 },
  contractNumber: { fontSize: 9, color: '#64748b', textAlign: 'right' },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  paragraph: { fontSize: 9.5, lineHeight: 1.55, marginBottom: 8, textAlign: 'justify' },
  partyBox: { padding: 10, backgroundColor: '#f8fafc', borderRadius: 6, marginBottom: 6 },
  partyLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  partyName: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  partyMeta: { fontSize: 9, color: '#475569', marginTop: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: '#0f172a', borderRadius: 6, marginTop: 8 },
  totalLabel: { color: '#ffffff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  totalValue: { color: '#f97316', fontSize: 13, fontWeight: 'bold' },
  signatureSection: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' },
  signatureBox: { width: '45%', borderTopWidth: 1, borderTopColor: '#94a3b8', paddingTop: 8, alignItems: 'center' },
  signatureImage: { height: 36, objectFit: 'contain', marginBottom: 4 },
  signatureLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase' },
  signatureName: { fontSize: 9.5, fontWeight: 'bold', marginBottom: 2 },
  // OS
  osHeader: { backgroundColor: '#f97316', padding: 14, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  osTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  osMeta: { color: '#fff7ed', fontSize: 9 },
  osGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  osField: { width: '48%', padding: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6 },
  osFieldLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  osFieldValue: { fontSize: 10, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemDesc: { flex: 3, fontSize: 9 },
  itemQty: { flex: 1, fontSize: 9, textAlign: 'center' },
  checkbox: { width: 10, height: 10, borderWidth: 1, borderColor: '#94a3b8', marginRight: 6 },
  cutLine: { borderTopWidth: 1, borderTopColor: '#cbd5e1', borderStyle: 'dashed', marginVertical: 18 },
});

const DEFAULT_TERMS = [
  'O presente contrato tem por objeto a execução dos serviços e/ou fornecimento dos produtos discriminados na Ordem de Serviço em anexo, conforme especificações técnicas acordadas entre as partes.',
  'O valor total é devido conforme condições de pagamento pactuadas. Atrasos superiores a 5 dias sujeitam o CONTRATANTE a multa de 2% mais juros de 1% ao mês.',
  'A garantia dos produtos e serviços é de 12 (doze) meses contra defeitos de fabricação ou execução, contados da entrega/instalação, salvo indicação diversa no orçamento.',
  'A CONTRATADA compromete-se a cumprir os prazos acordados. Alterações de escopo devem ser formalizadas por escrito e podem gerar ajuste de valor e prazo.',
  'A rescisão antecipada pelo CONTRATANTE implica pagamento dos serviços já executados e materiais já adquiridos.',
  'Fica eleito o foro da comarca de execução dos serviços para dirimir eventuais controvérsias oriundas deste contrato.',
];

export const ContractPDF = ({
  quote,
  logoUrl,
  signatureUrl,
  contractNumber,
  serviceOrder,
  companyName = 'Melhoraço Inox',
}: {
  quote: FullQuote;
  logoUrl?: string;
  signatureUrl?: string;
  contractNumber: string;
  serviceOrder?: ServiceOrderData;
  companyName?: string;
}) => {
  const { total } = computeQuoteTotals(quote as any);

  const clientName = (quote as any).clients?.name || 'Cliente';
  const clientDoc = (quote as any).clients?.cnpj_cpf || '';
  const clientAddr = [
    (quote as any).clients?.address,
    (quote as any).clients?.address_number,
    (quote as any).clients?.address_complement,
  ].filter(Boolean).join(', ');

  return (
    <Document>
      {/* ============ PÁGINA 1 — CONTRATO ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
            <Text style={styles.title}>Contrato de Prestação</Text>
            <Text style={styles.subtitle}>{companyName}</Text>
          </View>
          <View>
            <Text style={styles.contractNumber}>Nº {contractNumber}</Text>
            <Text style={styles.contractNumber}>
              {new Date().toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Partes</Text>
        <View style={styles.partyBox}>
          <Text style={styles.partyLabel}>Contratada</Text>
          <Text style={styles.partyName}>{companyName}</Text>
        </View>
        <View style={styles.partyBox}>
          <Text style={styles.partyLabel}>Contratante</Text>
          <Text style={styles.partyName}>{clientName}</Text>
          {clientDoc ? <Text style={styles.partyMeta}>Doc: {clientDoc}</Text> : null}
          {clientAddr ? <Text style={styles.partyMeta}>{clientAddr}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Cláusulas</Text>
        {DEFAULT_TERMS.map((t, i) => (
          <Text key={i} style={styles.paragraph}>
            {i + 1}. {t}
          </Text>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Valor Total do Contrato</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            {signatureUrl && <Image src={signatureUrl} style={styles.signatureImage} />}
            <Text style={styles.signatureName}>{companyName}</Text>
            <Text style={styles.signatureLabel}>Contratada</Text>
          </View>
          <View style={styles.signatureBox}>
            {(quote as any).customer_signature_url && (
              <Image src={(quote as any).customer_signature_url} style={styles.signatureImage} />
            )}
            <Text style={styles.signatureName}>{clientName}</Text>
            <Text style={styles.signatureLabel}>Contratante</Text>
          </View>
        </View>
      </Page>

      {/* ============ PÁGINA 2 — ORDEM DE SERVIÇO ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.osHeader}>
          <View>
            <Text style={styles.osTitle}>Ordem de Serviço</Text>
            <Text style={styles.osMeta}>Ref. Contrato {contractNumber}</Text>
          </View>
          <Text style={styles.osMeta}>{new Date().toLocaleDateString('pt-BR')}</Text>
        </View>

        <View style={styles.osGrid}>
          <View style={styles.osField}>
            <Text style={styles.osFieldLabel}>Cliente</Text>
            <Text style={styles.osFieldValue}>{clientName}</Text>
          </View>
          <View style={styles.osField}>
            <Text style={styles.osFieldLabel}>Data prevista</Text>
            <Text style={styles.osFieldValue}>
              {serviceOrder?.scheduled_date
                ? new Date(serviceOrder.scheduled_date).toLocaleDateString('pt-BR')
                : 'A combinar'}
              {serviceOrder?.scheduled_time ? ` · ${serviceOrder.scheduled_time}` : ''}
            </Text>
          </View>
          <View style={styles.osField}>
            <Text style={styles.osFieldLabel}>Instalador responsável</Text>
            <Text style={styles.osFieldValue}>{serviceOrder?.installer_name || 'A definir'}</Text>
          </View>
          <View style={styles.osField}>
            <Text style={styles.osFieldLabel}>Endereço de execução</Text>
            <Text style={styles.osFieldValue}>{serviceOrder?.address || clientAddr || '—'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Itens a executar</Text>
        <View style={{ borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
          {quote.items.map((i, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.checkbox} />
              <Text style={styles.itemDesc}>{resolveItemName(i as any)}</Text>
              <Text style={styles.itemQty}>{i.quantity}x</Text>
            </View>
          ))}
        </View>

        {serviceOrder?.technical_notes && (
          <>
            <Text style={styles.sectionTitle}>Observações técnicas</Text>
            <Text style={styles.paragraph}>{serviceOrder.technical_notes}</Text>
          </>
        )}

        <View style={styles.cutLine} />

        <Text style={styles.sectionTitle}>Confirmação de entrega</Text>
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={{ height: 36 }}> </Text>
            <Text style={styles.signatureName}>Instalador</Text>
            <Text style={styles.signatureLabel}>Assinatura</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={{ height: 36 }}> </Text>
            <Text style={styles.signatureName}>{clientName}</Text>
            <Text style={styles.signatureLabel}>Recebido em ___/___/______</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

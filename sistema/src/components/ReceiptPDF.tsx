import { Page, Text, View, Document, Image } from '@react-pdf/renderer';
import { FullQuote } from '../lib/cloudStore';
import { formatCurrency } from '../lib/formatQuote';
import { computeQuoteTotals } from '../lib/quoteCalculations';
import {
  RECEIPT_META, amountInWords, paymentMethodLabel, receiptAmount, receiptNumber,
  resolveDocumentSettings, type ReceiptType,
} from '../lib/documents';
import { DOC, doc, DocFooter, DocHeader } from './pdf/DocumentParts';

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : null);

export const ReceiptPDF = ({
  quote,
  logoUrl,
  signatureUrl,
  type = 'full',
  documentSettings,
}: {
  quote: FullQuote,
  logoUrl?: string,
  signatureUrl?: string,
  type?: ReceiptType,
  documentSettings?: unknown,
}) => {
  const settings = resolveDocumentSettings(documentSettings);
  const totals = computeQuoteTotals(quote as any);
  const amount = receiptAmount(quote as any, type);
  const method = paymentMethodLabel(quote.payment_method_type);
  const meta = RECEIPT_META[type];
  const reference =
    type === 'down_payment' ? 'ao sinal (pagamento parcial)' :
    type === 'remaining_balance' ? 'ao saldo restante' : 'à quitação total';
  const paidAt =
    type === 'down_payment' ? quote.down_payment_paid_at :
    type === 'remaining_balance' ? quote.final_payment_paid_at :
    quote.final_payment_paid_at || quote.payment_date;
  const issued = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document title={`${meta.title} ${receiptNumber(quote.id, type)}`}>
      <Page size="A4" style={doc.page}>
        <DocHeader settings={settings} logoUrl={logoUrl} title={meta.title} number={`Nº ${receiptNumber(quote.id, type)} · Pedido #${quote.id.slice(0, 8).toUpperCase()}`} />

        <View style={doc.box}>
          <Text style={{ fontSize: 12, lineHeight: 1.6 }}>
            Recebemos de <Text style={{ fontFamily: 'Helvetica-Bold' }}>{quote.client?.name || 'Cliente'}</Text> a importância de{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatCurrency(amount)}</Text> ({amountInWords(amount)}), referente {reference} do pedido #{quote.id.slice(0, 8).toUpperCase()}, pelo fornecimento de produtos e serviços.
          </Text>
        </View>

        <View style={doc.highlight}>
          <Text style={doc.highlightLabel}>{type === 'full' ? 'Total quitado' : 'Valor deste recibo'}</Text>
          <Text style={doc.highlightValue}>{formatCurrency(amount)}</Text>
        </View>

        {type !== 'full' && (
          <View style={{ marginBottom: 14 }}>
            <Text style={doc.sectionTitle}>Resumo do pedido</Text>
            <View style={doc.row}><Text style={doc.label}>Total do pedido</Text><Text style={doc.value}>{formatCurrency(totals.total)}</Text></View>
            <View style={doc.row}>
              <Text style={[doc.label, type === 'down_payment' ? { color: DOC.accent, fontFamily: 'Helvetica-Bold' } : {}]}>
                Sinal pago{fmtDate(quote.down_payment_paid_at) ? ` em ${fmtDate(quote.down_payment_paid_at)}` : ' (não registrado)'}
              </Text>
              <Text style={doc.value}>{formatCurrency(totals.downPayment)}</Text>
            </View>
            <View style={doc.row}>
              <Text style={[doc.label, type === 'remaining_balance' ? { color: DOC.accent, fontFamily: 'Helvetica-Bold' } : {}]}>
                Saldo restante{fmtDate(quote.final_payment_paid_at) ? ` (pago em ${fmtDate(quote.final_payment_paid_at)})` : ''}
              </Text>
              <Text style={doc.value}>{formatCurrency(totals.remainingBalance)}</Text>
            </View>
          </View>
        )}

        <View style={{ marginBottom: 14 }}>
          <Text style={doc.sectionTitle}>Pagamento</Text>
          {method && <View style={doc.row}><Text style={doc.label}>Forma de pagamento</Text><Text style={doc.value}>{method}</Text></View>}
          <View style={doc.row}><Text style={doc.label}>Data do pagamento</Text><Text style={doc.value}>{fmtDate(paidAt) || 'Não registrada'}</Text></View>
          <View style={doc.row}><Text style={doc.label}>Emitido em</Text><Text style={doc.value}>{issued}</Text></View>
        </View>

        <View style={{ marginTop: 30, alignItems: 'center' }}>
          {signatureUrl ? <Image src={signatureUrl} style={{ height: 56, objectFit: 'contain', marginBottom: 6 }} /> : <View style={{ height: 56 }} />}
          <View style={{ width: 220, borderTopWidth: 1, borderTopColor: DOC.line, paddingTop: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{settings.company_name.toUpperCase()}</Text>
            <Text style={{ fontSize: 8, color: DOC.muted, marginTop: 2 }}>Responsável financeiro</Text>
          </View>
        </View>

        <DocFooter
          settings={settings}
          note={type === 'full'
            ? 'Este recibo serve como comprovante de quitação do pedido.'
            : 'Este recibo serve como comprovante de pagamento parcial do pedido.'}
        />
      </Page>
    </Document>
  );
};

import { Page, Text, View, Document, Image } from '@react-pdf/renderer';
import { FullQuote } from '../lib/cloudStore';
import { formatCurrency } from '../lib/formatQuote';
import { calcSubtotal, computeQuoteTotals, resolveItemName, roundMoney } from '../lib/quoteCalculations';
import {
  RECEIPT_META, amountInWords, paymentMethodLabel, receiptAmount, receiptNumber,
  resolveDocumentSettings, type ReceiptType,
} from '../lib/documents';
import { DOC, doc, DocFooter } from './pdf/DocumentParts';

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : null);
const BAND = '#2b2f3a';
const RULE = '#d9d4c7';
const PAPER_TINT = '#f6f1e4';
const label = { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DOC.muted, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 2 };

/** Recibo: layout do Modelo A (faixa escura, dados, itens, totais, quitação e assinatura). */
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
  const number = receiptNumber(quote.id, type);
  const orderId = quote.id.slice(0, 8).toUpperCase();
  const reference =
    type === 'down_payment' ? 'ao sinal (pagamento parcial)' :
    type === 'remaining_balance' ? 'ao saldo restante' : 'à quitação total';
  const paidAt =
    type === 'down_payment' ? quote.down_payment_paid_at :
    type === 'remaining_balance' ? quote.final_payment_paid_at :
    quote.final_payment_paid_at || quote.payment_date;
  const issued = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const delivery = quote.delivery_type === 'retirada' ? 'Retirada na fábrica' : quote.delivery_type === 'correios' ? 'Correios' : 'Entrega';
  const items = (quote.items || []).map((i: any) => {
    const qty = Number(i.quantity) || 0;
    return { name: resolveItemName(i), qty, total: roundMoney((Number(i.unit_price) || 0) * qty) };
  });
  const subtotal = calcSubtotal(quote.items as any);

  return (
    <Document title={`${meta.title} ${number}`}>
      <Page size="A4" style={{ ...doc.page, paddingTop: 0, paddingHorizontal: 0, paddingBottom: 64 }}>
        <View style={{ backgroundColor: BAND, color: '#f5f1e6', paddingVertical: 20, paddingHorizontal: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {logoUrl ? <Image src={logoUrl} style={{ width: 40, height: 40, objectFit: 'contain' }} /> : null}
            <View>
              <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold' }}>{settings.company_name}</Text>
              <Text style={{ fontSize: 7.5, color: '#c7cbd4', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Móveis sob medida</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.8 }}>{meta.title}</Text>
            <Text style={{ fontSize: 8, color: '#c7cbd4', marginTop: 2 }}>Nº {number} · Pedido #{orderId}</Text>
          </View>
        </View>

        <View style={{ paddingVertical: 22, paddingHorizontal: 32, borderWidth: 1, borderColor: RULE, borderTopWidth: 0, flexGrow: 1 }}>
          <Text style={{ fontSize: 11, lineHeight: 1.55, marginBottom: 14 }}>
            Recebemos de <Text style={{ fontFamily: 'Helvetica-Bold' }}>{quote.client?.name || 'Cliente'}</Text> a importância de{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatCurrency(amount)}</Text> ({amountInWords(amount)}), referente {reference} do pedido #{orderId}.
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            <View style={{ width: '50%', paddingRight: 10, marginBottom: 10 }}><Text style={label}>Cliente</Text><Text style={{ fontSize: 10 }}>{quote.client?.name || 'Cliente'}</Text></View>
            <View style={{ width: '50%', paddingLeft: 10, marginBottom: 10 }}><Text style={label}>Documento</Text><Text style={{ fontSize: 10 }}>{(quote.client as any)?.document || 'Não informado'}</Text></View>
            <View style={{ width: '50%', paddingRight: 10, marginBottom: 10 }}><Text style={label}>Entrega</Text><Text style={{ fontSize: 10 }}>{delivery}</Text></View>
            <View style={{ width: '50%', paddingLeft: 10, marginBottom: 10 }}><Text style={label}>Forma de pagamento</Text><Text style={{ fontSize: 10 }}>{method || 'Não informada'}</Text></View>
          </View>

          {type === 'full' && items.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: RULE, paddingBottom: 4 }}>
                <Text style={[label, { flex: 1, marginBottom: 0 }]}>Item</Text>
                <Text style={[label, { width: 40, textAlign: 'right', marginBottom: 0 }]}>Qtd</Text>
                <Text style={[label, { width: 90, textAlign: 'right', marginBottom: 0 }]}>Valor</Text>
              </View>
              {items.map((it, idx) => (
                <View key={idx} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: RULE, paddingVertical: 5 }}>
                  <Text style={{ flex: 1, fontSize: 9.5 }}>{it.name}</Text>
                  <Text style={{ width: 40, textAlign: 'right', fontSize: 9.5 }}>{it.qty}</Text>
                  <Text style={{ width: 90, textAlign: 'right', fontSize: 9.5 }}>{formatCurrency(it.total)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ alignSelf: 'flex-end', width: 240, marginBottom: 16 }}>
            <View style={doc.row}><Text style={doc.label}>Total do pedido</Text><Text style={doc.value}>{formatCurrency(totals.total || subtotal)}</Text></View>
            <View style={doc.row}><Text style={doc.label}>Sinal pago{fmtDate(quote.down_payment_paid_at) ? ` em ${fmtDate(quote.down_payment_paid_at)}` : ''}</Text><Text style={doc.value}>{formatCurrency(totals.downPayment)}</Text></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: DOC.ink, marginTop: 4, paddingTop: 6 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{type === 'full' ? 'Saldo recebido' : 'Valor deste recibo'}</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{formatCurrency(amount)}</Text>
            </View>
            {type !== 'full' && (
              <View style={[doc.row, { marginTop: 4 }]}><Text style={doc.label}>Saldo restante{fmtDate(quote.final_payment_paid_at) ? ` (pago em ${fmtDate(quote.final_payment_paid_at)})` : ''}</Text><Text style={doc.value}>{formatCurrency(totals.remainingBalance)}</Text></View>
            )}
          </View>

          <View style={{ backgroundColor: PAPER_TINT, borderLeftWidth: 3, borderLeftColor: '#7a4a1e', paddingVertical: 10, paddingHorizontal: 12, marginBottom: 22 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Oblique', lineHeight: 1.5 }}>
              {type === 'full'
                ? 'Declaramos que o pedido acima está quitado e nada mais é devido por esta compra.'
                : 'Este recibo comprova um pagamento parcial do pedido. O saldo restante continua em aberto até a quitação.'}
            </Text>
          </View>

          <View style={{ marginTop: 10, alignItems: 'flex-start' }}>
            {signatureUrl ? <Image src={signatureUrl} style={{ height: 50, objectFit: 'contain', marginBottom: 4 }} /> : <View style={{ height: 50 }} />}
            <View style={{ width: 260, borderTopWidth: 1, borderTopColor: DOC.ink, paddingTop: 4 }}>
              <Text style={{ fontSize: 8, color: DOC.muted }}>{settings.company_name} · assinatura do responsável</Text>
            </View>
          </View>

          <Text style={{ fontSize: 8, color: DOC.muted, marginTop: 14 }}>Data do pagamento: {fmtDate(paidAt) || 'não registrada'} · Emitido em {issued}</Text>
        </View>

        <DocFooter
          settings={settings}
          note={type === 'full'
            ? 'Este recibo comprova o pagamento integral do pedido. Guarde-o.'
            : 'Este recibo comprova o pagamento parcial do pedido.'}
        />
      </Page>
    </Document>
  );
};

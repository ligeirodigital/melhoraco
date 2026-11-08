import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { FullQuote } from '../lib/cloudStore';

const styles = StyleSheet.create({
  page: { padding: 20, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
  container: { borderWidth: 2, borderColor: '#000', padding: 15, borderRadius: 10 },
  header: { borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 10, marginBottom: 15, alignItems: 'center' },
  company: { fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  info: { fontSize: 10, marginBottom: 5 },
  address: { fontSize: 12, fontWeight: 'bold', marginTop: 10, borderTopWidth: 1, paddingTop: 10 },
  robust: { fontSize: 8, color: '#666', marginTop: 15, textAlign: 'center' },
  token: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginTop: 10, letterSpacing: 2 }
});

export const ShippingLabelPDF = ({ quote }: { quote: FullQuote }) => {
  const isCorreios = quote.delivery_type === 'correios';

  return (
    <Document>
      <Page size={[283, 425]} style={styles.page}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.company}>MELHORAÇO INOX</Text>
            {isCorreios && <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: 5 }}>VIA CORREIOS</Text>}
          </View>
          
          <Text style={styles.info}>DESTINATÁRIO:</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>{quote.client?.name}</Text>
          
          <View style={styles.address}>
            <Text style={styles.info}>ENDEREÇO DE ENTREGA:</Text>
            <Text style={{ fontSize: 12, lineHeight: 1.2 }}>{quote.delivery_address || 'Não informado'}</Text>
          </View>

          <View style={{ marginTop: 10, borderTopWidth: 1, paddingTop: 10, alignItems: 'center' }}>
            <Text style={styles.info}>TOKEN DO PEDIDO (ETIQUETA)</Text>
            <Text style={styles.token}>{quote.order_token || quote.id.slice(0, 6).toUpperCase()}</Text>
          </View>

          <View style={{ marginTop: 10, borderTopWidth: 1, paddingTop: 10 }}>
            <Text style={styles.info}>PEDIDO ID: #{quote.id.slice(0, 8)}</Text>
            <Text style={styles.info}>PRODUTOS: {quote.items.length} Itens</Text>
          </View>

          {isCorreios && (
            <View style={styles.robust}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>PROTOCOLO DE POSTAGEM</Text>
              <Text style={{ marginTop: 5 }}>DECLARAÇÃO DE CONTEÚDO ANEXA</Text>
              <Text>PESO ESTIMADO: _____ KG | DIMENSÕES: ____x____x____ cm</Text>
              <Text style={{ marginTop: 10, fontSize: 6 }}>CUIDADO: MATERIAL EM AÇO INOXIDÁVEL - NÃO DOBRAR</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155',
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 5,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  colDate: { flex: 0.8 },
  colDesc: { flex: 2 },
  colCat: { flex: 1.2 },
  colType: { flex: 0.6 },
  colValue: { flex: 1, textAlign: 'right' },
  colStatus: { flex: 0.7, textAlign: 'center' },
  income: { color: '#059669' },
  expense: { color: '#dc2626' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
});

interface CashFlowReportProps {
  transactions: any[];
  periodLabel: string;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

export const CashFlowReport: React.FC<CashFlowReportProps> = ({ transactions, periodLabel }) => {
  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += (t.amount || 0);
    else acc.expense += (t.amount || 0);
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Relatório de Fluxo de Caixa</Text>
          <Text style={styles.subtitle}>Período: {periodLabel}</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total de Entradas</Text>
            <Text style={[styles.summaryValue, styles.income]}>{formatCurrency(totals.income)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total de Saídas</Text>
            <Text style={[styles.summaryValue, styles.expense]}>{formatCurrency(totals.expense)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Saldo do Período</Text>
            <Text style={styles.summaryValue}>{formatCurrency(balance)}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDate}>Data</Text>
          <Text style={styles.colDesc}>Descrição</Text>
          <Text style={styles.colCat}>Categoria</Text>
          <Text style={styles.colType}>Tipo</Text>
          <Text style={styles.colValue}>Valor</Text>
          <Text style={styles.colStatus}>Status</Text>
        </View>

        {transactions.map((t, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDate}>{format(new Date(t.transaction_date), 'dd/MM/yyyy')}</Text>
            <Text style={styles.colDesc}>{t.description}</Text>
            <Text style={styles.colCat}>{t.category}</Text>
            <Text style={[styles.colType, t.type === 'income' ? styles.income : styles.expense]}>
              {t.type === 'income' ? 'Entrada' : 'Saída'}
            </Text>
            <Text style={[styles.colValue, t.type === 'income' ? styles.income : styles.expense]}>
              {formatCurrency(t.amount)}
            </Text>
            <Text style={styles.colStatus}>{t.status}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} | Melhor Aço - Gestão Industrial
        </Text>
      </Page>
    </Document>
  );
};

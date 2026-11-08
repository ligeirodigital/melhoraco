import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts if needed, otherwise use defaults
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
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
  section: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    padding: 5,
    borderRadius: 3,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 6,
    alignItems: 'center',
  },
  label: {
    flex: 2,
  },
  value: {
    flex: 1,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  comparisonValue: {
    flex: 1,
    textAlign: 'right',
    color: '#64748b',
  },
  delta: {
    flex: 0.8,
    textAlign: 'right',
    fontSize: 9,
  },
  positive: {
    color: '#059669',
  },
  negative: {
    color: '#dc2626',
  },
  highlightedRow: {
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
    borderBottomColor: '#cbd5e1',
  },
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  }
});

interface DREData {
  quoteRevenue: number;
  taxes: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  totalFixedExpenses: number;
  marketingExpenses: number;
  logisticsExpenses: number;
  cardFeesExpenses: number;
  otherOperatingExpenses: number;
  netProfit: number;
  reserveFund?: number;
  investorDistributions: Record<string, number>;
  totalDistribution?: number;
  finalNetProfit?: number;
  margin: number;
}

interface Investor {
  id: string;
  name: string;
  share_percentage: number;
}

interface DREReportProps {
  data: DREData;
  prevData: DREData | null;
  periodLabel: string;
  investors?: Investor[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(val || 0));

const calculateDelta = (current: number, prev: number) => {
  if (!prev) return 0;
  return ((current - prev) / prev) * 100;
};

const DeltaText = ({ current, prev }: { current: number; prev: number }) => {
  const delta = calculateDelta(current, prev);
  if (!prev) return <Text style={styles.delta}>-</Text>;
  const isPositive = delta >= 0;
  return (
    <Text style={[styles.delta, isPositive ? styles.positive : styles.negative]}>
      {isPositive ? '+' : ''}{delta.toFixed(1)}%
    </Text>
  );
};

export const DREReport: React.FC<DREReportProps> = ({ data, prevData, periodLabel, investors = [] }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Relatório DRE Industrial</Text>
          <Text style={styles.subtitle}>Período: {periodLabel} | Comparativo com Mês Anterior</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Receita Bruta</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.quoteRevenue)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Resultado Líquido</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.netProfit)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Margem de Lucro</Text>
            <Text style={styles.summaryValue}>{data.margin.toFixed(1)}%</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.row, { backgroundColor: '#f1f5f9', borderBottomColor: '#cbd5e1' }]}>
            <Text style={[styles.label, { fontWeight: 'bold' }]}>Descrição</Text>
            <Text style={[styles.value, { textAlign: 'right' }]}>Atual</Text>
            <Text style={[styles.comparisonValue, { textAlign: 'right' }]}>Anterior</Text>
            <Text style={[styles.delta, { textAlign: 'right' }]}>Δ %</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>(+) Receita Bruta de Vendas</Text>
            <Text style={styles.value}>{formatCurrency(Math.abs(data.quoteRevenue))}</Text>
            <Text style={styles.comparisonValue}>{prevData ? formatCurrency(Math.abs(prevData.quoteRevenue)) : '-'}</Text>
            <DeltaText current={data.quoteRevenue} prev={prevData?.quoteRevenue || 0} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Deduções e Impostos</Text>
            <Text style={styles.value}>- {formatCurrency(Math.abs(data.taxes))}</Text>
            <Text style={styles.comparisonValue}>{prevData ? `- ${formatCurrency(Math.abs(prevData.taxes))}` : '-'}</Text>
            <DeltaText current={data.taxes} prev={prevData?.taxes || 0} />
          </View>

          <View style={[styles.row, styles.highlightedRow]}>
            <Text style={styles.label}>(=) Receita Líquida</Text>
            <Text style={styles.value}>{formatCurrency(data.netRevenue)}</Text>
            <Text style={styles.comparisonValue}>{prevData ? formatCurrency(prevData.netRevenue) : '-'}</Text>
            <DeltaText current={data.netRevenue} prev={prevData?.netRevenue || 0} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Custos (CMV/CPV)</Text>
            <Text style={styles.value}>- {formatCurrency(Math.abs(data.cogs))}</Text>
            <Text style={styles.comparisonValue}>{prevData ? `- ${formatCurrency(Math.abs(prevData.cogs))}` : '-'}</Text>
            <DeltaText current={data.cogs} prev={prevData?.cogs || 0} />
          </View>

          <View style={[styles.row, styles.highlightedRow]}>
            <Text style={styles.label}>(=) Lucro Bruto</Text>
            <Text style={styles.value}>{formatCurrency(data.grossProfit)}</Text>
            <Text style={styles.comparisonValue}>{prevData ? formatCurrency(prevData.grossProfit) : '-'}</Text>
            <DeltaText current={data.grossProfit} prev={prevData?.grossProfit || 0} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Despesas Operacionais (Fixas)</Text>
            <Text style={styles.value}>-{formatCurrency(Math.abs(data.totalFixedExpenses))}</Text>
            <Text style={styles.comparisonValue}>{prevData ? `-${formatCurrency(Math.abs(prevData.totalFixedExpenses))}` : '-'}</Text>
            <DeltaText current={data.totalFixedExpenses} prev={prevData?.totalFixedExpenses || 0} />
          </View>

          <View style={[styles.row, { paddingLeft: 20, borderBottomWidth: 0, opacity: 0.7 }]}>
            <Text style={[styles.label, { fontSize: 8 }]}>Marketing e Vendas</Text>
            <Text style={[styles.value, { fontSize: 8 }]}>- {formatCurrency(data.marketingExpenses)}</Text>
            <Text style={[styles.comparisonValue, { fontSize: 8 }]}>{prevData ? `- ${formatCurrency(prevData.marketingExpenses)}` : '-'}</Text>
            <Text style={[styles.delta, { fontSize: 8 }]}> </Text>
          </View>

          <View style={[styles.row, { paddingLeft: 20, borderBottomWidth: 0, opacity: 0.7 }]}>
            <Text style={[styles.label, { fontSize: 8 }]}>Logística e Entrega</Text>
            <Text style={[styles.value, { fontSize: 8 }]}>- {formatCurrency(data.logisticsExpenses)}</Text>
            <Text style={[styles.comparisonValue, { fontSize: 8 }]}>{prevData ? `- ${formatCurrency(prevData.logisticsExpenses)}` : '-'}</Text>
            <Text style={[styles.delta, { fontSize: 8 }]}> </Text>
          </View>

          <View style={[styles.row, { paddingLeft: 20, borderBottomWidth: 0, opacity: 0.7 }]}>
            <Text style={[styles.label, { fontSize: 8 }]}>Taxas de Cartão</Text>
            <Text style={[styles.value, { fontSize: 8 }]}>- {formatCurrency(data.cardFeesExpenses)}</Text>
            <Text style={[styles.comparisonValue, { fontSize: 8 }]}>{prevData ? `- ${formatCurrency(prevData.cardFeesExpenses)}` : '-'}</Text>
            <Text style={[styles.delta, { fontSize: 8 }]}> </Text>
          </View>

          <View style={[styles.row, { paddingLeft: 20, opacity: 0.7 }]}>
            <Text style={[styles.label, { fontSize: 8 }]}>Outros Operacionais</Text>
            <Text style={[styles.value, { fontSize: 8 }]}>- {formatCurrency((data.otherOperatingExpenses || 0) + ((data as any).baseFixedExpenses || 0))}</Text>
            <Text style={[styles.comparisonValue, { fontSize: 8 }]}>{prevData ? `- ${formatCurrency((prevData.otherOperatingExpenses || 0) + ((prevData as any).baseFixedExpenses || 0))}` : '-'}</Text>
            <Text style={[styles.delta, { fontSize: 8 }]}> </Text>
          </View>

          <View style={[styles.row, styles.highlightedRow]}>
            <Text style={styles.label}>(=) Lucro Operacional (EBITDA)</Text>
            <Text style={styles.value}>{formatCurrency(data.netProfit)}</Text>
            <Text style={styles.comparisonValue}>{prevData ? formatCurrency(prevData.netProfit) : '-'}</Text>
            <DeltaText current={data.netProfit} prev={prevData?.netProfit || 0} />
          </View>

          {data.netProfit > 0 && investors.length > 0 && (
            <>
              {investors.map(investor => (
                <View key={investor.id} style={styles.row}>
                  <Text style={styles.label}>Distribuição {investor.name} ({investor.share_percentage}%)</Text>
                  <Text style={styles.value}>{formatCurrency(Math.abs(data.investorDistributions?.[investor.id] || 0))}</Text>
                  <Text style={styles.comparisonValue}>
                    {prevData?.investorDistributions?.[investor.id] ? formatCurrency(Math.abs(prevData.investorDistributions[investor.id])) : '-'}
                  </Text>
                  <DeltaText 
                    current={data.investorDistributions?.[investor.id] || 0} 
                    prev={prevData?.investorDistributions?.[investor.id] || 0} 
                  />
                </View>
              ))}
            </>
          )}

          <View style={[styles.row, { marginTop: 10, backgroundColor: '#0f172a', color: 'white', padding: 10, borderRadius: 5 }]}>
            <Text style={[styles.label, { color: 'white' }]}>(=) Resultado Líquido Final</Text>
            <Text style={[styles.value, { color: 'white' }]}>{formatCurrency(data.finalNetProfit ?? 0)}</Text>
            <Text style={[styles.comparisonValue, { color: '#94a3b8' }]}>{prevData ? formatCurrency(prevData.finalNetProfit ?? 0) : '-'}</Text>
            <DeltaText current={data.finalNetProfit ?? 0} prev={prevData?.finalNetProfit ?? 0} />
          </View>
        </View>

        <Text style={styles.footer}>
          Gerado em {new Date().toLocaleString('pt-BR')} | Melhor Aço - Gestão Industrial
        </Text>
      </Page>
    </Document>
  );
};

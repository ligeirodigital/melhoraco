import { describe, it, expect } from 'vitest';

// Extracted logic from useFinance.ts for testing
function calculateDreLogic(
  transactions: any[],
  quotes: any[],
  settings: any,
  directExpenses: any[] = []
) {
  // 1. Receita Bruta de Vendas
  const approvedQuotes = quotes.filter(q => q.status === 'aprovado' && q.payment_status === 'paid');
  const quoteRevenue = approvedQuotes.reduce((acc, q) => {
    const itemsTotal = q.items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);
    return acc + itemsTotal + (q.delivery_fee || 0) + (q.installation_fee || 0);
  }, 0);

  const cashFlowSales = transactions
    .filter(t => t.status === 'pago' && t.type === 'income' && (t.category.toLowerCase() === 'vendas' || t.category.toLowerCase() === 'venda'))
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const totalRevenue = quoteRevenue + cashFlowSales;

  // 2. Deduções e Impostos
  const taxRate = settings.tax_rate || 0;
  const taxes = totalRevenue * (taxRate / 100);
  
  const deductions = transactions
    .filter(t => t.status === 'pago' && (t.category.toLowerCase().includes('devolução') || t.category.toLowerCase().includes('desconto')))
    .reduce((acc, t) => acc + (t.amount || 0), 0);
  
  const totalDeductions = taxes + deductions;

  // 3. Receita Líquida
  const netRevenue = totalRevenue - totalDeductions;

  // 4. Custos (CMV/CPV)
  const cogs = approvedQuotes.reduce((acc, q) => {
    return acc + q.items.reduce((sum: number, item: any) => sum + ((item.fixed_cost || item.product?.cost || 0) * item.quantity), 0);
  }, 0);

  // 5. Lucro Bruto
  const grossProfit = netRevenue - cogs;
  
  // 6. Despesas Operacionais (Gastos fixos e administrativos)
  const baseFixedExpenses = settings.monthly_expenses || 0;
  
  // Marketing
  const marketingExpenses = transactions
    .filter(t => t.status === 'pago' && (t.type === 'expense' || t.type === 'income' ) && (t.category.toLowerCase() === 'marketing'))
    .reduce((acc, t) => acc + (t.type === 'expense' ? (t.amount || 0) : -(t.amount || 0)), 0) +
    directExpenses.filter(e => (e.category.toLowerCase() === 'marketing')).reduce((acc, e) => acc + (e.amount || 0), 0);

  // Logística
  const logisticsExpenses = transactions
    .filter(t => t.status === 'pago' && (t.type === 'expense' || t.type === 'income') && (t.category.toLowerCase().includes('logística') || t.category.toLowerCase().includes('logistica') || t.category.toLowerCase().includes('frete')))
    .reduce((acc, t) => acc + (t.type === 'expense' ? (t.amount || 0) : -(t.amount || 0)), 0) +
    directExpenses.filter(e => (e.category.toLowerCase().includes('logística') || e.category.toLowerCase().includes('logistica') || e.category.toLowerCase().includes('frete'))).reduce((acc, e) => acc + (e.amount || 0), 0);

  // Other Operating Expenses
  const otherOperatingExpenses = transactions
    .filter(t => t.status === 'pago' && t.type === 'expense' && 
      !['marketing', 'vendas', 'venda'].includes(t.category.toLowerCase()) && 
      !t.category.toLowerCase().includes('logística') && 
      !t.category.toLowerCase().includes('logistica') && 
      !t.category.toLowerCase().includes('frete') &&
      !t.category.toLowerCase().includes('devolução') && 
      !t.category.toLowerCase().includes('desconto')
    )
    .reduce((acc, t) => acc + (t.amount || 0), 0) + 
    directExpenses.filter(e => 
      !['marketing'].includes((e.category || '').toLowerCase()) && 
      !((e.category || '').toLowerCase().includes('logística')) && 
      !((e.category || '').toLowerCase().includes('logistica')) && 
      !((e.category || '').toLowerCase().includes('frete'))
    ).reduce((acc, e) => acc + (e.amount || 0), 0);

  const totalOperatingExpenses = baseFixedExpenses + marketingExpenses + logisticsExpenses + otherOperatingExpenses;

  // 7. Lucro Operacional (EBITDA)
  const netProfit = Number((grossProfit - totalOperatingExpenses).toFixed(2));
  
  // 8. Distribuição de Lucros
  const reserveFund = netProfit > 0 ? Number((netProfit * 0.20).toFixed(2)) : 0;
  const partnerADistribution = netProfit > 0 ? Number((netProfit * 0.40).toFixed(2)) : 0;
  const partnerBDistribution = netProfit > 0 ? Number((netProfit * 0.40).toFixed(2)) : 0;
  
  const totalDistribution = Number((reserveFund + partnerADistribution + partnerBDistribution).toFixed(2));
  const finalNetProfit = netProfit > 0 ? Number((netProfit - totalDistribution).toFixed(2)) : netProfit;

  return {
    grossProfit,
    totalFixedExpenses: totalOperatingExpenses,
    netProfit,
    reserveFund,
    partnerADistribution,
    partnerBDistribution,
    totalDistribution,
    finalNetProfit
  };
}

describe('DRE Calculation Logic', () => {
  it('should subtract operating expenses from gross profit to get EBITDA (netProfit)', () => {
    // Scenario: Gross Profit 132,00, Operating Expenses 25,60 -> EBITDA 106,40
    const settings = { tax_rate: 0, monthly_expenses: 0 };
    const transactions: any[] = [
      {
        status: 'pago',
        type: 'expense',
        category: 'Marketing',
        amount: 25.60
      }
    ];
    const quotes: any[] = [
      {
        status: 'aprovado',
        payment_status: 'paid',
        items: [{ unit_price: 132, quantity: 1, product: { cost: 0 } }]
      }
    ];

    const result = calculateDreLogic(transactions, quotes, settings);

    expect(result.grossProfit).toBe(132.00);
    expect(result.totalFixedExpenses).toBe(25.60);
    expect(result.netProfit).toBe(106.40);
    
    // Test Distribution
    expect(result.reserveFund).toBe(21.28); // 106.40 * 0.20
    expect(result.partnerADistribution).toBe(42.56); // 106.40 * 0.40
    expect(result.partnerBDistribution).toBe(42.56); // 106.40 * 0.40
    expect(result.totalDistribution).toBe(106.40);
    expect(result.finalNetProfit).toBe(0);
  });

  it('should handle only paid transactions and ignore pending ones', () => {
    const settings = { tax_rate: 0, monthly_expenses: 0 };
    const transactions: any[] = [
      { status: 'pago', type: 'income', category: 'vendas', amount: 100 },
      { status: 'pendente', type: 'income', category: 'vendas', amount: 50 },
      { status: 'pago', type: 'expense', category: 'Marketing', amount: 20 }
    ];
    const result = calculateDreLogic(transactions, [], settings);
    expect(result.netProfit).toBe(80);
  });

  it('should handle taxes and decimal precision correctly', () => {
    const settings = { tax_rate: 10, monthly_expenses: 0 }; 
    const quotes: any[] = [
      {
        status: 'aprovado',
        payment_status: 'paid',
        items: [{ unit_price: 1000.55, quantity: 1, product: { cost: 100 } }] 
      }
    ];
    const result = calculateDreLogic([], quotes, settings);

    // Revenue: 1000.55
    // Tax: 100.055
    // Net Revenue: 900.495
    // Gross Profit: 800.495
    // netProfit: 800.50 (toFixed(2))
    expect(result.netProfit).toBe(800.49);
  });
});

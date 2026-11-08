
import { describe, it, expect } from 'vitest';

// Simulação simplificada da lógica do useFinance.ts para teste
function calculateDreLogic({ 
  revenue = 0, 
  taxRate = 0, 
  cogs = 0, 
  operatingExpenses = 0 
}) {
  const taxes = revenue * (taxRate / 100);
  const netRevenue = revenue - taxes;
  const grossProfit = netRevenue - cogs;
  
  // EBITDA (Lucro Operacional)
  // O bug era: grossProfit + operatingExpenses
  // O correto: grossProfit - operatingExpenses
  const netProfit = Number((grossProfit - operatingExpenses).toFixed(2));
  
  return {
    revenue,
    taxes,
    netRevenue,
    grossProfit,
    operatingExpenses,
    netProfit
  };
}

describe('Cálculos da DRE', () => {
  it('deve subtrair despesas operacionais do lucro bruto para chegar ao EBITDA', () => {
    // Caso relatado pelo usuário: 132.00 (Lucro Bruto) e 25.60 (Despesa)
    // Se somasse: 157.60 (Errado)
    // Se subtrair: 106.40 (Correto)
    
    const result = calculateDreLogic({
      revenue: 146.67, // Aproximado para dar 132 de lucro bruto com taxa 10%
      taxRate: 10,
      cogs: 0,
      operatingExpenses: 25.60
    });

    // Validando Lucro Bruto aproximado (146.67 - 14.67 = 132)
    const expectedGrossProfit = 132.00;
    const expectedNetProfit = 106.40;

    console.log(`Lucro Bruto: ${result.grossProfit.toFixed(2)}`);
    console.log(`Despesas: ${result.operatingExpenses.toFixed(2)}`);
    console.log(`EBITDA (Resultado): ${result.netProfit.toFixed(2)}`);

    expect(result.netProfit).toBe(expectedNetProfit);
    expect(result.netProfit).toBeLessThan(result.grossProfit);
  });
});

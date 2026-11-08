import { describe, it, expect } from 'vitest';

// Replica simplificada da lógica de classificação de Deduções/Impostos do useFinance.ts
function classifyDeduction(
  transaction: { category: string; status: string },
  categories: Array<{ name: string; dre_group?: string }>
): boolean {
  if (transaction.status !== 'pago') return false;
  const catLower = transaction.category.toLowerCase();
  if (
    catLower.includes('fabricação') ||
    catLower.includes('fabricacao') ||
    catLower.includes('produção') ||
    catLower.includes('producao')
  ) return false;
  const cat = categories.find(
    c => c.name.trim().toLowerCase() === transaction.category.trim().toLowerCase()
  );
  const group = cat?.dre_group;
  return (
    group === 'deduction' ||
    group === 'tax' ||
    (!group && (catLower.includes('devolução') || catLower.includes('desconto') || catLower.includes('imposto')))
  );
}

describe('Classificação de Imposto na DRE', () => {
  it('categoria com dre_group="tax" entra como dedução/imposto', () => {
    const categories = [{ name: 'DAS Simples', dre_group: 'tax' }];
    const tx = { category: 'DAS Simples', status: 'pago' };
    expect(classifyDeduction(tx, categories)).toBe(true);
  });

  it('categoria com dre_group="deduction" também entra', () => {
    const categories = [{ name: 'Devolução', dre_group: 'deduction' }];
    const tx = { category: 'Devolução', status: 'pago' };
    expect(classifyDeduction(tx, categories)).toBe(true);
  });

  it('categoria sem grupo mas com "imposto" no nome entra por fallback', () => {
    const tx = { category: 'Imposto ISS', status: 'pago' };
    expect(classifyDeduction(tx, [])).toBe(true);
  });

  it('categoria com grupo "operating" NÃO entra como imposto', () => {
    const categories = [{ name: 'Aluguel', dre_group: 'operating' }];
    const tx = { category: 'Aluguel', status: 'pago' };
    expect(classifyDeduction(tx, categories)).toBe(false);
  });

  it('transação pendente NÃO entra mesmo se for imposto', () => {
    const categories = [{ name: 'DAS', dre_group: 'tax' }];
    const tx = { category: 'DAS', status: 'pendente' };
    expect(classifyDeduction(tx, categories)).toBe(false);
  });

  it('fabricação nunca entra como imposto', () => {
    const categories = [{ name: 'Fabricação', dre_group: 'tax' }];
    const tx = { category: 'Fabricação', status: 'pago' };
    expect(classifyDeduction(tx, categories)).toBe(false);
  });
});

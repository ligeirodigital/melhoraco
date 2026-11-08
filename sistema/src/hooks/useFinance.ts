import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useProjectData } from "@/hooks/useProjectData";
import { useFinanceData } from "@/hooks/useFinanceData";
import { toast } from "sonner";
import { useMemo } from "react";
import { fetchDreMetrics } from "@/lib/cloudStore";
import { getQuoteTotal } from "@/lib/formatQuote";
import { Transaction, DREMetrics, FinancialStats } from "@/types/finance";

export interface UseFinanceOptions {
  /**
   * Calcula a participação de lucro dos investidores mês a mês.
   * É a rotina mais cara do hook (um DRE por mês do histórico), por isso é
   * opt-in: só o InvestorModule precisa dela.
   */
  withInvestorShares?: boolean;
}

export function useFinance(startDate?: Date, endDate?: Date, options: UseFinanceOptions = {}) {
  const { withInvestorShares = false } = options;
  const { user } = useAuth();
  const { quotes, settings, inventory } = useProjectData();
  const { cashFlow, financialCategories, expenses: directExpenses, investorTransactions, investors, mutations } = useFinanceData();
  const queryClient = useQueryClient();

  // 1. Unificar todas as transações (Fluxo de Caixa + Pagamentos de Orçamentos)
  const allTransactions = useMemo<Transaction[]>(() => {
    const data: Transaction[] = (cashFlow.data || []).map(t => ({ 
      ...t, 
      source: t.installment_number ? 'receivable' : 'cashflow',
      quote_id: (t as any).quote_id 
    })) as Transaction[];
    
    const existingQuoteIdsInCashFlow = new Set(
      data.filter(t => t.quote_id && t.type === 'income').map(t => t.quote_id)
    );
    
    if (quotes.data) {
      quotes.data.forEach(q => {
        // Se já existe um lançamento de entrada no fluxo de caixa vinculado a este orçamento,
        // não adicionamos os lançamentos sintéticos para evitar duplicidade.
        if (existingQuoteIdsInCashFlow.has(q.id)) return;

        // PRIORIDADE 1: Se o status for 'paid', é um pagamento total único
        const isFullStatus = q.payment_status === 'paid';
        
        // PRIORIDADE 2: Se ambas as datas de sinal e restante forem iguais e preenchidas
        const isSynchronizedPartials = q.down_payment_paid_at && 
                           q.final_payment_paid_at && 
                           q.down_payment_paid_at === q.final_payment_paid_at;

        if (isFullStatus || isSynchronizedPartials) {
          data.push({
            id: `total-combined-${q.id}`,
            user_id: q.user_id,
            amount: getQuoteTotal(q),
            transaction_date: q.payment_date || q.down_payment_paid_at || q.created_at,
            description: `Pagamento Total Orçamento #${q.id.slice(0, 8)} - ${q.client?.name}`,
            type: 'income',
            category: 'Vendas',
            status: 'pago',
            created_at: q.payment_date || q.down_payment_paid_at || q.created_at,
            source: 'quote-total',
            quote_id: q.id
          } as Transaction);
          return;
        }

        // Sinal
        if (q.down_payment_paid_at) {
          data.push({
            id: `down-${q.id}`,
            user_id: q.user_id,
            amount: Number(q.down_payment || 0),
            transaction_date: q.down_payment_paid_at,
            description: `Sinal Orçamento #${q.id.slice(0, 8)} - ${q.client?.name}`,
            type: 'income',
            category: 'Vendas',
            status: 'pago',
            created_at: q.down_payment_paid_at,
            source: 'quote-down',
            quote_id: q.id
          } as Transaction);
        }
        
        // Restante
        if (q.final_payment_paid_at) {
          data.push({
            id: `final-${q.id}`,
            user_id: q.user_id,
            amount: Number(q.remaining_balance || 0),
            transaction_date: q.final_payment_paid_at,
            description: `Restante Orçamento #${q.id.slice(0, 8)} - ${q.client?.name}`,
            type: 'income',
            category: 'Vendas',
            status: 'pago',
            created_at: q.final_payment_paid_at,
            source: 'quote-final',
            quote_id: q.id
          } as Transaction);
        }
      });
    }

    if (investorTransactions.data) {
      investorTransactions.data.forEach(it => {
        data.push({
          id: `investor-${it.id}`,
          user_id: user?.id || '',
          amount: Number(it.amount),
          transaction_date: it.date,
          description: `Investidor: ${it.description || (it.type === 'deposit' ? 'Aporte' : 'Retirada')}`,
          type: it.type === 'deposit' ? 'income' : 'expense',
          category: 'Investidor',
          status: 'pago',
          created_at: it.created_at,
          source: 'investor',
          investor_id: it.investor_id
        } as Transaction);
      });
    }

    return data.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [cashFlow.data, quotes.data, investorTransactions.data]);

  const calculateDre = (start?: Date, end?: Date): DREMetrics => {
    const periodTransactions = allTransactions.filter(t => {
      if (!start || !end) return true;
      const d = new Date(t.transaction_date);
      return d >= start && d <= end;
    });

    const allExpenses = (directExpenses.data || []).filter(e => {
      if (!start || !end) return true;
      const d = new Date(e.expense_date);
      return d >= start && d <= end;
    });

    const getDreGroup = (catName: string) => {
      const category = (financialCategories.data || []).find(c => c.name.trim().toLowerCase() === catName.trim().toLowerCase());
      return category?.dre_group;
    };

    // 1. Receita Bruta de Vendas
    const totalRevenue = periodTransactions
      .filter(t => {
        if (t.status !== 'pago' || t.type !== 'income') return false;
        const group = getDreGroup(t.category);
        return group === 'revenue' || (!group && (t.category.toLowerCase().includes('venda') || t.category.toLowerCase().includes('vendas')));
      })
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    // 2. Deduções e Impostos
    const taxRate = settings.data?.tax_rate || 0;
    const taxes = totalRevenue * (taxRate / 100);
    
    const deductions = periodTransactions
      .filter(t => {
        if (t.status !== 'pago') return false;
        const catLower = t.category.toLowerCase();
        if (catLower.includes('fabricação') || catLower.includes('fabricacao') || catLower.includes('produção') || catLower.includes('producao')) return false;
        const group = getDreGroup(t.category);
        return group === 'deduction' || group === 'tax' || (!group && (catLower.includes('devolução') || catLower.includes('desconto') || catLower.includes('imposto')));
      })
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    
    const totalDeductions = taxes + deductions;

    // 3. Receita Líquida
    const netRevenue = totalRevenue - totalDeductions;

    // 4. Custos (CMV/CPV)
    // ATENÇÃO: Despesas de fabricação/produção NÃO entram na DRE, apenas no Fluxo de Caixa.
    // O CMV na DRE Industrial é calculado proporcionalmente às vendas realizadas (custo dos produtos vendidos).
    const cogs = (quotes.data || []).reduce((acc, q) => {
      const quoteCogsTotal = q.items.reduce((sum, item) => 
        sum + ((Number(item.fixed_cost) || Number(item.product?.cost) || 0) * item.quantity), 0);
      
      const quoteTotal = getQuoteTotal(q);
      if (quoteTotal <= 0 || quoteCogsTotal <= 0) return acc;

      const shortId = q.id.slice(0, 8);
      const paymentsForQuote = allTransactions.filter(t => 
        t.status === 'pago' && 
        t.type === 'income' && 
        ((t as any).quote_id === q.id || t.id.includes(q.id) || t.description.includes(shortId))
      );

      const paymentsInPeriod = paymentsForQuote.filter(t => {
        if (!start || !end) return true;
        const d = new Date(t.transaction_date);
        return d >= start && d <= end;
      });

      const revenueInPeriod = paymentsInPeriod.reduce((sum, t) => sum + (t.amount || 0), 0);

      // Fallback: se o orçamento está aprovado dentro do período mas não há pagamentos vinculados
      // (ex.: usuário não registrou entradas no fluxo de caixa), contabilizamos o CMV integral
      // para que o custo do orçamento não seja perdido na DRE.
      if (revenueInPeriod <= 0) {
        const isApproved = q.status === 'aprovado' || q.payment_status === 'paid';
        if (!isApproved) return acc;
        const refDate = new Date(
          q.signed_at || q.payment_date || q.down_payment_paid_at || q.final_payment_paid_at || q.created_at
        );
        if (start && end && (refDate < start || refDate > end)) return acc;
        return acc + quoteCogsTotal;
      }

      const proportion = Math.min(1, revenueInPeriod / quoteTotal);
      return acc + (quoteCogsTotal * proportion);
    }, 0);


    // 5. Lucro Bruto
    const grossProfit = netRevenue - cogs;
    
    // 6. Despesas Operacionais
    // Rateio do custo fixo mensal proporcional ao período filtrado
    const monthlyFixed = settings.data?.monthly_expenses || 0;
    let baseFixedExpenses = monthlyFixed;
    if (startDate && endDate) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const periodDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1);
      const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
      baseFixedExpenses = Number(((monthlyFixed / daysInMonth) * periodDays).toFixed(2));
    }
    
    const marketingExpenses = periodTransactions
      .filter(t => {
        if (t.status !== 'pago') return false;
        const catLower = t.category.toLowerCase();
        const descLower = t.description.toLowerCase();
        // Categorias explicitamente de fabricação/produção não entram na DRE
        if (catLower.includes('fabricação') || catLower.includes('fabricacao') || catLower.includes('produção') || catLower.includes('producao') || 
            descLower.includes('fabricação') || descLower.includes('fabricacao') || descLower.includes('produção') || descLower.includes('producao')) {
          return false;
        }
        const group = getDreGroup(t.category);
        return group === 'marketing' || (!group && catLower.includes('marketing'));
      })
      .reduce((acc, t) => acc + (t.type === 'expense' ? (t.amount || 0) : -(t.amount || 0)), 0) +
      allExpenses.filter(e => {
        const catLower = (e.category || '').toLowerCase();
        // Categorias explicitamente de fabricação/produção não entram na DRE
        if (catLower.includes('fabricação') || catLower.includes('fabricacao') || catLower.includes('produção') || catLower.includes('producao')) return false;
        const group = getDreGroup(e.category || '');
        return group === 'marketing' || (!group && catLower.includes('marketing'));
      }).reduce((acc, e) => acc + (e.amount || 0), 0);

    const logisticsExpenses = periodTransactions
      .filter(t => {
        if (t.status !== 'pago') return false;
        const catLower = t.category.toLowerCase();
        const descLower = t.description.toLowerCase();
        // Categorias explicitamente de fabricação/produção não entram na DRE
        if (catLower.includes('fabricação') || catLower.includes('fabricacao') || catLower.includes('produção') || catLower.includes('producao') || 
            descLower.includes('fabricação') || descLower.includes('fabricacao') || descLower.includes('produção') || descLower.includes('producao')) {
          return false;
        }
        const group = getDreGroup(t.category);
        return group === 'logistics' || (!group && (
          catLower.includes('logística') || 
          catLower.includes('logistica') || 
          catLower.includes('frete') ||
          catLower.includes('entrega')
        ));
      })
      .reduce((acc, t) => acc + (t.type === 'expense' ? (t.amount || 0) : -(t.amount || 0)), 0) +
      allExpenses.filter(e => {
        const catLower = (e.category || '').toLowerCase();
        // Categorias explicitamente de fabricação/produção não entram na DRE
        if (catLower.includes('fabricação') || catLower.includes('fabricacao') || catLower.includes('produção') || catLower.includes('producao')) return false;
        const group = getDreGroup(e.category || '');
        return group === 'logistics' || (!group && (
          catLower.includes('logística') || 
          catLower.includes('logistica') || 
          catLower.includes('frete') ||
          catLower.includes('entrega')
        ));
      }).reduce((acc, e) => acc + (e.amount || 0), 0);

    const cardFeesExpenses = periodTransactions
      .filter(t => {
        if (t.status !== 'pago') return false;
        const catLower = t.category.toLowerCase();
        const descLower = t.description.toLowerCase();
        // Categorias explicitamente de fabricação/produção não entram na DRE
        if (catLower.includes('fabricação') || catLower.includes('fabricacao') || catLower.includes('produção') || catLower.includes('producao') || 
            descLower.includes('fabricação') || descLower.includes('fabricacao') || descLower.includes('produção') || descLower.includes('producao')) {
          return false;
        }
        const group = getDreGroup(t.category);
        return group === 'fees' || (!group && catLower.includes("taxa de cartão"));
      })
      .reduce((acc, t) => acc + (t.type === "expense" ? (t.amount || 0) : -(t.amount || 0)), 0) +
      allExpenses.filter(e => {
        const catLower = (e.category || '').toLowerCase();
        // Categorias explicitamente de fabricação/produção não entram na DRE
        if (catLower.includes('fabricação') || catLower.includes('fabricacao') || catLower.includes('produção') || catLower.includes('producao')) return false;
        const group = getDreGroup(e.category || '');
        return group === 'fees' || (!group && catLower.includes("taxa de cartão"));
      }).reduce((acc, e) => acc + (e.amount || 0), 0);

    const otherOperatingExpenses = periodTransactions
      .filter(t => {
        if (t.status !== 'pago' || t.type !== 'expense') return false;
        const catLower = t.category.toLowerCase();
        const descLower = t.description.toLowerCase();

        // Categorias explicitamente de fabricação/produção não entram na DRE
        if (catLower.includes('fabricação') || catLower.includes('fabricacao') || catLower.includes('produção') || catLower.includes('producao') || 
            descLower.includes('fabricação') || descLower.includes('fabricacao') || descLower.includes('produção') || descLower.includes('producao')) {
          return false;
        }

        const group = getDreGroup(t.category);
        
        // Se a fonte for 'investor', não entra na DRE (apenas no Fluxo de Caixa)
        if (t.source === 'investor') return false;

        // Se tem grupo definido, e é 'operating'
        if (group === 'operating') return true;
        // Se tem outro grupo definido (revenue, deduction, cmv, marketing, logistics, fees), não é 'other operating'
        if (group && group !== 'operating') return false;

        // Fallback para lógica baseada em texto (se não tiver grupo definido)
        return !catLower.includes('marketing') && 
          !catLower.includes('venda') && 
          !catLower.includes('logística') && 
          !catLower.includes('logistica') && 
          !catLower.includes('frete') &&
          !catLower.includes('entrega') &&
          !catLower.includes('taxa de cartão') &&
          !catLower.includes('devolução') && 
          !catLower.includes('desconto');
      })
      .reduce((acc, t) => acc + (t.amount || 0), 0) + 
      allExpenses.filter(e => {
        const group = getDreGroup(e.category || '');
        if (group === 'operating') return true;
        if (group && group !== 'operating') return false;

        const catLower = (e.category || '').toLowerCase();

        if (catLower.includes('fabricação') || catLower.includes('fabricacao') || catLower.includes('produção') || catLower.includes('producao')) {
          return false;
        }

        // Excluir o que já é contabilizado em outras linhas da DRE
        return !catLower.includes('marketing') &&
          !catLower.includes('venda') &&
          !catLower.includes('logística') &&
          !catLower.includes('logistica') &&
          !catLower.includes('frete') &&
          !catLower.includes('entrega') &&
          !catLower.includes('taxa de cartão') &&
          !catLower.includes('taxa de cartao') &&
          !catLower.includes('devolução') &&
          !catLower.includes('devolucao') &&
          !catLower.includes('desconto');
      }).reduce((acc, e) => acc + (e.amount || 0), 0);

    const totalOperatingExpenses = baseFixedExpenses + marketingExpenses + logisticsExpenses + cardFeesExpenses + otherOperatingExpenses;

    const netProfit = Number((grossProfit - totalOperatingExpenses).toFixed(2));
    
    // Distribuição dinâmica baseada nos investidores cadastrados
    const totalDistribution = (investors.data || []).reduce((acc, investor) => {
      const share = netProfit > 0 ? Number((netProfit * (investor.share_percentage / 100)).toFixed(2)) : 0;
      return acc + share;
    }, 0);

    const finalNetProfit = netProfit > 0 ? Number((netProfit - totalDistribution).toFixed(2)) : netProfit;

    return {
      quoteRevenue: totalRevenue,
      taxes: totalDeductions,
      netRevenue,
      cogs,
      grossProfit,
      totalFixedExpenses: totalOperatingExpenses,
      baseFixedExpenses,
      marketingExpenses,
      logisticsExpenses,
      cardFeesExpenses,
      otherOperatingExpenses,
      netProfit,
      reserveFund: 0,
      investorDistributions: (investors.data || []).reduce((acc, investor) => {
        acc[investor.id] = netProfit > 0 ? Number((netProfit * (investor.share_percentage / 100)).toFixed(2)) : 0;
        return acc;
      }, {} as Record<string, number>),
      totalDistribution,
      finalNetProfit,
      margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    };
  };

  const investorProfitSharesDetailed = useMemo(() => {
    const shares: Record<string, number> = {};
    const byMonth: Record<string, Array<{ month: string; amount: number; netProfit: number }>> = {};

    if (!withInvestorShares) return { shares, byMonth };
    if (!investors.data) return { shares, byMonth };
    investors.data.forEach(inv => { shares[inv.id] = 0; byMonth[inv.id] = []; });
    if (!allTransactions.length) return { shares, byMonth };

    const months = new Set<string>();
    allTransactions.forEach(t => {
      const d = new Date(t.transaction_date);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });

    const sortedMonths = Array.from(months).sort();
    let aggregateNetProfit = 0;
    const perMonth: Array<{ month: string; netProfit: number }> = [];
    sortedMonths.forEach(monthStr => {
      const [year, month] = monthStr.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      const monthDre = calculateDre(start, end);
      aggregateNetProfit += monthDre.netProfit;
      perMonth.push({ month: monthStr, netProfit: monthDre.netProfit });
    });

    // Distribui mês a mês de forma independente: cada mês com lucro positivo
    // gera participação, mesmo que o agregado anual seja negativo.
    investors.data.forEach(investor => {
      const monthly = perMonth
        .filter(m => m.netProfit > 0)
        .map(m => ({
          month: m.month,
          netProfit: m.netProfit,
          amount: Number((m.netProfit * (investor.share_percentage / 100)).toFixed(2)),
        }));
      byMonth[investor.id] = monthly;
      shares[investor.id] = Number(
        monthly.reduce((acc, m) => acc + m.amount, 0).toFixed(2)
      );
    });

    return { shares, byMonth };
  }, [withInvestorShares, allTransactions, investors.data, settings.data, quotes.data, directExpenses.data, financialCategories.data]);

  const investorProfitShares = investorProfitSharesDetailed.shares;
  const investorProfitSharesByMonth = investorProfitSharesDetailed.byMonth;

  const dreData = useMemo(() => calculateDre(startDate, endDate), [allTransactions, settings.data, quotes.data, directExpenses.data, startDate, endDate, investors.data]);

  const prevMonthDre = useMemo(() => {
    if (!startDate || !endDate) return null;
    const prevStart = new Date(startDate);
    prevStart.setMonth(prevStart.getMonth() - 1);
    const prevEnd = new Date(endDate);
    prevEnd.setMonth(prevEnd.getMonth() - 1);
    return calculateDre(prevStart, prevEnd);
  }, [allTransactions, settings.data, quotes.data, directExpenses.data, startDate, endDate]);

  const transactions = useMemo(() => {
    let data = allTransactions;
    if (startDate && endDate) {
      data = data.filter(t => {
        const d = new Date(t.transaction_date);
        return d >= startDate && d <= endDate;
      });
    }
    return data;
  }, [allTransactions, startDate, endDate, financialCategories.data]);

  const stats = useMemo<FinancialStats>(() => {
    const allPaidTransactions = allTransactions.filter(t => t.status === 'pago');
    const totalIncome = allPaidTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalExpenses = allPaidTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    
    const manualBase = (settings.data as any)?.manual_balance || 0;
    
    return {
      totalIncome,
      totalExpenses,
      balance: manualBase + totalIncome - totalExpenses,
    };
  }, [allTransactions, settings.data]);

  return {
    transactions,
    categories: financialCategories.data || [],
    investors: investors.data || [],
    investorTransactions: investorTransactions.data || [],
    investorProfitShares,
    investorProfitSharesByMonth,
    stats,
    dreData,
    prevMonthDre,
    isLoading: cashFlow.isLoading || financialCategories.isLoading || (directExpenses as any).isLoading,
    mutations
  };
}

export function useDreMetrics(period: string, year?: number, month?: number) {
  const { user } = useAuth();
  
  const dates = getDatesFromPeriod(period, year, month);

  return useQuery({
    queryKey: ["dre-metrics", user?.id, period, year, month],
    queryFn: () => {
      if (!user?.id) throw new Error("User not authenticated");
      return fetchDreMetrics(user.id, dates.start, dates.end);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

function getDatesFromPeriod(period: string, year?: number, month?: number) {
  const now = new Date();
  const start = new Date();
  const end = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (period === "custom" && year !== undefined && month !== undefined) {
    start.setFullYear(year, month, 1);
    end.setFullYear(year, month + 1, 0);
  } else if (period.startsWith("custom-")) {
    const [, y, m] = period.split("-");
    start.setFullYear(parseInt(y), parseInt(m) - 1, 1);
    end.setFullYear(parseInt(y), parseInt(m), 0);
  } else {
    switch (period) {
      case "month": 
        start.setDate(1); 
        break;
      case "quarter": 
        start.setMonth(Math.floor(now.getMonth() / 3) * 3, 1); 
        break;
      case "year": 
        start.setMonth(0, 1); 
        break;
      case "all":
        start.setFullYear(2000, 0, 1);
        break;
    }
  }

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

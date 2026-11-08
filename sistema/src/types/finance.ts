
export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_date: string;
  description: string;
  type: 'income' | 'expense' | 'investment' | string;
  category: string;
  status: 'pendente' | 'pago' | string;
  created_at: string;
  source?: string;
  quote_id?: string | null;
  investor_id?: string | null;
  due_date?: string | null;
  payment_method?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
  paid_at?: string | null;
}

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'income' | 'expense' | string;
  dre_group?: 'revenue' | 'deduction' | 'cmv' | 'marketing' | 'logistics' | 'fees' | 'operating' | string;
  user_id: string;
}

export interface Investor {
  id: string;
  name: string;
  share_percentage: number;
  balance?: number;
}

export interface InvestorTransaction {
  id: string;
  investor_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  description: string;
  date: string;
  created_at: string;
}

export interface DREMetrics {
  quoteRevenue: number;
  taxes: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  totalFixedExpenses: number;
  baseFixedExpenses: number;
  marketingExpenses: number;
  logisticsExpenses: number;
  cardFeesExpenses: number;
  otherOperatingExpenses: number;
  netProfit: number;
  reserveFund: number;
  investorDistributions: Record<string, number>;
  totalDistribution: number;
  finalNetProfit: number;
  margin: number;
}

export interface FinancialStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

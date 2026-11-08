
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { 
  fetchCashFlowTransactions,
  saveCashFlowTransaction,
  deleteCashFlowTransaction,
  fetchFinancialCategories,
  saveFinancialCategory,
  deleteFinancialCategory,
  fetchProfitWithdrawals,
  saveProfitWithdrawal,
  deleteProfitWithdrawal,
  fetchExpenses,
  saveExpense,
  deleteExpense,
  fetchInvestors,
  saveInvestor,
  deleteInvestor,
  fetchInvestorTransactions,
  saveInvestorTransaction,
  deleteInvestorTransaction
} from "@/lib/cloudStore";
import { useAuth } from "./useAuth";

/**
 * World-Class Hook for Finance Domain.
 * Separates finance concerns from general project data.
 */
export function useFinanceData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const cashFlow = useQuery({
    queryKey: ["cash-flow", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not authenticated");
      return fetchCashFlowTransactions(user.id);
    },
    enabled: !!user?.id,
  });

  const financialCategories = useQuery({
    queryKey: ["financial-categories", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not authenticated");
      return fetchFinancialCategories(user.id);
    },
    enabled: !!user?.id,
  });

  const withdrawals = useQuery({
    queryKey: ["withdrawals", user?.id],
    queryFn: () => fetchProfitWithdrawals(),
    enabled: !!user,
  });

  const expenses = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: () => fetchExpenses(),
    enabled: !!user,
  });

  const investors = useQuery({
    queryKey: ["investors", user?.id],
    queryFn: () => fetchInvestors(),
    enabled: !!user,
  });

  const investorTransactions = useQuery({
    queryKey: ["investor-transactions", user?.id],
    queryFn: () => fetchInvestorTransactions(),
    enabled: !!user,
  });

  // Mutations
  const addCashFlow = useMutation({
    mutationFn: saveCashFlowTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["quote-receivables"] });
      queryClient.invalidateQueries({ queryKey: ["dre-metrics"] });
      toast.success("Transação salva!");
      logger.info("Finance transaction saved successfully");
    },
    onError: (err: any) => { 
      logger.error("Failed to save finance transaction", err);
      toast.error("Erro ao salvar transação: " + (err.message || "Erro interno")); 
    }
  });

  const removeCashFlow = useMutation({
    mutationFn: deleteCashFlowTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["quote-receivables"] });
      queryClient.invalidateQueries({ queryKey: ["dre-metrics"] });
      toast.success("Transação excluída!");
    },
    onError: (err: any) => toast.error("Erro ao excluir transação: " + err.message)
  });

  const addCategory = useMutation({
    mutationFn: saveFinancialCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast.success("Categoria salva!");
    },
    onError: (err: any) => toast.error("Erro ao salvar categoria: " + err.message)
  });

  const removeCategory = useMutation({
    mutationFn: deleteFinancialCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast.success("Categoria excluída!");
    },
    onError: (err: any) => toast.error("Erro ao excluir categoria: " + err.message)
  });

  return {
    cashFlow,
    financialCategories,
    withdrawals,
    expenses,
    investors,
    investorTransactions,
    mutations: {
      addCashFlow,
      removeCashFlow,
      addCategory,
      removeCategory,
      addWithdrawal: useMutation({
        mutationFn: saveProfitWithdrawal,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
          toast.success("Retirada registrada!");
        },
        onError: (err: any) => toast.error("Erro ao registrar retirada: " + err.message)
      }),
      removeWithdrawal: useMutation({
        mutationFn: deleteProfitWithdrawal,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
          toast.success("Retirada excluída!");
        },
        onError: (err: any) => toast.error("Erro ao excluir retirada: " + err.message)
      }),
      addExpense: useMutation({
        mutationFn: saveExpense,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          toast.success("Despesa salva!");
        },
        onError: (err: any) => toast.error("Erro ao salvar despesa: " + err.message)
      }),
      removeExpense: useMutation({
        mutationFn: deleteExpense,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          toast.success("Despesa excluída!");
        },
        onError: (err: any) => toast.error("Erro ao excluir despesa: " + err.message)
      }),
      addInvestorTransaction: useMutation({
        mutationFn: saveInvestorTransaction,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["investor-transactions"] });
          queryClient.invalidateQueries({ queryKey: ["investors"] });
          toast.success("Lançamento de investidor salvo!");
        },
        onError: (err: any) => toast.error("Erro ao salvar lançamento: " + err.message)
      }),
      removeInvestorTransaction: useMutation({
        mutationFn: deleteInvestorTransaction,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["investor-transactions"] });
          queryClient.invalidateQueries({ queryKey: ["investors"] });
          toast.success("Lançamento de investidor excluído!");
        },
        onError: (err: any) => toast.error("Erro ao excluir lançamento: " + err.message)
      }),
      addInvestor: useMutation({
        mutationFn: saveInvestor,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["investors"] });
          toast.success("Investidor salvo!");
        },
        onError: (err: any) => toast.error("Erro ao salvar investidor: " + err.message)
      }),
      removeInvestor: useMutation({
        mutationFn: deleteInvestor,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["investors"] });
          toast.success("Investidor excluído!");
        },
        onError: (err: any) => toast.error("Erro ao excluir investidor: " + err.message)
      }),
    }
  };
}

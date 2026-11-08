import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  fetchProducts, 
  fetchQuotes, 
  fetchClients, 
  fetchExpenses, 
  fetchBusinessSettings,
  fetchDreMetrics,
  updateQuoteStatus,
  saveExpense,
  deleteExpense,
  fetchProfitWithdrawals,
  saveProfitWithdrawal,
  deleteProfitWithdrawal,
  fetchSalesTargets,
  upsertSalesTarget,
  markFollowUp,
  updateQuotePayment,
  updateQuotePartialPayment,
  updateQuoteFullPayment,
  fetchClientInsights,
  deleteQuoteById,
  deleteClient,
  fetchActivityLogs,
  fetchPipelineStages,
  updateQuoteStage,
  fetchCashFlowTransactions,
  saveCashFlowTransaction,
  deleteCashFlowTransaction,
  fetchFinancialCategories,
  saveFinancialCategory,
  deleteFinancialCategory,
  fetchInteractions,
  saveInteraction,
  fetchInventory,
  upsertInventory,
  saveInventoryLog,
  deleteInventoryItem,
  deleteProduct,
  createProduct

} from "@/lib/cloudStore";


import { useAuth } from "./useAuth";

export function useProjectData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: ["products", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      return fetchProducts(user.id);
    },
    enabled: !!user?.id,
  });

  const quotes = useQuery({
    queryKey: ["quotes", user?.id],
    queryFn: () => fetchQuotes(),
    enabled: !!user,
  });

  const clients = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: () => fetchClients(),
    enabled: !!user,
  });

  const expenses = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: () => fetchExpenses(),
    enabled: !!user,
  });

  const settings = useQuery({
    queryKey: ["settings", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not authenticated");
      return fetchBusinessSettings(user.id);
    },
    enabled: !!user?.id,
  });

  const withdrawals = useQuery({
    queryKey: ["withdrawals", user?.id],
    queryFn: () => fetchProfitWithdrawals(),
    enabled: !!user,
  });

  const salesTargets = useQuery({
    queryKey: ["sales-targets", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not authenticated");
      return fetchSalesTargets(user.id);
    },
    enabled: !!user?.id,
  });

  const clientInsights = useQuery({
    queryKey: ["client-insights", user?.id],
    queryFn: () => fetchClientInsights(),
    enabled: !!user,
  });
  
  const activityLogs = useQuery({
    queryKey: ["activity-logs", user?.id],
    queryFn: () => fetchActivityLogs(),
    enabled: !!user && user.email === 'melhoracooficial@gmail.com',
  });

  const pipelineStages = useQuery({
    queryKey: ["pipeline-stages", user?.id],
    queryFn: () => fetchPipelineStages(),
    enabled: !!user,
  });

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

  const inventory = useQuery({
    queryKey: ["inventory", user?.id],
    queryFn: () => fetchInventory(),
    enabled: !!user,
  });

  const getInteractions = (clientId: string) => useQuery({
    queryKey: ["interactions", clientId],
    queryFn: () => fetchInteractions(clientId),
    enabled: !!clientId,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ quoteId, status }: { quoteId: string; status: any }) => 
      updateQuoteStatus(quoteId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Status atualizado!");
    },
    onError: (err: any) => {
      err.handled = true;
      toast.error("Erro ao atualizar status: " + err.message);
    }
  });

  const removeQuoteMutation = useMutation({
    mutationFn: (id: string) => deleteQuoteById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Orçamento excluído!");
    },
    onError: (err: any) => {
      err.handled = true;
      toast.error("Erro ao excluir orçamento: " + err.message);
    }
  });

  const addExpenseMutation = useMutation({
    mutationFn: saveExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Despesa salva!");
    },
    onError: (err: any) => {
      err.handled = true;
      toast.error("Erro ao salvar despesa: " + err.message);
    }
  });

  const removeExpenseMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Despesa excluída!");
    },
    onError: (err: any) => {
      err.handled = true;
      toast.error("Erro ao excluir despesa: " + err.message);
    }
  });

  const addWithdrawalMutation = useMutation({
    mutationFn: saveProfitWithdrawal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      toast.success("Retirada registrada!");
    },
    onError: (err: any) => {
      err.handled = true;
      toast.error("Erro ao registrar retirada: " + err.message);
    }
  });

  const removeWithdrawalMutation = useMutation({
    mutationFn: deleteProfitWithdrawal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      toast.success("Retirada excluída!");
    },
    onError: (err: any) => {
      err.handled = true;
      toast.error("Erro ao excluir retirada: " + err.message);
    }
  });

  const updateSalesTargetMutation = useMutation({
    mutationFn: (target: { month: number; year: number; target_amount: number }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return upsertSalesTarget(user.id, target);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-targets"] });
      toast.success("Meta atualizada!");
    },
    onError: (err: any) => {
      err.handled = true;
      toast.error("Erro ao atualizar meta: " + err.message);
    }
  });

  const markFollowUpMutation = useMutation({
    mutationFn: markFollowUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Follow-up registrado!");
    },
    onError: (err: any) => {
      err.handled = true;
      toast.error("Erro ao registrar follow-up: " + err.message);
    }
  });


  const removeClientMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-insights"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Cliente excluído!");
    },
    onError: (err: any) => {
      err.handled = true;
      toast.error("Erro ao excluir cliente: " + err.message);
    }
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ quoteId, stageId }: { quoteId: string; stageId: string }) => 
      updateQuoteStage(quoteId, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (err: any) => {
      err.handled = true;
      toast.error("Erro ao mover orçamento: " + err.message);
    }
  });

  return {
    products,
    quotes,
    clients,
    expenses,
    withdrawals,
    settings,
    salesTargets,
    clientInsights,
    activityLogs,
    pipelineStages,
    cashFlow,
    financialCategories,
    inventory,
    getInteractions,

    mutations: {
      updateStatus: updateStatusMutation,
      updatePayment: useMutation({
        mutationFn: ({ quoteId, paymentStatus, paymentDate }: { quoteId: string; paymentStatus: string; paymentDate: string | null }) => 
          updateQuotePayment(quoteId, paymentStatus, paymentDate),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["quotes"] });
          toast.success("Pagamento atualizado!");
        },
        onError: (err: any) => {
          err.handled = true;
          toast.error("Erro ao atualizar pagamento: " + err.message);
        }
      }),
      updatePartialPayment: useMutation({
        mutationFn: ({ 
          quoteId, 
          field, 
          value 
        }: { 
          quoteId: string; 
          field: "down_payment_paid_at" | "final_payment_paid_at"; 
          value: string | null 
        }) => updateQuotePartialPayment(quoteId, field, value),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["quotes"] });
          toast.success("Pagamento parcial atualizado!");
        },
        onError: (err: any) => {
          err.handled = true;
          toast.error("Erro ao atualizar pagamento parcial: " + err.message);
        }
      }),
      updateFullPayment: useMutation({
        mutationFn: ({ quoteId, value }: { quoteId: string; value: string | null }) => 
          updateQuoteFullPayment(quoteId, value),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["quotes"] });
          toast.success("Pagamento total atualizado!");
        },
        onError: (err: any) => {
          err.handled = true;
          toast.error("Erro ao atualizar pagamento total: " + err.message);
        }
      }),
      removeQuote: removeQuoteMutation,
      addExpense: addExpenseMutation,
      removeExpense: removeExpenseMutation,
      addWithdrawal: addWithdrawalMutation,
      removeWithdrawal: removeWithdrawalMutation,
      updateSalesTarget: updateSalesTargetMutation,
      markFollowUp: markFollowUpMutation,
      removeClient: removeClientMutation,
      updateStage: updateStageMutation,
      addCashFlow: useMutation({
        mutationFn: saveCashFlowTransaction,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
          queryClient.invalidateQueries({ queryKey: ["dre-metrics"] });
          toast.success("Transação salva!");
        },
        onError: (err: any) => { err.handled = true; toast.error("Erro ao salvar transação: " + err.message); }
      }),
      removeCashFlow: useMutation({
        mutationFn: deleteCashFlowTransaction,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
          queryClient.invalidateQueries({ queryKey: ["dre-metrics"] });
          toast.success("Transação excluída!");
        },
        onError: (err: any) => { err.handled = true; toast.error("Erro ao excluir transação: " + err.message); }
      }),
      addCategory: useMutation({
        mutationFn: saveFinancialCategory,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
          toast.success("Categoria salva!");
        },
        onError: (err: any) => { err.handled = true; toast.error("Erro ao salvar categoria: " + err.message); }
      }),
      removeCategory: useMutation({
        mutationFn: deleteFinancialCategory,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
          toast.success("Categoria excluída!");
        },
        onError: (err: any) => { err.handled = true; toast.error("Erro ao excluir categoria: " + err.message); }
      }),
      addInventoryItem: useMutation({
        mutationFn: upsertInventory,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["inventory"] });
          toast.success("Item de estoque salvo!");
        },
        onError: (err: any) => { err.handled = true; toast.error("Erro ao salvar item: " + err.message); }
      }),
      addInventoryLog: useMutation({
        mutationFn: saveInventoryLog,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["inventory"] });
          toast.success("Movimentação registrada!");
        },
        onError: (err: any) => { err.handled = true; toast.error("Erro ao registrar: " + err.message); }
      }),
      addInteraction: useMutation({
        mutationFn: saveInteraction,
        onSuccess: (_, variables) => {
          queryClient.invalidateQueries({ queryKey: ["interactions", variables.client_id] });
          toast.success("Interação registrada!");
        },
        onError: (err: any) => { err.handled = true; toast.error("Erro ao registrar nota: " + err.message); }
      }),
      removeProduct: useMutation({
        mutationFn: (id: string) => deleteProduct(id),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
          toast.success("Produto excluído!");
        },
        onError: (err: any) => {
          err.handled = true;
          toast.error("Erro ao excluir produto: " + err.message);
        }
      }),
      addProduct: useMutation({
        mutationFn: (product: any) => {
          if (!user?.id) throw new Error("User not authenticated");
          return createProduct(user.id, product);
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
          toast.success("Produto cadastrado!");
        },
        onError: (err: any) => {
          err.handled = true;
          toast.error("Erro ao cadastrar produto: " + err.message);
        }
      }),

      removeInventoryItem: useMutation({
        mutationFn: (id: string) => deleteInventoryItem(id),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["inventory"] });
          toast.success("Item de estoque excluído!");
        },
        onError: (err: any) => {
          err.handled = true;
          toast.error("Erro ao excluir item: " + err.message);
        }
      }),

    }
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
    const [, year, month] = period.split("-");
    start.setFullYear(parseInt(year), parseInt(month), 1);
    end.setFullYear(parseInt(year), parseInt(month) + 1, 0);
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

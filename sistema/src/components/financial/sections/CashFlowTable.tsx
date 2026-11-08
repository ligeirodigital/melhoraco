
import React, { memo } from "react";
import { Transaction } from "@/types/finance";
import { ArrowUpRight, ArrowDownRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CashFlowTableProps {
  transactions: Transaction[];
  formatCurrency: (val: number) => string;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string, name: string, isAutomatic: boolean) => void;
}

export const CashFlowTable = memo(({ transactions, formatCurrency, onEdit, onDelete }: CashFlowTableProps) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground font-bold">
        Nenhum lançamento encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((t) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: transactions.indexOf(t) * 0.05 }}
          key={t.id}
          className="group p-4 sm:p-6 bg-white/50 backdrop-blur-xl border border-white/50 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:border-primary/20 hover:shadow-lg transition-all min-w-0"
        >
          <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
            <div
              className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-sm border shrink-0",
                t.type === "income"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-rose-50 text-rose-600 border-rose-100"
              )}
            >
              {t.type === "income" ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownRight className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 leading-tight break-words">{t.description}</p>
              <div className="flex items-center flex-wrap gap-2 mt-1.5">
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  {t.category}
                </span>
                <span className="text-[10px] font-medium text-slate-400">• {new Date(t.transaction_date).toLocaleDateString("pt-BR")}</span>
                {t.installment_number && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                    t.status === "pago"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-amber-50 text-amber-700 border-amber-100",
                  )}>
                    Parcela {t.installment_number}/{t.total_installments} · {t.status === "pago" ? "Recebida" : "A receber"}
                  </span>
                )}
                {(t.category?.toLowerCase().includes('fabricação') || t.category?.toLowerCase().includes('produção') || t.description?.toLowerCase().includes('fabricação') || t.description?.toLowerCase().includes('produção')) && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[9px] font-black uppercase tracking-wider text-blue-600 border border-blue-100 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-blue-600" />
                    CMV
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 w-full sm:w-auto pl-13 sm:pl-0">
            <p
              className={cn(
                "font-black text-lg sm:text-xl tabular-nums whitespace-nowrap",
                t.type === "income" ? "text-emerald-700" : "text-rose-700"
              )}
            >
              {t.type === "expense" ? "-" : "+"} {formatCurrency(t.amount)}
            </p>
            <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                disabled={t.source !== 'cashflow'}
                onClick={() => onEdit(t)}
                className="h-11 w-11 sm:h-9 sm:w-9 rounded-xl hover:bg-slate-100"
              >
                <Pencil className="w-4 h-4 text-slate-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={t.source !== 'cashflow'}
                onClick={() => onDelete(t.id, t.description, t.source !== 'cashflow')}
                className="h-11 w-11 sm:h-9 sm:w-9 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

      ))}
    </div>
  );
});

CashFlowTable.displayName = "CashFlowTable";

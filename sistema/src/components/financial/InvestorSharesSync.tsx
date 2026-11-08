import { useEffect, useRef } from "react";
import { useFinance } from "@/hooks/useFinance";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useProjectData } from "@/hooks/useProjectData";
import { syncInvestorSnapshots, type SnapshotRow } from "@/lib/investorPanel";

/**
 * Grava no banco a participação mensal de cada investidor, com o MESMO cálculo do módulo de investidores
 * (DRE mês a mês). É assim que o painel "Minha comissão" mostra o mesmo número que o administrador vê.
 * Roda só para administradores e só depois que todos os dados financeiros carregaram.
 */
export function InvestorSharesSync() {
  const { investors, investorProfitSharesByMonth } = useFinance(undefined, undefined, { withInvestorShares: true });
  const { quotes, settings } = useProjectData();
  const { cashFlow, financialCategories, expenses, investorTransactions, investors: investorsQuery } = useFinanceData();
  const lastSent = useRef<string>("");

  const ready = [quotes, settings, cashFlow, financialCategories, expenses, investorTransactions, investorsQuery].every((q) => q.isSuccess);

  useEffect(() => {
    if (!ready || !investors?.length) return;
    const rows: SnapshotRow[] = [];
    for (const inv of investors) {
      for (const m of investorProfitSharesByMonth?.[inv.id] ?? []) {
        rows.push({ investor_id: inv.id, month: m.month, net_profit: m.netProfit, share_percentage: inv.share_percentage, amount: m.amount });
      }
    }
    // Sem nenhum mês calculado, não apaga o que já está salvo (evita zerar o painel por um carregamento incompleto).
    if (rows.length === 0) return;
    const key = JSON.stringify(rows);
    if (key === lastSent.current) return;
    lastSent.current = key;
    syncInvestorSnapshots(rows).catch((e) => {
      lastSent.current = "";
      console.error("[InvestorSharesSync]", e);
    });
  }, [ready, investors, investorProfitSharesByMonth]);

  return null;
}

export default InvestorSharesSync;

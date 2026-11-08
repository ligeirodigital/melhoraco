
import React, { memo } from "react";
import { DREMetrics } from "@/types/finance";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Info, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DRETableProps {
  dreData: DREMetrics;
  prevMonthDre: DREMetrics | null;
  formatCurrency: (val: number) => string;
  investors?: any[];
}

export const DRETable = memo(({ dreData, prevMonthDre, formatCurrency, investors = [] }: DRETableProps) => {
  const calculateDelta = (current: number, prev: number) => {
    if (!prev) return 0;
    return ((current - prev) / prev) * 100;
  };

  const DeltaBadge = ({ current, prev, inverse = false }: { current: number; prev: number; inverse?: boolean }) => {
    const delta = calculateDelta(current, prev);
    if (!prev) return <span className="text-[10px] text-slate-300 font-bold">-</span>;
    
    const isPositive = delta > 0;
    const isGood = inverse ? !isPositive : isPositive;
    
    return (
      <span className={cn(
        "flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full",
        delta === 0 ? "bg-slate-100 text-slate-400" :
        isGood ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
      )}>
        {delta === 0 ? <Minus className="w-2.5 h-2.5" /> : isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
        {Math.abs(delta).toFixed(1)}%
      </span>
    );
  };

  const DreRow = ({ 
    label, 
    value, 
    prevValue, 
    isSubtotal = false, 
    isTotal = false, 
    info,
    inverseDelta = false,
    prefix = ""
  }: { 
    label: string; 
    value: number; 
    prevValue: number; 
    isSubtotal?: boolean; 
    isTotal?: boolean;
    info?: string;
    inverseDelta?: boolean;
    prefix?: string;
  }) => (
    <div className={cn(
      "group flex items-center justify-between gap-3 py-3 sm:py-4 px-3 sm:px-6 transition-all duration-300 min-w-0",
      isSubtotal ? "bg-slate-50/50 rounded-2xl font-bold border border-slate-100" : 
      isTotal ? "bg-slate-900 text-white rounded-2xl sm:rounded-3xl font-black shadow-xl mt-4 sm:scale-[1.02]" : 
      "hover:bg-slate-50 rounded-xl"
    )}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <span className={cn(
          "text-xs sm:text-sm tracking-tight",
          isTotal ? "text-white" : "text-slate-600 font-bold",
          isSubtotal && "text-slate-900"
        )}>
          {label}
        </span>
        {info && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="shrink-0">
                <Info className="w-3.5 h-3.5 text-slate-300 hover:text-primary transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-none rounded-xl p-3 text-xs max-w-xs leading-relaxed">
                {info}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        {prevMonthDre && (
          <div className="hidden md:flex flex-col items-end gap-0.5">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              isTotal ? "text-white/40" : "text-slate-300"
            )}>Anterior</span>
            <span className={cn(
              "text-xs font-medium tabular-nums",
              isTotal ? "text-white/60" : "text-slate-400"
            )}>{formatCurrency(prevValue)}</span>
          </div>
        )}
        
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-2 sm:gap-3">
            {prevMonthDre && !isTotal && <DeltaBadge current={value} prev={prevValue} inverse={inverseDelta} />}
            <span className={cn(
              "text-sm sm:text-base tabular-nums tracking-tighter whitespace-nowrap",
              isTotal
                ? cn("text-base sm:text-xl", value < 0 ? "text-rose-400" : "text-white")
                : cn("font-black", (isSubtotal && value < 0) ? "text-rose-600" : "text-slate-900")
            )}>
              {value < 0 ? "- " : prefix}{formatCurrency(Math.abs(value))}
            </span>
          </div>
        </div>
      </div>
    </div>

  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl sm:rounded-[3rem] border border-slate-200/60 shadow-xl p-4 sm:p-8 md:p-12 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-10">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">Demonstrativo de Resultado</h3>
              <p className="text-xs sm:text-sm font-medium text-slate-400">Visão analítica de performance financeira</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 self-start sm:self-auto">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dados Consolidados</span>
          </div>
        </div>


        <div className="space-y-2">
          <DreRow 
            label="(+) Receita Bruta de Vendas" 
            value={dreData.quoteRevenue} 
            prevValue={prevMonthDre?.quoteRevenue || 0}
            info="Total faturado com orçamentos e vendas no período."
          />
          <DreRow 
            label="(-) Deduções e Impostos" 
            value={dreData.taxes} 
            prevValue={prevMonthDre?.taxes || 0}
            inverseDelta={true}
            prefix="- "
            info="Impostos incidentes sobre a receita bruta (conforme alíquota configurada)."
          />
          <DreRow 
            label="(=) Receita Líquida" 
            value={dreData.netRevenue} 
            prevValue={prevMonthDre?.netRevenue || 0}
            isSubtotal={true}
            info="Receita que sobra após o pagamento de impostos."
          />
          <DreRow 
            label="(-) Custos (CMV / CPV)" 
            value={dreData.cogs} 
            prevValue={prevMonthDre?.cogs || 0}
            inverseDelta={true}
            prefix="- "
            info="Custos diretos de fabricação ou compra dos produtos vendidos."
          />
          <DreRow 
            label="(=) Lucro Bruto" 
            value={dreData.grossProfit} 
            prevValue={prevMonthDre?.grossProfit || 0}
            isSubtotal={true}
            info="Resultado da receita líquida menos os custos de fabricação."
          />
          
          <div className="py-4 px-6">
            <div className="h-px bg-slate-100 w-full" />
          </div>

          <DreRow 
            label="(-) Despesas Operacionais (Fixas)" 
            value={dreData.totalFixedExpenses} 
            prevValue={prevMonthDre?.totalFixedExpenses || 0}
            inverseDelta={true}
            prefix="- "
            info="Gastos necessários para manter a empresa funcionando (aluguel, salários, marketing, logística)."
          />
          
          <div className="pl-4 sm:pl-12 space-y-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <div className="flex justify-between py-2 text-xs font-bold text-slate-500">
              <span>Marketing e Vendas</span>
              <span>- {formatCurrency(dreData.marketingExpenses)}</span>
            </div>
            <div className="flex justify-between py-2 text-xs font-bold text-slate-500">
              <span>Logística e Entrega</span>
              <span>- {formatCurrency(dreData.logisticsExpenses)}</span>
            </div>
            <div className="flex justify-between py-2 text-xs font-bold text-slate-500">
              <span>Taxas de Cartão / Financeiras</span>
              <span>- {formatCurrency(dreData.cardFeesExpenses)}</span>
            </div>
            <div className="flex justify-between py-2 text-xs font-bold text-slate-500">
              <span>Outros Operacionais</span>
              <span>- {formatCurrency(dreData.otherOperatingExpenses + dreData.baseFixedExpenses)}</span>
            </div>
          </div>

          <DreRow 
            label="(=) Lucro Líquido Operacional (EBITDA)" 
            value={dreData.netProfit} 
            prevValue={prevMonthDre?.netProfit || 0}
            isSubtotal={true}
            info="O lucro gerado pela operação do negócio antes da distribuição."
          />

          {dreData.netProfit > 0 && investors.length > 0 && (
            <div className="pt-6 space-y-2 animate-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-2 mb-4 px-6">
                <AlertCircle className="w-4 h-4 text-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distribuição Automática de Lucros</h4>
              </div>
              {investors.map(investor => (
                <DreRow 
                  key={investor.id}
                  label={`Distribuição ${investor.name} (${investor.share_percentage}%)`} 
                  value={dreData.investorDistributions[investor.id] || 0} 
                  prevValue={prevMonthDre?.investorDistributions?.[investor.id] || 0}
                  inverseDelta={true}
                  prefix="- "
                />
              ))}
            </div>
          )}

          <DreRow 
            label="(=) RESULTADO LÍQUIDO FINAL" 
            value={dreData.finalNetProfit} 
            prevValue={prevMonthDre?.finalNetProfit || 0}
            isTotal={true}
            info="Valor que permanece no caixa da empresa após todas as despesas e retiradas."
          />
        </div>
      </div>
    </div>
  );
});

import { FileSpreadsheet } from "lucide-react";
DRETable.displayName = "DRETable";


import React, { memo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { DREMetrics } from "@/types/finance";

interface DREChartsProps {
  dreData: DREMetrics;
  prevMonthDre: DREMetrics | null;
  formatCurrency: (val: number) => string;
}

export const DRECharts = memo(({ dreData, prevMonthDre, formatCurrency }: DREChartsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 min-w-0">
      <div className="bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border shadow-premium space-y-4 min-w-0">
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground/70 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Receita vs Despesas
        </h3>
        <div className="h-[260px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'Atual', receita: dreData.quoteRevenue, despesa: dreData.totalFixedExpenses + dreData.cogs + dreData.taxes },
              { name: 'Anterior', receita: prevMonthDre?.quoteRevenue || 0, despesa: (prevMonthDre?.totalFixedExpenses || 0) + (prevMonthDre?.cogs || 0) + (prevMonthDre?.taxes || 0) }
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Bar dataKey="receita" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Receita" />
              <Bar dataKey="despesa" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border shadow-premium space-y-4 min-w-0">
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground/70 flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-indigo-500" /> Distribuição de Custos
        </h3>
        <div className="h-[260px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'CPV', value: dreData.cogs },
                    { name: 'Deduções', value: dreData.taxes },
                    { name: 'Operacional', value: dreData.totalFixedExpenses },
                    { name: 'Distr. Lucro', value: dreData.totalDistribution || 0 }
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {['#0ea5e9', '#6366f1', '#f43f5e', '#10b981'].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

DRECharts.displayName = "DRECharts";

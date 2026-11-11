import React, { useMemo, useState } from "react";
import { useProjectData } from "@/hooks/useProjectData";
import { useFinance } from "@/hooks/useFinance";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, Users, FileText, CheckCircle, ArrowRight, 
  BarChart3, CreditCard, Wallet, Package, LineChart as LineChartIcon, 
  AlertTriangle, ShoppingCart, ArrowUpRight, ChevronRight,
  Calendar as CalendarIcon, Filter, EyeOff, Receipt, UserPlus, Percent, Megaphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { formatCurrency, getQuoteTotal } from "@/lib/formatQuote";
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth, isSameYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SalesTargetWidget } from "@/components/SalesTargetWidget";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { quotes, clients, inventory, products, pipelineStages } = useProjectData();
  
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  // `stats` é global (independente do período), então uma única instância de
  // useFinance atende ambos — evita recalcular todo o dataset duas vezes.
  const { dreData: filteredDre, stats: globalStats } = useFinance(dateRange.start, dateRange.end);

  const approvedQuotes = useMemo(() => 
    quotes.data?.filter(q => q.status === "aprovado") || [], 
    [quotes.data]
  );



  const currentMonthSales = useMemo(() => {
    return approvedQuotes
      .filter(q => {
        const date = new Date(q.created_at);
        return date >= dateRange.start && date <= dateRange.end;
      })
      .reduce((acc, q) => {
        return acc + getQuoteTotal(q as any);
      }, 0);
  }, [approvedQuotes, dateRange]);

  const chartData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const monthlyTotal = approvedQuotes
        .filter(q => {
          const qDate = new Date(q.created_at);
          return qDate.getMonth() === m && qDate.getFullYear() === y;
        })
        .reduce((acc, q) => {
          return acc + getQuoteTotal(q as any);
        }, 0);
        
      last6Months.push({
        name: months[m],
        total: monthlyTotal
      });
    }
    return last6Months;
  }, [approvedQuotes]);

  const inventoryValue = useMemo(() => {
    const insumos = (inventory.data || []).reduce((acc, item) => {
      return acc + (Number(item.quantity) * Number(item.unit_cost || 0));
    }, 0);
    const produtos = (products.data || []).reduce((acc: number, p: any) => {
      if (p.made_to_order) return acc;
      const unitCost = Number(p.cost || 0);
      const parent = Number(p.stock_quantity || 0) * unitCost;
      const variants = (p.variants || []).reduce(
        (a: number, v: any) => a + Number(v.stock_quantity || 0) * unitCost,
        0
      );
      return acc + parent + variants;
    }, 0);
    return insumos + produtos;
  }, [inventory.data, products.data]);

  const lowStockItems = useMemo(() => {
    const insumosLow = (inventory.data || []).filter(item => item.quantity <= item.min_quantity);
    const productsLow = (products.data || []).filter((p: any) => {
      if (p.made_to_order) return false;
      const parentLow = Number(p.stock_quantity || 0) <= Number(p.min_stock_level || 0);
      const variantLow = (p.variants || []).some(
        (v: any) => Number(v.stock_quantity || 0) <= Number(v.min_stock_level || 0)
      );
      return parentLow || variantLow;
    });
    return [...insumosLow, ...productsLow];
  }, [inventory.data, products.data]);

  const productStats = useMemo(() => {
    const stats: Record<string, { name: string; sold: number; revenue: number; is_numerical?: boolean }> = {};
    
    approvedQuotes
      .filter(q => {
        const date = new Date(q.created_at);
        return date >= dateRange.start && date <= dateRange.end;
      })
      .forEach(quote => {
        quote.items.forEach(item => {
          const isNumerical = /^\d+$/.test(item.product_name.trim());
          const productId = item.product_id || item.product_name;
          
          if (!stats[productId]) {
            stats[productId] = { 
              name: item.product_name, 
              sold: 0, 
              revenue: 0,
              is_numerical: isNumerical
            };
          }
          stats[productId].sold += item.quantity;
          stats[productId].revenue += item.unit_price * item.quantity;
        });
      });

    return Object.values(stats).sort((a, b) => b.sold - a.sold);
  }, [approvedQuotes, dateRange]);

  const numericalProductStats = useMemo(() => {
    return productStats
      .filter(p => p.is_numerical)
      .sort((a, b) => {
        const numA = parseInt(a.name);
        const numB = parseInt(b.name);
        return numA - numB;
      });
  }, [productStats]);

  const totalSoldNumbers = useMemo(() => {
    return productStats.reduce((acc, p) => acc + p.sold, 0);
  }, [productStats]);

  const hiddenProductsCount = useMemo(() => {
    // Only products that haven't been sold in the selected period AND are potentially least sold
    return productStats.filter(p => p.sold === 0).length;
  }, [productStats]);

  if (quotes.isLoading || clients.isLoading || inventory.isLoading) {
    return <DashboardSkeleton />;
  }

  const statsCards = [
    {
      title: "Números Vendidos",
      value: totalSoldNumbers,
      icon: ShoppingCart,
      color: "text-blue-500",
      bg: "bg-blue-50/50"
    },
    {
      title: "Conversão no Período",
      value: quotes.data?.filter(q => {
        const date = new Date(q.created_at);
        return date >= dateRange.start && date <= dateRange.end;
      }).length 
        ? `${Math.round((approvedQuotes.filter(q => {
            const date = new Date(q.created_at);
            return date >= dateRange.start && date <= dateRange.end;
          }).length / quotes.data.filter(q => {
            const date = new Date(q.created_at);
            return date >= dateRange.start && date <= dateRange.end;
          }).length) * 100)}%`
        : "0%",
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-50/50"
    },
    {
      title: "Estoque Alerta",
      value: lowStockItems.length,
      icon: AlertTriangle,
      color: lowStockItems.length > 0 ? "text-rose-500" : "text-slate-300",
      bg: lowStockItems.length > 0 ? "bg-rose-50/50" : "bg-slate-50/50"
    },
    {
      title: "Base de Clientes",
      value: clients.data?.length || 0,
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-50/50"
    },
    {
      title: "Logística / Venda",
      value: totalSoldNumbers > 0
        ? formatCurrency((filteredDre.logisticsExpenses || 0) / totalSoldNumbers)
        : formatCurrency(0),
      icon: Package,
      color: "text-amber-500",
      bg: "bg-amber-50/50"
    },
    {
      title: "Marketing / Venda",
      value: totalSoldNumbers > 0
        ? formatCurrency((filteredDre.marketingExpenses || 0) / totalSoldNumbers)
        : formatCurrency(0),
      icon: BarChart3,
      color: "text-indigo-500",
      bg: "bg-indigo-50/50"
    },
    (() => {
      const approvedInPeriod = approvedQuotes.filter(q => {
        const d = new Date(q.created_at);
        return d >= dateRange.start && d <= dateRange.end;
      }).length;
      const ticketMedio = approvedInPeriod > 0 ? currentMonthSales / approvedInPeriod : 0;
      return {
        title: "Ticket Médio",
        value: formatCurrency(ticketMedio),
        icon: Receipt,
        color: "text-cyan-500",
        bg: "bg-cyan-50/50"
      };
    })(),
    (() => {
      const approvedInPeriod = approvedQuotes.filter(q => {
        const d = new Date(q.created_at);
        return d >= dateRange.start && d <= dateRange.end;
      }).length;
      const cac = approvedInPeriod > 0 ? (filteredDre.marketingExpenses || 0) / approvedInPeriod : 0;
      return {
        title: "CAC",
        value: formatCurrency(cac),
        icon: UserPlus,
        color: "text-fuchsia-500",
        bg: "bg-fuchsia-50/50"
      };
    })(),
    (() => {
      const mkt = filteredDre.marketingExpenses || 0;
      const roas = mkt > 0 ? currentMonthSales / mkt : 0;
      return {
        title: "ROAS",
        value: mkt > 0 ? `${roas.toFixed(2)}x` : "—",
        icon: Megaphone,
        color: "text-orange-500",
        bg: "bg-orange-50/50"
      };
    })(),
    (() => {
      const mkt = filteredDre.marketingExpenses || 0;
      const netProfit = filteredDre.netProfit || 0;
      const roi = mkt > 0 ? (netProfit / mkt) * 100 : 0;
      return {
        title: "ROI",
        value: mkt > 0 ? `${roi.toFixed(1)}%` : "—",
        icon: Percent,
        color: roi >= 0 ? "text-emerald-500" : "text-rose-500",
        bg: roi >= 0 ? "bg-emerald-50/50" : "bg-rose-50/50"
      };
    })(),
  ];


  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-[1400px] mx-auto space-y-8 md:space-y-12 pb-32 overflow-x-hidden"
    >
      <motion.header variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8">
        <div className="min-w-0">
          <span className="label-caps !mb-1 opacity-60">Visão Geral do Negócio</span>
          <h1 className="font-black tracking-tight text-slate-900 leading-none" style={{ fontSize: 'clamp(2rem, 6vw, 3.75rem)' }}>Dashboard</h1>
          <p className="text-slate-400 font-bold mt-3 text-base sm:text-lg">Bem-vindo ao centro de operações Melhoraço.</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-start md:self-center bg-white premium-border p-2 rounded-[1.5rem] shadow-sm w-full md:w-auto max-w-full overflow-hidden">
          <Filter className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
          <Select 
            defaultValue="current" 
            onValueChange={(value) => {
              const now = new Date();
              if (value === "current") {
                setDateRange({ start: startOfMonth(now), end: endOfMonth(now) });
              } else if (value === "last") {
                const last = subMonths(now, 1);
                setDateRange({ start: startOfMonth(last), end: endOfMonth(last) });
              } else if (value === "last3") {
                setDateRange({ start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) });
              } else if (value === "year") {
                setDateRange({ start: new Date(now.getFullYear(), 0, 1), end: endOfMonth(now) });
              } else if (value === "all") {
                setDateRange({ start: new Date(2000, 0, 1), end: new Date(2100, 11, 31) });
              }
            }}
          >
            <SelectTrigger className="min-w-0 flex-1 md:w-[180px] md:flex-none border-none bg-transparent font-bold focus:ring-0">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100">
              <SelectItem value="current" className="font-bold">Mês Atual</SelectItem>
              <SelectItem value="last" className="font-bold">Mês Anterior</SelectItem>
              <SelectItem value="last3" className="font-bold">Últimos 3 Meses</SelectItem>
              <SelectItem value="year" className="font-bold">Este Ano</SelectItem>
              <SelectItem value="all" className="font-bold">Tudo</SelectItem>
            </SelectContent>
          </Select>
          <div className="h-4 w-px bg-slate-100 mx-1 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 px-3 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
            <CalendarIcon className="w-3 h-3" />
            {dateRange.start.getFullYear() < 2010 ? "Tudo" : `${format(dateRange.start, "MMM yy", { locale: ptBR })} - ${format(dateRange.end, "MMM yy", { locale: ptBR })}`}
          </div>
        </div>
      </motion.header>


      {/* Sales Target — full width for better visibility */}
      <motion.div variants={itemVariants}>
        <SalesTargetWidget className="w-full" />
      </motion.div>
      
      {/* Principal Metrics Bento Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-slate-900 p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white shadow-2xl relative overflow-hidden group cursor-pointer min-w-0" 
          onClick={() => navigate("/dre")}
        >
          <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
            <Wallet className="w-56 h-56" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:bg-primary transition-colors">
                <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <ArrowUpRight className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Liquidez Imediata</p>
              <h3 className="font-black tracking-tighter break-words" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.25rem)' }}>{formatCurrency(globalStats.balance)}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white premium-border p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] text-slate-900 shadow-sm relative overflow-hidden group cursor-pointer min-w-0" 
          onClick={() => navigate("/inventory")}
        >
          <div className="absolute -bottom-10 -right-10 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000">
            <Package className="w-56 h-56 text-slate-900" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-primary/10 transition-colors">
                <Package className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400 group-hover:text-primary" />
              </div>
              <ArrowUpRight className="w-6 h-6 text-slate-200 group-hover:text-primary transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Ativos em Estoque</p>
              <h3 className="font-black tracking-tighter break-words" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.25rem)' }}>{formatCurrency(inventoryValue)}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-primary p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white shadow-2xl shadow-primary/20 relative overflow-hidden group cursor-pointer min-w-0" 
          onClick={() => navigate("/dre")}
        >
          <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
            <LineChartIcon className="w-56 h-56" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:bg-white/30 transition-colors">
                <LineChartIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <ArrowUpRight className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Resultado Operacional</p>
              <h3 className="font-black tracking-tighter break-words" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.25rem)' }}>{formatCurrency(filteredDre.netProfit)}</h3>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Secondary Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {statsCards.map((stat, i) => (
          <div key={i} className="glass-card p-5 sm:p-6 md:p-8 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] hover:shadow-premium-hover transition-all duration-500 group min-w-0">
            <div className={cn("w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-sm", stat.bg)}>
              <stat.icon className={cn("w-5 h-5 sm:w-7 sm:h-7", stat.color)} />
            </div>
            <div className="mt-4 sm:mt-6 min-w-0">
              <p className="label-caps !mb-1 opacity-50 truncate">{stat.title}</p>
              <div className="font-black text-slate-900 tracking-tighter break-words" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.875rem)' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Charts & Details Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        <div className="lg:col-span-12 space-y-6 min-w-0">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Tendência de Vendas
            </h2>
          </div>
          <div className="glass-card p-4 sm:p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] h-[320px] sm:h-[400px] md:h-[450px] overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={0}>
                <defs>
                  <linearGradient id="chartBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }}
                   dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }}
                  tickFormatter={(val) => `R$ ${val/1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9', opacity: 0.5 }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    backdropFilter: 'blur(10px)',
                    borderRadius: '24px', 
                    border: '1px solid rgba(255,255,255,0.5)', 
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)',
                    padding: '16px'
                  }}
                  itemStyle={{ color: '#0F172A', fontWeight: 900, fontSize: '14px' }}
                  labelStyle={{ color: '#94A3B8', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}
                  formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === chartData.length - 1 ? 'url(#chartBarGradient)' : '#E2E8F0'} 
                      opacity={index === chartData.length - 1 ? 1 : 0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </motion.div>

    </motion.div>
  );
};

const DashboardSkeleton = () => (
  <div className="p-4 md:p-10 space-y-10 animate-pulse">
    <div className="space-y-4">
      <Skeleton className="h-14 w-64 rounded-2xl" />
      <Skeleton className="h-6 w-96 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-[3rem]" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2">
        <Skeleton className="h-[450px] rounded-[3rem]" />
      </div>
      <Skeleton className="h-[450px] rounded-[3rem]" />
    </div>
  </div>
);

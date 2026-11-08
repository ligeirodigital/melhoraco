
import React, { useMemo, useState } from "react";
import { Transaction } from "@/types/finance";
import { FullQuote } from "@/lib/cloudStore";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  Calculator, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  FileText,
  BadgeDollarSign
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CogsAuditProps {
  quotes: FullQuote[];
  formatCurrency: (val: number) => string;
}

export const CogsAudit = ({ quotes, formatCurrency }: CogsAuditProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const next = new Set(expandedQuotes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedQuotes(next);
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => 
      q.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      q.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [quotes, searchTerm]);

  const auditData = useMemo(() => {
    return filteredQuotes.map(q => {
      const itemsCogs = q.items.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        fixed_cost: Number(item.fixed_cost) || 0,
        product_cost: Number(item.product?.cost) || 0,
        unit_cost: Number(item.fixed_cost) || Number(item.product?.cost) || 0,
        total_cost: (Number(item.fixed_cost) || Number(item.product?.cost) || 0) * item.quantity,
        is_fixed: !!item.fixed_cost
      }));

      const totalCogs = itemsCogs.reduce((acc, item) => acc + item.total_cost, 0);
      const totalRevenue = q.items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0) + (q.delivery_fee || 0) + (q.installation_fee || 0);
      
      return {
        ...q,
        itemsCogs,
        totalCogs,
        totalRevenue,
        margin: totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0
      };
    });
  }, [filteredQuotes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por cliente ou ID do orçamento..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-muted/50 border-none rounded-xl"
          />
        </div>
        <Badge variant="outline" className="h-11 px-4 rounded-xl border-dashed">
          <Calculator className="w-4 h-4 mr-2 text-primary" />
          Total de Itens Auditados: {auditData.length}
        </Badge>
      </div>

      <div className="bg-card rounded-3xl border border-border shadow-premium overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest py-5">Orçamento / Cliente</TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest text-right">Receita Total</TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest text-right">CMV / CPV Total</TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest text-right">Margem Bruta</TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                  Nenhum orçamento encontrado para auditoria.
                </TableCell>
              </TableRow>
            ) : (
              auditData.map((q) => (
                <React.Fragment key={q.id}>
                  <TableRow className={cn(
                    "group transition-colors border-border/50",
                    expandedQuotes.has(q.id) ? "bg-muted/10" : "hover:bg-muted/5"
                  )}>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => toggleExpand(q.id)}
                        className="h-8 w-8 rounded-lg"
                      >
                        {expandedQuotes.has(q.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-bold text-sm">#{q.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground font-medium">{q.client?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      {formatCurrency(q.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm text-rose-500">
                      {formatCurrency(q.totalCogs)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "font-black text-sm",
                          q.margin > 40 ? "text-emerald-500" : q.margin > 20 ? "text-amber-500" : "text-rose-500"
                        )}>
                          {q.margin.toFixed(1)}%
                        </span>
                        <div className="w-16 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              q.margin > 40 ? "bg-emerald-500" : q.margin > 20 ? "bg-amber-500" : "bg-rose-500"
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, q.margin))}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "rounded-lg text-[9px] uppercase font-black tracking-wider",
                        q.status === 'aprovado' ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : 
                        q.status === 'recusado' ? "bg-rose-500/10 text-rose-600 border-rose-200" : 
                        "bg-amber-500/10 text-amber-600 border-amber-200"
                      )}>
                        {q.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  
                  {expandedQuotes.has(q.id) && (
                    <TableRow className="bg-muted/5 border-none">
                      <TableCell colSpan={6} className="p-0 border-none">
                        <div className="px-14 py-6 border-b border-border/50 animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-2 mb-4">
                            <BadgeDollarSign className="w-4 h-4 text-primary" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-foreground/70">Composição de Custos</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {q.itemsCogs.map((item, idx) => (
                              <div key={idx} className="bg-background p-4 rounded-2xl border border-border shadow-sm space-y-3">
                                <div className="flex justify-between items-start gap-4">
                                  <h5 className="text-sm font-bold leading-tight">{item.name}</h5>
                                  <Badge variant="outline" className="text-[10px] bg-muted/30">x{item.quantity}</Badge>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground font-medium">Custo Unitário Base</span>
                                    <span className="font-bold">
                                      {item.is_fixed ? (
                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] py-0">Custo Fixo</Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-100 text-[9px] py-0">Preço Catálogo</Badge>
                                      )}
                                      {" "}{formatCurrency(item.unit_cost)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between text-xs pt-2 border-top border-dashed border-border">
                                    <span className="text-muted-foreground font-medium">Subtotal Custo</span>
                                    <span className="font-black text-rose-500">{formatCurrency(item.total_cost)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {(q.delivery_fee > 0 || q.installation_fee > 0) && (
                              <div className="bg-muted/20 p-4 rounded-2xl border border-dashed border-border space-y-3">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Serviços Adicionais (CMV Zero)</h5>
                                <div className="space-y-2">
                                  {q.delivery_fee > 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground font-medium">Logística</span>
                                      <span className="font-bold">{formatCurrency(q.delivery_fee)}</span>
                                    </div>
                                  )}
                                  {q.installation_fee > 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground font-medium">Instalação</span>
                                      <span className="font-bold">{formatCurrency(q.installation_fee)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-widest text-primary/70">Consolidado do Orçamento</p>
                                <p className="text-sm font-bold text-foreground">Resumo matemático da rentabilidade</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-8">
                              <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Venda</span>
                                <span className="font-bold text-sm">{formatCurrency(q.totalRevenue)}</span>
                              </div>
                              <div className="text-center text-muted-foreground/30">
                                <ArrowRight className="w-4 h-4" />
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 block">Custo (CPV)</span>
                                <span className="font-bold text-sm text-rose-500">-{formatCurrency(q.totalCogs)}</span>
                              </div>
                              <div className="text-center text-muted-foreground/30 font-bold">
                                =
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block">Margem</span>
                                <span className="font-black text-sm text-emerald-500">{formatCurrency(q.totalRevenue - q.totalCogs)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

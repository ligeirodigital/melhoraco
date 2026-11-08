import React from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


interface InventoryGridItemProps {
  item: any;
  activeTab: 'insumos' | 'produtos';
  onAdjust: (item: any, variant?: any) => void;
  onDelete?: (item: any) => void;
}


export const InventoryGridItem = ({ item, activeTab, onAdjust, onDelete }: InventoryGridItemProps) => {
  const quantity = activeTab === 'insumos' ? item.quantity : (item.stock_quantity ?? 0);
  const minQuantity = activeTab === 'insumos' ? item.min_quantity : (item.min_stock_level ?? 0);
  const isLow = !(activeTab === "produtos" && item.made_to_order) && quantity <= minQuantity;
  const unit = activeTab === 'insumos' ? item.unit : 'un';
  const hasVariants = activeTab === 'produtos' && /15\s*cm/i.test(item.name ?? '') && item.variants?.length > 0;

  return (
    <div className="bg-card border border-border/60 rounded-[2rem] p-8 space-y-6 hover:border-primary/40 transition-all group shadow-sm hover:shadow-xl relative overflow-hidden flex flex-col h-full">
      {isLow && (
        <div className="absolute top-0 right-0 px-6 py-2 bg-destructive/10 text-destructive rounded-bl-3xl text-[10px] font-black uppercase tracking-widest animate-pulse border-l border-b border-destructive/20">
          Estoque Baixo
        </div>
      )}
      
      <div className="flex justify-between items-start">
        <div className={cn("p-4 rounded-2xl transition-all group-hover:scale-110", isLow ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>
          <Package className="w-8 h-8" />
        </div>
        
        {onDelete && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
            onClick={() => {
              if (confirm(`Deseja realmente excluir ${item.name}?`)) {
                onDelete(item);
              }
            }}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        )}
      </div>


      <div className="space-y-1">
        <h3 className="text-2xl font-black text-foreground tracking-tight break-words">{item.name}</h3>
        <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.2em]">{unit}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/30 p-5 rounded-2xl border border-border/40 text-center">
          <p className="label-caps mb-1 opacity-70">Disponível</p>
          <p className={cn("text-3xl font-black", isLow ? 'text-destructive' : 'text-foreground')}>{quantity}</p>
        </div>
        <div className="bg-muted/30 p-5 rounded-2xl border border-border/40 text-center">
          <p className="label-caps mb-1 opacity-70">Mínimo</p>
          <p className="text-3xl font-black text-muted-foreground/60">{minQuantity}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <Button 
          variant="secondary" 
          className="w-full h-14 rounded-2xl font-black gap-3 text-sm hover:bg-primary hover:text-white transition-all shadow-sm"
          onClick={() => onAdjust(item)}
        >
          <Plus className="w-5 h-5" /> DAR ENTRADA / SAÍDA
        </Button>

        {hasVariants && (
          <div className="pt-4 border-t border-border/50 mt-2 space-y-4">
            <div className="flex items-center justify-between px-2">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Variações ({item.variants.length})</p>
              <div className="h-px flex-1 bg-border/50 mx-4" />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {item.variants.map((v: any) => {
                const vIsLow = !item.made_to_order && (v.stock_quantity ?? 0) <= (v.min_stock_level ?? 0);
                return (
                  <div key={v.id} className={cn(
                    "group/v p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                    vIsLow ? "bg-destructive/5 border-destructive/20" : "bg-muted/20 border-border/50 hover:bg-muted/40"
                  )}>
                    <div className="space-y-1.5 flex-1">
                      <p className="font-bold text-sm text-foreground leading-tight">{v.name}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-full", vIsLow ? "bg-destructive animate-pulse" : "bg-green-500")} />
                          <p className={cn("text-xs font-black", vIsLow ? "text-destructive" : "text-muted-foreground")}>
                            {v.stock_quantity ?? 0} {unit}
                          </p>
                        </div>
                        {v.sku && (
                          <p className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            {v.sku}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-10 rounded-xl px-6 text-[10px] font-black uppercase hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm shrink-0"
                      onClick={() => onAdjust(item, v)}
                    >
                      AJUSTAR
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

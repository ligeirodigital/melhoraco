import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InventoryHeaderProps {
  activeTab: 'insumos' | 'produtos';
  setActiveTab: (tab: 'insumos' | 'produtos') => void;
  onOpenAddDialog: () => void;
}

export const InventoryHeader = ({ activeTab, setActiveTab, onOpenAddDialog }: InventoryHeaderProps) => {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground text-glow">Estoque</h1>
        <p className="text-muted-foreground font-bold text-sm uppercase tracking-[0.3em] mt-1">Gestão inteligente de ativos</p>
      </div>

      <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('produtos')}
          className={cn(
            "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'produtos' ? "bg-card text-foreground shadow-md ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Produtos
        </button>
        <button
          onClick={() => setActiveTab('insumos')}
          className={cn(
            "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'insumos' ? "bg-card text-foreground shadow-md ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Insumos
        </button>
      </div>
      
      <Button 
        onClick={onOpenAddDialog}
        className="h-16 rounded-2xl font-black px-10 gap-3 bg-primary hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 text-base"
      >
        <Plus className="w-6 h-6" /> {activeTab === 'insumos' ? 'NOVO INSUMO' : 'NOVO PRODUTO'}
      </Button>

    </header>
  );
};

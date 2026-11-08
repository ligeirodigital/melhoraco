import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, MoveRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface InventoryLogDialogProps {
  item: any;
  variant?: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  type?: 'produtos' | 'insumos';
}

export const InventoryLogDialog = ({ item, variant, isOpen, onOpenChange, onSubmit, type = 'produtos' }: InventoryLogDialogProps) => {
  const { user } = useAuth();
  const [logForm, setLogForm] = useState({ quantity: 0, type: 'in' as 'in' | 'out', reason: "" });

  const handleSubmit = () => {
    const logData = {
      [type === 'insumos' ? 'inventory_id' : (variant ? 'variant_id' : 'product_id')]: variant?.id || item.id,
      ...logForm,
      created_by: user?.id
    };
    console.log("Submitting log data:", logData);
    onSubmit(logData);
    setLogForm({ quantity: 0, type: 'in', reason: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <MoveRight className="w-6 h-6 text-primary" />
            Movimentação de Estoque
          </DialogTitle>
          <p className="text-muted-foreground font-bold text-sm">
            {item?.name} {variant ? `(${variant.name})` : ''}
          </p>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex gap-2 p-1.5 bg-muted rounded-2xl">
            <button 
              className={cn(
                "flex-1 h-14 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2", 
                logForm.type === 'in' ? 'bg-green-500 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setLogForm({...logForm, type: 'in'})}
            >
              <Plus className="w-4 h-4" /> ENTRADA
            </button>
            <button 
              className={cn(
                "flex-1 h-14 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2", 
                logForm.type === 'out' ? 'bg-red-500 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setLogForm({...logForm, type: 'out'})}
            >
              <Minus className="w-4 h-4" /> SAÍDA
            </button>
          </div>
          
          <div className="space-y-2">
            <label className="label-caps px-1">Quantidade</label>
            <div className="relative">
              <Input 
                type="number"
                value={logForm.quantity || ""} 
                onChange={e => setLogForm({...logForm, quantity: Number(e.target.value)})}
                className="bg-muted border-none h-16 rounded-2xl text-2xl font-black text-center pr-12"
                placeholder="0"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-muted-foreground uppercase text-xs">
                {type === 'insumos' ? item?.unit : 'UN'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="label-caps px-1">Motivo / Observação</label>
            <Input 
              value={logForm.reason} 
              onChange={e => setLogForm({...logForm, reason: e.target.value})}
              className="bg-muted border-none h-14 rounded-2xl font-medium px-6"
              placeholder="Ex: Compra NF-123 ou Perda em produção"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={!logForm.quantity || logForm.quantity <= 0}
            className="w-full h-16 rounded-2xl font-black mt-2 text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
          >
            CONFIRMAR MOVIMENTAÇÃO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

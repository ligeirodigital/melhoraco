
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Settings2, Info } from "lucide-react";
import { FinancialCategory } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CategoryManagerProps {
  categories: FinancialCategory[];
  onAdd: (category: Partial<FinancialCategory>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const DRE_GROUPS = [
  { value: "none", label: "Nenhum (Apenas Caixa)", description: "Não entra na DRE, apenas no Fluxo de Caixa" },
  { value: "revenue", label: "Receita", description: "Vendas e entradas principais" },
  { value: "deduction", label: "Dedução", description: "Impostos, devoluções e descontos" },
  { value: "tax", label: "Imposto", description: "Impostos sobre vendas e tributos (DAS, ISS, ICMS, etc.)" },
  { value: "cmv", label: "CMV / Produção", description: "Custos diretos de fabricação ou compra de mercadoria" },
  { value: "marketing", label: "Marketing", description: "Anúncios, agências e promoções" },
  { value: "logistics", label: "Logística / Frete", description: "Entregas, fretes e transportes" },
  { value: "fees", label: "Taxas", description: "Taxas de cartão e bancárias" },
  { value: "operating", label: "Custo Operacional", description: "Aluguel, luz, salários e outros custos fixos" },
];

export const CategoryManager = ({ categories, onAdd, onRemove, open, onOpenChange, userId }: CategoryManagerProps) => {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("expense");
  const [newGroup, setNewGroup] = useState("operating");

  const handleAdd = async () => {
    if (!newName.trim()) return toast.error("Digite o nome da categoria");
    const nameLower = newName.toLowerCase();
    const isTaxName = nameLower.includes("imposto");
    if (isTaxName && newGroup !== "tax" && newGroup !== "deduction") {
      return toast.error('Categorias com "imposto" no nome devem usar o grupo DRE "Imposto" ou "Dedução".');
    }
    try {
      await onAdd({
        name: newName,
        type: newType,
        dre_group: newGroup,
        user_id: userId
      });
      setNewName("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateGroupValidated = async (cat: FinancialCategory, group: string) => {
    if (cat.name.toLowerCase().includes("imposto") && group !== "tax" && group !== "deduction") {
      return toast.error('Esta categoria contém "imposto" no nome e deve usar o grupo "Imposto" ou "Dedução".');
    }
    return handleUpdateGroup(cat, group);
  };

  const handleUpdateGroup = async (cat: FinancialCategory, group: string) => {
    try {
      await onAdd({
        ...cat,
        dre_group: group
      });
      toast.success("Classificação atualizada");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-8 border-none shadow-2xl bg-white">
        <DialogHeader className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Settings2 className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900">Regras de Classificação</DialogTitle>
          </div>
          <p className="text-slate-500 font-medium ml-14">
            Defina para onde cada categoria de despesa ou receita deve ir no relatório de DRE.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Form to add new category */}
          <div className="lg:col-span-4 space-y-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Nova Categoria
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Nome</label>
                <Input 
                  placeholder="Ex: Aluguel, Insumos..." 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="rounded-xl border-slate-200 focus:ring-primary h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Tipo</label>
                <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="income">Entrada (Receita)</SelectItem>
                    <SelectItem value="expense">Saída (Despesa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Grupo no DRE</label>
                <Select value={newGroup} onValueChange={setNewGroup}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DRE_GROUPS.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAdd} className="w-full h-12 rounded-xl font-bold mt-4 shadow-lg shadow-primary/20">
                ADICIONAR
              </Button>
            </div>
          </div>

          {/* List of existing categories */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4 px-2">Categorias Atuais</h3>
            
            <div className="space-y-3 pr-2">
              {categories.map((cat) => (
                <div key={cat.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all duration-300">
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-widest mb-1",
                      cat.type === 'income' ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {cat.type === 'income' ? "Receita" : "Despesa"}
                    </span>
                    <span className="font-bold text-slate-800">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Select 
                        value={cat.dre_group || (cat.type === 'income' ? 'revenue' : 'operating')} 
                        onValueChange={(v) => handleUpdateGroupValidated(cat, v)}
                      >
                        <SelectTrigger className="w-[180px] h-10 rounded-lg border-slate-100 bg-slate-50 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {DRE_GROUPS.map(g => (
                            <SelectItem key={g.value} value={g.value} className="text-xs font-medium">
                              {g.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-2 text-slate-300 hover:text-primary cursor-help">
                              <Info className="w-4 h-4" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] p-3 rounded-xl bg-slate-900 text-white border-none">
                            <p className="text-xs leading-relaxed font-medium">
                              {DRE_GROUPS.find(g => g.value === (cat.dre_group || (cat.type === 'income' ? 'revenue' : 'operating')))?.description}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onRemove(cat.id)}
                      className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {categories.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">Nenhuma categoria cadastrada.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { CatalogFields, emptyCatalogFields } from "@/components/catalog/CatalogFields";
import React, { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useProjectData } from "@/hooks/useProjectData";
import { 
  AlertTriangle, 
  Search,
  Boxes,
  ClipboardList,
  CircleDollarSign
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { InventorySummaryCard } from "@/components/inventory/InventorySummaryCard";
import { InventoryLogDialog } from "@/components/inventory/InventoryLogDialog";
import { InventoryHeader } from "@/components/inventory/page-sections/InventoryHeader";
import { InventoryGridItem } from "@/components/inventory/page-sections/InventoryGridItem";
import { 
  calculateInventoryStats, 
  filterItems 
} from "@/lib/inventory-utils/calculations";

const InventoryPage = () => {
  const { inventory, products: productsData, mutations } = useProjectData();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'insumos' | 'produtos'>('produtos');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [form, setForm] = useState({ name: "", unit: "un", min_quantity: 0, unit_cost: 0 });
  const [productForm, setProductForm] = useState({ name: "", category: "Geral", price: 0, cost: 0, stock_quantity: 0, min_stock_level: 5, sku: "", ...emptyCatalogFields });


  // Memoized stats using pure functions
  const stats = useMemo(() => 
    calculateInventoryStats(productsData.data ?? [], inventory.data ?? []), 
    [productsData.data, inventory.data]
  );

  // Memoized filtered items
  const items = useMemo(() => {
    const rawItems = activeTab === 'insumos' ? (inventory.data ?? []) : (productsData.data ?? []);
    return filterItems(rawItems, search);
  }, [activeTab, inventory.data, productsData.data, search]);

  const handleAddInsumo = useCallback(() => {
    mutations.addInventoryItem.mutate(form, {
      onSuccess: () => {
        setIsAddOpen(false);
        setForm({ name: "", unit: "un", min_quantity: 0, unit_cost: 0 });
      }
    });
  }, [form, mutations.addInventoryItem]);

  const handleAddProduto = useCallback(() => {
    if (!productForm.name.trim()) return;
    mutations.addProduct.mutate(productForm, {
      onSuccess: () => {
        setIsAddOpen(false);
        setProductForm({ name: "", category: "Geral", price: 0, cost: 0, stock_quantity: 0, min_stock_level: 5, sku: "", ...emptyCatalogFields });
      }
    });
  }, [productForm, mutations.addProduct]);


  const handleLogSubmit = useCallback((logData: any) => {
    mutations.addInventoryLog.mutate(logData, {
      onSuccess: () => {
        setIsLogOpen(false);
        setSelectedItem(null);
        setSelectedVariant(null);
      }
    });
  }, [mutations.addInventoryLog]);

  const openLogDialog = useCallback((item: any, variant: any = null) => {
    setSelectedItem(item);
    setSelectedVariant(variant);
    setIsLogOpen(true);
  }, []);

  const handleDelete = useCallback((item: any) => {
    if (activeTab === 'produtos') {
      mutations.removeProduct.mutate(item.id);
    } else {
      mutations.removeInventoryItem.mutate(item.id);
    }
  }, [activeTab, mutations.removeProduct, mutations.removeInventoryItem]);

  const formatCurrency = (val: number) => 

    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <MainLayout>
      <div className="p-4 md:p-10 space-y-8 max-w-7xl mx-auto pb-32">
        <InventoryHeader 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onOpenAddDialog={() => setIsAddOpen(true)}
        />

        {/* Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <InventorySummaryCard 
            title={activeTab === 'produtos' ? "Total em Estoque" : "Total de Insumos"}
            value={activeTab === 'produtos' ? stats.totalProductStock : stats.totalInsumos}
            icon={Boxes}
            trend="Unidades físicas"
          />
          <InventorySummaryCard 
            title="Valor em Estoque"
            value={formatCurrency(activeTab === 'produtos' ? stats.totalProductValue : stats.totalInsumosValue)}
            icon={CircleDollarSign}
            trend="Baseado no custo unitário"
          />
          <InventorySummaryCard 
            title="Itens Críticos"
            value={activeTab === 'produtos' ? stats.lowStockProducts : stats.lowStockInsumos}
            icon={AlertTriangle}
            trend="Abaixo do estoque mínimo"
          />
          <InventorySummaryCard 
            title="Catálogo"
            value={items.length}
            icon={ClipboardList}
            trend="SKUs cadastrados"
          />
        </div>

        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder={activeTab === 'produtos' ? "Buscar por nome ou SKU do produto..." : "Buscar material..."} 
            className="pl-16 h-20 bg-card border-border rounded-3xl text-xl font-bold placeholder:text-muted-foreground/50 shadow-sm focus:ring-4 focus:ring-primary/5 transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map(item => (
            <InventoryGridItem 
              key={item.id} 
              item={item} 
              activeTab={activeTab} 
              onAdjust={openLogDialog}
              onDelete={handleDelete}
            />

          ))}
        </div>
      </div>

      {/* Dialog for adding new items */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-card border-border text-foreground rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {activeTab === 'insumos' ? 'Adicionar Material' : 'Adicionar Produto'}
            </DialogTitle>
          </DialogHeader>
          {activeTab === 'insumos' ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="label-caps px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Material</label>
                <Input 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="bg-muted border-none h-14 rounded-2xl font-medium px-6"
                  placeholder="Ex: Chapa de Aço 2mm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-caps px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unidade</label>
                  <Input 
                    value={form.unit} 
                    onChange={e => setForm({...form, unit: e.target.value})}
                    className="bg-muted border-none h-14 rounded-2xl font-medium px-6 text-center"
                    placeholder="un, kg, m..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-caps px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Qtd. Mínima</label>
                  <Input 
                    type="number"
                    value={form.min_quantity} 
                    onChange={e => setForm({...form, min_quantity: Number(e.target.value)})}
                    className="bg-muted border-none h-14 rounded-2xl font-medium px-6 text-center"
                  />
                </div>
              </div>
              <Button onClick={handleAddInsumo} className="w-full h-16 rounded-2xl font-black mt-4 text-lg">SALVAR MATERIAL</Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="label-caps px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Produto</label>
                <Input 
                  value={productForm.name} 
                  onChange={e => setProductForm({...productForm, name: e.target.value})}
                  className="bg-muted border-none h-14 rounded-2xl font-medium px-6"
                  placeholder="Ex: Número 15cm 1A"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-caps px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Categoria</label>
                  <Input 
                    value={productForm.category} 
                    onChange={e => setProductForm({...productForm, category: e.target.value})}
                    className="bg-muted border-none h-14 rounded-2xl font-medium px-6"
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-caps px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">SKU</label>
                  <Input 
                    value={productForm.sku} 
                    onChange={e => setProductForm({...productForm, sku: e.target.value})}
                    className="bg-muted border-none h-14 rounded-2xl font-medium px-6"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-caps px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço (R$)</label>
                  <Input 
                    type="number"
                    value={productForm.price} 
                    onChange={e => setProductForm({...productForm, price: Number(e.target.value)})}
                    className="bg-muted border-none h-14 rounded-2xl font-medium px-6 text-center"
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-caps px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">CMV (R$)</label>
                  <Input 
                    type="number"
                    value={productForm.cost} 
                    onChange={e => setProductForm({...productForm, cost: Number(e.target.value)})}
                    className="bg-muted border-none h-14 rounded-2xl font-medium px-6 text-center"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-caps px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estoque Inicial</label>
                  <Input 
                    type="number"
                    value={productForm.stock_quantity} 
                    onChange={e => setProductForm({...productForm, stock_quantity: Number(e.target.value)})}
                    className="bg-muted border-none h-14 rounded-2xl font-medium px-6 text-center"
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-caps px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estoque Mínimo</label>
                  <Input 
                    type="number"
                    value={productForm.min_stock_level} 
                    onChange={e => setProductForm({...productForm, min_stock_level: Number(e.target.value)})}
                    className="bg-muted border-none h-14 rounded-2xl font-medium px-6 text-center"
                  />
                </div>
              </div>
              <CatalogFields name={productForm.name} value={productForm} onChange={fields => setProductForm({ ...productForm, ...fields })} />
              <Button onClick={handleAddProduto} className="w-full h-16 rounded-2xl font-black mt-4 text-lg">SALVAR PRODUTO</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <InventoryLogDialog 
        item={selectedItem}
        variant={selectedVariant}
        isOpen={isLogOpen}
        onOpenChange={setIsLogOpen}
        onSubmit={handleLogSubmit}
        type={activeTab}
      />
    </MainLayout>
  );
};

export default InventoryPage;

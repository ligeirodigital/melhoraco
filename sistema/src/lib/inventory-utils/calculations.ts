/**
 * Pure functions for inventory calculations to reduce cyclomatic complexity
 */

export interface ProductVariant {
  id: string;
  name: string;
  stock_quantity?: number;
  min_stock_level?: number;
  sku?: string;
}

export interface Product {
  made_to_order?: boolean | null;
  id: string;
  name: string;
  stock_quantity?: number;
  min_stock_level?: number;
  cost?: number;
  variants?: ProductVariant[];
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity?: number;
  min_quantity?: number;
  unit_cost?: number;
  unit?: string;
}

export const calculateProductStock = (product: Product): number => {
  if (product.made_to_order) return 0;
  const variantStock = product.variants?.reduce(
    (acc, v) => acc + (v.stock_quantity ?? 0), 
    0
  ) ?? 0;
  return (product.stock_quantity ?? 0) + variantStock;
};

export const calculateProductValue = (product: Product): number => {
  if (product.made_to_order) return 0;
  const unitCost = product.cost ?? 0;
  const parentValue = (product.stock_quantity ?? 0) * unitCost;
  const variantsValue = product.variants?.reduce(
    (acc, v) => acc + (v.stock_quantity ?? 0) * unitCost, 
    0
  ) ?? 0;
  return parentValue + variantsValue;
};

export const isProductLowStock = (product: Product): boolean => {
  if (product.made_to_order) return false;
  const isParentLow = (product.stock_quantity ?? 0) <= (product.min_stock_level ?? 0);
  const hasLowVariant = product.variants?.some(
    v => (v.stock_quantity ?? 0) <= (v.min_stock_level ?? 0)
  );
  return isParentLow || !!hasLowVariant;
};

export const calculateInventoryStats = (products: any[], inventory: any[]) => {
  const totalProductStock = products.reduce((acc, p) => acc + calculateProductStock(p), 0);
  const totalProductValue = products.reduce((acc, p) => acc + calculateProductValue(p), 0);
  const totalInsumosValue = inventory.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.unit_cost ?? 0), 0);
  const lowStockProducts = products.filter(isProductLowStock).length;
  const totalInsumos = inventory.reduce((acc, i) => acc + (i.quantity ?? 0), 0);
  const lowStockInsumos = inventory.filter(i => (i.quantity ?? 0) <= (i.min_quantity ?? 0)).length;

  return {
    totalProductStock,
    totalProductValue,
    totalInsumosValue,
    lowStockProducts,
    totalInsumos,
    lowStockInsumos
  };
};

export const filterItems = (items: any[], search: string): any[] => {
  const query = search.toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => item.name.toLowerCase().includes(query));
};

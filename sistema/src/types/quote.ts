export interface Client {
  id: string;
  name: string;
  phone?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  editable: boolean;
}

export interface QuoteItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  client: Client;
  items: QuoteItem[];
  deliveryFee: number;
  installationFee: number;
  deadline: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "num-15", name: "Número Aço Inox 15cm", description: "Acabamento polido, fonte Arial negrito", price: 49, editable: false },
  { id: "num-20", name: "Número Aço Inox 20cm", description: "Acabamento polido, fonte Arial negrito", price: 100, editable: false },
  { id: "num-30", name: "Número Aço Inox 30cm", description: "Acabamento polido, fonte Arial negrito", price: 150, editable: false },
  { id: "caixa", name: "Caixa de Correio", description: "Preço editável", price: 0, editable: true },
];

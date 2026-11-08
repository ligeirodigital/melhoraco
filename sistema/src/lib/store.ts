import { Client, Quote, Product, DEFAULT_PRODUCTS } from "@/types/quote";

const KEYS = {
  quotes: "melhoraco_quotes",
  clients: "melhoraco_clients",
  products: "melhoraco_products",
};

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getQuotes(): Quote[] {
  return get<Quote[]>(KEYS.quotes, []);
}

export function saveQuote(quote: Quote) {
  const quotes = getQuotes();
  const idx = quotes.findIndex((q) => q.id === quote.id);
  if (idx >= 0) quotes[idx] = quote;
  else quotes.unshift(quote);
  set(KEYS.quotes, quotes);
}

export function deleteQuote(id: string) {
  set(KEYS.quotes, getQuotes().filter((q) => q.id !== id));
}

export function getClients(): Client[] {
  return get<Client[]>(KEYS.clients, []);
}

export function saveClient(client: Client) {
  const clients = getClients();
  const idx = clients.findIndex((c) => c.id === client.id);
  if (idx >= 0) clients[idx] = client;
  else clients.unshift(client);
  set(KEYS.clients, clients);
}

export function getProducts(): Product[] {
  return get<Product[]>(KEYS.products, DEFAULT_PRODUCTS);
}

export function saveProducts(products: Product[]) {
  set(KEYS.products, products);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

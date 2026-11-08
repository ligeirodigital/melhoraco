import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import QuoteForm from "../components/QuoteForm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        count: vi.fn(() => Promise.resolve({ count: 0 }))
      })),
      upsert: vi.fn(() => Promise.resolve({ data: { id: "123" }, error: null })),
      insert: vi.fn(() => Promise.resolve({ data: { id: "123" }, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
  },
}));

// Mock hooks
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user123", email: "test@example.com" },
    loading: false,
    isAllowed: true
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

describe("QuoteForm", () => {
  it("renders correctly", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <QuoteForm onSaved={() => {}} onBack={() => {}} />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Novo Pedido/i)).toBeInTheDocument();
    });
  });
});


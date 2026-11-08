import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthPage from "../pages/AuthPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

const queryClient = new QueryClient();

describe("AuthPage", () => {
  it("renders correctly", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthPage />
      </QueryClientProvider>
    );
    expect(screen.getByText("Melhoraço Inox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("seu@email.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });
});

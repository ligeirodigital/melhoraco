import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import FinancialAssistant from "./FinancialAssistant";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "manager" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ functionUrl: (n: string) => `https://example.supabase.co/functions/v1/melhoraco-${n}`, supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "test-session" } } }) } } }));
const snapshot = { context: { installments: { asOf: "2026-10-10", pending: 1000, overdue: 250, received: 0, pendingCount: 4, next30Days: 500 }, orders: { total: 69 } } };
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><FinancialAssistant /></QueryClientProvider>);
afterEach(() => vi.unstubAllGlobals());

describe("Assistente de pedidos e financeiro", () => {
  it("carrega o panorama sem chamar a IA e permite preencher exemplo", async () => {
    const fetcher = vi.fn(async (_url: string, _options: RequestInit) => new Response(JSON.stringify(snapshot)));
    vi.stubGlobal("fetch", fetcher);
    mount();
    await screen.findByLabelText("Panorama de parcelas provisionadas");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1].body)).action).toBe("snapshot");
    expect(screen.getByRole("button", { name: "Analisar situação" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Venda parcelada" }));
    expect((screen.getByLabelText("Qual situação você precisa avaliar?") as HTMLTextAreaElement).value).toContain("1.000");
    expect(screen.getByRole("button", { name: "Analisar situação" })).toBeEnabled();
  });
  it("mostra a razão de bloqueio e não repete requisições", async () => {
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body));
      return body.action === "snapshot" ? new Response(JSON.stringify(snapshot)) : new Response(JSON.stringify({ error: "Limite de IA do workspace atingido.", blocked: true, canResume: false }), { status: 403 });
    });
    vi.stubGlobal("fetch", fetcher);
    mount();
    await screen.findByLabelText("Panorama de parcelas provisionadas");
    fireEvent.click(screen.getByRole("button", { name: "Venda parcelada" }));
    fireEvent.click(screen.getByRole("button", { name: "Analisar situação" }));
    await screen.findByText("Limite de IA do workspace atingido.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Analisar situação" })).toBeDisabled());
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Qual situação você precisa avaliar?")).not.toHaveValue("");
  });
});

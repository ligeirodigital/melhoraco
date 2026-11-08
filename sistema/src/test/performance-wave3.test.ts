import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient } from "@tanstack/query-core";
import { POLL, isOrderFinal, queryKeys } from "@/lib/queryKeys";

describe("Onda 3 — condições de parada de polling", () => {
  it("pedido pago é final (não deve continuar consultando)", () => {
    expect(isOrderFinal({ status: "aprovado", payment_status: "paid" })).toBe(true);
  });

  it("pedido cancelado/recusado/entregue é final", () => {
    expect(isOrderFinal({ status: "cancelado", payment_status: "pending" })).toBe(true);
    expect(isOrderFinal({ status: "recusado", payment_status: "pending" })).toBe(true);
    expect(isOrderFinal({ status: "entregue", payment_status: null })).toBe(true);
  });

  it("pedido aguardando pagamento NÃO é final", () => {
    expect(isOrderFinal({ status: "rascunho", payment_status: "pending" })).toBe(false);
  });

  it("intervalos de polling não são agressivos", () => {
    expect(POLL.orders).toBeGreaterThanOrEqual(12_000);
    expect(POLL.order).toBeGreaterThanOrEqual(20_000);
    expect(POLL.payment).toBeGreaterThanOrEqual(20_000);
  });
});

describe("Onda 3 — query keys estáveis (sem dataset duplicado)", () => {
  it("mesma entrada gera a mesma chave", () => {
    expect(queryKeys.publicClientOrders("85999999999")).toEqual(
      queryKeys.publicClientOrders("85999999999"),
    );
    expect(queryKeys.publicOrder("abc")).toEqual(queryKeys.publicOrder("abc"));
    expect(queryKeys.quotePaymentTx("abc")).toEqual(queryKeys.quotePaymentTx("abc"));
  });

  it("entradas diferentes não colidem", () => {
    expect(queryKeys.publicOrder("a")).not.toEqual(queryKeys.publicOrder("b"));
    expect(queryKeys.publicOrder("a")).not.toEqual(queryKeys.quotePaymentTx("a"));
  });
});

describe("Onda 3 — refetchInterval para no estado final", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polling do pedido cessa após pagamento confirmado", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let status = "pending";
    const fetcher = vi.fn(async () => ({ payment_status: status }));

    const observerOptions = {
      queryKey: queryKeys.publicOrder("q1"),
      queryFn: fetcher,
      refetchInterval: (query: any) =>
        query.state.data?.payment_status === "paid" ? false : POLL.order,
      refetchIntervalInBackground: false,
    };

    const { QueryObserver } = await import("@tanstack/query-core");
    const observer = new QueryObserver(queryClient, observerOptions as any);
    const unsubscribe = observer.subscribe(() => {});

    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(POLL.order + 50);
    expect(fetcher).toHaveBeenCalledTimes(2);

    status = "paid";
    await vi.advanceTimersByTimeAsync(POLL.order + 50);
    const callsAfterPaid = fetcher.mock.calls.length;

    // Estado final atingido: nenhuma consulta adicional.
    await vi.advanceTimersByTimeAsync(POLL.order * 3);
    expect(fetcher.mock.calls.length).toBe(callsAfterPaid);

    unsubscribe();
    queryClient.clear();
  });
});

describe("Onda 3 — carregamento sob demanda dos PDFs", () => {
  it("nenhum módulo da app importa @react-pdf/renderer estaticamente fora do loader/documentos", async () => {
    const { renderPdfBlob, downloadBlob, generateAndDownloadPdf } = await import("@/lib/pdfLoader");
    expect(typeof renderPdfBlob).toBe("function");
    expect(typeof downloadBlob).toBe("function");
    expect(typeof generateAndDownloadPdf).toBe("function");
  });
});

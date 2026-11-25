import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { PublicCheckoutCard } from "./PublicCheckoutCard";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/lib/reportError", () => ({ reportError: vi.fn() }));

const base = { id: "q1", client_view_token: "tok", delivery_address: null, installation_fee: 0, quote_items: [{ product_name: "Números de inox 15 cm" }] };
beforeEach(() => { vi.clearAllMocks(); rpc.mockResolvedValue({ data: { ok: true }, error: null }); });

it("sem endereço, pede o endereço e só paga depois de salvar", async () => {
  const onPayNow = vi.fn(); const onUpdated = vi.fn();
  render(<PublicCheckoutCard quote={base} total={177} onUpdated={onUpdated} onPayNow={onPayNow} onPayOnDelivery={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Pagar agora/ }));
  await waitFor(() => expect(rpc).not.toHaveBeenCalled());
  expect(onPayNow).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Rua"), { target: { value: "Rua A" } });
  fireEvent.change(screen.getByLabelText("Número"), { target: { value: "10" } });
  fireEvent.click(screen.getByRole("button", { name: /Pagar agora/ }));
  await waitFor(() => expect(onPayNow).toHaveBeenCalled());
  expect(rpc).toHaveBeenCalledWith("update_public_quote_checkout", expect.objectContaining({ p_quote_id: "q1", p_token: "tok", p_street: "Rua A", p_number: "10" }));
});

it("com endereço, paga direto e liga a instalação de R$ 100", async () => {
  const onPayNow = vi.fn(); const onUpdated = vi.fn();
  render(<PublicCheckoutCard quote={{ ...base, delivery_address: "Rua B 2, Fortaleza" }} total={177} onUpdated={onUpdated} onPayNow={onPayNow} onPayOnDelivery={vi.fn()} />);
  fireEvent.click(screen.getByRole("switch", { name: /instalação/i }));
  await waitFor(() => expect(rpc).toHaveBeenCalledWith("update_public_quote_checkout", expect.objectContaining({ p_installation: true })));
  expect(onUpdated).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /Pagar agora/ }));
  await waitFor(() => expect(onPayNow).toHaveBeenCalled());
  expect(screen.queryByText(/Pix na chave|Nubank/i)).toBeNull();
});

it("20/30 cm não oferece pagar na entrega", () => {
  render(<PublicCheckoutCard quote={{ ...base, delivery_address: "Rua B 2", quote_items: [{ product_name: "Números de inox 20 cm" }] }} total={240} onUpdated={vi.fn()} onPayNow={vi.fn()} onPayOnDelivery={vi.fn()} />);
  expect(screen.queryByRole("button", { name: /pagar na entrega/i })).toBeNull();
  expect(screen.getByText(/sob encomenda/)).toBeInTheDocument();
});

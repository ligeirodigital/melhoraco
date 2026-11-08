import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NumberingQuickEntry } from "./NumberingQuickEntry";

const variants = [
  { id: "v1", name: "1", stock_quantity: 10, price_adjustment: 5 },
  { id: "v5", name: "5", stock_quantity: 10, price_adjustment: 5 },
  { id: "vA", name: "A", stock_quantity: 10, price_adjustment: 5 },
];

const UNIT_PRICE = 10;

function Harness() {
  const [items, setItems] = useState<{ id: string; name: string; price: number }[]>([]);
  const addItem = (v: { id: string; name: string; price_adjustment?: number | null }) => {
    // Reproduz padrão do QuoteForm.addItem (updater funcional)
    setItems((prev) => [
      ...prev,
      { id: `${v.id}-${prev.length}`, name: v.name, price: UNIT_PRICE + (v.price_adjustment ?? 0) },
    ]);
  };
  const total = items.reduce((s, i) => s + i.price, 0);
  return (
    <div>
      <NumberingQuickEntry variants={variants as any} onAdd={addItem as any} />
      <ul data-testid="items">
        {items.map((i, idx) => (
          <li key={idx}>{i.name}</li>
        ))}
      </ul>
      <div data-testid="total">{total}</div>
      <div data-testid="count">{items.length}</div>
    </div>
  );
}

describe("NumberingQuickEntry integration", () => {
  it("allows repeated zero-stock digits for made-to-order products", () => {
    const added: string[] = [];
    render(<NumberingQuickEntry madeToOrder variants={[{ id: "v1", name: "1", stock_quantity: 0 }]} onAdd={v => added.push(v.id)} />);
    fireEvent.change(screen.getByPlaceholderText(/Numeração/i), { target: { value: "11" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(added).toEqual(["v1", "v1"]);
  });
  it("blocks repeated zero-stock digits for stock-controlled products", () => {
    render(<NumberingQuickEntry variants={[{ id: "v1", name: "1", stock_quantity: 0 }]} onAdd={() => { throw new Error("Must not add"); }} />);
    fireEvent.change(screen.getByPlaceholderText(/Numeração/i), { target: { value: "11" } });
    expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
  });
  it("adiciona as 4 variações de '151A' e atualiza o total", () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText(/Numeração/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "151A" } });

    const addBtn = screen.getByRole("button", { name: /add/i });
    fireEvent.click(addBtn);

    expect(screen.getByTestId("count").textContent).toBe("4");
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["1", "5", "1", "A"]);
    expect(screen.getByTestId("total").textContent).toBe(String(4 * (UNIT_PRICE + 5)));
  });
});

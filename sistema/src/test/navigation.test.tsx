import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  getPrimaryNav,
  getSecondaryNav,
  getSidebarNav,
  resolveActiveSection,
} from "@/lib/navigation";
import { BottomNav } from "@/components/BottomNav";

const authState = { isAdmin: false, signOut: vi.fn() };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

const renderNav = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );

describe("navigation model", () => {
  it("keeps at most 5 mobile destinations (4 + Mais)", () => {
    expect(getPrimaryNav({ isAdmin: true }).length).toBeLessThanOrEqual(4);
  });

  it("hides admin modules from regular users", () => {
    const ids = getSecondaryNav({ isAdmin: false }).map((i) => i.id);
    expect(ids).not.toContain("loja-admin");
    expect(ids).not.toContain("diagnosticos");
    expect(ids).not.toContain("pagamentos");
  });

  it("shows admin modules to admins", () => {
    const ids = getSecondaryNav({ isAdmin: true }).map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(["loja-admin"]));
  });

  it("keeps payment diagnostics out of the main menu (they live in Ajustes)", () => {
    const ids = getSecondaryNav({ isAdmin: true }).map((i) => i.id);
    expect(ids).not.toContain("diagnosticos");
    expect(ids).not.toContain("pagamentos");
  });

  it("does not duplicate items between bottom bar and Mais", () => {
    const primary = getPrimaryNav({ isAdmin: true }).map((i) => i.id);
    const secondary = getSecondaryNav({ isAdmin: true }).map((i) => i.id);
    expect(primary.filter((id) => secondary.includes(id))).toHaveLength(0);
  });

  it("desktop sidebar mirrors the same information architecture", () => {
    const sidebar = getSidebarNav({ isAdmin: true }).map((i) => i.id);
    const all = [...getPrimaryNav({ isAdmin: true }), ...getSecondaryNav({ isAdmin: true })]
      .map((i) => i.id)
      .filter((id) => id !== "novo");
    expect(sidebar).toEqual(all);
  });

  it("keeps Vendas active on child route /quotes/:id", () => {
    expect(resolveActiveSection("/quotes/abc-123")).toBe("vendas");
    expect(resolveActiveSection("/")).toBe("vendas");
  });

  it("resolves the financial calendar to its own section, not DRE", () => {
    expect(resolveActiveSection("/financeiro/calendario")).toBe("calendario");
    expect(resolveActiveSection("/dre")).toBe("financeiro");
  });
});

describe("BottomNav", () => {
  it("marks the active destination with aria-current", () => {
    renderNav("/quotes/xyz");
    expect(screen.getByRole("link", { name: "Orçamentos" })).toHaveAttribute("aria-current", "page");
  });

  it("exposes secondary modules through Mais", () => {
    authState.isAdmin = false;
    renderNav("/dashboard");
    fireEvent.click(screen.getByRole("button", { name: "Mais módulos" }));

    for (const name of ["Clientes", "Estoque", "Financeiro DRE", "Calendário financeiro", "Ajustes"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: "Diagnósticos" })).toBeNull();
  });

  it("gives admins the store admin inside Mais, without payment diagnostics", () => {
    authState.isAdmin = true;
    renderNav("/dashboard");
    fireEvent.click(screen.getByRole("button", { name: "Mais módulos" }));
    expect(screen.queryByRole("link", { name: "Diagnósticos" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin da loja" })).toBeInTheDocument();
    authState.isAdmin = false;
  });

  it("reaches Agenda directly from the bottom bar", () => {
    renderNav("/dashboard");
    expect(screen.getByRole("link", { name: "Agenda" })).toHaveAttribute("href", "/agenda");
  });
});

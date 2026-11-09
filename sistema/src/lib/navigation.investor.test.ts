import { describe, expect, it } from "vitest";
import { getPrimaryNav, getSecondaryNav, getSidebarNav } from "./navigation";

describe("navegação do investidor", () => {
  it("investidor sem ser admin vê Minha comissão, Vendas e Dashboard", () => {
    const perms = { isInvestor: true, isAdmin: false };
    expect(getPrimaryNav(perms).map((i) => i.id)).toEqual(["comissao", "inv-vendas", "inv-dashboard"]);
    expect(getSecondaryNav(perms)).toEqual([]);
    expect(getSidebarNav(perms).map((i) => i.path)).toEqual(["/investidor", "/investidor/vendas", "/investidor/dashboard"]);
  });

  it("administrador mantém a navegação completa", () => {
    const ids = getSidebarNav({ isInvestor: true, isAdmin: true }).map((i) => i.id);
    expect(ids).toContain("vendas");
    expect(ids).not.toContain("comissao");
  });
});

describe("investidor que cadastra pedidos", () => {
  it("vê Novo pedido primeiro, depois as abas de investidor", () => {
    const perms = { isInvestor: true, isAdmin: false, canCreateOrders: true };
    expect(getPrimaryNav(perms).map((i) => i.id)).toEqual(["novo", "comissao", "inv-vendas", "inv-dashboard"]);
    expect(getPrimaryNav(perms)[0].path).toBe("/new");
  });
});

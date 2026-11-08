import { describe, expect, it } from "vitest";
import { getPrimaryNav, getSecondaryNav, getSidebarNav } from "./navigation";

describe("navegação do investidor", () => {
  it("investidor sem ser admin vê só Minha comissão", () => {
    const perms = { isInvestor: true, isAdmin: false };
    expect(getPrimaryNav(perms).map((i) => i.id)).toEqual(["comissao"]);
    expect(getSecondaryNav(perms)).toEqual([]);
    expect(getSidebarNav(perms).map((i) => i.path)).toEqual(["/investidor"]);
  });

  it("administrador mantém a navegação completa", () => {
    const ids = getSidebarNav({ isInvestor: true, isAdmin: true }).map((i) => i.id);
    expect(ids).toContain("vendas");
    expect(ids).not.toContain("comissao");
  });
});

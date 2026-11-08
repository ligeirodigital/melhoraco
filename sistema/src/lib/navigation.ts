import {
  LayoutDashboard,
  FileSpreadsheet,
  Plus,
  CalendarClock,
  Users,
  Package,
  BarChart3,
  CalendarDays,
  Settings,
  Store,
  ClipboardList,
  Activity,
  Receipt,
  type LucideIcon,
} from "lucide-react";

export type NavSectionId =
  | "vendas"
  | "dashboard"
  | "novo"
  | "agenda"
  | "clientes"
  | "estoque"
  | "financeiro"
  | "calendario"
  | "loja"
  | "loja-admin"
  | "pagamentos"
  | "diagnosticos"
  | "ajustes";

export interface NavItem {
  id: NavSectionId;
  label: string;
  /** Shorter label used on very small screens (bottom nav). */
  shortLabel?: string;
  path: string;
  icon: LucideIcon;
  /** Extra path prefixes that keep this section active. */
  matches?: string[];
  adminOnly?: boolean;
}

export interface NavPermissions {
  isAdmin?: boolean;
}

/** Daily-use destinations. */
const PRIMARY: NavItem[] = [
  { id: "vendas", label: "Orçamentos", shortLabel: "Vendas", path: "/", icon: FileSpreadsheet, matches: ["/quotes"] },
  { id: "dashboard", label: "Dashboard", shortLabel: "Painel", path: "/dashboard", icon: LayoutDashboard },
  { id: "novo", label: "Novo orçamento", shortLabel: "Novo", path: "/new", icon: Plus },
  { id: "agenda", label: "Agenda", path: "/agenda", icon: CalendarClock },
];

/** Recurring but secondary destinations (live in the "Mais" sheet on mobile). */
const SECONDARY: NavItem[] = [
  { id: "clientes", label: "Clientes", path: "/clients", icon: Users },
  { id: "estoque", label: "Estoque", path: "/inventory", icon: Package },
  { id: "financeiro", label: "Financeiro DRE", path: "/dre", icon: BarChart3 },
  { id: "calendario", label: "Calendário financeiro", path: "/financeiro/calendario", icon: CalendarDays },
  { id: "loja", label: "Loja", path: "/loja", icon: Store },
  { id: "loja-admin", label: "Admin da loja", path: "/admin/loja", icon: ClipboardList, adminOnly: true },
  { id: "pagamentos", label: "Eventos de pagamento", path: "/admin/pagamentos/eventos", icon: Receipt, adminOnly: true },
  { id: "diagnosticos", label: "Diagnósticos", path: "/diag/payments", icon: Activity, adminOnly: true },
  { id: "ajustes", label: "Ajustes", path: "/settings", icon: Settings },
];

const allowed = (items: NavItem[], perms: NavPermissions) =>
  items.filter((item) => !item.adminOnly || !!perms.isAdmin);

/** Destinations shown directly in the mobile bottom bar (max 4 + "Mais"). */
export function getPrimaryNav(perms: NavPermissions = {}): NavItem[] {
  return allowed(PRIMARY, perms);
}

/** Destinations shown inside the mobile "Mais" sheet. */
export function getSecondaryNav(perms: NavPermissions = {}): NavItem[] {
  return allowed(SECONDARY, perms);
}

/** Desktop sidebar: same information architecture, single list, no "Novo" (it has its own CTA). */
export function getSidebarNav(perms: NavPermissions = {}): NavItem[] {
  return [
    ...allowed(PRIMARY, perms).filter((i) => i.id !== "novo"),
    ...allowed(SECONDARY, perms),
  ];
}

/** True when `pathname` belongs to the given nav item (child routes included). */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const candidates = [item.path, ...(item.matches ?? [])];
  return candidates.some((base) => {
    if (base === "/") return pathname === "/";
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}

/** Resolves which section is active for a pathname, most specific path wins. */
export function resolveActiveSection(
  pathname: string,
  perms: NavPermissions = {},
): NavSectionId | null {
  const items = [...getPrimaryNav(perms), ...getSecondaryNav(perms)];
  const matched = items.filter((item) => isNavItemActive(item, pathname));
  if (matched.length === 0) return null;
  return matched.sort((a, b) => b.path.length - a.path.length)[0].id;
}

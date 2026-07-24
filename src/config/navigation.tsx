import {
  LayoutDashboard, ShoppingCart, Users, Package, Gift, Megaphone, Zap, Ticket,
  FileText, Trophy, Instagram, Star, Code, UserCheck, Palette, Settings
} from "lucide-react";
import type { ComponentType } from "react";

export type Workspace = "admin" | "employee" | "courier";

export type NavGroup = "Menu Principal";

export const NAV_GROUPS: NavGroup[] = ["Menu Principal"];

export type NavItem = {
  id: string;
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  group: NavGroup;
  workspaces?: Workspace[];
  perm?: string | string[];
  description?: string;
  badge?: string;
  courierOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, group: "Menu Principal", workspaces: ["admin"] },
  { id: "lancar-venda", title: "Lançar venda", url: "/caixa", icon: ShoppingCart, group: "Menu Principal", workspaces: ["employee", "admin"] },
  { id: "clientes", title: "Clientes", url: "/clientes", icon: Users, group: "Menu Principal", workspaces: ["employee", "admin"] },
  { id: "produtos", title: "Produtos", url: "/premios", icon: Package, group: "Menu Principal", workspaces: ["admin"] },
  { id: "resgates", title: "Resgates", url: "/premios", icon: Gift, group: "Menu Principal", workspaces: ["admin"] },
  { id: "campanhas", title: "Campanhas", url: "/configuracoes", icon: Megaphone, group: "Menu Principal", workspaces: ["admin"] },
  { id: "promocoes", title: "Promoções", url: "/configuracoes", icon: Zap, group: "Menu Principal", workspaces: ["admin"] },
  { id: "vale-presente", title: "Vale-presente", url: "/premios", icon: Ticket, group: "Menu Principal", workspaces: ["admin"] },
  { id: "notas-fiscais", title: "Notas fiscais", url: "/configuracoes/olist", icon: FileText, group: "Menu Principal", workspaces: ["admin"] },
  { id: "sorteios", title: "Sorteios", url: "/premios", icon: Trophy, group: "Menu Principal", workspaces: ["admin"] },
  { id: "instagram", title: "Posts do Instagram", url: "/configuracoes", icon: Instagram, group: "Menu Principal", workspaces: ["admin"] },
  { id: "nps", title: "NPS", url: "/dashboard", icon: Star, group: "Menu Principal", workspaces: ["admin"] },
  { id: "widget", title: "Widget", url: "/configuracoes", icon: Code, group: "Menu Principal", workspaces: ["admin"] },
  { id: "equipe", title: "Equipe", url: "/funcionarios", icon: UserCheck, group: "Menu Principal", workspaces: ["admin"] },
  { id: "personalizacao", title: "Personalização", url: "/configuracoes", icon: Palette, group: "Menu Principal", workspaces: ["admin"] },
  { id: "configuracoes", title: "Configurações", url: "/configuracoes/olist", icon: Settings, group: "Menu Principal", workspaces: ["admin"] },
];

export const ESSENTIAL_ITEM_IDS = new Set<string>(NAV_ITEMS.map((i) => i.id));

export function itemsByGroup(items: NavItem[]): { label: NavGroup; items: NavItem[] }[] {
  return [{ label: "Menu Principal", items }];
}

export function itemsForWorkspace(items: NavItem[], workspace: Workspace): NavItem[] {
  return items.filter((it) => !it.workspaces || it.workspaces.includes(workspace));
}

export function filterByPermission(items: NavItem[], has?: (p: string) => boolean, hasAny?: (ps: string[]) => boolean): NavItem[] {
  if (!has && !hasAny) return items;
  return items.filter((it) => {
    if (!it.perm) return true;
    if (Array.isArray(it.perm)) return hasAny ? hasAny(it.perm) : true;
    return has ? has(it.perm) : true;
  });
}

export function applyCourierFilter(items: NavItem[], has?: (p: string) => boolean): NavItem[] {
  return items.filter((it) => !it.courierOnly || (has && has("delivery.manage")));
}

export const PERMISSION_GROUPS: { id: string; label: string; codes: string[] }[] = [
  {
    id: "fidelidade",
    label: "Fidelidade e Frente de Caixa",
    codes: [
      "pode_validar_voucher",
      "pode_pontuar_compra",
      "pode_estornar_transacao",
      "pode_dar_desconto_manual",
      "pode_ver_historico_caixa"
    ]
  },
  {
    id: "admin",
    label: "Administração da Loja",
    codes: ["user.manage", "role.manage", "audit.view"]
  }
];

export const SENSITIVE_PERMISSIONS = new Set<string>([
  "pode_estornar_transacao",
  "pode_dar_desconto_manual",
  "user.manage",
  "role.manage"
]);

export function permissionGroupOf(code: string): string {
  for (const g of PERMISSION_GROUPS) {
    if (g.codes.includes(code)) return g.label;
  }
  return "Outros";
}

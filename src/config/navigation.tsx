import {
  LayoutDashboard, Gift, Wallet, Users, Settings, Award, ShieldCheck,
  Store, QrCode, Sparkles, UserSquare2, RefreshCw, Ticket, PiggyBank,
  FileBarChart, Home, Briefcase, Trophy, Upload, BarChart3, Sliders
} from "lucide-react";
import type { ComponentType } from "react";

export type Workspace = "admin" | "employee" | "courier";

export type NavGroup =
  | "Início" | "Fidelidade & Operação" | "Equipe & Acessos" | "Configurações";

export const NAV_GROUPS: NavGroup[] = [
  "Início",
  "Fidelidade & Operação",
  "Equipe & Acessos",
  "Configurações"
];

export const NAV_GROUP_META: Record<NavGroup, { label: string; description?: string; icon?: any }> = {
  "Início": { label: "Início", description: "Métricas e resumo do sistema" },
  "Fidelidade & Operação": { label: "Fidelidade & Operação", description: "Caixa, vitrine pública e recompensas" },
  "Equipe & Acessos": { label: "Equipe & Acessos", description: "Gestão de funcionários e cargos" },
  "Configurações": { label: "Configurações", description: "Ajustes whitelabel e integrações" },
};

export type NavItem = {
  id: string;
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  perm?: string | string[];
  group: NavGroup;
  workspaces?: Workspace[];
  priority?: number;
  description?: string;
  mobile?: boolean;
  essential?: boolean;
  courierOnly?: boolean;
  keywords?: string[];
};

export const NAV_ITEMS: NavItem[] = [
  // ── Início ────────────────────────────────────────────────
  {
    id: "dashboard",
    title: "Dashboard & ROI",
    url: "/dashboard",
    icon: Home,
    group: "Início",
    workspaces: ["admin"],
    priority: 100,
    mobile: true,
    essential: true,
    description: "Indicadores de retenção, receita de fidelizados e moedas emitidas.",
    keywords: ["dashboard", "home", "indicadores", "kpi", "roi", "fidelidade"]
  },

  // ── Fidelidade & Operação ─────────────────────────────────
  {
    id: "vitrine",
    title: "Vitrine do Cliente",
    url: "/$slug",
    icon: Store,
    group: "Fidelidade & Operação",
    workspaces: ["employee", "admin"],
    priority: 100,
    mobile: true,
    essential: true,
    description: "Página pública Whitelabel para resgate de pontos e PWA.",
    keywords: ["vitrine", "loja", "resgate", "cliente", "pwa"]
  },
  {
    id: "caixa",
    title: "Frente de Caixa",
    url: "/caixa",
    icon: Wallet,
    group: "Fidelidade & Operação",
    workspaces: ["employee", "admin"],
    priority: 90,
    mobile: true,
    essential: true,
    description: "Lançamento de compras por CPF e validação de vouchers.",
    keywords: ["caixa", "balcao", "venda", "pontuar", "voucher", "qr code"]
  },
  {
    id: "premios",
    title: "Catálogo de Prêmios",
    url: "/premios",
    icon: Gift,
    group: "Fidelidade & Operação",
    workspaces: ["admin"],
    priority: 80,
    mobile: true,
    essential: true,
    description: "Cadastre cupons, brindes e recompensas.",
    keywords: ["premios", "recompensas", "cupons", "brindes", "moedas"]
  },
  {
    id: "clientes",
    title: "Clientes & Saldos",
    url: "/clientes",
    icon: UserSquare2,
    group: "Fidelidade & Operação",
    workspaces: ["employee", "admin"],
    priority: 70,
    essential: true,
    description: "Base de consumidores e saldo de cashback.",
    keywords: ["clientes", "cpf", "saldo", "cashback", "historico"]
  },

  // ── Equipe & Acessos ──────────────────────────────────────
  {
    id: "cargos",
    title: "Cargos & Permissões",
    url: "/cargos",
    icon: ShieldCheck,
    group: "Equipe & Acessos",
    workspaces: ["admin"],
    priority: 60,
    description: "Criação de cargos personalizados e controle de acesso.",
    keywords: ["cargos", "permissoes", "funcoes", "acesso"]
  },
  {
    id: "funcionarios",
    title: "Equipe de Funcionários",
    url: "/funcionarios",
    icon: Users,
    group: "Equipe & Acessos",
    workspaces: ["admin"],
    priority: 50,
    description: "Gestão dos colaboradores vinculados à loja.",
    keywords: ["funcionarios", "equipe", "caixas", "operadores"]
  },

  // ── Configurações ──────────────────────────────────────────
  {
    id: "configuracoes",
    title: "Configurações Whitelabel",
    url: "/configuracoes",
    icon: Settings,
    group: "Configurações",
    workspaces: ["admin"],
    priority: 40,
    essential: true,
    description: "Personalização de logo, cores, moeda e % de cashback.",
    keywords: ["configuracoes", "whitelabel", "logo", "cores", "moeda", "cashback"]
  },
  {
    id: "olist-integration",
    title: "Integração Olist / ERP",
    url: "/configuracoes/olist",
    icon: Sliders,
    group: "Configurações",
    workspaces: ["admin"],
    priority: 30,
    description: "Webhooks e sincronização automática de pedidos.",
    keywords: ["olist", "integration", "webhook", "sync", "erp"]
  }
];

export const ESSENTIAL_ITEM_IDS = new Set<string>([
  "dashboard", "vitrine", "caixa", "premios", "clientes", "configuracoes"
]);

export function itemsByGroup(items: NavItem[]): { label: NavGroup; items: NavItem[] }[] {
  const map = new Map<NavGroup, NavItem[]>();
  for (const g of NAV_GROUPS) map.set(g, []);
  for (const item of items) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return NAV_GROUPS.map((g) => ({ label: g, items: map.get(g) ?? [] })).filter((g) => g.items.length > 0);
}

export function filterByPermission(items: NavItem[], has?: any, hasAny?: any): NavItem[] {
  return items;
}

export function applyCourierFilter(items: NavItem[], has?: any): NavItem[] {
  return items;
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

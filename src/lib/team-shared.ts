// Client-safe shared types for team/RBAC module.
export type TeamRole = {
  key: string;
  label: string;
  description: string | null;
  is_system: boolean;
  sort_order: number;
};

export type TeamPermission = {
  key: string;
  label: string;
  description: string;
  category: string;
  sort_order: number;
};

export type Employee = {
  id: string;
  store_id: string;
  user_id: string | null;
  nome: string;
  cpf: string | null;
  email: string;
  phone: string | null;
  role_key: string;
  status: "ativo" | "inativo";
  created_at: string;
  updated_at: string;
};

export type EmployeePermissionOverride = {
  employee_id: string;
  permission_key: string;
  granted: boolean;
};

export type EmployeeAuditLog = {
  id: string;
  store_id: string;
  actor_user_id: string | null;
  employee_id: string | null;
  action: string;
  target_label: string | null;
  ip: string | null;
  user_agent: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

/** Menu items shown in the employee panel — each requires a permission. */
export const EMPLOYEE_MENU: {
  key: string;
  label: string;
  to: string;
  requires: string[]; // ANY-of
}[] = [
  { key: "dashboard", label: "Dashboard", to: "/funcionario", requires: [] },
  { key: "clientes", label: "Clientes", to: "/funcionario/clientes", requires: ["clientes.consultar"] },
  { key: "pontuacao", label: "Pontuação", to: "/funcionario/pontuar", requires: ["pontos.adicionar"] },
  { key: "resgates", label: "Resgates", to: "/funcionario/resgates", requires: ["resgates.produtos"] },
  { key: "vouchers", label: "Vouchers", to: "/funcionario/vouchers", requires: ["vouchers.validar", "vouchers.criar"] },
  { key: "historico", label: "Histórico", to: "/funcionario/historico", requires: ["historico.consultar"] },
  { key: "perfil", label: "Perfil", to: "/funcionario/perfil", requires: [] },
];
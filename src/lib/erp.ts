import { supabase } from "@/integrations/supabase/client";

export function formatBRL(value: number | null | undefined): string {
  if (value == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatCurrency(value: number | null | undefined): string {
  return formatBRL(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export const SIZE_SINGLE = "Único";
export const SIZE_SINGLE_LABEL = "Tamanho Único (U)";

export async function currentOrgId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
  return p?.organization_id ?? null;
}

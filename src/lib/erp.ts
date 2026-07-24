/**
 * erp.ts — Utilitários genéricos de formatação (PontuaMax)
 * Apenas helpers de data/moeda usados nas rotas ativas.
 */

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

/**
 * currentOrgId — stub de compatibilidade.
 * A organização real é resolvida pelo Supabase RLS automaticamente.
 * Manter apenas para compatibilidade com imports legados durante a transição.
 */
export async function currentOrgId(): Promise<string | null> {
  const { createClient } = await import("@/integrations/supabase/client");
  const { data } = await (createClient as any).auth.getUser();
  return (data?.user as any)?.user_metadata?.organization_id ?? null;
}

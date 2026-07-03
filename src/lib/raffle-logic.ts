// Pure, testable raffle selection logic. Kept free of Supabase/network calls
// so we can exercise filtro_tag + filtro_nivel_min combinations under test.

export type Nivel = "bronze" | "prata" | "ouro";
export type NivelMin = Nivel | null | undefined;

export interface RaffleClient {
  user_id: string;
  nivel: Nivel;
}

export interface RaffleTagLink {
  client_user_id: string;
  tag: string;
}

export interface RaffleFilters {
  filtro_tag?: string | null;
  filtro_nivel_min?: NivelMin;
}

/** Nível mínimo → conjunto de níveis elegíveis. */
export function nivelPermitido(nivel: Nivel, min: NivelMin): boolean {
  if (!min || min === "bronze") return true;
  if (min === "prata") return nivel === "prata" || nivel === "ouro";
  if (min === "ouro") return nivel === "ouro";
  return true;
}

/** Retorna user_ids elegíveis para o sorteio, aplicando os filtros. */
export function elegiveisSorteio(
  clients: RaffleClient[],
  tags: RaffleTagLink[],
  filters: RaffleFilters,
): string[] {
  const base = clients
    .filter((c) => nivelPermitido(c.nivel, filters.filtro_nivel_min))
    .map((c) => c.user_id);
  if (!filters.filtro_tag) return base;
  const tagged = new Set(
    tags
      .filter((t) => t.tag === filters.filtro_tag)
      .map((t) => t.client_user_id),
  );
  return base.filter((u) => tagged.has(u));
}

/**
 * Escolhe um vencedor de forma determinística dado um `rng` em [0,1).
 * Lança se a lista estiver vazia — o chamador deve validar antes de gravar.
 */
export function escolherVencedor(userIds: string[], rng: () => number = Math.random): string {
  if (userIds.length === 0) throw new Error("Nenhum cliente elegível.");
  const idx = Math.floor(rng() * userIds.length);
  // clamp para o caso patológico rng() === 1
  return userIds[Math.min(idx, userIds.length - 1)];
}
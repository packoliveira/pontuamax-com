import { describe, it, expect } from "vitest";
import {
  elegiveisSorteio,
  escolherVencedor,
  nivelPermitido,
  type RaffleClient,
  type RaffleTagLink,
} from "../raffle-logic";

const clients: RaffleClient[] = [
  { user_id: "u-bronze-1", nivel: "bronze" },
  { user_id: "u-bronze-2", nivel: "bronze" },
  { user_id: "u-prata-1", nivel: "prata" },
  { user_id: "u-ouro-1", nivel: "ouro" },
];

const tags: RaffleTagLink[] = [
  { client_user_id: "u-bronze-1", tag: "vip" },
  { client_user_id: "u-prata-1", tag: "vip" },
  { client_user_id: "u-ouro-1", tag: "outra" },
];

describe("nivelPermitido", () => {
  it("aceita todos quando não há filtro ou é bronze", () => {
    for (const n of ["bronze", "prata", "ouro"] as const) {
      expect(nivelPermitido(n, null)).toBe(true);
      expect(nivelPermitido(n, undefined)).toBe(true);
      expect(nivelPermitido(n, "bronze")).toBe(true);
    }
  });
  it("prata inclui prata e ouro, exclui bronze", () => {
    expect(nivelPermitido("bronze", "prata")).toBe(false);
    expect(nivelPermitido("prata", "prata")).toBe(true);
    expect(nivelPermitido("ouro", "prata")).toBe(true);
  });
  it("ouro só aceita ouro", () => {
    expect(nivelPermitido("bronze", "ouro")).toBe(false);
    expect(nivelPermitido("prata", "ouro")).toBe(false);
    expect(nivelPermitido("ouro", "ouro")).toBe(true);
  });
});

describe("elegiveisSorteio", () => {
  it("sem filtros, devolve todos os clientes", () => {
    expect(elegiveisSorteio(clients, tags, {}).sort()).toEqual([
      "u-bronze-1",
      "u-bronze-2",
      "u-ouro-1",
      "u-prata-1",
    ]);
  });
  it("filtra por nível mínimo prata", () => {
    const out = elegiveisSorteio(clients, tags, { filtro_nivel_min: "prata" });
    expect(out.sort()).toEqual(["u-ouro-1", "u-prata-1"]);
  });
  it("filtra por nível mínimo ouro", () => {
    expect(elegiveisSorteio(clients, tags, { filtro_nivel_min: "ouro" })).toEqual(["u-ouro-1"]);
  });
  it("filtra por tag (intersecção com o nível)", () => {
    const out = elegiveisSorteio(clients, tags, { filtro_tag: "vip" });
    expect(out.sort()).toEqual(["u-bronze-1", "u-prata-1"]);
  });
  it("combina tag + nível mínimo", () => {
    const out = elegiveisSorteio(clients, tags, {
      filtro_tag: "vip",
      filtro_nivel_min: "prata",
    });
    expect(out).toEqual(["u-prata-1"]);
  });
  it("tag inexistente devolve vazio", () => {
    expect(elegiveisSorteio(clients, tags, { filtro_tag: "nope" })).toEqual([]);
  });
  it("ignora tags de outros valores", () => {
    const out = elegiveisSorteio(clients, tags, { filtro_tag: "outra" });
    expect(out).toEqual(["u-ouro-1"]);
  });
});

describe("escolherVencedor", () => {
  it("é determinístico dado o mesmo rng", () => {
    const ids = ["a", "b", "c", "d"];
    const rng = () => 0.5; // índice 2
    expect(escolherVencedor(ids, rng)).toBe("c");
    expect(escolherVencedor(ids, rng)).toBe("c");
  });
  it("cobre o primeiro e o último elemento", () => {
    const ids = ["a", "b", "c"];
    expect(escolherVencedor(ids, () => 0)).toBe("a");
    expect(escolherVencedor(ids, () => 0.9999)).toBe("c");
  });
  it("faz clamp mesmo se rng() retornar 1", () => {
    expect(escolherVencedor(["a", "b"], () => 1)).toBe("b");
  });
  it("lança quando não há elegíveis", () => {
    expect(() => escolherVencedor([])).toThrow("Nenhum cliente elegível.");
  });
  it("distribui por todos os índices ao variar rng", () => {
    const ids = ["a", "b", "c", "d"];
    const seen = new Set<string>();
    for (let i = 0; i < ids.length; i++) {
      seen.add(escolherVencedor(ids, () => i / ids.length));
    }
    expect(seen).toEqual(new Set(ids));
  });
});

describe("fluxo integrado: filtros + escolha", () => {
  it("com filtros combinados restringe o universo antes do sorteio", () => {
    const pool = elegiveisSorteio(clients, tags, {
      filtro_tag: "vip",
      filtro_nivel_min: "prata",
    });
    const winner = escolherVencedor(pool, () => 0);
    expect(pool).toEqual(["u-prata-1"]);
    expect(winner).toBe("u-prata-1");
  });
});

import { describe, it, expect } from "vitest";
import {
  extractOlistPayload,
  shouldProcessOlistEvent,
  computeRewards,
} from "../olist-webhook";

// -------------------------------------------------------------
// extractOlistPayload
// -------------------------------------------------------------
describe("extractOlistPayload", () => {
  it("lê payload nativo Olist (envelope { pedido })", () => {
    const out = extractOlistPayload({
      tipo: "faturamento_pedido",
      pedido: {
        numero: "346357722",
        total: "199,90",
        cliente: {
          nome: "Fulano de Tal",
          cpf_cnpj: "123.456.789-00",
          fones: [{ fone: "(11) 99999-9999" }],
        },
      },
    });
    expect(out).toEqual({
      idVenda: "346357722",
      valor: 199.9,
      cpf: "12345678900",
      telefone: "11999999999",
      nome: "Fulano de Tal",
      tipoEvento: "faturamento_pedido",
    });
  });

  it("lê payload simples (formato custom)", () => {
    const out = extractOlistPayload({
      id_venda_externa: "12345",
      valor: 50,
      cpf_cliente: "98765432100",
      telefone_cliente: "11988887777",
      nome_cliente: "Beltrano",
    });
    expect(out.idVenda).toBe("12345");
    expect(out.valor).toBe(50);
    expect(out.cpf).toBe("98765432100");
    expect(out.telefone).toBe("11988887777");
    expect(out.nome).toBe("Beltrano");
    expect(out.tipoEvento).toBe("");
  });

  it("notificação leve (sem valor) retorna valor 0", () => {
    const out = extractOlistPayload({
      tipo: "inclusao_pedido",
      pedido: { numero: "999", cliente: { cpf: "11122233344" } },
    });
    expect(out.idVenda).toBe("999");
    expect(out.valor).toBe(0);
    expect(out.cpf).toBe("11122233344");
    expect(out.tipoEvento).toBe("inclusao_pedido");
  });

  it("normaliza CPF e telefone removendo máscara", () => {
    const out = extractOlistPayload({
      pedido: {
        numero: "1",
        total: 10,
        cliente: { documento: "111.222.333-44", fone: "+55 (11) 9 9999-9999" },
      },
    });
    expect(out.cpf).toBe("11122233344");
    expect(out.telefone).toBe("5511999999999");
  });

  it("nome default é 'Cliente' quando ausente", () => {
    const out = extractOlistPayload({ pedido: { numero: "1", total: 10 } });
    expect(out.nome).toBe("Cliente");
  });

  it("tipoEvento normalizado para lowercase e trim", () => {
    expect(extractOlistPayload({ tipo: "  Faturamento_Pedido  " }).tipoEvento).toBe(
      "faturamento_pedido",
    );
  });
});

// -------------------------------------------------------------
// shouldProcessOlistEvent
// -------------------------------------------------------------
describe("shouldProcessOlistEvent", () => {
  it("processa qualquer tipo de evento (gate real é o valor)", () => {
    for (const evt of [
      "faturamento_pedido",
      "inclusao_pedido",
      "alteracao_pedido",
      "alteracao_situacao",
      "",
    ]) {
      expect(shouldProcessOlistEvent("olist", evt).process).toBe(true);
    }
    expect(shouldProcessOlistEvent("bling", "qualquer").process).toBe(true);
    expect(shouldProcessOlistEvent("tiny", "").process).toBe(true);
  });
});

// -------------------------------------------------------------
// computeRewards
// -------------------------------------------------------------
describe("computeRewards", () => {
  const lojaAmbos = { modalidade: "ambos", regra_pontos: 1, percentual_cashback: 5 };

  it("modalidade 'ambos' credita pontos e cashback", () => {
    const r = computeRewards(100, lojaAmbos, 0, 0);
    expect(r.pontos).toBe(100); // 100 * 1
    expect(r.cashback).toBe(5); // 100 * 5% = 5.00
    expect(r.novoPontos).toBe(100);
    expect(r.novoCashback).toBe(5);
    expect(r.nivel).toBe("bronze");
  });

  it("modalidade 'pontos' zera cashback", () => {
    const r = computeRewards(
      100,
      { modalidade: "pontos", regra_pontos: 2, percentual_cashback: 10 },
      0,
      0,
    );
    expect(r.pontos).toBe(200);
    expect(r.cashback).toBe(0);
    expect(r.nivel).toBe("prata");
  });

  it("modalidade 'cashback' zera pontos", () => {
    const r = computeRewards(
      50,
      { modalidade: "cashback", regra_pontos: 1, percentual_cashback: 10 },
      0,
      0,
    );
    expect(r.pontos).toBe(0);
    expect(r.cashback).toBe(5);
    expect(r.nivel).toBe("bronze");
  });

  it("soma ao saldo anterior sem erro de ponto flutuante", () => {
    // 0.1 + 0.2 no float dá 0.30000000000000004 — testamos o arredondamento
    const r = computeRewards(2, { modalidade: "cashback", regra_pontos: 0, percentual_cashback: 10 }, 0, 0.1);
    // cashback: 2 * 10 / 100 = 0.2 ; novoCashback = 0.1 + 0.2 = 0.30
    expect(r.cashback).toBe(0.2);
    expect(r.novoCashback).toBe(0.3);
  });

  it("nivel escala com pontos acumulados", () => {
    const cfg = { modalidade: "pontos", regra_pontos: 1, percentual_cashback: 0 };
    expect(computeRewards(50, cfg, 0, 0).nivel).toBe("bronze");
    expect(computeRewards(50, cfg, 50, 0).nivel).toBe("bronze"); // 100 -> bronze (limite)
    expect(computeRewards(50, cfg, 60, 0).nivel).toBe("prata"); // 110 -> prata (>100)
    expect(computeRewards(1, cfg, 100, 0).nivel).toBe("prata"); // 101
    expect(computeRewards(1, cfg, 300, 0).nivel).toBe("ouro"); // 301
  });

  it("valor fracionário: pontos truncam com floor", () => {
    const r = computeRewards(
      99.9,
      { modalidade: "pontos", regra_pontos: 1, percentual_cashback: 0 },
      0,
      0,
    );
    expect(r.pontos).toBe(99); // floor(99.9)
  });
});

// -------------------------------------------------------------
// Integração das 3 funções (fluxo do webhook)
// -------------------------------------------------------------
describe("Fluxo Olist: extract → shouldProcess → computeRewards", () => {
  const loja = { modalidade: "ambos", regra_pontos: 1, percentual_cashback: 5 };

  it("faturamento_pedido: processa e credita corretamente", () => {
    const payload = {
      tipo: "faturamento_pedido",
      pedido: {
        numero: "42",
        total: 150.0,
        cliente: { nome: "A", cpf_cnpj: "11122233344", fone: "11999999999" },
      },
    };
    const ext = extractOlistPayload(payload);
    expect(shouldProcessOlistEvent("olist", ext.tipoEvento).process).toBe(true);
    const r = computeRewards(ext.valor, loja, 0, 0);
    expect(r.pontos).toBe(150);
    expect(r.cashback).toBe(7.5);
  });

  it("inclusao_pedido com total no payload: processa normalmente", () => {
    const payload = {
      tipo: "inclusao_pedido",
      pedido: {
        numero: "42",
        total: 150.0,
        cliente: { nome: "A", cpf_cnpj: "11122233344" },
      },
    };
    const ext = extractOlistPayload(payload);
    expect(shouldProcessOlistEvent("olist", ext.tipoEvento).process).toBe(true);
    const r = computeRewards(ext.valor, loja, 0, 0);
    expect(r.pontos).toBe(150);
  });
});
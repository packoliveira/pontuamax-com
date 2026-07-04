import { describe, it, expect } from "vitest";
import {
  validarResgateProduto,
  validarResgateCashback,
  validarResgateCombinado,
} from "../redemption-validation";

describe("validarResgateProduto — pontos insuficientes", () => {
  it("rejeita quando saldo < custo do produto", () => {
    const r = validarResgateProduto({ saldoPontos: 50, custoPontos: 100, produtoNome: "Camiseta" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/Pontos insuficientes/);
      expect(r.error).toMatch(/Camiseta/);
      expect(r.error).toMatch(/Faltam 50 pts/);
    }
  });

  it("aceita quando saldo é exatamente igual ao custo", () => {
    expect(validarResgateProduto({ saldoPontos: 100, custoPontos: 100 })).toEqual({ ok: true });
  });

  it("rejeita produto inativo mesmo com saldo suficiente", () => {
    const r = validarResgateProduto({ saldoPontos: 500, custoPontos: 100, produtoAtivo: false });
    expect(r.ok).toBe(false);
  });
});

describe("validarResgateCashback — acima do saldo", () => {
  it("rejeita valor maior que o saldo disponível", () => {
    const r = validarResgateCashback({ saldoCashback: 20, valor: 50 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/Cashback insuficiente/);
      expect(r.error).toMatch(/R\$ 50\.00/);
      expect(r.error).toMatch(/R\$ 20\.00/);
    }
  });

  it("rejeita valores <= 0", () => {
    expect(validarResgateCashback({ saldoCashback: 100, valor: 0 }).ok).toBe(false);
    expect(validarResgateCashback({ saldoCashback: 100, valor: -10 }).ok).toBe(false);
  });

  it("aceita valor exatamente igual ao saldo", () => {
    expect(validarResgateCashback({ saldoCashback: 33.5, valor: 33.5 })).toEqual({ ok: true });
  });
});

describe("validarResgateCombinado — pontos + cashback na mesma compra", () => {
  it("aceita quando ambos os saldos cobrem suas parcelas", () => {
    const r = validarResgateCombinado({
      saldoPontos: 300,
      custoPontos: 200,
      saldoCashback: 50,
      valorCashback: 25,
    });
    expect(r).toEqual({ ok: true });
  });

  it("falha em pontos primeiro quando ambos são insuficientes", () => {
    const r = validarResgateCombinado({
      saldoPontos: 10,
      custoPontos: 200,
      saldoCashback: 5,
      valorCashback: 25,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Pontos insuficientes/);
  });

  it("falha em cashback quando só o cashback é insuficiente", () => {
    const r = validarResgateCombinado({
      saldoPontos: 300,
      custoPontos: 200,
      saldoCashback: 10,
      valorCashback: 25,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Cashback insuficiente/);
  });

  it("bloqueia gastar cashback duas vezes na mesma compra", () => {
    // simulação: primeiro resgate consome saldo, segundo tenta usar de novo.
    const saldoInicial = 40;
    const primeiro = validarResgateCashback({ saldoCashback: saldoInicial, valor: 30 });
    expect(primeiro).toEqual({ ok: true });
    const saldoRestante = saldoInicial - 30;
    const segundo = validarResgateCashback({ saldoCashback: saldoRestante, valor: 30 });
    expect(segundo.ok).toBe(false);
  });
});
export type Modalidade = "pontos" | "cashback" | "ambos";
export type Nivel = "bronze" | "prata" | "ouro";

export const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function calcularNivel(pontos: number): Nivel {
  if (pontos <= 100) return "bronze";
  if (pontos <= 300) return "prata";
  return "ouro";
}

export function progressoNivel(pontos: number) {
  const nivel = calcularNivel(pontos);
  if (nivel === "bronze")
    return { atual: pontos, alvo: 101, proximo: "prata" as const, pct: (pontos / 101) * 100 };
  if (nivel === "prata")
    return { atual: pontos - 101, alvo: 200, proximo: "ouro" as const, pct: ((pontos - 101) / 200) * 100 };
  return { atual: pontos, alvo: pontos, proximo: null, pct: 100 };
}

export function gerarVoucher() {
  const p = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `QSF-${p()}-${p()}`;
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 30) || "loja"
  );
}

export function phoneToEmail(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@cliente.qsfclub.local`;
}

export function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}
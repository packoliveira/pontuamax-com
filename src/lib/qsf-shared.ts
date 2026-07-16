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
    return {
      atual: pontos - 101,
      alvo: 200,
      proximo: "ouro" as const,
      pct: ((pontos - 101) / 200) * 100,
    };
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

export function cpfToEmail(cpf: string) {
  const digits = cpf.replace(/\D/g, "");
  // IMPORTANTE: mantenha um único domínio para e-mail sintético do cliente
  // final. Qualquer novo fluxo que precise gerar login sintético DEVE
  // importar esta função — não reimplementar a string em outros lugares —
  // para evitar duplicidade de conta pelo mesmo CPF.
  return `${digits}@cliente.qsfclub.local`;
}

export function formatCPF(v: string) {
  const d = (v ?? "").replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function isValidCPF(cpf: string): boolean {
  const d = (cpf ?? "").replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (const c of base) sum += Number(c) * factor--;
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(d.slice(0, 9), 10);
  const d2 = calc(d.slice(0, 10), 11);
  return d1 === Number(d[9]) && d2 === Number(d[10]);
}

export function formatPhone(v: string) {
  const d = onlyDigits(v ?? "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4}).*/, (_, a, b, c) =>
      c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a}` : "",
    );
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, (_, a, b, c) =>
    c ? `(${a}) ${b}-${c}` : `(${a}) ${b}`,
  );
}

export function formatCNPJ(v: string) {
  const d = onlyDigits(v ?? "").slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

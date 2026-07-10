// Mapeamento de mensagens de erro do Supabase Auth (em inglês) para pt-BR.
// Usado em todas as telas de login/cadastro do sistema.

const MAP: Array<[RegExp, string]> = [
  [/user already registered/i, "Esse CPF já está cadastrado. Faça login abaixo."],
  [/user already exists/i, "Esse CPF já está cadastrado. Faça login abaixo."],
  [/already been registered/i, "Esse CPF já está cadastrado. Faça login abaixo."],
  [/invalid login credentials/i, "CPF ou senha incorretos."],
  [/invalid.*credentials/i, "CPF ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu email antes de entrar."],
  [/password should be at least (\d+) characters/i, "A senha precisa ter no mínimo $1 caracteres."],
  [/password.*at least/i, "A senha precisa ter no mínimo 6 caracteres."],
  [/weak password/i, "Senha muito fraca. Use letras e números."],
  [/rate limit|too many requests/i, "Muitas tentativas. Aguarde alguns segundos e tente novamente."],
  [/network|failed to fetch/i, "Sem conexão com o servidor. Verifique sua internet."],
  [/email.*invalid|invalid.*email/i, "Email inválido."],
  [/user not found/i, "Conta não encontrada."],
  [/signup.*disabled|signups not allowed/i, "Novos cadastros estão desativados no momento."],
  [/new password should be different/i, "A nova senha precisa ser diferente da anterior."],
  [/token.*expired|jwt expired/i, "Sua sessão expirou. Entre novamente."],
];

export function traduzirErroAuth(err: unknown): string {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!msg) return "Ocorreu um erro. Tente novamente.";
  for (const [re, pt] of MAP) {
    const m = msg.match(re);
    if (m) return pt.replace("$1", m[1] ?? "");
  }
  // Fallback: mostra a mensagem original para facilitar diagnóstico ao invés
  // de esconder o problema atrás de um texto genérico.
  return msg;
}

export function isCredenciaisInvalidas(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return /invalid login credentials|invalid.*credentials|user not found/i.test(msg);
}

export function isUsuarioJaCadastrado(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return /already registered|already exists|already been registered/i.test(msg);
}

// ---------------------------------------------------------------------------
// Validadores de campo — usados nas telas de login/cadastro para mostrar
// mensagens específicas por campo (email, cpf, senha) em vez de um toast
// genérico. Retornam `null` quando o valor é válido, ou uma string com o
// motivo do erro em pt-BR.
// ---------------------------------------------------------------------------

export function validarEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return "Informe seu email.";
  // Regex simples: algo@algo.algo — suficiente pra pegar erros óbvios de digitação.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Email inválido. Confira se digitou correto (ex.: nome@empresa.com).";
  return null;
}

export function validarSenha(senha: string, min = 6): string | null {
  if (!senha) return "Informe sua senha.";
  if (senha.length < min) return `A senha precisa ter no mínimo ${min} caracteres. Você digitou ${senha.length}.`;
  return null;
}

export function validarConfirmacaoSenha(senha: string, confirmacao: string): string | null {
  if (!confirmacao) return "Confirme sua senha.";
  if (senha !== confirmacao) return "As senhas não coincidem. Digite a mesma senha nos dois campos.";
  return null;
}

// Valida CPF pelo algoritmo dos dígitos verificadores. Aceita string com ou
// sem máscara; usa só os dígitos.
export function validarCPF(cpf: string): string | null {
  const digits = (cpf || "").replace(/\D/g, "");
  if (!digits) return "Informe seu CPF.";
  if (digits.length !== 11) return `CPF deve ter 11 dígitos. Você digitou ${digits.length}.`;
  if (/^(\d)\1{10}$/.test(digits)) return "CPF inválido (dígitos repetidos).";
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factor - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = calc(digits.slice(0, 9), 10);
  const d2 = calc(digits.slice(0, 10), 11);
  if (d1 !== parseInt(digits[9], 10) || d2 !== parseInt(digits[10], 10)) {
    return "CPF inválido. Confira os números digitados.";
  }
  return null;
}
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
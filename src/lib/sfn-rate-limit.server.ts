import { getRequest } from "@tanstack/react-start/server";
import { checkRateLimit, getClientIp } from "./rate-limit.server";

// Rate limit helper para server functions sensíveis (público ou por usuário).
// Escopo: `sfn:${scope}:${ip}`. Lança erro amigável ao estourar o limite.
export async function rateLimitByIp(
  scope: string,
  max: number,
  windowSec: number,
): Promise<void> {
  const req = getRequest();
  const ip = getClientIp(req as unknown as Request);
  const ok = await checkRateLimit(`sfn:${scope}:${ip}`, max, windowSec);
  if (!ok) {
    throw new Error(
      "Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente novamente.",
    );
  }
}

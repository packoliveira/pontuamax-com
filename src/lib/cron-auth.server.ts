function safeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
}

export function authorizeCronRequest(
  request: Request,
): { ok: true } | { ok: false; response: Response } {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 32) {
    console.error("[cron] CRON_SECRET ausente ou menor que 32 caracteres");
    return {
      ok: false,
      response: Response.json({ error: "cron_not_configured" }, { status: 503 }),
    };
  }

  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const provided = request.headers.get("x-cron-secret") ?? bearer;

  if (!provided || !safeEqual(provided, expected)) {
    return {
      ok: false,
      response: Response.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}

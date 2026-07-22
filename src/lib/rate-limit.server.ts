import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Rate limiter simples baseado na tabela public.rate_limits.
// Chave = string identificando origem+rota (ex: "webhook:1.2.3.4").
// Retorna true se a chamada foi permitida, false se estourou o limite.
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = new Date();
  const cutoffIso = new Date(now.getTime() - windowSeconds * 1000).toISOString();
  const nowIso = now.toISOString();

  const existing = await supabaseAdmin
    .from("rate_limits" as never)
    .select("count, window_start")
    .eq("key", key)
    .maybeSingle();

  const row = existing.data as { count: number; window_start: string } | null;

  if (!row || row.window_start < cutoffIso) {
    await supabaseAdmin.from("rate_limits" as never).upsert(
      {
        key,
        count: 1,
        window_start: nowIso,
        updated_at: nowIso,
      } as never,
      { onConflict: "key" },
    );
    return true;
  }

  if (row.count >= maxRequests) return false;

  await supabaseAdmin
    .from("rate_limits" as never)
    .update({ count: row.count + 1, updated_at: nowIso } as never)
    .eq("key", key);
  return true;
}

// Extrai o IP do cliente dos headers padrão de proxy (Cloudflare / Vercel / etc).
export function getClientIp(request: Request | null | undefined): string {
  if (!request) return "unknown";
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
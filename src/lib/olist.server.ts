// Server-only helper for Olist Tiny API V3 (OAuth2).
// This module is NEVER imported from client code — file suffix `.server.ts`
// is blocked by import protection.

import { createHmac, timingSafeEqual, randomBytes } from "crypto";

export const OLIST_OAUTH_BASE = "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect";
export const OLIST_API_BASE = "https://api.tiny.com.br/public-api/v3";
const DEFAULT_OLIST_REDIRECT_ORIGIN = "https://pontuamax-com.lovable.app";

function cleanOrigin(value?: string | null): string | null {
  const origin = value?.trim().replace(/\/+$/, "");
  return origin && /^https:\/\//i.test(origin) ? origin : null;
}

export function getPublicOrigin(request: Request): string {
  // Prefer explicit env, fallback to request URL origin (handles preview + prod).
  return (
    process.env.PUBLIC_APP_ORIGIN ?? process.env.VITE_APP_ORIGIN ?? new URL(request.url).origin
  );
}

export function getOlistRedirectOrigin(request?: Request): string {
  return (
    cleanOrigin(process.env.OLIST_REDIRECT_ORIGIN) ??
    (request ? cleanOrigin(new URL(request.url).origin) : null) ??
    DEFAULT_OLIST_REDIRECT_ORIGIN
  );
}

export function olistRedirectUri(request?: Request): string {
  return `${getOlistRedirectOrigin(request)}/api/public/oauth/olist/callback`;
}

// --- state signing (HMAC + nonce) ------------------------------------------------
const stateSecret = () => {
  const s = process.env.OAUTH_STATE_SECRET;
  if (!s) throw new Error("OAUTH_STATE_SECRET não configurado");
  return s;
};

export function signState(payload: { storeId: string; nonce: string }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string): { storeId: string; nonce: string } | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function newNonce(): string {
  return randomBytes(16).toString("hex");
}

// --- OAuth2 token endpoints -----------------------------------------------------

function requireClientCreds() {
  const id = process.env.OLIST_CLIENT_ID;
  const secret = process.env.OLIST_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      "OLIST_CLIENT_ID / OLIST_CLIENT_SECRET não configurados. Registre o PontuaMax como aplicativo no portal Tiny/Olist.",
    );
  }
  return { id, secret };
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const { id } = requireClientCreds();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: id,
    redirect_uri: redirectUri,
    scope: "openid",
    state,
  });
  return `${OLIST_OAUTH_BASE}/auth?${params.toString()}`;
}

export type OlistTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  scope?: string;
  token_type: string;
};

async function tokenRequest(body: URLSearchParams): Promise<OlistTokenResponse> {
  const { id, secret } = requireClientCreds();
  body.set("client_id", id);
  body.set("client_secret", secret);
  const resp = await fetch(`${OLIST_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Olist token endpoint ${resp.status}: ${text}`);
  }
  return JSON.parse(text) as OlistTokenResponse;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<OlistTokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<OlistTokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

// --- REST calls (get pedido) ----------------------------------------------------

export async function fetchPedido(accessToken: string, pedidoId: string | number) {
  const resp = await fetch(`${OLIST_API_BASE}/pedidos/${pedidoId}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Olist GET /pedidos/${pedidoId} ${resp.status}: ${t}`);
  }
  return (await resp.json()) as Record<string, unknown>;
}

// Lista pedidos alterados desde `sinceIso`. Trata paginação simples.
// Olist Tiny V3 aceita `dataAtualizacaoInicial` (yyyy-mm-dd HH:mm:ss) — se o
// formato variar em outra versão, ajustar aqui em um único ponto.
export async function listPedidosAlterados(
  accessToken: string,
  sinceIso: string,
  opts?: { limit?: number; offset?: number },
) {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  // Formata `YYYY-MM-DD HH:mm:ss` (UTC) que a API V3 aceita.
  const d = new Date(sinceIso);
  const iso = d.toISOString().replace("T", " ").slice(0, 19);
  const params = new URLSearchParams({
    dataAtualizacaoInicial: iso,
    limit: String(limit),
    offset: String(offset),
  });
  const url = `${OLIST_API_BASE}/pedidos?${params.toString()}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Olist GET /pedidos ${resp.status}: ${t}`);
  }
  const body = (await resp.json()) as Record<string, unknown>;
  // Aceita { itens: [...] } ou { data: [...] } ou array direto — API é inconsistente entre revisões.
  const items =
    (body.itens as unknown[]) ??
    (body.data as unknown[]) ??
    (body.pedidos as unknown[]) ??
    (Array.isArray(body) ? (body as unknown[]) : []);
  return items as Array<Record<string, unknown>>;
}

// --- Webhook signature (HMAC-SHA256 do body cru) -------------------------------

export function verifyWebhookSignature(rawBody: string, headerSig: string | null): boolean {
  const secret = process.env.OLIST_WEBHOOK_SIGNING_SECRET;
  if (!secret || !headerSig) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(headerSig.trim().toLowerCase());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

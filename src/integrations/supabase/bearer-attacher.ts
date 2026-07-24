// Project-specific bearer attacher.
// Replaces the generated `attachSupabaseAuth`, which called
// `supabase.auth.getSession()` on every server-fn RPC and — via the
// auto refresh path — triggered a JWKS round-trip on every page load.
//
// Strategy:
//  - Read the session ONCE on module init.
//  - Subscribe to `onAuthStateChange` and keep the access token in memory.
//  - Only fall back to `getSession()` if the in-memory token is missing
//    (e.g. very first request before the listener has fired).
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

let cachedToken: string | null = null;
let subscribed = false;

function ensureSubscribed() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  supabase.auth.getSession().then(({ data }) => {
    cachedToken = data.session?.access_token ?? null;
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedToken = session?.access_token ?? null;
  });
}

function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /unauthorized|invalid token|invalid jwt|jwt expired|unable to parse or verify signature|unrecognized jwt kid|jwks/i.test(
    msg,
  );
}

async function refreshToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return null;
    const token = data.session?.access_token ?? null;
    cachedToken = token;
    return token;
  } catch {
    return null;
  }
}

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    ensureSubscribed();
    let token = cachedToken;
    if (!token && typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? null;
      cachedToken = token;
    }
    try {
      return await next({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (err) {
      // Token may have been signed by a rotated key (kid <nil>) or expired
      // right before this call. Refresh once and retry — this recovers
      // transparently after Supabase signing-key rotations without forcing
      // the user to sign out.
      if (!isAuthError(err) || typeof window === "undefined") throw err;
      const fresh = await refreshToken();
      if (!fresh || fresh === token) throw err;
      return await next({ headers: { Authorization: `Bearer ${fresh}` } });
    }
  },
);

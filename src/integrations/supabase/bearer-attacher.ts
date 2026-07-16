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

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    ensureSubscribed();
    let token = cachedToken;
    if (!token && typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? null;
      cachedToken = token;
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
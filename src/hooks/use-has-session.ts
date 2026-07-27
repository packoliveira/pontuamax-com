import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Indica se existe sessão Supabase no navegador.
 * Server functions protegidas só devem ser chamadas quando isso for `true`,
 * senão o middleware responde "Unauthorized: No authorization header provided".
 */
export function useHasSession() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setHasSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return hasSession;
}

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LojistaShell } from "@/components/lojista-shell";
import { supabase } from "@/integrations/supabase/client";
import { usePanelTheme } from "@/hooks/use-panel-theme";

export const Route = createFileRoute("/lojista")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const publicos = ["/lojista/login", "/lojista/onboarding"];
    if (publicos.includes(location.pathname)) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/lojista/login" });
    // Bloqueia acesso ao painel se assinatura não estiver ativa
    if (location.pathname !== "/lojista/aguardando") {
      const { data: store } = await supabase
        .from("stores")
        .select("subscription_status")
        .eq("owner_id", data.session.user.id)
        .maybeSingle();
      if (store && store.subscription_status !== "active") {
        throw redirect({ to: "/lojista/aguardando" });
      }
    }
  },
  component: LojistaLayout,
});

function LojistaLayout() {
  usePanelTheme();
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
  });
  if (!session) return <Outlet />;
  // Tela aguardando é standalone (sem shell)
  if (typeof window !== "undefined" && window.location.pathname === "/lojista/aguardando") {
    return <Outlet />;
  }
  return (
    <LojistaShell>
      <Outlet />
    </LojistaShell>
  );
}
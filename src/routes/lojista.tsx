import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { LojistaShell } from "@/components/lojista-shell";
import { supabase } from "@/integrations/supabase/client";
import { usePanelTheme } from "@/hooks/use-panel-theme";

export const Route = createFileRoute("/lojista")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel do Lojista — PontuaMax" },
      { name: "apple-mobile-web-app-title", content: "PM Lojista" },
      { name: "theme-color", content: "#0B132B" },
    ],
    links: [
      { rel: "manifest", href: "/manifest-lojista.webmanifest" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const publicos = ["/lojista/login", "/lojista/onboarding"];
    if (publicos.includes(location.pathname)) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/lojista/login" });
    // Sem loja ainda? Manda pro onboarding.
    // Se tem loja mas assinatura não está ativa, tela de aguardando.
    if (location.pathname !== "/lojista/aguardando") {
      const { data: store } = await supabase
        .from("stores")
        .select("subscription_status")
        .eq("owner_id", data.session.user.id)
        .maybeSingle();
      if (!store) {
        // Não é dono de loja — pode ser funcionário ou admin master.
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id);
        const isAdmin = (roles ?? []).some((r) => r.role === "admin");
        if (isAdmin) {
          // Admin master não é lojista — volta pro painel dele.
          throw redirect({ to: "/admin" });
        }
        const { data: emp } = await supabase
          .from("store_employees")
          .select("id")
          .eq("user_id", data.session.user.id)
          .eq("status", "ativo")
          .maybeSingle();
        if (emp) throw redirect({ to: "/funcionario" });
        throw redirect({ to: "/lojista/onboarding" });
      }
      if (store.subscription_status !== "active") {
        throw redirect({ to: "/lojista/aguardando" });
      }
    }
  },
  component: LojistaLayout,
});

function LojistaLayout() {
  usePanelTheme({ scope: true });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Rotas públicas / standalone: sem shell
  const standalone = ["/lojista/login", "/lojista/onboarding", "/lojista/aguardando"];
  if (standalone.includes(pathname)) return <Outlet />;
  return (
    <LojistaShell>
      <Outlet />
    </LojistaShell>
  );
}

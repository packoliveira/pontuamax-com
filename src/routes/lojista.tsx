import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LojistaShell } from "@/components/lojista-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/lojista")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const publicos = ["/lojista/login", "/lojista/onboarding"];
    if (publicos.includes(location.pathname)) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/lojista/login" });
  },
  component: LojistaLayout,
});

function LojistaLayout() {
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
  });
  if (!session) return <Outlet />;
  return (
    <LojistaShell>
      <Outlet />
    </LojistaShell>
  );
}
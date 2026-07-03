import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LojistaShell } from "@/components/lojista-shell";
import { useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/lojista")({
  ssr: false,
  beforeLoad: ({ location }) => {
    const authed = useStore.getState().authedLojaId;
    const publicos = ["/lojista/login", "/lojista/onboarding"];
    if (!authed && !publicos.includes(location.pathname)) {
      throw redirect({ to: "/lojista/login" });
    }
  },
  component: LojistaLayout,
});

function LojistaLayout() {
  const authed = useStore((s) => s.authedLojaId);
  if (!authed) return <Outlet />;
  return (
    <LojistaShell>
      <Outlet />
    </LojistaShell>
  );
}
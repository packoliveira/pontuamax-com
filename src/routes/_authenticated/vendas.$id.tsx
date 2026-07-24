/**
 * Stub mínimo — rota histórica redirecionada para /dashboard.
 * Este arquivo existe apenas para manter o build limpo até ser removido pelo CLI do TanStack Router.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/vendas/$id")({
  beforeLoad: () => { throw redirect({ to: "/dashboard" }); },
  component: () => null,
});

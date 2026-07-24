import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // SWR agressivo: dado é fresh por 30s, mantido em cache por 5min.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Foco de janela causava refetches em massa; reconexão continua ativa.
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload no hover/focus → clique fica instantâneo.
    defaultPreload: "intent",
    defaultPreloadDelay: 40,
    // Query controla a validade; router não descarta preloads cedo.
    defaultPreloadStaleTime: 0,
    // Skeleton só aparece se a rota realmente demora, evita "piscadas".
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
  });

  return router;
};

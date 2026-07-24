// API pública das funções de fidelidade do PontuaMax.
// As implementações vivem em arquivos menores, agrupadas por domínio.
export * from "./stores.functions";
export * from "./clients.functions";
export * from "./sales.functions";
export * from "./vouchers.functions";
export * from "./giftcards.functions";
export * from "./whatsapp.functions";
export * from "./campaigns.functions";
export * from "./fiscal-notes.functions";
export * from "./raffles.functions";

// re-export usado pelo cron `/api/public/hooks/campanhas-agendadas`
export { processarEnvioCampanha as _processarEnvioCampanhaInternal } from "./loyalty-helpers.server";

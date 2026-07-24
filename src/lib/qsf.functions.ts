// Barrel: re-exports agrupados por domínio. Server functions vivem em arquivos
// menores para facilitar leitura e revisão. Nenhum importador externo precisa
// mudar — todo mundo continua importando de "@/lib/qsf.functions".
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
export { processarEnvioCampanha as _processarEnvioCampanhaInternal } from "./qsf-helpers.server";

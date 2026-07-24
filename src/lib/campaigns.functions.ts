import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  selecionarDestinatarios,
  processarEnvioCampanha,
} from "./qsf-helpers.server";

export const criarCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        nome: z.string().min(1).max(100),
        mensagem: z.string().min(1).max(2000),
        segmento: z.enum([
          "todos",
          "bronze",
          "prata",
          "ouro",
          "inativos_30",
          "inativos_60",
          "inativos_90",
          "aniversariantes",
        ]),
        agendada_para: z.string().datetime().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const destinatarios = await selecionarDestinatarios(loja.data.id, data.segmento);
    const agendada =
      data.agendada_para && new Date(data.agendada_para).getTime() > Date.now()
        ? data.agendada_para
        : null;
    const { data: camp, error } = await supabaseAdmin
      .from("campaigns")
      .insert({
        store_id: loja.data.id,
        nome: data.nome,
        mensagem: data.mensagem,
        segmento: data.segmento,
        total_destinatarios: destinatarios.length,
        status: agendada ? "agendada" : "rascunho",
        agendada_para: agendada,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: camp.id, total: destinatarios.length, agendada };
  });

export const enviarCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ campaign_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const camp = await supabaseAdmin
      .from("campaigns")
      .select("id, status, stores:store_id(owner_id)")
      .eq("id", data.campaign_id)
      .maybeSingle();
    if (!camp.data) throw new Error("Campanha não encontrada.");
    const ownerId = (camp.data.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (ownerId !== context.userId) throw new Error("Não autorizado.");
    if (camp.data.status === "enviando" || camp.data.status === "concluida") {
      throw new Error("Esta campanha já foi enviada.");
    }
    return processarEnvioCampanha(camp.data.id);
  });

export const excluirCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const previewDestinatarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        segmento: z.enum([
          "todos",
          "bronze",
          "prata",
          "ouro",
          "inativos_30",
          "inativos_60",
          "inativos_90",
          "aniversariantes",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const destinatarios = await selecionarDestinatarios(loja.data.id, data.segmento);
    return {
      total: destinatarios.length,
      amostra: destinatarios.slice(0, 5).map((d) => ({ nome: d.full_name, telefone: d.phone })),
    };
  });

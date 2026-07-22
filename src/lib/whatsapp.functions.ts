import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const salvarWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        evolution_url: z.string().max(300).optional().nullable(),
        evolution_apikey: z.string().max(300).optional().nullable(),
        evolution_instance: z.string().max(100).optional().nullable(),
        whatsapp_enabled: z.boolean(),
        whatsapp_template_pontos: z.string().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store.data) throw new Error("Loja não encontrada.");
    const { error } = await context.supabase
      .from("stores")
      .update({
        whatsapp_enabled: data.whatsapp_enabled,
        whatsapp_template_pontos: data.whatsapp_template_pontos,
      })
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    const { saveStoreSecrets } = await import("./store-secrets.server");
    await saveStoreSecrets(store.data.id, {
      evolution_url: data.evolution_url ?? null,
      evolution_apikey: data.evolution_apikey ?? null,
      evolution_instance: data.evolution_instance ?? null,
    });
    return { ok: true };
  });

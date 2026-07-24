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

// -------- WhatsApp: enviar mensagem de teste --------

export const enviarWhatsappTeste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        telefone: z.string().min(8).max(20),
        texto: z.string().min(1).max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, nome_fantasia")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const { getStoreSecrets } = await import("./store-secrets.server");
    const secrets = await getStoreSecrets(loja.data.id);
    if (!secrets.evolution_url || !secrets.evolution_apikey || !secrets.evolution_instance) {
      throw new Error("Configure URL, API key e instância da Evolution API antes de testar.");
    }
    const { formatBrazilPhone, sendWhatsappRaw } = await import("./notify.server");
    const numero = formatBrazilPhone(data.telefone);
    if (!numero) throw new Error("Telefone inválido.");
    const texto =
      data.texto ??
      `✅ Teste PontuaMax — ${loja.data.nome_fantasia}. Integração WhatsApp funcionando!`;
    const res = await sendWhatsappRaw({
      storeId: loja.data.id,
      url: secrets.evolution_url,
      apikey: secrets.evolution_apikey,
      instance: secrets.evolution_instance,
      number: numero,
      text: texto,
    });
    if (!res.ok) throw new Error(res.error ?? "Falha ao enviar");
    return { ok: true, numero };
  });

// -------- WhatsApp: conectar via QR Code (Evolution API) --------

export const conectarWhatsappQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, slug")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const { getStoreSecrets, saveStoreSecrets } = await import("./store-secrets.server");
    const secrets = await getStoreSecrets(loja.data.id);
    if (!secrets.evolution_url || !secrets.evolution_apikey) {
      throw new Error("Configure URL e API Key da Evolution API antes de conectar.");
    }
    const base = secrets.evolution_url.replace(/\/$/, "");
    const instance = secrets.evolution_instance || `qsf-${loja.data.slug}`;
    const headers = { "Content-Type": "application/json", apikey: secrets.evolution_apikey };
    let qr: string | null = null;
    // Tenta criar (idempotente na maioria das versões — se já existe, cai no connect)
    try {
      const createRes = await fetch(`${base}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName: instance,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });
      if (createRes.ok) {
        const j = (await createRes.json()) as { qrcode?: { base64?: string }; base64?: string };
        qr = j?.qrcode?.base64 ?? j?.base64 ?? null;
      }
    } catch {
      /* segue pro connect */
    }
    if (!qr) {
      const connRes = await fetch(`${base}/instance/connect/${encodeURIComponent(instance)}`, {
        headers,
      });
      if (!connRes.ok) {
        const body = await connRes.text();
        throw new Error(`Evolution API [${connRes.status}]: ${body.slice(0, 200)}`);
      }
      const j = (await connRes.json()) as { base64?: string; qrcode?: { base64?: string } };
      qr = j?.base64 ?? j?.qrcode?.base64 ?? null;
    }
    if (secrets.evolution_instance !== instance) {
      await saveStoreSecrets(loja.data.id, { evolution_instance: instance });
    }
    if (!qr) throw new Error("Instância já conectada ou QR indisponível.");
    return { instance, qr };
  });

// -------- WhatsApp: status da conexão --------

export const statusWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) return { state: "unconfigured" as string };
    const { getStoreSecrets } = await import("./store-secrets.server");
    const d = await getStoreSecrets(loja.data.id);
    if (!d?.evolution_url || !d?.evolution_apikey || !d?.evolution_instance) {
      return { state: "unconfigured" as string };
    }
    const base = d.evolution_url.replace(/\/$/, "");
    try {
      const res = await fetch(
        `${base}/instance/connectionState/${encodeURIComponent(d.evolution_instance)}`,
        {
          headers: { apikey: d.evolution_apikey },
        },
      );
      if (!res.ok) return { state: "error" };
      const j = (await res.json()) as { instance?: { state?: string }; state?: string };
      return { state: j?.instance?.state ?? j?.state ?? "unknown" };
    } catch {
      return { state: "error" };
    }
  });

// -------- WhatsApp: desconectar (logout) --------

export const desconectarWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) return { ok: true };
    const { getStoreSecrets } = await import("./store-secrets.server");
    const d = await getStoreSecrets(loja.data.id);
    if (!d?.evolution_url || !d?.evolution_apikey || !d?.evolution_instance) return { ok: true };
    const base = d.evolution_url.replace(/\/$/, "");
    await fetch(`${base}/instance/logout/${encodeURIComponent(d.evolution_instance)}`, {
      method: "DELETE",
      headers: { apikey: d.evolution_apikey },
    }).catch(() => null);
    return { ok: true };
  });


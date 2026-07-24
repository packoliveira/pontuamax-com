import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcularNivel } from "./loyalty-shared";
import { sha256Hex } from "./loyalty-helpers.server";

export const submitNotaFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        image_path: z.string().min(1),
        image_base64: z.string().min(100), // data URL sem prefix
        mime: z.string().default("image/jpeg"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, cnpj, regra_pontos, modalidade")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");

    const hash = await sha256Hex(data.image_base64);
    const dup = await supabaseAdmin
      .from("fiscal_notes")
      .select("id")
      .eq("store_id", data.store_id)
      .eq("image_hash", hash)
      .maybeSingle();
    if (dup.data) throw new Error("Esta nota já foi enviada.");

    // Chama Lovable AI
    const apiKey = process.env.LOVABLE_API_KEY;
    let valor: number | null = null;
    let cnpj: string | null = null;
    let ocrRaw: unknown = null;
    if (apiKey) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: 'Extraia o VALOR TOTAL (em reais, número) e o CNPJ do estabelecimento desta nota fiscal. Responda APENAS um JSON no formato: {"valor": 12.34, "cnpj": "00.000.000/0000-00"}. Se não conseguir ler algum campo, use null. Sem comentários.',
                  },
                  {
                    type: "image_url",
                    image_url: { url: `data:${data.mime};base64,${data.image_base64}` },
                  },
                ],
              },
            ],
          }),
        });
        const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        ocrRaw = j;
        const raw = j.choices?.[0]?.message?.content ?? "";
        const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
        const parsed = JSON.parse(jsonStr);
        valor =
          typeof parsed.valor === "number"
            ? parsed.valor
            : parsed.valor
              ? Number(
                  String(parsed.valor)
                    .replace(/[^\d.,]/g, "")
                    .replace(",", "."),
                )
              : null;
        cnpj = parsed.cnpj ? String(parsed.cnpj).replace(/\D/g, "") : null;
      } catch (e) {
        ocrRaw = { error: (e as Error).message };
      }
    }

    // Status inicial: pendente (lojista revisa)
    const { data: inserted, error } = await supabaseAdmin
      .from("fiscal_notes")
      .insert({
        store_id: data.store_id,
        client_user_id: context.userId,
        image_path: data.image_path,
        image_hash: hash,
        valor,
        cnpj_extraido: cnpj,
        ocr_raw: ocrRaw as never,
        status: "pendente",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const aprovarNotaFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        id: z.string().uuid(),
        valor_final: z.number().positive(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nota = await supabaseAdmin
      .from("fiscal_notes")
      .select("*, stores!inner(owner_id, regra_pontos, modalidade)")
      .eq("id", data.id)
      .maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    const n: any = nota.data;
    if (!n || n.stores.owner_id !== context.userId) throw new Error("Nota não encontrada.");
    if (n.status !== "pendente") throw new Error("Nota já processada.");

    const inclP = n.stores.modalidade !== "cashback";
    const pontos = inclP ? Math.floor(data.valor_final * Number(n.stores.regra_pontos)) : 0;

    // credita
    const link = await supabaseAdmin
      .from("store_clients")
      .select("*")
      .eq("store_id", n.store_id)
      .eq("user_id", n.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado.");
    const novoPontos = link.data.pontos + pontos;
    await supabaseAdmin
      .from("store_clients")
      .update({
        pontos: novoPontos,
        nivel: calcularNivel(novoPontos),
      })
      .eq("id", link.data.id);
    await supabaseAdmin.from("transactions").insert({
      store_id: n.store_id,
      client_user_id: n.client_user_id,
      tipo: "nota_fiscal",
      valor: data.valor_final,
      pontos_delta: pontos,
      status: "entregue",
    });
    await supabaseAdmin
      .from("fiscal_notes")
      .update({
        status: "aprovada",
        valor: data.valor_final,
        pontos_creditados: pontos,
      })
      .eq("id", data.id);

    const { notifyClient } = await import("./notify.server");
    await notifyClient({
      event: "pontos_ganhos",
      storeId: n.store_id,
      clientUserId: n.client_user_id,
      pontosGanhos: pontos,
    });
    return { pontos };
  });

export const rejeitarNotaFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({ id: z.string().uuid(), motivo: z.string().max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nota = await supabaseAdmin
      .from("fiscal_notes")
      .select("id, stores!inner(owner_id)")
      .eq("id", data.id)
      .maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    if (!nota.data || (nota.data as any).stores.owner_id !== context.userId)
      throw new Error("Nota não encontrada.");
    await supabaseAdmin
      .from("fiscal_notes")
      .update({ status: "rejeitada", motivo_rejeicao: data.motivo })
      .eq("id", data.id);
    return { ok: true };
  });

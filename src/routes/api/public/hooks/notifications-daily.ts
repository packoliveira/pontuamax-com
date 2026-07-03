import { createFileRoute } from "@tanstack/react-router";

type StoreRow = {
  id: string;
  slug: string;
  nome_fantasia: string;
  whatsapp_enabled: boolean;
  evolution_url: string | null;
  evolution_apikey: string | null;
  evolution_instance: string | null;
  notif_birthday_enabled: boolean;
  notif_birthday_bonus_points: number;
  notif_birthday_template: string;
  notif_inactivity_enabled: boolean;
  notif_inactivity_days: number;
  notif_inactivity_template: string;
  notif_expiry_enabled: boolean;
  notif_expiry_days: number;
  notif_expiry_warn_days: number;
  notif_expiry_template: string;
};

function render(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? "" : String(vars[k])));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function todayInBrasilia(): { iso: string; mm: string; dd: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { iso: `${parts.year}-${parts.month}-${parts.day}`, mm: parts.month, dd: parts.day };
}

export const Route = createFileRoute("/api/public/hooks/notifications-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!key || key !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendWhatsappRaw, formatBrazilPhone } = await import("@/lib/notify.server");
        const { calcularNivel } = await import("@/lib/qsf-shared");

        const today = todayInBrasilia();

        const { data: stores } = await supabaseAdmin
          .from("stores")
          .select(
            "id, slug, nome_fantasia, whatsapp_enabled, evolution_url, evolution_apikey, evolution_instance, notif_birthday_enabled, notif_birthday_bonus_points, notif_birthday_template, notif_inactivity_enabled, notif_inactivity_days, notif_inactivity_template, notif_expiry_enabled, notif_expiry_days, notif_expiry_warn_days, notif_expiry_template",
          )
          .eq("whatsapp_enabled", true)
          .eq("subscription_status", "active");

        const summary = { stores: 0, aniversario: 0, inatividade: 0, expiracao: 0, erros: 0 };
        if (!stores) return new Response(JSON.stringify(summary), { headers: { "Content-Type": "application/json" } });

        for (const store of stores as StoreRow[]) {
          if (!store.evolution_url || !store.evolution_apikey || !store.evolution_instance) continue;
          summary.stores += 1;

          const evo = {
            url: store.evolution_url,
            apikey: store.evolution_apikey,
            instance: store.evolution_instance,
          };

          const send = async (userId: string, text: string, tipo: string) => {
            const { data: prof } = await supabaseAdmin
              .from("profiles").select("phone, full_name").eq("id", userId).maybeSingle();
            const number = formatBrazilPhone(prof?.phone);
            if (!number) {
              await supabaseAdmin.from("notification_logs").insert({
                store_id: store.id, client_user_id: userId, tipo, status: "erro", mensagem_erro: "sem telefone",
              });
              summary.erros += 1;
              return false;
            }
            const res = await sendWhatsappRaw({ storeId: store.id, ...evo, number, text });
            await supabaseAdmin.from("notification_logs").insert({
              store_id: store.id, client_user_id: userId, tipo,
              status: res.ok ? "enviado" : "erro", mensagem_erro: res.ok ? null : res.error ?? null,
            });
            if (!res.ok) summary.erros += 1;
            await sleep(400);
            return res.ok;
          };

          // ---------- ANIVERSÁRIO ----------
          if (store.notif_birthday_enabled) {
            const monthDay = `${today.mm}-${today.dd}`;
            const { data: clients } = await supabaseAdmin
              .from("store_clients")
              .select("id, user_id, pontos, profiles:user_id(full_name, birthdate)")
              .eq("store_id", store.id)
              .or(`last_notified_birthday.is.null,last_notified_birthday.lt.${today.iso}`);
            for (const c of clients ?? []) {
              const p = c.profiles as unknown as { full_name: string | null; birthdate: string | null } | null;
              if (!p?.birthdate) continue;
              if (p.birthdate.slice(5) !== monthDay) continue;
              const bonus = store.notif_birthday_bonus_points;
              const novoPontos = c.pontos + bonus;
              if (bonus > 0) {
                await supabaseAdmin.from("transactions").insert({
                  store_id: store.id, client_user_id: c.user_id, tipo: "venda",
                  valor: 0, pontos_delta: bonus, cashback_delta: 0, status: "entregue",
                });
                await supabaseAdmin.from("store_clients")
                  .update({ pontos: novoPontos, nivel: calcularNivel(novoPontos) })
                  .eq("id", c.id);
              }
              const text = render(store.notif_birthday_template, {
                nome: p.full_name ?? "cliente", loja: store.nome_fantasia,
                bonus, pontos: novoPontos,
              });
              const ok = await send(c.user_id, text, "aniversario");
              await supabaseAdmin.from("store_clients")
                .update({ last_notified_birthday: today.iso }).eq("id", c.id);
              if (ok) summary.aniversario += 1;
            }
          }

          // ---------- INATIVIDADE ----------
          if (store.notif_inactivity_enabled && store.notif_inactivity_days > 0) {
            const cutoff = new Date();
            cutoff.setUTCDate(cutoff.getUTCDate() - store.notif_inactivity_days);
            const cutoffIso = cutoff.toISOString();
            const { data: clients } = await supabaseAdmin
              .from("store_clients")
              .select("id, user_id, pontos, last_purchase_at, last_notified_inactivity, profiles:user_id(full_name)")
              .eq("store_id", store.id)
              .not("last_purchase_at", "is", null)
              .lt("last_purchase_at", cutoffIso)
              .or(`last_notified_inactivity.is.null,last_notified_inactivity.lt.${today.iso}`);
            for (const c of clients ?? []) {
              // não reenviar se já avisamos após a última compra
              if (c.last_notified_inactivity && c.last_purchase_at && c.last_notified_inactivity > c.last_purchase_at.slice(0, 10)) continue;
              const p = c.profiles as unknown as { full_name: string | null } | null;
              const text = render(store.notif_inactivity_template, {
                nome: p?.full_name ?? "cliente", loja: store.nome_fantasia, pontos: c.pontos,
              });
              const ok = await send(c.user_id, text, "inatividade");
              await supabaseAdmin.from("store_clients")
                .update({ last_notified_inactivity: today.iso }).eq("id", c.id);
              if (ok) summary.inatividade += 1;
            }
          }

          // ---------- EXPIRAÇÃO DE PONTOS ----------
          if (store.notif_expiry_enabled && store.notif_expiry_days > 0) {
            // pontos expiram em (last_purchase_at + expiry_days). Avisa quando faltarem 'warn_days'.
            const warn = store.notif_expiry_warn_days;
            const targetPurchaseDate = new Date();
            targetPurchaseDate.setUTCDate(targetPurchaseDate.getUTCDate() - (store.notif_expiry_days - warn));
            const upper = targetPurchaseDate.toISOString();
            const lowerDate = new Date(targetPurchaseDate);
            lowerDate.setUTCDate(lowerDate.getUTCDate() - 1);
            const lower = lowerDate.toISOString();
            const { data: clients } = await supabaseAdmin
              .from("store_clients")
              .select("id, user_id, pontos, last_purchase_at, last_notified_expiry, profiles:user_id(full_name)")
              .eq("store_id", store.id)
              .gt("pontos", 0)
              .not("last_purchase_at", "is", null)
              .gte("last_purchase_at", lower)
              .lt("last_purchase_at", upper)
              .or(`last_notified_expiry.is.null,last_notified_expiry.lt.${today.iso}`);
            for (const c of clients ?? []) {
              const p = c.profiles as unknown as { full_name: string | null } | null;
              const text = render(store.notif_expiry_template, {
                nome: p?.full_name ?? "cliente", loja: store.nome_fantasia, pontos: c.pontos, dias: warn,
              });
              const ok = await send(c.user_id, text, "expiracao");
              await supabaseAdmin.from("store_clients")
                .update({ last_notified_expiry: today.iso }).eq("id", c.id);
              if (ok) summary.expiracao += 1;
            }
          }
        }

        return new Response(JSON.stringify(summary), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
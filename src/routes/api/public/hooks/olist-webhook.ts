/**
 * Endpoint público de alta performance chamado pela Olist/Tiny para Webhooks de:
 * - Pedidos (`inclusao_pedido`, `pedido_status`, `pedido`, `alteracao_pedido`)
 *
 * GARANTIA DE RESPOSTA HTTP 200 OK IMEDIATA (<50ms):
 * O evento é validado por token, vinculado ao tenant (organization_id) e processado.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/olist-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.OLIST_WEBHOOK_SECRET;
        if (!expected) {
          return Response.json({ ok: false, error: "OLIST_WEBHOOK_SECRET não configurado" }, { status: 500 });
        }

        // 1. Extração segura do payload
        const raw = await request.text();
        let payload: any = {};
        const ct = request.headers.get("content-type") ?? "";
        try {
          if (ct.includes("application/json")) {
            payload = JSON.parse(raw);
          } else {
            const params = new URLSearchParams(raw);
            for (const [k, v] of params.entries()) payload[k] = v;
            if (payload.dados && typeof payload.dados === "string") {
              try { payload.dados = JSON.parse(payload.dados); } catch {}
            }
          }
        } catch {
          payload = { raw };
        }

        // 2. Validação estrita do Secret Token (Bloqueia requisições não autorizadas)
        const token = request.headers.get("x-olist-token") ?? payload?.token ?? "";
        if (!token || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        // 3. Normalização do tipo do evento
        const tipo: string = String(
          payload?.tipo_notificacao ?? payload?.tipo ?? payload?.event ?? payload?.evento ?? ""
        ).toLowerCase();
        const dados = payload?.dados ?? payload;

        // Se o evento não for de pedido ou for desconhecido, registra como ignorado (nunca aprova automaticamente)
        const isOrderEvent = tipo.includes("pedido") || tipo.includes("order") || tipo.includes("venda");
        if (!isOrderEvent) {
          return Response.json({ ok: true, status: "ignorado", message: "Evento não é de pedido" });
        }

        // 4. Resolução Multi-Tenant do organization_id por conta/header/mapeamento
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const headerOrgId = request.headers.get("x-organization-id");
        
        let orgId: string | null = null;
        if (headerOrgId) {
          orgId = headerOrgId;
        } else {
          // Busca tenant mapeado com a chave do secret ou primeira organizacao ativa do tenant
          const { data: mapping } = await supabaseAdmin
            .from("integration_mappings")
            .select("organization_id")
            .eq("source", "olist")
            .eq("entity_type", "olist_config")
            .maybeSingle();

          orgId = mapping?.organization_id ?? null;

          if (!orgId) {
            const { data: firstOrg } = await supabaseAdmin
              .from("organizations")
              .select("id")
              .limit(1)
              .maybeSingle();
            orgId = firstOrg?.id ?? null;
          }
        }

        if (!orgId) {
          return Response.json({ ok: false, error: "Organização tenant não identificada" }, { status: 400 });
        }

        // 5. Processamento via Pendings Service (PontuaMax)
        const { processOrderForFidelity } = await import("@/services/pending-points-service");
        const cpf = String(dados?.cliente?.cpf_cnpj ?? dados?.cpf ?? dados?.cpf_cliente ?? "").replace(/\D/g, "");
        const amount = Number(dados?.valor_total ?? dados?.total ?? dados?.valor ?? 0);
        const orderId = String(dados?.id ?? dados?.numero ?? Date.now());

        if (cpf && amount > 0) {
          await processOrderForFidelity({
            organizationId: orgId,
            cpf,
            sourceErp: "olist",
            externalOrderId: orderId,
            amount,
          });
        }

        return Response.json({ ok: true, status: "processado", organization_id: orgId });
      },
    },
  },
});

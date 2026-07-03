import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/widget/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;
        const { data: loja } = await supabaseAdmin
          .from("stores")
          .select("nome_fantasia, brand_primary, brand_secondary, slug")
          .eq("slug", params.slug)
          .maybeSingle();
        if (!loja) {
          return new Response("// Loja não encontrada", {
            status: 404, headers: { "Content-Type": "application/javascript; charset=utf-8" },
          });
        }
        const target = `${origin}/${loja.slug}`;
        const js = `(function(){
  if (window.__qsfWidgetLoaded) return; window.__qsfWidgetLoaded = true;
  var btn = document.createElement('button');
  btn.textContent = '🎁 Ganhe pontos em ${loja.nome_fantasia.replace(/'/g, "\\'")}';
  btn.setAttribute('aria-label', 'Programa de fidelidade');
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;padding:14px 20px;border:0;border-radius:999px;cursor:pointer;color:#fff;font:600 14px/1 -apple-system,BlinkMacSystemFont,sans-serif;background:linear-gradient(135deg,${loja.brand_primary},${loja.brand_secondary});box-shadow:0 10px 25px rgba(0,0,0,.25)';
  var overlay;
  btn.onclick = function(){
    if (overlay) { overlay.style.display='flex'; return; }
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px';
    var box = document.createElement('div');
    box.style.cssText = 'width:100%;max-width:420px;height:80vh;background:#fff;border-radius:16px;overflow:hidden;position:relative;box-shadow:0 25px 50px rgba(0,0,0,.4)';
    var close = document.createElement('button');
    close.textContent = '×';
    close.style.cssText = 'position:absolute;top:8px;right:8px;width:32px;height:32px;border:0;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:20px;cursor:pointer;z-index:2';
    close.onclick = function(){ overlay.style.display='none'; };
    var iframe = document.createElement('iframe');
    iframe.src = '${target}';
    iframe.style.cssText = 'width:100%;height:100%;border:0';
    box.appendChild(close); box.appendChild(iframe); overlay.appendChild(box); document.body.appendChild(overlay);
  };
  document.body.appendChild(btn);
})();`;
        return new Response(js, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
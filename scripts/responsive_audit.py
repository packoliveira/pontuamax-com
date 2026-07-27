"""Auditoria automática de responsividade (mobile).

Detecta em larguras pequenas:
  - textos/botões sobrepostos ("um em cima do outro")
  - conteúdo fora da tela / overflow horizontal

Uso: python3 scripts/responsive_audit.py [baseUrl]
"""
import asyncio
import sys
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
WIDTHS = [320, 360, 390]

ROUTES = [
    "/", "/como-funciona", "/planos", "/lojistas", "/cadastro",
    "/lojista/login", "/funcionario/login", "/admin/login", "/redefinir-senha",
    "/lojista", "/lojista/clientes", "/lojista/produtos", "/lojista/resgates",
    "/lojista/campanhas", "/lojista/equipe", "/lojista/promocoes", "/lojista/sorteios",
    "/lojista/vale-presente", "/lojista/notas", "/lojista/nps", "/lojista/widget",
    "/lojista/configuracoes", "/lojista/personalizacao", "/lojista/lancar-venda",
    "/funcionario", "/funcionario/clientes", "/funcionario/pontuar",
    "/funcionario/historico", "/funcionario/perfil", "/funcionario/qr",
]

COLLECT = """() => {
  const out = [];
  const nodes = Array.from(document.querySelectorAll("h1,h2,h3,p,span,a,button,label,li,td,th"));
  for (const el of nodes) {
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") continue;
    if (["fixed","absolute","sticky"].includes(style.position)) continue;
    const text = (el.textContent || "").trim();
    if (!text) continue;
    if (el.querySelector("h1,h2,h3,p,span,a,button,label,li,td,th")) continue;
    if (el.closest("[data-audit-ignore]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    // elementos inline podem ocupar varias linhas: o rect e a uniao das linhas,
    // o que gera falso positivo de sobreposicao. Marcamos para ignorar na checagem.
    const inline = style.display.startsWith("inline") && el.getClientRects().length > 1;
    out.push({ tag: el.tagName, text: text.slice(0, 50), x: r.x, y: r.y, w: r.width, h: r.height, inline });
  }
  return { items: out, docW: document.documentElement.clientWidth,
           scrollW: document.documentElement.scrollWidth };
}"""


def overlap_ratio(a, b):
    ix = min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"])
    iy = min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"])
    if ix <= 2 or iy <= 2:
        return 0.0
    return (ix * iy) / max(1.0, min(a["w"] * a["h"], b["w"] * b["h"]))


async def main():
    problems = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for width in WIDTHS:
            ctx = await browser.new_context(viewport={"width": width, "height": 900},
                                            is_mobile=True, has_touch=True,
                                            device_scale_factor=2)
            page = await ctx.new_page()
            for route in ROUTES:
                try:
                    await page.goto(BASE + route, wait_until="networkidle", timeout=20000)
                except Exception:
                    continue
                await page.wait_for_timeout(300)
                data = await page.evaluate(COLLECT)
                items, docW, scrollW = data["items"], data["docW"], data["scrollW"]
                if scrollW > docW + 2:
                    problems.append((width, route, "overflow-horizontal", f"{scrollW} > {docW}"))
                for it in items:
                    if it["x"] < -2 or it["x"] + it["w"] > docW + 2:
                        problems.append((width, route, "fora-da-tela", f'{it["tag"]} "{it["text"]}"'))
                for i in range(len(items)):
                    for j in range(i + 1, len(items)):
                        if items[i].get("inline") or items[j].get("inline"):
                            continue
                        r = overlap_ratio(items[i], items[j])
                        if r > 0.35:
                            problems.append((width, route, "sobreposicao",
                                             f'{items[i]["tag"]} "{items[i]["text"]}" x '
                                             f'{items[j]["tag"]} "{items[j]["text"]}" ({int(r*100)}%)'))
            await ctx.close()
        await browser.close()

    seen = set()
    for w, route, kind, detail in problems:
        key = (w, route, kind, detail)
        if key in seen:
            continue
        seen.add(key)
        print(f"[{w}px] {route} :: {kind} :: {detail}")
    if not seen:
        print("OK: nenhuma sobreposicao ou overflow detectado.")
        return 0
    print(f"\n{len(seen)} problema(s) de layout mobile.")
    return 1


sys.exit(asyncio.run(main()))

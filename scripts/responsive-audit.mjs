/**
 * Auditoria automática de responsividade.
 * Detecta, em larguras pequenas:
 *  - textos/botões sobrepostos ("um em cima do outro")
 *  - overflow horizontal (conteúdo estourando a tela)
 *
 * Uso: node scripts/responsive-audit.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || process.env.AUDIT_BASE_URL || "http://localhost:8080";
const WIDTHS = [320, 360, 390];

const ROUTES = [
  "/",
  "/como-funciona",
  "/planos",
  "/lojistas",
  "/cadastro",
  "/lojista/login",
  "/funcionario/login",
  "/admin/login",
  "/redefinir-senha",
  "/lojista",
  "/lojista/clientes",
  "/lojista/produtos",
  "/lojista/resgates",
  "/lojista/campanhas",
  "/lojista/equipe",
  "/lojista/promocoes",
  "/lojista/sorteios",
  "/lojista/vale-presente",
  "/lojista/notas",
  "/lojista/nps",
  "/lojista/widget",
  "/lojista/configuracoes",
  "/lojista/personalizacao",
  "/lojista/lancar-venda",
  "/funcionario",
  "/funcionario/clientes",
  "/funcionario/pontuar",
  "/funcionario/historico",
  "/funcionario/perfil",
  "/funcionario/qr",
];

const COLLECT = `() => {
  const out = [];
  const nodes = Array.from(document.querySelectorAll("h1,h2,h3,p,span,a,button,label,li,td,th"));
  for (const el of nodes) {
    if (!el.isConnected) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") continue;
    if (style.position === "fixed" || style.position === "absolute" || style.position === "sticky") continue;
    const text = (el.textContent || "").trim();
    if (!text) continue;
    // ignora containers (queremos folhas de texto)
    if (el.querySelector("h1,h2,h3,p,span,a,button,label,li,td,th")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    out.push({ tag: el.tagName, text: text.slice(0, 60), x: r.x, y: r.y, w: r.width, h: r.height });
  }
  const docW = document.documentElement.clientWidth;
  return { items: out, docW, scrollW: document.documentElement.scrollWidth };
}`;

function overlaps(a, b) {
  const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (ix <= 2 || iy <= 2) return 0;
  const area = ix * iy;
  const minArea = Math.min(a.w * a.h, b.w * b.h);
  return area / minArea;
}

const problems = [];

const browser = await chromium.launch({ headless: true });
for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  for (const route of ROUTES) {
    try {
      await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 20000 });
    } catch {
      continue;
    }
    await page.waitForTimeout(400);
    const { items, docW, scrollW } = await page.evaluate(COLLECT);

    if (scrollW > docW + 2) {
      problems.push({ route, width, type: "overflow-horizontal", detail: `scrollWidth ${scrollW} > ${docW}` });
    }
    for (const it of items) {
      if (it.x < -2 || it.x + it.w > docW + 2) {
        problems.push({ route, width, type: "fora-da-tela", detail: `${it.tag} "${it.text}"` });
      }
    }
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const ratio = overlaps(items[i], items[j]);
        if (ratio > 0.35) {
          problems.push({
            route,
            width,
            type: "sobreposicao",
            detail: `${items[i].tag} "${items[i].text}" x ${items[j].tag} "${items[j].text}" (${Math.round(ratio * 100)}%)`,
          });
        }
      }
    }
  }
  await context.close();
}
await browser.close();

if (problems.length === 0) {
  console.log("OK: nenhuma sobreposicao ou overflow detectado.");
  process.exit(0);
}
const seen = new Set();
for (const p of problems) {
  const key = `${p.route}|${p.width}|${p.type}|${p.detail}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`[${p.width}px] ${p.route} :: ${p.type} :: ${p.detail}`);
}
console.log(`\n${seen.size} problema(s) de layout mobile.`);
process.exit(1);

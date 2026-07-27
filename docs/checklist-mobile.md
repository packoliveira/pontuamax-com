# Checklist de layout mobile (PontuaMax)

## Teste automático
```bash
npm run audit:responsive           # usa http://localhost:8080
npm run audit:responsive -- https://pontuamax.com
npm run audit:responsive -- http://localhost:8080 /lojista/clientes   # rotas específicas
```
O script (`scripts/responsive_audit.py`) abre cada rota em 320 / 360 / 390 px e falha quando encontra:
- **sobreposicao** — dois textos/botões ocupando o mesmo espaço (>35% de área)
- **fora-da-tela** — elemento cortado nas bordas
- **overflow-horizontal** — página rolando na horizontal

Elementos decorativos (mockup do celular, marquee, chuva de recompensas) e trilhos com
rolagem horizontal são ignorados. Para ignorar algo novo use `data-audit-ignore`.

> Rotas autenticadas (`/lojista/*`, `/funcionario/*`, `/admin/*`) só são auditadas quando há
> sessão no navegador; caso contrário elas redirecionam para o login e são puladas.

## Padrão de layout
- Cabeçalho de página: **sempre** `<PageHeader>` (`src/components/page-header.tsx`).
  Empilha no celular (título → ações em largura total) e vira linha a partir de `sm`.
- Ações do topo: passar em `actions`; ficam full-width no mobile automaticamente.
- Linha texto + widget: `<ResponsiveRow>` ou `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`.
- Todo container de texto dentro de flex/grid precisa de `min-w-0`; ícones/avatares `shrink-0`.
- Títulos: `text-xl sm:text-2xl md:text-3xl` (padrão do PageHeader). Nunca `text-3xl` fixo.
- Grids: começar em `grid-cols-1` e subir em `sm:` / `lg:`.

## Revisão feita
Lojista: dashboard, clientes, produtos, resgates, campanhas, equipe, promoções, sorteios,
vale-presente, notas, NPS, widget, configurações, lançar venda, Instagram.
Vendedor: dashboard, clientes, pontuar, histórico, perfil, QR.
Admin: dashboard, planos.
Público: home, planos, lojistas, como funciona, cadastro, logins, página do cliente `/:slug`.

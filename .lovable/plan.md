Vou implementar os 4 recursos que faltavam do comparativo Fidelimax, em um único ciclo. Cada um é independente e cabe no schema atual.

## 1. Vale-presente / Gift card
- Tabela `gift_cards` (código único, valor em pontos, criado por dono, resgatado por cliente, `redeemed_at`, `redeemed_by`).
- Página `/lojista/vale-presente`: gerar códigos em lote (quantidade + valor em pontos), listar códigos ativos e resgatados, botão copiar link `/{slug}/vale/{codigo}`.
- Rota pública `/$slug/vale/$codigo`: mostra vale, exige login do cliente, ao confirmar credita pontos no `store_clients` daquela loja e marca o vale como resgatado (transação atômica via server fn).

## 2. OCR de nota fiscal
- Bucket privado `notas` no storage.
- Página cliente `/nota` (dentro da área do cliente): upload de foto da nota, envia para server fn `ocrNota` que usa **Lovable AI Gateway** (modelo com visão) para extrair valor total e CNPJ.
- Server fn valida CNPJ contra o CNPJ da loja (novo campo `stores.cnpj` se ainda não existir — vou checar antes), impede duplicidade por hash da imagem, credita pontos conforme regra da loja (mesma taxa do PDV) e cria transação com `tipo='nota_fiscal'`.
- Lojista aprova/reprova manualmente em `/lojista/notas` (fila).

## 3. Tags + Sorteios
- Tabela `client_tags` (loja, cliente, tag texto) e `raffles` (loja, título, prêmio, filtro de tag opcional, filtro de nível opcional, ganhador, status).
- Página `/lojista/clientes`: adicionar/remover tags por cliente (chips).
- Página `/lojista/sorteios`: criar sorteio, sortear ganhador aleatório entre elegíveis, disparar WhatsApp para o ganhador via notify.

## 4. Widget para site
- Rota pública `/widget/{slug}.js` que devolve um script auto-contido: injeta um botão flutuante "Ganhe pontos" que abre um iframe com `/{slug}` em modal.
- Página `/lojista/widget`: mostra snippet `<script src="https://.../widget/{slug}.js" defer></script>` pronto para copiar.

## Detalhes técnicos
- Migrations em uma call só, com GRANT + RLS em todas as tabelas novas.
- OCR via `POST https://ai.gateway.lovable.dev/v1/chat/completions` com `google/gemini-2.5-flash` (barato, com visão). Prompt curto pedindo JSON `{valor, cnpj}`.
- Todas as server fns novas em `src/lib/qsf.functions.ts`, seguindo o padrão existente.
- Menu do lojista ganha: Vale-presente, Notas, Sorteios, Widget.
- Nada quebra features existentes; apenas adição.

Depois de aprovado eu começo pelas migrations, aí o código.
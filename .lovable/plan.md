# Escopo obrigatório do PontuaMax

O PontuaMax é exclusivamente um SaaS multiempresa de fidelização e relacionamento com clientes.

## Funcionalidades permitidas

- administração master de lojas e planos;
- painel do lojista e do funcionário;
- clientes, pontos, cashback, níveis e histórico;
- produtos do catálogo de recompensas;
- vouchers, gift cards, campanhas, sorteios e NPS;
- personalização whitelabel;
- integrações que enviem vendas ao PontuaMax apenas para calcular fidelidade.

## Fora do produto

Não adicionar ao PontuaMax módulos de ERP, PDV completo, estoque, entrada de mercadorias,
expedição, motoboy, trocas do varejo, emissão de etiquetas, fornecedores ou recebimento de XML.
Esses módulos pertencem ao FitGestor e devem permanecer em outro repositório.

## Arquitetura

- A entidade multiempresa principal do PontuaMax é `stores`.
- Novas funcionalidades devem usar `store_id` e respeitar RLS.
- Não criar dependência nova de `organizations` para fluxos de fidelidade.
- Migrations históricas não devem ser apagadas ou reescritas.
- Qualquer remoção de tabela existente exige backup, verificação de uso e migration específica.

## Qualidade mínima

Toda alteração deve manter `npm run build` funcionando e não pode introduzir referências
às marcas QSF, Quero Ser Fit ou FitGestor no código ativo.

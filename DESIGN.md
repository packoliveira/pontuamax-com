# PontuaMax — Diretrizes de Design & Sistema Visual (DESIGN.md)

## 📌 Visão do Produto
O **PontuaMax** é uma plataforma SaaS Multi-Tenant Whitelabel de **Programa de Fidelidade, Cashback e Engajamento de Clientes** voltada para lojas físicas, e-commerce e varejo. 

O objetivo do design é transmitir **alta confiança, modernidade, sofisticação e valor perceptível (ROI)** para o lojista e proporcionar uma **experiência divertida, gratificante e fluida** para o consumidor final.

---

## 🎨 Paleta de Cores & Tokens Visuais

### Modo Escuro / Vitrine & Sidebar (`#0b1021`, `#0b0f19`)
- **Fundo Principal (Navy/Dark)**: `#0b1021` (Barra lateral do lojista) e `#0b0f19` (Vitrine pública e Landing).
- **Cor Primária (Indigo/Blue)**: `#2563eb` (Azul Royal) e `#4f46e5` (Índigo).
- **Accent Cashback & Sucesso**: `#10b981` (Verde Esmeralda para saldos de cashback, acúmulos e badges de confirmação).
- **Accent Destaques & VIP**: `#8b5cf6` (Roxo Imperial para badges VIP Diamante e efeitos de celebração).

### Modo Lojista / Painel de ROI (`#f8fafc`)
- **Fundo do Conteúdo**: `#f8fafc` (Cinza claro ultra-limpo para leitura de métricas).
- **Cards de Métricas**: Fundo branco `#ffffff`, bordas suaves `border-slate-200/80`, sombras sutis `shadow-2xs` e cantos arredondados (`rounded-2xl`).
- **Tipografia**: Inter / Fontes sem serifa modernas com pesos `font-bold` (700) e `font-black` (900) para valores numéricos grandes.

---

## 🧩 Componentes Principais & Estrutura de Telas

### 1. Painel Executivo do Lojista (`/dashboard`)
- **Cabeçalho**: Título de saudação personalizado com nome da loja e URL da página pública. Botão primário azul `+ Lançar venda`.
- **KPI Cards (4 Quadrantes)**:
  1. *CLIENTES*: Total cadastrados com ícone circular azul.
  2. *PONTOS NO MÊS*: Total distribuído na moeda da loja.
  3. *CASHBACK DO MÊS*: Total devolvido em R$ aos clientes.
  4. *RESGATES PENDENTES*: Recompensas aguardando validação no caixa.
- **Ações Rápidas**: Quadros interativos com hover sutil para *Clientes*, *Produtos*, *Resgates* e *Campanhas*.
- **Tabela de Transações**: Lista limpa de últimas compras com avatar, nome, valor em R$, pontos verdes em destaque e cashback acumulado.

### 2. Barra Lateral Whitelabel (`AppShell`)
- Fundo `#0b1021` com logotipo dinâmico (ícone azul **P** + PontuaMax + nome da loja do lojista).
- Card escuro interno com o atalho da **Página Pública** (`/nomedaloja`), botão de copiar link e ícone de abrir em nova aba.
- Menu de navegação limpo com ícones `lucide-react` e destaque esmeralda no item ativo.

### 3. Vitrine Pública do Cliente & PWA (`/$slug`)
- **Hero Banner Whitelabel**: Logo da loja, banner customizável e botão para ativar Notificações Push nativas.
- **Barra PWA**: Prompt de instalação direta na tela inicial do smartphone (Android & iOS).
- **VIP Tier Progress**: Barra de progresso visual para o próximo nível (Bronze ➔ Prata ➔ Ouro ➔ Diamante).
- **Grid de Prêmios**: Cards de recompensas com imagem, custo em pontos, selo de destaque e botão de resgate.
- **Efeitos de Celebração**: Ao resgatar um prêmio, dispara animação de **confetes flutuantes** e sinal sonoro Web Audio API.

### 4. Frente de Caixa / Balcão (`/caixa`)
- Campo de consulta e identificação por CPF com bipador/scanner de código de barras.
- Calculadora instantânea de pontos e cashback ao digitar o valor da compra.
- Validador de Vouchers com resposta em tempo real e efeito sonoro de confirmação.

---

## ⚡ Interações & Animações
- **Micro-animações**: Transições suaves (`transition-all duration-200`) em hover nos cards e botões.
- **Feedback Sonoro**: Web Audio API sintetizada (tom duplo 523Hz ➔ 659Hz) ao confirmar baixa de voucher ou acúmulo no caixa.
- **Confete de Sucesso**: Animação leve baseada em partíclas DOM para comemorações na vitrine e caixa.

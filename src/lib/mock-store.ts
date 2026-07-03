import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Modalidade = "pontos" | "cashback" | "ambos";
export type Nivel = "bronze" | "prata" | "ouro";

export interface Loja {
  id: string;
  slug: string;
  nome: string;
  telefone: string;
  logo_url: string;
  cor_primaria: string;
  cor_secundaria: string;
  modalidade: Modalidade;
  regra_pontos: number; // pontos por R$1
  percentual_cashback: number; // 0-100
  niveis_ativos: boolean;
  created_at: string;
}

export interface Cliente {
  id: string;
  loja_id: string;
  nome: string;
  telefone: string;
  cpf?: string;
  data_nascimento?: string;
  pontos_saldo: number;
  cashback_saldo: number;
  created_at: string;
  ultima_compra?: string;
}

export type TipoTransacao = "compra" | "resgate_produto" | "resgate_cashback";

export interface Transacao {
  id: string;
  cliente_id: string;
  loja_id: string;
  tipo: TipoTransacao;
  valor_compra?: number;
  pontos_gerados?: number;
  cashback_gerado?: number;
  pontos_usados?: number;
  cashback_usado?: number;
  descricao: string;
  id_venda_externa?: string;
  created_at: string;
}

export interface ProdutoResgate {
  id: string;
  loja_id: string;
  nome: string;
  descricao: string;
  foto_url: string;
  pontos_necessarios: number;
  ativo: boolean;
  estoque: number;
}

export type TipoResgate = "produto" | "cashback";
export type StatusResgate = "pendente" | "entregue";

export interface Resgate {
  id: string;
  loja_id: string;
  cliente_id: string;
  tipo: TipoResgate;
  produto_id?: string;
  valor_usado: number; // pontos ou reais
  codigo_voucher: string;
  status: StatusResgate;
  created_at: string;
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function gerarVoucher() {
  const p = () =>
    Math.random().toString(36).slice(2, 6).toUpperCase();
  return `QSF-${p()}-${p()}`;
}

export function calcularNivel(pontos: number): Nivel {
  if (pontos <= 100) return "bronze";
  if (pontos <= 300) return "prata";
  return "ouro";
}

export function progressoNivel(pontos: number) {
  const nivel = calcularNivel(pontos);
  if (nivel === "bronze") return { atual: pontos, alvo: 101, proximo: "prata" as const, pct: (pontos / 101) * 100 };
  if (nivel === "prata") return { atual: pontos - 101, alvo: 200, proximo: "ouro" as const, pct: ((pontos - 101) / 200) * 100 };
  return { atual: pontos, alvo: pontos, proximo: null, pct: 100 };
}

interface State {
  lojas: Loja[];
  clientes: Cliente[];
  transacoes: Transacao[];
  produtos: ProdutoResgate[];
  resgates: Resgate[];
  authedLojaId: string | null;
  authedClienteByLoja: Record<string, string>; // loja_id -> cliente_id
}

interface Actions {
  loginLojista: (lojaId: string) => void;
  logoutLojista: () => void;
  atualizarLoja: (id: string, patch: Partial<Loja>) => void;
  criarLoja: (dados: Omit<Loja, "id" | "created_at">) => Loja;

  buscarClientePorContato: (lojaId: string, contato: string) => Cliente | undefined;
  criarCliente: (dados: Omit<Cliente, "id" | "created_at" | "pontos_saldo" | "cashback_saldo">) => Cliente;
  loginCliente: (lojaId: string, clienteId: string) => void;
  logoutCliente: (lojaId: string) => void;

  lancarVenda: (input: {
    loja: Loja;
    cliente: Cliente;
    valor: number;
    descricao?: string;
  }) => { pontos: number; cashback: number };

  resgatarProduto: (lojaId: string, clienteId: string, produtoId: string) => Resgate;
  resgatarCashback: (lojaId: string, clienteId: string, valor: number) => Resgate;
  confirmarResgate: (resgateId: string) => void;

  criarProduto: (dados: Omit<ProdutoResgate, "id">) => void;
  atualizarProduto: (id: string, patch: Partial<ProdutoResgate>) => void;
  removerProduto: (id: string) => void;
}

// -------- SEED --------
const LOJA_DEMO: Loja = {
  id: "loja_demo",
  slug: "lojademo",
  nome: "Café da Esquina",
  telefone: "(11) 90000-0000",
  logo_url: "",
  cor_primaria: "#7c3aed",
  cor_secundaria: "#f97316",
  modalidade: "ambos",
  regra_pontos: 1,
  percentual_cashback: 5,
  niveis_ativos: true,
  created_at: new Date().toISOString(),
};

const CLIENTES_SEED: Cliente[] = [
  { id: "cli_1", loja_id: "loja_demo", nome: "Ana Silva", telefone: "11987654321", cpf: "12345678900", pontos_saldo: 240, cashback_saldo: 32.5, created_at: new Date().toISOString(), ultima_compra: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "cli_2", loja_id: "loja_demo", nome: "Bruno Costa", telefone: "11912345678", pontos_saldo: 80, cashback_saldo: 12, created_at: new Date().toISOString(), ultima_compra: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: "cli_3", loja_id: "loja_demo", nome: "Carla Mendes", telefone: "11955554444", pontos_saldo: 420, cashback_saldo: 68.9, created_at: new Date().toISOString(), ultima_compra: new Date(Date.now() - 86400000).toISOString() },
];

const PRODUTOS_SEED: ProdutoResgate[] = [
  { id: "prd_1", loja_id: "loja_demo", nome: "Café Especial 250g", descricao: "Grãos selecionados torra média", foto_url: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400", pontos_necessarios: 150, ativo: true, estoque: 20 },
  { id: "prd_2", loja_id: "loja_demo", nome: "Caneca Personalizada", descricao: "Cerâmica 300ml com logo", foto_url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400", pontos_necessarios: 200, ativo: true, estoque: 15 },
  { id: "prd_3", loja_id: "loja_demo", nome: "Combo Café + Bolo", descricao: "Um café médio + fatia de bolo", foto_url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400", pontos_necessarios: 100, ativo: true, estoque: 30 },
  { id: "prd_4", loja_id: "loja_demo", nome: "Kit Presente Premium", descricao: "Café + caneca + chocolate", foto_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400", pontos_necessarios: 500, ativo: true, estoque: 5 },
];

const TRANSACOES_SEED: Transacao[] = [
  { id: "tx_1", cliente_id: "cli_1", loja_id: "loja_demo", tipo: "compra", valor_compra: 120, pontos_gerados: 120, cashback_gerado: 6, descricao: "Compra na loja", created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "tx_2", cliente_id: "cli_1", loja_id: "loja_demo", tipo: "compra", valor_compra: 250, pontos_gerados: 250, cashback_gerado: 12.5, descricao: "Compra na loja", created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: "tx_3", cliente_id: "cli_3", loja_id: "loja_demo", tipo: "compra", valor_compra: 420, pontos_gerados: 420, cashback_gerado: 21, descricao: "Compra na loja", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "tx_4", cliente_id: "cli_2", loja_id: "loja_demo", tipo: "compra", valor_compra: 80, pontos_gerados: 80, cashback_gerado: 4, descricao: "Compra na loja", created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
];

const RESGATES_SEED: Resgate[] = [
  { id: "res_1", loja_id: "loja_demo", cliente_id: "cli_3", tipo: "produto", produto_id: "prd_1", valor_usado: 150, codigo_voucher: "QSF-AB12-CD34", status: "pendente", created_at: new Date(Date.now() - 3600000).toISOString() },
];

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      lojas: [LOJA_DEMO],
      clientes: CLIENTES_SEED,
      transacoes: TRANSACOES_SEED,
      produtos: PRODUTOS_SEED,
      resgates: RESGATES_SEED,
      authedLojaId: null,
      authedClienteByLoja: {},

      loginLojista: (lojaId) => set({ authedLojaId: lojaId }),
      logoutLojista: () => set({ authedLojaId: null }),

      atualizarLoja: (id, patch) =>
        set((s) => ({ lojas: s.lojas.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

      criarLoja: (dados) => {
        const loja: Loja = { ...dados, id: uid("loja"), created_at: new Date().toISOString() };
        set((s) => ({ lojas: [...s.lojas, loja] }));
        return loja;
      },

      buscarClientePorContato: (lojaId, contato) => {
        const norm = contato.replace(/\D/g, "");
        return get().clientes.find(
          (c) => c.loja_id === lojaId && (c.telefone.replace(/\D/g, "") === norm || (c.cpf ?? "").replace(/\D/g, "") === norm),
        );
      },

      criarCliente: (dados) => {
        const cli: Cliente = {
          ...dados,
          id: uid("cli"),
          pontos_saldo: 0,
          cashback_saldo: 0,
          created_at: new Date().toISOString(),
        };
        set((s) => ({ clientes: [...s.clientes, cli] }));
        return cli;
      },

      loginCliente: (lojaId, clienteId) =>
        set((s) => ({ authedClienteByLoja: { ...s.authedClienteByLoja, [lojaId]: clienteId } })),

      logoutCliente: (lojaId) =>
        set((s) => {
          const { [lojaId]: _, ...rest } = s.authedClienteByLoja;
          return { authedClienteByLoja: rest };
        }),

      lancarVenda: ({ loja, cliente, valor, descricao }) => {
        const inclPontos = loja.modalidade === "pontos" || loja.modalidade === "ambos";
        const inclCashback = loja.modalidade === "cashback" || loja.modalidade === "ambos";
        const pontos = inclPontos ? Math.floor(valor * loja.regra_pontos) : 0;
        const cashback = inclCashback ? +(valor * (loja.percentual_cashback / 100)).toFixed(2) : 0;
        const tx: Transacao = {
          id: uid("tx"),
          cliente_id: cliente.id,
          loja_id: loja.id,
          tipo: "compra",
          valor_compra: valor,
          pontos_gerados: pontos,
          cashback_gerado: cashback,
          descricao: descricao || "Compra na loja",
          created_at: new Date().toISOString(),
        };
        set((s) => ({
          transacoes: [tx, ...s.transacoes],
          clientes: s.clientes.map((c) =>
            c.id === cliente.id
              ? {
                  ...c,
                  pontos_saldo: c.pontos_saldo + pontos,
                  cashback_saldo: +(c.cashback_saldo + cashback).toFixed(2),
                  ultima_compra: tx.created_at,
                }
              : c,
          ),
        }));
        return { pontos, cashback };
      },

      resgatarProduto: (lojaId, clienteId, produtoId) => {
        const s = get();
        const cli = s.clientes.find((c) => c.id === clienteId);
        const prd = s.produtos.find((p) => p.id === produtoId);
        if (!cli || !prd) throw new Error("Cliente ou produto não encontrado");
        if (cli.pontos_saldo < prd.pontos_necessarios) throw new Error("Pontos insuficientes");
        if (prd.estoque <= 0) throw new Error("Produto sem estoque");
        const resgate: Resgate = {
          id: uid("res"),
          loja_id: lojaId,
          cliente_id: clienteId,
          tipo: "produto",
          produto_id: produtoId,
          valor_usado: prd.pontos_necessarios,
          codigo_voucher: gerarVoucher(),
          status: "pendente",
          created_at: new Date().toISOString(),
        };
        const tx: Transacao = {
          id: uid("tx"),
          cliente_id: clienteId,
          loja_id: lojaId,
          tipo: "resgate_produto",
          pontos_usados: prd.pontos_necessarios,
          descricao: `Resgate: ${prd.nome}`,
          created_at: resgate.created_at,
        };
        set((st) => ({
          resgates: [resgate, ...st.resgates],
          transacoes: [tx, ...st.transacoes],
          clientes: st.clientes.map((c) =>
            c.id === clienteId ? { ...c, pontos_saldo: c.pontos_saldo - prd.pontos_necessarios } : c,
          ),
          produtos: st.produtos.map((p) => (p.id === produtoId ? { ...p, estoque: p.estoque - 1 } : p)),
        }));
        return resgate;
      },

      resgatarCashback: (lojaId, clienteId, valor) => {
        const s = get();
        const cli = s.clientes.find((c) => c.id === clienteId);
        if (!cli) throw new Error("Cliente não encontrado");
        if (valor <= 0) throw new Error("Valor inválido");
        if (valor > cli.cashback_saldo) throw new Error("Cashback insuficiente");
        const resgate: Resgate = {
          id: uid("res"),
          loja_id: lojaId,
          cliente_id: clienteId,
          tipo: "cashback",
          valor_usado: valor,
          codigo_voucher: gerarVoucher(),
          status: "pendente",
          created_at: new Date().toISOString(),
        };
        const tx: Transacao = {
          id: uid("tx"),
          cliente_id: clienteId,
          loja_id: lojaId,
          tipo: "resgate_cashback",
          cashback_usado: valor,
          descricao: `Voucher de cashback R$ ${valor.toFixed(2)}`,
          created_at: resgate.created_at,
        };
        set((st) => ({
          resgates: [resgate, ...st.resgates],
          transacoes: [tx, ...st.transacoes],
          clientes: st.clientes.map((c) =>
            c.id === clienteId ? { ...c, cashback_saldo: +(c.cashback_saldo - valor).toFixed(2) } : c,
          ),
        }));
        return resgate;
      },

      confirmarResgate: (resgateId) =>
        set((s) => ({
          resgates: s.resgates.map((r) => (r.id === resgateId ? { ...r, status: "entregue" } : r)),
        })),

      criarProduto: (dados) =>
        set((s) => ({ produtos: [...s.produtos, { ...dados, id: uid("prd") }] })),
      atualizarProduto: (id, patch) =>
        set((s) => ({ produtos: s.produtos.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removerProduto: (id) => set((s) => ({ produtos: s.produtos.filter((p) => p.id !== id) })),
    }),
    {
      name: "qsf-club-mock",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return window.localStorage;
        const noop: Storage = {
          length: 0,
          clear: () => {},
          getItem: () => null,
          key: () => null,
          removeItem: () => {},
          setItem: () => {},
        };
        return noop;
      }),
    },
  ),
);

export const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
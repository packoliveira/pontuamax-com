import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  storeBySlugQuery,
  activeStoreProductsQuery,
  myLinkAtStoreQuery,
  myTransactionsAtStoreQuery,
  myStoreQuery,
  type StorePublic,
} from "@/lib/queries";
import {
  vincularClienteALoja,
  prepararLoginClientePorCpf,
  reivindicarCadastroPendente,
  resgatarProduto,
  resgatarCashback,
  criarClienteViaCpf,
} from "@/lib/qsf.functions";
import { formatBRL, formatDate, calcularNivel, progressoNivel, cpfToEmail, formatCPF, isValidCPF, onlyDigits } from "@/lib/qsf-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { traduzirErroAuth, isCredenciaisInvalidas, isUsuarioJaCadastrado, validarCPF, validarSenha, validarConfirmacaoSenha } from "@/lib/auth-errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Coins, Wallet, LogOut, Trophy, Ticket, Share2, Gift, FileText, ArrowUpRight, ArrowDownRight, Sparkles, Instagram, Check, X, Clock, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Receipt, CheckCircle2, AlertTriangle, Printer } from "lucide-react";
import { submitInstagramPost, listMyInstagramSubmissions } from "@/lib/instagram.functions";

const REF_KEY = "qsf_referrer_phone";
function getStoredReferrer(): string | null {
  try {
    const p = new URLSearchParams(window.location.search).get("indicou");
    if (p) {
      const d = p.replace(/\D/g, "");
      if (d.length >= 8) localStorage.setItem(REF_KEY, d);
    }
    return localStorage.getItem(REF_KEY);
  } catch { return null; }
}

type Loja = StorePublic;
type Link = Tables<"store_clients">;

export const Route = createFileRoute("/$slug")({
  ssr: false,
  component: ClientePage,
});

function ClientePage() {
  const { slug } = Route.useParams();
  const { data: loja, isLoading } = useQuery(storeBySlugQuery(slug));

  const bg = useMemo(() => resolveBg(loja), [loja]);
  const style = useMemo(
    () =>
      loja
        ? ({
            ["--brand-primary" as string]: loja.brand_primary,
            ["--brand-secondary" as string]: loja.brand_secondary,
            backgroundColor: bg.base,
            color: bg.text,
          } as React.CSSProperties)
        : {},
    [loja, bg],
  );

  // Ativa o tema Midnight Indigo em <html> enquanto a página estiver montada,
  // para que portais (Dialog, Sonner) também herdem os tokens escuros.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("qsf-midnight");
    if (bg.isLight) root.classList.add("qsf-light");
    return () => {
      root.classList.remove("qsf-midnight");
      root.classList.remove("qsf-light");
    };
  }, [bg.isLight]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: bg.base }}>
        <div className="flex flex-col items-center gap-3 text-sm text-slate-400">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
          Carregando...
        </div>
      </div>
    );
  }

  if (!loja) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center" style={{ backgroundColor: bg.base }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: bg.text }}>Loja não encontrada</h1>
          <p className="text-sm opacity-70 mt-2" style={{ color: bg.text }}>Verifique o endereço com o lojista.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={style}
      className="min-h-dvh relative overflow-hidden"
    >
      {/* Aura de fundo derivada das cores da marca — bem sutil, fica atrás de tudo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{ background: `radial-gradient(ellipse at top, color-mix(in oklab, ${bg.accent} 22%, transparent), transparent 60%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl"
        style={{ backgroundColor: loja.brand_primary, opacity: bg.isLight ? 0.15 : 0.4 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-32 h-96 w-96 rounded-full blur-3xl"
        style={{ backgroundColor: loja.brand_secondary, opacity: bg.isLight ? 0.12 : 0.3 }}
      />
      <div className="relative">
        <ClienteFlow loja={loja} />
      </div>
    </div>
  );
}

/** Deriva o fundo da página pública a partir das preferências da loja. */
function resolveBg(loja: Loja | null | undefined): {
  base: string;
  accent: string;
  text: string;
  isLight: boolean;
} {
  const DARK = { base: "#0a0a1a", text: "#e2e8f0" };
  const LIGHT = { base: "#f8fafc", text: "#0f172a" };
  if (!loja) return { ...DARK, accent: "#6366f1", isLight: false };
  const mode = (loja.bg_mode as "dark" | "light" | "custom" | null) ?? "dark";
  if (mode === "light") return { ...LIGHT, accent: loja.brand_primary, isLight: true };
  if (mode === "custom") {
    const base = loja.bg_color_1 || DARK.base;
    const accent = loja.bg_color_2 || loja.brand_primary;
    const isLight = isLightColor(base);
    return { base, accent, text: isLight ? LIGHT.text : DARK.text, isLight };
  }
  return { ...DARK, accent: loja.brand_primary, isLight: false };
}

function isLightColor(hex: string): boolean {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return false;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Luminância relativa aproximada
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l > 0.6;
}

function ClienteFlow({ loja }: { loja: Loja }) {
  const qc = useQueryClient();
  const { data: link, isLoading } = useQuery(myLinkAtStoreQuery(loja.id));
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  // Se o usuário logado é o próprio dono da loja (lojista visitando "minha
  // página pública"), NUNCA vincula ele como cliente — apenas mostra o modo
  // prévia com atalho pro painel.
  const { data: minhaLoja, isLoading: isOwnerCheckLoading } = useQuery({
    ...myStoreQuery(),
    enabled: !!sessionUserId,
  });
  const isOwnerPreview = !!minhaLoja && minhaLoja.id === loja.id;
  // Enquanto não sabemos se o usuário logado é o dono da loja, NÃO podemos
  // renderizar VincularStore — senão criamos vínculo do próprio lojista.
  const ownerCheckPending = !!sessionUserId && isOwnerCheckLoading;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSessionUserId(s?.user.id ?? null);
      qc.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const handleAuthSuccess = async () => {
    setHydrating(true);
    try {
      // 1) Aguarda a sessão do Supabase estar realmente ativa
      let uid: string | null = null;
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user.id) { uid = data.session.user.id; break; }
        await new Promise((r) => setTimeout(r, 100));
      }
      // 2) Força o estado local (não depende só do listener)
      setSessionUserId(uid);
      // 3) Invalida especificamente as queries relevantes e aguarda
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-link", loja.id] }),
        qc.invalidateQueries({ queryKey: ["my-transactions", loja.id] }),
      ]);
    } finally {
      setHydrating(false);
      setAuthenticating(false);
    }
  };

  return (
    <>
      <Header loja={loja} showLogout={!!sessionUserId} />
      <BannerHero loja={loja} />
      <div className="animate-panel-in">
        {isOwnerPreview ? (
          <OwnerPreviewBanner />
        ) : isLoading || hydrating || authenticating || ownerCheckPending ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-400">
            <div className="h-4 w-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
            Carregando...
          </div>
        ) : sessionUserId && link ? (
          <ClienteLogado loja={loja} link={link} />
        ) : sessionUserId && !link ? (
          <VincularStore loja={loja} />
        ) : (
          <Auth
            loja={loja}
            onAuthStart={() => setAuthenticating(true)}
            onAuthError={() => setAuthenticating(false)}
            onAuthenticated={handleAuthSuccess}
          />
        )}
      </div>
    </>
  );
}

function BannerHero({ loja }: { loja: Loja }) {
  const desktop = loja.banner_url;
  const mobile = loja.banner_url_mobile || loja.banner_url;
  if (!desktop && !mobile) return null;
  const fit: "cover" | "contain" = loja.banner_mobile_fit === "contain" ? "contain" : "cover";
  const px = loja.banner_mobile_position_x ?? 50;
  const py = loja.banner_mobile_position_y ?? 50;
  const zoom = (loja.banner_mobile_zoom ?? 100) / 100;
  return (
    <div className="relative">
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div
          className="relative overflow-hidden rounded-2xl border shadow-lg animate-in fade-in zoom-in-95 duration-500"
          style={{
            borderColor: `color-mix(in oklab, ${loja.brand_primary} 40%, transparent)`,
            boxShadow: `0 10px 40px -12px color-mix(in oklab, ${loja.brand_primary} 60%, transparent)`,
          }}
        >
          {mobile && (
            <div
              className="w-full aspect-[2/1] overflow-hidden sm:hidden"
              style={{
                background: fit === "contain" ? `color-mix(in oklab, ${loja.brand_primary} 15%, #0a0a1a)` : undefined,
              }}
            >
              <img
                src={mobile}
                alt={`Banner ${loja.nome_fantasia}`}
                className="w-full h-full"
                style={{
                  objectFit: fit,
                  objectPosition: `${px}% ${py}%`,
                  transform: zoom !== 1 ? `scale(${zoom})` : undefined,
                  transformOrigin: `${px}% ${py}%`,
                }}
                loading="eager"
              />
            </div>
          )}
          {desktop && (
            <img
              src={desktop}
              alt={`Banner ${loja.nome_fantasia}`}
              className="w-full h-40 sm:h-48 md:h-56 object-cover hidden sm:block"
              loading="eager"
            />
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 60%, color-mix(in oklab, #0a0a1a 80%, transparent))`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function OwnerPreviewBanner() {
  return (
    <div className="max-w-2xl mx-auto p-4 -mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card className="border-indigo-500/20 bg-[#141432]/70 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base text-slate-100">Você está vendo sua loja como visitante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-400">
          <p>
            Esta é a página pública que seus clientes acessam. Como você está logado
            como dono da loja, nada é criado nem vinculado ao clicar aqui.
          </p>
          <p>
            Para testar como cliente, saia da sua conta de lojista (canto superior direito)
            ou abra este link em uma janela anônima.
          </p>
          <Link to="/lojista">
            <Button variant="outline" size="sm" className="border-indigo-500/30 bg-transparent text-slate-200 hover:bg-indigo-500/10 hover:text-white">Voltar ao painel</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function Header({ loja, showLogout }: { loja: Loja; showLogout: boolean }) {
  const qc = useQueryClient();
  const doLogout = async () => {
    await supabase.auth.signOut();
    qc.clear();
  };
  return (
    <header className="px-4 py-6 border-b border-indigo-500/10 backdrop-blur-md bg-[#0a0a1a]/60 sticky top-0 z-20">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div aria-hidden className="absolute inset-0 rounded-xl bg-indigo-500/40 blur-lg opacity-60" />
            {loja.logo_url ? (
              <img
                src={loja.logo_url}
                alt={loja.nome_fantasia}
                className="relative h-12 w-12 rounded-xl bg-[#141432] object-contain p-1.5 border border-indigo-500/30"
              />
            ) : (
              <div
                className="relative h-12 w-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg border"
                style={{
                  background: `linear-gradient(135deg, ${loja.brand_primary}, ${loja.brand_secondary})`,
                  borderColor: `color-mix(in oklab, ${loja.brand_primary} 50%, transparent)`,
                  boxShadow: `0 8px 20px -6px color-mix(in oklab, ${loja.brand_primary} 60%, transparent)`,
                }}
              >
                {loja.nome_fantasia.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            {(loja.header_kicker_show ?? true) && (
              <div
                className="text-[10px] uppercase tracking-[0.2em] font-semibold"
                style={{ color: `color-mix(in oklab, ${loja.brand_primary} 60%, #cbd5e1)` }}
              >
                {loja.header_kicker_text || "Fidelidade"}
              </div>
            )}
            <div
              className={`leading-tight truncate ${
                {
                  sm: "text-sm",
                  md: "text-base sm:text-lg",
                  lg: "text-lg sm:text-xl",
                  xl: "text-xl sm:text-2xl",
                  "2xl": "text-2xl sm:text-3xl",
                }[loja.header_title_size ?? "md"]
              } ${
                {
                  normal: "font-normal",
                  semibold: "font-semibold",
                  bold: "font-bold",
                  black: "font-black",
                }[loja.header_title_weight ?? "bold"]
              }`}
              style={{ color: loja.text_on_dark || "#ffffff" }}
            >
              {loja.nome_fantasia}
            </div>
          </div>
        </div>
        {showLogout && (
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-300 hover:bg-indigo-500/10 hover:text-white transition-colors"
            onClick={doLogout}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}

function Auth({ loja, onAuthenticated, onAuthStart, onAuthError }: {
  loja: Loja;
  onAuthenticated: () => Promise<void>;
  onAuthStart?: () => void;
  onAuthError?: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erroCpf, setErroCpf] = useState<string | null>(null);
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [erroPhone, setErroPhone] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroSenha2, setErroSenha2] = useState<string | null>(null);

  const switchTo = (novo: "login" | "signup", msg: string) => {
    setMode(novo);
    setSenha("");
    setSenha2("");
    setAviso(msg);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAviso(null);
    setErroCpf(null); setErroNome(null); setErroPhone(null); setErroSenha(null); setErroSenha2(null);
    const cpfDigits = onlyDigits(cpf);
    const eC = validarCPF(cpfDigits);
    // valida também pelo algoritmo local pra manter compatibilidade
    const eCpfExtra = !eC && !isValidCPF(cpfDigits) ? "CPF inválido. Confira os números digitados." : null;
    const eS = validarSenha(senha);
    let eN: string | null = null;
    let eP: string | null = null;
    let eS2: string | null = null;
    if (mode === "signup") {
      if (!nome.trim()) eN = "Informe seu nome.";
      const phoneDigits = onlyDigits(phone);
      if (!phoneDigits) eP = "Informe seu telefone com DDD.";
      else if (phoneDigits.length < 10) eP = `Telefone incompleto — precisa ter DDD + número (mín. 10 dígitos). Você digitou ${phoneDigits.length}.`;
      eS2 = validarConfirmacaoSenha(senha, senha2);
    }
    if (eC || eCpfExtra || eS || eN || eP || eS2) {
      setErroCpf(eC ?? eCpfExtra);
      setErroSenha(eS);
      setErroNome(eN);
      setErroPhone(eP);
      setErroSenha2(eS2);
      return;
    }
    setLoading(true);
    onAuthStart?.();
    try {
      const email = cpfToEmail(cpfDigits);
      if (mode === "signup") {
        const phoneDigits = onlyDigits(phone);
        // Se já existe um profile "pendente" com este CPF (criado por venda
        // do lojista ou webhook antes do cliente se cadastrar), REAPROVEITA
        // essa conta em vez de criar uma nova — assim o cliente já entra
        // vendo o saldo de pontos/cashback acumulado.
        const claim = await reivindicarCadastroPendente({
          data: { cpf: cpfDigits, senha, nome: nome.trim(), phone: phoneDigits || null },
        });
        if (!claim.claimed) {
          // Cria via server (admin) com email_confirm=true — o email é
          // sintético (@cliente.qsfclub.local) e não existe, então NÃO
          // pode passar por confirmação do Supabase.
          await criarClienteViaCpf({
            data: { cpf: cpfDigits, senha, nome: nome.trim(), phone: phoneDigits || null },
          });
        }
        // If session not returned (email confirm), sign in
        const { data: s2 } = await supabase.auth.getSession();
        if (!s2.session) {
          const { error: liErr } = await supabase.auth.signInWithPassword({ email, password: senha });
          if (liErr) throw liErr;
        }
        try { sessionStorage.setItem(`justSignedUp:${loja.id}`, "1"); } catch { /* ignore */ }
        await vincularClienteALoja({ data: { store_id: loja.id } });
        toast.success(`Bem-vindo(a), ${nome}!`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) {
          const prepared = await prepararLoginClientePorCpf({ data: { store_id: loja.id, cpf: cpfDigits, senha } });
          if (!prepared.normalized) throw error;
          const { error: retryError } = await supabase.auth.signInWithPassword({ email, password: senha });
          if (retryError) throw retryError;
        }
        // Ensure link exists (marca como "acabou de entrar" para evitar sign-out
        // se a query my-link demorar 1 tick para refletir o vínculo)
        try { sessionStorage.setItem(`justSignedUp:${loja.id}`, "1"); } catch { /* ignore */ }
        await vincularClienteALoja({ data: { store_id: loja.id } });
        toast.success("Bem-vindo(a) de volta!");
      }
      await onAuthenticated();
    } catch (err) {
      onAuthError?.();
      // Auto-switch: cadastro com CPF já existente → login
      if (mode === "signup" && isUsuarioJaCadastrado(err)) {
        switchTo("login", "Já existe uma conta com esse CPF. Entre com sua senha abaixo.");
      } else if (mode === "login" && isCredenciaisInvalidas(err)) {
        setAviso("CPF ou senha incorretos. Confira os dois campos. Se a loja cadastrou você, sua senha inicial é o CPF com apenas números.");
      } else {
        toast.error(traduzirErroAuth(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 pt-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="relative group">
        <div
          aria-hidden
          className="absolute -inset-0.5 rounded-2xl opacity-60 blur-md group-focus-within:opacity-90 transition-opacity duration-500"
          style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${loja.brand_primary} 40%, transparent), color-mix(in oklab, ${loja.brand_secondary} 20%, transparent), color-mix(in oklab, ${loja.brand_primary} 40%, transparent))` }}
        />
        <Card
          className="relative bg-[#141432]/95 backdrop-blur-xl shadow-2xl"
          style={{ borderColor: `color-mix(in oklab, ${loja.brand_primary} 25%, transparent)` }}
        >
          <CardHeader className="pb-4">
            <div
              className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1"
              style={{ color: `color-mix(in oklab, ${loja.brand_primary} 70%, #cbd5e1)` }}
            >
              {mode === "signup" ? "Novo por aqui" : "Bem-vindo(a) de volta"}
            </div>
            <CardTitle className="text-slate-100 text-xl">{mode === "signup" ? "Criar minha conta" : "Entrar com meu CPF"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
            {aviso && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 animate-in fade-in slide-in-from-top-1 duration-300">
                {aviso}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs font-medium">CPF <span className="text-rose-400">*</span></Label>
              <Input
                value={cpf}
                onChange={(e) => { setCpf(formatCPF(e.target.value)); if (erroCpf) setErroCpf(null); }}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="username"
                required
                className={`bg-[#0a0a1a]/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40 h-11 transition-colors ${erroCpf ? "border-rose-500/70 focus-visible:border-rose-400/70" : "border-indigo-500/20 focus-visible:border-indigo-400/50"}`}
              />
              {erroCpf && <p className="text-[11px] text-rose-400">{erroCpf}</p>}
            </div>
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs font-medium">Nome <span className="text-rose-400">*</span></Label>
                  <Input
                    value={nome}
                    onChange={(e) => { setNome(e.target.value); if (erroNome) setErroNome(null); }}
                    placeholder="Como quer ser chamado"
                    required
                    className={`bg-[#0a0a1a]/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40 h-11 transition-colors ${erroNome ? "border-rose-500/70" : "border-indigo-500/20 focus-visible:border-indigo-400/50"}`}
                  />
                  {erroNome && <p className="text-[11px] text-rose-400">{erroNome}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs font-medium">Telefone <span className="text-rose-400">*</span></Label>
                  <Input
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); if (erroPhone) setErroPhone(null); }}
                    placeholder="(11) 98765-4321"
                    inputMode="tel"
                    required
                    className={`bg-[#0a0a1a]/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40 h-11 transition-colors ${erroPhone ? "border-rose-500/70" : "border-indigo-500/20 focus-visible:border-indigo-400/50"}`}
                  />
                  {erroPhone && <p className="text-[11px] text-rose-400">{erroPhone}</p>}
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs font-medium">Senha <span className="text-rose-400">*</span></Label>
              <PasswordInput
                value={senha}
                onChange={(e) => { setSenha(e.target.value); if (erroSenha) setErroSenha(null); }}
                placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Sua senha"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                className={`bg-[#0a0a1a]/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40 h-11 transition-colors ${erroSenha ? "border-rose-500/70" : "border-indigo-500/20 focus-visible:border-indigo-400/50"}`}
              />
              {erroSenha && <p className="text-[11px] text-rose-400">{erroSenha}</p>}
            </div>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-medium">Confirmar senha <span className="text-rose-400">*</span></Label>
                <PasswordInput
                  value={senha2}
                  onChange={(e) => { setSenha2(e.target.value); if (erroSenha2) setErroSenha2(null); }}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  required
                  className={`bg-[#0a0a1a]/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40 h-11 transition-colors ${erroSenha2 || (senha2.length > 0 && senha !== senha2) ? "border-rose-500/70" : "border-indigo-500/20 focus-visible:border-indigo-400/50"}`}
                />
                {(erroSenha2 || (senha2.length > 0 && senha !== senha2)) && (
                  <p className="mt-1 text-[11px] text-rose-400">{erroSenha2 ?? "As senhas não coincidem"}</p>
                )}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, ${loja.brand_primary}, ${loja.brand_secondary})`,
                boxShadow: `0 10px 25px -8px color-mix(in oklab, ${loja.brand_primary} 60%, transparent)`,
              }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Entrando...
                </span>
              ) : mode === "signup" ? "Criar conta" : "Entrar"}
            </Button>
            <button
              type="button"
              onClick={() => { setAviso(null); setSenha2(""); setMode(mode === "login" ? "signup" : "login"); }}
              className="text-xs text-center w-full transition-colors font-medium py-1 hover:opacity-80"
              style={{ color: `color-mix(in oklab, ${loja.brand_primary} 70%, #cbd5e1)` }}
            >
              {mode === "login" ? "Ainda não tenho conta →" : "← Já tenho conta, entrar"}
            </button>
            {mode === "login" && (
              <p className="text-[11px] text-center text-slate-500 leading-relaxed">
                Se a loja cadastrou você, sua senha inicial é o seu próprio CPF (só números).
              </p>
            )}
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function VincularStore({ loja }: { loja: Loja }) {
  const qc = useQueryClient();
  // A operação de vínculo é idempotente no backend (retorna o link se já existir).
  // Sempre tenta vincular; só sinaliza erro se falhar de verdade — nunca faz signOut
  // implícito, que causava loop de "voltar ao login" logo após "Bem-vindo(a)".
  const started = useRef(false);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const link = await vincularClienteALoja({
          data: { store_id: loja.id, referrer_phone: getStoredReferrer() },
        });
        try { localStorage.removeItem(REF_KEY); } catch { /* ignore */ }
        try { sessionStorage.removeItem(`justSignedUp:${loja.id}`); } catch { /* ignore */ }
        if (!link || link.store_id !== loja.id) {
          throw new Error("Não foi possível confirmar seu cadastro nesta loja.");
        }
        await qc.invalidateQueries({ queryKey: ["my-link", loja.id] });
      } catch (e) {
        setErro((e as Error).message);
      }
    })();
  }, [loja.id, qc]);

  if (erro) {
    return (
      <div className="p-8 text-center space-y-3 max-w-md mx-auto">
        <p className="text-sm text-rose-400">{erro}</p>
        <Button
          onClick={async () => {
            await qc.cancelQueries();
            qc.clear();
            await supabase.auth.signOut();
          }}
          className="bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white"
        >
          Voltar ao login
        </Button>
      </div>
    );
  }
  return (
    <div className="p-8 text-center max-w-md mx-auto">
      <div className="inline-flex items-center gap-3 text-sm text-slate-400">
        <div className="h-4 w-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
        Preparando sua conta nesta loja...
      </div>
    </div>
  );
}

function ClienteLogado({ loja, link }: { loja: Loja; link: Link }) {
  const qc = useQueryClient();
  const { data: produtos = [] } = useQuery(activeStoreProductsQuery(loja.id));
  const { data: txs = [] } = useQuery(myTransactionsAtStoreQuery(loja.id));

  const [voucher, setVoucher] = useState<string | null>(null);
  const [cashbackModal, setCashbackModal] = useState(false);
  const [cashbackValor, setCashbackValor] = useState("");

  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";
  const nivel = calcularNivel(link.pontos);
  const prog = progressoNivel(link.pontos);

  const [nome, setNome] = useState("Cliente");
  const [meuTelefone, setMeuTelefone] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { full_name?: string } | undefined;
      setNome(meta?.full_name ?? "Cliente");
      const phone = (data.user?.user_metadata as { phone?: string } | undefined)?.phone;
      setMeuTelefone(phone ?? null);
    });
  }, []);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-link", loja.id] });
    qc.invalidateQueries({ queryKey: ["my-transactions", loja.id] });
  };

  const resgatarP = useMutation({
    mutationFn: (product_id: string) => resgatarProduto({ data: { store_id: loja.id, product_id } }),
    onSuccess: (r) => { setVoucher(r.voucher); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const resgatarC = useMutation({
    mutationFn: (valor: number) => resgatarCashback({ data: { store_id: loja.id, valor } }),
    onSuccess: (r) => { setVoucher(r.voucher); setCashbackModal(false); setCashbackValor(""); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const usarCashback = () => {
    const v = parseFloat(cashbackValor.replace(",", "."));
    if (!v || v <= 0) return toast.error("Valor inválido");
    const saldo = Number(link.cashback_saldo);
    if (v > saldo) return toast.error(`Cashback insuficiente. Saldo disponível: ${formatBRL(saldo)}.`);
    resgatarC.mutate(+v.toFixed(2));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="pt-2">
        <div className="text-xs uppercase tracking-[0.2em] text-indigo-300/70 font-semibold">Olá,</div>
        <div className="text-2xl font-bold text-white mt-0.5">{nome}</div>
      </div>

      <div className={`grid gap-4 ${inclP && inclC ? "sm:grid-cols-2" : ""}`}>
        {inclP && (
          <Card className="overflow-hidden border-indigo-500/25 bg-[#141432] qsf-glow relative">
            <div aria-hidden className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <Coins className="h-3.5 w-3.5" style={{ color: loja.brand_accent_points || "#818cf8" }} /> Seus pontos
                </div>
                <div
                  className="text-[10px] uppercase tracking-wide font-bold flex items-center gap-1 rounded-full px-2 py-0.5 border"
                  style={{
                    background: `color-mix(in oklab, ${loja.brand_vip || "#a78bfa"} 18%, transparent)`,
                    borderColor: `color-mix(in oklab, ${loja.brand_vip || "#a78bfa"} 40%, transparent)`,
                    color: `color-mix(in oklab, ${loja.brand_vip || "#a78bfa"} 30%, #f1f5f9)`,
                  }}
                >
                  <Trophy className="h-3 w-3" /> {nivel}
                </div>
              </div>
              <div className="text-5xl font-bold mt-3 tabular-nums tracking-tight" style={{ color: loja.text_on_dark || "#ffffff" }}>
                {link.pontos.toLocaleString("pt-BR")}
                <span className="text-base font-semibold ml-2" style={{ color: loja.brand_accent_points || "#818cf8" }}>pts</span>
              </div>
              {loja.pontos_expiracao_modo === "validade" && (
                <div className="text-[11px] mt-2 text-slate-500">
                  Pontos expiram após {loja.pontos_validade_dias} dias
                </div>
              )}
              {loja.pontos_expiracao_modo === "decaimento" && (
                <div className="text-[11px] mt-2 text-slate-500">
                  Você perde {loja.pontos_decaimento_valor} pts a cada {loja.pontos_decaimento_dias} dias
                </div>
              )}
              {prog.proximo && (
                <div className="mt-5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Próximo: <span className="text-slate-200 font-medium">{prog.proximo}</span></span>
                    <span className="text-indigo-300 font-semibold">{Math.round(prog.pct)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#0a0a1a] border border-white/5 overflow-hidden">
                    <div
                      className="h-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(100, prog.pct)}%`,
                        background: `linear-gradient(90deg, ${loja.brand_primary}, ${loja.brand_secondary})`,
                        boxShadow: `0 0 12px color-mix(in oklab, ${loja.brand_primary} 60%, transparent)`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
        {inclC && (
          <Card className="overflow-hidden border-emerald-500/25 bg-[#0d1a1a] relative">
            <div aria-hidden className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="relative p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <Wallet className="h-3.5 w-3.5" style={{ color: loja.brand_accent_cashback || "#34d399" }} /> Seu cashback
              </div>
              <div className="text-4xl font-bold mt-3 tabular-nums tracking-tight" style={{ color: loja.brand_price || loja.text_on_dark || "#ffffff" }}>
                {formatBRL(Number(link.cashback_saldo))}
              </div>
              <Button
                size="sm"
                className="mt-4 border transition-all hover:brightness-110"
                style={{
                  background: `color-mix(in oklab, ${loja.brand_accent_cashback || "#22c55e"} 18%, transparent)`,
                  borderColor: `color-mix(in oklab, ${loja.brand_accent_cashback || "#22c55e"} 40%, transparent)`,
                  color: `color-mix(in oklab, ${loja.brand_accent_cashback || "#22c55e"} 25%, #ecfeff)`,
                }}
                disabled={Number(link.cashback_saldo) <= 0}
                onClick={() => setCashbackModal(true)}
              >
                Usar no próximo pagamento
              </Button>
            </div>
          </Card>
        )}
      </div>

      {inclP && produtos.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-indigo-400" />
            <h2 className="font-semibold text-slate-100">Trocar pontos por produtos</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {produtos.map((p) => {
              const podeResgatar = link.pontos >= p.custo_pontos;
              return (
                <Card key={p.id} className={`border-indigo-500/20 bg-[#141432] transition-all hover:border-indigo-400/40 hover:-translate-y-0.5 ${podeResgatar ? "hover:shadow-lg hover:shadow-indigo-500/10" : "opacity-70"}`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="aspect-video w-full overflow-hidden rounded-md bg-[#0a0a1a] border border-indigo-500/10 flex items-center justify-center">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-indigo-500/30" />
                      )}
                    </div>
                    <div className="font-medium text-sm text-slate-100">{p.nome}</div>
                    <div className="text-xs text-slate-400 line-clamp-2">{p.descricao}</div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold text-sm text-indigo-300">{p.custo_pontos} pts</span>
                      <Button
                        size="sm"
                        disabled={!podeResgatar || resgatarP.isPending}
                        onClick={() => resgatarP.mutate(p.id)}
                        className={podeResgatar
                          ? "text-white shadow-md transition-all active:scale-95 hover:opacity-90"
                          : "bg-[#0a0a1a] text-slate-500 border border-white/5 cursor-not-allowed"}
                        style={podeResgatar ? {
                          background: `linear-gradient(135deg, ${loja.brand_primary}, ${loja.brand_secondary})`,
                          boxShadow: `0 6px 16px -6px color-mix(in oklab, ${loja.brand_primary} 60%, transparent)`,
                        } : undefined}
                      >
                        {podeResgatar ? "Resgatar" : "Faltam pontos"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {loja.indicacao_ativa && meuTelefone && (
        <IndicacaoCard loja={loja} telefone={meuTelefone} bonusIndicado={loja.bonus_indicado} bonusIndicador={loja.bonus_indicador} />
      )}

      <HistoricoSection txs={txs} inclP={inclP} inclC={inclC} />

      <VouchersSection loja={loja} txs={txs} nome={nome} telefone={meuTelefone} />

      {loja.instagram_program_active && loja.instagram_handle && (
        <InstagramCard loja={loja} />
      )}

      {loja.instagram_program_active && (
        <MeusPostsInstagram loja={loja} />
      )}

      <section>
        <Link
          to="/nota/$slug"
          params={{ slug: loja.slug }}
          className="group flex items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-500/30 bg-[#141432]/50 p-4 text-sm text-slate-300 hover:border-indigo-400/60 hover:bg-indigo-500/10 hover:text-white transition-all"
        >
          <FileText className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          Enviar foto de nota fiscal para ganhar pontos
        </Link>
      </section>

      <Dialog open={!!voucher} onOpenChange={(v) => !v && setVoucher(null)}>
        <DialogContent className="text-center">
          <DialogHeader><DialogTitle className="flex items-center justify-center gap-2"><Ticket className="h-5 w-5" /> Seu voucher</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apresente este código no caixa:</p>
          <div
            key={voucher ?? "empty"}
            className="mx-2 select-all text-3xl sm:text-4xl font-mono font-black tracking-widest py-6 px-3 rounded-lg break-all bg-slate-900 text-white border-2 border-slate-700 shadow-inner"
            aria-label="Código do voucher"
          >
            {voucher}
          </div>
          <p className="text-xs text-muted-foreground">Válido por alguns dias — você também pode conferir em "Meus vouchers" abaixo.</p>
        </DialogContent>
      </Dialog>

      <Dialog open={cashbackModal} onOpenChange={setCashbackModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Usar cashback</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Você tem <strong>{formatBRL(Number(link.cashback_saldo))}</strong> disponível.</p>
          <div>
            <Label>Quanto usar (R$)</Label>
            <Input type="number" step="0.01" min="0" max={Number(link.cashback_saldo)} value={cashbackValor} onChange={(e) => setCashbackValor(e.target.value)} />
          </div>
          <Button onClick={usarCashback} disabled={resgatarC.isPending} className="text-white" style={{ backgroundColor: "var(--brand-secondary)" }}>Gerar voucher</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IndicacaoCard({
  loja, telefone, bonusIndicado, bonusIndicador,
}: { loja: Loja; telefone: string; bonusIndicado: number; bonusIndicador: number }) {
  const link = `${window.location.origin}/${loja.slug}?indicou=${telefone}`;
  const msg = `Oi! 👋 Sou cliente da ${loja.nome_fantasia} e quero te indicar. Cadastre-se pelo meu link e ganhe ${bonusIndicado} pontos na sua 1ª compra: ${link}`;
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: loja.nome_fantasia, text: msg, url: link }); return; } catch { /* fallback */ }
    }
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };
  const whats = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Gift className="h-4 w-4" /> Indique amigos e ganhe pontos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Seu amigo ganha <strong>{bonusIndicado} pts</strong> na 1ª compra.
          Você ganha <strong>{bonusIndicador} pts</strong> quando ele comprar.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={link} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button size="sm" onClick={share} style={{ backgroundColor: "var(--brand-primary)" }} className="text-white">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={whats} className="w-full">Enviar por WhatsApp</Button>
      </CardContent>
    </Card>
  );
}

type TxRow = {
  id: string;
  tipo: string;
  valor: number | string;
  pontos_delta: number;
  cashback_delta: number | string;
  created_at: string;
  origem: string | null;
  products?: { nome: string | null } | null;
};

function describeTx(t: TxRow) {
  const prd = t.products?.nome;
  const ajusteMotivo = t.tipo === "ajuste" && t.origem?.startsWith("ajuste_manual:")
    ? t.origem.slice("ajuste_manual:".length)
    : null;
  switch (t.tipo) {
    case "venda": return "Compra na loja";
    case "resgate_produto": return `Resgate: ${prd ?? "produto"}`;
    case "resgate_cashback": return "Voucher de cashback";
    case "vale_presente": return "Vale-presente";
    case "nota_fiscal": return "Nota fiscal aprovada";
    case "indicacao": return "Bônus de indicação";
    case "expiracao": return t.origem?.startsWith("expiracao_decaimento")
      ? "Decaimento periódico de pontos"
      : "Pontos expirados";
    case "ajuste": return ajusteMotivo
      ? `Ajuste da loja: ${ajusteMotivo}`
      : (t.pontos_delta >= 0 ? "Ajuste da loja (crédito)" : "Ajuste da loja (estorno)");
    default: return "Movimentação";
  }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return formatDate(iso); }
}

function TxRowItem({ t }: { t: TxRow }) {
  const isCredit = t.pontos_delta > 0 || Number(t.cashback_delta) > 0;
  return (
    <div className="flex items-start justify-between gap-3 p-3 text-sm hover:bg-indigo-500/5 transition-colors">
      <div className="flex items-start gap-2 min-w-0">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCredit ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
          {isCredit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate text-slate-100">{describeTx(t)}</div>
          <div className="text-xs text-slate-500">{formatDateTime(t.created_at)}</div>
          {t.tipo === "venda" && Number(t.valor) > 0 && (
            <div className="text-xs text-slate-500">Compra de {formatBRL(Number(t.valor))}</div>
          )}
        </div>
      </div>
      <div className="text-right text-xs shrink-0">
        {t.pontos_delta ? (
          <div className={t.pontos_delta > 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
            {t.pontos_delta > 0 ? "+" : ""}{t.pontos_delta} pts
          </div>
        ) : null}
        {Number(t.cashback_delta) ? (
          <div className={Number(t.cashback_delta) > 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
            {Number(t.cashback_delta) > 0 ? "+" : ""}{formatBRL(Number(t.cashback_delta))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HistoricoSection({ txs, inclP, inclC }: { txs: unknown[]; inclP: boolean; inclC: boolean }) {
  const list = txs as TxRow[];
  const ganhos = list.filter((t) => t.pontos_delta > 0 || Number(t.cashback_delta) > 0);
  const resgates = list.filter((t) =>
    t.tipo === "resgate_produto" || t.tipo === "resgate_cashback" || t.tipo === "vale_presente"
  );
  const ajustes = list.filter((t) => t.tipo === "ajuste");

  const renderList = (arr: TxRow[]) => (
    <Card className="border-indigo-500/15 bg-[#141432]/60">
      <CardContent className="p-0">
        <div className="divide-y divide-indigo-500/10">
          {arr.length === 0
            ? <div className="p-6 text-center text-sm text-slate-500">Sem movimentações</div>
            : arr.map((t) => <TxRowItem key={t.id} t={t} />)}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        <h2 className="font-semibold text-slate-100">Histórico</h2>
        <span className="text-xs text-slate-500">acompanhe seu saldo</span>
      </div>
      <Tabs defaultValue="todos">
        <TabsList className="w-full">
          <TabsTrigger value="todos" className="flex-1">Tudo</TabsTrigger>
          {(inclP || inclC) && <TabsTrigger value="ganhos" className="flex-1">Ganhos</TabsTrigger>}
          <TabsTrigger value="resgates" className="flex-1">Resgates</TabsTrigger>
          <TabsTrigger value="ajustes" className="flex-1">Ajustes</TabsTrigger>
        </TabsList>
        <TabsContent value="todos" className="mt-3">{renderList(list)}</TabsContent>
        <TabsContent value="ganhos" className="mt-3">{renderList(ganhos)}</TabsContent>
        <TabsContent value="resgates" className="mt-3">{renderList(resgates)}</TabsContent>
        <TabsContent value="ajustes" className="mt-3">{renderList(ajustes)}</TabsContent>
      </Tabs>
    </section>
  );
}

function InstagramCard({ loja }: { loja: Loja }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [nota, setNota] = useState("");
  const enviar = useMutation({
    mutationFn: () => submitInstagramPost({ data: { store_id: loja.id, post_url: url.trim(), client_note: nota.trim() || null } }),
    onSuccess: () => {
      toast.success("Post enviado! A loja vai revisar em breve.");
      setUrl(""); setNota("");
      qc.invalidateQueries({ queryKey: ["my-ig-subs", loja.id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const pts = loja.instagram_points_per_post ?? 50;
  const handle = loja.instagram_handle;
  const instrucoesDefault = `1. Poste uma foto ou reel usando a loja\n2. Marque @${handle} no post\n3. Mantenha o post no ar pelo menos ${loja.instagram_min_days_live ?? 7} dias\n4. Seu perfil precisa estar público`;

  return (
    <section>
      <Card className="overflow-hidden">
        <div className="p-5 text-white" style={{ background: "linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)" }}>
          <div className="flex items-center gap-2 text-sm opacity-95"><Instagram className="h-4 w-4" /> Poste no Instagram e ganhe pontos</div>
          <div className="text-3xl font-bold mt-2">+{pts} pts por post</div>
          <div className="text-sm opacity-95 mt-1">Marque <strong>@{handle}</strong> no post e envie o link aqui.</div>
        </div>
        <CardContent className="pt-4 space-y-3">
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Como funciona</summary>
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground mt-2 font-sans">
              {loja.instagram_instructions || instrucoesDefault}
            </pre>
          </details>
          <div>
            <Label className="text-xs">Link do seu post no Instagram</Label>
            <Input
              value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/XXXXXXX/"
            />
          </div>
          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Alguma info extra pra loja" />
          </div>
          <Button
            onClick={() => enviar.mutate()}
            disabled={!url.trim() || enviar.isPending}
            className="text-white w-full"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {enviar.isPending ? "Enviando..." : "Enviar para aprovação"}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

function MeusPostsInstagram({ loja }: { loja: Loja }) {
  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["my-ig-subs", loja.id],
    queryFn: () => listMyInstagramSubmissions({ data: { store_id: loja.id } }),
  });

  const pendentes = subs.filter((s) => s.status === "pendente");
  const aprovados = subs.filter((s) => s.status === "aprovado");
  const rejeitados = subs.filter((s) => s.status === "rejeitado" || s.status === "estornado");

  const totalPts = aprovados.reduce((acc, s) => acc + (s.points_awarded ?? 0), 0);
  const totalCb = aprovados.reduce((acc, s) => acc + Number(s.cashback_awarded ?? 0), 0);

  const renderList = (arr: typeof subs) => {
    if (arr.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum post por aqui ainda.
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-2">
        {arr.map((s) => <PostSubmissionRow key={s.id} s={s} />)}
      </div>
    );
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Instagram className="h-4 w-4 text-indigo-400" />
        <h2 className="font-semibold text-slate-100">Meus posts no Instagram</h2>
        <span className="text-xs text-slate-500">acompanhe o status</span>
      </div>

      {(aprovados.length > 0) && (
        <Card className="mb-3">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Já creditado no Instagram</div>
              <div className="text-lg font-bold">
                {totalPts > 0 && <span className="text-green-700">+{totalPts} pts</span>}
                {totalPts > 0 && totalCb > 0 && <span className="text-muted-foreground"> · </span>}
                {totalCb > 0 && <span className="text-green-700">+{formatBRL(totalCb)} cashback</span>}
              </div>
            </div>
            <div className="text-xs text-right text-muted-foreground">
              <div>{aprovados.length} post(s)</div>
              <div>aprovado(s)</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="todos">
        <TabsList className="w-full">
          <TabsTrigger value="todos" className="flex-1">Todos ({subs.length})</TabsTrigger>
          <TabsTrigger value="pendentes" className="flex-1">Em análise ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="aprovados" className="flex-1">Aprovados ({aprovados.length})</TabsTrigger>
          <TabsTrigger value="rejeitados" className="flex-1">Rejeitados ({rejeitados.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="todos" className="mt-3">
          {isLoading ? <div className="text-center text-sm text-muted-foreground p-4">Carregando...</div> : renderList(subs)}
        </TabsContent>
        <TabsContent value="pendentes" className="mt-3">{renderList(pendentes)}</TabsContent>
        <TabsContent value="aprovados" className="mt-3">{renderList(aprovados)}</TabsContent>
        <TabsContent value="rejeitados" className="mt-3">{renderList(rejeitados)}</TabsContent>
      </Tabs>
    </section>
  );
}

type IgSub = {
  id: string;
  post_url: string;
  status: string;
  points_awarded: number;
  cashback_awarded?: number;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  verify_after: string | null;
  client_note: string | null;
};

function PostSubmissionRow({ s }: { s: IgSub }) {
  const cb = Number(s.cashback_awarded ?? 0);
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <a
            href={s.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline truncate flex-1 min-w-0"
          >
            {s.post_url}
          </a>
          <StatusBadge status={s.status} />
        </div>
        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
          <span>Enviado em {formatDateTime(s.created_at)}</span>
          {s.reviewed_at && <span>Revisado em {formatDateTime(s.reviewed_at)}</span>}
          {s.status === "pendente" && s.verify_after && (
            <span>Verificação a partir de {new Date(s.verify_after).toLocaleDateString("pt-BR")}</span>
          )}
        </div>
        {s.status === "aprovado" && (s.points_awarded > 0 || cb > 0) && (
          <div className="flex items-center gap-2 text-xs font-semibold text-green-700">
            <ArrowUpRight className="h-3 w-3" />
            Creditado:
            {s.points_awarded > 0 && <span>+{s.points_awarded} pts</span>}
            {cb > 0 && <span>+{formatBRL(cb)} cashback</span>}
          </div>
        )}
        {(s.status === "rejeitado" || s.status === "estornado") && s.rejection_reason && (
          <div className="text-xs text-destructive">
            <strong>Motivo:</strong> {s.rejection_reason}
          </div>
        )}
        {s.client_note && (
          <div className="text-[11px] text-muted-foreground italic">"{s.client_note}"</div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pendente")
    return <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[11px]"><Clock className="h-3 w-3" /> Em análise</span>;
  if (status === "aprovado")
    return <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-[11px]"><Check className="h-3 w-3" /> Aprovado</span>;
  if (status === "rejeitado")
    return <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-[11px]"><X className="h-3 w-3" /> Rejeitado</span>;
  if (status === "estornado")
    return <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-[11px]"><X className="h-3 w-3" /> Estornado</span>;
  return null;
}

type VoucherTx = TxRow & {
  status?: string | null;
  voucher_code?: string | null;
  voucher_expires_at?: string | null;
  delivered_at?: string | null;
};

function VouchersSection({
  loja, txs, nome, telefone,
}: { loja: Loja; txs: unknown[]; nome: string; telefone: string | null }) {
  const mostrarUsados = loja.voucher_visivel_apos_uso ?? false;
  const mostrarExpirados = loja.voucher_mostrar_expirados ?? true;
  const list = (txs as VoucherTx[])
    .filter((t) => t.tipo === "resgate_produto" || t.tipo === "resgate_cashback")
    .filter((t) => {
      const s = t.status ?? "pendente";
      if (s === "entregue" && !mostrarUsados) return false;
      if (s === "expirado" && !mostrarExpirados) return false;
      return true;
    });
  const [selected, setSelected] = useState<VoucherTx | null>(null);

  if (list.length === 0) return null;

  const pendentes = list.filter((t) => t.status === "pendente");
  const utilizados = list.filter((t) => t.status === "entregue");
  const expirados = list.filter((t) => t.status === "expirado");
  const cancelados = list.filter((t) => t.status === "cancelado");

  const renderList = (arr: VoucherTx[]) => (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {arr.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhum voucher aqui</div>
          ) : (
            arr.map((t) => (
              <VoucherRow key={t.id} t={t} onOpen={() => setSelected(t)} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="h-4 w-4 text-indigo-400" />
        <h2 className="font-semibold text-slate-100">Meus vouchers</h2>
        <span className="text-xs text-slate-500">códigos e comprovantes</span>
      </div>
      <Tabs defaultValue="todos">
        <TabsList className="w-full">
          <TabsTrigger value="todos" className="flex-1">Todos ({list.length})</TabsTrigger>
          <TabsTrigger value="pendentes" className="flex-1">Pendentes ({pendentes.length})</TabsTrigger>
          {utilizados.length > 0 && (
            <TabsTrigger value="utilizados" className="flex-1">Utilizados ({utilizados.length})</TabsTrigger>
          )}
          {expirados.length > 0 && (
            <TabsTrigger value="expirados" className="flex-1">Expirados ({expirados.length})</TabsTrigger>
          )}
          {cancelados.length > 0 && (
            <TabsTrigger value="cancelados" className="flex-1">Cancelados ({cancelados.length})</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="todos" className="mt-3">{renderList(list)}</TabsContent>
        <TabsContent value="pendentes" className="mt-3">{renderList(pendentes)}</TabsContent>
        <TabsContent value="utilizados" className="mt-3">{renderList(utilizados)}</TabsContent>
        <TabsContent value="expirados" className="mt-3">{renderList(expirados)}</TabsContent>
        <TabsContent value="cancelados" className="mt-3">{renderList(cancelados)}</TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.status === "entregue" ? (
                <><CheckCircle2 className="h-5 w-5 text-green-600" /> Comprovante de resgate</>
              ) : (
                <><Ticket className="h-5 w-5" /> Detalhes do voucher</>
              )}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div id="voucher-print" className="space-y-3 text-sm border rounded-md p-4 bg-background">
              <div className="text-center">
                <div className="font-bold text-base">{loja.nome_fantasia}</div>
                <div className="text-xs text-muted-foreground">
                  {selected.status === "entregue" ? "Comprovante de entrega" : "Voucher de resgate"}
                </div>
              </div>
              {selected.voucher_code && (
                <div
                  className="select-all text-center text-2xl font-mono font-black tracking-widest py-3 px-2 rounded-md break-all bg-slate-900 text-white border-2 border-slate-700"
                  aria-label="Código do voucher"
                >
                  {selected.voucher_code}
                </div>
              )}
              <div className="border-t pt-2 grid grid-cols-[110px_1fr] gap-y-1">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{nome}</span>
                {telefone && (<>
                  <span className="text-muted-foreground">Telefone</span>
                  <span>{telefone}</span>
                </>)}
                <span className="text-muted-foreground">Gerado em</span>
                <span>{formatDateTime(selected.created_at)}</span>
                {selected.status === "entregue" && selected.delivered_at && (<>
                  <span className="text-muted-foreground">Entregue em</span>
                  <span>{formatDateTime(selected.delivered_at)}</span>
                </>)}
                {selected.status === "pendente" && selected.voucher_expires_at && (<>
                  <span className="text-muted-foreground">Válido até</span>
                  <span>{formatDateTime(selected.voucher_expires_at)}</span>
                </>)}
                {selected.status === "expirado" && selected.voucher_expires_at && (<>
                  <span className="text-muted-foreground">Expirou em</span>
                  <span>{formatDateTime(selected.voucher_expires_at)}</span>
                </>)}
              </div>
              <div className="border-t pt-2">
                {selected.tipo === "resgate_produto" && (
                  <>
                    <div className="flex justify-between">
                      <span>Produto</span>
                      <span className="font-medium">{selected.products?.nome ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pontos usados</span>
                      <span className="font-medium">{Math.abs(selected.pontos_delta)} pts</span>
                    </div>
                  </>
                )}
                {selected.tipo === "resgate_cashback" && (
                  <div className="flex justify-between">
                    <span>Cashback aplicado</span>
                    <span className="font-medium">{formatBRL(Math.abs(Number(selected.cashback_delta)))}</span>
                  </div>
                )}
              </div>
              {selected.status === "pendente" && (
                <div className="text-xs text-center text-muted-foreground border-t pt-2">
                  Apresente este código no caixa da loja para retirar seu resgate.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button onClick={() => setSelected(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function VoucherRow({ t, onOpen }: { t: VoucherTx; onOpen: () => void }) {
  const isProduto = t.tipo === "resgate_produto";
  const detalhe = isProduto
    ? `${t.products?.nome ?? "Produto"} • ${Math.abs(t.pontos_delta)} pts`
    : `Cashback • ${formatBRL(Math.abs(Number(t.cashback_delta)))}`;
  const status = t.status ?? "pendente";
  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isProduto ? (
            <Gift className="h-4 w-4 text-violet-600 shrink-0" />
          ) : (
            <Wallet className="h-4 w-4 text-green-600 shrink-0" />
          )}
          <div className="text-sm font-medium truncate">{detalhe}</div>
        </div>
        {t.voucher_code && (
          <div className="mt-1 inline-block select-all rounded-md bg-slate-900 text-white border border-slate-700 px-2 py-0.5 text-sm font-mono font-bold tracking-widest">
            {t.voucher_code}
          </div>
        )}
        <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-2">
          <span>{formatDateTime(t.created_at)}</span>
          {status === "pendente" && t.voucher_expires_at && (
            <span>Válido até {formatDateTime(t.voucher_expires_at)}</span>
          )}
          {status === "entregue" && t.delivered_at && (
            <span className="text-green-700">Utilizado em {formatDateTime(t.delivered_at)}</span>
          )}
          {status === "expirado" && t.voucher_expires_at && (
            <span className="text-orange-700">Expirou em {formatDateTime(t.voucher_expires_at)}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <VoucherStatusBadge status={status} />
        <Button size="sm" variant="outline" onClick={onOpen}>
          {status === "entregue" ? "Comprovante" : "Ver"}
        </Button>
      </div>
    </div>
  );
}

function VoucherStatusBadge({ status }: { status: string }) {
  if (status === "pendente")
    return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
  if (status === "entregue")
    return <Badge className="bg-blue-600 hover:bg-blue-600 text-white"><CheckCircle2 className="h-3 w-3 mr-1" /> Utilizado</Badge>;
  if (status === "expirado")
    return <Badge className="bg-orange-500 hover:bg-orange-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" /> Expirado</Badge>;
  if (status === "cancelado")
    return <Badge className="bg-red-600 hover:bg-red-600 text-white"><X className="h-3 w-3 mr-1" /> Cancelado</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}
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
import {
  formatBRL,
  calcularNivel,
  progressoNivel,
  cpfToEmail,
  formatCPF,
  isValidCPF,
  onlyDigits,
} from "@/lib/qsf-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  traduzirErroAuth,
  isCredenciaisInvalidas,
  isUsuarioJaCadastrado,
  validarCPF,
  validarSenha,
  validarConfirmacaoSenha,
} from "@/lib/auth-errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Coins,
  Wallet,
  LogOut,
  Trophy,
  Ticket,
  Share2,
  Gift,
  FileText,
  Package,
} from "lucide-react";
import { RewardRain } from "@/components/reward-rain";
import { HistoricoSection } from "@/components/portal/HistoricoSection";
import { InstagramCard, MeusPostsInstagram } from "@/components/portal/InstagramSection";
import { VouchersSection } from "@/components/portal/VouchersSection";

const REF_KEY = "qsf_referrer_phone";
function getStoredReferrer(): string | null {
  try {
    const p = new URLSearchParams(window.location.search).get("indicou");
    if (p) {
      const d = p.replace(/\D/g, "");
      if (d.length >= 8) localStorage.setItem(REF_KEY, d);
    }
    return localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
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
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ backgroundColor: bg.base }}
      >
        <div className="flex flex-col items-center gap-3 text-sm text-slate-400">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
          Carregando...
        </div>
      </div>
    );
  }

  if (!loja) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center p-6 text-center"
        style={{ backgroundColor: bg.base }}
      >
        <div>
          <h1 className="text-2xl font-bold" style={{ color: bg.text }}>
            Loja não encontrada
          </h1>
          <p className="text-sm opacity-70 mt-2" style={{ color: bg.text }}>
            Verifique o endereço com o lojista.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={style} className="min-h-dvh relative overflow-hidden">
      {/* Aura de fundo derivada das cores da marca — bem sutil, fica atrás de tudo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background: `radial-gradient(ellipse at top, color-mix(in oklab, ${bg.accent} 22%, transparent), transparent 60%)`,
        }}
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
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
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
        if (data.session?.user.id) {
          uid = data.session.user.id;
          break;
        }
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
          <div className="relative">
            {loja.reward_rain_enabled && (
              <RewardRain
                colors={
                  (loja.reward_rain_colors ?? []).length > 0
                    ? loja.reward_rain_colors
                    : [
                        loja.brand_primary,
                        loja.brand_secondary,
                        loja.brand_accent_cashback || "#FBBF24",
                        "#FFFFFF",
                        "#F97316",
                        "#F59E0B",
                      ]
                }
                opacity={loja.reward_rain_opacity ?? 0.75}
              />
            )}
            <div className="relative" style={{ zIndex: 1 }}>
              <Auth
                loja={loja}
                onAuthStart={() => setAuthenticating(true)}
                onAuthError={() => setAuthenticating(false)}
                onAuthenticated={handleAuthSuccess}
              />
            </div>
          </div>
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
        <div className="relative animate-in fade-in zoom-in-95 duration-500">
          {mobile && (
            <div className="w-full aspect-[2/1] sm:hidden">
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
              className="w-full h-40 sm:h-48 md:h-56 object-contain hidden sm:block"
              loading="eager"
            />
          )}
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
          <CardTitle className="text-base text-slate-100">
            Você está vendo sua loja como visitante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-400">
          <p>
            Esta é a página pública que seus clientes acessam. Como você está logado como dono da
            loja, nada é criado nem vinculado ao clicar aqui.
          </p>
          <p>
            Para testar como cliente, saia da sua conta de lojista (canto superior direito) ou abra
            este link em uma janela anônima.
          </p>
          <Link to="/lojista">
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-500/30 bg-transparent text-slate-200 hover:bg-indigo-500/10 hover:text-white"
            >
              Voltar ao painel
            </Button>
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
            {loja.logo_url ? (
              <img
                src={loja.logo_url}
                alt={loja.nome_fantasia}
                className="relative h-12 w-12 object-contain"
              />
            ) : (
              <div
                className="relative h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-lg border"
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
                className="uppercase tracking-[0.2em] font-semibold"
                style={{
                  color: `color-mix(in oklab, ${loja.brand_primary} 60%, #cbd5e1)`,
                  fontSize: { xs: "9px", sm: "10px", md: "12px" }[
                    (loja.header_kicker_size ?? "sm") as "xs" | "sm" | "md"
                  ],
                }}
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
                }[(loja.header_title_size ?? "md") as "sm" | "md" | "lg" | "xl" | "2xl"]
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

function Auth({
  loja,
  onAuthenticated,
  onAuthStart,
  onAuthError,
}: {
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
    setErroCpf(null);
    setErroNome(null);
    setErroPhone(null);
    setErroSenha(null);
    setErroSenha2(null);
    const cpfDigits = onlyDigits(cpf);
    const eC = validarCPF(cpfDigits);
    // valida também pelo algoritmo local pra manter compatibilidade
    const eCpfExtra =
      !eC && !isValidCPF(cpfDigits) ? "CPF inválido. Confira os números digitados." : null;
    const eS = validarSenha(senha);
    let eN: string | null = null;
    let eP: string | null = null;
    let eS2: string | null = null;
    if (mode === "signup") {
      if (!nome.trim()) eN = "Informe seu nome.";
      const phoneDigits = onlyDigits(phone);
      if (!phoneDigits) eP = "Informe seu telefone com DDD.";
      else if (phoneDigits.length < 10)
        eP = `Telefone incompleto — precisa ter DDD + número (mín. 10 dígitos). Você digitou ${phoneDigits.length}.`;
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
          const { error: liErr } = await supabase.auth.signInWithPassword({
            email,
            password: senha,
          });
          if (liErr) throw liErr;
        }
        try {
          sessionStorage.setItem(`justSignedUp:${loja.id}`, "1");
        } catch {
          /* ignore */
        }
        await vincularClienteALoja({ data: { store_id: loja.id } });
        toast.success(`Bem-vindo(a), ${nome}!`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) {
          const prepared = await prepararLoginClientePorCpf({
            data: { store_id: loja.id, cpf: cpfDigits, senha },
          });
          if (!prepared.normalized) throw error;
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password: senha,
          });
          if (retryError) throw retryError;
        }
        // Ensure link exists (marca como "acabou de entrar" para evitar sign-out
        // se a query my-link demorar 1 tick para refletir o vínculo)
        try {
          sessionStorage.setItem(`justSignedUp:${loja.id}`, "1");
        } catch {
          /* ignore */
        }
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
        setAviso(
          "CPF ou senha incorretos. Confira os dois campos. Se a loja cadastrou você, sua senha inicial é o CPF com apenas números.",
        );
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
          className="absolute -inset-0.5 rounded-[2rem] opacity-60 blur-md group-focus-within:opacity-90 transition-opacity duration-500"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklab, ${loja.brand_primary} 40%, transparent), color-mix(in oklab, ${loja.brand_secondary} 20%, transparent), color-mix(in oklab, ${loja.brand_primary} 40%, transparent))`,
          }}
        />
        <Card
          className="relative bg-[#141432]/95 backdrop-blur-xl shadow-2xl rounded-[2rem] border"
          style={{ borderColor: `color-mix(in oklab, ${loja.brand_primary} 25%, transparent)` }}
        >
          <CardHeader className="pb-4">
            <div
              className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1"
              style={{ color: `color-mix(in oklab, ${loja.brand_primary} 70%, #cbd5e1)` }}
            >
              {mode === "signup" ? "Novo por aqui" : "Bem-vindo(a) de volta"}
            </div>
            <CardTitle className="text-slate-100 text-xl">
              {mode === "signup" ? "Criar minha conta" : "Entrar com meu CPF"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {aviso && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 animate-in fade-in slide-in-from-top-1 duration-300">
                  {aviso}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-medium">
                  CPF <span className="text-rose-400">*</span>
                </Label>
                <Input
                  value={cpf}
                  onChange={(e) => {
                    setCpf(formatCPF(e.target.value));
                    if (erroCpf) setErroCpf(null);
                  }}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  autoComplete="username"
                  required
                  className={`bg-[#0a0a1a]/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40 h-12 rounded-xl transition-colors ${erroCpf ? "border-rose-500/70 focus-visible:border-rose-400/70" : "border-indigo-500/20 focus-visible:border-indigo-400/50"}`}
                />
                {erroCpf && <p className="text-[11px] text-rose-400">{erroCpf}</p>}
              </div>
              {mode === "signup" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs font-medium">
                      Nome <span className="text-rose-400">*</span>
                    </Label>
                    <Input
                      value={nome}
                      onChange={(e) => {
                        setNome(e.target.value);
                        if (erroNome) setErroNome(null);
                      }}
                      placeholder="Como quer ser chamado"
                      required
                      className={`bg-[#0a0a1a]/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40 h-12 rounded-xl transition-colors ${erroNome ? "border-rose-500/70" : "border-indigo-500/20 focus-visible:border-indigo-400/50"}`}
                    />
                    {erroNome && <p className="text-[11px] text-rose-400">{erroNome}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs font-medium">
                      Telefone <span className="text-rose-400">*</span>
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (erroPhone) setErroPhone(null);
                      }}
                      placeholder="(11) 98765-4321"
                      inputMode="tel"
                      required
                      className={`bg-[#0a0a1a]/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40 h-12 rounded-xl transition-colors ${erroPhone ? "border-rose-500/70" : "border-indigo-500/20 focus-visible:border-indigo-400/50"}`}
                    />
                    {erroPhone && <p className="text-[11px] text-rose-400">{erroPhone}</p>}
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-medium">
                  Senha <span className="text-rose-400">*</span>
                </Label>
                <PasswordInput
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (erroSenha) setErroSenha(null);
                  }}
                  placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Sua senha"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  className={`bg-[#0a0a1a]/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40 h-12 rounded-xl transition-colors ${erroSenha ? "border-rose-500/70" : "border-indigo-500/20 focus-visible:border-indigo-400/50"}`}
                />
                {erroSenha && <p className="text-[11px] text-rose-400">{erroSenha}</p>}
              </div>
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs font-medium">
                    Confirmar senha <span className="text-rose-400">*</span>
                  </Label>
                  <PasswordInput
                    value={senha2}
                    onChange={(e) => {
                      setSenha2(e.target.value);
                      if (erroSenha2) setErroSenha2(null);
                    }}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    required
                    className={`bg-[#0a0a1a]/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40 h-12 rounded-xl transition-colors ${erroSenha2 || (senha2.length > 0 && senha !== senha2) ? "border-rose-500/70" : "border-indigo-500/20 focus-visible:border-indigo-400/50"}`}
                  />
                  {(erroSenha2 || (senha2.length > 0 && senha !== senha2)) && (
                    <p className="mt-1 text-[11px] text-rose-400">
                      {erroSenha2 ?? "As senhas não coincidem"}
                    </p>
                  )}
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full text-white font-semibold transition-all active:scale-[0.98] hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed"
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
                ) : mode === "signup" ? (
                  "Criar conta"
                ) : (
                  "Entrar"
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setAviso(null);
                  setSenha2("");
                  setMode(mode === "login" ? "signup" : "login");
                }}
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
        try {
          localStorage.removeItem(REF_KEY);
        } catch {
          /* ignore */
        }
        try {
          sessionStorage.removeItem(`justSignedUp:${loja.id}`);
        } catch {
          /* ignore */
        }
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
    mutationFn: (product_id: string) =>
      resgatarProduto({ data: { store_id: loja.id, product_id } }),
    onSuccess: (r) => {
      setVoucher(r.voucher);
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const resgatarC = useMutation({
    mutationFn: (valor: number) => resgatarCashback({ data: { store_id: loja.id, valor } }),
    onSuccess: (r) => {
      setVoucher(r.voucher);
      setCashbackModal(false);
      setCashbackValor("");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const usarCashback = () => {
    const v = parseFloat(cashbackValor.replace(",", "."));
    if (!v || v <= 0) return toast.error("Valor inválido");
    const saldo = Number(link.cashback_saldo);
    const minimo = Number(loja.cashback_valor_minimo || 0);
    if (minimo > 0 && saldo < minimo)
      return toast.error(
        `É preciso acumular ${formatBRL(minimo)} de cashback para resgatar. Saldo atual: ${formatBRL(saldo)}.`,
      );
    if (v > saldo)
      return toast.error(`Cashback insuficiente. Saldo disponível: ${formatBRL(saldo)}.`);
    resgatarC.mutate(+v.toFixed(2));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="pt-2">
        <div className="text-xs uppercase tracking-[0.2em] text-indigo-300/70 font-semibold">
          Olá,
        </div>
        <div className="text-2xl font-bold text-white mt-0.5">{nome}</div>
      </div>

      <div className={`grid gap-4 ${inclP && inclC ? "sm:grid-cols-2" : ""}`}>
        {inclP && (
          <Card className="overflow-hidden border-indigo-500/25 bg-[#141432] qsf-glow relative">
            <div
              aria-hidden
              className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl"
            />
            <div className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <Coins
                    className="h-3.5 w-3.5"
                    style={{ color: loja.brand_accent_points || "#818cf8" }}
                  />{" "}
                  Seus pontos
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
              <div
                className="text-5xl font-bold mt-3 tabular-nums tracking-tight"
                style={{ color: loja.text_on_dark || "#ffffff" }}
              >
                {link.pontos.toLocaleString("pt-BR")}
                <span
                  className="text-base font-semibold ml-2"
                  style={{ color: loja.brand_accent_points || "#818cf8" }}
                >
                  pts
                </span>
              </div>
              {loja.pontos_expiracao_modo === "validade" && (
                <div className="text-[11px] mt-2 text-slate-500">
                  Pontos expiram após {loja.pontos_validade_dias} dias
                </div>
              )}
              {loja.pontos_expiracao_modo === "decaimento" && (
                <div className="text-[11px] mt-2 text-slate-500">
                  Você perde {loja.pontos_decaimento_valor} pts a cada {loja.pontos_decaimento_dias}{" "}
                  dias
                </div>
              )}
              {prog.proximo && (
                <div className="mt-5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">
                      Próximo: <span className="text-slate-200 font-medium">{prog.proximo}</span>
                    </span>
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
            <div
              aria-hidden
              className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl"
            />
            <div className="relative p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <Wallet
                  className="h-3.5 w-3.5"
                  style={{ color: loja.brand_accent_cashback || "#34d399" }}
                />{" "}
                Seu cashback
              </div>
              <div
                className="text-4xl font-bold mt-3 tabular-nums tracking-tight"
                style={{ color: loja.brand_price || loja.text_on_dark || "#ffffff" }}
              >
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
                disabled={
                  Number(link.cashback_saldo) <= 0 ||
                  (Number(loja.cashback_valor_minimo || 0) > 0 &&
                    Number(link.cashback_saldo) < Number(loja.cashback_valor_minimo))
                }
                onClick={() => setCashbackModal(true)}
              >
                {Number(loja.cashback_valor_minimo || 0) > 0 &&
                Number(link.cashback_saldo) < Number(loja.cashback_valor_minimo)
                  ? `Resgate a partir de ${formatBRL(Number(loja.cashback_valor_minimo))}`
                  : "Usar no próximo pagamento"}
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
                <Card
                  key={p.id}
                  className={`border-indigo-500/20 bg-[#141432] transition-all hover:border-indigo-400/40 hover:-translate-y-0.5 ${podeResgatar ? "hover:shadow-lg hover:shadow-indigo-500/10" : "opacity-70"}`}
                >
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
                      <span
                        className="font-bold text-sm"
                        style={{ color: loja.brand_accent_points || "#a5b4fc" }}
                      >
                        {p.custo_pontos} pts
                      </span>
                      <Button
                        size="sm"
                        disabled={!podeResgatar || resgatarP.isPending}
                        onClick={() => resgatarP.mutate(p.id)}
                        className={
                          podeResgatar
                            ? "text-white shadow-md transition-all active:scale-95 hover:opacity-90"
                            : "bg-[#0a0a1a] text-slate-500 border border-white/5 cursor-not-allowed"
                        }
                        style={
                          podeResgatar
                            ? {
                                background: loja.brand_cta
                                  ? loja.brand_cta
                                  : `linear-gradient(135deg, ${loja.brand_primary}, ${loja.brand_secondary})`,
                                boxShadow: `0 6px 16px -6px color-mix(in oklab, ${loja.brand_cta || loja.brand_primary} 60%, transparent)`,
                                color: loja.text_on_dark || "#ffffff",
                              }
                            : undefined
                        }
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
        <IndicacaoCard
          loja={loja}
          telefone={meuTelefone}
          bonusIndicado={loja.bonus_indicado}
          bonusIndicador={loja.bonus_indicador}
        />
      )}

      <HistoricoSection txs={txs} inclP={inclP} inclC={inclC} />

      <VouchersSection loja={loja} txs={txs} nome={nome} telefone={meuTelefone} />

      {loja.instagram_program_active && loja.instagram_handle && <InstagramCard loja={loja} />}

      {loja.instagram_program_active && <MeusPostsInstagram loja={loja} />}

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
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Ticket className="h-5 w-5" /> Seu voucher
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Apresente este código no caixa:</p>
          <div
            key={voucher ?? "empty"}
            className="mx-2 select-all text-3xl sm:text-4xl font-mono font-black tracking-widest py-6 px-3 rounded-lg break-all bg-slate-900 text-white border-2 border-slate-700 shadow-inner"
            aria-label="Código do voucher"
          >
            {voucher}
          </div>
          <p className="text-xs text-muted-foreground">
            Válido por alguns dias — você também pode conferir em "Meus vouchers" abaixo.
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={cashbackModal} onOpenChange={setCashbackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usar cashback</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Você tem <strong>{formatBRL(Number(link.cashback_saldo))}</strong> disponível.
          </p>
          {Number(loja.cashback_valor_minimo || 0) > 0 && (
            <p className="text-xs text-muted-foreground">
              Valor mínimo para resgate:{" "}
              <strong>{formatBRL(Number(loja.cashback_valor_minimo))}</strong>
            </p>
          )}
          {Number(loja.cashback_compra_minima || 0) > 0 && (
            <p className="text-xs text-muted-foreground">
              Só pode ser usado em compras a partir de{" "}
              <strong>{formatBRL(Number(loja.cashback_compra_minima))}</strong>.
            </p>
          )}
          <div>
            <Label>Quanto usar (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={Number(link.cashback_saldo)}
              value={cashbackValor}
              onChange={(e) => setCashbackValor(e.target.value)}
            />
          </div>
          <Button
            onClick={usarCashback}
            disabled={resgatarC.isPending}
            className="text-white"
            style={{ backgroundColor: "var(--brand-secondary)" }}
          >
            Gerar voucher
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IndicacaoCard({
  loja,
  telefone,
  bonusIndicado,
  bonusIndicador,
}: {
  loja: Loja;
  telefone: string;
  bonusIndicado: number;
  bonusIndicador: number;
}) {
  const link = `${window.location.origin}/${loja.slug}?indicou=${telefone}`;
  const msg = `Oi! 👋 Sou cliente da ${loja.nome_fantasia} e quero te indicar. Cadastre-se pelo meu link e ganhe ${bonusIndicado} pontos na sua 1ª compra: ${link}`;
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: loja.nome_fantasia, text: msg, url: link });
        return;
      } catch {
        /* fallback */
      }
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
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-4 w-4" /> Indique amigos e ganhe pontos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Seu amigo ganha <strong>{bonusIndicado} pts</strong> na 1ª compra. Você ganha{" "}
          <strong>{bonusIndicador} pts</strong> quando ele comprar.
        </p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={link}
            className="text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            size="sm"
            onClick={share}
            style={{ backgroundColor: "var(--brand-primary)" }}
            className="text-white"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={whats} className="w-full">
          Enviar por WhatsApp
        </Button>
      </CardContent>
    </Card>
  );
}


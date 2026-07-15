import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { PontuaMaxMark, PontuaMaxWordmark } from "@/components/pontuamax-logo";
import { formatCPF, onlyDigits, isValidCPF } from "@/lib/qsf-shared";
import { resolveFuncionarioEmailByCpf, registrarLoginFuncionario } from "@/lib/team.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/funcionario/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const { data: emp } = await supabase
      .from("store_employees")
      .select("id, status")
      .eq("user_id", uid).eq("status", "ativo").maybeSingle();
    if (emp) throw redirect({ to: "/funcionario" });
  },
  component: FuncionarioLogin,
});

function FuncionarioLogin() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    try {
      const msg = sessionStorage.getItem("auth_flash");
      if (msg) { toast.info(msg); sessionStorage.removeItem("auth_flash"); }
    } catch { /* ignore */ }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const digits = onlyDigits(cpf);
    if (!isValidCPF(digits)) { setErro("CPF inválido."); return; }
    if (senha.length < 6) { setErro("Informe sua senha."); return; }
    setLoading(true);
    try {
      const { email } = await resolveFuncionarioEmailByCpf({ data: { cpf: digits } });
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw new Error(error.message.includes("Invalid") ? "CPF ou senha incorretos." : error.message);
      try { await registrarLoginFuncionario(); } catch { /* auditoria não bloqueia */ }
      navigate({ to: "/funcionario", replace: true });
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[#0B132B] via-[#111827] to-[#0F172A] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-white">
          <PontuaMaxMark size={40} />
          <PontuaMaxWordmark variant="dark" size={20} />
        </div>
        <Card className="rounded-2xl border-white/10 bg-white shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl text-[#0F172A]">Acesso do vendedor</CardTitle>
            <CardDescription className="text-[#64748B]">
              Entre com seu CPF e a senha fornecida pelo lojista.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf" inputMode="numeric" autoComplete="username"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="senha">Senha</Label>
                <PasswordInput id="senha" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
              </div>
              {erro && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {erro}
                </div>
              )}
              <Button
                type="submit" disabled={loading}
                className="mt-1 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-md hover:opacity-95"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando…</> : "Entrar"}
              </Button>
              <p className="text-center text-xs text-[#64748B]">
                <Link to="/funcionario/esqueci-senha" className="text-[#2563EB] hover:underline">
                  Esqueci minha senha
                </Link>
              </p>
              <div className="mt-2 text-center text-xs text-[#94A3B8]">
                É lojista? <Link to="/lojista/login" className="text-[#2563EB] hover:underline">Entrar como lojista</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
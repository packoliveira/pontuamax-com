import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { PontuaMaxMark, PontuaMaxWordmark } from "@/components/pontuamax-logo";
import { formatCPF, isValidCPF, onlyDigits } from "@/lib/loyalty-shared";
import { solicitarRecuperacaoSenhaFuncionario } from "@/lib/team.functions";

export const Route = createFileRoute("/funcionario/esqueci-senha")({
  ssr: false,
  component: EsqueciSenha,
});

function EsqueciSenha() {
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const cpfDigits = onlyDigits(cpf);
    const phoneDigits = onlyDigits(phone);
    if (!isValidCPF(cpfDigits)) return setErro("CPF inválido.");
    if (phoneDigits.length < 8) return setErro("Informe seu telefone com DDD.");
    setLoading(true);
    try {
      await solicitarRecuperacaoSenhaFuncionario({ data: { cpf: cpfDigits, phone: phoneDigits } });
      setOk(true);
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
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl text-[#0F172A]">Recuperar acesso</CardTitle>
            <CardDescription className="text-[#64748B]">
              Informe seu CPF e telefone cadastrados. Seu gerente será avisado para redefinir sua
              senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ok ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="text-sm text-[#0F172A]">
                  Solicitação enviada. Se os dados conferirem, seu gerente receberá o pedido em{" "}
                  <strong>Equipe → Trilha de auditoria</strong> e poderá gerar uma nova senha
                  temporária para você.
                </div>
                <Link
                  to="/funcionario/login"
                  className="inline-block text-sm text-[#2563EB] hover:underline"
                >
                  Voltar ao login
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    inputMode="numeric"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="phone">Telefone (com DDD)</Label>
                  <Input
                    id="phone"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    maxLength={20}
                  />
                </div>
                {erro && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {erro}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-1 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-md hover:opacity-95"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                    </>
                  ) : (
                    "Enviar solicitação"
                  )}
                </Button>
                <div className="mt-2 text-center text-xs">
                  <Link to="/funcionario/login" className="text-[#2563EB] hover:underline">
                    Voltar ao login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

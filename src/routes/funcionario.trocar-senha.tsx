import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myEmployeeContextQuery } from "@/lib/team-queries";
import { trocarSenhaFuncionario } from "@/lib/team.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/funcionario/trocar-senha")({
  ssr: false,
  component: TrocarSenha,
});

function TrocarSenha() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: ctx } = useQuery(myEmployeeContextQuery());
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: (password: string) => trocarSenhaFuncionario({ data: { password } }),
    onSuccess: async () => {
      toast.success("Senha atualizada. Bem-vindo(a)!");
      await qc.invalidateQueries({ queryKey: ["me", "employee-context"] });
      navigate({ to: "/funcionario", replace: true });
    },
    onError: (e: Error) => setErro(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) return setErro("A senha deve ter no mínimo 8 caracteres.");
    if (senha !== conf) return setErro("As senhas não coincidem.");
    mut.mutate(senha);
  };

  const nome = ctx?.employee?.nome?.split(" ")[0] ?? "";

  return (
    <div className="max-w-lg mx-auto">
      <Card className="rounded-2xl border-[#E5E7EB]">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-md">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-[#0F172A]">Defina sua nova senha</CardTitle>
          <CardDescription>
            {nome ? `Olá, ${nome}! ` : ""}Antes de começar, escolha uma senha pessoal para o seu
            acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="s1">Nova senha</Label>
              <PasswordInput
                id="s1"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
              />
              <p className="text-xs text-[#64748B]">Mínimo 8 caracteres.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s2">Confirme a senha</Label>
              <PasswordInput
                id="s2"
                value={conf}
                onChange={(e) => setConf(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {erro && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {erro}
              </div>
            )}
            <Button
              type="submit"
              disabled={mut.isPending}
              className="rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-md hover:opacity-95"
            >
              {mut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
                </>
              ) : (
                "Salvar e entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

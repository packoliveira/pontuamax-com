import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/lojista/login")({
  ssr: false,
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const login = useStore((s) => s.loginLojista);
  const lojas = useStore((s) => s.lojas);
  const [email, setEmail] = useState("demo@qsfclub.com");
  const [senha, setSenha] = useState("demo1234");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login(lojas[0]?.id ?? "loja_demo");
    navigate({ to: "/lojista" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4">Painel do lojista</CardTitle>
          <CardDescription>Entre para gerenciar seu programa de fidelidade</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Entrar</Button>
            <p className="text-xs text-center text-muted-foreground">
              Demo: qualquer email/senha entra na loja de exemplo.<br />
              <Link to="/lojista/onboarding" className="underline">Ou criar nova loja</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
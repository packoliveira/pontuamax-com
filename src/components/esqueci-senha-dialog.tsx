import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { traduzirErroAuth } from "@/lib/auth-errors";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
  darkTheme?: boolean;
};

export function EsqueciSenhaDialog({
  open,
  onOpenChange,
  defaultEmail = "",
  darkTheme = false,
}: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/redefinir-senha`
        : "https://retail-rewards.lovable.app/redefinir-senha";
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    if (error) {
      toast.error(traduzirErroAuth(error));
      return;
    }
    setSent(true);
  };

  const reset = () => {
    setSent(false);
    setEmail(defaultEmail);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className={darkTheme ? "bg-slate-900 border-slate-700 text-slate-100" : ""}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Esqueci minha senha
          </DialogTitle>
          <DialogDescription className={darkTheme ? "text-slate-400" : undefined}>
            Vamos enviar um link no seu email para você criar uma nova senha.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div
            className={`rounded-md p-4 text-sm flex items-start gap-3 ${darkTheme ? "border border-green-500/30 bg-green-500/10 text-green-200" : "border border-green-300 bg-green-50 text-green-900"}`}
          >
            <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Link enviado!</p>
              <p className="text-xs">
                Se <strong>{email}</strong> tiver conta cadastrada, você vai receber um email em
                instantes. Confira a caixa de entrada e a pasta de spam. O link expira em 1 hora.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fp-email" className={darkTheme ? "text-slate-200" : undefined}>
                Email da conta
              </Label>
              <Input
                id="fp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={
                  darkTheme
                    ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                    : undefined
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !email}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  "Enviar link"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

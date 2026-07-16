import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check, LogIn, Ticket, Gift, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { listarNotificacoesLojista, marcarNotificacoesLidas } from "@/lib/team.functions";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { timeAgo } from "@/lib/qsf-shared";

function iconFor(tipo: string) {
  if (tipo === "employee.login") return <LogIn className="h-4 w-4 text-sky-500" />;
  if (tipo === "voucher.validado") return <Ticket className="h-4 w-4 text-emerald-500" />;
  if (tipo === "resgate.confirmado") return <Gift className="h-4 w-4 text-violet-500" />;
  if (tipo === "voucher.cancelado") return <XCircle className="h-4 w-4 text-rose-500" />;
  return <Bell className="h-4 w-4 text-muted-foreground" />;
}

export function NotificationsBell({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const listar = useServerFn(listarNotificacoesLojista);
  const marcar = useServerFn(marcarNotificacoesLidas);

  const { data } = useQuery({
    queryKey: ["merchant-notifications"],
    queryFn: () => listar(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const storeId: string | undefined = data?.storeId;

  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`merchant-notifications-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "merchant_notifications",
          filter: `store_id=eq.${storeId}`,
        },
        (payload: any) => {
          qc.invalidateQueries({ queryKey: ["merchant-notifications"] });
          const n = payload?.new;
          if (n?.titulo) {
            toast(n.titulo, { description: n.mensagem ?? undefined });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "merchant_notifications",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["merchant-notifications"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, qc]);

  const marcarMut = useMutation({
    mutationFn: (ids?: string[]) => marcar({ data: { ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchant-notifications"] }),
  });

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];
  const dark = variant === "dark";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-11 w-11",
            dark && "text-white/80 hover:bg-white/10 hover:text-white",
          )}
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-[10px] font-bold text-white px-1 flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[92vw] max-w-sm p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-semibold">Notificações</div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={unread === 0 || marcarMut.isPending}
            onClick={() => marcarMut.mutate(undefined)}
          >
            <Check className="h-3.5 w-3.5 mr-1" /> Marcar todas
          </Button>
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma notificação por aqui.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n: any) => (
                <li
                  key={n.id}
                  className={cn(
                    "px-3 py-2.5 flex items-start gap-2.5 text-sm",
                    !n.read_at && "bg-primary/5",
                  )}
                >
                  <div className="mt-0.5">{iconFor(n.tipo)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className={cn("font-medium truncate", !n.read_at && "text-foreground")}>
                        {n.titulo}
                      </div>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {n.mensagem && (
                      <div className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</div>
                    )}
                  </div>
                  {!n.read_at && (
                    <button
                      onClick={() => marcarMut.mutate([n.id])}
                      className="shrink-0 text-[10px] text-primary hover:underline"
                      title="Marcar como lida"
                    >
                      lida
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

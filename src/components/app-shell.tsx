import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent,
  SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/use-permissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { NAV_ITEMS, type NavItem } from "@/config/navigation";
import { ExternalLink, Copy, LogOut } from "lucide-react";

export function AppShell({ children, userEmail }: { children: ReactNode; userEmail: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Busca dados da loja (Whitelabel Multi-Tenant)
  const { data: org } = useQuery({
    queryKey: ["appshell-org-whitelabel"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: p } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
      if (!p?.organization_id) return null;
      const { data: o } = await supabase.from("organizations").select("id, name, logo_url").eq("id", p.organization_id).maybeSingle();
      return o;
    },
  });

  const storeName = org?.name || "Minha Loja";
  const slug = org?.name ? org.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") : "minhaloja";

  function copyPublicLink() {
    navigator.clipboard.writeText(`https://pontuamax.com.br/${slug}`);
    toast.success("Link da sua página pública copiado!");
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Você saiu");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-900">
      {/* Sidebar Whitelabel Fixo */}
      <aside className="w-64 bg-[#0b1021] text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        {/* Top Header Marca */}
        <div className="p-5 flex items-center gap-3">
          {org?.logo_url ? (
            <img src={org.logo_url} alt={storeName} className="h-9 w-9 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-md select-none shrink-0">
              P
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-extrabold text-white text-base tracking-tight leading-none">
              Pontua<span className="text-blue-400">Max</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{storeName}</p>
          </div>
        </div>

        {/* Card de Página Pública Customizável por Lojista */}
        <div className="px-4 py-1">
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 space-y-1.5 shadow-inner">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Sua página pública
            </span>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-mono font-semibold text-blue-300 truncate">
                /{slug}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={copyPublicLink}
                  title="Copiar link"
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <a
                  href={`/$slug`}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir página"
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Menu de Navegação Whitelabel */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <Link
                key={item.id}
                to={item.url as any}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-800/90 text-white border border-slate-700/60 shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer do Operador */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span className="truncate max-w-[150px] font-medium">{userEmail || "Operador"}</span>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sair da Sessão"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

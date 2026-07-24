import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { progressoNivel } from "@/lib/qsf-shared";

export const NIVEL_COR: Record<string, string> = {
  bronze: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  prata: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
  ouro: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-200",
};

export function NivelBadge({ pontos, nivel }: { pontos: number; nivel: string }) {
  const prog = progressoNivel(pontos);
  return (
    <div className="flex flex-col items-end gap-1">
      <Badge
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${NIVEL_COR[nivel] ?? ""}`}
        variant="secondary"
      >
        <Trophy className="mr-1 h-3 w-3" /> {nivel}
      </Badge>
      {prog.proximo ? (
        <div className="w-32">
          <div className="mb-0.5 flex items-center justify-between text-[10px] text-[#64748B]">
            <span>→ {prog.proximo}</span>
            <span>{Math.max(0, Math.min(prog.alvo, prog.alvo - prog.atual))} pts</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
            <div
              className="h-full bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8] transition-all duration-200"
              style={{ width: `${Math.min(100, Math.max(0, prog.pct))}%` }}
            />
          </div>
        </div>
      ) : (
        <span className="text-[10px] text-[#64748B]">nível máximo</span>
      )}
    </div>
  );
}

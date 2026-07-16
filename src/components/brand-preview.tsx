import { Coins, Wallet } from "lucide-react";
import type { Modalidade } from "@/lib/qsf-shared";

export function BrandPreview({
  nome,
  logo,
  cor1,
  cor2,
  modalidade,
}: {
  nome: string;
  logo: string;
  cor1: string;
  cor2: string;
  modalidade: Modalidade;
}) {
  const inclPontos = modalidade !== "cashback";
  const inclCashback = modalidade !== "pontos";
  return (
    <div className="rounded-xl overflow-hidden border shadow-sm bg-white">
      <div
        className="p-4 text-white"
        style={{ background: `linear-gradient(135deg, ${cor1}, ${cor2})` }}
      >
        <div className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt="" className="h-8 w-8 rounded bg-white/20 object-contain p-0.5" />
          ) : (
            <div className="h-8 w-8 rounded bg-white/20" />
          )}
          <div className="font-semibold truncate">{nome || "Sua loja"}</div>
        </div>
        <div className="mt-4 text-xs uppercase tracking-wide opacity-80">Olá, cliente!</div>
        <div className="mt-1 text-lg font-bold">Seu programa de fidelidade</div>
      </div>
      <div className="p-4 space-y-2">
        {inclPontos && (
          <div
            className="rounded-lg p-3 flex items-center gap-2"
            style={{ backgroundColor: `${cor1}15` }}
          >
            <Coins className="h-4 w-4" style={{ color: cor1 }} />
            <div className="text-sm">
              <strong>240</strong> pontos
            </div>
          </div>
        )}
        {inclCashback && (
          <div
            className="rounded-lg p-3 flex items-center gap-2"
            style={{ backgroundColor: `${cor2}15` }}
          >
            <Wallet className="h-4 w-4" style={{ color: cor2 }} />
            <div className="text-sm">
              <strong>R$ 32,50</strong> de cashback
            </div>
          </div>
        )}
        <button
          className="w-full mt-2 py-2 rounded-md text-sm font-medium text-white"
          style={{ backgroundColor: cor1 }}
        >
          Resgatar
        </button>
      </div>
    </div>
  );
}

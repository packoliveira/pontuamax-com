import logoAsset from "@/assets/pontuamax-logo.png.asset.json";

type Props = { className?: string; size?: number };

/** Aspect ratio da lockup (largura ÷ altura) após crop nas bordas do PNG. */
const LOGO_ASPECT = 856 / 220;

/**
 * Logo oficial PontuaMax (lockup completa com "P" + "PontuaMax").
 * Usa a arte enviada pela marca, com fundo transparente.
 * `size` é a ALTURA em px. `variant` é aceito por compatibilidade — a lockup
 * é a mesma em fundo claro ou escuro.
 */
export function PontuaMaxMark({ className, size = 32 }: Props) {
  return (
    <img
      src={logoAsset.url}
      alt="PontuaMax"
      height={size}
      width={Math.round(size * LOGO_ASPECT)}
      style={{ height: size, width: "auto", display: "block" }}
      className={className}
      draggable={false}
    />
  );
}

/**
 * Compat: a lockup já contém o wordmark, então este componente não renderiza
 * nada. Mantido para não quebrar chamadas antigas que combinavam Mark + Wordmark.
 */
export function PontuaMaxWordmark(_: {
  className?: string;
  variant?: "light" | "dark";
  size?: number;
}) {
  return null;
}

/** Logo completa (alias de `PontuaMaxMark`). */
export function PontuaMaxLogo({
  className,
  size = 28,
}: {
  className?: string;
  variant?: "light" | "dark";
  size?: number;
}) {
  return <PontuaMaxMark className={className} size={size} />;
}

import { useId } from "react";

type Props = { className?: string; size?: number };

/** Ícone oficial PontuaMax: "P" moderno com degradê roxo → azul → verde-água.
 *  Minimalista, sem elementos figurativos. Funciona sozinho como favicon. */
export function PontuaMaxMark({ className, size = 32 }: Props) {
  const id = useId().replace(/:/g, "");
  const gradId = `pm-grad-${id}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6D28D9" />
          <stop offset="55%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#14CBA8" />
        </linearGradient>
      </defs>
      {/* Base quadrada arredondada com degradê da marca */}
      <rect x="1" y="1" width="30" height="30" rx="8" fill={`url(#${gradId})`} />
      {/* "P" moderno em branco, formado por hastes geométricas */}
      <path
        d="M11 8 h8 a5 5 0 0 1 0 10 h-4"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 8 v16"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Wordmark: "Pontua" adapta ao fundo (dark/light) e "Max" usa o degradê. */
export function PontuaMaxWordmark({
  className,
  variant = "light",
  size = 18,
}: {
  className?: string;
  variant?: "light" | "dark"; // light = fundo claro (texto escuro); dark = fundo escuro (texto branco)
  size?: number;
}) {
  const id = useId().replace(/:/g, "");
  const gradId = `pm-word-${id}`;
  const pontuaColor = variant === "dark" ? "#FFFFFF" : "#0F172A";
  return (
    <span
      className={"inline-flex items-baseline font-semibold tracking-tight " + (className ?? "")}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      <span style={{ color: pontuaColor }}>Pontua</span>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6D28D9" />
            <stop offset="55%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#14CBA8" />
          </linearGradient>
        </defs>
      </svg>
      <span
        style={{
          backgroundImage: "linear-gradient(90deg,#6D28D9 0%,#2563EB 55%,#14CBA8 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
        }}
      >
        Max
      </span>
    </span>
  );
}

/** Logo completa (ícone + wordmark). */
export function PontuaMaxLogo({
  className,
  variant = "light",
  size = 20,
}: {
  className?: string;
  variant?: "light" | "dark";
  size?: number;
}) {
  return (
    <span className={"inline-flex items-center gap-2 " + (className ?? "")}>
      <PontuaMaxMark size={size + 8} />
      <PontuaMaxWordmark variant={variant} size={size} />
    </span>
  );
}
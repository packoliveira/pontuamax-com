type Props = { className?: string; size?: number };

/** Ícone de marca PontoaMax. Arco azul (recorrência/relacionamento) com
 *  ponto verde no topo direito (crescimento). Funciona sozinho como favicon. */
export function PontoaMaxMark({ className, size = 32 }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 18 A10 10 0 1 1 16 28"
        fill="none"
        stroke="#155EEF"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="24" cy="8" r="4.5" fill="#22C55E" />
    </svg>
  );
}

/** Logotipo completo: ícone + palavra "Pontoa" (azul) + "Max" (verde). */
export function PontoaMaxLogo({
  className,
  showMark = true,
  size = 20,
}: Props & { showMark?: boolean }) {
  return (
    <span className={"inline-flex items-center gap-2 font-semibold tracking-tight " + (className ?? "")}>
      {showMark && <PontoaMaxMark size={size + 4} />}
      <span style={{ fontSize: size }}>
        <span style={{ color: "#155EEF" }}>Pontoa</span>
        <span style={{ color: "#22C55E" }}>Max</span>
      </span>
    </span>
  );
}
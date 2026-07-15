import { useEffect, useMemo, useState } from "react";
import { Coins, Gift, Ticket, Star, Percent, BadgePercent, Sparkles } from "lucide-react";

type IconKind = "coin" | "gift" | "ticket" | "star" | "percent" | "badge" | "real" | "spark";

type Particle = {
  id: number;
  kind: IconKind;
  left: number; // vw
  size: number; // px
  duration: number; // s
  delay: number; // s
  drift: number; // vw lateral drift
  rotate: number; // deg
  color: string;
  opacity: number;
};

const DEFAULT_COLORS = ["#F59E0B", "#F97316", "#FBBF24", "#FB7185", "#FFFFFF", "#FCD34D"];

const KINDS: IconKind[] = ["coin", "gift", "ticket", "star", "percent", "badge", "real", "spark"];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    setMobile(mq.matches);
    const on = () => setMobile(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return mobile;
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function Icon({ kind, size, color }: { kind: IconKind; size: number; color: string }) {
  const common = { size, color, strokeWidth: 1.75 } as const;
  switch (kind) {
    case "coin": return <Coins {...common} />;
    case "gift": return <Gift {...common} />;
    case "ticket": return <Ticket {...common} />;
    case "star": return <Star {...common} fill={color} />;
    case "percent": return <Percent {...common} />;
    case "badge": return <BadgePercent {...common} />;
    case "spark": return <Sparkles {...common} />;
    case "real":
      return (
        <span
          aria-hidden
          style={{
            fontSize: size,
            lineHeight: 1,
            color,
            fontWeight: 800,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            letterSpacing: "-0.04em",
          }}
        >
          R$
        </span>
      );
  }
}

export function RewardRain({
  colors,
  count,
}: {
  colors?: string[];
  count?: number;
}) {
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const palette = colors && colors.length > 0 ? colors : DEFAULT_COLORS;
  const target = count ?? (mobile ? 10 : 22);

  const particles = useMemo<Particle[]>(() => {
    if (reduced) return [];
    const n = target;
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      kind: pick(KINDS),
      left: rand(0, 100),
      size: rand(mobile ? 14 : 18, mobile ? 26 : 34),
      duration: rand(9, 16),
      delay: rand(-16, 0),
      drift: rand(-8, 8),
      rotate: rand(-45, 45),
      color: pick(palette),
      opacity: rand(0.15, 0.35),
    }));
  }, [reduced, target, mobile, palette]);

  if (reduced) return null;

  return (
    <div
      aria-hidden
      className="reward-rain-root"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: "-6%",
            left: `${p.left}%`,
            opacity: p.opacity,
            animation: `reward-rain-fall ${p.duration}s linear ${p.delay}s infinite`,
            transform: "translate3d(0,0,0)",
            willChange: "transform, opacity",
            // custom props consumed by keyframes
            ["--drift" as string]: `${p.drift}vw`,
            ["--rot" as string]: `${p.rotate}deg`,
            ["--op" as string]: String(p.opacity),
          }}
        >
          <Icon kind={p.kind} size={p.size} color={p.color} />
        </span>
      ))}
      <style>{`
        @keyframes reward-rain-fall {
          0%   { transform: translate3d(0, -10vh, 0) rotate(0deg); opacity: 0; }
          8%   { opacity: var(--op, 0.25); }
          80%  { opacity: var(--op, 0.25); }
          100% { transform: translate3d(var(--drift, 0), 108vh, 0) rotate(var(--rot, 30deg)); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .reward-rain-root { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default RewardRain;
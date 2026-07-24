/**
 * PontuaMax — Brand Logo Component
 * Exibe o logotipo e a marca do PontuaMax SaaS Whitelabel.
 */
import type { HTMLAttributes } from "react";

interface BrandMarkProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  onDark?: boolean;
}

interface BrandLockupProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  onDark?: boolean;
}

/** Ícone quadrado com as iniciais PM */
export function BrandMark({ size = 32, className, onDark, ...props }: BrandMarkProps) {
  return (
    <div
      {...props}
      className={className}
      style={{ width: size, height: size, ...props.style }}
    >
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 font-black text-white shadow-lg select-none"
      >
        <span style={{ fontSize: size * 0.38 }}>PM</span>
      </div>
    </div>
  );
}

/** Logotipo completo: ícone + nome */
export function BrandLockup({ size = "md", align = "left", onDark, className, ...props }: BrandLockupProps) {
  const iconSize = size === "lg" ? 40 : size === "md" ? 32 : 24;
  const textClass = size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-base";

  return (
    <div
      {...props}
      className={`flex items-center gap-2.5 ${align === "center" ? "justify-center" : ""} ${className ?? ""}`}
    >
      <BrandMark size={iconSize} />
      <span className={`font-extrabold tracking-tight ${textClass} ${onDark ? "text-white" : "text-slate-900"}`}>
        Pontua<span className="text-indigo-400">Max</span>
      </span>
    </div>
  );
}

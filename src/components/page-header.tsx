import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho de página mobile-first.
 * No celular: título em cima, ações empilhadas em largura total (nunca sobrepostas).
 * A partir de `sm`: título à esquerda, ações à direita.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-1 flex min-w-0 items-center gap-2 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
          {icon ? <span className="shrink-0">{icon}</span> : null}
          <span className="min-w-0 break-words">{title}</span>
        </h1>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <PageHeaderActions>{actions}</PageHeaderActions> : null}
    </div>
  );
}

/** Barra de ações do cabeçalho: full-width no celular, inline no desktop. */
export function PageHeaderActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Container padrão de página com espaçamento consistente. */
export function PageShell({
  children,
  className,
  size = "full",
}: {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "full";
}) {
  const max = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-6xl",
    full: "",
  }[size];
  return <div className={cn("space-y-6 sm:space-y-8", max, className)}>{children}</div>;
}

/** Linha com texto flexível + widget fixo, segura em telas pequenas. */
export function ResponsiveRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

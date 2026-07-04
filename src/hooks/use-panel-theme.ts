import { useCallback, useEffect, useState } from "react";

const KEY = "qsf-panel-theme";
type Theme = "light" | "dark";

function readInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(KEY);
  if (saved === "dark" || saved === "light") return saved;
  return "light";
}

/**
 * Aplica o tema (claro/escuro) do painel interno enquanto o componente estiver
 * montado. A preferência é salva no localStorage e usada em todos os painéis.
 */
export function usePanelTheme() {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem(KEY, theme);
    return () => {
      root.classList.remove("dark");
    };
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle, setTheme: setThemeState };
}

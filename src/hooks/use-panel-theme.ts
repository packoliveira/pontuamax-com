import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "qsf-panel-theme";
type Theme = "light" | "dark";

let current: Theme = "light";
const listeners = new Set<() => void>();

function readFromStorage(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(KEY);
  return saved === "dark" ? "dark" : "light";
}

function applyToDom(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function setCurrent(t: Theme) {
  current = t;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, t);
  applyToDom(t);
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  current = readFromStorage();
  applyToDom(current);
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      const v = e.newValue === "dark" ? "dark" : "light";
      if (v !== current) {
        current = v;
        applyToDom(v);
        listeners.forEach((l) => l());
      }
    }
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Quantos painéis estão montados. Só removemos a classe `dark` do <html>
// quando o último painel desmonta — assim o ThemeToggle (que também usa este
// hook) não apaga o tema ao ser desmontado/remontado.
let mounted = 0;

/**
 * Aplica o tema (claro/escuro) do painel enquanto o componente estiver montado
 * e expõe um toggle. A preferência é compartilhada entre os painéis do lojista
 * e do admin via localStorage.
 */
export function usePanelTheme(options?: { scope?: boolean }) {
  const scope = options?.scope ?? false;
  const theme = useSyncExternalStore(
    subscribe,
    () => current,
    () => "light" as Theme,
  );

  useEffect(() => {
    if (!scope) return;
    mounted += 1;
    applyToDom(current);
    return () => {
      mounted -= 1;
      // volta pro tema claro apenas quando nenhum painel está montado
      // (páginas públicas / portais do cliente).
      if (mounted <= 0 && typeof document !== "undefined") {
        document.documentElement.classList.remove("dark");
      }
    };
  }, [scope]);

  useEffect(() => {
    if (scope) applyToDom(theme);
  }, [scope, theme]);

  const toggle = useCallback(() => {
    setCurrent(current === "dark" ? "light" : "dark");
  }, []);

  const setTheme = useCallback((t: Theme) => setCurrent(t), []);

  return { theme, toggle, setTheme };
}

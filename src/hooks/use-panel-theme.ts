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
  return () => listeners.delete(cb);
}

/**
 * Aplica o tema (claro/escuro) do painel enquanto o componente estiver montado
 * e expõe um toggle. A preferência é compartilhada entre os painéis do lojista
 * e do admin via localStorage.
 */
export function usePanelTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => current,
    () => "light" as Theme,
  );

  useEffect(() => {
    applyToDom(theme);
    return () => {
      // volta pro tema claro ao desmontar o painel (portais/páginas públicas)
      if (typeof document !== "undefined") document.documentElement.classList.remove("dark");
    };
  }, [theme]);

  const toggle = useCallback(() => {
    setCurrent(current === "dark" ? "light" : "dark");
  }, []);

  const setTheme = useCallback((t: Theme) => setCurrent(t), []);

  return { theme, toggle, setTheme };
}

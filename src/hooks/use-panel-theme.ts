import { useEffect } from "react";

/**
 * Applies the dark internal panel theme (Lojista + Admin) by toggling the
 * `dark` class on <html> while the hosting component is mounted. Portals
 * (dialogs, popovers, sheets, toasts) inherit the theme because they attach
 * to document.body.
 */
export function usePanelTheme() {
  useEffect(() => {
    const root = document.documentElement;
    // Painel interno agora usa tema claro por padrão.
    // Garantimos que a classe `dark` não fique ativa caso tenha sido
    // adicionada em uma versão anterior.
    root.classList.remove("dark");
    return () => {
      root.classList.remove("dark");
    };
  }, []);
}
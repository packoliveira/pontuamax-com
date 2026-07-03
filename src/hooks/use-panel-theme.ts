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
    root.classList.add("dark");
    return () => {
      root.classList.remove("dark");
    };
  }, []);
}
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePanelTheme } from "@/hooks/use-panel-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = usePanelTheme();
  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      aria-label="Alternar tema"
      className={className}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

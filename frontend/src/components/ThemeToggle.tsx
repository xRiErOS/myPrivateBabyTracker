/** Theme toggle — switches between Latte (light) and Macchiato (dark). */

import { Moon, Sun } from "lucide-react";
import type { Theme } from "../hooks/useTheme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-card bg-surface0 text-subtext0 hover:text-text transition-colors"
      aria-label={theme === "light" ? "Dunkles Design aktivieren" : "Helles Design aktivieren"}
    >
      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}

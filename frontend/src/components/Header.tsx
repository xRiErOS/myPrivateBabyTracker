/** App header with title, child selector, refresh button, and theme toggle. */

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Theme } from "../hooks/useTheme";
import { ChildSelector } from "./ChildSelector";
import { ThemeToggle } from "./ThemeToggle";
import { useToast } from "../context/ToastContext";

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const queryClient = useQueryClient();
  const [spinning, setSpinning] = useState(false);
  const { showToast } = useToast();

  function handleRefresh() {
    setSpinning(true);
    queryClient.invalidateQueries();
    showToast("Daten aktualisiert", "success");
    setTimeout(() => setSpinning(false), 500);
  }

  return (
    <header className="bg-mantle px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <ChildSelector />
      <div className="flex items-center gap-1">
        <button
          onClick={handleRefresh}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-card bg-surface0 text-subtext0 hover:text-text transition-colors"
          aria-label="Daten aktualisieren"
        >
          <RefreshCw size={20} className={spinning ? "animate-spin-once" : ""} />
        </button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}

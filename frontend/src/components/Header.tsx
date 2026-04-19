/** App header with title, child selector, and theme toggle. */

import type { Theme } from "../hooks/useTheme";
import { ChildSelector } from "./ChildSelector";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="bg-surface0 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <h1 className="font-headline text-xl font-bold text-text">MyBaby</h1>
      <div className="flex items-center gap-3">
        <ChildSelector />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}

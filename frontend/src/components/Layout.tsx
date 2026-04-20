/** Responsive shell — Header + Sidebar (desktop) / BottomNav (mobile). */

import type { ReactNode } from "react";
import { useTheme } from "../hooks/useTheme";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-ground text-text">
      <Header theme={theme} onToggleTheme={toggle} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 max-w-screen-lg mx-auto px-4 pt-[72px] pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

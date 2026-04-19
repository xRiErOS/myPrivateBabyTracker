import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-ground text-text">
      <header className="bg-surface0 border-b border-surface1 px-4 py-3">
        <h1 className="font-headline text-xl font-bold">MyBaby</h1>
      </header>
      <main className="max-w-screen-lg mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

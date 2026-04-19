/** Reusable card component per DESIGN.md — surface0, rounded-card, no shadows. */

import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      className={`bg-surface0 rounded-card p-4 ${className}`.trim()}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {children}
    </div>
  );
}

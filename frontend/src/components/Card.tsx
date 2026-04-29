/** Reusable card component per DESIGN.md — surface0, rounded-card, no shadows. */

import type { CSSProperties, ReactNode, TouchEventHandler } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  onTouchStart?: TouchEventHandler;
  onTouchMove?: TouchEventHandler;
  onTouchEnd?: TouchEventHandler;
  "data-tutorial"?: string;
}

export function Card({
  children,
  className = "",
  style,
  onClick,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  "data-tutorial": dataTutorial,
}: CardProps) {
  return (
    <div
      className={`bg-surface0 rounded-card p-4 ${className}`.trim()}
      style={style}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      data-tutorial={dataTutorial}
      role={onClick ? "button" : undefined}
    >
      {children}
    </div>
  );
}

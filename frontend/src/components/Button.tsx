/** Button component — Primary/Secondary/Danger per DESIGN.md. */

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-peach text-ground hover:opacity-90",
  secondary:
    "bg-surface1 text-text hover:bg-surface2",
  danger:
    "bg-red text-ground hover:opacity-90",
};

export function Button({
  variant = "primary",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`min-h-[44px] px-5 py-2.5 rounded-[8px] font-label text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`.trim()}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

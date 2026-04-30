/** Reusable page header with back button and title. */

import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={() => navigate(-1)}
          className="min-h-[44px] min-w-[44px] flex shrink-0 items-center justify-center rounded-card text-subtext0 hover:text-text transition-colors"
          aria-label="Zurück"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-headline text-lg font-semibold truncate">{title}</h2>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

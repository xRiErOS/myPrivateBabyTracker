/** Empty state placeholder when no data is available. */

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon size={48} className="text-overlay0 mb-4" />}
      <h3 className="font-headline text-lg font-semibold text-text mb-1">
        {title}
      </h3>
      {description && (
        <p className="font-body text-sm text-subtext0 max-w-xs">
          {description}
        </p>
      )}
    </div>
  );
}

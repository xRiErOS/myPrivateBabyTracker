/** Mobile bottom navigation — Dashboard only.

All other navigation is handled by the burger menu in the Header.
Touch targets: min 44px. Only visible on mobile (< md).
*/

import { LayoutDashboard } from "lucide-react";
import { NavLink } from "react-router-dom";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface0 border-t border-surface1 px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-center">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-2 px-4 text-xs font-label font-medium transition-colors ${
              isActive ? "text-mauve" : "text-subtext0 hover:text-text"
            }`
          }
        >
          <LayoutDashboard size={20} />
          <span className="mt-0.5">Dashboard</span>
        </NavLink>
      </div>
    </nav>
  );
}

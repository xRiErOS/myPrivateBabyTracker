/** App header with child selector, refresh, admin link, profile and mobile burger menu.
 *
 * MBT-178: Theme-Toggle ist nach /profile umgezogen. Stattdessen erscheint hier
 * ein Verwaltungs-Icon (Settings) das nach /admin navigiert (Mobile + Desktop).
 */

import { useEffect, useState } from "react";
import { Menu, RefreshCw, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChildSelector } from "./ChildSelector";
import { MobileMenu } from "./MobileMenu";
import { useToast } from "../context/ToastContext";
import { AlertBell } from "./AlertBell";

export function Header() {
  const queryClient = useQueryClient();
  const [spinning, setSpinning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { showToast } = useToast();

  function handleRefresh() {
    setSpinning(true);
    queryClient.invalidateQueries();
    showToast("Daten aktualisiert", "success");
    setTimeout(() => setSpinning(false), 500);
  }

  // Tutorial-Hook (MBT-167): Burger programmatisch oeffnen/schliessen
  useEffect(() => {
    const open = () => setMenuOpen(true);
    const close = () => setMenuOpen(false);
    window.addEventListener("mybaby:tutorial:open-mobile-menu", open);
    window.addEventListener("mybaby:tutorial:close-mobile-menu", close);
    return () => {
      window.removeEventListener("mybaby:tutorial:open-mobile-menu", open);
      window.removeEventListener("mybaby:tutorial:close-mobile-menu", close);
    };
  }, []);

  return (
    <>
      <header className="bg-mantle px-4 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
        <ChildSelector />
        <div className="flex items-center gap-1">
          <AlertBell />
          <button
            onClick={handleRefresh}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-card bg-surface0 text-subtext0 hover:text-text transition-colors"
            aria-label="Daten aktualisieren"
          >
            <RefreshCw size={20} className={spinning ? "animate-spin-once" : ""} />
          </button>
          <Link
            to="/admin"
            data-tutorial="admin-link"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-card bg-surface0 text-subtext0 hover:text-text transition-colors"
            aria-label="Verwaltung"
          >
            <Settings size={20} />
          </Link>
          <Link
            to="/profile"
            data-tutorial="profile-link"
            className="hidden md:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-card bg-surface0 text-subtext0 hover:text-text transition-colors"
            aria-label="Profil"
          >
            <User size={20} />
          </Link>
          {/* Burger menu — mobile only */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            data-tutorial="mobile-menu-toggle"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-card bg-surface0 text-subtext0 hover:text-text transition-colors md:hidden"
            aria-label="Navigation oeffnen"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

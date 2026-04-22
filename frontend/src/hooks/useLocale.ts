/** Syncs i18next language with user preferences from the backend. */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getPreferences } from "../api/preferences";

export function useLocaleSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    async function syncLocale() {
      try {
        const prefs = await getPreferences();
        if (!cancelled && prefs.locale && prefs.locale !== i18n.language) {
          i18n.changeLanguage(prefs.locale);
          localStorage.setItem("mybaby_language", prefs.locale);
        }
      } catch {
        // Auth disabled or not logged in — fall back to localStorage/browser detection
      }
    }

    syncLocale();
    return () => { cancelled = true; };
  }, [i18n]);
}

/** Helper hook for consistent entry-saved toast feedback (MBT-187).
 *
 * Defensive: if rendered outside ToastProvider (e.g. in unit tests that don't
 * wrap the component), the hook silently no-ops instead of throwing.
 */

import { useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import { ToastContext } from "../context/ToastContext";

export function useEntryToast() {
  const ctx = useContext(ToastContext);
  const { t } = useTranslation("common");

  const saved = useCallback(() => {
    ctx?.showToast(t("entry_saved"));
  }, [ctx, t]);

  const updated = useCallback(() => {
    ctx?.showToast(t("entry_updated"));
  }, [ctx, t]);

  const error = useCallback(
    (message?: string) => {
      ctx?.showToast(message ?? t("entry_save_failed"), "error");
    },
    [ctx, t],
  );

  return { saved, updated, error };
}

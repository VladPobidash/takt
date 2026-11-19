import { useApp } from "../app-context.tsx";
import { applyUpdate, useUpdateAvailable } from "../pwa.ts";

/** "Update available" — shown on the library and settings screens only, never while playing. */
export function UpdateNotice() {
  const { t } = useApp();
  if (!useUpdateAvailable()) return null;
  return (
    <div
      role="status"
      className="mb-2 flex items-center gap-3 rounded-control bg-surface px-3 py-2"
    >
      <span className="min-w-0 flex-1 text-[13px] font-semibold">{t("update.available")}</span>
      <button
        type="button"
        onClick={applyUpdate}
        className="h-9 shrink-0 rounded-control bg-accent px-3 text-[13px] font-bold text-accent-fg"
      >
        {t("update.apply")}
      </button>
    </div>
  );
}

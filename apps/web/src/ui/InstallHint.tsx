import { useApp } from "../app-context.tsx";
import { isAppleMobile, isStandalone, useInstallPrompt } from "../pwa.ts";

/**
 * Shown in the library while the app runs in a browser tab: how to install it, so it starts
 * without a network (ADR 0007). Dismissed once per device.
 */
export function InstallHint() {
  const { settings, data, t } = useApp();
  const install = useInstallPrompt();
  if (settings.installHintDismissed || isStandalone()) return null;
  const text = install
    ? t("install.prompt")
    : isAppleMobile()
      ? t("install.ios")
      : t("install.other");
  return (
    <aside aria-label={t("install.title")} className="mb-2 rounded-control bg-surface px-3 py-2">
      <p className="text-[13px] font-semibold">
        <b className="font-extrabold">{t("install.title")}.</b> {text}
      </p>
      <div className="mt-1.5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => void data.setSetting("installHintDismissed", true)}
          className="h-9 rounded-control px-3 text-[13px] font-bold text-muted"
        >
          {t("install.dismiss")}
        </button>
        {install && (
          <button
            type="button"
            onClick={install}
            className="h-9 rounded-control bg-accent px-3 text-[13px] font-bold text-accent-fg"
          >
            {t("install.install")}
          </button>
        )}
      </div>
    </aside>
  );
}

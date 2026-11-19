import { registerSW } from "virtual:pwa-register";
import { useSyncExternalStore } from "react";

/**
 * Service-worker updates (ADR 0007): a new version downloads in the background and waits.
 * It is applied only when the user asks (from the library or settings) or on the next start —
 * never while a song is on screen.
 */
let waiting = false;
let apply: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
  apply = registerSW({
    onNeedRefresh() {
      waiting = true;
      for (const listener of listeners) listener();
    },
  });
}

/** True when a newer version of the app is ready to be applied. */
export function useUpdateAvailable(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => waiting,
  );
}

export function applyUpdate(): void {
  void apply?.(true);
}

/** Asks the browser not to evict the app's data under storage pressure. Safe to call repeatedly. */
export function requestPersistentStorage(): void {
  void navigator.storage?.persist?.().catch(() => false);
}

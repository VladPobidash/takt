import { registerSW } from "virtual:pwa-register";
import { useSyncExternalStore } from "react";
import { checkRegistration, type UpdateCheck } from "./update-check.ts";

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

/**
 * Asks the server for a newer version now, instead of waiting for the browser's own check
 * (ADR 0014). A version it finds is downloaded and waits, like any other update.
 */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (waiting) return "available";
  const registration = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (!registration) return "failed";
  const result = await checkRegistration(registration);
  if (result === "available" && !waiting) {
    waiting = true;
    for (const listener of listeners) listener();
  }
  return result;
}

/** Asks the browser not to evict the app's data under storage pressure. Safe to call repeatedly. */
export function requestPersistentStorage(): void {
  void navigator.storage?.persist?.().catch(() => false);
}

/** True when the app runs installed (from the home screen), not in a browser tab. */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone and iPad have no install prompt: the user adds the app from Safari's Share menu. */
export function isAppleMobile(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
}
let installPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

/** Chromium offers an install prompt through an event; it is kept until the user asks for it. */
export function listenForInstallPrompt(): void {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    for (const listener of installListeners) listener();
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    for (const listener of installListeners) listener();
  });
}

/** A function that opens the browser's install dialog, or null where there is none. */
export function useInstallPrompt(): (() => void) | null {
  const available = useSyncExternalStore(
    (listener) => {
      installListeners.add(listener);
      return () => installListeners.delete(listener);
    },
    () => installPrompt !== null,
  );
  return available ? () => void installPrompt?.prompt() : null;
}

import { useEffect } from "react";

/**
 * Keeps the screen awake while a song is open (Screen Wake Lock API). The lock is lost
 * whenever the page is hidden, so it is taken again when the page becomes visible.
 * Where the API is missing or refused the screen simply follows the system setting.
 */
export function useWakeLock(): void {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const taken = await navigator.wakeLock.request("screen");
        if (cancelled) void taken.release();
        else lock = taken;
      } catch {
        // Refused (low battery, power saving): nothing to do.
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, []);
}

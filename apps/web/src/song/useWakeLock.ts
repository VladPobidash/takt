import { useEffect, useState } from "react";

/** `refused`: the browser has no wake lock or would not give it — the screen may turn off. */
export type WakeLockState = "pending" | "active" | "refused";

/**
 * Keeps the screen awake while a song is open (Screen Wake Lock API). The lock is lost
 * whenever the page is hidden, so it is taken again when the page becomes visible.
 * Returns whether the lock is held, so the app can say when it is not (ADR 0007).
 */
export function useWakeLock(): WakeLockState {
  const [state, setState] = useState<WakeLockState>("pending");
  useEffect(() => {
    if (!("wakeLock" in navigator)) {
      setState("refused");
      return;
    }
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const taken = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void taken.release();
          return;
        }
        lock = taken;
        setState("active");
      } catch {
        // Refused: low battery, power saving, or a browser that does not allow it here.
        if (!cancelled) setState("refused");
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
  return state;
}

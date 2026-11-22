/** What a check for a newer version of the app found. */
export type UpdateCheck = "available" | "current" | "failed";

/** A service worker on its way in: the parts of `ServiceWorker` the check reads. */
export interface IncomingWorker {
  state: string;
  addEventListener(type: "statechange", listener: () => void): void;
  removeEventListener(type: "statechange", listener: () => void): void;
}

/** The parts of `ServiceWorkerRegistration` the check reads. */
export interface UpdatableRegistration {
  update(): Promise<unknown>;
  installing: IncomingWorker | null;
  waiting: unknown;
}

/** Resolves with the worker's state once it has left `installing`. */
function installed(worker: IncomingWorker): Promise<string> {
  return new Promise((resolve) => {
    const settle = () => {
      if (worker.state === "installing") return;
      worker.removeEventListener("statechange", settle);
      resolve(worker.state);
    };
    worker.addEventListener("statechange", settle);
    settle();
  });
}

/**
 * Asks the server for a newer version right now (ADR 0014). `available` means a new version
 * has been downloaded and waits to be applied; nothing is applied here (ADR 0007).
 */
export async function checkRegistration(registration: UpdatableRegistration): Promise<UpdateCheck> {
  if (registration.waiting) return "available";
  try {
    await registration.update();
  } catch {
    // No network, or the server did not answer with a service worker.
    return "failed";
  }
  const incoming = registration.installing;
  if (incoming && (await installed(incoming)) === "redundant") return "failed";
  return registration.waiting ? "available" : "current";
}

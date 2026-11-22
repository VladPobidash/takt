import { describe, expect, it } from "vitest";
import {
  checkRegistration,
  type IncomingWorker,
  type UpdatableRegistration,
} from "./update-check.ts";

/** A worker whose state the test moves by hand. */
function worker(state: string) {
  const listeners = new Set<() => void>();
  const incoming: IncomingWorker = {
    state,
    addEventListener: (_type, listener) => void listeners.add(listener),
    removeEventListener: (_type, listener) => void listeners.delete(listener),
  };
  return {
    incoming,
    listeners,
    become(next: string) {
      incoming.state = next;
      for (const listener of [...listeners]) listener();
    },
  };
}

describe("checkRegistration", () => {
  it("says the app is current when the server has nothing newer", async () => {
    let asked = 0;
    const registration: UpdatableRegistration = {
      update: async () => void asked++,
      installing: null,
      waiting: null,
    };
    expect(await checkRegistration(registration)).toBe("current");
    expect(asked).toBe(1);
  });

  it("does not ask the server when a version is already waiting", async () => {
    let asked = 0;
    const registration: UpdatableRegistration = {
      update: async () => void asked++,
      installing: null,
      waiting: {},
    };
    expect(await checkRegistration(registration)).toBe("available");
    expect(asked).toBe(0);
  });

  it("waits for a new version to finish downloading before it says it is available", async () => {
    const next = worker("installing");
    const registration: UpdatableRegistration = {
      update: async () => {
        registration.installing = next.incoming;
      },
      installing: null,
      waiting: null,
    };
    let result: string | null = null;
    const check = checkRegistration(registration).then((value) => {
      result = value;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(result).toBeNull();

    registration.installing = null;
    registration.waiting = next.incoming;
    next.become("installed");
    await check;
    expect(result).toBe("available");
    expect(next.listeners.size).toBe(0);
  });

  it("fails when the server cannot be reached", async () => {
    const registration: UpdatableRegistration = {
      update: () => Promise.reject(new TypeError("Failed to fetch")),
      installing: null,
      waiting: null,
    };
    expect(await checkRegistration(registration)).toBe("failed");
  });

  it("fails when the new version could not be installed", async () => {
    const next = worker("installing");
    const registration: UpdatableRegistration = {
      update: async () => {
        registration.installing = next.incoming;
        // The browser reports a failed install in a later task, as it does every state change.
        setTimeout(() => {
          registration.installing = null;
          next.become("redundant");
        }, 0);
      },
      installing: null,
      waiting: null,
    };
    expect(await checkRegistration(registration)).toBe("failed");
  });

  it("is current after a first install, which activates without waiting", async () => {
    const first = worker("activated");
    const registration: UpdatableRegistration = {
      update: async () => {
        registration.installing = first.incoming;
      },
      installing: null,
      waiting: null,
    };
    expect(await checkRegistration(registration)).toBe("current");
  });
});

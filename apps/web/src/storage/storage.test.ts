import { describe, expect, test } from "vitest";
import { AppData } from "./app-state.ts";
import { createMemoryStore } from "./memory.ts";
import { slugify, uniqueId } from "./slug.ts";

describe("slugify", () => {
  test("file names and titles in any script", () => {
    expect(slugify("Silent Night.takt")).toBe("silent-night");
    expect(slugify("Достойний Ти Один")).toBe("достойний-ти-один");
    expect(slugify("  Боже, я вдячний Тобі!  ")).toBe("боже-я-вдячний-тобі");
    expect(slugify("dostoinyi-ty-odyn.takt")).toBe("dostoinyi-ty-odyn");
    expect(slugify("???")).toBe("song");
  });

  test("uniqueId numbers duplicates", () => {
    expect(uniqueId("a", new Set())).toBe("a");
    expect(uniqueId("a", new Set(["a", "a-2"]))).toBe("a-3");
  });
});

describe("AppData", () => {
  const seed = [{ name: "silent-night.takt", text: "# Silent Night\n" }];

  test("seeds example songs once, on the very first run", async () => {
    const store = createMemoryStore();
    const first = await AppData.load(store, { preferredLanguages: ["en"], seed });
    expect(first.getState().songs.map((s) => s.id)).toEqual(["silent-night"]);
    await first.deleteSong("silent-night");
    const second = await AppData.load(store, { preferredLanguages: ["en"], seed });
    expect(second.getState().songs).toEqual([]);
  });

  test("an example added in a later version reaches a device that already uses the app", async () => {
    const store = createMemoryStore();
    const original = [{ name: "silent-night.takt", text: "# Silent Night\n", original: true }];
    const first = await AppData.load(store, { preferredLanguages: ["en"], seed: original });
    await first.deleteSong("silent-night");

    const later = [...original, { name: "vdiachnist.takt", text: "# Вдячність\n" }];
    const second = await AppData.load(store, { preferredLanguages: ["en"], seed: later });
    // The new example arrives; the deleted one does not come back.
    expect(second.getState().songs.map((s) => s.id)).toEqual(["vdiachnist"]);
    await second.deleteSong("vdiachnist");
    const third = await AppData.load(store, { preferredLanguages: ["en"], seed: later });
    expect(third.getState().songs).toEqual([]);
  });

  test("a device seeded before the list of examples existed gets only the new ones", async () => {
    const store = createMemoryStore();
    await store.setSetting("seeded", true);
    await store.putSong({ id: "my-song", text: "# Mine\n", updatedAt: 1 });
    const seed = [
      { name: "silent-night.takt", text: "# Silent Night\n", original: true },
      { name: "vdiachnist.takt", text: "# Вдячність\n" },
    ];
    const data = await AppData.load(store, { preferredLanguages: ["en"], seed });
    expect(data.getState().songs.map((s) => s.id)).toEqual(["my-song", "vdiachnist"]);
  });

  test("an example never replaces or doubles a song the musician already has under that name", async () => {
    const store = createMemoryStore();
    await store.putSong({ id: "vdiachnist", text: "# My own version\n", updatedAt: 1 });
    const seed = [{ name: "vdiachnist.takt", text: "# Вдячність\n" }];
    const data = await AppData.load(store, { preferredLanguages: ["en"], seed });
    expect(data.getState().songs.map((s) => [s.id, s.text])).toEqual([
      ["vdiachnist", "# My own version\n"],
    ]);
  });

  test("first-run defaults follow the browser language; saved settings win", async () => {
    const store = createMemoryStore();
    const data = await AppData.load(store, { preferredLanguages: ["uk-UA", "en"] });
    expect(data.getState().settings).toMatchObject({
      language: "uk",
      notation: "H",
      theme: "system",
    });
    await data.setSetting("notation", "B");
    await data.setSetting("theme", "dark");
    const again = await AppData.load(store, { preferredLanguages: ["en"] });
    expect(again.getState().settings).toMatchObject({
      language: "en",
      notation: "B",
      theme: "dark",
    });
  });

  test("importing a file with a taken name keeps both", async () => {
    const data = await AppData.load(createMemoryStore(), { preferredLanguages: ["en"], seed });
    await data.importSongs([{ name: "Silent Night.takt", text: "# Other\n" }]);
    expect(data.getState().songs.map((s) => s.id)).toEqual(["silent-night", "silent-night-2"]);
  });

  test("a save is visible in the state at once, before the store has written it", async () => {
    const data = await AppData.load(createMemoryStore(), { preferredLanguages: ["en"] });
    const first = data.saveSetlist({ id: "s", text: "# One\n", updatedAt: 1 });
    expect(data.getState().setlists.map((s) => s.text)).toEqual(["# One\n"]);
    const second = data.saveSetlist({ id: "s", text: "# Two\n", updatedAt: 2 });
    expect(data.getState().setlists.map((s) => s.text)).toEqual(["# Two\n"]);
    await Promise.all([first, second]);
    const song = data.saveSong({ id: "a", text: "# A\n", updatedAt: 1 });
    expect(data.getState().songs.map((s) => s.id)).toEqual(["a"]);
    await song;
  });

  test("subscribers hear about changes and writes reach the store", async () => {
    const store = createMemoryStore();
    const data = await AppData.load(store, { preferredLanguages: ["en"] });
    let calls = 0;
    const unsubscribe = data.subscribe(() => calls++);
    await data.saveSong({ id: "a", text: "# A\n", updatedAt: 1 });
    await data.saveSong({ id: "a", text: "# A2\n", updatedAt: 2 });
    unsubscribe();
    await data.deleteSong("a");
    expect(calls).toBe(2);
    expect(await store.listSongs()).toEqual([]);
  });
});

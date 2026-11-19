import { describe, expect, test } from "vitest";
import { AppData } from "./app-state.ts";
import { backupFileName, createBundle, formatBundle, parseBundle } from "./bundle.ts";
import { createMemoryStore } from "./memory.ts";

const NOW = new Date("2026-11-19T20:00:00Z");
const songs = [
  { id: "b-song", text: "# B\n", updatedAt: 2 },
  { id: "a-song", text: "# A\n| D |\n", updatedAt: 1 },
];

describe("bundle", () => {
  test("round-trips songs as readable JSON, sorted by id", () => {
    const text = formatBundle(createBundle({ songs, setlists: [] }, NOW));
    expect(text).toContain('"format": "takt-bundle"');
    expect(text.endsWith("\n")).toBe(true);
    expect(parseBundle(text)).toEqual({
      format: "takt-bundle",
      version: 1,
      exportedAt: "2026-11-19T20:00:00.000Z",
      songs: [
        { id: "a-song", text: "# A\n| D |\n" },
        { id: "b-song", text: "# B\n" },
      ],
      setlists: [],
    });
  });

  test("anything else is not a bundle", () => {
    for (const text of [
      "",
      "# Song\n| D |",
      "{}",
      '{"format":"takt-bundle","version":2,"songs":[]}',
      '{"format":"takt-bundle","version":1,"songs":[{"id":1}]}',
      "[1,2]",
      "null",
    ]) {
      expect(parseBundle(text), text).toBeNull();
    }
  });

  test("file name carries the date", () => {
    expect(backupFileName(NOW)).toBe("takt-backup-2026-11-19.taktbundle");
  });
});

describe("AppData.importBundle", () => {
  test("adds new songs, skips identical ones and never overwrites a different one", async () => {
    const data = await AppData.load(createMemoryStore(), { preferredLanguages: ["en"] });
    await data.importSongs([
      { name: "a-song", text: "# A\n| D |\n" },
      { name: "b-song", text: "# B, my version\n" },
    ]);
    const bundle = createBundle(
      { songs: [...songs, { id: "c-song", text: "# C\n", updatedAt: 3 }], setlists: [] },
      NOW,
    );

    expect(await data.importBundle(bundle)).toEqual({ added: 2, unchanged: 1 });
    const stored = Object.fromEntries(data.getState().songs.map((s) => [s.id, s.text]));
    expect(stored).toEqual({
      "a-song": "# A\n| D |\n",
      "b-song": "# B, my version\n",
      "b-song-2": "# B\n",
      "c-song": "# C\n",
    });
    // Importing the same bundle again changes nothing.
    expect(await data.importBundle(bundle)).toEqual({ added: 0, unchanged: 3 });
  });

  test("a full backup restores an empty device", async () => {
    const first = await AppData.load(createMemoryStore(), { preferredLanguages: ["en"] });
    await first.importSongs([{ name: "a-song", text: "# A\n" }]);
    const text = formatBundle(first.exportBundle(NOW));

    const second = await AppData.load(createMemoryStore(), { preferredLanguages: ["en"] });
    const bundle = parseBundle(text);
    expect(bundle && (await second.importBundle(bundle))).toEqual({ added: 1, unchanged: 0 });
    expect(second.getState().songs.map((s) => [s.id, s.text])).toEqual([["a-song", "# A\n"]]);
  });
});

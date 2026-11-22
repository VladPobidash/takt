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

  test("a setlist of the bundle plays the bundle's songs, also where their ids were taken", async () => {
    const data = await AppData.load(createMemoryStore(), { preferredLanguages: ["en"] });
    // The device already has another song under the id the bundle uses, and one identical
    // song under another id.
    await data.importSongs([
      { name: "worthy", text: "# Worthy, chords only\n" },
      { name: "old-name", text: "# Always\n| C# |\n" },
    ]);
    const bundle = createBundle(
      {
        songs: [
          { id: "worthy", text: "# Worthy\nWith the words\n", updatedAt: 1 },
          { id: "always", text: "# Always\n| C# |\n", updatedAt: 1 },
          { id: "new-song", text: "# New\n", updatedAt: 1 },
        ],
        setlists: [
          {
            id: "night",
            text: "# Night\ndate: 2026-12-12\n- worthy | key: D | form: short | > no intro\n- always\n- new-song\n- not-in-the-bundle\n",
            updatedAt: 1,
          },
        ],
        notes: { worthy: { "chorus#1": "breathe" } },
      },
      NOW,
    );

    expect(await data.importBundle(bundle)).toEqual({ added: 2, unchanged: 1 });
    const setlist = data.getState().setlists.find((s) => s.id === "night");
    expect(setlist?.text).toBe(
      "# Night\ndate: 2026-12-12\n- worthy-2 | key: D | form: short | > no intro\n- old-name\n- new-song\n- not-in-the-bundle\n",
    );
    // Notes follow the song to the id it was stored under.
    expect(data.getState().personalNotes).toEqual({ "worthy-2": { "chorus#1": "breathe" } });

    // The same bundle again adds nothing: no second copy of the songs or of the setlist.
    expect(await data.importBundle(bundle)).toEqual({ added: 0, unchanged: 3 });
    expect(data.getState().setlists.map((s) => s.id)).toEqual(["night"]);
    expect(data.getState().songs).toHaveLength(4);
  });

  test("a setlist whose songs keep their ids is stored as it was written", async () => {
    const data = await AppData.load(createMemoryStore(), { preferredLanguages: ["en"] });
    const text = "# Night\n\n-   a-song   |  key: D\n";
    const bundle = createBundle({ songs, setlists: [{ id: "night", text, updatedAt: 1 }] }, NOW);
    await data.importBundle(bundle);
    expect(data.getState().setlists[0]?.text).toBe(text);
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

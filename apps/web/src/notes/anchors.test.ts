import { parse, resolveSong } from "@takt/format";
import { describe, expect, test } from "vitest";
import { AppData } from "../storage/app-state.ts";
import { formatBundle, parseBundle } from "../storage/bundle.ts";
import { createMemoryStore } from "../storage/memory.ts";
import { anchorKey, sectionOccurrences } from "./anchors.ts";

describe("anchors", () => {
  test("a bar is addressed by section name, occurrence, line and bar", () => {
    expect(anchorKey({ section: "Bridge", occurrence: 1, line: 0, bar: 3 })).toBe("bridge#1/0/3");
    expect(anchorKey({ section: " Chorus ", occurrence: 2, line: null, bar: null })).toBe(
      "chorus#2",
    );
  });

  test("sections with the same name are told apart by occurrence", () => {
    expect(
      sectionOccurrences([
        { name: "Intro" },
        { name: "Chorus" },
        { name: "Verse 2" },
        { name: "chorus" },
      ]),
    ).toEqual([
      { section: "Intro", occurrence: 1 },
      { section: "Chorus", occurrence: 1 },
      { section: "Verse 2", occurrence: 1 },
      { section: "chorus", occurrence: 2 },
    ]);
  });

  test("a note keeps its key when another section is added before it", () => {
    const before = sectionOccurrences([{ name: "Verse" }, { name: "Bridge" }])[1];
    const after = sectionOccurrences([{ name: "Intro" }, { name: "Verse" }, { name: "Bridge" }])[2];
    expect(before && anchorKey({ ...before, line: 0, bar: 1 })).toBe(
      after && anchorKey({ ...after, line: 0, bar: 1 }),
    );
  });
});

describe("anchors in a version of the song", () => {
  const { doc } = parse(
    "# T\nform short: Chorus #2, Verse, Chorus #1\n## Chorus\n| D |\n## Verse\n| G |\n## Chorus\n",
  );
  const occurrences = sectionOccurrences(doc.sections);
  const keys = (form: string | null) =>
    resolveSong(doc, { form }).sections.map((section) => {
      const place = occurrences[section.docIndex];
      return place && anchorKey({ ...place, line: null, bar: null });
    });

  test("a note stays on its section of the file, whatever the play order", () => {
    expect(keys(null)).toEqual(["chorus#1", "verse#1", "chorus#2"]);
    expect(keys("short")).toEqual(["chorus#2", "verse#1", "chorus#1"]);
  });
});

describe("AppData personal notes", () => {
  const NOW = new Date("2026-11-19T20:00:00Z");

  test("are stored per song, removed when emptied and survive a restart", async () => {
    const store = createMemoryStore();
    const data = await AppData.load(store, { preferredLanguages: ["en"] });
    await data.setPersonalNote("a-song", "bridge#1/0/3", "  watch the drummer ");
    await data.setPersonalNote("a-song", "intro#1", "capo!");
    await data.setPersonalNote("a-song", "intro#1", "   ");
    const again = await AppData.load(store, { preferredLanguages: ["en"] });
    expect(again.getState().personalNotes).toEqual({
      "a-song": { "bridge#1/0/3": "watch the drummer" },
    });
  });

  test("leave with the song and travel in a full backup, but not in a shared setlist", async () => {
    const data = await AppData.load(createMemoryStore(), { preferredLanguages: ["en"] });
    await data.importSongs([
      { name: "a-song", text: "# A\n" },
      { name: "b-song", text: "# B\n" },
    ]);
    await data.setPersonalNote("a-song", "intro#1", "mine");
    await data.setPersonalNote("b-song", "intro#1", "gone");
    await data.deleteSong("b-song");
    expect(Object.keys(data.getState().personalNotes)).toEqual(["a-song"]);

    const backup = parseBundle(formatBundle(data.exportBundle(NOW)));
    expect(backup?.notes).toEqual({ "a-song": { "intro#1": "mine" } });
    expect(data.exportSetlistBundle("none", ["a-song"], NOW).notes).toBeUndefined();

    const other = await AppData.load(createMemoryStore(), { preferredLanguages: ["en"] });
    if (backup) await other.importBundle(backup);
    expect(other.getState().personalNotes).toEqual({ "a-song": { "intro#1": "mine" } });
  });
});

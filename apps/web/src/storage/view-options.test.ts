import { describe, expect, test } from "vitest";
import { AppData } from "./app-state.ts";
import { createMemoryStore } from "./memory.ts";
import { DEFAULT_VIEW_OPTIONS, resolveViewOptions, withOverride } from "./view-options.ts";

describe("resolveViewOptions", () => {
  test("without overrides everything comes from the everywhere level", () => {
    const { value, source } = resolveViewOptions(DEFAULT_VIEW_OPTIONS, undefined, undefined);
    expect(value).toEqual(DEFAULT_VIEW_OPTIONS);
    expect(new Set(Object.values(source))).toEqual(new Set(["everywhere"]));
  });

  test("the song beats the setlist, the setlist beats everywhere", () => {
    const { value, source } = resolveViewOptions(
      DEFAULT_VIEW_OPTIONS,
      { beatDots: false, compact: true },
      { compact: false, bandNotes: false },
    );
    expect(value).toMatchObject({
      beatDots: false,
      compact: false,
      bandNotes: false,
      soundingChords: true,
    });
    expect(source).toMatchObject({
      beatDots: "setlist",
      compact: "song",
      bandNotes: "song",
      soundingChords: "everywhere",
    });
  });

  test("lyrics are shown by default and can be hidden for one song", () => {
    expect(DEFAULT_VIEW_OPTIONS.lyrics).toBe(true);
    const { value, source } = resolveViewOptions(DEFAULT_VIEW_OPTIONS, undefined, {
      lyrics: false,
    });
    expect(value.lyrics).toBe(false);
    expect(source.lyrics).toBe("song");
  });

  test("an override may repeat the inherited value and still counts as set", () => {
    expect(
      resolveViewOptions(DEFAULT_VIEW_OPTIONS, undefined, { beatDots: true }).source.beatDots,
    ).toBe("song");
  });
});

describe("withOverride", () => {
  test("sets, replaces and removes; an empty level disappears", () => {
    const one = withOverride(undefined, "beatDots", false);
    expect(one).toEqual({ beatDots: false });
    const two = withOverride(one, "compact", true);
    expect(two).toEqual({ beatDots: false, compact: true });
    expect(withOverride(two, "beatDots", undefined)).toEqual({ compact: true });
    expect(withOverride(one, "beatDots", undefined)).toBeUndefined();
    expect(one).toEqual({ beatDots: false });
  });
});

describe("AppData view overrides", () => {
  test("are kept per song and per setlist and survive a restart", async () => {
    const store = createMemoryStore();
    const data = await AppData.load(store, { preferredLanguages: ["en"] });
    await data.setViewOverride("song", "a-song", "beatDots", false);
    await data.setViewOverride("setlist", "sunday", "compact", true);
    await data.setViewOverride("song", "b-song", "compact", true);
    await data.setViewOverride("song", "b-song", "compact", undefined);

    const again = await AppData.load(store, { preferredLanguages: ["en"] });
    expect(again.getState().viewOverrides).toEqual({
      song: { "a-song": { beatDots: false } },
      setlist: { sunday: { compact: true } },
    });
  });

  test("deleting a song or a setlist drops its overrides", async () => {
    const data = await AppData.load(createMemoryStore(), { preferredLanguages: ["en"] });
    await data.importSongs([{ name: "a-song", text: "# A\n" }]);
    await data.setViewOverride("song", "a-song", "beatDots", false);
    await data.deleteSong("a-song");
    expect(data.getState().viewOverrides.song).toEqual({});
  });
});

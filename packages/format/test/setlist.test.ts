import { describe, expect, test } from "vitest";
import { formatSetlist, parseSetlist } from "../src/setlist.ts";

const EXAMPLE = `# Service 31.10
date: 2026-10-31
- dostoinyi-ty-odyn | key: D
- mohutnii-boh | key: E | > no intro
`;

describe("parseSetlist", () => {
  test("the example from docs/format.md", () => {
    const { setlist, diagnostics } = parseSetlist(EXAMPLE);
    expect(setlist.title).toBe("Service 31.10");
    expect(setlist.meta.map((m) => [m.key, m.value])).toEqual([["date", "2026-10-31"]]);
    expect(setlist.entries.map((e) => [e.song, e.key, e.note])).toEqual([
      ["dostoinyi-ty-odyn", "D", null],
      ["mohutnii-boh", "E", "no intro"],
    ]);
    expect(diagnostics).toEqual([]);
    expect(setlist.entries[1]?.span.start.line).toBe(4);
  });

  test("entries in any order, with other options kept", () => {
    const { setlist } = parseSetlist(
      "# S\n- song-a | > quiet start | capo: 2 | key: Hm\n-song-b\n",
    );
    expect(setlist.entries[0]).toMatchObject({
      song: "song-a",
      key: "Hm",
      note: "quiet start",
      options: { capo: "2" },
    });
    expect(setlist.entries[1]).toMatchObject({ song: "song-b", key: null, note: null });
  });

  test("lines it cannot read are reported, never thrown", () => {
    const { setlist, diagnostics } = parseSetlist(
      "# S\nplay loud\n- | key: D\n- song | whatever\n// comment\n",
    );
    expect(setlist.entries.map((e) => e.song)).toEqual(["song"]);
    expect(diagnostics.map((d) => [d.code, d.span.start.line])).toEqual([
      ["invalid-setlist-entry", 2],
      ["invalid-setlist-entry", 3],
      ["invalid-setlist-entry", 4],
    ]);
  });
});

describe("formatSetlist", () => {
  test("writes the example back", () => {
    expect(formatSetlist(parseSetlist(EXAMPLE).setlist)).toBe(EXAMPLE);
  });

  test("round-trips options and notes", () => {
    const text = "# S\n- song-a | key: Hm | capo: 2 | > quiet start\n- song-b\n";
    expect(formatSetlist(parseSetlist(text).setlist)).toBe(text);
  });
});

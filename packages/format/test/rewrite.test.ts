import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { parse } from "../src/parse.ts";
import { transposeText } from "../src/rewrite.ts";
import { exampleSongs, WORTHY } from "./fixtures.ts";

describe("transposeText", () => {
  test("replaces chords and the key, and nothing else", () => {
    const text =
      "# T\nkey: D\ntempo: 135\n\n## Verse 1  x2\n|  D   | A  | D/F#** G** | Asus4* A*** |   quiet\n@bass | D | A |\n> D stays in notes\nD stays in lyrics\n";
    expect(transposeText(text, 2)).toBe(
      "# T\nkey: E\ntempo: 135\n\n## Verse 1  x2\n|  E   | B  | E/G#** A** | Bsus4* B*** |   quiet\n@bass | E | B |\n> D stays in notes\nD stays in lyrics\n",
    );
  });

  test("writes the file's own note naming", () => {
    expect(transposeText("# T\nkey: G\n## A\n| G | Em | G/H |\n", -2)).toBe(
      "# T\nkey: F\n## A\n| F | Dm | F/A |\n".replace("key: F\n", "key: F\nnotation: H\n"),
    );
    expect(transposeText("# T\nkey: D\n## A\n| D | Hm | A |\n", 2)).toBe(
      "# T\nkey: E\n## A\n| E | C#m | H |\n",
    );
    expect(transposeText("# T\nkey: A\n## A\n| A | Hm |\n", 2)).toBe(
      "# T\nkey: H\n## A\n| H | C#m |\n",
    );
    expect(transposeText("# T\nkey: A\nnotation: H\n## A\n| A | E | D |\n", 1)).toBe(
      "# T\nkey: B\nnotation: H\n## A\n| B | F | Eb |\n",
    );
    expect(transposeText("# T\nkey: A\nnotation: H\n## A\n| A | E |\n", 2)).toBe(
      "# T\nkey: H\nnotation: H\n## A\n| H | F# |\n",
    );
  });

  test("accidentals follow the target key", () => {
    expect(transposeText("# T\nkey: C\n## A\n| C | F | G | Am |\n", 1)).toBe(
      "# T\nkey: Db\n## A\n| Db | Gb | Ab | Bbm |\n",
    );
    expect(transposeText("# T\nkey: C\n## A\n| C | F | G | Am |\n", 2)).toBe(
      "# T\nkey: D\n## A\n| D | G | A | Bm |\n",
    );
  });

  test('a chord typed as "C #" is rewritten as one chord', () => {
    expect(transposeText("# T\nkey: F#\n## A\n| F# | C # |\n", 2)).toBe(
      "# T\nkey: Ab\n## A\n| Ab | Eb |\n",
    );
  });

  test("leaves unknown tokens, N.C., % and empty bars alone", () => {
    expect(transposeText("# T\nkey: C\n## A\n| C | stop | N.C. | % | | C . G . |\n", 2)).toBe(
      "# T\nkey: D\n## A\n| D | stop | N.C. | % | | D . A . |\n",
    );
  });

  test("by 0 and by an octave the text is returned byte for byte", () => {
    for (const song of [
      ...exampleSongs().map((s) => s.text),
      WORTHY,
      "﻿# T\r\n## A\r\n| A#  |\r\n",
    ]) {
      expect(transposeText(song, 0)).toBe(song);
      expect(transposeText(song, 12)).toBe(song);
    }
  });

  test("up and back down returns the example files unchanged", () => {
    for (const song of exampleSongs().map((s) => s.text)) {
      for (const n of [1, 2, 5, -3, 7]) {
        expect(transposeText(transposeText(song, n), -n), `by ${n}`).toBe(song);
      }
    }
  });

  test("a file read in H-notation only because of its H chords keeps that naming", () => {
    // In E flat this song has no H chord left, and its B flat is written "B".
    const moved = transposeText(WORTHY, 1);
    expect(moved).toContain("time: 4/4\nnotation: H\n");
    expect(moved).toContain("| Cm** Eb** | Ab** B** |");
    expect(parse(moved).doc).toMatchObject({ notation: "H", notationSource: "header" });
    const back = transposeText(moved, -1);
    expect(back).toBe(WORTHY.replace("time: 4/4\n", "time: 4/4\nnotation: H\n"));
    // Still has an H chord in E: nothing is added.
    expect(transposeText(WORTHY, 2)).not.toContain("notation:");
    expect(transposeText("| D | Hm |\n", 1)).toBe("notation: H\n| Eb | Cm |\n");
  });

  test("the transposed text parses to the same structure", () => {
    fc.assert(
      fc.property(fc.integer({ min: -11, max: 11 }), (n) => {
        const before = parse(WORTHY);
        const after = parse(transposeText(WORTHY, n));
        expect(after.doc.sections.map((s) => s.lines.length)).toEqual(
          before.doc.sections.map((s) => s.lines.length),
        );
        expect(after.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
      }),
    );
  });
});

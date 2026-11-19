import { describe, expect, test } from "vitest";
import { parseBars } from "../src/bars.ts";
import type { Bar, Notation, Pos } from "../src/types.ts";

const ORIGIN: Pos = { offset: 0, line: 1, column: 1 };

function read(line: string, beats = 4, notation: Notation = "H") {
  return parseBars(line, ORIGIN, { beats, notation });
}

/** `E:3 G:1` per bar; `-` for an empty bar, `%` for a repeat bar. */
function shape(bars: Bar[]): string[] {
  return bars.map((bar) => {
    if (bar.kind === "empty") return "-";
    if (bar.kind === "repeat") return "%";
    return bar.cells.map((cell) => `${cell.text}:${Number(cell.beats.toFixed(3))}`).join(" ");
  });
}

describe("parser test cases from docs/format.md", () => {
  test("| E*** G* | E*** G* | E*** G | E |", () => {
    const { bars, diagnostics } = read("| E*** G* | E*** G* | E*** G | E |");
    expect(shape(bars)).toEqual(["E:3 G:1", "E:3 G:1", "E:3 G:1", "E:4"]);
    expect(diagnostics).toEqual([]);
  });

  test("| E | E | E | E | A | A | E | E | (2x)", () => {
    const line = read("| E | E | E | E | A | A | E | E | (2x)");
    expect(shape(line.bars)).toEqual(["E:4", "E:4", "E:4", "E:4", "A:4", "A:4", "E:4", "E:4"]);
    expect(line.repeat).toBe(2);
    expect(line.cue).toBeNull();
  });

  test("| H | H | C#m | C#m | H | H | A - E | E |", () => {
    const { bars, diagnostics } = read("| H | H | C#m | C#m | H | H | A - E | E |");
    expect(shape(bars)).toEqual(["H:4", "H:4", "C#m:4", "C#m:4", "H:4", "H:4", "A:2 E:2", "E:4"]);
    expect(bars[0]?.cells[0]?.chord?.root).toEqual({ letter: "B", accidental: 0 });
    expect(diagnostics).toEqual([]);
  });

  test("| D | | A** G** | | A** G** |", () => {
    expect(shape(read("| D | | A** G** | | A** G** |").bars)).toEqual([
      "D:4",
      "-",
      "A:2 G:2",
      "-",
      "A:2 G:2",
    ]);
  });

  test("| G*** Hm* | A | D/F# | Hm*** A*| — no space before the bar line", () => {
    expect(shape(read("| G*** Hm* | A | D/F# | Hm*** A*|").bars)).toEqual([
      "G:3 Hm:1",
      "A:4",
      "D/F#:4",
      "Hm:3 A:1",
    ]);
  });

  test("| Hm** D** | G** A** | (2x)", () => {
    const line = read("| Hm** D** | G** A** | (2x)");
    expect(shape(line.bars)).toEqual(["Hm:2 D:2", "G:2 A:2"]);
    expect(line.repeat).toBe(2);
  });

  test("| F# | F# | F#sus | F#sus |", () => {
    expect(shape(read("| F# | F# | F#sus | F#sus |").bars)).toEqual([
      "F#:4",
      "F#:4",
      "F#sus:4",
      "F#sus:4",
    ]);
  });

  test("6/8: | F7 | B | B*** F7*** | B |", () => {
    const { bars, diagnostics } = read("| F7 | B | B*** F7*** | B |", 6);
    expect(shape(bars)).toEqual(["F7:6", "B:6", "B:3 F7:3", "B:6"]);
    expect(bars[1]?.cells[0]?.chord?.root).toEqual({ letter: "B", accidental: -1 });
    expect(diagnostics).toEqual([]);
  });

  test("6/8: | N.C. | | B F7 | B | rit.", () => {
    const line = read("| N.C. | | B F7 | B | rit.", 6);
    expect(shape(line.bars)).toEqual(["N.C.:6", "-", "B:3 F7:3", "B:6"]);
    expect(line.bars[0]?.cells[0]?.kind).toBe("no-chord");
    expect(line.cue).toBe("rit.");
    expect(line.repeat).toBe(1);
  });

  test("6/8 part line: | F7/C | B/D | B/F*** F7*** | B |", () => {
    expect(shape(read("| F7/C | B/D | B/F*** F7*** | B |", 6).bars)).toEqual([
      "F7/C:6",
      "B/D:6",
      "B/F:3 F7:3",
      "B:6",
    ]);
  });
});

describe("beats", () => {
  test("chords without asterisks share the rest of the bar evenly", () => {
    expect(shape(read("| A E | A E D | E*** G |").bars)).toEqual([
      "A:2 E:2",
      "A:1.333 E:1.333 D:1.333",
      "E:3 G:1",
    ]);
  });

  test("cells start where the previous one ends", () => {
    const cells = read("| Asus4* A*** |").bars[0]?.cells ?? [];
    expect(cells.map((c) => [c.start, c.beats, c.stars])).toEqual([
      [0, 1, 1],
      [1, 3, 3],
    ]);
  });

  test("cell mode: tokens are equal slots, a dot continues the chord", () => {
    expect(shape(read("| D . G . | D . . G | D . |").bars)).toEqual(["D:2 G:2", "D:3 G:1", "D:4"]);
    expect(shape(read("| D . . G . . |", 6).bars)).toEqual(["D:3 G:3"]);
  });

  test("a leading dot keeps the previous chord for that slot", () => {
    const bar = read("| . . G . |").bars[0];
    expect(bar?.cells.map((c) => [c.text, c.start, c.beats])).toEqual([["G", 2, 2]]);
  });

  test("% repeats the previous bar; an empty bar is not the same thing", () => {
    expect(shape(read("| D** G** | % | |").bars)).toEqual(["D:2 G:2", "%", "-"]);
  });

  test("a bar whose asterisks add up to less than the time signature is a short bar", () => {
    const { bars, diagnostics } = read("| A | A** |");
    expect(bars[1]?.beats).toBe(2);
    expect(diagnostics).toMatchObject([
      { code: "bar-short", severity: "info", data: { beats: 2, expected: 4 } },
    ]);
  });

  test("5 beats in 4/4 is a warning on that bar", () => {
    const { bars, diagnostics } = read("| D | Asus4** A*** |");
    expect(bars[1]?.beats).toBe(5);
    expect(diagnostics).toMatchObject([
      { code: "bar-too-long", severity: "warning", data: { beats: 5, expected: 4 } },
    ]);
    expect(diagnostics[0]?.span).toEqual(bars[1]?.span);
  });

  test("asterisks that leave no room for the other chords", () => {
    const { bars, diagnostics } = read("| E**** G |");
    expect(shape(bars)).toEqual(["E:4 G:1"]);
    expect(diagnostics.map((d) => d.code)).toEqual(["bar-too-long"]);
  });

  test("asterisks and dots in one bar: asterisks win", () => {
    const { bars, diagnostics } = read("| D** . G |");
    expect(shape(bars)).toEqual(["D:2 G:2"]);
    expect(diagnostics.map((d) => d.code)).toEqual(["mixed-durations"]);
  });
});

describe("tokens", () => {
  test("text that is not a chord is kept, with a warning", () => {
    const { bars, diagnostics } = read("| D | stop | A |");
    expect(shape(bars)).toEqual(["D:4", "stop:4", "A:4"]);
    expect(bars[1]?.cells[0]).toMatchObject({ kind: "text", chord: null });
    expect(diagnostics).toMatchObject([
      { code: "unknown-chord", severity: "warning", data: { text: "stop" } },
    ]);
    expect(diagnostics[0]?.span).toEqual(bars[1]?.cells[0]?.span);
  });

  test("no spaces, doubled bar lines and repeat colons", () => {
    expect(shape(read("|D|A**G**|").bars)).toEqual(["D:4", "A:2 G:2"]);
    expect(shape(read("|| D | A ||").bars)).toEqual(["D:4", "A:4"]);
    expect(shape(read("|: D | A :|").bars)).toEqual(["D:4", "A:4"]);
  });

  test("N.C. in the ways people type it", () => {
    for (const nc of ["N.C.", "NC", "N.C", "n.c."]) {
      expect(read(`| ${nc} |`).bars[0]?.cells[0]?.kind, nc).toBe("no-chord");
    }
  });

  test("ambiguous B is flagged only when asked", () => {
    const quiet = parseBars("| B | Gm |", ORIGIN, { beats: 4, notation: "B" });
    expect(quiet.diagnostics).toEqual([]);
    const flagged = parseBars("| B | Gm | F/B |", ORIGIN, {
      beats: 4,
      notation: "B",
      flagAmbiguousB: true,
    });
    expect(flagged.diagnostics.map((d) => [d.code, d.severity])).toEqual([
      ["ambiguous-b", "info"],
      ["ambiguous-b", "info"],
    ]);
  });
});

describe("label, cue and repeat", () => {
  test("text before the first bar line is a label, after the last one a cue", () => {
    const line = read("Riff: | E | G | x2 quiet");
    expect(line.label).toBe("Riff:");
    expect(line.repeat).toBe(2);
    expect(line.cue).toBe("quiet");
  });

  test("repeat spellings", () => {
    for (const [text, n] of [
      ["x2", 2],
      ["2x", 2],
      ["(2x)", 2],
      ["(x3)", 3],
      ["×4", 4],
      ["X2", 2],
    ] as const) {
      expect(read(`| D | ${text}`).repeat, text).toBe(n);
    }
    expect(read("| D |").repeat).toBe(1);
  });

  test("a line without a closing bar line keeps its tail as a cue", () => {
    const line = read("| D | A");
    expect(shape(line.bars)).toEqual(["D:4"]);
    expect(line.cue).toBe("A");
  });
});

describe("spans", () => {
  test("bars and cells point at their text", () => {
    const at: Pos = { offset: 10, line: 3, column: 1 };
    const { bars } = parseBars("| D | A** |", at, { beats: 4, notation: "H" });
    expect(bars[1]?.cells[0]?.span).toEqual({
      start: { offset: 16, line: 3, column: 7 },
      end: { offset: 17, line: 3, column: 8 },
    });
    expect(bars[0]?.span).toEqual({
      start: { offset: 11, line: 3, column: 2 },
      end: { offset: 14, line: 3, column: 5 },
    });
  });
});

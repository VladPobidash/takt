import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse, resolveSong } from "@takt/format";
import { describe, expect, test } from "vitest";
import { columnCandidates, gridUse } from "./compact.ts";

const section = (...lengths: number[]) => ({
  lines: lengths.map((length) => ({ bars: { length } })),
});
const example = (name: string) =>
  resolveSong(
    parse(
      readFileSync(
        fileURLToPath(new URL(`../../../../examples/${name}.takt`, import.meta.url)),
        "utf8",
      ),
    ).doc,
  ).sections;

describe("gridUse", () => {
  test("counts rows and how full they are; every bar takes one column", () => {
    expect(gridUse(4, [section(4, 4)])).toEqual({ rows: 2, fill: 1 });
    // Five bars in four columns: a full row and a row with one bar.
    expect(gridUse(4, [section(5)])).toEqual({ rows: 2, fill: (1 + 0.25) / 2 });
    // Two bars stay two columns wide: half of the row is empty.
    expect(gridUse(4, [section(2)])).toEqual({ rows: 1, fill: 0.5 });
    expect(gridUse(5, [section(3)])).toEqual({ rows: 1, fill: 0.6 });
    expect(gridUse(4, [])).toEqual({ rows: 0, fill: 1 });
  });
});

describe("columnCandidates", () => {
  test("a song in four-bar lines gets four columns, even with a two- or a five-bar line", () => {
    expect(columnCandidates(example("vdiachnist"))[0]).toBe(4);
    expect(columnCandidates(example("dostoinyi-ty-odyn"))[0]).toBe(4);
    expect(columnCandidates(example("silent-night"))[0]).toBe(4);
  });

  test("a song of three-, five-, six- and seven-bar lines starts from five columns", () => {
    const candidates = columnCandidates(example("bozhe-ia-vdiachnyi-tobi"));
    // Five keep the chorus on one row and leave the least empty; whether the bars are wide
    // enough for their chords is decided on the screen, by measuring.
    expect(candidates[0]).toBe(5);
    expect(new Set(candidates).size).toBe(7);
  });

  test("a song in two-bar lines gets two wide columns", () => {
    expect(columnCandidates([section(2, 2), section(2)])[0]).toBe(2);
  });
});

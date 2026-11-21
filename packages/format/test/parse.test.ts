import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { parse } from "../src/parse.ts";
import type { Line } from "../src/types.ts";
import { exampleSongs, WORTHY } from "./fixtures.ts";

const kinds = (lines: Line[]) =>
  lines.map((line) =>
    "instrument" in line && line.instrument ? `${line.kind}@${line.instrument}` : line.kind,
  );
const codes = (text: string, options?: Parameters<typeof parse>[1]) =>
  parse(text, options).diagnostics.map((d) => d.code);

describe("the example from docs/format.md", () => {
  const { doc, diagnostics } = parse(WORTHY);

  test("header", () => {
    expect(doc.title).toBe("Достойний Ти Один");
    expect(doc.meta.map((m) => [m.key, m.value])).toEqual([
      ["artist", "Elevation Worship — Worthy"],
      ["key", "D"],
      ["tempo", "135"],
      ["time", "4/4"],
    ]);
    expect(doc.time).toEqual({ beats: 4, unit: 4 });
  });

  test("an H in the chords means H-notation", () => {
    expect(doc.notation).toBe("H");
    expect(doc.notationSource).toBe("inferred");
  });

  test("sections: name, tag, repeat, reference", () => {
    expect(doc.sections.map((s) => [s.name, s.tag, s.repeat, s.ref])).toEqual([
      ["Intro", null, 2, null],
      ["Verse 1", null, null, null],
      ["Chorus", null, null, null],
      ["Interlude", null, null, "Intro"],
      ["Verse 2", null, 2, null],
      ["Chorus", null, null, null],
      ["Bridge", "яма", 4, null],
    ]);
  });

  test("lines are classified", () => {
    expect(kinds(doc.sections[1]?.lines ?? [])).toEqual(["bars", "bars", "bars@bass", "note"]);
    expect(kinds(doc.sections[2]?.lines ?? [])).toEqual(["bars", "bars", "note@keys"]);
    expect(kinds(doc.sections[6]?.lines ?? [])).toEqual(["bars", "note@drums"]);
    expect(doc.sections[6]?.lines[1]).toMatchObject({
      instrumentName: "cajon",
      text: "first 2 times — hand only",
    });
  });

  test("nothing to complain about", () => {
    expect(diagnostics).toEqual([]);
  });

  test("spans point into the file", () => {
    const lines = WORTHY.split("\n");
    const chorus = doc.sections[2];
    expect(chorus?.span.start.line).toBe(lines.indexOf("## Chorus") + 1);
    const key = doc.meta[1];
    expect(WORTHY.slice(key?.valueSpan.start.offset, key?.valueSpan.end.offset)).toBe("D");
    const firstLine = chorus?.lines[0];
    const bar = firstLine?.kind === "bars" ? firstLine.bars[0] : undefined;
    const cell = bar?.cells[1];
    expect(WORTHY.slice(cell?.span.start.offset, cell?.span.end.offset)).toBe("Hm");
    expect(cell?.span.start.line).toBe(lines.indexOf("## Chorus") + 2);
    expect(cell?.span.start.column).toBe(8);
  });
});

describe("section headers", () => {
  const section = (header: string) => parse(`# T\n${header}\n| D |\n`).doc.sections[0];

  test("repeat spellings and tags", () => {
    expect(section("## Bridge [яма] x4")).toMatchObject({ name: "Bridge", tag: "яма", repeat: 4 });
    expect(section("## Verse 2 (2x)")).toMatchObject({ name: "Verse 2", repeat: 2 });
    expect(section("## Outro 2x")).toMatchObject({ name: "Outro", repeat: 2 });
    expect(section("##Chorus")).toMatchObject({ name: "Chorus", repeat: null, tag: null });
    expect(section("## Chorus x1")).toMatchObject({ name: "Chorus", repeat: 1 });
    expect(section("## Chorus [quiet] [a cappella]")).toMatchObject({
      name: "Chorus",
      tag: "quiet, a cappella",
    });
  });

  test("references", () => {
    expect(section("## Interlude = Intro")).toMatchObject({ name: "Interlude", ref: "Intro" });
    expect(section("## Verse 2 = Verse 1 x2")).toMatchObject({
      name: "Verse 2",
      ref: "Verse 1",
      repeat: 2,
    });
    expect(section("## Verse 3 [тихо] = Verse 1")).toMatchObject({
      name: "Verse 3",
      ref: "Verse 1",
      tag: "тихо",
    });
  });
});

describe("lines", () => {
  const lines = (body: string) => parse(`# T\n## A\n${body}\n`).doc.sections[0]?.lines ?? [];

  test("instrument prefixes and their synonyms", () => {
    expect(
      kinds(
        lines("| D |\n@Бас | D |\n@piano | D |\n@гітара > capo 2\n@кахон > brushes\n@sax | D |"),
      ),
    ).toEqual(["bars", "bars@bass", "bars@keys", "note@guitar", "note@drums", "bars@sax"]);
  });

  test("notes, comments and lyrics", () => {
    const found = lines(
      "| D |\n> quiet\n// never shown\nAmazing grace, how sweet the sound\n@keys pad only",
    );
    expect(found.map((l) => [l.kind, "text" in l ? l.text : null])).toEqual([
      ["bars", null],
      ["note", "quiet"],
      ["comment", "never shown"],
      ["lyrics", "Amazing grace, how sweet the sound"],
      ["note", "pad only"],
    ]);
  });

  test("bars use the time signature of the header", () => {
    const { doc } = parse("# T\ntime: 6/8\n## A\n| B F7 |\n");
    const line = doc.sections[0]?.lines[0];
    expect(line?.kind === "bars" && line.bars[0]?.cells.map((c) => c.beats)).toEqual([3, 3]);
  });

  test("bars before any section start an unnamed section", () => {
    const { doc, diagnostics } = parse("# Quick chart\nkey: G\n| G | C | D | G |\n");
    expect(doc.sections.map((s) => s.name)).toEqual([""]);
    expect(diagnostics).toEqual([]);
  });

  test("Windows line endings and a byte-order mark", () => {
    const { doc, diagnostics } = parse("﻿# T\r\nkey: D\r\n\r\n## A x2\r\n| D | A |\r\n");
    expect(doc.title).toBe("T");
    expect(doc.sections[0]).toMatchObject({ name: "A", repeat: 2 });
    expect(diagnostics).toEqual([]);
    expect(doc.sections[0]?.span.start).toEqual({ offset: 16, line: 4, column: 1 });
  });
});

describe("note naming", () => {
  test("the header decides", () => {
    expect(parse("# T\nnotation: H\n## A\n| B |\n").doc).toMatchObject({
      notation: "H",
      notationSource: "header",
    });
    expect(parse("# T\nnotation: b\n## A\n| H | B |\n").doc).toMatchObject({
      notation: "B",
      notationSource: "header",
    });
  });

  test("without a header, any H chord means H-notation", () => {
    expect(parse("# T\n## A\n| G/H | B |\n").doc).toMatchObject({
      notation: "H",
      notationSource: "inferred",
    });
    expect(parse("# T\n## A\n| D | Hello |\n").doc.notationSource).toBe("default");
  });

  test("otherwise the caller's default applies and every B is pointed at", () => {
    const text = "# Краса Хреста\nkey: B\n## A\n| B | Gm | Eb | F |\n";
    const english = parse(text);
    expect(english.doc).toMatchObject({ notation: "B", notationSource: "default" });
    expect(english.diagnostics.map((d) => [d.code, d.severity])).toEqual([["ambiguous-b", "info"]]);
    const german = parse(text, { defaultNotation: "H" });
    expect(german.doc.notation).toBe("H");
    const line = german.doc.sections[0]?.lines[0];
    expect(line?.kind === "bars" && line.bars[0]?.cells[0]?.chord?.root).toEqual({
      letter: "B",
      accidental: -1,
    });
  });
});

describe("diagnostics instead of exceptions", () => {
  test("no title", () => {
    expect(codes("key: D\n## A\n| D |\n")).toEqual(["missing-title"]);
    expect(parse("").diagnostics.map((d) => [d.code, d.severity])).toEqual([
      ["missing-title", "info"],
    ]);
  });

  test("stray text in the header", () => {
    const { doc, diagnostics } = parse(
      "# T\nsome words\nkey: D\n// fine\n> also fine\n## A\n| D |\n",
    );
    expect(diagnostics.map((d) => [d.code, d.span.start.line])).toEqual([
      ["unexpected-header-line", 2],
    ]);
    expect(doc.meta.map((m) => m.key)).toEqual(["key"]);
    expect(kinds(doc.headerLines)).toEqual(["lyrics", "comment", "note"]);
  });

  test("bad header values", () => {
    expect(
      codes(
        "# T\ntime: waltz\ntempo: fast\ncapo: second\nnotation: German\nkey: D major\n## A\n| D |\n",
      ),
    ).toEqual(["invalid-time", "invalid-tempo", "invalid-capo", "invalid-notation", "invalid-key"]);
    expect(parse("# T\ntime: waltz\n## A\n| D |\n").doc.time).toEqual({ beats: 4, unit: 4 });
  });

  test("a reference to a section that does not exist", () => {
    const { diagnostics } = parse("# T\n## Intro\n| D |\n## Outro = Intor\n");
    expect(diagnostics).toMatchObject([
      {
        code: "unknown-section-ref",
        severity: "warning",
        data: { name: "Intor" },
        span: { start: { line: 4 } },
      },
    ]);
  });

  test("an empty section with nothing to reuse", () => {
    expect(parse("# T\n## Solo\n## Chorus\n| D |\n## Chorus\n").diagnostics).toMatchObject([
      { code: "empty-section", severity: "info", span: { start: { line: 2 } } },
    ]);
  });

  test("an empty section of a known kind is not a problem when an earlier one of that kind has bars", () => {
    expect(codes("# T\n## 1 Verse\n| D | A |\n## Verse 2\n## Chorus 2\n")).toEqual([
      "empty-section",
    ]);
    expect(
      parse("# T\n## 1 Verse\n| D | A |\n## Verse 2\n## Chorus 2\n").diagnostics[0]?.span.start
        .line,
    ).toBe(5);
    // An instrument line in the reusing section is checked against the borrowed bars.
    expect(codes("# T\n## 1 Verse\n| D | A |\n## Verse 2\n@bass | D | E |\n")).toEqual([]);
  });

  test("instrument lines must have a base line to replace", () => {
    const { diagnostics } = parse(
      "# T\n## A\n| D | A |\n@bass | D | A |\n@bass | D |\n@keys | D |\n",
    );
    expect(diagnostics.map((d) => [d.code, d.severity, d.span.start.line])).toEqual([
      ["part-without-base", "warning", 5],
      ["part-bar-count", "info", 6],
    ]);
  });

  test("instrument lines in a reusing section are checked against the reused bars", () => {
    expect(codes("# T\n## Verse 1\n| D | A |\n## Verse 2 = Verse 1\n@bass | D | E |\n")).toEqual(
      [],
    );
  });

  test("never throws, whatever the text", () => {
    const pieces = fc.constantFrom(
      "#",
      "##",
      "|",
      "*",
      "@",
      ">",
      "//",
      "=",
      "[",
      "]",
      "(2x)",
      "x2",
      ":",
      ".",
      "%",
      "/",
      "\n",
      "\r\n",
      " ",
      "D",
      "Hm",
      "B",
      "N.C.",
      "key",
      "time: 0/0",
      "bass",
      "é",
      "я",
    );
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.array(pieces).map((p) => p.join("")),
        ),
        (text) => {
          const { doc, diagnostics } = parse(text);
          expect(Array.isArray(doc.sections)).toBe(true);
          for (const d of diagnostics)
            expect(d.span.start.offset).toBeLessThanOrEqual(d.span.end.offset);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe("examples/", () => {
  for (const song of exampleSongs()) {
    test(`${song.name} parses without a single diagnostic`, () => {
      expect(parse(song.text).diagnostics).toEqual([]);
    });
  }

  test("silent-night.takt is read in H-notation and 6/8", () => {
    const song = exampleSongs().find((s) => s.name === "silent-night.takt");
    const { doc } = parse(song?.text ?? "");
    expect(doc).toMatchObject({
      title: "Silent Night",
      notation: "H",
      notationSource: "header",
      time: { beats: 6, unit: 8 },
    });
    expect(doc.sections.map((s) => s.name)).toEqual([
      "Intro",
      "Verse 1",
      "Verse 2",
      "Interlude",
      "Verse 3",
      "Outro",
    ]);
    expect(kinds(doc.sections[1]?.lines ?? [])).toEqual([
      "bars",
      "bars",
      "bars",
      "bars@keys",
      "bars@keys",
      "bars@keys",
      "note@bass",
      "note",
      "lyrics",
      "lyrics",
      "lyrics",
      "lyrics",
      "lyrics",
      "lyrics",
    ]);
  });
});

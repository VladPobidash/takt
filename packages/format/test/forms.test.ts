import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
  cleanFormName,
  findForm,
  formatFormEntries,
  formatSetlist,
  parse,
  parseSetlist,
  removeForm,
  renameForm,
  resolveSong,
  setForm,
  transposeText,
} from "../src/index.ts";
import type { ResolvedSong, SongDoc } from "../src/types.ts";
import { exampleSong, exampleSongs, WORTHY } from "./fixtures.ts";

const doc = (text: string): SongDoc => parse(text).doc;
const codes = (text: string) => parse(text).diagnostics.map((d) => d.code);
/** Section names and repeats in play order. */
const order = (song: ResolvedSong) => song.sections.map((s) => `${s.name} x${s.repeat}`);
/** Each entry of a form: the file section it names, and its repeat. */
const entries = (text: string, name: string) =>
  findForm(doc(text), name)?.entries.map((e) => [e.section, e.repeat]);

const VDIACHNIST = exampleSong("vdiachnist.takt");

describe("form lines in the header", () => {
  const { doc: worthy, diagnostics } = parse(WORTHY);

  test("the example from docs/format.md has two forms and nothing to complain about", () => {
    expect(worthy.forms.map((f) => f.name)).toEqual(["коротка", "без програшу"]);
    expect(diagnostics).toEqual([]);
  });

  test("a form line is neither a header value nor a lyrics line", () => {
    expect(worthy.meta.map((m) => m.key)).not.toContain("form");
    expect(worthy.headerLines).toEqual([]);
  });

  test("entries name sections of the file, with their repeats", () => {
    // Intro, Verse 1, Chorus, Interlude, Verse 2, Chorus, Bridge
    expect(entries(WORTHY, "коротка")).toEqual([
      [0, null],
      [1, null],
      [2, null],
      [4, null],
      [5, null],
      [6, 2],
    ]);
    expect(entries(WORTHY, "без програшу")).toEqual([
      [0, 2],
      [1, null],
      [2, null],
      [4, 2],
      [5, null],
      [6, 4],
    ]);
  });

  test("spans of the line, the name, the list and each entry", () => {
    const form = worthy.forms[1];
    const slice = (span: { start: { offset: number }; end: { offset: number } } | undefined) =>
      WORTHY.slice(span?.start.offset, span?.end.offset);
    expect(slice(form?.span)).toBe(
      "form без програшу: Intro x2, Verse 1, Chorus, Verse 2 x2, Chorus, Bridge x4",
    );
    expect(slice(form?.nameSpan)).toBe("без програшу");
    expect(slice(form?.listSpan)).toBe("Intro x2, Verse 1, Chorus, Verse 2 x2, Chorus, Bridge x4");
    expect(form?.entries.map((e) => slice(e.span))).toEqual([
      "Intro x2",
      "Verse 1",
      "Chorus",
      "Verse 2 x2",
      "Chorus",
      "Bridge x4",
    ]);
    expect(form?.entries.map((e) => e.text)).toEqual(form?.entries.map((e) => slice(e.span)));
    expect(form?.span.start.line).toBe(WORTHY.split("\n").indexOf(slice(form?.span)) + 1);
  });

  test("the name is everything between `form ` and the first colon, in any language", () => {
    const text =
      "# T\nForm   Різдво  в   церкві : A, B\nform 2 services: B\n## A\n| D |\n## B\n| G |\n";
    expect(doc(text).forms.map((f) => f.name)).toEqual(["Різдво в церкві", "2 services"]);
    expect(entries(text, "різдво в церкві")).toEqual([
      [0, null],
      [1, null],
    ]);
  });

  test("`form:` without a name is a plain header value, not a version", () => {
    const parsed = doc("# T\nform: A\n## A\n| D |\n");
    expect(parsed.forms).toEqual([]);
    expect(parsed.meta.map((m) => m.key)).toEqual(["form"]);
  });

  test("a form line among the sections is not a form", () => {
    expect(doc("# T\n## A\n| D |\nform x: A\n").forms).toEqual([]);
  });

  test("repeat spellings, as elsewhere in the format", () => {
    const text = "# T\nform f: A x2, A 3x, A (4x), A, A x1\n## A x5\n| D |\n";
    expect(entries(text, "f")?.map(([, repeat]) => repeat)).toEqual([2, 3, 4, null, 1]);
  });

  test("names are matched without letter case and extra spaces", () => {
    expect(
      entries("# T\nform f:  verse   1 ,CHORUS\n## Verse 1\n| D |\n## Chorus\n| G |\n", "F"),
    ).toEqual([
      [0, null],
      [1, null],
    ]);
  });

  test("tags are not part of a section's name", () => {
    expect(entries("# T\nform f: Bridge\n## Bridge [яма] x4\n| D |\n", "f")).toEqual([[0, null]]);
  });

  test("no prefix matching: `Chorus` does not name `Chorus 2`", () => {
    const text = "# T\nform f: Chorus, Chorus 2\n## Chorus 2\n| D |\n";
    expect(entries(text, "f")).toEqual([
      [null, null],
      [0, null],
    ]);
  });

  test("empty pieces between commas are ignored", () => {
    expect(entries("# T\nform f: A,, A ,\n## A\n| D |\n", "f")).toEqual([
      [0, null],
      [0, null],
    ]);
  });
});

describe("names with commas and numbers, from the band's charts", () => {
  // Intro, 1, 2 Verse, Chorus, Interludio, 3 Verse, Chorus 2, Interludio, 1 Bridge, 2 Bridge,
  // 3 Bridge, Instrumental, Chorus 3
  test("`1, 2 Verse` stays one entry", () => {
    const text = VDIACHNIST.replace(
      "capo: 4\n",
      "capo: 4\nform f: Intro, 1, 2 Verse x2, Chorus, 3 Verse, 1 Bridge, Chorus 3\n",
    );
    expect(parse(text).diagnostics).toEqual([]);
    expect(entries(text, "f")).toEqual([
      [0, null],
      [1, 2],
      [2, null],
      [4, null],
      [7, null],
      [11, null],
    ]);
  });

  test("spacing around the comma does not matter", () => {
    const text = VDIACHNIST.replace("capo: 4\n", "capo: 4\nform f: 1,2 Verse, 1 ,2 Verse\n");
    expect(entries(text, "f")).toEqual([
      [1, null],
      [1, null],
    ]);
  });

  test("the longest name wins", () => {
    const text =
      "# T\nform f: 1, 2 Verse, 2 Verse\n## 2 Verse\n| D |\n## 1, 2 Verse\n| G |\n## 1\n| A |\n";
    expect(entries(text, "f")).toEqual([
      [1, null],
      [0, null],
    ]);
  });

  test("the example from docs/format.md", () => {
    const text = VDIACHNIST.replace(
      "capo: 4\n",
      "capo: 4\nform коротка: Intro, 1, 2 Verse x1, Chorus, Interludio, 3 Verse, Chorus 2, Interludio #2, Chorus 3 x2\n",
    );
    expect(parse(text).diagnostics).toEqual([]);
    const song = resolveSong(doc(text), { form: "коротка" });
    expect(order(song)).toEqual([
      "Intro x1",
      "1, 2 Verse x1",
      "Chorus x2",
      "Interludio x1",
      "3 Verse x1",
      "Chorus 2 x2",
      "Interludio x1",
      "Chorus 3 x2",
    ]);
    expect(song.sections.map((s) => s.docIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 11]);
  });
});

describe("several sections with one name", () => {
  // `## Chorus` twice: the second is empty and reuses the first.
  test("the k-th mention names the k-th section of that name", () => {
    expect(entries(WORTHY, "коротка")?.map(([section]) => section)).toEqual([0, 1, 2, 4, 5, 6]);
  });

  test("once the file has no more, the last one", () => {
    const text = WORTHY.replace(/form коротка: .*\n/, "form f: Chorus, Chorus, Chorus\n");
    expect(entries(text, "f")?.map(([section]) => section)).toEqual([2, 5, 5]);
  });

  test("`#n` names the n-th one wherever it stands", () => {
    const text = WORTHY.replace(
      /form коротка: .*\n/,
      "form f: Chorus #2 x3, Chorus #1, Chorus#2\n",
    );
    expect(entries(text, "f")).toEqual([
      [5, 3],
      [2, null],
      [5, null],
    ]);
  });

  test("`#n` beyond the sections of that name is unknown", () => {
    const text = WORTHY.replace(/form коротка: .*\n/, "form f: Intro, Chorus #3\n");
    expect(entries(text, "f")).toEqual([
      [0, null],
      [null, null],
    ]);
    expect(parse(text).diagnostics).toMatchObject([
      { code: "unknown-form-section", severity: "warning", data: { name: "Chorus #3", form: "f" } },
    ]);
  });

  test("a section whose own name ends in `#n` is matched by its whole name", () => {
    const text = "# T\nform f: Verse #2, Verse\n## Verse\n| D |\n## Verse #2\n| G |\n";
    expect(entries(text, "f")?.map(([section]) => section)).toEqual([1, 0]);
  });
});

describe("diagnostics", () => {
  test("an unknown section is skipped and reported on its entry", () => {
    const text = "# T\nform f: A, Coda x2, A\n## A\n| D |\n";
    const { diagnostics } = parse(text);
    expect(diagnostics).toHaveLength(1);
    const [found] = diagnostics;
    expect(found).toMatchObject({
      code: "unknown-form-section",
      data: { name: "Coda", form: "f" },
    });
    expect(text.slice(found?.span.start.offset, found?.span.end.offset)).toBe("Coda x2");
    expect(order(resolveSong(doc(text), { form: "f" }))).toEqual(["A x1", "A x1"]);
  });

  test("two forms with the same name: the first counts, the second is reported", () => {
    const text = "# T\nform Short: A\nform short: B\n## A\n| D |\n## B\n| G |\n";
    expect(codes(text)).toEqual(["duplicate-form"]);
    expect(parse(text).diagnostics[0]).toMatchObject({
      span: { start: { line: 3 } },
      data: { name: "short" },
    });
    expect(order(resolveSong(doc(text), { form: "SHORT" }))).toEqual(["A x1"]);
    expect(resolveSong(doc(text)).forms).toEqual(["Short"]);
  });

  test("an empty form", () => {
    expect(codes("# T\nform f:\n## A\n| D |\n")).toEqual(["empty-form"]);
    expect(codes("# T\nform f: , ,\n## A\n| D |\n")).toEqual(["empty-form"]);
    expect(parse("# T\nform f:\n## A\n| D |\n").diagnostics[0]?.data).toEqual({ name: "f" });
  });

  test("parse never throws on form lines", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (name, list) => {
        const text = `# T\nform ${name}: ${list}\n## A, B\n| D |\n## A\n`;
        const { doc } = parse(text);
        resolveSong(doc, { form: name });
      }),
    );
  });
});

describe("resolveSong with a form", () => {
  test("the main version is the file order and has no name", () => {
    const song = resolveSong(doc(WORTHY));
    expect(song.formName).toBeNull();
    expect(song.forms).toEqual(["коротка", "без програшу"]);
    expect(song.sections.map((s) => [s.index, s.docIndex])).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((i) => [i, i]),
    );
  });

  test("sections and the form in the version's order, with its repeats", () => {
    const song = resolveSong(doc(WORTHY), { form: "без програшу" });
    expect(song.formName).toBe("без програшу");
    expect(order(song)).toEqual([
      "Intro x2",
      "Verse 1 x1",
      "Chorus x1",
      "Verse 2 x2",
      "Chorus x1",
      "Bridge x4",
    ]);
    expect(song.sections.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(song.sections.map((s) => s.docIndex)).toEqual([0, 1, 2, 4, 5, 6]);
    expect(song.form.map((f) => [f.section, f.abbr, f.bars, f.repeat])).toEqual([
      [0, "I", 2, 2],
      [1, "V1", 9, 1],
      [2, "C", 7, 1],
      [3, "V2", 4, 2],
      [4, "C2", 7, 1],
      [5, "B", 4, 4],
    ]);
  });

  test("the form name is matched without letter case and extra spaces", () => {
    expect(resolveSong(doc(WORTHY), { form: "  Без   ПРОГРАШУ " }).formName).toBe("без програшу");
  });

  test("without a repeat in the form, a section keeps its own, also one taken by reuse", () => {
    const text = "# T\nform f: Interlude, Intro x1\n## Intro x3\n| D |\n## Interlude = Intro\n";
    expect(order(resolveSong(doc(text), { form: "f" }))).toEqual(["Interlude x3", "Intro x1"]);
  });

  test("a section left out of a form still lends its bars", () => {
    const text =
      "# T\nform f: Verse 2, Chorus 2\n## Verse 1\n| D | A |\n## Chorus\n| G |\n## Verse 2\n## Chorus 2\n";
    const song = resolveSong(doc(text), { form: "f" });
    expect(song.sections.map((s) => s.bars)).toEqual([2, 1]);
    expect(song.sections.map((s) => s.reusedFrom)).toEqual([0, 1]);
  });

  test("a section played twice appears twice, with its own notes and abbreviation", () => {
    const song = resolveSong(doc(WORTHY), { form: "коротка" });
    const choruses = song.sections.filter((s) => s.name === "Chorus");
    expect(choruses.map((s) => [s.docIndex, s.abbr])).toEqual([
      [2, "C"],
      [5, "C2"],
    ]);
  });

  test("instrument parts follow the version", () => {
    const song = resolveSong(doc(WORTHY), { instrument: "bass", form: "коротка" });
    expect(song.sections[1]?.lines.map((l) => l.source)).toEqual(["part", "base"]);
  });

  test("an unknown form plays the main version", () => {
    const song = resolveSong(doc(WORTHY), { form: "довга" });
    expect(song.formName).toBeNull();
    expect(song.sections).toEqual(resolveSong(doc(WORTHY)).sections);
  });

  test("a form that names no section of the file plays the main version and is not listed", () => {
    const text = "# T\nform f: Coda\nform g:\n## A\n| D |\n";
    const song = resolveSong(doc(text), { form: "f" });
    expect(song.formName).toBeNull();
    expect(order(song)).toEqual(["A x1"]);
    expect(song.forms).toEqual([]);
  });

  test("the main version is unchanged by form lines", () => {
    // The same file with the form lines turned into comments of the same length: spans agree.
    const without = WORTHY.replace(/^fo(rm .*)$/gm, "//$1");
    expect(resolveSong(doc(WORTHY))).toEqual({
      ...resolveSong(doc(without)),
      forms: ["коротка", "без програшу"],
    });
  });
});

describe("rewriting form lines", () => {
  const worthy = doc(WORTHY);

  test("formatFormEntries writes names as the file does, and `#n` only where it is needed", () => {
    expect(
      formatFormEntries(
        worthy,
        [0, 1, 2, 4, 5, 6].map((section) => ({ section, repeat: null })),
      ),
    ).toBe("Intro, Verse 1, Chorus, Verse 2, Chorus, Bridge");
    expect(
      formatFormEntries(worthy, [
        { section: 5, repeat: 2 },
        { section: 2, repeat: null },
        { section: 6, repeat: 1 },
      ]),
    ).toBe("Chorus #2 x2, Chorus #1, Bridge x1");
    expect(formatFormEntries(doc(VDIACHNIST), [{ section: 1, repeat: 3 }])).toBe("1, 2 Verse x3");
  });

  test("setForm replaces the list of a form and nothing else", () => {
    const result = setForm(WORTHY, "КОРОТКА", [
      { section: 0, repeat: null },
      { section: 6, repeat: 2 },
    ]);
    expect(result).toBe(
      WORTHY.replace(
        "form коротка: Intro, Verse 1, Chorus, Verse 2, Chorus, Bridge x2",
        "form коротка: Intro, Bridge x2",
      ),
    );
  });

  test("setForm adds a new line after the last form line", () => {
    const result = setForm(WORTHY, "Різдво", [{ section: 2, repeat: null }]);
    expect(result).toBe(WORTHY.replace("Bridge x4\n", "Bridge x4\nform Різдво: Chorus\n"));
  });

  test("setForm adds the first form after the header values, or the title", () => {
    expect(setForm("# T\nkey: D\n\n## A\n| D |\n", "f", [{ section: 0, repeat: null }])).toBe(
      "# T\nkey: D\nform f: A\n\n## A\n| D |\n",
    );
    expect(setForm("# T\r\n## A\r\n| D |\r\n", "f", [{ section: 0, repeat: 2 }])).toBe(
      "# T\r\nform f: A x2\r\n## A\r\n| D |\r\n",
    );
    expect(setForm("## A\n| D |\n", "f", [{ section: 0, repeat: null }])).toBe(
      "form f: A\n## A\n| D |\n",
    );
  });

  test("renameForm changes only the name", () => {
    expect(renameForm(WORTHY, "без програшу", "  довга  версія ")).toBe(
      WORTHY.replace("form без програшу:", "form довга версія:"),
    );
    expect(renameForm(WORTHY, "немає", "x")).toBe(WORTHY);
  });

  test("removeForm deletes the whole line", () => {
    expect(removeForm(WORTHY, "коротка")).toBe(WORTHY.replace(/form коротка: .*\n/, ""));
    expect(removeForm("# T\r\nform f: A\r\n## A\r\n| D |", "f")).toBe("# T\r\n## A\r\n| D |");
    expect(removeForm("# T\nform f: A", "f")).toBe("# T\n");
    expect(removeForm(WORTHY, "немає")).toBe(WORTHY);
  });

  test("cleanFormName drops what a name cannot hold", () => {
    expect(cleanFormName("  a:b | c\nd  ")).toBe("ab c d");
    expect(cleanFormName(" : ")).toBe("");
  });

  test("names that cannot be written leave the text alone", () => {
    expect(setForm(WORTHY, " : ", [{ section: 0, repeat: null }])).toBe(WORTHY);
    expect(renameForm(WORTHY, "коротка", "|")).toBe(WORTHY);
  });

  test("round trip: what setForm writes, parse reads back", () => {
    for (const { name, text } of exampleSongs()) {
      const parsed = doc(text);
      const count = parsed.sections.length;
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              section: fc.integer({ min: 0, max: count - 1 }),
              repeat: fc.option(fc.integer({ min: 1, max: 9 })),
            }),
            { minLength: 1, maxLength: 12 },
          ),
          (steps) => {
            const named = steps.filter((s) => parsed.sections[s.section]?.name !== "");
            const written = setForm(text, "test version", named);
            const read = findForm(doc(written), "test version");
            expect(
              read?.entries.map((e) => ({ section: e.section, repeat: e.repeat })),
              name,
            ).toEqual(named);
          },
        ),
        { numRuns: 50 },
      );
    }
  });
});

describe("form lines elsewhere", () => {
  test("transposeText leaves form lines alone", () => {
    const text = "# T\nkey: D\nform D and A: D, A x2\n## D\n| D |\n## A\n| A |\n";
    expect(transposeText(text, 2)).toBe(
      "# T\nkey: E\nform D and A: D, A x2\n## D\n| E |\n## A\n| B |\n",
    );
  });

  test("a setlist entry keeps its form and writes it back", () => {
    const text = "# Service\n- dostoinyi-ty-odyn | key: D | form: без програшу | > no intro\n";
    const { setlist } = parseSetlist(text);
    expect(setlist.entries[0]?.options).toEqual({ form: "без програшу" });
    expect(formatSetlist(setlist)).toBe(text);
  });
});

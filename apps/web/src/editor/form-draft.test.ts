import { findForm, parse, setForm } from "@takt/format";
import { describe, expect, test } from "vitest";
import { draftSteps, formDraft, mainDraft, moveRow, newFormName, repeatFor } from "./form-draft.ts";

const TEXT = `# T
form short: Chorus x1, Verse
## Intro
| D |
## Verse
| G |
## Chorus x2
| A |
## Outro
| D |
`;
const doc = parse(TEXT).doc;

describe("version drafts", () => {
  test("the main version: every section, in file order, with its own repeat", () => {
    expect(mainDraft(doc)).toEqual([
      { section: 0, repeat: null, on: true },
      { section: 1, repeat: null, on: true },
      { section: 2, repeat: null, on: true },
      { section: 3, repeat: null, on: true },
    ]);
  });

  test("a named version: its entries, then the left-out sections switched off in place", () => {
    expect(formDraft(doc, "SHORT")).toEqual([
      { section: 0, repeat: null, on: false },
      { section: 2, repeat: 1, on: true },
      { section: 1, repeat: null, on: true },
      { section: 3, repeat: null, on: false },
    ]);
  });

  test("only the rows that are played are written", () => {
    const rows = moveRow(formDraft(doc, "short"), 3, 0);
    expect(draftSteps(rows)).toEqual([
      { section: 2, repeat: 1 },
      { section: 1, repeat: null },
    ]);
    const written = setForm(TEXT, "short", draftSteps(rows.map((row) => ({ ...row, on: true }))));
    expect(findForm(parse(written).doc, "short")?.entries.map((e) => e.text)).toEqual([
      "Outro",
      "Intro",
      "Chorus x1",
      "Verse",
    ]);
  });

  test("a repeat equal to the section's own is not written; repeats stay within 1–16", () => {
    expect(repeatFor(2, 2)).toBeNull();
    expect(repeatFor(3, 2)).toBe(3);
    expect(repeatFor(0, 2)).toBe(1);
    expect(repeatFor(40, 1)).toBe(16);
  });

  test("out-of-range moves change nothing", () => {
    const rows = mainDraft(doc);
    expect(moveRow(rows, 0, -1)).toBe(rows);
    expect(moveRow(rows, 3, 4)).toBe(rows);
  });

  test("a new version gets a free name", () => {
    const word = (count: number) => `Version ${count}`;
    expect(newFormName([], word)).toBe("Version 1");
    expect(newFormName(["short"], word)).toBe("Version 2");
    expect(newFormName(["version 2"], word)).toBe("Version 3");
  });
});

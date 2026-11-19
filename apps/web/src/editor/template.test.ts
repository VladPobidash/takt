import { parse } from "@takt/format";
import { describe, expect, test } from "vitest";
import { insertAt, newSongText } from "./template.ts";

describe("newSongText", () => {
  test("is a valid song in the chosen note naming", () => {
    for (const notation of ["H", "B"] as const) {
      const { doc, diagnostics } = parse(newSongText("Нова пісня", notation));
      expect(diagnostics).toEqual([]);
      expect(doc).toMatchObject({ title: "Нова пісня", notation, notationSource: "header" });
      expect(doc.sections.map((s) => s.name)).toEqual(["Verse 1", "Chorus"]);
    }
  });
});

describe("insertAt", () => {
  test("puts the symbol at the caret and moves the caret after it", () => {
    expect(insertAt("| D  |", 4, 4, "*")).toEqual({ text: "| D * |", caret: 5 });
    expect(insertAt("| D |", 5, 5, "|")).toEqual({ text: "| D ||", caret: 6 });
  });

  test("replaces the selection", () => {
    expect(insertAt("| Dxx |", 3, 5, "#")).toEqual({ text: "| D# |", caret: 4 });
  });

  test("a section header starts on its own line; notes get a space", () => {
    expect(insertAt("| D |", 5, 5, "##")).toEqual({ text: "| D |\n## ", caret: 9 });
    expect(insertAt("| D |\n", 6, 6, "##")).toEqual({ text: "| D |\n## ", caret: 9 });
    expect(insertAt("", 0, 0, ">")).toEqual({ text: "> ", caret: 2 });
    expect(insertAt("", 0, 0, "@")).toEqual({ text: "@", caret: 1 });
  });
});

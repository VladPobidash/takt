import { describe, expect, test } from "vitest";
import { diffSongs } from "../src/diff.ts";
import type {
  BarChange,
  LineChange,
  SectionChange,
  SongChange,
  SongDiff,
  TextChange,
} from "../src/types.ts";
import { exampleSong, exampleSongs, WORTHY } from "./fixtures.ts";

const kinds = (diff: SongDiff) => diff.changes.map((c) => c.kind);

/** Where a change happened: section, then line, bar (or text line) as far as the change has them. */
function where(change: SongChange): unknown[] {
  if (change.kind === "title" || change.kind === "meta") return [change.kind];
  if (change.kind.startsWith("section-")) {
    const c = change as SectionChange;
    const p = c.after ?? c.before;
    return [c.kind, p?.name, p?.occurrence];
  }
  if (change.kind.startsWith("line-")) {
    const c = change as LineChange;
    const p = c.after ?? c.before;
    return [c.kind, c.instrument, p?.section.name, p?.section.occurrence, p?.line];
  }
  if (change.kind.startsWith("bar-")) {
    const c = change as BarChange;
    const p = c.after ?? c.before;
    return [c.kind, c.instrument, p?.section.name, p?.section.occurrence, p?.line, p?.bar];
  }
  const c = change as TextChange;
  const p = c.after ?? c.before;
  return [c.kind, c.instrument, p?.section?.name, p?.section?.occurrence, p?.line];
}

/** Replace the `nth` line that equals `line` exactly; fails loudly if the fixture changed. */
function replaceLine(text: string, line: string, next: string[], nth = 0): string {
  const lines = text.split("\n");
  let seen = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === line && ++seen === nth) {
      lines.splice(i, 1, ...next);
      return lines.join("\n");
    }
  }
  throw new Error(`fixture has no line ${JSON.stringify(line)} (#${nth})`);
}

const dostoinyi = exampleSong("dostoinyi-ty-odyn.takt");
const silentNight = exampleSong("silent-night.takt");

/** A small song around one bars line, for single-bar cases. */
const song = (bars: string, time = "4/4", notation = "") =>
  `# Test\ntime: ${time}\n${notation}\n## Verse\n${bars}\n`;

const VERSE_1_LINE_2 = "| D | A | D/F#** G** | Asus4* A*** | A |";

describe("the same song", () => {
  test.each(exampleSongs())("$name against itself: no changes, identical", ({ text }) => {
    const diff = diffSongs(text, text);
    expect(diff.identical).toBe(true);
    expect(diff.changes).toEqual([]);
    expect(diff.summary.total).toBe(0);
  });

  test.each(exampleSongs())(
    "$name with every bar line padded: no changes, not identical",
    ({ text }) => {
      const padded = text.replace(/^.*\|.*$/gm, (l) => l.replace(/ /g, "   "));
      expect(padded).not.toBe(text);
      const diff = diffSongs(text, padded);
      expect(diff.identical).toBe(false);
      expect(diff.changes).toEqual([]);
    },
  );

  test("WORTHY against itself", () => {
    expect(diffSongs(WORTHY, WORTHY).identical).toBe(true);
  });
});

describe("edits of an example song", () => {
  test("one chord changed in the 3rd bar of the 2nd line of Verse 1", () => {
    const after = replaceLine(dostoinyi, VERSE_1_LINE_2, [
      "| D | A | D/F#** Em** | Asus4* A*** | A |",
    ]);
    const diff = diffSongs(dostoinyi, after);
    expect(diff.changes.map(where)).toEqual([["bar-changed", null, "Verse 1", 1, 2, 3]]);
    const change = diff.changes[0] as BarChange;
    expect(change.before?.value.cells[1]?.text).toBe("G");
    expect(change.after?.value.cells[1]?.text).toBe("Em");
  });

  test("inserting a bar gives exactly one bar-added", () => {
    const after = replaceLine(dostoinyi, "| G*** Hm* | A | D/F# | Hm |", [
      "| G*** Hm* | A | E | D/F# | Hm |",
    ]);
    const diff = diffSongs(dostoinyi, after);
    expect(diff.changes.map(where)).toEqual([["bar-added", null, "Chorus", 1, 1, 3]]);
    expect(diff.changes[0]?.kind === "bar-added" && diff.changes[0].before).toBeNull();
  });

  test("deleting a bar gives exactly one bar-removed", () => {
    const after = replaceLine(dostoinyi, "| G*** Hm* | A | D/F# | Hm |", ["| G*** Hm* | A | Hm |"]);
    const diff = diffSongs(dostoinyi, after);
    expect(diff.changes.map(where)).toEqual([["bar-removed", null, "Chorus", 1, 1, 3]]);
    expect((diff.changes[0] as BarChange).after).toBeNull();
  });

  test("a whole bar line added to the bridge", () => {
    const after = replaceLine(dostoinyi, "| G | Em | Hm | A** D/F#** |", [
      "| G | Em | Hm | A** D/F#** |",
      "| G | Em | Hm | A |",
    ]);
    const diff = diffSongs(dostoinyi, after);
    expect(diff.changes.map(where)).toEqual([["line-added", null, "Bridge", 1, 2]]);
  });

  test("a whole bar line removed", () => {
    const after = replaceLine(dostoinyi, "| G*** Hm* | A | D/F# |", []);
    const diff = diffSongs(dostoinyi, after);
    expect(diff.changes.map(where)).toEqual([["line-removed", null, "Chorus", 1, 2]]);
  });

  test("an @bass line edited: the change is the bass's, the base is untouched", () => {
    const after = replaceLine(dostoinyi, "@bass | D | A | F#** G** | A |", [
      "@bass | D | A | F#** G** | E |",
    ]);
    const diff = diffSongs(dostoinyi, after);
    expect(diff.changes.map(where)).toEqual([["bar-changed", "bass", "Verse 1", 1, 1, 4]]);
    expect(diff.changes.filter((c) => "instrument" in c && c.instrument === null)).toEqual([]);
  });

  test("an @bass line is numbered among the bass lines, not the base lines", () => {
    const before = `${song("| D | A |\n| D | A |\n@bass | D | A |\n@bass | D | E |")}`;
    const after = before.replace("@bass | D | E |", "@bass | D | F |");
    expect(diffSongs(before, after).changes.map(where)).toEqual([
      ["bar-changed", "bass", "Verse", 1, 2, 2],
    ]);
  });

  test("a @keys cue added", () => {
    const after = replaceLine(dostoinyi, "> first line — keys only", [
      "> first line — keys only",
      "@keys > pad under the first line",
    ]);
    const diff = diffSongs(dostoinyi, after);
    expect(diff.changes.map(where)).toEqual([["note-added", "keys", "Verse 1", 1, 1]]);
  });

  test("a band note changed", () => {
    const after = replaceLine(dostoinyi, "> first line — keys only", [
      "> first line — guitar only",
    ]);
    const diff = diffSongs(dostoinyi, after);
    expect(diff.changes.map(where)).toEqual([["note-changed", null, "Verse 1", 1, 1]]);
  });

  test("a cue for one instrument changed", () => {
    const after = replaceLine(dostoinyi, "@keys > right hand: melody an octave up", [
      "@keys > left hand: root notes",
    ]);
    expect(diffSongs(dostoinyi, after).changes.map(where)).toEqual([
      ["note-changed", "keys", "Chorus", 1, 1],
    ]);
  });

  test("a note with different spacing is the same note", () => {
    const after = replaceLine(dostoinyi, "> first line — keys only", [
      ">   first  line — keys   only",
    ]);
    expect(diffSongs(dostoinyi, after).changes).toEqual([]);
  });

  test("key: and tempo: changed", () => {
    const after = dostoinyi.replace("key: D", "key: E").replace("tempo: 135", "tempo: 140");
    const diff = diffSongs(dostoinyi, after);
    expect(
      diff.changes.map((c) => c.kind === "meta" && [c.key, c.before?.value, c.after?.value]),
    ).toEqual([
      ["key", "D", "E"],
      ["tempo", "135", "140"],
    ]);
    expect(diff.summary.header).toBe(2);
  });

  test("an unknown header key added", () => {
    const after = dostoinyi.replace("capo: 2\n", "capo: 2\nmood: calm\n");
    const diff = diffSongs(dostoinyi, after);
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0];
    expect(change?.kind === "meta" && [change.key, change.before, change.after?.value]).toEqual([
      "mood",
      null,
      "calm",
    ]);
  });

  test("the title changed", () => {
    const after = dostoinyi.replace("# Достойний Ти Один", "# Достойний Ти");
    expect(kinds(diffSongs(dostoinyi, after))).toEqual(["title"]);
  });

  test("a section renamed, content unchanged", () => {
    const after = dostoinyi.replace("## Bridge [яма] x4", "## Breakdown [яма] x4");
    const diff = diffSongs(dostoinyi, after);
    // Both form lines name "Bridge", which no longer exists: they play less now (ADR 0013).
    expect(kinds(diff)).toEqual(["form-changed", "form-changed", "section-renamed"]);
    const change = diff.changes[2] as SectionChange;
    expect([change.before?.name, change.after?.name]).toEqual(["Bridge", "Breakdown"]);
  });

  test("a section of the same type between the same neighbours is a rename, not remove + add", () => {
    const before = "# T\n\n## Verse\n| G |\n\n## Chorus\n| D |\n\n## Outro\n| G |\n";
    const after = "# T\n\n## Verse\n| G |\n\n## Refrain Chorus\n| E |\n\n## Outro\n| G |\n";
    const result = kinds(diffSongs(before, after));
    expect(result).not.toContain("section-added");
    expect(result).not.toContain("section-removed");
    expect(result).toContain("section-renamed");
  });

  test("two different sections are an add and a remove", () => {
    const before = "# T\n\n## Verse\n| G |\n\n## Intro\n| D |\n";
    const after = "# T\n\n## Verse\n| G |\n\n## Bridge\n| A | E |\n";
    expect(kinds(diffSongs(before, after)).sort()).toEqual(["section-added", "section-removed"]);
  });

  test("the bridge moved before the chorus", () => {
    const bridge =
      "## Bridge [яма] x4\n| G | Em | Hm | A** D/F#** |\n@cajon > first 2 times — hand only\n";
    expect(dostoinyi.endsWith(bridge)).toBe(true);
    const rest = dostoinyi.slice(0, -bridge.length);
    const after = rest.replace("## Chorus\n", `${bridge}\n## Chorus\n`);
    const diff = diffSongs(dostoinyi, after.trimEnd().concat("\n"));
    expect(diff.changes.map(where)).toEqual([["section-moved", "Bridge", 1]]);
    const move = diff.changes[0] as SectionChange;
    expect([move.before?.index, move.after?.index]).toEqual([6, 2]);
  });

  test("a second ## Chorus added at the end", () => {
    const before = "# T\n\n## Verse\n| G | D |\n\n## Chorus\n| C | G |\n";
    const after = `${before}\n## Chorus\n`;
    const diff = diffSongs(before, after);
    expect(diff.changes.map(where)).toEqual([["section-added", "Chorus", 2]]);
  });

  test("a third ## Chorus added to the song of the band", () => {
    const diff = diffSongs(dostoinyi, `${dostoinyi}\n## Chorus\n`);
    expect(diff.changes.map(where)).toEqual([["section-added", "Chorus", 3]]);
  });

  test("when the count of same-named sections differs, they are aligned by content", () => {
    const before = "# T\n\n## Chorus\n| G |\n\n## Chorus\n| D |\n";
    const after = "# T\n\n## Chorus\n| G |\n\n## Chorus\n| A |\n\n## Chorus\n| D |\n";
    const diff = diffSongs(before, after);
    expect(diff.changes.map(where)).toEqual([["section-added", "Chorus", 2]]);
  });

  test("x4 changed to x2 on the bridge", () => {
    const after = dostoinyi.replace("## Bridge [яма] x4", "## Bridge [яма] x2");
    const diff = diffSongs(dostoinyi, after);
    expect(diff.changes.map(where)).toEqual([["section-repeat", "Bridge", 1]]);
    const change = diff.changes[0] as SectionChange;
    expect([change.before?.repeat, change.after?.repeat]).toEqual([4, 2]);
  });

  test("a tag changed", () => {
    const after = dostoinyi.replace("[яма]", "[тихо]");
    const diff = diffSongs(dostoinyi, after);
    expect(diff.changes.map(where)).toEqual([["section-tag", "Bridge", 1]]);
    const change = diff.changes[0] as SectionChange;
    expect([change.before?.tag, change.after?.tag]).toEqual(["яма", "тихо"]);
  });

  test("a reference changed", () => {
    const after = silentNight.replace("## Interlude = Intro", "## Interlude = Verse 1");
    const diff = diffSongs(silentNight, after);
    expect(diff.changes.map(where)).toEqual([["section-ref", "Interlude", 1]]);
  });

  test("lyrics lines added (made-up words)", () => {
    const after = replaceLine(silentNight, "> line 3: voices alone for two bars", [
      "> line 3: voices alone for two bars",
      "Lanterns low along the shore",
      "Morning comes and night is done",
    ]);
    const diff = diffSongs(silentNight, after);
    expect(diff.changes.map(where)).toEqual([
      ["lyrics-added", null, "Verse 3", 1, 1],
      ["lyrics-added", null, "Verse 3", 1, 2],
    ]);
    expect(diff.summary.lyrics).toBe(2);
  });

  test("a lyrics line reworded and one with only spacing changed", () => {
    const before = "# T\n\n## Verse\n| G | D |\nWalking down the road\nHome again\n";
    const after = "# T\n\n## Verse\n| G | D |\nWalking down the  river\nHome   again\n";
    expect(diffSongs(before, after).changes.map(where)).toEqual([
      ["lyrics-changed", null, "Verse", 1, 1],
    ]);
  });

  test("editing the first chorus leaves the later empty chorus alone", () => {
    const after = replaceLine(WORTHY, "| G*** Hm* | A | D/F# | Hm |", [
      "| G*** Hm* | A | D/F# | G |",
    ]);
    const diff = diffSongs(WORTHY, after);
    expect(diff.changes.map(where)).toEqual([["bar-changed", null, "Chorus", 1, 1, 4]]);
  });

  test("a line repeat, a left label and a right-hand cue", () => {
    const before = song("Solo | D | A | rit.\n| E | E | A | A | (2x)");
    expect(kinds(diffSongs(before, before.replace("(2x)", "(3x)")))).toEqual(["line-repeat"]);
    expect(kinds(diffSongs(before, before.replace("Solo", "Fill")))).toEqual(["line-label"]);
    expect(kinds(diffSongs(before, before.replace("rit.", "accel.")))).toEqual(["line-cue"]);
  });

  test("summary counts by group", () => {
    const after = replaceLine(dostoinyi, VERSE_1_LINE_2, [
      "| D | A | D/F#** Em** | Asus4* A*** | A |",
    ])
      .replace("key: D", "key: E")
      .replace(
        "@cajon > first 2 times — hand only",
        "@cajon > first 2 times — hand only\nLa la la, made-up words",
      );
    const diff = diffSongs(dostoinyi, after);
    expect(diff.summary).toEqual({
      total: 3,
      header: 1,
      forms: 0,
      sections: 0,
      lines: 0,
      bars: 1,
      notes: 0,
      lyrics: 1,
    });
    expect(diff.summary.total).toBe(diff.changes.length);
  });

  test("every section of both versions is paired", () => {
    const diff = diffSongs(dostoinyi, `${dostoinyi}\n## Chorus\n`);
    expect(diff.sections).toHaveLength(diff.after.sections.length);
    expect(diff.sections.at(-1)).toEqual({ before: null, after: diff.after.sections.length - 1 });
  });
});

describe("meaning, not spelling", () => {
  test.each([
    ["| A E |", "| A - E |"],
    ["| A E |", "| A** E** |"],
    ["| A E |", "| A . E . |"],
    ["| A - E |", "| A** E** |"],
    ["| D |", "|D|"],
    ["| D | A |", "|  D   |    A  |"],
  ])("%s and %s are the same bar", (a, b) => {
    const diff = diffSongs(song(a), song(b));
    expect(diff.changes).toEqual([]);
    expect(diff.identical).toBe(false);
  });

  test("comments are ignored", () => {
    const after = dostoinyi.replace("// Chords and structure only.", "// Edited comment.");
    const diff = diffSongs(dostoinyi, after);
    expect(after).not.toBe(dostoinyi);
    expect(diff.changes).toEqual([]);
    expect(diff.identical).toBe(false);
  });

  test("instrument synonyms are the same instrument", () => {
    const before = song("| D | A |\n@bass | D | A |\n@drums > half-time");
    const after = song("| D | A |\n@бас | D | A |\n@cajon > half-time");
    expect(diffSongs(before, after).changes).toEqual([]);
  });

  test("H-notation Hm equals English Bm", () => {
    const h = diffSongs(
      song("| Hm | D |", "4/4", "notation: H\n"),
      song("| Bm | D |", "4/4", "notation: B\n"),
    );
    expect(h.changes.map(where)).toEqual([["meta"]]);
    const inferred = diffSongs(song("| Hm | D |"), song("| Bm | D |"), { defaultNotation: "B" });
    expect(inferred.changes).toEqual([]);
  });

  test("C# and Db differ; m and min differ", () => {
    expect(diffSongs(song("| C# |"), song("| Db |")).changes.map(where)).toEqual([
      ["bar-changed", null, "Verse", 1, 1, 1],
    ]);
    expect(kinds(diffSongs(song("| Am |"), song("| Amin |")))).toEqual(["bar-changed"]);
  });

  test("time: 4/4 to 3/4 is one meta change and no bar changes", () => {
    const diff = diffSongs(song("| A | D | E | A |", "4/4"), song("| A | D | E | A |", "3/4"));
    expect(diff.changes.map(where)).toEqual([["meta"]]);
    expect(diff.summary.bars).toBe(0);
  });
});

describe("lines from the parser test cases", () => {
  test("| A - E | to | A E | is no change", () => {
    const diff = diffSongs(
      song("| H | H | C#m | C#m | H | H | A - E | E |"),
      song("| H | H | C#m | C#m | H | H | A E | E |"),
    );
    expect(diff.changes).toEqual([]);
  });

  test("| E*** G* | to | E** G** | is a bar-changed", () => {
    const diff = diffSongs(
      song("| E*** G* | E*** G* | E*** G | E |"),
      song("| E** G** | E*** G* | E*** G | E |"),
    );
    expect(diff.changes.map(where)).toEqual([["bar-changed", null, "Verse", 1, 1, 1]]);
  });

  test("an empty bar to a repeat bar is a bar-changed", () => {
    const diff = diffSongs(
      song("| D | | A** G** | | A** G** |"),
      song("| D | % | A** G** | | A** G** |"),
    );
    expect(diff.changes.map(where)).toEqual([["bar-changed", null, "Verse", 1, 1, 2]]);
  });

  test("| C # | is | C# |", () => {
    const a = song("| F# | F# | D#m | C # |", "6/8", "notation: H\n");
    const b = song("| F# | F# | D#m | C# |", "6/8", "notation: H\n");
    expect(diffSongs(a, b).changes).toEqual([]);
  });

  test("6/8: | B*** F7*** | is | B F7 |", () => {
    const a = song("| F7 | B | B*** F7*** | B |", "6/8");
    const b = song("| F7 | B | B F7 | B |", "6/8");
    expect(diffSongs(a, b).changes).toEqual([]);
  });

  test("silent night: a changed right-hand cue and an added @keys bar", () => {
    const after = replaceLine(silentNight, "| N.C. | | B F7 | B | rit.", [
      "| N.C. | | B F7 | B | a tempo",
    ]);
    expect(diffSongs(silentNight, after).changes.map(where)).toEqual([
      ["line-cue", null, "Verse 3", 1, 3],
    ]);
  });
});

describe("rough input", () => {
  test.each([
    ["half-written bars", "## Verse\n| D | A"],
    ["only bar lines", "|||"],
    ["an empty text", ""],
    ["unicode noise", "# 🎸\n\n## 🎶 Куплет [😀]\n| 𝄞 | Ж | ♭♯ |\n@🥁 > ※\n\u0000​\r\n"],
    ["a header only", "key:"],
    ["bad references", "## A = A\n## B = C\n## = \n"],
  ])("%s do not throw", (_name, text) => {
    expect(() => diffSongs(text, WORTHY)).not.toThrow();
    expect(() => diffSongs(WORTHY, text)).not.toThrow();
    const self = diffSongs(text, text);
    expect(self.changes).toEqual([]);
    expect(self.identical).toBe(true);
    const mixed = diffSongs(text, WORTHY);
    expect(mixed.summary.total).toBe(mixed.changes.length);
  });
});

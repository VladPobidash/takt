import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { diffSongs } from "../src/diff.ts";
import type { SongChange } from "../src/types.ts";
import { exampleSongs, WORTHY } from "./fixtures.ts";

const song = (body: string, header = "# T\nkey: D\n") => `${header}\n${body}`;

/** A compact view of a change: kind, instrument and the places on both sides. */
function brief(change: SongChange): string {
  const where = (place: unknown): string => {
    if (!place || typeof place !== "object") return "-";
    const p = place as {
      section?: { name: string; occurrence: number } | null;
      line?: number;
      bar?: number;
      name?: string;
      occurrence?: number;
    };
    const section =
      p.section ?? (p.name !== undefined ? { name: p.name, occurrence: p.occurrence ?? 1 } : null);
    const parts = [section ? `${section.name}#${section.occurrence}` : "header"];
    if (p.line !== undefined) parts.push(`l${p.line}`);
    if (p.bar !== undefined) parts.push(`b${p.bar}`);
    return parts.join("/");
  };
  const instrument = "instrument" in change && change.instrument ? `@${change.instrument} ` : "";
  if (change.kind === "title")
    return `title ${change.before?.value ?? "-"} → ${change.after?.value ?? "-"}`;
  if (change.kind === "meta")
    return `meta ${change.key} ${change.before?.value ?? "-"} → ${change.after?.value ?? "-"}`;
  return `${instrument}${change.kind} ${where(change.before)} ${where(change.after)}`;
}

const briefs = (before: string, after: string) => diffSongs(before, after).changes.map(brief);

describe("diffSongs: nothing changed", () => {
  test("the same text is identical and has no changes", () => {
    for (const text of [WORTHY, ...exampleSongs().map((s) => s.text), "", "garbage | | ||"]) {
      const diff = diffSongs(text, text);
      expect(diff.identical).toBe(true);
      expect(diff.changes).toEqual([]);
      expect(diff.summary.total).toBe(0);
    }
  });

  test("spacing and alignment alone are no change, but the text is not identical", () => {
    const diff = diffSongs(
      song("## Verse\n| D | A |\n> quiet\n"),
      song("##   Verse\n|D|A|\n>   quiet  \n"),
    );
    expect(diff.identical).toBe(false);
    expect(diff.changes).toEqual([]);
  });

  test("the same bar written another way is no change", () => {
    const a = song("## V\n| A E | A - E | A** E** | A . E . | C # | N.C. |\n");
    const b = song("## V\n| A** E** | A E | A . E . | A E | C# | NC |\n");
    expect(briefs(a, b)).toEqual([]);
  });

  test("H-notation and English naming of the same chord are the same", () => {
    const a = "# T\nnotation: H\n## V\n| Hm | H7 | B |\n";
    const b = "# T\nnotation: H\n## V\n| Hm | H7 | Bb |\n";
    expect(briefs(a, b)).toEqual([]);
    // Switching the naming is a header change; the chords mean the same.
    expect(briefs(a, "# T\nnotation: B\n## V\n| Bm | B7 | Bb |\n")).toEqual([
      "meta notation H → B",
    ]);
  });

  test("comments are never a change", () => {
    expect(briefs(song("## V\n// old\n| D |\n"), song("## V\n| D |\n// new\n"))).toEqual([]);
  });

  test("instrument synonyms are the same instrument", () => {
    expect(briefs(song("## V\n| D |\n@бас | D |\n"), song("## V\n| D |\n@bass | D |\n"))).toEqual(
      [],
    );
  });

  test("changing the time signature does not change whole bars", () => {
    expect(
      briefs(song("## V\n| D | A G |\n"), song("## V\n| D | A G |\n", "# T\nkey: D\ntime: 3/4\n")),
    ).toEqual(["meta time - → 3/4"]);
  });
});

describe("diffSongs: header", () => {
  test("title and every header key, unknown keys included", () => {
    const a = "# Old\nkey: D\ntempo: 120\nartist: X\nfoo: 1\n## V\n| D |\n";
    const b = "# New\nkey: E\ntempo: 120 bpm\nlink: https://x\nfoo: 2\n## V\n| D |\n";
    expect(briefs(a, b)).toEqual([
      "title Old → New",
      "meta key D → E",
      "meta artist X → -",
      "meta link - → https://x",
      "meta foo 1 → 2",
    ]);
  });

  test("values are compared by meaning", () => {
    const a = "# T\nnotation: H\nkey: Hm\ntempo: 120\ntime: 4/4\ncapo: 2\n## V\n| D |\n";
    const b = "# T\nnotation: b\nkey:   Bm\ntempo: 120bpm\ntime: 4 / 4\ncapo:  2\n## V\n| D |\n";
    expect(briefs(a, b)).toEqual(["meta notation H → b"]);
  });

  test("a header change carries both entries with their spans", () => {
    const diff = diffSongs("# T\nkey: D\n", "# T\n\nkey: E\n");
    const change = diff.changes[0];
    expect(change?.kind).toBe("meta");
    if (change?.kind !== "meta") return;
    expect(change.before?.valueSpan.start.line).toBe(2);
    expect(change.after?.valueSpan.start.line).toBe(3);
  });
});

describe("diffSongs: sections", () => {
  const form = (...names: string[]) =>
    song(
      names
        .map((name, i) => `## ${name}\n| ${["D", "A", "G", "Em", "Hm", "F#m"][i % 6]} |\n`)
        .join("\n"),
    );

  test("a section inserted in the middle is one change", () => {
    expect(
      briefs(
        form("Intro", "Verse", "Chorus"),
        song("## Intro\n| D |\n## Bridge\n| C |\n## Verse\n| A |\n## Chorus\n| G |\n"),
      ),
    ).toEqual(["section-added - Bridge#1"]);
  });

  test("a removed section is listed where it used to be", () => {
    const diff = diffSongs(
      form("Intro", "Verse", "Chorus"),
      song("## Intro\n| D |\n## Chorus\n| G |\n"),
    );
    expect(diff.changes.map(brief)).toEqual(["section-removed Verse#1 -"]);
    expect(diff.sections).toEqual([
      { before: 0, after: 0 },
      { before: 1, after: null },
      { before: 2, after: 1 },
    ]);
  });

  test("sections of the same name are matched by occurrence", () => {
    const a = song("## Chorus\n| G |\n## Verse\n| D |\n## Chorus\n| G |\n");
    const b = song("## Chorus\n| G |\n## Verse\n| D |\n## Chorus\n| A |\n");
    expect(briefs(a, b)).toEqual(["bar-changed Chorus#2/l1/b1 Chorus#2/l1/b1"]);
  });

  test("one more section of a name: the new one is found by content", () => {
    const a = song("## Chorus\n| G | A |\n## Verse\n| D |\n## Chorus\n");
    const b = song("## Chorus\n| G | A |\n## Verse\n| D |\n## Chorus\n| E |\n## Chorus\n");
    expect(briefs(a, b)).toEqual(["section-added - Chorus#2"]);
  });

  test("an empty section that reuses another stays empty: the document is compared", () => {
    const a = song("## Chorus\n| G | A |\n## Verse\n| D |\n## Chorus\n");
    const b = song("## Chorus\n| G | E |\n## Verse\n| D |\n## Chorus\n");
    expect(briefs(a, b)).toEqual(["bar-changed Chorus#1/l1/b2 Chorus#1/l1/b2"]);
  });

  test("a renamed section with the same bars", () => {
    const diff = diffSongs(form("Intro", "Verse"), song("## Вступ\n| D |\n## Verse\n| A |\n"));
    expect(diff.changes.map(brief)).toEqual(["section-renamed Intro#1 Вступ#1"]);
  });

  test("a renamed section of the same kind between the same neighbours, edited too", () => {
    const a = song("## Intro\n| D |\n## Verse 1\n| A | G |\n## Chorus\n| G |\n");
    const b = song("## Intro\n| D |\n## 1 Verse\n| A | E |\n## Chorus\n| G |\n");
    expect(briefs(a, b)).toEqual([
      "section-renamed Verse 1#1 1 Verse#1",
      "bar-changed Verse 1#1/l1/b2 1 Verse#1/l1/b2",
    ]);
  });

  test("an unrelated section in place of another is removed and added", () => {
    const a = song("## Intro\n| D |\n## Bridge\n| A | G |\n");
    const b = song("## Intro\n| D |\n## Chorus\n| E | C |\n");
    expect(briefs(a, b)).toEqual(["section-removed Bridge#1 -", "section-added - Chorus#1"]);
  });

  test("a moved section", () => {
    const a = form("Intro", "Verse", "Chorus", "Bridge");
    const b = song("## Intro\n| D |\n## Bridge\n| Em |\n## Verse\n| A |\n## Chorus\n| G |\n");
    expect(briefs(a, b)).toEqual(["section-moved Bridge#1 Bridge#1"]);
  });

  test("repeat, tag, reference and case of the name", () => {
    const a = song(
      "## Intro x2\n| D |\n## Bridge [dip] x4\n| G |\n## Outro = Intro\n## chorus\n| A |\n",
    );
    const b = song(
      "## Intro\n| D |\n## Bridge [яма] x2\n| G |\n## Outro = Bridge\n## Chorus\n| A |\n",
    );
    const diff = diffSongs(a, b);
    expect(diff.changes.map(brief)).toEqual([
      "section-repeat Intro#1 Intro#1",
      "section-repeat Bridge#1 Bridge#1",
      "section-tag Bridge#1 Bridge#1",
      "section-ref Outro#1 Outro#1",
      "section-renamed chorus#1 Chorus#1",
    ]);
    const repeat = diff.changes[1];
    expect(
      repeat?.kind === "section-repeat" && [repeat.before?.repeat, repeat.after?.repeat],
    ).toEqual([4, 2]);
  });
});

describe("diffSongs: bar lines and bars", () => {
  test("inserting one bar marks only that bar", () => {
    const diff = diffSongs(
      song("## V\n| D | A | G | A |\n"),
      song("## V\n| D | Hm | A | G | A |\n"),
    );
    expect(diff.changes.map(brief)).toEqual(["bar-added - V#1/l1/b2"]);
    const change = diff.changes[0];
    if (change?.kind !== "bar-added") throw new Error("expected a bar");
    expect(change.after?.value.cells[0]?.text).toBe("Hm");
    expect(change.after?.value.span.start.column).toBeGreaterThan(1);
  });

  test("a changed chord is one changed bar, with old and new bar", () => {
    const a = song("## Verse 1\n| D | A |\n| D | A | D/F#** G** | Asus4* A*** |\n");
    const b = song("## Verse 1\n| D | A |\n| D | A | Dsus4/F#** G** | Asus4* A*** |\n");
    const diff = diffSongs(a, b);
    expect(diff.changes.map(brief)).toEqual(["bar-changed Verse 1#1/l2/b3 Verse 1#1/l2/b3"]);
    const change = diff.changes[0];
    if (change?.kind !== "bar-changed") throw new Error("expected a bar");
    expect(change.before?.value.cells.map((c) => c.text)).toEqual(["D/F#", "G"]);
    expect(change.after?.value.cells.map((c) => c.text)).toEqual(["Dsus4/F#", "G"]);
  });

  test("removed bar, changed durations, empty and repeat bars", () => {
    const a = song("## V\n| D | | A** G** | E*** G* |\n");
    const b = song("## V\n| D | % | E** G** |\n");
    expect(briefs(a, b)).toEqual([
      "bar-changed V#1/l1/b2 V#1/l1/b2",
      "bar-removed V#1/l1/b3 -",
      "bar-changed V#1/l1/b4 V#1/l1/b3",
    ]);
  });

  test("added and removed bar lines", () => {
    const a = song("## V\n| D | A |\n| G | A |\n");
    const b = song("## V\n| D | A |\n| Em | Hm |\n| G | A |\n");
    expect(briefs(a, b)).toEqual(["line-added - V#1/l2"]);
    expect(briefs(b, a)).toEqual(["line-removed V#1/l2 -"]);
  });

  test("a changed line is paired with the most similar one", () => {
    const a = song("## V\n| D | A |\n| G | A | D | D |\n");
    const b = song("## V\n| E | C |\n| G | A | D | E |\n");
    expect(briefs(a, b)).toEqual([
      "bar-changed V#1/l1/b1 V#1/l1/b1",
      "bar-changed V#1/l1/b2 V#1/l1/b2",
      "bar-changed V#1/l2/b4 V#1/l2/b4",
    ]);
    // One line fewer: the remaining line is matched with its look-alike.
    expect(briefs(a, song("## V\n| G | A | D | E |\n"))).toEqual([
      "line-removed V#1/l1 -",
      "bar-changed V#1/l2/b4 V#1/l1/b4",
    ]);
  });

  test("label, cue and repeat of a line", () => {
    const a = song("## V\n| D | A | (2x)\nIntro | G | quiet\n");
    const b = song("## V\n| D | A | x3\nOutro | G | loud\n");
    expect(briefs(a, b)).toEqual([
      "line-repeat V#1/l1 V#1/l1",
      "line-label V#1/l2 V#1/l2",
      "line-cue V#1/l2 V#1/l2",
    ]);
  });

  test("instrument lines are compared separately from the base", () => {
    const a = song("## V\n| D | A |\n@bass | D | A |\n@keys | D | A |\n");
    const b = song("## V\n| D | A |\n@keys | D | A |\n@bass | F# | A |\n");
    const diff = diffSongs(a, b);
    expect(diff.changes.map(brief)).toEqual(["@bass bar-changed V#1/l1/b1 V#1/l1/b1"]);
  });

  test("an instrument part added to a section", () => {
    expect(briefs(song("## V\n| D | A |\n"), song("## V\n| D | A |\n@bass | F# | A |\n"))).toEqual([
      "@bass line-added - V#1/l1",
    ]);
  });
});

describe("diffSongs: notes and lyrics", () => {
  test("band notes, instrument cues and lyrics", () => {
    const a = song(
      "> intro: pads\n## V\n| D |\n> first time quiet\n@keys > pads\nla la\nsecond line\n",
    );
    const b = song(
      "## V\n| D |\n> first time  quiet\n@keys > organ\n@drums > rim\nla la la\nsecond line\nthird line\n",
    );
    expect(briefs(a, b)).toEqual([
      "note-removed header/l1 -",
      "@keys note-changed V#1/l1 V#1/l1",
      "@drums note-added - V#1/l1",
      "lyrics-changed V#1/l1 V#1/l1",
      "lyrics-added - V#1/l3",
    ]);
  });
});

describe("diffSongs: summary and robustness", () => {
  test("the summary counts each group", () => {
    const a = "# T\nkey: D\n## V\n| D | A |\n> x\n";
    const b = "# T\nkey: E\n## V\n| D | E |\n| G |\n> y\nla\n## C\n| G |\n";
    expect(diffSongs(a, b).summary).toEqual({
      total: 6,
      header: 1,
      forms: 0,
      sections: 1,
      lines: 1,
      bars: 1,
      notes: 1,
      lyrics: 1,
    });
  });

  test("half-written text still gives a result", () => {
    const diff = diffSongs("# T\n## V\n| D | A |\n", "# T\n## V\n| D | A\n## \n|||");
    expect(diff.summary.total).toBeGreaterThan(0);
    expect(diffSongs("", "# T").changes.map(brief)).toEqual(["title - → T"]);
  });

  test("the result is plain JSON", () => {
    const diff = diffSongs(WORTHY, WORTHY.replace("| G | Em |", "| G | C |"));
    expect(JSON.parse(JSON.stringify(diff))).toEqual(diff);
  });
});

describe("diffSongs: properties", () => {
  const chord = fc.constantFrom("D", "A", "G", "Em", "Hm", "F#m", "D/F#", "Asus4", "%", "", "N.C.");
  const bar = fc.oneof(
    chord,
    fc.tuple(chord, chord).map(([x, y]) => `${x}** ${y}**`.replace(/^\*\* | \*\*$/g, "")),
  );
  const line = fc.array(bar, { minLength: 1, maxLength: 6 });
  const section = fc.record({
    name: fc.constantFrom("Intro", "Verse 1", "Verse 2", "Chorus", "Bridge", "Tag", "Приспів"),
    lines: fc.array(line, { maxLength: 3 }),
  });
  const songs = fc.array(section, { maxLength: 6 });
  const write = (sections: { name: string; lines: string[][] }[], pad = "") =>
    `# T\nkey: D\n\n${sections
      .map(
        (s) =>
          `## ${s.name}\n${s.lines.map((l) => `|${l.map((b) => `${pad} ${b} ${pad}`).join("|")}|`).join("\n")}`,
      )
      .join("\n\n")}\n`;

  test("never throws, and a text has no changes against itself", () => {
    fc.assert(
      fc.property(
        fc.string({ unit: "grapheme", maxLength: 200 }),
        fc.string({ maxLength: 200 }),
        (a, b) => {
          diffSongs(a, b);
          expect(diffSongs(a, a).changes).toEqual([]);
        },
      ),
    );
  });

  test("reformatting is never a change", () => {
    fc.assert(
      fc.property(songs, (sections) => {
        const diff = diffSongs(write(sections), write(sections, "   "));
        expect(diff.changes).toEqual([]);
      }),
    );
  });

  test("inserting one bar is exactly one added bar, wherever it goes", () => {
    fc.assert(
      fc.property(songs, bar, fc.nat(), fc.nat(), fc.nat(), (sections, added, s, l, b) => {
        const withLines = sections.filter((x) => x.lines.length > 0);
        fc.pre(withLines.length > 0);
        const target = withLines[s % withLines.length] as { name: string; lines: string[][] };
        const lineIndex = l % target.lines.length;
        const old = target.lines[lineIndex] as string[];
        const barIndex = b % (old.length + 1);
        const changed = sections.map((x) =>
          x !== target
            ? x
            : {
                ...x,
                lines: x.lines.map((y, i) =>
                  i === lineIndex ? [...y.slice(0, barIndex), added, ...y.slice(barIndex)] : y,
                ),
              },
        );
        const diff = diffSongs(write(sections), write(changed));
        expect(diff.changes.map((c) => c.kind)).toEqual(["bar-added"]);
        expect(diffSongs(write(changed), write(sections)).changes.map((c) => c.kind)).toEqual([
          "bar-removed",
        ]);
      }),
    );
  });

  test("adding a section with a new name is exactly one change", () => {
    fc.assert(
      fc.property(songs, fc.nat(), line, (sections, at, bars) => {
        const index = at % (sections.length + 1);
        const changed = [
          ...sections.slice(0, index),
          { name: "Interlude", lines: [bars] },
          ...sections.slice(index),
        ];
        const diff = diffSongs(write(sections), write(changed));
        expect(diff.changes.map(brief)).toEqual(["section-added - Interlude#1"]);
      }),
    );
  });

  test("swapping the arguments swaps added and removed", () => {
    fc.assert(
      fc.property(songs, songs, (x, y) => {
        const forward = diffSongs(write(x), write(y)).summary;
        const backward = diffSongs(write(y), write(x)).summary;
        expect(backward.total).toBe(forward.total);
      }),
    );
  });
});

describe("diffSongs: review follow-ups", () => {
  test("a notation: line that does not change how the file is read is no change", () => {
    expect(briefs("# T\n## V\n| B |\n", "# T\nnotation: B\n## V\n| B |\n")).toEqual([]);
    expect(briefs("# T\n## V\n| H | B |\n", "# T\nnotation: H\n## V\n| H | B |\n")).toEqual([]);
    // The same text with another naming is another chord.
    expect(briefs("# T\nnotation: H\n## V\n| B |\n", "# T\nnotation: B\n## V\n| B |\n")).toEqual([
      "meta notation H → B",
      "bar-changed V#1/l1/b1 V#1/l1/b1",
    ]);
  });

  test("every change names its section pair; header changes have none", () => {
    const a = "# T\nkey: D\n## Intro\n| D |\n## Verse\n| A |\n## Bridge\n| G |\n";
    const b = "# T\nkey: E\n## Intro\n| E |\n## Chorus\n| C |\n## Verse\n| A | A |\n";
    const diff = diffSongs(a, b);
    const grouped = diff.changes.map((change) => {
      const pair = change.sectionPair === null ? null : diff.sections[change.sectionPair];
      return [change.kind, pair ? [pair.before, pair.after] : null];
    });
    expect(grouped).toEqual([
      ["meta", null],
      ["bar-changed", [0, 0]],
      ["section-added", [null, 1]],
      ["bar-added", [1, 2]],
      ["section-removed", [2, null]],
    ]);
  });

  test("large inputs stay fast and bounded", () => {
    const lyrics = (word: string, count: number) =>
      Array.from({ length: count }, (_, i) => `${word} ${i}`).join("\n");
    const started = performance.now();
    const diff = diffSongs(
      `# T\n## V\n${lyrics("a", 1500)}\n`,
      `# T\n## V\n${lyrics("b", 1500)}\n`,
    );
    expect(diff.summary.lyrics).toBe(3000);
    const bars = (chord: string) => `| ${Array.from({ length: 300 }, () => chord).join(" | ")} |`;
    const lines = (chord: string) => Array.from({ length: 30 }, () => bars(chord)).join("\n");
    diffSongs(`# T\n## V\n${lines("D")}\n`, `# T\n## V\n${lines("E")}\n`);
    expect(performance.now() - started).toBeLessThan(3000);
  });
});

describe("diffSongs: named versions (form lines)", () => {
  const sections = "## Intro\n| D |\n## Verse 1\n| A |\n## Chorus\n| G |\n## Bridge\n| Em |\n";
  const withForms = (...forms: string[]) => `# T\n${forms.join("\n")}\n\n${sections}`;

  test("a form added, removed, changed and renamed", () => {
    expect(briefs(withForms(), withForms("form short: Intro, Chorus"))).toEqual([
      "form-added - header",
    ]);
    expect(briefs(withForms("form short: Intro, Chorus"), withForms())).toEqual([
      "form-removed header -",
    ]);
    expect(
      briefs(withForms("form short: Intro, Chorus"), withForms("form short: Intro, Chorus x2")),
    ).toEqual(["form-changed header header"]);
    expect(
      briefs(withForms("form short: Intro, Chorus"), withForms("form коротка: Intro, Chorus")),
    ).toEqual(["form-renamed header header"]);
    const diff = diffSongs(withForms("form a: Intro"), withForms("form b: Bridge"));
    expect(diff.changes.map((c) => c.kind)).toEqual(["form-removed", "form-added"]);
    expect(diff.summary.forms).toBe(2);
  });

  test("spelling of a form is no change; renaming a section it names is no form change", () => {
    expect(
      briefs(withForms("form Short: intro,chorus"), withForms("FORM  Short :  Intro , Chorus")),
    ).toEqual([]);
    const renamed = withForms("form short: Intro, Refrain").replace("## Chorus", "## Refrain");
    expect(briefs(withForms("form short: Intro, Chorus"), renamed)).toEqual([
      "section-renamed Chorus#1 Refrain#1",
    ]);
  });
});

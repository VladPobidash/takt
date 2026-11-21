import { describe, expect, test } from "vitest";
import { formatKey } from "../src/index.ts";
import { parse } from "../src/parse.ts";
import { resolveSong, sectionType } from "../src/resolve.ts";
import type { ResolvedLine, ResolvedSong } from "../src/types.ts";
import { exampleSong, WORTHY } from "./fixtures.ts";

const song = (text: string, instrument: string | null = null): ResolvedSong =>
  resolveSong(parse(text).doc, { instrument });
const chords = (line: ResolvedLine | undefined) =>
  (line?.bars ?? []).map(
    (bar) => bar.cells.map((cell) => cell.text).join(" ") || (bar.kind === "repeat" ? "%" : "-"),
  );

describe("the example from docs/format.md", () => {
  const harmony = song(WORTHY);

  test("header values are typed", () => {
    expect(harmony.title).toBe("Достойний Ти Один");
    expect(harmony.artist).toBe("Elevation Worship — Worthy");
    expect(harmony.key && formatKey(harmony.key, "H")).toBe("D");
    expect(harmony).toMatchObject({
      tempo: 135,
      capo: null,
      time: { beats: 4, unit: 4 },
      notation: "H",
    });
  });

  test("section types and abbreviations as on the accepted song screen", () => {
    expect(harmony.sections.map((s) => [s.abbr, s.type])).toEqual([
      ["I", "intro"],
      ["V1", "verse"],
      ["C", "chorus"],
      ["I", "interlude"],
      ["V2", "verse"],
      ["C2", "chorus"],
      ["B", "bridge"],
    ]);
  });

  test("a reference and an empty section with a known name reuse the bars", () => {
    const [intro, , chorus, interlude, , chorus2] = harmony.sections;
    expect(interlude?.reusedFrom).toBe(0);
    expect(interlude?.lines.map(chords)).toEqual(intro?.lines.map(chords));
    expect(chorus2?.reusedFrom).toBe(2);
    expect(chorus2?.lines.map(chords)).toEqual(chorus?.lines.map(chords));
    expect(intro?.reusedFrom).toBeNull();
  });

  test("a reusing section also takes the repeat unless it writes its own", () => {
    expect(harmony.sections.map((s) => s.repeat)).toEqual([2, 1, 1, 2, 2, 1, 4]);
    const once = song("# T\n## Intro x2\n| D |\n## Interlude = Intro x1\n");
    expect(once.sections[1]?.repeat).toBe(1);
  });

  test("the form: bars and repeats per section", () => {
    expect(harmony.form.map((f) => `${f.abbr} ${f.bars}×${f.repeat}`)).toEqual([
      "I 2×2",
      "V1 9×1",
      "C 7×1",
      "I 2×2",
      "V2 4×2",
      "C2 7×1",
      "B 4×4",
    ]);
    expect(harmony.form.map((f) => f.section)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test("instruments that have lines in the file", () => {
    expect(harmony.instruments).toEqual(["bass", "keys", "drums"]);
  });

  test("the harmony view shows base lines and band notes only", () => {
    const verse = harmony.sections[1];
    expect(verse?.lines.map((l) => l.source)).toEqual(["base", "base"]);
    expect(verse?.notes).toEqual([
      { text: "first line — keys only", instrument: null, instrumentName: null },
    ]);
    expect(harmony.sections[2]?.notes).toEqual([]);
  });

  test("the bass view replaces the base line with the same ordinal number", () => {
    const verse = song(WORTHY, "bass").sections[1];
    expect(verse?.lines.map((l) => l.source)).toEqual(["part", "base"]);
    expect(chords(verse?.lines[0])).toEqual(["D", "A", "F# G", "A"]);
    expect(chords(verse?.lines[1])).toEqual(["D", "A", "D/F# G", "Asus4 A", "A"]);
  });

  test("instrument cues are visible only to that instrument", () => {
    expect(song(WORTHY, "keys").sections[2]?.notes).toEqual([
      { text: "right hand: melody an octave up", instrument: "keys", instrumentName: "keys" },
    ]);
    expect(song(WORTHY, "drums").sections[6]?.notes[0]?.instrumentName).toBe("cajon");
    expect(song(WORTHY, "guitar").sections[6]?.notes).toEqual([]);
  });
});

describe("examples/silent-night.takt", () => {
  const text = exampleSong("silent-night.takt");

  test("header: B flat written in H-notation, 6/8, capo 3", () => {
    const harmony = song(text);
    expect(harmony.key).toEqual({ tonic: { letter: "B", accidental: -1 }, minor: false });
    expect(harmony).toMatchObject({
      tempo: 44,
      capo: 3,
      time: { beats: 6, unit: 8 },
      notation: "H",
    });
  });

  test("form", () => {
    expect(song(text).form.map((f) => `${f.abbr} ${f.bars}×${f.repeat}`)).toEqual([
      "I 4×1",
      "V1 12×1",
      "V2 12×1",
      "I 4×1",
      "V3 12×1",
      "O 2×2",
    ]);
  });

  test("keys have their own bars in the verses, also where the verse is reused", () => {
    const keys = song(text, "keys");
    expect(keys.sections[1]?.lines.map((l) => l.source)).toEqual(["part", "part", "part"]);
    expect(chords(keys.sections[1]?.lines[1])).toEqual(["Eb", "B/D", "Eb", "B/D"]);
    expect(chords(keys.sections[2]?.lines[1])).toEqual(["Eb", "B/D", "Eb", "B/D"]);
    expect(keys.sections[4]?.lines.map((l) => l.source)).toEqual(["base", "base", "base"]);
  });

  test("the guitar reads the base bars; notes and lyrics stay with their own section", () => {
    const guitar = song(text, "guitar");
    expect(chords(guitar.sections[1]?.lines[0])).toEqual(["B", "-", "F7", "B"]);
    expect(guitar.sections[0]?.notes.map((n) => n.instrument)).toEqual(["guitar"]);
    expect(guitar.sections[1]?.lyrics).toHaveLength(6);
    expect(guitar.sections[2]?.lyrics).toEqual([]);
    expect(guitar.sections[2]?.notes).toEqual([]);
    expect(song(text, "drums").sections[2]?.notes.map((n) => n.text)).toEqual([
      "brushes, start here",
    ]);
  });

  test("a line's cue and the section tag come through", () => {
    const verse3 = song(text).sections[4];
    expect(verse3?.tag).toBe("quiet");
    expect(verse3?.lines[2]?.cue).toBe("rit.");
  });
});

describe("parts", () => {
  test("a reusing section may override the part again", () => {
    const text =
      "# T\n## Verse 1\n| D | A |\n| G | A |\n@bass | D | C# |\n## Verse 2 = Verse 1\n@bass | D | E |\n";
    const bass = song(text, "bass");
    expect(chords(bass.sections[0]?.lines[0])).toEqual(["D", "C#"]);
    expect(chords(bass.sections[1]?.lines[0])).toEqual(["D", "E"]);
    expect(chords(bass.sections[1]?.lines[1])).toEqual(["G", "A"]);
  });

  test("a line repeat counts in the section's bars", () => {
    expect(song("# T\n## A\n| D | A | (2x)\n| G |\n").sections[0]?.bars).toBe(5);
  });
});

describe("examples/vdiachnist.takt", () => {
  const text = exampleSong("vdiachnist.takt");

  test("section names as the band writes them get their types and labels", () => {
    const harmony = song(text);
    expect(harmony.sections.map((s) => `${s.abbr}:${s.type}`)).toEqual([
      "I:intro",
      "V1,2:verse",
      "C:chorus",
      "I:interlude",
      "V3:verse",
      "C2:chorus",
      "I:interlude",
      "B1:bridge",
      "B2:bridge",
      "B3:bridge",
      "Inst:instrumental",
      "C3:chorus",
    ]);
    expect(harmony.form.map((f) => `${f.bars}×${f.repeat}`)).toEqual([
      "2×1",
      "8×2",
      "8×2",
      "2×1",
      "8×1",
      "8×2",
      "4×1",
      "8×1",
      "8×1",
      "8×1",
      "5×1",
      "9×1",
    ]);
  });

  test("F sharp in 6/8 with a capo on the fourth fret", () => {
    const harmony = song(text);
    expect(harmony.key && formatKey(harmony.key, "H")).toBe("F#");
    expect(harmony).toMatchObject({
      tempo: 78,
      capo: 4,
      time: { beats: 6, unit: 8 },
      notation: "H",
    });
  });
});

describe("examples/bozhe-ia-vdiachnyi-tobi.takt", () => {
  const harmony = song(exampleSong("bozhe-ia-vdiachnyi-tobi.takt"));
  const byName = (name: string) => harmony.sections.find((s) => s.name === name);

  test("an empty Verse 2 plays the bars of the verse before it, an empty Chorus 2 those of the chorus", () => {
    expect(harmony.sections.map((s) => `${s.abbr}:${s.bars}×${s.repeat}`)).toEqual([
      "I:3×1",
      "V1:12×1",
      "C:10×1",
      "I:1×1",
      "V2:12×1",
      "C2:10×2",
      "Inst:6×1",
      "B:14×2",
      "C3:10×2",
    ]);
    expect(byName("Verse 2")?.reusedFrom).toBe(1);
    expect(byName("Chorus 2")?.reusedFrom).toBe(2);
    expect(byName("Verse 2")?.lines.map(chords)).toEqual(byName("1 Verse")?.lines.map(chords));
  });

  test("the chorus: three beats of D and Dmaj on the fourth, then a bar that holds it", () => {
    const first = byName("Chorus")?.lines[0];
    expect(first?.bars[0]?.cells.map((c) => [c.text, c.beats])).toEqual([
      ["D", 3],
      ["Dmaj", 1],
    ]);
    expect(first?.bars[1]?.kind).toBe("empty");
    expect(chords(first)).toEqual(["D Dmaj", "-", "A G", "-", "A G"]);
  });

  test("a bar of silence is a bar: the pause counts in the form", () => {
    const pause = harmony.sections[3];
    expect(pause?.lines[0]?.bars[0]?.cells[0]?.kind).toBe("no-chord");
    expect(pause?.notes.map((n) => n.text)).toEqual(["пауза на такт"]);
  });
});

describe("reuse by kind of section", () => {
  test("the same name wins over the same kind", () => {
    const text = "# T\n## Chorus\n| D |\n## Chorus 2\n| G | A |\n## Chorus\n## Chorus 3\n";
    const resolved = song(text);
    // "Chorus 3" follows the chorus before it, which itself plays the first one again.
    expect(resolved.sections.map((s) => s.reusedFrom)).toEqual([null, null, 0, 0]);
    expect(resolved.sections.map((s) => s.bars)).toEqual([1, 2, 1, 1]);
  });

  test("a chain of empty sections ends at the one with bars; its repeat is taken unless written", () => {
    const resolved = song("# T\n## 1 Verse x2\n| D | A |\n## Verse 2\n## Verse 3 x1\n");
    expect(resolved.sections.map((s) => [s.reusedFrom, s.bars, s.repeat])).toEqual([
      [null, 2, 2],
      [0, 2, 2],
      [0, 2, 1],
    ]);
  });

  test("nothing is borrowed across kinds, and sections of no known kind reuse only by name", () => {
    const resolved = song("# T\n## Verse\n| D |\n## Chorus\n## Tag\n| G |\n## Tag 2\n");
    expect(resolved.sections.map((s) => s.reusedFrom)).toEqual([null, null, null, null]);
    expect(resolved.sections.map((s) => s.bars)).toEqual([1, 0, 1, 0]);
  });

  test("notes written under the reusing section stay its own", () => {
    const resolved = song("# T\n## 1 Verse\n| D |\n> all in\n## Verse 2\n> voices only\n");
    expect(resolved.sections[1]?.notes.map((n) => n.text)).toEqual(["voices only"]);
    expect(resolved.sections[1]?.bars).toBe(1);
  });
});

describe("section types", () => {
  test("English and Ukrainian names", () => {
    const table: [string, string][] = [
      ["Intro", "intro"],
      ["Вступ", "intro"],
      ["Verse 2", "verse"],
      ["Куплет 1", "verse"],
      ["Pre-Chorus", "pre-chorus"],
      ["Prechorus", "pre-chorus"],
      ["Передприспів", "pre-chorus"],
      ["Chorus", "chorus"],
      ["Приспів", "chorus"],
      ["Bridge", "bridge"],
      ["Брідж", "bridge"],
      ["Interlude", "interlude"],
      ["Програш", "interlude"],
      ["Instrumental", "instrumental"],
      ["Solo", "instrumental"],
      ["Outro", "outro"],
      ["Кінцівка", "outro"],
      // The band writes the number first, and "Interludio".
      ["3 Verse", "verse"],
      ["1, 2 Verse", "verse"],
      ["1 Bridge", "bridge"],
      ["2. Приспів", "chorus"],
      ["Interludio", "interlude"],
      ["Tag", "other"],
      ["", "other"],
    ];
    for (const [name, type] of table) expect(sectionType(name), name).toBe(type);
  });

  test("abbreviations: a number written first works like one written last", () => {
    const names = [
      "1, 2 Verse",
      "Chorus",
      "3 Verse",
      "Chorus 2",
      "1 Bridge",
      "2 Bridge",
      "Chorus 3",
    ];
    const text = `# T\n${names.map((n) => `## ${n}\n| D |\n`).join("")}`;
    expect(song(text).sections.map((s) => s.abbr)).toEqual([
      "V1,2",
      "C",
      "V3",
      "C2",
      "B1",
      "B2",
      "C3",
    ]);
  });

  test("abbreviations: explicit numbers win, unnumbered repeats are counted", () => {
    const names = [
      "Verse",
      "Pre-chorus",
      "Chorus",
      "Verse",
      "Chorus",
      "Instrumental",
      "Bridge",
      "Chorus 5",
      "Chorus",
      "Turnaround",
      "Outro",
    ];
    const text = `# T\n${names.map((n) => `## ${n}\n| D |\n`).join("")}`;
    expect(song(text).sections.map((s) => s.abbr)).toEqual([
      "V",
      "P",
      "C",
      "V2",
      "C2",
      "Inst",
      "B",
      "C5",
      "C4",
      "Turn",
      "O",
    ]);
  });
});

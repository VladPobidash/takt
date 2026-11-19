import { type Chord, parse, parseChord, resolveSong } from "@takt/format";
import { describe, expect, test } from "vitest";
import { capoLabel, displayChord, keyLabel, songDisplay } from "./view.ts";

const song = (key: string, notation: "H" | "B" = "H") =>
  resolveSong(parse(`# T\nkey: ${key}\nnotation: ${notation}\n## A\n| D |\n`).doc);
const chord = (text: string, notation: "H" | "B" = "H"): Chord => {
  const parsed = parseChord(text, notation);
  if (!parsed) throw new Error(text);
  return parsed;
};
const flat = (c: { root: string; quality: string; bass: string | null } | null) =>
  c ? c.root + c.quality + (c.bass ? `/${c.bass}` : "") : null;

describe("displayChord", () => {
  test("no capo, no transposition: the chord as written, in the chosen naming", () => {
    const display = songDisplay(song("D"), { notation: "H", transpose: 0, capo: 0 });
    expect(displayChord(chord("Hm"), display)).toEqual({
      main: { root: "H", quality: "m", bass: null },
      sounding: null,
    });
    const english = songDisplay(song("D"), { notation: "B", transpose: 0, capo: 0 });
    expect(flat(displayChord(chord("Hm"), english).main)).toBe("Bm");
  });

  test("capo 2 in D: C shapes large, sounding chords small — as on the accepted guitar screen", () => {
    const display = songDisplay(song("D"), { notation: "H", transpose: 0, capo: 2 });
    const pairs = ["Hm", "D", "G", "A", "D/F#", "Asus4"].map((text) => {
      const shown = displayChord(chord(text), display);
      return `${flat(shown.main)} ${flat(shown.sounding)}`;
    });
    expect(pairs).toEqual(["Am Hm", "C D", "F G", "G A", "C/E D/F#", "Gsus4 Asus4"]);
    expect(capoLabel(2, display.shapeKey, "H")).toBe("2→C");
  });

  test("B flat with capo 3: keys read B, Eb, B/D — the guitar reads G, C, G/H", () => {
    const display = songDisplay(song("B"), { notation: "H", transpose: 0, capo: 3 });
    const shapes = ["B", "Eb", "F7", "B/D"].map((text) =>
      flat(displayChord(chord(text), display).main),
    );
    expect(shapes).toEqual(["G", "C", "D7", "G/H"]);
    expect(display.capoSuggestions.map((s) => capoLabel(s.capo, s.shapeKey, "H"))).toEqual([
      "1→A",
      "3→G",
      "6→E",
    ]);
  });

  test("transposition moves the sounding key and picks its accidentals", () => {
    const display = songDisplay(song("D"), { notation: "B", transpose: 1, capo: 0 });
    expect(keyLabel(display.soundingKey, "B")).toBe("Eb");
    expect(flat(displayChord(chord("A"), display).main)).toBe("Bb");
    expect(flat(displayChord(chord("A"), { ...display, notation: "H" }).main)).toBe("B");
  });

  test("a song without a key still shows chords", () => {
    const keyless = resolveSong(parse("# T\n## A\n| D |\n").doc);
    const display = songDisplay(keyless, { notation: "B", transpose: 2, capo: 0 });
    expect(keyLabel(display.soundingKey, "B")).toBe("—");
    expect(display.capoSuggestions).toEqual([]);
    expect(flat(displayChord(chord("D", "B"), display).main)).toBe("E");
  });
});

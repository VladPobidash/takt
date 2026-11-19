import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { formatChord, parseChord, semitone } from "../src/chord.ts";
import {
  capoShape,
  formatKey,
  parseKey,
  prefersFlats,
  suggestCapos,
  transposeChord,
  transposeKey,
} from "../src/transpose.ts";
import type { Chord, Key } from "../src/types.ts";

const chord = (text: string): Chord => {
  const parsed = parseChord(text, "B");
  if (!parsed) throw new Error(`not a chord: ${text}`);
  return parsed;
};
const key = (text: string): Key => {
  const parsed = parseKey(text, "B");
  if (!parsed) throw new Error(`not a key: ${text}`);
  return parsed;
};
const show = (c: Chord) => formatChord(c, { notation: "B" });

describe("keys", () => {
  test("parseKey reads major and minor keys in both namings", () => {
    expect(parseKey("D", "B")).toEqual({ tonic: { letter: "D", accidental: 0 }, minor: false });
    expect(parseKey("Hm", "H")).toEqual({ tonic: { letter: "B", accidental: 0 }, minor: true });
    expect(parseKey("B", "H")).toEqual({ tonic: { letter: "B", accidental: -1 }, minor: false });
    expect(parseKey("F#", "B")?.tonic).toEqual({ letter: "F", accidental: 1 });
    expect(parseKey("D major", "B")).toBeNull();
    expect(parseKey("Dsus4", "B")).toBeNull();
  });

  test("formatKey", () => {
    expect(formatKey(key("Bbm"), "H")).toBe("Bm");
    expect(formatKey(key("Bm"), "H")).toBe("Hm");
    expect(formatKey(key("F#"), "B")).toBe("F#");
  });

  test("flats for F, Bb, Eb, Ab, Db, Gb and Dm, Gm, Cm, Fm, Bbm, Ebm", () => {
    for (const k of ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]) {
      expect(prefersFlats(key(k)), k).toBe(true);
    }
    for (const k of ["C", "G", "D", "A", "E", "B", "F#", "Am", "Em", "Bm", "F#m", "C#m", "G#m"]) {
      expect(prefersFlats(key(k)), k).toBe(false);
    }
  });

  test("transposeKey picks the usual spelling of the target key", () => {
    const moved = (k: string, n: number) => formatKey(transposeKey(key(k), n), "B");
    expect(moved("D", 1)).toBe("Eb");
    expect(moved("D", -2)).toBe("C");
    expect(moved("F", 1)).toBe("F#");
    expect(moved("Am", 1)).toBe("Bbm");
    expect(moved("Bm", 1)).toBe("Cm");
    expect(moved("Em", -1)).toBe("Ebm");
    expect(moved("Gb", 0)).toBe("Gb");
    expect(moved("Gb", 12)).toBe("Gb");
  });
});

describe("transposeChord", () => {
  test("moves root and bass, keeps the quality", () => {
    expect(show(transposeChord(chord("D/F#"), 2, { flats: false }))).toBe("E/G#");
    expect(show(transposeChord(chord("Asus4"), -2, { flats: false }))).toBe("Gsus4");
    expect(show(transposeChord(chord("Bm"), 1, { flats: true }))).toBe("Cm");
  });

  test("spells accidentals as asked", () => {
    expect(show(transposeChord(chord("D"), 1, { flats: true }))).toBe("Eb");
    expect(show(transposeChord(chord("D"), 1, { flats: false }))).toBe("D#");
    expect(show(transposeChord(chord("C/E"), -1, { flats: true }))).toBe("B/Eb");
  });

  test("by 0 keeps the spelling as written", () => {
    expect(show(transposeChord(chord("A#m/C#"), 0, { flats: true }))).toBe("A#m/C#");
    expect(show(transposeChord(chord("Gb"), 12, { flats: false }))).toBe("Gb");
  });
});

describe("capo", () => {
  test("shapes are the sounding chords minus the capo", () => {
    const d = key("D");
    const shapes = ["Bm", "D", "G", "A", "D/F#", "Asus4"].map((c) =>
      show(capoShape(chord(c), 2, d)),
    );
    expect(shapes).toEqual(["Am", "C", "F", "G", "C/E", "Gsus4"]);
  });

  test("shapes use the accidentals of the shape key", () => {
    // B flat with capo 3 is played with G shapes; Eb7 becomes C7, Cm becomes Am, Ab becomes F.
    const bb = key("Bb");
    expect(show(capoShape(chord("Eb7"), 3, bb))).toBe("C7");
    expect(show(capoShape(chord("Db"), 3, bb))).toBe("A#");
  });

  test("suggestions: frets 0-7 where the shapes fall into C, G, D, A, E, Am, Em, Dm", () => {
    const list = (k: string) =>
      suggestCapos(key(k)).map((s) => `${s.capo}→${formatKey(s.shapeKey, "B")}`);
    expect(list("D")).toEqual(["0→D", "2→C", "5→A", "7→G"]);
    expect(list("Bb")).toEqual(["1→A", "3→G", "6→E"]);
    expect(list("F#")).toEqual(["2→E", "4→D", "6→C"]);
    expect(list("Bm")).toEqual(["2→Am", "7→Em"]);
    expect(list("E")).toEqual(["0→E", "2→D", "4→C", "7→A"]);
  });
});

describe("laws", () => {
  const letter = fc.constantFrom("C", "D", "E", "F", "G", "A", "B") as fc.Arbitrary<
    Chord["root"]["letter"]
  >;
  const note = fc.record({ letter, accidental: fc.constantFrom(-1, 0, 1) });
  const anyChord: fc.Arbitrary<Chord> = fc.record({
    root: note,
    quality: fc.constantFrom("", "m", "7", "sus4", "maj7", "m7"),
    bass: fc.option(note, { nil: null }),
  });
  const pitches = (c: Chord) => [semitone(c.root), c.bass ? semitone(c.bass) : -1, c.quality];

  test("+n then -n returns the same pitches", () => {
    fc.assert(
      fc.property(anyChord, fc.integer({ min: -24, max: 24 }), fc.boolean(), (c, n, flats) => {
        const back = transposeChord(transposeChord(c, n, { flats }), -n, { flats });
        expect(pitches(back)).toEqual(pitches(c));
      }),
    );
  });

  test("+12 is the identity, including the spelling", () => {
    fc.assert(
      fc.property(anyChord, fc.boolean(), (c, flats) => {
        expect(transposeChord(c, 12, { flats })).toEqual(c);
      }),
    );
  });

  test("transposing by n moves every pitch by n semitones", () => {
    fc.assert(
      fc.property(anyChord, fc.integer({ min: -24, max: 24 }), fc.boolean(), (c, n, flats) => {
        const moved = transposeChord(c, n, { flats });
        expect(semitone(moved.root)).toBe((((semitone(c.root) + n) % 12) + 12) % 12);
      }),
    );
  });
});

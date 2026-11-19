import { describe, expect, test } from "vitest";
import { formatChord, formatNote, parseChord, semitone } from "../src/chord.ts";

describe("parseChord", () => {
  test("root, quality and slash bass", () => {
    expect(parseChord("D/F#", "B")).toEqual({
      root: { letter: "D", accidental: 0 },
      quality: "",
      bass: { letter: "F", accidental: 1 },
    });
    expect(parseChord("Asus4", "B")).toEqual({
      root: { letter: "A", accidental: 0 },
      quality: "sus4",
      bass: null,
    });
    expect(parseChord("F#sus", "B")?.root).toEqual({ letter: "F", accidental: 1 });
    expect(parseChord("C#m", "B")?.quality).toBe("m");
    expect(parseChord("Eb", "B")?.root).toEqual({ letter: "E", accidental: -1 });
    expect(parseChord("F7/C", "B")?.bass).toEqual({ letter: "C", accidental: 0 });
  });

  test("H-notation: H is B natural, B is B flat", () => {
    expect(parseChord("Hm", "H")?.root).toEqual({ letter: "B", accidental: 0 });
    expect(parseChord("B", "H")?.root).toEqual({ letter: "B", accidental: -1 });
    expect(parseChord("Bb", "H")?.root).toEqual({ letter: "B", accidental: -1 });
    expect(parseChord("G/H", "H")?.bass).toEqual({ letter: "B", accidental: 0 });
    expect(parseChord("B/D", "H")?.root).toEqual({ letter: "B", accidental: -1 });
  });

  test("English naming: B is B natural, Bb is B flat, H is still B natural", () => {
    expect(parseChord("B", "B")?.root).toEqual({ letter: "B", accidental: 0 });
    expect(parseChord("Bbm", "B")).toEqual({
      root: { letter: "B", accidental: -1 },
      quality: "m",
      bass: null,
    });
    expect(parseChord("Hm", "B")?.root).toEqual({ letter: "B", accidental: 0 });
  });

  test("qualities musicians write", () => {
    for (const text of [
      "Gmaj7",
      "Am7",
      "Dadd9",
      "Esus2",
      "F#m7b5",
      "Cdim",
      "Gaug",
      "A7sus4",
      "D(add9)",
      "E5",
      "C6/9",
      "Dm7/G",
    ]) {
      expect(parseChord(text, "B"), text).not.toBeNull();
    }
    expect(parseChord("C6/9", "B")).toEqual({
      root: { letter: "C", accidental: 0 },
      quality: "6/9",
      bass: null,
    });
  });

  test("text that is not a chord", () => {
    for (const text of [
      "",
      "stop",
      "Fade",
      "x",
      "1",
      "h",
      "am",
      "Break",
      "%",
      ".",
      "N.C.",
      "D/",
      "/F#",
    ]) {
      expect(parseChord(text, "B"), text).toBeNull();
    }
  });
});

describe("formatChord", () => {
  test("writes back what was read, in the same naming", () => {
    for (const text of [
      "Hm",
      "B",
      "D/F#",
      "Asus4",
      "F#sus",
      "C#m",
      "Eb",
      "F7/C",
      "G/H",
      "B/D",
      "H7",
    ]) {
      const chord = parseChord(text, "H");
      expect(chord && formatChord(chord, { notation: "H" }), text).toBe(text);
    }
    for (const text of ["Bm", "Bb", "B", "Bb/D", "Gm7", "C6/9"]) {
      const chord = parseChord(text, "B");
      expect(chord && formatChord(chord, { notation: "B" }), text).toBe(text);
    }
  });

  test("renames between H-notation and English naming", () => {
    const hm = parseChord("Hm", "H");
    const b = parseChord("B", "H");
    expect(hm && formatChord(hm, { notation: "B" })).toBe("Bm");
    expect(b && formatChord(b, { notation: "B" })).toBe("Bb");
    const bb = parseChord("Bb/D", "B");
    const bNat = parseChord("G/B", "B");
    expect(bb && formatChord(bb, { notation: "H" })).toBe("B/D");
    expect(bNat && formatChord(bNat, { notation: "H" })).toBe("G/H");
  });

  test("formatNote and semitone", () => {
    expect(formatNote({ letter: "B", accidental: 1 }, "H")).toBe("H#");
    expect(semitone({ letter: "C", accidental: 0 })).toBe(0);
    expect(semitone({ letter: "B", accidental: -1 })).toBe(10);
    expect(semitone({ letter: "C", accidental: -1 })).toBe(11);
  });
});

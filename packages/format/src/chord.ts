import type { Chord, Letter, Notation, Note } from "./types.ts";

const NATURAL: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** What may stand between the root and the slash bass: `m`, `sus4`, `maj7`, `7b5`, `(add9)`, `6/9`. */
const QUALITY = /^(?:maj|min|dim|aug|sus|add|omit|alt|no|m|M|\d+(?:\/\d+)?|[#b+\-°ø^Δ(),])*$/;
const ROOT = /^([A-H])([#b♯♭]?)(.*)$/s;
const SLASH_BASS = /^(.*)\/([A-H])([#b♯♭]?)$/s;

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

/** Pitch class of a note: C = 0 … B = 11. */
export function semitone(note: Note): number {
  return mod12(NATURAL[note.letter] + note.accidental);
}

function readNote(letter: string, accidental: string, notation: Notation): Note {
  const shift = accidental === "#" || accidental === "♯" ? 1 : accidental === "" ? 0 : -1;
  if (letter === "H") return { letter: "B", accidental: shift };
  if (letter === "B") {
    // In H-notation a bare B is already B flat; "Bb" is accepted as the same note.
    if (notation === "H") return { letter: "B", accidental: shift === 1 ? 0 : -1 };
    return { letter: "B", accidental: shift };
  }
  return { letter: letter as Letter, accidental: shift };
}

/**
 * Reads one chord token (`Hm`, `D/F#`, `Asus4`). Returns null when the text is not a chord.
 * `notation` decides what a `B` root means; `H` is always B natural.
 */
export function parseChord(text: string, notation: Notation): Chord | null {
  const root = ROOT.exec(text);
  if (!root) return null;
  const [, letter = "", accidental = "", rest = ""] = root;
  let quality = rest;
  let bass: Note | null = null;
  const slash = SLASH_BASS.exec(rest);
  if (slash) {
    const [, before = "", bassLetter = "", bassAccidental = ""] = slash;
    quality = before;
    bass = readNote(bassLetter, bassAccidental, notation);
  }
  if (!QUALITY.test(quality)) return null;
  return { root: readNote(letter, accidental, notation), quality, bass };
}

/** Writes a note name in the given naming, with ASCII accidentals. */
export function formatNote(note: Note, notation: Notation): string {
  let { letter, accidental } = note as { letter: string; accidental: number };
  if (letter === "B" && notation === "H") {
    if (accidental < 0) accidental += 1;
    else letter = "H";
  }
  return letter + (accidental > 0 ? "#".repeat(accidental) : "b".repeat(-accidental));
}

/** Writes a chord back to text in the given naming. */
export function formatChord(chord: Chord, options: { notation: Notation }): string {
  const bass = chord.bass ? `/${formatNote(chord.bass, options.notation)}` : "";
  return formatNote(chord.root, options.notation) + chord.quality + bass;
}

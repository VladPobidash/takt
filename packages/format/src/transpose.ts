import { formatNote, mod12, parseChord, semitone } from "./chord.ts";
import type { Chord, Key, Letter, Notation, Note } from "./types.ts";

const note = (name: string): Note => ({
  letter: name.charAt(0) as Letter,
  accidental: name.endsWith("#") ? 1 : name.endsWith("b") ? -1 : 0,
});
const notes = (names: string): Note[] => names.split(" ").map(note);

const SHARPS = notes("C C# D D# E F F# G G# A A# B");
const FLATS = notes("C Db D Eb E F Gb G Ab A Bb B");
/** The usual name of each major and minor key, by pitch class. */
const MAJOR_KEYS = notes("C Db D Eb E F F# G Ab A Bb B");
const MINOR_KEYS = notes("C C# D Eb E F F# G G# A Bb B");

const FLAT_MAJOR = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb"]);
const FLAT_MINOR = new Set(["D", "G", "C", "F", "Bb", "Eb"]);
const SHAPE_MAJOR = new Set(["C", "G", "D", "A", "E"]);
const SHAPE_MINOR = new Set(["A", "E", "D"]);
const MAX_SUGGESTED_CAPO = 7;

function pick(table: Note[], pitch: number): Note {
  return table[mod12(pitch)] as Note;
}

function transposeNote(n: Note, semitones: number, flats: boolean): Note {
  if (mod12(semitones) === 0) return n;
  return pick(flats ? FLATS : SHARPS, semitone(n) + semitones);
}

/** Reads a key such as `D`, `Hm`, `F#`. Returns null for anything that is not a plain major or minor key. */
export function parseKey(text: string, notation: Notation): Key | null {
  const chord = parseChord(text.trim(), notation);
  if (!chord || chord.bass) return null;
  if (chord.quality !== "" && chord.quality !== "m") return null;
  return { tonic: chord.root, minor: chord.quality === "m" };
}

export function formatKey(key: Key, notation: Notation): string {
  return formatNote(key.tonic, notation) + (key.minor ? "m" : "");
}

/** Flats for F, B♭, E♭, A♭, D♭, G♭ and Dm, Gm, Cm, Fm, B♭m, E♭m; sharps in other keys. */
export function prefersFlats(key: Key): boolean {
  return (key.minor ? FLAT_MINOR : FLAT_MAJOR).has(formatNote(key.tonic, "B"));
}

/** Moves a key by N semitones and gives the target key its usual name. By 0 the key is unchanged. */
export function transposeKey(key: Key, semitones: number): Key {
  if (mod12(semitones) === 0) return key;
  const table = key.minor ? MINOR_KEYS : MAJOR_KEYS;
  return { tonic: pick(table, semitone(key.tonic) + semitones), minor: key.minor };
}

/**
 * Moves a chord by N semitones. `flats` says how to spell accidentals — normally
 * `prefersFlats(targetKey)`. By a multiple of 12 the chord is returned as written.
 */
export function transposeChord(
  chord: Chord,
  semitones: number,
  options: { flats: boolean },
): Chord {
  return {
    root: transposeNote(chord.root, semitones, options.flats),
    quality: chord.quality,
    bass: chord.bass ? transposeNote(chord.bass, semitones, options.flats) : null,
  };
}

/** The shape a guitarist plays with a capo: the sounding chord minus the capo, spelled for the shape key. */
export function capoShape(chord: Chord, capo: number, key: Key | null): Chord {
  const flats = key ? prefersFlats(transposeKey(key, -capo)) : false;
  return transposeChord(chord, -capo, { flats });
}

export interface CapoSuggestion {
  capo: number;
  /** The key the guitarist reads with this capo. */
  shapeKey: Key;
}

/** Capo positions from fret 0 to 7 where the shapes fall into C, G, D, A, E, Am, Em or Dm. */
export function suggestCapos(key: Key): CapoSuggestion[] {
  const suggestions: CapoSuggestion[] = [];
  for (let capo = 0; capo <= MAX_SUGGESTED_CAPO; capo++) {
    const shapeKey = transposeKey(key, -capo);
    const name = formatNote(shapeKey.tonic, "B");
    if ((shapeKey.minor ? SHAPE_MINOR : SHAPE_MAJOR).has(name))
      suggestions.push({ capo, shapeKey });
  }
  return suggestions;
}

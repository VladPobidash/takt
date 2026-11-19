import {
  type CapoSuggestion,
  type Chord,
  capoShape,
  formatKey,
  formatNote,
  type Key,
  type Notation,
  prefersFlats,
  type ResolvedSong,
  suggestCapos,
  transposeChord,
  transposeKey,
} from "@takt/format";

/** A chord split into the parts the design draws at different sizes. */
export interface ChordText {
  root: string;
  quality: string;
  bass: string | null;
}

export function chordText(chord: Chord, notation: Notation): ChordText {
  return {
    root: formatNote(chord.root, notation),
    quality: chord.quality,
    bass: chord.bass ? formatNote(chord.bass, notation) : null,
  };
}

/** How one song is shown right now: transposition, capo and note naming. */
export interface SongDisplay {
  notation: Notation;
  transpose: number;
  /** Capo fret; 0 when there is none or the view is not the guitar's. */
  capo: number;
  /** The key the band hears after transposition. */
  soundingKey: Key | null;
  /** The key the guitarist reads with the capo; null without a capo. */
  shapeKey: Key | null;
  capoSuggestions: CapoSuggestion[];
}

export function songDisplay(
  song: Pick<ResolvedSong, "key">,
  options: { notation: Notation; transpose: number; capo: number },
): SongDisplay {
  const soundingKey = song.key ? transposeKey(song.key, options.transpose) : null;
  return {
    ...options,
    soundingKey,
    shapeKey: soundingKey && options.capo > 0 ? transposeKey(soundingKey, -options.capo) : null,
    capoSuggestions: soundingKey ? suggestCapos(soundingKey) : [],
  };
}

export interface ChordDisplay {
  /** What is drawn large: the capo shape if there is a capo, otherwise the sounding chord. */
  main: ChordText;
  /** The sounding chord, drawn small under a capo shape; null without a capo. */
  sounding: ChordText | null;
}

export function displayChord(chord: Chord, display: SongDisplay): ChordDisplay {
  const flats = display.soundingKey ? prefersFlats(display.soundingKey) : false;
  const sounding = transposeChord(chord, display.transpose, { flats });
  if (display.capo === 0) return { main: chordText(sounding, display.notation), sounding: null };
  const shape = capoShape(sounding, display.capo, display.soundingKey);
  return {
    main: chordText(shape, display.notation),
    sounding: chordText(sounding, display.notation),
  };
}

export function keyLabel(key: Key | null, notation: Notation): string {
  return key ? formatKey(key, notation) : "—";
}

/** `2→C`: a capo position and the key the guitarist then reads. */
export function capoLabel(capo: number, shapeKey: Key | null, notation: Notation): string {
  return shapeKey ? `${capo}→${formatKey(shapeKey, notation)}` : String(capo);
}

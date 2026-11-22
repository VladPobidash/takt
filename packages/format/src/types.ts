import type { VoicePart } from "./instruments.ts";

/** A position in the source text. `line` and `column` are 1-based, `offset` is 0-based. */
export interface Pos {
  offset: number;
  line: number;
  column: number;
}

/** A range of source text: `start` inclusive, `end` exclusive. */
export interface Span {
  start: Pos;
  end: Pos;
}

export type Severity = "error" | "warning" | "info";

export type DiagnosticCode =
  | "missing-title"
  | "unexpected-header-line"
  | "invalid-time"
  | "invalid-tempo"
  | "invalid-capo"
  | "invalid-notation"
  | "invalid-key"
  | "unknown-section-ref"
  | "empty-section"
  | "unknown-chord"
  | "ambiguous-b"
  | "bar-too-long"
  | "bar-short"
  | "mixed-durations"
  | "part-without-base"
  | "part-bar-count"
  | "invalid-setlist-entry";

/**
 * A problem found in the source. The library never throws on bad input; it reports.
 * `code` is stable; the app owns the human-readable texts.
 */
export interface Diagnostic {
  code: DiagnosticCode;
  severity: Severity;
  span: Span;
  data?: Record<string, string | number>;
}

/** Note naming of a file or of the display: `H` (H = B natural, B = B flat) or `B` (English). */
export type Notation = "H" | "B";

export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";

/** A note name in English naming: `{ letter: "B", accidental: -1 }` is B flat. */
export interface Note {
  letter: Letter;
  /** Semitones added to the natural note: -1 flat, 0 natural, 1 sharp. */
  accidental: number;
}

export interface Chord {
  root: Note;
  /** Everything between the root and the slash bass, as written: `m`, `sus4`, `maj7`. */
  quality: string;
  bass: Note | null;
}

export interface Key {
  tonic: Note;
  minor: boolean;
}

export interface TimeSignature {
  /** Upper number: beats per bar. One `*` is one of these beats. */
  beats: number;
  /** Lower number: the note value of one beat. */
  unit: number;
}

export interface Cell {
  kind: "chord" | "no-chord" | "text";
  /** The token as written, without asterisks. */
  text: string;
  chord: Chord | null;
  /** Beat offset inside the bar, from 0. */
  start: number;
  /** Length in beats; may be fractional (`| A E D |` in 4/4). */
  beats: number;
  /** Number of asterisks written after the token, 0 if none. */
  stars: number;
  /** Span of `text` (without asterisks). */
  span: Span;
}

export interface Bar {
  /** `chords`: has cells. `empty`: `| |`, keep the last chord. `repeat`: `| % |`. */
  kind: "chords" | "empty" | "repeat";
  cells: Cell[];
  /** Length of the bar in beats. */
  beats: number;
  /** Span of the text between the two bar lines. */
  span: Span;
}

interface LineBase {
  span: Span;
}

export interface BarsLine extends LineBase {
  kind: "bars";
  /** Normalised instrument id (`guitar`, `bass`, `keys`, `drums`, or the name lowercased), null for the base. */
  instrument: string | null;
  /** The instrument name as written after `@`. */
  instrumentName: string | null;
  /** Text before the first bar line. */
  label: string | null;
  bars: Bar[];
  /** Text after the last bar line, without the repeat. */
  cue: string | null;
  /** Repeat written after the last bar line (`(2x)`), 1 if none. */
  repeat: number;
}

export interface NoteLine extends LineBase {
  kind: "note";
  instrument: string | null;
  instrumentName: string | null;
  text: string;
}

export interface CommentLine extends LineBase {
  kind: "comment";
  text: string;
}

export interface LyricsLine extends LineBase {
  kind: "lyrics";
  text: string;
}

export type Line = BarsLine | NoteLine | CommentLine | LyricsLine;

export interface MetaEntry {
  /** Lowercased key. */
  key: string;
  value: string;
  span: Span;
  valueSpan: Span;
}

export interface Section {
  name: string;
  tag: string | null;
  /** Repeat written in the header (`x2`), null if none. */
  repeat: number | null;
  /** Name of the section referenced with `## A = B`. */
  ref: string | null;
  /** Span of the `##` header line. */
  span: Span;
  lines: Line[];
}

/** The document: a tree that mirrors the file. */
export interface SongDoc {
  title: string | null;
  /** Span of the `# Title` line, null if the file has none. */
  titleSpan: Span | null;
  meta: MetaEntry[];
  /** Notes and comments written in the header, before the first section. */
  headerLines: Line[];
  notation: Notation;
  notationSource: "header" | "inferred" | "default";
  time: TimeSignature;
  sections: Section[];
}

export interface ParseOptions {
  /** Naming used when the file neither declares `notation:` nor contains an `H`. Default `B`. */
  defaultNotation?: Notation;
}

export interface ParseResult {
  doc: SongDoc;
  diagnostics: Diagnostic[];
}

export type SectionType =
  | "intro"
  | "verse"
  | "pre-chorus"
  | "chorus"
  | "bridge"
  | "interlude"
  | "instrumental"
  | "outro"
  | "other";

export interface ResolvedLine {
  bars: Bar[];
  label: string | null;
  cue: string | null;
  repeat: number;
  /** `part`: this line comes from the instrument's own `@instrument` line. */
  source: "base" | "part";
}

export interface ResolvedNote {
  text: string;
  /** Null for a band note; otherwise the instrument the cue is for. */
  instrument: string | null;
  instrumentName: string | null;
}

export interface ResolvedSection {
  /** Index of the section in the document. */
  index: number;
  name: string;
  type: SectionType;
  /** Short label for the form timeline: `V1`, `C2`, `Inst`. */
  abbr: string;
  tag: string | null;
  repeat: number;
  /** Index of the section whose bars are reused, null if the bars are its own. */
  reusedFrom: number | null;
  lines: ResolvedLine[];
  notes: ResolvedNote[];
  lyrics: string[];
  /** Bars played in one pass, line repeats included. */
  bars: number;
}

export interface FormItem {
  /** Index into `ResolvedSong.sections`. */
  section: number;
  type: SectionType;
  abbr: string;
  bars: number;
  repeat: number;
}

/** A song as one instrument sees it. */
export interface ResolvedSong {
  title: string | null;
  artist: string | null;
  link: string | null;
  key: Key | null;
  tempo: number | null;
  capo: number | null;
  time: TimeSignature;
  notation: Notation;
  /** Instruments that have lines of their own in the file, in order of appearance. */
  instruments: string[];
  sections: ResolvedSection[];
  form: FormItem[];
}

export interface ResolveOptions {
  /** Instrument id (`guitar`, `bass`, `keys`, `drums`, `vocals`, …); null or missing for the base harmony. */
  instrument?: string | null;
  /**
   * With `instrument: "vocals"`: the singer's part. The cues for `@vocals` and for this part are
   * kept; null or missing keeps every singer's cue (`@vocals`, `@soprano`, `@alto`, `@tenor`).
   */
  voice?: VoicePart | null;
}

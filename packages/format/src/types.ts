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
  | "unknown-form-section"
  | "duplicate-form"
  | "empty-form"
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

/** One entry of a form line: a section of the file, with an optional repeat. */
export interface FormEntry {
  /** The entry as written: `Bridge x2`, `Chorus #2`. */
  text: string;
  /** Index of the section in `SongDoc.sections`; null when the file has no such section. */
  section: number | null;
  /** Repeat written in the entry, null to keep the section's own. */
  repeat: number | null;
  span: Span;
}

/** A named version of the song (ADR 0013): `form коротка: Intro, Verse 1, Chorus x2`. */
export interface SongForm {
  /** The name as written, spaces collapsed. */
  name: string;
  entries: FormEntry[];
  /** Span of the whole line. */
  span: Span;
  nameSpan: Span;
  /** Span of the list after the colon; empty when nothing is written. */
  listSpan: Span;
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
  /** Named versions, in file order (ADR 0013). */
  forms: SongForm[];
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
  /** Position in `ResolvedSong.sections`: the play order. For the main version it equals `docIndex`. */
  index: number;
  /** Index of the section in the document. A section a version plays twice appears twice. */
  docIndex: number;
  name: string;
  type: SectionType;
  /** Short label for the form timeline: `V1`, `C2`, `Inst`. */
  abbr: string;
  tag: string | null;
  repeat: number;
  /** Index in the document of the section whose bars are reused, null if the bars are its own. */
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
  /** The sections in play order: the file's for the main version, the form's for a named one. */
  sections: ResolvedSection[];
  form: FormItem[];
  /** Names of the song's named versions that have something to play, in file order. */
  forms: string[];
  /** The version resolved, as the file writes its name; null for the main version. */
  formName: string | null;
}

export interface ResolveOptions {
  /** Instrument id (`guitar`, `bass`, `keys`, `drums`, `vocals`, …); null or missing for the base harmony. */
  instrument?: string | null;
  /**
   * With `instrument: "vocals"`: the singer's part. The cues for `@vocals` and for this part are
   * kept; null or missing keeps every singer's cue (`@vocals`, `@soprano`, `@alto`, `@tenor`).
   */
  voice?: VoicePart | null;
  /**
   * Name of a version (`form` line) to resolve, matched without letter case. Null, missing,
   * unknown or a form with nothing to play: the main version.
   */
  form?: string | null;
}

/** A section of one version of the song, as a change refers to it. */
export interface SectionPlace {
  /** Index of the section in `doc.sections`. */
  index: number;
  name: string;
  /**
   * 1 for the first section with this name (case-insensitive), 2 for the second, … — the way a
   * personal note's anchor identifies a section.
   */
  occurrence: number;
  tag: string | null;
  repeat: number | null;
  ref: string | null;
  /** Span of the `##` header line. */
  span: Span;
}

/** A bar line of one version. */
export interface LinePlace {
  section: SectionPlace;
  /** 1-based number among the section's bar lines of the same instrument (or of the base). */
  line: number;
  value: BarsLine;
}

/** A bar of one version: "line 2, bar 3". */
export interface BarPlace {
  section: SectionPlace;
  /** 1-based number among the section's bar lines of the same instrument (or of the base). */
  line: number;
  /** 1-based number of the bar in its line. */
  bar: number;
  value: Bar;
}

/** A note, an instrument cue or a lyrics line of one version. */
export interface TextPlace {
  /** Null for a line written in the header, before the first section. */
  section: SectionPlace | null;
  /** 1-based number among the notes of the same instrument (or band notes, or lyrics lines) there. */
  line: number;
  value: NoteLine | LyricsLine;
}

/** `# Title` changed. */
export interface TitleChange {
  kind: "title";
  before: { value: string | null; span: Span } | null;
  after: { value: string | null; span: Span } | null;
}

/** A `key: value` header line added (`before` null), removed (`after` null) or changed. */
export interface MetaChange {
  kind: "meta";
  /** Lowercased key: `key`, `tempo`, `time`, `capo`, `artist`, `notation`, `link` or any other. */
  key: string;
  before: MetaEntry | null;
  after: MetaEntry | null;
}

export interface SectionChange {
  /**
   * `section-moved`: its place among the other sections changed (`index`).
   * `section-renamed`, `section-repeat`, `section-tag`, `section-ref`: compare `name`, `repeat`,
   * `tag` or `ref` of `before` and `after`.
   */
  kind:
    | "section-added"
    | "section-removed"
    | "section-moved"
    | "section-renamed"
    | "section-repeat"
    | "section-tag"
    | "section-ref";
  /** Null when the section was added. */
  before: SectionPlace | null;
  /** Null when the section was removed. */
  after: SectionPlace | null;
}

export interface LineChange {
  /** `line-label`, `line-cue`, `line-repeat`: compare `label`, `cue` or `repeat` of the two values. */
  kind: "line-added" | "line-removed" | "line-label" | "line-cue" | "line-repeat";
  /** Normalised instrument id of the line, null for the base harmony. */
  instrument: string | null;
  before: LinePlace | null;
  after: LinePlace | null;
}

export interface BarChange {
  kind: "bar-added" | "bar-removed" | "bar-changed";
  /** Normalised instrument id of the line, null for the base harmony. */
  instrument: string | null;
  before: BarPlace | null;
  after: BarPlace | null;
}

export interface TextChange {
  kind:
    | "note-added"
    | "note-removed"
    | "note-changed"
    | "lyrics-added"
    | "lyrics-removed"
    | "lyrics-changed";
  /** For notes: the instrument a cue is for, null for a band note. Always null for lyrics. */
  instrument: string | null;
  before: TextPlace | null;
  after: TextPlace | null;
}

/** What every change has. */
export interface ChangeBase {
  /**
   * Index into `SongDiff.sections` of the section the change belongs to, null for the header.
   * Changes of one section follow each other, so a screen can group them with one loop.
   */
  sectionPair: number | null;
}

export type SongChange = (
  | TitleChange
  | MetaChange
  | SectionChange
  | LineChange
  | BarChange
  | TextChange
) &
  ChangeBase;

export type SongChangeKind = SongChange["kind"];

/** Counts for a label such as "3 changes". */
export interface DiffSummary {
  /** Every change: `changes.length`. */
  total: number;
  /** `title` and `meta`. */
  header: number;
  /** `section-*`. */
  sections: number;
  /** `line-*`. */
  lines: number;
  /** `bar-*`. */
  bars: number;
  /** `note-*`. */
  notes: number;
  /** `lyrics-*`. */
  lyrics: number;
}

/** Which section of the older version is which section of the newer one. */
export interface SectionPair {
  /** Index in `before.sections`, null for an added section. */
  before: number | null;
  /** Index in `after.sections`, null for a removed section. */
  after: number | null;
}

/** What changed between two versions of a song, in musical terms. */
export interface SongDiff {
  /** The two texts are the same byte for byte. No changes and not identical means "only reformatted". */
  identical: boolean;
  /** Changes in the order of the newer version; a removed section comes where it used to be. */
  changes: SongChange[];
  summary: DiffSummary;
  /** Every section of both versions, paired, in the order of `changes`. */
  sections: SectionPair[];
  /**
   * The two documents the places in `changes` refer to. A cell's `text` is as written in its own
   * file: after a change of `notation:`, `| B |` can be the same text and a different chord (B♭,
   * then B). Show chords with `formatChord(cell.chord, { notation })` in the musician's naming.
   */
  before: SongDoc;
  after: SongDoc;
}

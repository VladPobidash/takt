import { readCapo, readNotation, readTempo, readTime } from "./header.ts";
import { parse } from "./parse.ts";
import { sectionType } from "./section-type.ts";
import { parseKey } from "./transpose.ts";
import type {
  Bar,
  BarsLine,
  Chord,
  DiffSummary,
  Line,
  LyricsLine,
  MetaEntry,
  NoteLine,
  ParseOptions,
  Section,
  SectionPair,
  SectionPlace,
  SongChange,
  SongDiff,
  SongDoc,
} from "./types.ts";

// ---------------------------------------------------------------------------------------------
// Alignment of two sequences. Kept generic so that a later three-way merge can reuse it.

/** One step of an alignment: a pair, an item only in `a` (removed) or only in `b` (added). */
export type AlignStep = { a: number; b: number } | { a: number; b: null } | { a: null; b: number };

/**
 * Aligns two sequences the way a musician reads them: with the fewest changes (an item added,
 * removed or changed counts one), so that an inserted item does not shift the ones after it.
 * Among alignments with as few changes, the one with the most equal items wins, then the one
 * whose changed pairs are the most alike by `similarity` (0…1). Paired steps may hold items
 * that are not equal: the caller reports them as changed.
 */
export function align<T>(
  a: readonly T[],
  b: readonly T[],
  equal: (x: T, y: T) => boolean,
  similarity: (x: T, y: T) => number,
): AlignStep[] {
  const n = a.length;
  const m = b.length;
  const width = m + 1;
  // Cost of aligning the suffixes a[i…] and b[j…]: changes, then equal items, then likeness.
  const edits = new Float64Array((n + 1) * width);
  const equals = new Float64Array((n + 1) * width);
  const alike = new Float64Array((n + 1) * width);
  const choice = new Uint8Array((n + 1) * width);
  const PAIR = 0;
  const REMOVE = 1;
  const ADD = 2;
  for (let i = n; i >= 0; i--) {
    for (let j = m; j >= 0; j--) {
      const at = i * width + j;
      if (i === n && j === m) continue;
      let bestEdits = Number.POSITIVE_INFINITY;
      let bestEquals = 0;
      let bestAlike = 0;
      let bestChoice = PAIR;
      const consider = (kind: number, e: number, q: number, s: number) => {
        const better =
          e < bestEdits ||
          (e === bestEdits && (q > bestEquals || (q === bestEquals && s > bestAlike + 1e-9)));
        if (better) {
          bestEdits = e;
          bestEquals = q;
          bestAlike = s;
          bestChoice = kind;
        }
      };
      if (i < n && j < m) {
        const next = (i + 1) * width + j + 1;
        const isEqual = equal(a[i] as T, b[j] as T);
        const likeness = isEqual ? 0 : similarity(a[i] as T, b[j] as T);
        consider(
          PAIR,
          (edits[next] as number) + (isEqual ? 0 : 1),
          (equals[next] as number) + (isEqual ? 1 : 0),
          (alike[next] as number) + likeness,
        );
      }
      if (i < n) {
        const next = (i + 1) * width + j;
        consider(
          REMOVE,
          (edits[next] as number) + 1,
          equals[next] as number,
          alike[next] as number,
        );
      }
      if (j < m) {
        const next = i * width + j + 1;
        consider(ADD, (edits[next] as number) + 1, equals[next] as number, alike[next] as number);
      }
      edits[at] = bestEdits;
      equals[at] = bestEquals;
      alike[at] = bestAlike;
      choice[at] = bestChoice;
    }
  }
  const steps: AlignStep[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    const kind = choice[i * width + j];
    if (kind === PAIR) steps.push({ a: i++, b: j++ });
    else if (kind === REMOVE) steps.push({ a: i++, b: null });
    else steps.push({ a: null, b: j++ });
  }
  return steps;
}

/** Share of the longer of `a` and `b` that is equal in their alignment, 0…1. */
function overlap<T>(a: readonly T[], b: readonly T[], equal: (x: T, y: T) => boolean): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return (
    align(a, b, equal, () => 0).filter(
      (s) => s.a !== null && s.b !== null && equal(a[s.a] as T, b[s.b] as T),
    ).length / longest
  );
}

// ---------------------------------------------------------------------------------------------
// What counts as "the same": canonical keys that ignore spelling.

const collapse = (text: string | null): string => (text ?? "").replace(/\s+/g, " ").trim();
const fraction = (value: number, bar: number): string => (value / bar).toFixed(6);

function chordKey(chord: Chord): string {
  const bass = chord.bass ? `${chord.bass.letter}${chord.bass.accidental}` : "";
  return JSON.stringify([chord.root.letter, chord.root.accidental, chord.quality, bass]);
}

/** A bar's meaning: its kind and its chords with where they fall, as fractions of the bar. */
function barKey(bar: Bar, beatsPerBar: number): string {
  if (bar.kind !== "chords") return bar.kind;
  const cells = bar.cells.map((cell) => {
    const what =
      cell.kind === "chord" && cell.chord
        ? chordKey(cell.chord)
        : cell.kind === "text"
          ? JSON.stringify(cell.text)
          : "nc";
    return `${what}@${fraction(cell.start, beatsPerBar)}+${fraction(cell.beats, beatsPerBar)}`;
  });
  return `${fraction(bar.beats, beatsPerBar)}[${cells.join(" ")}]`;
}

/** The chords of a bar without their timing, to tell how alike two bars are. */
function barChords(bar: Bar): string[] {
  if (bar.kind !== "chords") return [bar.kind];
  return bar.cells.map((cell) =>
    cell.kind === "chord" && cell.chord ? chordKey(cell.chord) : `${cell.kind}:${cell.text}`,
  );
}

/** One version of the song with what the comparison needs from it. */
interface Side {
  doc: SongDoc;
  places: SectionPlace[];
  barKeys: Map<Bar, string>;
}

function makeSide(doc: SongDoc): Side {
  const seen = new Map<string, number>();
  const places = doc.sections.map((section, index): SectionPlace => {
    const name = nameKey(section.name);
    const occurrence = (seen.get(name) ?? 0) + 1;
    seen.set(name, occurrence);
    return {
      index,
      name: section.name,
      occurrence,
      tag: section.tag,
      repeat: section.repeat,
      ref: section.ref,
      span: section.span,
    };
  });
  const barKeys = new Map<Bar, string>();
  for (const section of doc.sections) {
    for (const line of section.lines) {
      if (line.kind !== "bars") continue;
      for (const bar of line.bars) barKeys.set(bar, barKey(bar, doc.time.beats));
    }
  }
  return { doc, places, barKeys };
}

const nameKey = (name: string) => name.trim().toLowerCase();

function lineKey(side: Side, line: BarsLine): string {
  const bars = line.bars.map((bar) => side.barKeys.get(bar) as string);
  return JSON.stringify([collapse(line.label), bars, collapse(line.cue), line.repeat]);
}

/** Everything a section holds except comments, by stream, so that the order of streams does not matter. */
function contentKey(side: Side, section: Section): string {
  const streams = new Map<string, string[]>();
  for (const line of section.lines) {
    let stream: string;
    let key: string;
    if (line.kind === "bars") {
      stream = `bars:${line.instrument ?? ""}`;
      key = lineKey(side, line);
    } else if (line.kind === "note") {
      stream = `note:${line.instrument ?? ""}`;
      key = collapse(line.text);
    } else if (line.kind === "lyrics") {
      stream = "lyrics";
      key = collapse(line.text);
    } else continue;
    const list = streams.get(stream) ?? [];
    list.push(key);
    streams.set(stream, list);
  }
  return JSON.stringify([...streams.entries()].sort(([x], [y]) => (x < y ? -1 : 1)));
}

const hasContent = (section: Section) => section.lines.some((line) => line.kind !== "comment");

function sectionKey(side: Side, section: Section): string {
  return JSON.stringify([section.tag, section.repeat, section.ref, contentKey(side, section)]);
}

function words(text: string): string[] {
  return collapse(text).toLowerCase().split(" ").filter(Boolean);
}

/** Dice coefficient of the words of two texts. */
function textSimilarity(x: string, y: string): number {
  const a = words(x);
  const b = words(y);
  if (a.length + b.length === 0) return 1;
  const pool = new Map<string, number>();
  for (const word of a) pool.set(word, (pool.get(word) ?? 0) + 1);
  let common = 0;
  for (const word of b) {
    const left = pool.get(word) ?? 0;
    if (left > 0) {
      common++;
      pool.set(word, left - 1);
    }
  }
  return (2 * common) / (a.length + b.length);
}

/** The meaning of a header value: typed where the format types it, otherwise the text. */
function metaMeaning(entry: MetaEntry, doc: SongDoc): string {
  const text = collapse(entry.value);
  switch (entry.key) {
    case "key": {
      const key = parseKey(entry.value, doc.notation);
      return key ? `${key.tonic.letter}${key.tonic.accidental}${key.minor ? "m" : ""}` : text;
    }
    case "tempo":
      return String(readTempo(entry.value) ?? text);
    case "capo":
      return String(readCapo(entry.value) ?? text);
    case "time": {
      const time = readTime(entry.value);
      return time ? `${time.beats}/${time.unit}` : text;
    }
    case "notation":
      return readNotation(entry.value) ?? text;
    default:
      return text;
  }
}

// ---------------------------------------------------------------------------------------------
// Matching sections and header entries.

/**
 * Puts paired, removed and added items in the order of the newer version; a removed item comes
 * right after the item that preceded it in the older version.
 */
function inNewOrder(pairs: Map<number, number>, countA: number, countB: number): SectionPair[] {
  const byB = new Map<number, number>();
  for (const [a, b] of pairs) byB.set(b, a);
  const removedAfter = new Map<number, number[]>();
  let previous = -1;
  for (let a = 0; a < countA; a++) {
    if (pairs.has(a)) {
      previous = a;
      continue;
    }
    const list = removedAfter.get(previous) ?? [];
    list.push(a);
    removedAfter.set(previous, list);
  }
  const order: SectionPair[] = [];
  const removed = (after: number) => {
    for (const a of removedAfter.get(after) ?? []) order.push({ before: a, after: null });
  };
  removed(-1);
  for (let b = 0; b < countB; b++) {
    const a = byB.get(b);
    order.push({ before: a ?? null, after: b });
    if (a !== undefined) removed(a);
  }
  return order;
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  items.forEach((item, index) => {
    const k = key(item);
    const list = groups.get(k) ?? [];
    list.push(index);
    groups.set(k, list);
  });
  return groups;
}

/**
 * Pairs the sections of two versions, older index → newer index.
 *
 * 1. By name (case-insensitive) and occurrence, as personal-note anchors do: the second
 *    `Chorus` is the second `Chorus`. When the count of a name differs, its sections are aligned
 *    by content instead, so the one that was added or removed is found.
 * 2. A removed and an added section are one renamed section when their content is the same, or
 *    when they are of the same known type and stand between the same neighbours.
 */
function matchSections(a: Side, b: Side): Map<number, number> {
  const pairs = new Map<number, number>();
  const sectionsA = a.doc.sections;
  const sectionsB = b.doc.sections;
  const keysA = sectionsA.map((s) => sectionKey(a, s));
  const keysB = sectionsB.map((s) => sectionKey(b, s));
  const groupsB = groupBy(sectionsB, (s) => nameKey(s.name));
  for (const [name, listA] of groupBy(sectionsA, (s) => nameKey(s.name))) {
    const listB = groupsB.get(name) ?? [];
    if (listA.length === listB.length) {
      listA.forEach((x, i) => {
        pairs.set(x, listB[i] as number);
      });
      continue;
    }
    const steps = align(
      listA,
      listB,
      (x, y) => keysA[x] === keysB[y],
      (x, y) =>
        overlap(
          linesOf(a, sectionsA[x] as Section),
          linesOf(b, sectionsB[y] as Section),
          (p, q) => p === q,
        ),
    );
    for (const step of steps) {
      if (step.a !== null && step.b !== null)
        pairs.set(listA[step.a] as number, listB[step.b] as number);
    }
  }

  const pairedB = new Set(pairs.values());
  const removed = sectionsA.map((_, i) => i).filter((i) => !pairs.has(i));
  const added = sectionsB.map((_, i) => i).filter((i) => !pairedB.has(i));
  const pair = (x: number, y: number) => {
    pairs.set(x, y);
    pairedB.add(y);
  };

  // Renamed with the same content.
  for (const y of added) {
    const content = contentKey(b, sectionsB[y] as Section);
    if (!hasContent(sectionsB[y] as Section)) continue;
    const x = removed.find(
      (r) => !pairs.has(r) && contentKey(a, sectionsA[r] as Section) === content,
    );
    if (x !== undefined) pair(x, y);
  }

  // Renamed in place: the k-th removed and the k-th added section of one known type that stand
  // after the same matched section. Neighbours are fixed before pairing, so the result does not
  // depend on which version is called older.
  const gapA = (x: number): number => {
    for (let i = x - 1; i >= 0; i--) {
      const partner = pairs.get(i);
      if (partner !== undefined) return partner;
    }
    return -1;
  };
  const gapB = (y: number): number => {
    for (let j = y - 1; j >= 0; j--) if (pairedB.has(j)) return j;
    return -1;
  };
  const slot = (gap: number, name: string) => `${gap}:${sectionType(name)}`;
  const waiting = new Map<string, number[]>();
  for (const x of removed) {
    if (pairs.has(x)) continue;
    const name = (sectionsA[x] as Section).name;
    if (sectionType(name) === "other") continue;
    const key = slot(gapA(x), name);
    waiting.set(key, [...(waiting.get(key) ?? []), x]);
  }
  const candidates = added
    .filter((y) => !pairedB.has(y))
    .map((y) => ({ y, key: slot(gapB(y), (sectionsB[y] as Section).name) }));
  for (const { y, key } of candidates) {
    const x = waiting.get(key)?.shift();
    if (x !== undefined) pair(x, y);
  }
  return pairs;
}

function linesOf(side: Side, section: Section): string[] {
  return section.lines
    .filter((line) => line.kind !== "comment")
    .map((line) => lineText(side, line));
}

function lineText(side: Side, line: Line): string {
  if (line.kind === "bars") return `bars:${line.instrument ?? ""}:${lineKey(side, line)}`;
  if (line.kind === "note") return `note:${line.instrument ?? ""}:${collapse(line.text)}`;
  return `${line.kind}:${collapse(line.text)}`;
}

/** Older indices of the pairs whose order among the others changed: those outside the longest increasing run. */
function movedSections(pairs: Map<number, number>): Set<number> {
  const sorted = [...pairs.entries()].sort(([x], [y]) => x - y);
  const values = sorted.map(([, b]) => b);
  // Longest increasing subsequence, O(n²): a song has a few dozen sections at most.
  const length = values.map(() => 1);
  const previous = values.map(() => -1);
  let bestEnd = -1;
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < i; j++) {
      if (
        (values[j] as number) < (values[i] as number) &&
        (length[j] as number) + 1 > (length[i] as number)
      ) {
        length[i] = (length[j] as number) + 1;
        previous[i] = j;
      }
    }
    if (bestEnd === -1 || (length[i] as number) > (length[bestEnd] as number)) bestEnd = i;
  }
  const kept = new Set<number>();
  for (let i = bestEnd; i !== -1; i = previous[i] as number) kept.add(i);
  const moved = new Set<number>();
  sorted.forEach(([a], i) => {
    if (!kept.has(i)) moved.add(a);
  });
  return moved;
}

// ---------------------------------------------------------------------------------------------
// The diff.

/** Streams of a section: base bar lines, each instrument's bar lines, notes per instrument, lyrics. */
function streamIds(linesA: Line[], linesB: Line[], kind: "bars" | "note"): (string | null)[] {
  const ids: (string | null)[] = [null];
  for (const line of [...linesB, ...linesA]) {
    if (line.kind === kind && line.instrument !== null && !ids.includes(line.instrument)) {
      ids.push(line.instrument);
    }
  }
  return ids;
}

function diffLines(
  a: Side,
  b: Side,
  placeA: SectionPlace | null,
  placeB: SectionPlace | null,
  linesA: Line[],
  linesB: Line[],
  out: SongChange[],
): void {
  // Bar lines, base first, then each instrument.
  if (placeA && placeB) {
    for (const instrument of streamIds(linesA, linesB, "bars")) {
      const pick = (lines: Line[]) =>
        lines.filter((l): l is BarsLine => l.kind === "bars" && l.instrument === instrument);
      const barsA = pick(linesA);
      const barsB = pick(linesB);
      const keysA = barsA.map((line) => lineKey(a, line));
      const keysB = barsB.map((line) => lineKey(b, line));
      const steps = align(
        barsA.map((_, i) => i),
        barsB.map((_, i) => i),
        (x, y) => keysA[x] === keysB[y],
        (x, y) =>
          overlap(
            (barsA[x] as BarsLine).bars.map((bar) => a.barKeys.get(bar)),
            (barsB[y] as BarsLine).bars.map((bar) => b.barKeys.get(bar)),
            (p, q) => p === q,
          ),
      );
      for (const step of steps) {
        const lineA =
          step.a === null
            ? null
            : { section: placeA, line: step.a + 1, value: barsA[step.a] as BarsLine };
        const lineB =
          step.b === null
            ? null
            : { section: placeB, line: step.b + 1, value: barsB[step.b] as BarsLine };
        if (!lineA || !lineB) {
          out.push({
            kind: lineA ? "line-removed" : "line-added",
            instrument,
            before: lineA,
            after: lineB,
          });
          continue;
        }
        if (keysA[step.a as number] === keysB[step.b as number]) continue;
        const x = lineA.value;
        const y = lineB.value;
        if (collapse(x.label) !== collapse(y.label)) {
          out.push({ kind: "line-label", instrument, before: lineA, after: lineB });
        }
        if (collapse(x.cue) !== collapse(y.cue)) {
          out.push({ kind: "line-cue", instrument, before: lineA, after: lineB });
        }
        if (x.repeat !== y.repeat) {
          out.push({ kind: "line-repeat", instrument, before: lineA, after: lineB });
        }
        diffBars(a, b, lineA, lineB, instrument, out);
      }
    }
  }

  // Notes and cues, band notes first, then each instrument; then lyrics.
  const texts = (
    pick: (line: Line) => line is NoteLine | LyricsLine,
    kinds: readonly [
      "note-added" | "lyrics-added",
      "note-removed" | "lyrics-removed",
      "note-changed" | "lyrics-changed",
    ],
    instrument: string | null,
  ) => {
    const textA = linesA.filter(pick);
    const textB = linesB.filter(pick);
    const steps = align(
      textA,
      textB,
      (x, y) => collapse(x.text) === collapse(y.text),
      (x, y) => textSimilarity(x.text, y.text),
    );
    for (const step of steps) {
      const before =
        step.a === null
          ? null
          : { section: placeA, line: step.a + 1, value: textA[step.a] as NoteLine | LyricsLine };
      const after =
        step.b === null
          ? null
          : { section: placeB, line: step.b + 1, value: textB[step.b] as NoteLine | LyricsLine };
      if (before && after && collapse(before.value.text) === collapse(after.value.text)) continue;
      const kind = !before ? kinds[0] : !after ? kinds[1] : kinds[2];
      out.push({ kind, instrument, before, after });
    }
  };
  for (const instrument of streamIds(linesA, linesB, "note")) {
    texts(
      (line): line is NoteLine => line.kind === "note" && line.instrument === instrument,
      ["note-added", "note-removed", "note-changed"],
      instrument,
    );
  }
  texts(
    (line): line is LyricsLine => line.kind === "lyrics",
    ["lyrics-added", "lyrics-removed", "lyrics-changed"],
    null,
  );
}

function diffBars(
  a: Side,
  b: Side,
  lineA: { section: SectionPlace; line: number; value: BarsLine },
  lineB: { section: SectionPlace; line: number; value: BarsLine },
  instrument: string | null,
  out: SongChange[],
): void {
  const barsA = lineA.value.bars;
  const barsB = lineB.value.bars;
  const steps = align(
    barsA,
    barsB,
    (x, y) => a.barKeys.get(x) === b.barKeys.get(y),
    (x, y) => overlap(barChords(x), barChords(y), (p, q) => p === q),
  );
  for (const step of steps) {
    const before =
      step.a === null
        ? null
        : {
            section: lineA.section,
            line: lineA.line,
            bar: step.a + 1,
            value: barsA[step.a] as Bar,
          };
    const after =
      step.b === null
        ? null
        : {
            section: lineB.section,
            line: lineB.line,
            bar: step.b + 1,
            value: barsB[step.b] as Bar,
          };
    if (before && after) {
      if (a.barKeys.get(before.value) === b.barKeys.get(after.value)) continue;
      out.push({ kind: "bar-changed", instrument, before, after });
    } else {
      out.push({ kind: before ? "bar-removed" : "bar-added", instrument, before, after });
    }
  }
}

function diffHeader(a: Side, b: Side, out: SongChange[]): void {
  const docA = a.doc;
  const docB = b.doc;
  if ((docA.title ?? null) !== (docB.title ?? null)) {
    out.push({
      kind: "title",
      before: docA.titleSpan ? { value: docA.title, span: docA.titleSpan } : null,
      after: docB.titleSpan ? { value: docB.title, span: docB.titleSpan } : null,
    });
  }
  // Header entries: by key and by which entry of that key it is.
  const pairs = new Map<number, number>();
  const groupsB = groupBy(docB.meta, (entry) => entry.key);
  for (const [key, listA] of groupBy(docA.meta, (entry) => entry.key)) {
    const listB = groupsB.get(key) ?? [];
    listA.forEach((x, i) => {
      const y = listB[i];
      if (y !== undefined) pairs.set(x, y);
    });
  }
  for (const { before, after } of inNewOrder(pairs, docA.meta.length, docB.meta.length)) {
    const x = before === null ? null : (docA.meta[before] as MetaEntry);
    const y = after === null ? null : (docB.meta[after] as MetaEntry);
    if (x && y && metaMeaning(x, docA) === metaMeaning(y, docB)) continue;
    out.push({ kind: "meta", key: (x ?? y)?.key ?? "", before: x, after: y });
  }
  diffLines(a, b, null, null, docA.headerLines, docB.headerLines, out);
}

function summarize(changes: SongChange[]): DiffSummary {
  const summary: DiffSummary = {
    total: changes.length,
    header: 0,
    sections: 0,
    lines: 0,
    bars: 0,
    notes: 0,
    lyrics: 0,
  };
  for (const change of changes) {
    const group = change.kind.split("-")[0];
    if (group === "title" || group === "meta") summary.header++;
    else if (group === "section") summary.sections++;
    else if (group === "line") summary.lines++;
    else if (group === "bar") summary.bars++;
    else if (group === "note") summary.notes++;
    else summary.lyrics++;
  }
  return summary;
}

/**
 * Compares two versions of a song in musical terms: what a musician would call a change.
 *
 * It compares what is written in each file — the documents — not the resolved songs: an empty
 * `## Chorus` that plays an earlier chorus is compared as empty, so editing the first chorus is
 * one change, not one per repetition. Resolve both documents (`diff.before`, `diff.after`) with
 * `resolveSong` to compare what is played.
 *
 * Meaning, not spelling: spacing, alignment, comments, instrument synonyms, the naming a chord
 * is written in (`Hm` in H-notation is `Bm`) and how a bar's durations are written
 * (`| A E |` = `| A** E** |` = `| A . E . |`) are no change. Durations are compared as fractions
 * of the bar, so a new time signature alone does not change every bar. `identical` tells whether
 * the texts are the same byte for byte.
 *
 * Sections are matched as personal-note anchors identify them: by name (case-insensitive) and
 * by which section of that name it is. When the count of a name differs, its sections are
 * aligned by content. A removed and an added section are one renamed section when their content
 * is the same, or when they are of the same known type and follow the same matched section.
 * Bar lines (base and each `@instrument` apart), bars, notes and lyrics lines are matched with
 * `align`, so that inserting one bar or line does not mark the later ones as changed.
 * Never throws.
 */
export function diffSongs(before: string, after: string, options: ParseOptions = {}): SongDiff {
  const a = makeSide(parse(before, options).doc);
  const b = makeSide(parse(after, options).doc);
  const changes: SongChange[] = [];
  diffHeader(a, b, changes);

  const pairs = matchSections(a, b);
  const moved = movedSections(pairs);
  const sections = inNewOrder(pairs, a.doc.sections.length, b.doc.sections.length);
  for (const { before: x, after: y } of sections) {
    const placeA = x === null ? null : (a.places[x] as SectionPlace);
    const placeB = y === null ? null : (b.places[y] as SectionPlace);
    if (!placeA || !placeB) {
      changes.push({
        kind: placeA ? "section-removed" : "section-added",
        before: placeA,
        after: placeB,
      });
      continue;
    }
    const section = (
      kind: "section-moved" | "section-renamed" | "section-repeat" | "section-tag" | "section-ref",
    ) => changes.push({ kind, before: placeA, after: placeB });
    if (moved.has(placeA.index)) section("section-moved");
    if (placeA.name !== placeB.name) section("section-renamed");
    if (placeA.repeat !== placeB.repeat) section("section-repeat");
    if (placeA.tag !== placeB.tag) section("section-tag");
    if (
      nameKey(placeA.ref ?? "") !== nameKey(placeB.ref ?? "") ||
      (placeA.ref === null) !== (placeB.ref === null)
    ) {
      section("section-ref");
    }
    const linesA = (a.doc.sections[placeA.index] as Section).lines;
    const linesB = (b.doc.sections[placeB.index] as Section).lines;
    diffLines(a, b, placeA, placeB, linesA, linesB, changes);
  }

  return {
    identical: before === after,
    changes,
    summary: summarize(changes),
    sections,
    before: a.doc,
    after: b.doc,
  };
}

import { parseChord } from "./chord.ts";
import type { Bar, Cell, Diagnostic, Notation, Pos, Span } from "./types.ts";

export interface BarsContext {
  /** Beats per bar: the upper number of the time signature. */
  beats: number;
  notation: Notation;
  /** Report every `B` root or bass: the file does not say which naming it uses. */
  flagAmbiguousB?: boolean;
}

export interface ParsedBars {
  label: string | null;
  bars: Bar[];
  cue: string | null;
  repeat: number;
  diagnostics: Diagnostic[];
}

const EPSILON = 1e-9;
const NO_CHORD = /^n\.?c\.?$/i;
const STARS_ONLY = /^\*+$/;
const WITH_STARS = /^(.*?)(\*+)$/s;
const DASH = /^[-–—]+$/;
/** `x2`, `2x`, `(2x)`, `(x2)`, `×2` as a word of its own. */
const REPEAT = /(?:^|\s)\(?\s*(?:[xх×]\s*(\d+)|(\d+)\s*[xх×])\s*\)?(?=\s|$)/i;
const B_ROOT = /^B(?![#♯b♭])|\/B(?![#♯b♭])/;

/** Reads a repeat such as `x2` or `(2x)` out of free text and returns what is left. */
export function extractRepeat(text: string): { repeat: number; rest: string } {
  const match = REPEAT.exec(text);
  if (!match) return { repeat: 1, rest: text.trim() };
  const repeat = Number(match[1] ?? match[2]);
  const rest = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim();
  return { repeat: Math.max(repeat, 1), rest };
}

interface Token {
  text: string;
  from: number;
  to: number;
}

function tokens(text: string, from: number, to: number): Token[] {
  const found: Token[] = [];
  // A word ends at whitespace or after its asterisks, so `A**G**` is two tokens.
  const word = /[^\s*]+\**|\*+/g;
  const bar = text.slice(from, to);
  for (let match = word.exec(bar); match; match = word.exec(bar)) {
    found.push({
      text: match[0],
      from: from + match.index,
      to: from + match.index + match[0].length,
    });
  }
  return found;
}

/**
 * Parses the bar part of a line: `label | bars | … | cue`.
 * `at` is the position of `text[0]` in the file; the text must not contain a line break.
 */
export function parseBars(text: string, at: Pos, context: BarsContext): ParsedBars {
  const diagnostics: Diagnostic[] = [];
  const pos = (index: number): Pos => ({
    offset: at.offset + index,
    line: at.line,
    column: at.column + index,
  });
  const span = (from: number, to: number): Span => ({ start: pos(from), end: pos(to) });

  // Doubled bar lines and repeat colons are plain bar lines; replacing keeps every offset.
  const plain = text.replace(/\|\||\|:|:\|/g, (m) => (m === "|:" ? "| " : " |"));
  const pipes: number[] = [];
  for (let i = plain.indexOf("|"); i !== -1; i = plain.indexOf("|", i + 1)) pipes.push(i);

  const first = pipes[0] ?? plain.length;
  const last = pipes[pipes.length - 1] ?? plain.length;
  const label = plain.slice(0, first).trim() || null;
  const tail = extractRepeat(plain.slice(last + 1));

  const bars: Bar[] = [];
  for (let i = 0; i + 1 < pipes.length; i++) {
    const from = (pipes[i] as number) + 1;
    const to = pipes[i + 1] as number;
    bars.push(parseBar(plain, from, to, span, context, diagnostics));
  }
  return { label, bars, cue: tail.rest || null, repeat: tail.repeat, diagnostics };
}

function parseBar(
  text: string,
  from: number,
  to: number,
  span: (from: number, to: number) => Span,
  context: BarsContext,
  diagnostics: Diagnostic[],
): Bar {
  const barSpan = span(from, to);
  const words = tokens(text, from, to).filter((t) => !DASH.test(t.text));
  if (words.length === 0) return { kind: "empty", cells: [], beats: context.beats, span: barSpan };
  if (words.length === 1 && words[0]?.text === "%") {
    return { kind: "repeat", cells: [], beats: context.beats, span: barSpan };
  }

  // Slots are cells or dots (null), in order.
  const slots: (Cell | null)[] = [];
  let hasStars = false;
  let hasDots = false;
  for (const word of words) {
    if (word.text === ".") {
      hasDots = true;
      slots.push(null);
      continue;
    }
    const previous = slots[slots.length - 1];
    if (STARS_ONLY.test(word.text) && previous && previous.stars === 0) {
      previous.stars = word.text.length;
      hasStars = true;
      continue;
    }
    const starred = WITH_STARS.exec(word.text);
    const name = starred ? (starred[1] as string) : word.text;
    const stars = starred ? (starred[2] as string).length : 0;
    if (stars > 0) hasStars = true;
    const cellSpan = span(word.from, word.from + name.length);
    const cell: Cell = {
      kind: "text",
      text: name,
      chord: null,
      start: 0,
      beats: 0,
      stars,
      span: cellSpan,
    };
    if (NO_CHORD.test(name)) {
      cell.kind = "no-chord";
    } else {
      cell.chord = parseChord(name, context.notation);
      if (cell.chord) {
        cell.kind = "chord";
        if (context.flagAmbiguousB && B_ROOT.test(name)) {
          diagnostics.push({
            code: "ambiguous-b",
            severity: "info",
            span: cellSpan,
            data: { text: name },
          });
        }
      } else {
        diagnostics.push({
          code: "unknown-chord",
          severity: "warning",
          span: cellSpan,
          data: { text: name },
        });
      }
    }
    slots.push(cell);
  }

  if (hasStars && hasDots) {
    diagnostics.push({ code: "mixed-durations", severity: "warning", span: barSpan });
  }

  const cells: Cell[] = [];
  let length = 0;
  if (hasDots && !hasStars) {
    // Cell mode: every token is an equal slot of the bar.
    const slot = context.beats / slots.length;
    for (const entry of slots) {
      const lastCell = cells[cells.length - 1];
      if (entry) {
        entry.start = length;
        entry.beats = slot;
        cells.push(entry);
      } else if (lastCell) {
        lastCell.beats += slot;
      }
      length += slot;
    }
    return { kind: "chords", cells, beats: context.beats, span: barSpan };
  }

  for (const entry of slots) if (entry) cells.push(entry);
  const explicit = cells.reduce((sum, cell) => sum + cell.stars, 0);
  const free = cells.filter((cell) => cell.stars === 0).length;
  const rest = context.beats - explicit;
  const share = free === 0 ? 0 : rest > EPSILON ? rest / free : 1;
  for (const cell of cells) {
    cell.start = length;
    cell.beats = cell.stars > 0 ? cell.stars : share;
    length += cell.beats;
  }
  const data = { beats: Number(length.toFixed(3)), expected: context.beats };
  if (length > context.beats + EPSILON) {
    diagnostics.push({ code: "bar-too-long", severity: "warning", span: barSpan, data });
  } else if (length < context.beats - EPSILON) {
    diagnostics.push({ code: "bar-short", severity: "info", span: barSpan, data });
  }
  return { kind: "chords", cells, beats: length, span: barSpan };
}

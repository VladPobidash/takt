import { extractRepeat, parseBars } from "./bars.ts";
import { parseChord } from "./chord.ts";
import { DEFAULT_TIME, readHeader, readNotation, readTime } from "./header.ts";
import { normalizeInstrument } from "./instruments.ts";
import { baseBars, sourceIndex } from "./sections.ts";
import type {
  BarsLine,
  Diagnostic,
  Line,
  MetaEntry,
  Notation,
  ParseOptions,
  ParseResult,
  Pos,
  Section,
  SongDoc,
  Span,
} from "./types.ts";

interface SourceLine {
  /** The line without its line break and without surrounding whitespace. */
  text: string;
  /** Position of `text[0]`. */
  at: Pos;
}

const TITLE = /^#(?!#)\s*(.*)$/;
const SECTION = /^##(?!#)\s*(.*)$/;
const META = /^([\p{L}][\p{L}\p{N}_-]*)\s*:(?!\/\/)\s*(.*)$/u;
const INSTRUMENT = /^@([^\s|>]+)\s*(.*)$/s;
const TAG = /\[([^\]]*)\]/g;
const STARS = /\*+$/;

function splitLines(text: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let offset = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let number = 1;
  while (offset <= text.length) {
    let end = text.indexOf("\n", offset);
    if (end === -1) end = text.length;
    const raw = text.slice(offset, end).replace(/\r$/, "");
    const indent = raw.length - raw.trimStart().length;
    lines.push({
      text: raw.trim(),
      at: { offset: offset + indent, line: number, column: 1 + indent },
    });
    offset = end + 1;
    number++;
  }
  return lines;
}

function spanOf(line: SourceLine, from = 0, to = line.text.length): Span {
  const pos = (index: number): Pos => ({
    offset: line.at.offset + index,
    line: line.at.line,
    column: line.at.column + index,
  });
  return { start: pos(from), end: pos(to) };
}

/** True when a bar line of the file uses an `H` root or bass. */
function usesH(lines: SourceLine[]): boolean {
  for (const line of lines) {
    if (!line.text.includes("|") || line.text.startsWith("//") || line.text.startsWith(">"))
      continue;
    for (const word of line.text.split(/[\s|]+/)) {
      const name = word.replace(STARS, "");
      if ((name.startsWith("H") || name.includes("/H")) && parseChord(name, "H")) return true;
    }
  }
  return false;
}

function parseSectionHeader(body: string, span: Span): Section {
  const tags: string[] = [];
  const clean = (part: string) => {
    const withoutTags = part.replace(TAG, (_, tag: string) => {
      if (tag.trim()) tags.push(tag.trim());
      return " ";
    });
    return extractRepeat(withoutTags);
  };
  const equals = body.indexOf("=");
  const left = clean(equals === -1 ? body : body.slice(0, equals));
  const right = equals === -1 ? null : clean(body.slice(equals + 1));
  return {
    name: left.rest.replace(/\s+/g, " "),
    tag: tags.length > 0 ? tags.join(", ") : null,
    repeat: left.repeat ?? right?.repeat ?? null,
    ref: right?.rest ? right.rest.replace(/\s+/g, " ") : null,
    span,
    lines: [],
  };
}

/**
 * Parses `.takt` text into a document that mirrors the file.
 * Never throws: whatever is wrong with the text is returned as diagnostics.
 */
export function parse(text: string, options: ParseOptions = {}): ParseResult {
  const diagnostics: Diagnostic[] = [];
  const lines = splitLines(text);

  // Pass 1: the header values that decide how bars are read.
  let time = DEFAULT_TIME;
  let headerNotation: Notation | null = null;
  let seenTime = false;
  let seenNotation = false;
  for (const line of lines) {
    if (SECTION.test(line.text) || line.text.includes("|")) break;
    const meta = META.exec(line.text);
    if (!meta) continue;
    const key = (meta[1] as string).toLowerCase();
    if (key === "time" && !seenTime) {
      seenTime = true;
      time = readTime(meta[2] as string) ?? DEFAULT_TIME;
    } else if (key === "notation" && !seenNotation) {
      seenNotation = true;
      headerNotation = readNotation(meta[2] as string);
    }
  }
  let notation: Notation;
  let notationSource: SongDoc["notationSource"];
  if (headerNotation) {
    notation = headerNotation;
    notationSource = "header";
  } else if (usesH(lines)) {
    notation = "H";
    notationSource = "inferred";
  } else {
    notation = options.defaultNotation ?? "B";
    notationSource = "default";
  }
  const barsContext = { beats: time.beats, notation, flagAmbiguousB: notationSource === "default" };

  // Pass 2: the tree.
  let title: string | null = null;
  let titleSpan: Span | null = null;
  const meta: MetaEntry[] = [];
  const headerLines: Line[] = [];
  const sections: Section[] = [];
  let section: Section | null = null;

  const readLine = (line: SourceLine): Line => {
    const whole = spanOf(line);
    let body = line.text;
    let shift = 0;
    let instrument: string | null = null;
    let instrumentName: string | null = null;
    const prefixed = INSTRUMENT.exec(body);
    if (prefixed) {
      instrumentName = prefixed[1] as string;
      instrument = normalizeInstrument(instrumentName);
      body = prefixed[2] as string;
      shift = line.text.length - body.length;
    } else {
      if (body.startsWith("//"))
        return { kind: "comment", text: body.slice(2).trim(), span: whole };
      if (!body.startsWith(">") && !body.includes("|"))
        return { kind: "lyrics", text: body, span: whole };
    }
    if (body.startsWith(">") || !body.includes("|")) {
      const noteText = body.startsWith(">") ? body.slice(1).trim() : body.trim();
      return { kind: "note", instrument, instrumentName, text: noteText, span: whole };
    }
    const at: Pos = {
      offset: line.at.offset + shift,
      line: line.at.line,
      column: line.at.column + shift,
    };
    const parsed = parseBars(body, at, barsContext);
    diagnostics.push(...parsed.diagnostics);
    return {
      kind: "bars",
      instrument,
      instrumentName,
      label: parsed.label,
      bars: parsed.bars,
      cue: parsed.cue,
      repeat: parsed.repeat,
      span: whole,
    };
  };

  for (const line of lines) {
    if (line.text === "") continue;
    const header = SECTION.exec(line.text);
    if (header) {
      section = parseSectionHeader(header[1] as string, spanOf(line));
      sections.push(section);
      continue;
    }
    if (section) {
      section.lines.push(readLine(line));
      continue;
    }
    // Still in the header.
    const titleMatch = TITLE.exec(line.text);
    if (titleMatch && !titleSpan) {
      titleSpan = spanOf(line);
      title = (titleMatch[1] as string).trim() || null;
      continue;
    }
    const entry = titleMatch ? null : META.exec(line.text);
    if (entry && !line.text.includes("|")) {
      const value = (entry[2] as string).trim();
      const valueStart = line.text.length - (entry[2] as string).length;
      meta.push({
        key: (entry[1] as string).toLowerCase(),
        value,
        span: spanOf(line),
        valueSpan: spanOf(line, valueStart, valueStart + value.length),
      });
      continue;
    }
    const parsed = readLine(line);
    if (parsed.kind === "bars") {
      // A quick chart without section headers: the bars start an unnamed section.
      const at = spanOf(line, 0, 0);
      section = { name: "", tag: null, repeat: null, ref: null, span: at, lines: [parsed] };
      sections.push(section);
      continue;
    }
    headerLines.push(parsed);
    if (parsed.kind === "lyrics") {
      diagnostics.push({ code: "unexpected-header-line", severity: "warning", span: parsed.span });
    }
  }

  if (title === null) {
    const start: Pos = { offset: 0, line: 1, column: 1 };
    diagnostics.push({ code: "missing-title", severity: "info", span: { start, end: start } });
  }
  readHeader(meta, notation, diagnostics);
  checkSections(sections, diagnostics);

  diagnostics.sort((a, b) => a.span.start.offset - b.span.start.offset);
  return {
    doc: { title, titleSpan, meta, headerLines, notation, notationSource, time, sections },
    diagnostics,
  };
}

/** Problems that only show when sections are looked at together: reuse and instrument lines. */
function checkSections(sections: Section[], diagnostics: Diagnostic[]): void {
  sections.forEach((section, index) => {
    const source = sourceIndex(sections, index);
    if (source === null) {
      if (section.ref !== null) {
        diagnostics.push({
          code: "unknown-section-ref",
          severity: "warning",
          span: section.span,
          data: { name: section.ref },
        });
      } else if (!section.lines.some((line) => line.kind === "bars")) {
        diagnostics.push({ code: "empty-section", severity: "info", span: section.span });
      }
    }
    const base = source === null ? [] : baseBars(sections[source] as Section);
    const counters = new Map<string, number>();
    for (const line of section.lines) {
      if (line.kind !== "bars" || line.instrument === null) continue;
      const ordinal = counters.get(line.instrument) ?? 0;
      counters.set(line.instrument, ordinal + 1);
      const replaced: BarsLine | undefined = base[ordinal];
      const data = { instrument: line.instrumentName ?? line.instrument, line: ordinal + 1 };
      if (!replaced) {
        diagnostics.push({ code: "part-without-base", severity: "warning", span: line.span, data });
      } else if (replaced.bars.length !== line.bars.length) {
        diagnostics.push({
          code: "part-bar-count",
          severity: "info",
          span: line.span,
          data: { ...data, bars: line.bars.length, expected: replaced.bars.length },
        });
      }
    }
  });
}

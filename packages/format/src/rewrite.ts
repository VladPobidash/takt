import { formatChord, mod12 } from "./chord.ts";
import { cleanFormName, type FormStepInput, findForm, formatFormEntries } from "./forms.ts";
import { readHeader } from "./header.ts";
import { parse } from "./parse.ts";
import { formatKey, prefersFlats, transposeChord, transposeKey } from "./transpose.ts";
import type { Key, ParseOptions, SongDoc, Span } from "./types.ts";

interface Edit {
  span: Span;
  text: string;
}

function applyEdits(text: string, edits: Edit[]): string {
  let result = text;
  const ordered = [...edits].sort((a, b) => b.span.start.offset - a.span.start.offset);
  for (const edit of ordered) {
    result =
      result.slice(0, edit.span.start.offset) + edit.text + result.slice(edit.span.end.offset);
  }
  return result;
}

function guessKey(doc: SongDoc): Key | null {
  for (const section of doc.sections) {
    for (const line of section.lines) {
      if (line.kind !== "bars" || line.instrument !== null) continue;
      for (const bar of line.bars) {
        const chord = bar.cells.find((cell) => cell.chord)?.chord;
        if (chord) return { tonic: chord.root, minor: /^m(?!aj)/.test(chord.quality) };
      }
    }
  }
  return null;
}

/**
 * Transposes a `.takt` file by rewriting only its chords and its `key:` value.
 * Spacing, comments, notes, lyrics and everything the parser did not understand stay
 * exactly as written. Chords are written in the file's own note naming, with sharps
 * or flats chosen by the target key.
 */
export function transposeText(text: string, semitones: number, options: ParseOptions = {}): string {
  if (mod12(semitones) === 0) return text;
  const { doc } = parse(text, options);
  const header = readHeader(doc.meta, doc.notation);
  // Without a `key:` line the first chord stands in for the key when choosing sharps or flats.
  const sourceKey = header.key ?? guessKey(doc);
  const targetKey = sourceKey ? transposeKey(sourceKey, semitones) : null;
  const flats = targetKey ? prefersFlats(targetKey) : false;
  const edits: Edit[] = [];

  if (header.key && targetKey) {
    const entry = doc.meta.find((m) => m.key === "key");
    if (entry) edits.push({ span: entry.valueSpan, text: formatKey(targetKey, doc.notation) });
  }
  for (const section of doc.sections) {
    for (const line of section.lines) {
      if (line.kind !== "bars") continue;
      for (const bar of line.bars) {
        for (const cell of bar.cells) {
          if (!cell.chord) continue;
          const moved = transposeChord(cell.chord, semitones, { flats });
          edits.push({ span: cell.span, text: formatChord(moved, { notation: doc.notation }) });
        }
      }
    }
  }
  const result = applyEdits(text, edits);
  if (doc.notationSource !== "inferred") return result;
  // The file was read in H-notation only because it contained an H. If transposing removed
  // every H, the result would be read differently, so the naming is written into the header.
  if (parse(result, options).doc.notation === doc.notation) return result;
  const lineBreak = text.includes("\r\n") ? "\r\n" : "\n";
  const declaration = `notation: ${doc.notation}`;
  const anchor = doc.meta[doc.meta.length - 1]?.span ?? doc.titleSpan;
  if (!anchor) return declaration + lineBreak + result;
  const at: Span = { start: anchor.end, end: anchor.end };
  return applyEdits(text, [...edits, { span: at, text: lineBreak + declaration }]);
}

function replace(text: string, from: number, to: number, insert: string): string {
  return text.slice(0, from) + insert + text.slice(to);
}

/**
 * Sets the entries of a version: replaces the list of the form of that name, or adds a new
 * `form` line after the last one (else after the header values, else after the title).
 * Nothing else in the text changes. A name that cleans to nothing leaves the text alone.
 */
export function setForm(
  text: string,
  name: string,
  steps: FormStepInput[],
  options: ParseOptions = {},
): string {
  const clean = cleanFormName(name);
  if (clean === "") return text;
  const { doc } = parse(text, options);
  const list = formatFormEntries(doc, steps);
  const existing = findForm(doc, clean);
  if (existing) {
    const { start, end } = existing.listSpan;
    const empty = start.offset === end.offset;
    return replace(text, start.offset, end.offset, empty ? ` ${list}` : list);
  }
  const line = `form ${clean}: ${list}`;
  const anchor =
    doc.forms[doc.forms.length - 1]?.span ?? doc.meta[doc.meta.length - 1]?.span ?? doc.titleSpan;
  const lineBreak = text.includes("\r\n") ? "\r\n" : "\n";
  if (anchor) {
    const at = anchor.end.offset;
    return replace(text, at, at, lineBreak + line);
  }
  const at = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  return replace(text, at, at, line + lineBreak);
}

/** Renames a version; only its name changes. */
export function renameForm(
  text: string,
  from: string,
  to: string,
  options: ParseOptions = {},
): string {
  const clean = cleanFormName(to);
  const form = clean === "" ? null : findForm(parse(text, options).doc, from);
  if (!form) return text;
  return replace(text, form.nameSpan.start.offset, form.nameSpan.end.offset, clean);
}

/** Deletes a version: its whole line, with its line break. */
export function removeForm(text: string, name: string, options: ParseOptions = {}): string {
  const form = findForm(parse(text, options).doc, name);
  if (!form) return text;
  const from = form.span.start.offset - (form.span.start.column - 1);
  const next = text.indexOf("\n", form.span.end.offset);
  return replace(text, from, next === -1 ? text.length : next + 1, "");
}

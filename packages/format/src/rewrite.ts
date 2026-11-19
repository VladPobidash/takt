import { formatChord, mod12 } from "./chord.ts";
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

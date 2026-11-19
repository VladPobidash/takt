import { parseKey } from "./transpose.ts";
import type { Diagnostic, Key, MetaEntry, Notation, TimeSignature } from "./types.ts";

export const DEFAULT_TIME: TimeSignature = { beats: 4, unit: 4 };

export function readTime(value: string): TimeSignature | null {
  const match = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const beats = Number(match[1]);
  const unit = Number(match[2]);
  if (beats < 1 || beats > 32 || ![1, 2, 4, 8, 16].includes(unit)) return null;
  return { beats, unit };
}

export function readNotation(value: string): Notation | null {
  const text = value.trim().toUpperCase();
  return text === "H" || text === "B" ? text : null;
}

export function readTempo(value: string): number | null {
  const match = /^(\d+(?:[.,]\d+)?)(?:\s*bpm)?$/i.exec(value.trim());
  if (!match) return null;
  const tempo = Number((match[1] as string).replace(",", "."));
  return tempo >= 20 && tempo <= 400 ? tempo : null;
}

export function readCapo(value: string): number | null {
  const match = /^\d{1,2}$/.exec(value.trim());
  if (!match) return null;
  const capo = Number(match[0]);
  return capo <= 12 ? capo : null;
}

export interface Header {
  key: Key | null;
  tempo: number | null;
  capo: number | null;
  artist: string | null;
  link: string | null;
}

/** Typed header values. The first entry of each key wins; bad values are reported and read as null. */
export function readHeader(
  meta: MetaEntry[],
  notation: Notation,
  diagnostics?: Diagnostic[],
): Header {
  const header: Header = { key: null, tempo: null, capo: null, artist: null, link: null };
  const seen = new Set<string>();
  for (const entry of meta) {
    if (seen.has(entry.key)) continue;
    seen.add(entry.key);
    const report = (code: Diagnostic["code"]) =>
      diagnostics?.push({
        code,
        severity: "warning",
        span: entry.valueSpan,
        data: { value: entry.value },
      });
    switch (entry.key) {
      case "key":
        header.key = parseKey(entry.value, notation);
        if (!header.key) report("invalid-key");
        break;
      case "tempo":
        header.tempo = readTempo(entry.value);
        if (header.tempo === null) report("invalid-tempo");
        break;
      case "capo":
        header.capo = readCapo(entry.value);
        if (header.capo === null) report("invalid-capo");
        break;
      case "time":
        if (!readTime(entry.value)) report("invalid-time");
        break;
      case "notation":
        if (!readNotation(entry.value)) report("invalid-notation");
        break;
      case "artist":
        header.artist = entry.value || null;
        break;
      case "link":
        header.link = entry.value || null;
        break;
    }
  }
  return header;
}

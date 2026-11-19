import type { Diagnostic, MetaEntry, Pos, Span } from "./types.ts";

export interface SetlistEntry {
  /** Song id: the file name without `.takt`. */
  song: string;
  /** Key for this setlist, as written (`D`, `Hm`); null to use the song's own key. */
  key: string | null;
  /** Note for the night (`> no intro`). */
  note: string | null;
  /** Any other `name: value` pairs of the entry. */
  options: Record<string, string>;
  span: Span;
}

export interface Setlist {
  title: string | null;
  meta: MetaEntry[];
  entries: SetlistEntry[];
}

const OPTION = /^([\p{L}][\p{L}\p{N}_-]*)\s*:\s*(.*)$/u;

/** Parses a `.taktset` file. Never throws; unreadable lines are reported and skipped. */
export function parseSetlist(text: string): { setlist: Setlist; diagnostics: Diagnostic[] } {
  const setlist: Setlist = { title: null, meta: [], entries: [] };
  const diagnostics: Diagnostic[] = [];
  let offset = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let number = 0;

  for (const raw of text.slice(offset).split("\n")) {
    number++;
    const line = raw.replace(/\r$/, "");
    const indent = line.length - line.trimStart().length;
    const body = line.trim();
    const start: Pos = { offset: offset + indent, line: number, column: 1 + indent };
    const span: Span = {
      start,
      end: { offset: start.offset + body.length, line: number, column: start.column + body.length },
    };
    offset += raw.length + 1;
    if (body === "" || body.startsWith("//")) continue;
    const invalid = () =>
      diagnostics.push({ code: "invalid-setlist-entry", severity: "warning", span });

    if (body.startsWith("#") && setlist.title === null && setlist.entries.length === 0) {
      setlist.title = body.replace(/^#+\s*/, "") || null;
      continue;
    }
    if (body.startsWith("-")) {
      const [first = "", ...rest] = body
        .slice(1)
        .split("|")
        .map((part) => part.trim());
      const entry: SetlistEntry = { song: first, key: null, note: null, options: {}, span };
      let ok = true;
      for (const part of rest) {
        const option = OPTION.exec(part);
        if (part.startsWith(">")) entry.note = part.slice(1).trim() || null;
        else if (option) {
          const name = (option[1] as string).toLowerCase();
          const value = (option[2] as string).trim();
          if (name === "key") entry.key = value || null;
          else entry.options[name] = value;
        } else if (part !== "") ok = false;
      }
      // An entry without a song is dropped; one with an unreadable part is kept and reported.
      if (first !== "") setlist.entries.push(entry);
      if (first === "" || !ok) invalid();
      continue;
    }
    const meta = OPTION.exec(body);
    if (meta && setlist.entries.length === 0) {
      const value = (meta[2] as string).trim();
      const valueStart = body.length - (meta[2] as string).length;
      const at = (index: number): Pos => ({
        offset: start.offset + index,
        line: number,
        column: start.column + index,
      });
      setlist.meta.push({
        key: (meta[1] as string).toLowerCase(),
        value,
        span,
        valueSpan: { start: at(valueStart), end: at(valueStart + value.length) },
      });
      continue;
    }
    invalid();
  }
  return { setlist, diagnostics };
}

/** Writes a setlist as `.taktset` text. */
export function formatSetlist(setlist: Setlist): string {
  const lines: string[] = [];
  if (setlist.title !== null) lines.push(`# ${setlist.title}`);
  for (const entry of setlist.meta) lines.push(`${entry.key}: ${entry.value}`);
  for (const entry of setlist.entries) {
    const parts = [entry.song];
    if (entry.key !== null) parts.push(`key: ${entry.key}`);
    for (const [name, value] of Object.entries(entry.options)) parts.push(`${name}: ${value}`);
    if (entry.note !== null) parts.push(`> ${entry.note}`);
    lines.push(`- ${parts.join(" | ")}`);
  }
  return `${lines.join("\n")}\n`;
}

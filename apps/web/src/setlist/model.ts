import {
  formatKey,
  formatSetlist,
  type Key,
  type Notation,
  parseKey,
  parseSetlist,
  type Setlist,
  type SetlistEntry,
  semitone,
  transposeKey,
} from "@takt/format";

const NO_SPAN = {
  start: { offset: 0, line: 1, column: 1 },
  end: { offset: 0, line: 1, column: 1 },
};

/** The text a new setlist starts with. The note naming of its keys is written down. */
export function newSetlistText(title: string, date: string, notation: Notation): string {
  return `# ${title}\ndate: ${date}\nnotation: ${notation}\n`;
}

export interface ReadSetlist {
  setlist: Setlist;
  /** Naming in which the entries' keys are written. */
  notation: Notation;
  /** ISO date (`2026-12-12`) or null. */
  date: string | null;
}

export function readSetlist(text: string, defaultNotation: Notation): ReadSetlist {
  const { setlist } = parseSetlist(text);
  const meta = (key: string) => setlist.meta.find((entry) => entry.key === key)?.value ?? null;
  const written = meta("notation")?.toUpperCase();
  const date = meta("date");
  return {
    setlist,
    notation: written === "H" || written === "B" ? written : defaultNotation,
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
  };
}

const withEntries = (setlist: Setlist, entries: SetlistEntry[]): Setlist => ({
  ...setlist,
  entries,
});

export function addSong(setlist: Setlist, song: string): Setlist {
  return withEntries(setlist, [
    ...setlist.entries,
    { song, key: null, note: null, options: {}, span: NO_SPAN },
  ]);
}

export function removeAt(setlist: Setlist, index: number): Setlist {
  return withEntries(
    setlist,
    setlist.entries.filter((_, i) => i !== index),
  );
}

/** Moves the entry at `from` to position `to`; out-of-range moves change nothing. */
export function move(setlist: Setlist, from: number, to: number): Setlist {
  if (to < 0 || to >= setlist.entries.length || from === to) return setlist;
  const entries = [...setlist.entries];
  const [entry] = entries.splice(from, 1);
  if (!entry) return setlist;
  entries.splice(to, 0, entry);
  return withEntries(setlist, entries);
}

export function updateEntry(
  setlist: Setlist,
  index: number,
  change: Partial<Pick<SetlistEntry, "key" | "note">>,
): Setlist {
  return withEntries(
    setlist,
    setlist.entries.map((entry, i) => (i === index ? { ...entry, ...change } : entry)),
  );
}

export function setMeta(setlist: Setlist, key: string, value: string): Setlist {
  const entry = { key, value, span: NO_SPAN, valueSpan: NO_SPAN };
  const exists = setlist.meta.some((m) => m.key === key);
  return {
    ...setlist,
    meta: exists ? setlist.meta.map((m) => (m.key === key ? entry : m)) : [...setlist.meta, entry],
  };
}

export { formatSetlist };

/**
 * Semitones from the song's own key to the key chosen for the setlist, by the shorter way
 * (−5 … +6). 0 when either key is unknown or their modes differ.
 */
export function transposeFor(songKey: Key | null, entryKey: Key | null): number {
  if (!songKey || !entryKey || songKey.minor !== entryKey.minor) return 0;
  const up = (((semitone(entryKey.tonic) - semitone(songKey.tonic)) % 12) + 12) % 12;
  return up > 6 ? up - 12 : up;
}

/** The key to store for an entry transposed by `semitones`; null when that is the song's own key. */
export function entryKeyFor(
  songKey: Key | null,
  semitones: number,
  notation: Notation,
): string | null {
  if (!songKey || semitones % 12 === 0) return null;
  return formatKey(transposeKey(songKey, semitones), notation);
}

export function readEntryKey(entry: Pick<SetlistEntry, "key">, notation: Notation): Key | null {
  return entry.key ? parseKey(entry.key, notation) : null;
}

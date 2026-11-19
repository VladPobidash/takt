import type { StoredFile } from "./types.ts";

/** One file that carries songs and setlists between devices, and full backups (ADR 0008). */
export interface Bundle {
  format: "takt-bundle";
  version: 1;
  /** ISO date-time of the export. */
  exportedAt: string;
  songs: { id: string; text: string }[];
  setlists: { id: string; text: string }[];
  /** Personal notes by song id and anchor — only in a full backup, never in a shared setlist. */
  notes?: Record<string, Record<string, string>>;
}

export const BUNDLE_EXTENSION = ".taktbundle";

export function createBundle(
  content: {
    songs: StoredFile[];
    setlists: StoredFile[];
    notes?: Record<string, Record<string, string>>;
  },
  now: Date,
): Bundle {
  const strip = (files: StoredFile[]) =>
    [...files].sort((a, b) => a.id.localeCompare(b.id)).map(({ id, text }) => ({ id, text }));
  return {
    format: "takt-bundle",
    version: 1,
    exportedAt: now.toISOString(),
    songs: strip(content.songs),
    setlists: strip(content.setlists),
    ...(content.notes && Object.keys(content.notes).length > 0 ? { notes: content.notes } : {}),
  };
}

/** The bundle as text: indented JSON, so it can be read and compared by eye. */
export function formatBundle(bundle: Bundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

function files(value: unknown): { id: string; text: string }[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const result: { id: string; text: string }[] = [];
  for (const item of value) {
    if (typeof item?.id !== "string" || typeof item?.text !== "string" || item.id === "")
      return null;
    result.push({ id: item.id, text: item.text });
  }
  return result;
}

function readNotes(value: unknown): Record<string, Record<string, string>> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const result: Record<string, Record<string, string>> = {};
  for (const [song, notes] of Object.entries(value)) {
    if (typeof notes !== "object" || notes === null) continue;
    const kept = Object.entries(notes).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    );
    if (kept.length > 0) result[song] = Object.fromEntries(kept);
  }
  return Object.keys(result).length > 0 ? result : null;
}

/** Reads a bundle. Returns null for anything that is not a bundle this version understands. */
export function parseBundle(text: string): Bundle | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const raw = data as Record<string, unknown>;
  if (raw.format !== "takt-bundle" || raw.version !== 1) return null;
  const songs = files(raw.songs);
  const setlists = files(raw.setlists);
  if (!songs || !setlists) return null;
  const bundle: Bundle = {
    format: "takt-bundle",
    version: 1,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    songs,
    setlists,
  };
  const notes = readNotes(raw.notes);
  if (notes) bundle.notes = notes;
  return bundle;
}

/** `takt-backup-2026-11-19.taktbundle` */
export function backupFileName(now: Date): string {
  return `takt-backup-${now.toISOString().slice(0, 10)}${BUNDLE_EXTENSION}`;
}

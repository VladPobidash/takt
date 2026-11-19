import type { StoredFile } from "./types.ts";

/** One file that carries songs and setlists between devices, and full backups (ADR 0008). */
export interface Bundle {
  format: "takt-bundle";
  version: 1;
  /** ISO date-time of the export. */
  exportedAt: string;
  songs: { id: string; text: string }[];
  setlists: { id: string; text: string }[];
}

export const BUNDLE_EXTENSION = ".taktbundle";

export function createBundle(
  content: { songs: StoredFile[]; setlists: StoredFile[] },
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
  return {
    format: "takt-bundle",
    version: 1,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    songs,
    setlists,
  };
}

/** `takt-backup-2026-11-19.taktbundle` */
export function backupFileName(now: Date): string {
  return `takt-backup-${now.toISOString().slice(0, 10)}${BUNDLE_EXTENSION}`;
}

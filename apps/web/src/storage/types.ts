/** A stored `.takt` or `.taktset` file: the text is the source of truth. */
export interface StoredFile {
  /** File name without the extension, e.g. `silent-night`. */
  id: string;
  text: string;
  /** Milliseconds since the epoch. */
  updatedAt: number;
}

/**
 * Where songs, setlists and device settings live (ADR 0008).
 * Implementations: IndexedDB in the app, memory in tests; folders and native files later.
 */
export interface SongStore {
  listSongs(): Promise<StoredFile[]>;
  putSong(file: StoredFile): Promise<void>;
  deleteSong(id: string): Promise<void>;
  listSetlists(): Promise<StoredFile[]>;
  putSetlist(file: StoredFile): Promise<void>;
  deleteSetlist(id: string): Promise<void>;
  /** Device settings and other small local values, by key. */
  getSettings(): Promise<Record<string, unknown>>;
  setSetting(key: string, value: unknown): Promise<void>;
}

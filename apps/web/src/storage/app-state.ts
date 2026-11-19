import { useSyncExternalStore } from "react";
import { detectLanguage, type Language } from "../i18n/index.ts";
import { type Bundle, createBundle } from "./bundle.ts";
import { slugify, uniqueId } from "./slug.ts";
import type { SongStore, StoredFile } from "./types.ts";

export type Theme = "system" | "light" | "dark";
export type ChordSize = "s" | "m" | "l";
export type InstrumentChoice = "harmony" | "guitar" | "bass" | "keys" | "drums";

/** Device settings (ADR 0008): stored locally, never in `.takt` files. */
export interface Settings {
  language: Language;
  /** Note naming on screen, independent of how a file is written. */
  notation: "H" | "B";
  theme: Theme;
  instrument: InstrumentChoice;
  /** Size of chord names on the song screen. */
  chordSize: ChordSize;
  /** "Everywhere" level of the view options. */
  beatDots: boolean;
  soundingChords: boolean;
  /** When the last full backup was exported from this device (ms since the epoch), null if never. */
  lastBackupAt: number | null;
  /** The setlist that was open last: the "Service" section returns to it. */
  lastSetlistId: string | null;
}

export interface AppState {
  songs: StoredFile[];
  setlists: StoredFile[];
  settings: Settings;
}

export function defaultSettings(preferredLanguages: readonly string[]): Settings {
  const language = detectLanguage(preferredLanguages);
  return {
    language,
    // First-run default: H-notation for a Ukrainian UI, English naming otherwise (ADR 0010).
    notation: language === "uk" ? "H" : "B",
    theme: "system",
    instrument: "harmony",
    chordSize: "m",
    beatDots: true,
    soundingChords: true,
    lastBackupAt: null,
    lastSetlistId: null,
  };
}

/**
 * The app's single source of truth for stored data: keeps songs and settings in memory,
 * writes every change through to the store and notifies subscribers (ADR 0009).
 */
export class AppData {
  private state: AppState;
  private readonly listeners = new Set<() => void>();
  private readonly store: SongStore;

  private constructor(store: SongStore, state: AppState) {
    this.store = store;
    this.state = state;
  }

  /** Loads everything from the store; on the very first run stores `seed` songs. */
  static async load(
    store: SongStore,
    options: { preferredLanguages: readonly string[]; seed?: { name: string; text: string }[] },
  ): Promise<AppData> {
    const saved = await store.getSettings();
    const settings = { ...defaultSettings(options.preferredLanguages) };
    for (const key of Object.keys(settings) as (keyof Settings)[]) {
      if (saved[key] !== undefined) (settings as Record<string, unknown>)[key] = saved[key];
    }
    const data = new AppData(store, {
      songs: await store.listSongs(),
      setlists: await store.listSetlists(),
      settings,
    });
    if (saved.seeded !== true) {
      if (data.state.songs.length === 0 && options.seed) await data.importSongs(options.seed);
      await store.setSetting("seeded", true);
    }
    return data;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): AppState => this.state;

  private update(next: Partial<AppState>): void {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }

  /** Stores files as songs. A file whose name is already taken gets a numbered id. */
  async importSongs(
    files: { name: string; text: string }[],
    now = Date.now(),
  ): Promise<StoredFile[]> {
    const taken = new Set(this.state.songs.map((song) => song.id));
    const added: StoredFile[] = [];
    for (const file of files) {
      const id = uniqueId(slugify(file.name), taken);
      taken.add(id);
      const stored: StoredFile = { id, text: file.text, updatedAt: now };
      await this.store.putSong(stored);
      added.push(stored);
    }
    this.update({ songs: [...this.state.songs, ...added] });
    return added;
  }

  /** Stores a new song under an id made from `name` and returns it. */
  async createSong(name: string, text: string, now = Date.now()): Promise<StoredFile> {
    const [song] = await this.importSongs([{ name, text }], now);
    return song as StoredFile;
  }

  /** Everything on this device as one bundle. */
  exportBundle(now: Date): Bundle {
    return createBundle({ songs: this.state.songs, setlists: this.state.setlists }, now);
  }

  /** One setlist with the songs it lists, to send to the band as a single file. */
  exportSetlistBundle(id: string, songIds: string[], now: Date): Bundle {
    const wanted = new Set(songIds);
    return createBundle(
      {
        songs: this.state.songs.filter((song) => wanted.has(song.id)),
        setlists: this.state.setlists.filter((setlist) => setlist.id === id),
      },
      now,
    );
  }

  /**
   * Adds the songs of a bundle. A song that is already here with the same text is left alone;
   * one with the same id but another text is stored next to it under a numbered id — importing
   * never overwrites what is on the device.
   */
  async importBundle(
    bundle: Bundle,
    now = Date.now(),
  ): Promise<{ added: number; unchanged: number }> {
    const texts = new Set(this.state.songs.map((song) => song.text));
    const fresh = bundle.songs.filter((song) => !texts.has(song.text));
    await this.importSongs(
      fresh.map((song) => ({ name: song.id, text: song.text })),
      now,
    );
    const known = new Set(this.state.setlists.map((setlist) => setlist.text));
    const taken = new Set(this.state.setlists.map((setlist) => setlist.id));
    for (const setlist of bundle.setlists) {
      if (known.has(setlist.text)) continue;
      const id = uniqueId(slugify(setlist.id), taken);
      taken.add(id);
      await this.saveSetlist({ id, text: setlist.text, updatedAt: now });
    }
    return { added: fresh.length, unchanged: bundle.songs.length - fresh.length };
  }

  async createSetlist(name: string, text: string, now = Date.now()): Promise<StoredFile> {
    const id = uniqueId(slugify(name), new Set(this.state.setlists.map((setlist) => setlist.id)));
    const setlist: StoredFile = { id, text, updatedAt: now };
    await this.saveSetlist(setlist);
    return setlist;
  }

  async saveSetlist(setlist: StoredFile): Promise<void> {
    // Keep the position: a setlist is replaced in place, a new one goes to the end.
    const exists = this.state.setlists.some((s) => s.id === setlist.id);
    this.update({
      setlists: exists
        ? this.state.setlists.map((s) => (s.id === setlist.id ? setlist : s))
        : [...this.state.setlists, setlist],
    });
    await this.store.putSetlist(setlist);
  }

  async deleteSetlist(id: string): Promise<void> {
    await this.store.deleteSetlist(id);
    this.update({ setlists: this.state.setlists.filter((setlist) => setlist.id !== id) });
    if (this.state.settings.lastSetlistId === id) await this.setSetting("lastSetlistId", null);
  }

  // Saves update the in-memory state first and then write to the store, so the screen
  // (and the next edit, which starts from the state) never waits for the disk.
  async saveSong(song: StoredFile): Promise<void> {
    this.update({ songs: [...this.state.songs.filter((s) => s.id !== song.id), song] });
    await this.store.putSong(song);
  }

  async deleteSong(id: string): Promise<void> {
    await this.store.deleteSong(id);
    this.update({ songs: this.state.songs.filter((song) => song.id !== id) });
  }

  async setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    this.update({ settings: { ...this.state.settings, [key]: value } });
    await this.store.setSetting(key, value);
  }
}

export function useAppState(data: AppData): AppState {
  return useSyncExternalStore(data.subscribe, data.getState);
}

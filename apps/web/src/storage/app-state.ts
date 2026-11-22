import {
  cleanFormName,
  formatSetlist,
  parseSetlist,
  removeForm,
  renameForm,
  type VoicePart,
} from "@takt/format";
import { useSyncExternalStore } from "react";
import { detectLanguage, type Language } from "../i18n/index.ts";
import { retargetForm } from "../setlist/model.ts";
import { type Bundle, createBundle } from "./bundle.ts";
import { slugify, uniqueId } from "./slug.ts";
import type { SongStore, StoredFile } from "./types.ts";
import {
  DEFAULT_VIEW_OPTIONS,
  type ViewOptionKey,
  type ViewOptions,
  type ViewOverrides,
  withOverride,
} from "./view-options.ts";

export type Theme = "system" | "light" | "dark";
export type ChordSize = "s" | "m" | "l";
export type InstrumentChoice = "harmony" | "guitar" | "bass" | "keys" | "drums" | "vocals";

/** Device settings (ADR 0008): stored locally, never in `.takt` files. */
/** Device settings (ADR 0008); the view options here are the "everywhere" level of the cascade. */
export interface Settings extends ViewOptions {
  language: Language;
  /** Note naming on screen, independent of how a file is written. */
  notation: "H" | "B";
  theme: Theme;
  instrument: InstrumentChoice;
  /** The singer's part in the vocal view; null shows every singer's cues. */
  voicePart: VoicePart | null;
  /** Size of chord names on the song screen. */
  chordSize: ChordSize;
  /** When the last full backup was exported from this device (ms since the epoch), null if never. */
  lastBackupAt: number | null;
  /** The setlist that was open last: the "Service" section returns to it. */
  lastSetlistId: string | null;
  /** The "install the app" hint was dismissed on this device. */
  installHintDismissed: boolean;
}

/** View options set for one song or one setlist, by id (ADR 0009). */
export interface ViewOverrideLevels {
  song: Record<string, ViewOverrides>;
  setlist: Record<string, ViewOverrides>;
}

/** An example song shipped with the app. */
export interface SeedSong {
  name: string;
  text: string;
  /** True for the examples of the first release (see `AppData.load`). */
  original?: boolean;
}

export interface AppState {
  songs: StoredFile[];
  setlists: StoredFile[];
  viewOverrides: ViewOverrideLevels;
  /** Personal notes by song id, then by anchor key (see notes/anchors.ts). Never written into .takt files. */
  personalNotes: Record<string, Record<string, string>>;
  settings: Settings;
}

/**
 * The text of a bundle's setlist with its entries pointed at the ids the bundle's songs have on
 * this device. A setlist whose songs kept their ids is returned exactly as it was written.
 */
function retargetSongs(text: string, placed: ReadonlyMap<string, string>): string {
  const { setlist } = parseSetlist(text);
  if (setlist.entries.every((entry) => (placed.get(entry.song) ?? entry.song) === entry.song))
    return text;
  return formatSetlist({
    ...setlist,
    entries: setlist.entries.map((entry) => ({
      ...entry,
      song: placed.get(entry.song) ?? entry.song,
    })),
  });
}

export function defaultSettings(preferredLanguages: readonly string[]): Settings {
  const language = detectLanguage(preferredLanguages);
  return {
    language,
    // First-run default: H-notation for a Ukrainian UI, English naming otherwise (ADR 0010).
    notation: language === "uk" ? "H" : "B",
    theme: "system",
    instrument: "harmony",
    voicePart: null,
    chordSize: "m",
    ...DEFAULT_VIEW_OPTIONS,
    lastBackupAt: null,
    lastSetlistId: null,
    installHintDismissed: false,
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

  /**
   * Loads everything from the store and adds the example songs (`seed`) this device has not
   * been given yet. Each example is offered once: deleting it does not bring it back, and an
   * example added in a later version reaches devices that already use the app.
   */
  static async load(
    store: SongStore,
    options: { preferredLanguages: readonly string[]; seed?: SeedSong[] },
  ): Promise<AppData> {
    const saved = await store.getSettings();
    const settings = { ...defaultSettings(options.preferredLanguages) };
    for (const key of Object.keys(settings) as (keyof Settings)[]) {
      if (saved[key] !== undefined) (settings as Record<string, unknown>)[key] = saved[key];
    }
    const data = new AppData(store, {
      songs: await store.listSongs(),
      setlists: await store.listSetlists(),
      viewOverrides: {
        song: (saved.viewOverridesSong as ViewOverrideLevels["song"] | undefined) ?? {},
        setlist: (saved.viewOverridesSetlist as ViewOverrideLevels["setlist"] | undefined) ?? {},
      },
      personalNotes: (saved.personalNotes as AppState["personalNotes"] | undefined) ?? {},
      settings,
    });
    const seed = options.seed ?? [];
    // Before the list existed a device only recorded that it had been seeded: it had
    // received the examples marked `original`.
    const given = new Set<string>(
      Array.isArray(saved.seededSongs)
        ? (saved.seededSongs as string[])
        : saved.seeded === true
          ? seed.filter((song) => song.original).map((song) => song.name)
          : [],
    );
    const fresh = seed.filter((song) => !given.has(song.name));
    if (fresh.length > 0 || !Array.isArray(saved.seededSongs)) {
      // An example whose id is already taken (the musician has their own file) is not added.
      const taken = new Set(data.state.songs.map((song) => song.id));
      await data.importSongs(fresh.filter((song) => !taken.has(slugify(song.name))));
      await store.setSetting("seededSongs", [...given, ...fresh.map((song) => song.name)]);
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
    return createBundle(
      { songs: this.state.songs, setlists: this.state.setlists, notes: this.state.personalNotes },
      now,
    );
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
   * never overwrites what is on the device. The bundle's setlists and notes follow its songs
   * to the ids they have here.
   */
  async importBundle(
    bundle: Bundle,
    now = Date.now(),
  ): Promise<{ added: number; unchanged: number }> {
    // Where each song of the bundle lives on this device: an identical song that is already
    // here, under whatever id it has, or the id the new copy is stored under.
    const here = new Map(this.state.songs.map((song) => [song.text, song.id]));
    const fresh = bundle.songs.filter((song) => !here.has(song.text));
    const added = await this.importSongs(
      fresh.map((song) => ({ name: song.id, text: song.text })),
      now,
    );
    const placed = new Map<string, string>();
    for (const song of bundle.songs) {
      const id = here.get(song.text) ?? added[fresh.indexOf(song)]?.id;
      if (id !== undefined) placed.set(song.id, id);
    }

    const known = new Set(this.state.setlists.map((setlist) => setlist.text));
    const taken = new Set(this.state.setlists.map((setlist) => setlist.id));
    for (const setlist of bundle.setlists) {
      const text = retargetSongs(setlist.text, placed);
      if (known.has(text)) continue;
      const id = uniqueId(slugify(setlist.id), taken);
      taken.add(id);
      await this.saveSetlist({ id, text, updatedAt: now });
    }
    // Notes of a backup come back for the songs they belong to, where those have none yet.
    if (bundle.notes) {
      const notes = { ...this.state.personalNotes };
      for (const [song, songNotes] of Object.entries(bundle.notes)) {
        const id = placed.get(song);
        if (id !== undefined && !notes[id]) notes[id] = songNotes;
      }
      await this.saveNotes(notes);
    }
    return { added: fresh.length, unchanged: bundle.songs.length - fresh.length };
  }

  /** Sets a personal note at an anchor of a song; empty text removes it. */
  async setPersonalNote(songId: string, anchor: string, text: string): Promise<void> {
    const songNotes = { ...this.state.personalNotes[songId] };
    const trimmed = text.trim();
    if (trimmed) songNotes[anchor] = trimmed;
    else delete songNotes[anchor];
    const notes = { ...this.state.personalNotes };
    if (Object.keys(songNotes).length > 0) notes[songId] = songNotes;
    else delete notes[songId];
    await this.saveNotes(notes);
  }

  private async saveNotes(notes: AppState["personalNotes"]): Promise<void> {
    this.update({ personalNotes: notes });
    await this.store.setSetting("personalNotes", notes);
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
    await this.dropOverrides("setlist", id);
    if (this.state.settings.lastSetlistId === id) await this.setSetting("lastSetlistId", null);
  }

  // Saves update the in-memory state first and then write to the store, so the screen
  // (and the next edit, which starts from the state) never waits for the disk.
  async saveSong(song: StoredFile): Promise<void> {
    this.update({ songs: [...this.state.songs.filter((s) => s.id !== song.id), song] });
    await this.store.putSong(song);
  }

  /**
   * Renames a version of a song (ADR 0013); setlists on this device that play it follow.
   * Resolves once the song and the setlists are stored together.
   */
  async renameSongForm(id: string, from: string, to: string, now = Date.now()): Promise<void> {
    const song = this.state.songs.find((s) => s.id === id);
    if (!song) return;
    const text = renameForm(song.text, from, to);
    if (text === song.text) return;
    await this.saveWithSetlists({ id, text, updatedAt: now }, from, cleanFormName(to), now);
  }

  /**
   * Deletes a version of a song; setlists on this device that play it go back to the main one.
   * Resolves once the song and the setlists are stored together.
   */
  async removeSongForm(id: string, name: string, now = Date.now()): Promise<void> {
    const song = this.state.songs.find((s) => s.id === id);
    if (!song) return;
    const text = removeForm(song.text, name);
    if (text === song.text) return;
    await this.saveWithSetlists({ id, text, updatedAt: now }, name, null, now);
  }

  /**
   * A song and the setlists that play one of its versions change as one: they are written in
   * one transaction, and the state follows only once it is stored, so a reload or a closed app
   * never finds the song changed and its setlists not (or the other way round).
   */
  private async saveWithSetlists(
    song: StoredFile,
    from: string,
    to: string | null,
    now: number,
  ): Promise<void> {
    const setlists: StoredFile[] = [];
    for (const stored of this.state.setlists) {
      const next = retargetForm(parseSetlist(stored.text).setlist, song.id, from, to);
      if (next) setlists.push({ id: stored.id, text: formatSetlist(next), updatedAt: now });
    }
    await this.store.putFiles({ songs: [song], setlists });
    const changed = new Map(setlists.map((setlist) => [setlist.id, setlist]));
    this.update({
      songs: [...this.state.songs.filter((s) => s.id !== song.id), song],
      setlists: this.state.setlists.map((setlist) => changed.get(setlist.id) ?? setlist),
    });
  }

  async deleteSong(id: string): Promise<void> {
    await this.store.deleteSong(id);
    this.update({ songs: this.state.songs.filter((song) => song.id !== id) });
    await this.dropOverrides("song", id);
    if (this.state.personalNotes[id]) {
      const notes = { ...this.state.personalNotes };
      delete notes[id];
      await this.saveNotes(notes);
    }
  }

  /** Sets one view option for a song or a setlist; `undefined` goes back to the inherited value. */
  async setViewOverride(
    scope: "song" | "setlist",
    id: string,
    key: ViewOptionKey,
    value: boolean | undefined,
  ): Promise<void> {
    const level = { ...this.state.viewOverrides[scope] };
    const next = withOverride(level[id], key, value);
    if (next) level[id] = next;
    else delete level[id];
    await this.saveOverrides(scope, level);
  }

  private async saveOverrides(
    scope: "song" | "setlist",
    level: Record<string, ViewOverrides>,
  ): Promise<void> {
    this.update({ viewOverrides: { ...this.state.viewOverrides, [scope]: level } });
    await this.store.setSetting(
      scope === "song" ? "viewOverridesSong" : "viewOverridesSetlist",
      level,
    );
  }

  private async dropOverrides(scope: "song" | "setlist", id: string): Promise<void> {
    if (!(id in this.state.viewOverrides[scope])) return;
    const level = { ...this.state.viewOverrides[scope] };
    delete level[id];
    await this.saveOverrides(scope, level);
  }

  async setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    this.update({ settings: { ...this.state.settings, [key]: value } });
    await this.store.setSetting(key, value);
  }
}

export function useAppState(data: AppData): AppState {
  return useSyncExternalStore(data.subscribe, data.getState);
}

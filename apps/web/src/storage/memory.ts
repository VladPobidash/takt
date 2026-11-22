import type { SongStore, StoredFile } from "./types.ts";

/** A store that forgets everything on reload: for tests, and when IndexedDB is not available. */
export function createMemoryStore(): SongStore {
  const songs = new Map<string, StoredFile>();
  const setlists = new Map<string, StoredFile>();
  const settings: Record<string, unknown> = {};
  return {
    listSongs: async () => [...songs.values()],
    putSong: async (file) => void songs.set(file.id, file),
    deleteSong: async (id) => void songs.delete(id),
    listSetlists: async () => [...setlists.values()],
    putSetlist: async (file) => void setlists.set(file.id, file),
    deleteSetlist: async (id) => void setlists.delete(id),
    putFiles: async (files) => {
      for (const file of files.songs) songs.set(file.id, file);
      for (const file of files.setlists) setlists.set(file.id, file);
    },
    getSettings: async () => ({ ...settings }),
    setSetting: async (key, value) => {
      settings[key] = value;
    },
  };
}

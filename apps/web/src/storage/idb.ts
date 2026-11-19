import { type DBSchema, openDB } from "idb";
import type { SongStore, StoredFile } from "./types.ts";

interface TaktDB extends DBSchema {
  songs: { key: string; value: StoredFile };
  setlists: { key: string; value: StoredFile };
  settings: { key: string; value: unknown };
}

const DB_NAME = "takt";
/** Bump when stores change and add a step to `upgrade`. */
const DB_VERSION = 1;

/** Opens the IndexedDB store. Rejects when IndexedDB is unavailable (some private modes). */
export async function openIdbStore(): Promise<SongStore> {
  const db = await openDB<TaktDB>(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore("songs", { keyPath: "id" });
        database.createObjectStore("setlists", { keyPath: "id" });
        database.createObjectStore("settings");
      }
    },
  });
  return {
    listSongs: () => db.getAll("songs"),
    putSong: async (file) => void (await db.put("songs", file)),
    deleteSong: (id) => db.delete("songs", id),
    listSetlists: () => db.getAll("setlists"),
    putSetlist: async (file) => void (await db.put("setlists", file)),
    deleteSetlist: (id) => db.delete("setlists", id),
    getSettings: async () => {
      const [keys, values] = await Promise.all([db.getAllKeys("settings"), db.getAll("settings")]);
      return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
    },
    setSetting: async (key, value) => void (await db.put("settings", value, key)),
  };
}

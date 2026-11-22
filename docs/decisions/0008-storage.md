# 0008. Storage: `.takt` text in IndexedDB behind an adapter, JSON bundles for exchange

- **Status:** accepted
- **Date:** 2026-11-19
- **Decided by:** Claude Code under the author's delegation of 2026-11-19 ("decide yourself") — open to revision.

## Context

Songs and setlists live only on the device ([ADR 0001](0001-local-first.md)). Later they should be able to live in a real folder (a cloud-synced folder on desktop, native files in a wrapper) without rewriting the app. The band exchanges files in a messenger.

| Option | For | Against |
| --- | --- | --- |
| **IndexedDB** | Works in every target browser, including installed iOS web apps; transactions; fine for a few hundred small texts | Not visible to the user as files |
| OPFS (origin private file system) | File-like API | Still invisible to the user, so no gain over IndexedDB; more code |
| File System Access API (real folder) | Real files, cloud-synced folders | Desktop Chromium only — no phone support |

For the bundle: a zip needs a compression library and cannot be read as text; a JSON file needs nothing and still opens in any editor.

## Decision

- **The `.takt` text is the stored value.** A song record is `{ id, text, updatedAt }`; nothing parsed is persisted. Setlists are stored the same way as `.taktset` text.
- **Ids are file names without the extension** (`silent-night`), made from the title for new songs (lowercase, hyphens, any script). Setlists refer to songs by id, as in [format.md](../format.md).
- **Adapter interface** (`SongStore`): list, get, put, delete for songs and setlists, plus a change subscription. First implementation: IndexedDB through the `idb` wrapper (about 1 kB). An in-memory implementation serves tests. A folder-based implementation can be added later without touching screens.
- **Local database** (same IndexedDB, separate object stores, versioned schema with migrations): device settings (instrument, note naming, language, theme, chord size) now; view-option layers and personal notes when those features are built. None of it goes into `.takt` files.
- **Exchange:** a song is exported as its `.takt` file. A setlist with its songs, and a full backup, are one JSON file with the extension `.taktbundle`: `{ "format": "takt-bundle", "version": 1, "setlists": [{ id, text }], "songs": [{ id, text }], "settings"?: {…} }`. Importing a bundle never overwrites: a song that is already on the device with the same text is skipped, and one with the same id but another text is stored next to it under a numbered id. The bundle's setlists (and, in a backup, its notes) are pointed at the ids its songs have on the device, so a shared setlist always plays the songs it came with (fixed on 2026-11-22: it used to keep the bundle's ids and could open an older song of the same name).
- **Reminder:** the library shows when the last backup was made and nudges after changes; settings have "Export everything".
- **Anchors for personal notes:** the section's name, which section of that name it is, then the line and the bar inside it (`bridge#1/0/3`); a note on a whole section has no line and bar. Adding, removing or editing other sections does not move a note; renaming its section or inserting bars before it in the same line does. Notes are stored per song id on the device, travel in a full backup and never in a shared setlist.

## Consequences

- One new runtime dependency in the app: `idb`.
- Parsing happens on read; a few hundred songs parse in milliseconds, so no cache of parsed songs is needed.
- The bundle is readable and diffable, but larger than a zip — irrelevant at these sizes.
- Clearing site data deletes everything: the backup reminder is not optional.

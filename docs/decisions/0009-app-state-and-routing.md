# 0009. App state, routing and the view-option cascade

- **Status:** accepted
- **Date:** 2026-11-19
- **Decided by:** Claude Code under the author's delegation of 2026-11-19 ("decide yourself") — open to revision.

## Context

The app has few screens (service, library, song, editor, settings) and its data is small and local. It must restore where the musician was, support deep links, and work offline as an installed app.

| Topic | Chosen | Alternatives and why not |
| --- | --- | --- |
| Router | `wouter` 3 (about 2 kB), History API paths | React Router 8 / TanStack Router: loaders, nested data routes and type generation that five screens do not need. Hash routing: works without server help, but uglier links |
| State | React state + small external stores read with `useSyncExternalStore` | Zustand / Jotai: fine libraries, but the stores here are the storage layer and the settings — two subscriptions do not need one |

## Decision

- **Routes:**
  - `/` — the current setlist if one was opened last, otherwise the library
  - `/library`, `/settings`
  - `/songs/:id` — a song from the library; `/songs/:id/edit` — the editor
  - `/setlists/:id` — a service map; `/setlists/:id/:position` — the n-th song of that setlist (1-based)
  - a section is addressed by a fragment: `#s3`
- Unknown paths show the library. The host serves `index.html` for every path; offline, the service worker does the same.
- **State:** the storage layer ([ADR 0008](0008-storage.md)) is the single source of truth for songs, setlists and settings and notifies subscribers. Screens derive everything else (parsed song, resolved view) with `useMemo`. Transient view state (transposition, capo, chosen instrument tab) is component state; the instrument and note naming defaults come from settings.
- **View options** are sparse objects on three levels — song, setlist, everywhere. The value of an option is the first one defined in that order; "Reset" deletes the key on the current level. Until the three-level sheet is built (stretch), only the "everywhere" level exists, edited in Settings.
- **Per-song key and "tonight" note of a setlist** live in the `.taktset` file, so they travel with the bundle.

## Consequences

- Two small runtime dependencies in total for routing and storage; no state library.
- Deep links work after install and offline.
- If screens grow data-heavy, a router with loaders can replace `wouter` without changing the URL scheme.

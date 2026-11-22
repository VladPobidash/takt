# 0015. Product name: vtakt; the format stays `.takt`

- **Status:** accepted
- **Date:** 2026-11-22
- **Decided by:** the author (the name and its spelling); the scope of the rename by Claude Code under the author's delegation of 2026-11-19, agreed with the author the same day.

## Context

"Takt" was a working name ([roadmap](../roadmap.md#open-questions)). `takt.app` was taken; the author bought **vtakt.me** — «в такт», Ukrainian for "in time" — and wants the app to carry the name of its address ([ADR 0011](0011-hosting.md)). A rename can reach many layers: what people see, the file format, package names, the repository, the database on devices, hosting. Each has a different cost.

| Layer | Renamed? | Why |
| --- | --- | --- |
| What people see: the installed app's name, the page title, UI texts, README and docs prose | **Yes → `vtakt`** | It is what a band member reads and says |
| The format and its files: `.takt`, `.taktset`, `.taktbundle`, `"format": "takt-bundle"` | No | «Такт» is a bar — the name describes the format; the band's files already exist; the extension is short |
| Packages `@takt/format`, `@takt/web`, code identifiers | No | Invisible to users; a rename touches every import for no gain |
| IndexedDB database `takt` | No | Renaming it would hide the songs already stored on devices |
| Repository, Railway project | **Yes → `vtakt`**, by the author later the same day | `VladPobidash/vtakt` and the Railway project `vtakt`. GitHub redirects the old repository name. Only the author could do it: the cloud sessions and Railway's link to GitHub are tied to the repository |

## Decision

- The product is called **vtakt**, written in lower case everywhere, like the domain — also at the start of a sentence and in the app's manifest (`name` and `short_name`).
- The format is still "the `.takt` format"; a song file is a `.takt` file. Nothing about the format, the bundles, the packages or the storage changes.
- Docs say "vtakt" for the product. Earlier ADRs keep the name they were written with.

## Consequences

- An app installed before the rename keeps the label "Takt" on the home screen until it is installed again; browsers read the manifest name at install time.
- The app icons still show the letter T. A new mark is a design task, not part of this change.
- Two names live side by side — vtakt the app, the repository and the hosting project; takt the format, the packages and the database. `CLAUDE.md` says which is which, so nobody "finishes" the rename in passing.

# Takt

**Bar-based chord charts for instrumentalists. One arrangement — a view for every instrument.**

Takt is for musicians who play from chords, not sheet music: a busker with a guitar, a four-piece band, a church team with ten instruments and an eight-song set. You write a song once as bars with chord durations; the guitarist sees capo shapes, the bassist sees their passing chords, the keys player sees their part — on a phone or a laptop, offline.

```
## Verse 1
| D | A | D/F#** G** | Asus4* A*** |
@bass | D | A | F#** G** | A |
```

> Status: **pre-alpha.** The format library works; the app shows songs per instrument (capo, transposition, H/B naming) and imports `.takt` files. Songs can be written and edited in the app with a live preview and warnings. It installs as a PWA and works offline. No setlists or export yet. First real-world test: a worship night on 12 December 2026.

## Principles

- **Simple over complete** — chords, bars and cues, not notation.
- **Plain text is the source of truth** — `.takt` files are readable and editable without the app.
- **Local-first** — your songs live on your device; no server-side library. Sync later goes through *your* cloud (Drive, OneDrive, iCloud, Dropbox).
- **Offline on stage.**
- **Open format**, compatible with ChordPro grid where possible.

## Docs

- [Product brief](docs/brief.md) — problem, existing tools, vision, features
- [`.takt` format v0](docs/format.md)
- [Roadmap & open questions](docs/roadmap.md)
- [Design system](docs/design/README.md) · [MVP screens v1](docs/design/mvp-v1/README.md) · [design brief](docs/design/brief.md)
- [Decisions (ADR)](docs/decisions/) · [technical planning](docs/tech-planning.md)

## Development

Requires Node 22.12 or newer (CI uses Node 24) and [pnpm](https://pnpm.io) 12.

```
pnpm install
pnpm verify    # lint + format check, type check, tests, build — the same as CI
pnpm fix       # apply lint and format fixes
pnpm e2e       # browser smoke tests in a phone viewport (needs Playwright's Chromium)
```

- `packages/format` — `@takt/format`: the `.takt` parser and tools. No runtime dependencies, no DOM.
- `apps/web` — the app (React, Vite, Tailwind CSS). `pnpm --filter @takt/web dev` starts it.

Work is tracked in [issues](https://github.com/VladPobidash/takt/issues/1); changes reach `main` through pull requests.

## License

[Apache-2.0](LICENSE)

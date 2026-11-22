# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

vtakt («в такт», "in time"; <https://vtakt.me>) — bar-based chord charts for instrumentalists: one arrangement, a view for every instrument (guitar with capo, bass, keys, drums). Lyrics are optional. Open source (Apache-2.0), built first for the author's own band; a worship night on 2026-12-12 is the first real test, with weekly Saturday services before it as smaller tests.

## Read before working

1. `docs/brief.md` — problem, vision, principles, features
2. `docs/format.md` — the `.takt` format v0 (the core of the product)
3. `docs/roadmap.md` — current stage and open questions
4. `docs/decisions/` — accepted decisions (ADR); do not contradict them silently
5. `docs/tech-planning.md` — what still has to be decided before code

## Non-negotiable principles

- **Simple over complete.** Chords, bars, cues. No staff notation.
- **Plain text is the source of truth.** A `.takt` file must stay readable and hand-editable.
- **Accept how musicians already write.** `| E*** G* |`, empty bars, `A - E`, `(2x)`, H/B notation must parse.
- **Local-first.** No server-side storage of user content. A stateless helper server is acceptable only if an ADR says so.
- **Offline on stage.** Nothing on the playing path may need the network.
- **Mobile-first; tablets and desktops supported.** Modern devices only — no work for old phones or old browsers ([ADR 0003](docs/decisions/0003-ui-kit.md)).

## Current state

- Code: the format library (`packages/format`) is complete for the MVP; the app (`apps/web`) has the song screen (instrument views, capo, transposition, H/B), the library with file import, the editor (text, live preview, parser warnings, new and delete) and the settings screen. It installs as a PWA and works offline. A song can be exported as a `.takt` file and everything as one `.taktbundle` backup. Setlists (the service map) hold songs in order with a key and a note for the night, and are played through with buttons, swipes, arrow keys or a pedal. Compact mode shows the whole song on one screen. From 64rem wide a song opened from a setlist has the setlist in a sidebar. Auto-scroll follows the song at its tempo. View options cascade from the song to the setlist to everywhere. Personal notes on bars and sections live on the device only. Since 2026-11-22: lyrics are shown under a section's bars (a view option); a vocal view shows structure, lengths in bars, cues and lyrics without chords, with voice parts (`@vocals`, `@soprano`, `@alto`, `@tenor`); a song has named versions — forms over the same sections, `form <name>: …` in the header ([ADR 0013](docs/decisions/0013-song-forms.md)) — chosen on the song screen and per setlist entry, edited without typing; Settings show the app's version and check for updates on request ([ADR 0014](docs/decisions/0014-app-version.md)). `@takt/format` can compare two texts of a song bar by bar (`diffSongs`), ready for change history and band sync — no screen uses it yet. Every feature issue of the MVP backlog is built; what remains is checking on real devices and entering the band's songs. **Design v1 accepted 2026-10-26.** Follow `docs/design/README.md` (tokens, components, scrollbars, localisation rules) for any UI work; the accepted MVP screens are in `docs/design/mvp-v1/` (screenshots + Claude Design sources — reference, not code to port).
- **Workflow (authorised by the author on 2026-11-19):** work is tracked in GitHub issues under the MVP tracking issue (`VladPobidash/vtakt#1`). One issue → one small pull request that names the issue it closes (`Closes #N`, or "partly done" when it is not finished). When CI is green, Claude squash-merges its own pull request and starts the next one from the updated `main`; the author does not review each one. A red CI is fixed, never bypassed. Several lead agents may work in parallel, each in its own session and branch: update the branch from `main` before merging.
- **Version ([ADR 0014](docs/decisions/0014-app-version.md)):** every pull request that changes what the app ships (sources of `apps/web` or `packages/format`, tests aside) raises `version` in `apps/web/package.json` — a feature → `0.(x+1).0`, a fix → `0.x.(y+1)`. CI fails without it (`scripts/check-version.mjs`). If `main` took your number meanwhile, update from `main` and raise it again.
- **Decisions:** technical planning continues in `docs/tech-planning.md`. On 2026-11-19 the author delegated the remaining technical decisions: decide, write the ADR as accepted with a "Decided by" line, keep working, do not stop to ask. Product-level changes (scope, principles, the format's meaning for musicians) are still reported clearly.
- **Accepted so far:** app stack ([ADR 0003](docs/decisions/0003-ui-kit.md): React 19 + TypeScript, shadcn/ui on Base UI, Tailwind CSS v4, bar grid as plain DOM, modern browsers only, 150 kB gzip JavaScript budget for the song screen); repository and tooling ([ADR 0004](docs/decisions/0004-repo-structure-and-tooling.md): pnpm monorepo, TypeScript 7, Biome, Vite 8, `pnpm verify`); format library ([ADR 0005](docs/decisions/0005-format-library.md): `parse` → document with spans and diagnostics, `resolveSong` → view for an instrument, never throw, rewrite text by spans); testing ([ADR 0006](docs/decisions/0006-testing.md): Vitest, test-first parser, fast-check).
- **Also accepted (delegated):** PWA only, precached, updates never interrupt playing ([ADR 0007](docs/decisions/0007-platform-pwa.md)); `.takt` text in IndexedDB (`idb`) behind a `SongStore` adapter, `.taktbundle` JSON for exchange ([ADR 0008](docs/decisions/0008-storage.md)); `wouter` routes, no state library ([ADR 0009](docs/decisions/0009-app-state-and-routing.md)); typed message tables + `Intl`, no i18n library ([ADR 0010](docs/decisions/0010-localisation.md)); Railway static hosting, no telemetry ([ADR 0011](docs/decisions/0011-hosting.md)).
- **Production:** <https://vtakt.me> («в такт»; the domain was bought on Railway on 2026-11-22) — Railway project `vtakt`, service `web`, built from `main` of `VladPobidash/vtakt` (`pnpm build`, `pnpm start`). Since 2026-11-22 **Railway releases every push to `main` by itself, after CI is green** — do not start a second deploy; after merging a change to the app, wait for the release and check the site (Settings show the version). `scripts/deploy-railway.sh` remains as a manual release for when that fails. `vtakt.me` is the only address: the Railway-generated one of the first days was deleted, and apps installed from it no longer update. The cloud environment holds the Railway API token for `backboard.railway.com` and may reach `vtakt.me`, so a release can be checked after a merge.
- Auto-scroll follows a `performance.now()` anchor, bar by bar, and highlights sections only ([ADR 0012](docs/decisions/0012-timing.md)).

## Conventions

- **Names ([ADR 0015](docs/decisions/0015-product-name.md)):** the product people see is **vtakt**, written in lower case like the domain. The repository (`VladPobidash/vtakt`) and the Railway project carry the same name since 2026-11-22. The format and its files stay `.takt` / `.taktset` / `.taktbundle`, and the packages (`@takt/*`) and the IndexedDB database keep the name `takt`. Do not rename those in passing.
- Everything in the repo is in English: docs, code, identifiers, comments, commit messages. UI strings: UA + EN. Song content (titles, cues, lyrics) can be in any language. The author may talk to you in Ukrainian — reply in his language, but write repo content in English.
- Architecture-level choices → new ADR (`docs/decisions/NNNN-name.md`, template in `docs/decisions/README.md`).
- Format changes → update `docs/format.md` in the same change, with an example.
- Parser work is test-first; real lines from the band's charts live in `docs/format.md` → "Parser test cases".
- `examples/`: chords and structure only — **never commit lyrics of copyrighted songs**.
- Note naming: in H-notation `H` = B natural and `B` = B♭. Never assume English naming silently.
- Keep changes small and reviewable; ask before restructuring the repo.

## Repository layout

```
CLAUDE.md            this file
README.md            public overview (EN)
LICENSE              Apache-2.0
package.json         root scripts (check, fix, typecheck, test, build, verify)
pnpm-workspace.yaml  workspaces: apps/*, packages/*
biome.json           lint + format (Biome)
tsconfig.base.json   shared TypeScript settings
.github/workflows/   CI: pnpm verify on every pull request and push to main
packages/
  format/            @takt/format — .takt parser and tools; zero runtime dependencies, no DOM
apps/
  web/               @takt/web — the app (React, Vite, Tailwind v4)
    src/styles/      app.css: design tokens as CSS variables + Tailwind theme
    src/i18n/        en.ts (source of keys), uk.ts, translate()
    src/storage/     SongStore adapter (IndexedDB, memory), AppData (songs, setlists, settings, view overrides), bundles
    src/song/        song screen: view model (view.ts), bar grid, section tiles, form timeline, playback (auto-scroll)
    src/editor/      editor screen: text, live preview, warnings, quick-symbol bar
    src/library/     library screen (list, search, file import, new song)
    src/notes/       personal notes: anchors (section name + occurrence + line + bar), note dialog
    src/setlist/     service map (setlists): model.ts, service map screen, song inside a setlist
    src/settings/    settings screen
    src/ui/          shared pieces: top bar, icons, SearchableSelect (Base UI Combobox), ConfirmDialog, save-file
    e2e/             Playwright smoke tests (phone viewport, offline start)
    server.mjs       dependency-free static server for production (`pnpm start`)
docs/
  brief.md           product brief
  format.md          .takt format spec v0
  roadmap.md         stages + open questions
  tech-planning.md   technical decisions and questions
  design/            design system (README.md), design brief
    mvp-v1/          accepted MVP screens: screenshots + Claude Design sources
  decisions/         ADRs
  ideas/             future features, not in the MVP (e.g. change history)
scripts/             deploy-railway.sh — release the latest main to Railway through its API
                     check-version.mjs — CI check: a change to the app raises its version
examples/            sample .takt files (no copyrighted lyrics): parser and test fixtures; only silent-night is given to devices
```

## Commands

- `pnpm install` — install (pnpm 12 is pinned in `packageManager`; Node >= 22.12).
- `pnpm verify` — everything CI runs: `pnpm check` (Biome), `pnpm typecheck`, `pnpm test` (Vitest), `pnpm build`. Run it before every commit.
- `pnpm fix` — apply Biome fixes and formatting.
- `node scripts/check-version.mjs` — what CI checks about the version, against `origin/main`.
- `pnpm e2e` — Playwright smoke tests in a phone viewport against the production build (CI runs them after `verify`). Their build sets `VITE_SEED_FIXTURES=1`, which also seeds the band's three example charts from `examples/`; the released app ships only Silent Night (`apps/web/src/seed.ts`).
- One package: `pnpm --filter @takt/format test`. Run the app: `pnpm --filter @takt/web dev` (or `build` + `preview`).
- UI strings go through `t()` with keys from `apps/web/src/i18n/en.ts`; `uk.ts` must have the same keys (the type checker enforces it). Colours come from the tokens in `apps/web/src/styles/app.css`, never from literals in components.
- Screen edges and keyboard (`apps/web/src/ui/viewport.ts`, ADR 0007): the app root follows `window.visualViewport`. For the home-indicator inset use `var(--safe-bottom)`, never `env(safe-area-inset-bottom)` directly; a bar with a fixed height and that padding needs `box-content`. Do not size anything with `100vh` / `100dvh` — use `h-full` inside the root or `var(--app-height)`. Compact mode (`apps/web/src/song/compact.ts`) lays the whole song on one grid — the same columns in every section, one bar per column, so every bar has the same width — and shrinks to fit the screen; sizes inside it multiply by `var(--compact-scale)`.
- Base UI (`@base-ui/react`) is heavy: any screen that imports it is loaded with `React.lazy` (see `App.tsx`), so the song screen stays inside its JavaScript budget.
- Relative imports use the `.ts` extension; no enums or namespaces (`erasableSyntaxOnly`).

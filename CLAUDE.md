# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

Takt — bar-based chord charts for instrumentalists: one arrangement, a view for every instrument (guitar with capo, bass, keys, drums). Lyrics are optional. Open source (Apache-2.0), built first for the author's own band; a worship night on 2026-12-12 is the first real test, with weekly Saturday services before it as smaller tests.

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

- Code: the format library (`packages/format`) is complete for the MVP; the app (`apps/web`) has the song screen (instrument views, capo, transposition, H/B), the library with file import and the settings screen. It installs as a PWA and works offline. Not built yet: service map, editor, export and backup, compact mode. **Design v1 accepted 2026-10-26.** Follow `docs/design/README.md` (tokens, components, scrollbars, localisation rules) for any UI work; the accepted MVP screens are in `docs/design/mvp-v1/` (screenshots + Claude Design sources — reference, not code to port).
- **Workflow (authorised by the author on 2026-11-19):** work is tracked in GitHub issues under the MVP tracking issue (`VladPobidash/takt#1`). One issue → one small pull request that names the issue it closes (`Closes #N`, or "partly done" when it is not finished). When CI is green, Claude squash-merges its own pull request and starts the next one from the updated `main`; the author does not review each one. A red CI is fixed, never bypassed.
- **Decisions:** technical planning continues in `docs/tech-planning.md`. On 2026-11-19 the author delegated the remaining technical decisions: decide, write the ADR as accepted with a "Decided by" line, keep working, do not stop to ask. Product-level changes (scope, principles, the format's meaning for musicians) are still reported clearly.
- **Accepted so far:** app stack ([ADR 0003](docs/decisions/0003-ui-kit.md): React 19 + TypeScript, shadcn/ui on Base UI, Tailwind CSS v4, bar grid as plain DOM, modern browsers only, 150 kB gzip JavaScript budget for the song screen); repository and tooling ([ADR 0004](docs/decisions/0004-repo-structure-and-tooling.md): pnpm monorepo, TypeScript 7, Biome, Vite 8, `pnpm verify`); format library ([ADR 0005](docs/decisions/0005-format-library.md): `parse` → document with spans and diagnostics, `resolveSong` → view for an instrument, never throw, rewrite text by spans); testing ([ADR 0006](docs/decisions/0006-testing.md): Vitest, test-first parser, fast-check).
- **Also accepted (delegated):** PWA only, precached, updates never interrupt playing ([ADR 0007](docs/decisions/0007-platform-pwa.md)); `.takt` text in IndexedDB (`idb`) behind a `SongStore` adapter, `.taktbundle` JSON for exchange ([ADR 0008](docs/decisions/0008-storage.md)); `wouter` routes, no state library ([ADR 0009](docs/decisions/0009-app-state-and-routing.md)); typed message tables + `Intl`, no i18n library ([ADR 0010](docs/decisions/0010-localisation.md)); Railway static hosting, no telemetry ([ADR 0011](docs/decisions/0011-hosting.md)).
- **Not decided yet:** metronome and auto-scroll timing (issue #8, stretch).

## Conventions

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
    src/storage/     SongStore adapter (IndexedDB, memory), AppData (songs + settings)
    src/song/        song screen: view model (view.ts), bar grid, section tiles, form timeline
    src/library/     library screen (list, search, file import)
    src/settings/    settings screen
    src/ui/          shared pieces (top bar, icons)
    e2e/             Playwright smoke tests (phone viewport, offline start)
docs/
  brief.md           product brief
  format.md          .takt format spec v0
  roadmap.md         stages + open questions
  tech-planning.md   technical decisions and questions
  design/            design system (README.md), design brief
    mvp-v1/          accepted MVP screens: screenshots + Claude Design sources
  decisions/         ADRs
  ideas/             future features, not in the MVP (e.g. change history)
examples/            sample .takt files (no copyrighted lyrics); also parser fixtures
```

## Commands

- `pnpm install` — install (pnpm 12 is pinned in `packageManager`; Node >= 22.12).
- `pnpm verify` — everything CI runs: `pnpm check` (Biome), `pnpm typecheck`, `pnpm test` (Vitest), `pnpm build`. Run it before every commit.
- `pnpm fix` — apply Biome fixes and formatting.
- `pnpm e2e` — Playwright smoke tests in a phone viewport against the production build (CI runs them after `verify`).
- One package: `pnpm --filter @takt/format test`. Run the app: `pnpm --filter @takt/web dev` (or `build` + `preview`).
- UI strings go through `t()` with keys from `apps/web/src/i18n/en.ts`; `uk.ts` must have the same keys (the type checker enforces it). Colours come from the tokens in `apps/web/src/styles/app.css`, never from literals in components.
- Relative imports use the `.ts` extension; no enums or namespaces (`erasableSyntaxOnly`).

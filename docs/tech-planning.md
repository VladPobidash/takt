# Technical planning — decisions and questions

Status: **in progress** (started 2026-10-26; planning session 2026-11-19: blocks 1–4 decided; the author delegated the remaining decisions). This is a checklist for the technical planning session, not a set of answers. Each decision below ends as an ADR in [decisions/](decisions/) (proposed → accepted by the author); format questions end as changes to [format.md](format.md).

## Fixed inputs

These are already decided and constrain every answer below:

- **Product:** [brief](brief.md), [format v0](format.md), [roadmap](roadmap.md).
- **Local-first** ([ADR 0001](decisions/0001-local-first.md)). No server-side storage. Nothing on the playing path needs the network.
- **Design v1 accepted** ([design system](design/README.md), [MVP screens](design/mvp-v1/README.md)). Swiss Blocks, Onest, EN + UA from day one, no bottom navigation, dense layouts.
- **App stack** ([ADR 0003](decisions/0003-ui-kit.md)). React 19 + TypeScript, shadcn/ui on Base UI, Tailwind CSS v4.
- **Mobile-first, tablets and desktops supported.** Phone on a music stand, screen always on. Modern devices only — old phones and old browsers are not supported (author's decision, 2026-11-19).
- **Timeline.** Weekly Saturday services are tests; the worship night on **2026-12-12** is the first real use. Stage 2 (song view usable by the band) targets 31 Oct.
- **Team.** One developer working with Claude Code in a cloud environment. Static hosting (Railway Hobby or GitHub Pages were mentioned).
- **Not in the MVP:** cloud sync, live session, change history. The architecture must not close these doors (see brief → "Data and sync", [change history idea](ideas/change-history.md)).

## Decisions to make (each → ADR)

### 1. App stack and UI foundation

> **Decided 2026-11-19:** [ADR 0003](decisions/0003-ui-kit.md) (accepted) — React 19 + shadcn/ui on Base UI + Tailwind v4, modern devices only, bar grid as DOM. The questions below are kept for the record.

- Accept, revise or replace it? Alternatives worth a fair look: Preact, Svelte, Solid, React Aria Components.
- Bundle size and start-up time on an older Android phone. Is there a budget?
- Does the bar grid render as DOM/CSS grid, or does anything need canvas/SVG?
- Tailwind version and how design tokens become CSS variables and the theme (light/dark, system default).

### 2. Repository structure and tooling

> **Decided 2026-11-19:** [ADR 0004](decisions/0004-repo-structure-and-tooling.md) (accepted) — pnpm monorepo (`packages/format` + `apps/web`), Node 24, TypeScript 7, Biome, Vite 8, CI on every pull request, work through issues and pull requests.

- Monorepo layout: the likely direction is `packages/format` (framework-free) + `apps/web`. Confirm or change.
- Package manager and workspaces, Node version, TypeScript settings (strict?).
- Build tool and dev server.
- Lint and format tooling.
- CI on GitHub Actions: what runs on every push and PR?
- Commit and branch conventions, release/versioning of the format library.

### 3. Format library (`.takt` parser) design

> **Decided 2026-11-19:** [ADR 0005](decisions/0005-format-library.md).

- AST shape: song → meta → sections (name, tag, repeat, reference/reuse) → lines → bars → cells (chord, beats). Where do instrument layers (`@bass`, `@keys`), notes (`>`), comments (`//`) and lyrics live?
- Source positions in the AST, for editor highlighting, linter warnings and later "who changed this bar".
- Error handling: never throw on a bad line? Which problems are errors and which are warnings (e.g. "5 beats in 4/4")?
- Beat resolution: stars, "rest of bar", `A - E` even split, `.` cell mode, `| |`, `%`, `N.C.`, short bars.
- Chord model: what is parsed (root, accidental, quality, slash bass), how unknown chord text is kept.
- Transposition, capo and H/B naming: in the library or in the app? Sharps/flats choice by target key; capo suggestions.
- Serializer: AST → text. Does a round-trip need to preserve the author's formatting?
- ChordPro export: scope for the MVP or later?
- Public API and how the app calls it (sync, pure functions?).

### 4. Testing strategy

> **Decided 2026-11-19:** [ADR 0006](decisions/0006-testing.md).

- Test runner for the library and the app.
- Parser fixtures: the "Parser test cases" in [format.md](format.md) first, then the band's songs in [examples/](../examples/).
- Property tests for transposition (e.g. +n then −n gives the same song)?
- Component tests and end-to-end tests on a phone viewport? Visual checks against [mvp-v1 screens](design/mvp-v1/README.md)?
- What must pass before a Saturday-service build?

### 5. Platform: PWA or native wrapper

- PWA only for the MVP, or Capacitor (or Tauri) from the start?
- iOS: storage eviction for PWAs, Wake Lock support, "Add to Home Screen" flow. Is any band member on iPhone for 12 Dec?
- Service worker: precache strategy, offline start, and an update flow that never changes the app in the middle of a service.

### 6. Storage

- Where songs (`.takt`) and setlists (`.taktset`) live in the MVP: IndexedDB, OPFS, or a real folder via the File System Access API (desktop Chrome)?
- Storage adapter interface, so cloud folders and native file access can plug in later.
- Local database for things that are not in `.takt`: view-option layers (everywhere / setlist / song), personal notes, device settings (instrument, H/B, language, theme). Library or plain IndexedDB? Schema and migrations.
- Anchors for personal notes and per-song options (section name + bar number?) so they survive edits.
- Import/export: single file, setlist bundle (one file to send via Telegram), full backup. Bundle format?
- How to remind users that data lives only on the device.

### 7. App state, routing and view options

- URL scheme: deep links to a library song, a setlist, a song inside a setlist, a section.
- Where app state lives (store library or framework state).
- How the view-option cascade (song → setlist → everywhere) is resolved and shown ("From this setlist", Reset).
- Song key and "tonight" note per setlist entry: stored in the setlist file or locally?

### 8. Localisation

- i18n library (or a small own one). Ukrainian plural forms (one / few / many) are a must.
- Message files: format, location, how to keep EN and UA keys in sync (a CI check?).
- Language detection and the setting in Settings; date and number formatting.
- Song content is never translated — make sure the tooling cannot touch it.

### 9. Timing: metronome and auto-scroll

- Clock source: Web Audio clock, `performance.now()` + `requestAnimationFrame`, or a worker? The prototype's `setInterval` drifts.
- Model: tempo, time signature, count-in, bars, repeats (`x2`), sections reused by reference; what "current section" means at each beat.
- Behaviour when the tab is in the background or the screen locks; Screen Wake Lock.
- Optional audible click or blinking dot? Latency from tapping Play to the first beat.
- Manual scroll or a tap on the form timeline while playing: pause, re-sync or continue?
- Previous/next song and section with keys and pedals (arrows, PageUp/PageDown).

### 10. Rendering and layout

- Bar grid: 4 bars per row on a phone, 8 on a laptop; widths proportional to beats; long chord names.
- Compact mode: fitting the whole song on one screen (font scaling algorithm?), 2–3 columns on large screens, sections never split.
- Performance on long songs and 8-song setlists.
- Accessibility: contrast checks, focus order, screen-reader labels for chords.

### 11. Deploy and operations

- Hosting: GitHub Pages, Railway Hobby, or another static host. Custom domain?
- Preview deploys per branch or PR?
- Release cadence around Saturdays; how the band gets an update.
- Telemetry and error reporting: none, or something local-only?

## Format questions to settle with the first real song

From [roadmap → Open questions](roadmap.md#open-questions). The first song is [examples/silent-night.takt](../examples/silent-night.takt) — public domain, in 6/8, key of B♭ written in H-notation, with a separate keys part and a capo view for guitar. The band's own songs follow.

- [x] 6/8: one `*` is an eighth note (6 per bar).
- [x] `| |` vs `%`: different.
- [ ] Notation for small keys parts.
- [ ] Rhythm cues for cajón and drums.
- [x] Repeats shown as `×4`, unrolled only by the timeline and the metronome.
- [ ] Lyrics: block under the section or aligned to bars (MVP: probably neither is needed).
- [x] Default H/B notation: decided by the file, then by the device setting.
- [ ] Product name and file extension.

## Suggested order

1. Stack and repo structure (1–2): unblocks everything else.
2. Format library design and testing (3–4), with the first example song and the format questions above.
3. Platform and storage (5–6), because they decide what "offline on stage" means in practice.
4. The rest (7–11) can be decided as each screen is built.

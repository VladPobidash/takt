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

- No code yet. **Design v1 accepted 2026-10-26.** Follow `docs/design/README.md` (tokens, components, scrollbars, localisation rules) for any UI work; the accepted MVP screens are in `docs/design/mvp-v1/` (screenshots + Claude Design sources — reference, not code to port).
- Technical planning is in progress: `docs/tech-planning.md` lists the decisions; each answer becomes an ADR (written as proposed, accepted only by the user).
- **App stack accepted 2026-11-19 ([ADR 0003](docs/decisions/0003-ui-kit.md)):** React 19 + TypeScript, shadcn/ui on Base UI, Tailwind CSS v4 (CSS config, design tokens as CSS variables), bar grid as plain DOM, browser floor Safari 16.4 / Chrome 111 / Firefox 128, 150 kB gzip JavaScript budget for the song screen.
- Repository structure and tooling, the format library design, testing, platform and storage are **not decided yet**. Do not scaffold or add dependencies before the matching ADR in `docs/decisions/` is accepted by the user.
- Likely direction (to confirm in an ADR): the format is a standalone, dependency-free TypeScript library (`packages/format`: parser, transpose, capo, ChordPro export) separate from the app (`apps/web`), with storage behind an adapter interface.

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
CLAUDE.md          this file
README.md          public overview (EN)
LICENSE            Apache-2.0
docs/
  brief.md         product brief
  format.md        .takt format spec v0
  roadmap.md       stages + open questions
  tech-planning.md technical decisions and questions to settle before code
  design/          design system (README.md), design brief
    mvp-v1/        accepted MVP screens: screenshots + Claude Design sources
  decisions/       ADRs
  ideas/           future features, not in the MVP (e.g. change history)
examples/          sample .takt files (no copyrighted lyrics)
```

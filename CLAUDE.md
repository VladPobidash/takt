# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

Takt — bar-based chord charts for instrumentalists: one arrangement, a view for every instrument (guitar with capo, bass, keys, drums). Lyrics are optional. Open source (Apache-2.0), built first for the author's own band; a worship night on 2026-12-12 is the first real test, with weekly Saturday services before it as smaller tests.

## Read before working

1. `docs/brief.md` — problem, vision, principles, features
2. `docs/format.md` — the `.takt` format v0 (the core of the product)
3. `docs/roadmap.md` — current stage and open questions
4. `docs/decisions/` — accepted decisions (ADR); do not contradict them silently

## Non-negotiable principles

- **Simple over complete.** Chords, bars, cues. No staff notation.
- **Plain text is the source of truth.** A `.takt` file must stay readable and hand-editable.
- **Accept how musicians already write.** `| E*** G* |`, empty bars, `A - E`, `(2x)`, H/B notation must parse.
- **Local-first.** No server-side storage of user content. A stateless helper server is acceptable only if an ADR says so.
- **Offline on stage.** Nothing on the playing path may need the network.
- **Phone first, laptop comfortable.**

## Current state

- No code yet. Visual direction is decided — follow `docs/design/README.md` (tokens, components, scrollbars, localisation rules) for any UI work. MVP screens are being designed in Claude Design.
- Stack and app architecture are **not decided**. Do not scaffold frameworks or add dependencies before an ADR in `docs/decisions/` is accepted by the user.
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
  design/          design system (README.md), design brief, design outputs
  decisions/       ADRs
  ideas/           future features, not in the MVP (e.g. change history)
examples/          sample .takt files (no copyrighted lyrics)
```

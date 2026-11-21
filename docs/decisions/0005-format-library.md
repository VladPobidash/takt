# 0005. Format library design: two layers, diagnostics, span-based rewriting

- **Status:** accepted
- **Date:** 2026-11-19
- **Decided by:** the author for the three main forks (two layers, diagnostics, round-trip rule); the details below by Claude Code under the author's delegation of 2026-11-19 ("decide yourself") — open to revision.

## Context

`packages/format` (`@takt/format`, [ADR 0004](0004-repo-structure-and-tooling.md)) turns `.takt` text into what the app shows. It has to accept how musicians already write ([format.md](../format.md)), feed an editor with precise warnings, and never damage a hand-written file.

Options considered for the three forks:

| Question | Chosen | Alternative and why not |
| --- | --- | --- |
| Model | Two layers: a document tree that mirrors the file, and a resolved song for a screen | One semantic model: simpler, but it loses the shape of the file, so editor highlighting and writing text back get harder |
| Problems in the input | Never throw; return a list of diagnostics (code, severity, position, data) | English messages inside the library: they cannot be translated (UI is EN + UA) |
| Writing text back | Rewrite only the spans that change; untouched text stays byte-for-byte | Always print a normalised file: reformats hand-aligned charts. A fully lossless token tree: far more work for the same result |

## Decision

### Layers and API

Synchronous pure functions over plain JSON-serialisable data (no classes, no I/O, no DOM):

- `parse(text, options?) → { doc, diagnostics }` — the **document**: title, header entries, sections in file order, every line typed (`bars`, `note`, `comment`, `lyrics`, `blank`), instrument prefix, bars and cells. Every node carries a **span** (offset, line, column of start and end). `parse` never throws, whatever the input.
- `resolveSong(doc, { instrument }) → song` — the **resolved song** for one instrument: header values typed, section reuse expanded, the instrument's lines laid over the base, section types and abbreviations, the form (bars × repeats per section).
- Chords: `parseChord`, `formatChord(chord, { notation })`, `transposeChord`, `capoShape`, `suggestCapos`, `prefersFlats(key)`.
- Text rewriting: `transposeText(text, semitones)` replaces chord spans and the `key:` value inside the original text. When transposing removes the only `H` of a file without a `notation:` line, it adds `notation: H` so the result is read the same way.
- Setlists: `parseSetlist(text)` with the same conventions.

### Diagnostics

`{ code, severity, span, data? }` with severity `error` (the line could not be understood and is kept as raw text), `warning` (understood but probably wrong: 5 beats in 4/4, unknown chord, reference to an unknown section) or `info` (worth a hint: a short bar, an ambiguous `B`). Codes are stable kebab-case strings; the app owns the EN and UA texts.

### Chords and note naming

- A chord is root + quality text + optional slash bass. Roots and basses are stored as a letter with an accidental in **English naming** (B = B natural); the file's naming never leaks into the model.
- A file is read in H-notation when the header says `notation: H`, or when any chord in it uses `H`; with `notation: B` it is read in English naming; otherwise the caller's `defaultNotation` applies and every `B` root gets an `info` diagnostic. In H-notation `Bb` is accepted as B♭.
- Display naming is an argument of `formatChord`, independent of how the file was written.
- A token that is not a chord is kept as text in its cell, with a warning. Nothing is dropped.

### Bars and beats

- One `*` is one beat of the **lower number of the time signature**: a quarter in 4/4, an eighth in 6/8. A bar has as many beats as the upper number.
- Chords with asterisks take that many beats; chords without asterisks share the rest of the bar evenly (`| A E |`, `| A - E |` → half a bar each; in 6/8 that is 3 + 3).
- If every chord has asterisks the bar is as long as their sum: longer than the time signature → warning `bar-too-long`; shorter → `info` `bar-short` (a deliberate short bar is legal).
- Cell mode: if a bar contains `.`, its tokens are equal slots and `.` extends the previous chord.
- `| |` (empty) means "keep playing the last chord"; `| % |` means "play the previous bar again". They are different nodes and are drawn as written.
- `N.C.` is a cell without a chord.
- Text before the first `|` is a label; text after the last `|` is a cue, from which a repeat (`x2`, `2x`, `(2x)`) is extracted.

### Sections and instruments

- `## Name [tag] x2`, `## A = B`, and reuse by name are resolved in `resolveSong`, not in `parse`. A section without base bar lines reuses the most recent earlier section with the same name, or failing that of the same kind (an empty `Verse 2` under `1 Verse`); its own notes are kept.
- A reusing section also takes the repeat of its source unless it writes its own.
- Repeats stay folded (`×4`); the form carries bars × repeats so a timeline and a metronome can unroll them.
- The n-th `@instrument` bar line of a section replaces the n-th base bar line in that instrument's view (as in format v0, and it matches the planned per-instrument files). A different bar count than the replaced line gives an `info` diagnostic.
- Instrument names are normalised through synonyms to `guitar`, `bass`, `keys`, `drums` (cajón and percussion included); other names are kept as written.

### Out of scope for the MVP

ChordPro import and export; lyrics aligned to bars; a dedicated notation for keys parts or drum rhythms (plain-text cues are enough for now).

## Consequences

- The editor gets positions and warnings for free; the app translates codes.
- Transposing or renaming notes in a file cannot reformat it, because only chord spans are replaced.
- Two layers mean two sets of types to keep in step; `resolveSong` is the only place that knows about reuse and instrument overlays.
- The ordinal rule for instrument lines means that changing only the third line of a section requires writing the first two as well. We keep it for v0 and revisit it with the band's real parts.
- Format answers recorded here are mirrored in [format.md](../format.md); if they disagree, format.md is fixed.

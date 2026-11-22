# @takt/format

Parser and tools for the [`.takt` chord chart format](../../docs/format.md). No runtime dependencies, no DOM, no Node APIs — it runs anywhere JavaScript runs. Design: [ADR 0005](../../docs/decisions/0005-format-library.md).

```ts
import { diffSongs, formatChord, parse, resolveSong, suggestCapos, transposeText } from "@takt/format";

const { doc, diagnostics } = parse(text, { defaultNotation: "H" });
// doc mirrors the file: header, sections, typed lines, bars, cells — every node with a source span.
// diagnostics: { code, severity, span, data } — parse never throws.

const song = resolveSong(doc, { instrument: "keys" });
// song.sections[n].lines: the bars this instrument plays; song.form: bars × repeats per section.

for (const cell of song.sections[0].lines[0].bars[0].cells) {
  if (cell.chord) console.log(formatChord(cell.chord, { notation: "B" }), cell.beats);
}

if (song.key) suggestCapos(song.key); // [{ capo: 3, shapeKey: G }, …]

transposeText(text, 2); // the same file two semitones up; only chords and `key:` change

const diff = diffSongs(oldText, newText);
// diff.identical: same bytes; no changes and not identical = only reformatted.
// diff.summary.total: for "3 changes". diff.changes: one record per change, e.g.
// { kind: "bar-changed", instrument: null,
//   before: { section: { name: "Verse 1", occurrence: 1, … }, line: 2, bar: 3, value: <Bar D/F#> },
//   after:  { section: { name: "Verse 1", occurrence: 1, … }, line: 2, bar: 3, value: <Bar Dsus4/F#> } }
```

| Function | What it does |
| --- | --- |
| `parse(text, options?)` | `.takt` text → document + diagnostics |
| `resolveSong(doc, { instrument, form })` | document → the song one instrument sees: reuse expanded, parts laid over the base, section types, form; with `form`, a named version's order and repeats ([ADR 0013](../../docs/decisions/0013-song-forms.md)) |
| `parseChord`, `formatChord`, `formatNote` | chord text ↔ chord, in H-notation or English naming |
| `transposeChord`, `transposeKey`, `prefersFlats` | transposition; sharps or flats by the target key |
| `capoShape`, `suggestCapos` | guitar shapes with a capo; capo positions with easy shapes |
| `transposeText(text, semitones)` | rewrite a file in another key without touching its formatting |
| `setForm`, `renameForm`, `removeForm`, `formatFormEntries`, `findForm`, `cleanFormName` | add, change, rename and delete `form` lines (named versions) without touching the rest of the file |
| `parseSetlist`, `formatSetlist` | `.taktset` setlists |
| `diffSongs(before, after, options?)` | what changed between two texts of a song, in musical terms: header, sections, bar lines and bars per instrument, notes, lyrics, with places and a summary |
| `align(a, b, equal, similarity)` | the sequence alignment `diffSongs` uses: fewest changes, so an inserted item does not shift the ones after it |

Tests are written first: `pnpm --filter @takt/format test`. Cases come from "Parser test cases" in the format spec and from [`examples/`](../../examples/).

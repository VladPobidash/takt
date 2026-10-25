# `.takt` format v0 (draft)

A song file is plain text that is easy to type, even on a phone. The bar notation comes from our band's PDF charts; the grid ideas come from [ChordPro grid](https://chordpro.org/beta/directives-env_grid/). The spec is not frozen yet — open questions are in [roadmap.md](roadmap.md#open-questions).

## Example

Built on the chords of "Достойний Ти Один" ("Worthy"). The `@bass`, `@keys` and `@cajon` lines are made up, only to show the syntax. Titles, section names, tags and notes can be in any language.

```
# Достойний Ти Один
artist: Elevation Worship — Worthy
key: D
tempo: 135
time: 4/4

## Intro x2
| Hm** D** | G** A** |

## Verse 1
| D | A | D/F#** G** | Asus4* A*** |
| D | A | D/F#** G** | Asus4* A*** | A |
@bass | D | A | F#** G** | A |
> first line — keys only

## Chorus
| G*** Hm* | A | D/F# | Hm |
| G*** Hm* | A | D/F# |
@keys > right hand: melody an octave up

## Interlude = Intro

## Verse 2 x2
| D | A | D/F#** G** | Asus4* A*** |

## Chorus

## Bridge [яма] x4
| G | Em | Hm | A** D/F#** |
@cajon > first 2 times — hand only
```

(`яма` is the band's word for a dynamic dip — tags are free text.)

## Header

`# Title`, then `key: value` lines until the first section.

| Key | Meaning |
| --- | --- |
| `key` | key, e.g. `D`, `Hm`, `F#` |
| `tempo` | BPM |
| `time` | time signature, e.g. `4/4`, `6/8` |
| `artist` | artist / source |
| `capo` | suggested capo for guitar |
| `notation` | `H` or `B` (see "Chords") |
| `link` | link to a recording |

## Sections

`## Name [tag] x2`

- **Tag** — a cue for everyone ("dip", "powerful").
- **Repeat:** `x2`, `2x` or `(2x)`.
- **Reuse:** an empty section with an already-known name takes that section's most recent content. `## A = B` is an explicit reference.
- **Section type** (color and abbreviation) is detected from the name, in English and Ukrainian: intro/вступ, verse/куплет, pre-chorus/передприспів, chorus/приспів, bridge/брідж, interlude/програш, instrumental, outro/кінцівка.

## Bar line

Bars are separated by `|`. Text before the first `|` is a left label; text after the last `|` is a right-hand cue (`| … | x2 quiet`).

| Notation | Meaning |
| --- | --- |
| `\| D \|` | D for the whole bar |
| `\| Hm** D** \|` | 2 beats each: one asterisk = one beat |
| `\| Asus4* A*** \|` | 1 + 3 beats |
| `\| E*** G \|` | a chord without asterisks takes the remainder (1) |
| `\| A E \|`, `\| A - E \|` | split evenly; `-` is ignored |
| `\| D . G . \|` | cell mode, as in ChordPro grid: token = beat, `.` continues |
| `\| \|` | empty bar — hold the previous chord (as in "Боже, я вдячний Тобі") |
| `\| % \|` | repeat the previous bar |
| `\| N.C. \|` | no chord |
| `\| A** \|` in 4/4 | a short 2-beat bar, drawn narrower |

Duration rule: chords with asterisks have an explicit beat count; chords without asterisks split the rest of the bar evenly. If every chord has asterisks, the bar length equals their sum (a short or long bar).

## Chords

Root `A`–`H`, accidental `#` or `b`, quality (`m`, `sus4`, `7`, `maj7`…), bass note after `/`.

Notation: with `notation: H`, H = B natural and B = B♭. If not set, the personal setting applies — but any H in the file implies H-notation. Evidence from our .xlsx: "Краса Хреста" in "B" with chords Gm, Eb, F — that is B♭.

## Instrument parts

A line prefixed with `@instrument`:

- `@bass | … |` — in the bass view, replaces the section's base line with the same ordinal number. A part holds only the differences from the base, not a copy of the song.
- `@keys > …` — a cue visible only to keys players.
- Names are free-form, with synonyms: guitar/гітара, bass/бас, keys/клавіші/піано, drums/барабани, cajon/кахон.
- Capo is not a part, it is a view parameter.

## Notes and lyrics

- `>` — a note for the whole band.
- `//` — a comment, never shown.
- Any other line in a section is lyrics: can be hidden; in v0 not aligned to bars.
- Personal notes never go into the file (separate local layer).

## Transposition and capo

- Shift by N semitones.
- Flats for F, B♭, E♭, A♭, D♭, G♭ and Dm, Gm, Cm, Fm, B♭m, E♭m; sharps in other keys.
- Chord shapes with a capo = sounding chord minus capo.
- Capo suggestion: options from fret 0 to 7 where the shapes fall into C, G, D, A, E, Am, Em, Dm.

## Setlist (`.taktset`)

```
# Service 31.10
date: 2026-10-31
- dostoinyi-ty-odyn | key: D
- mohutnii-boh | key: E | > no intro
```

## ChordPro grid compatibility

| `.takt` | ChordPro grid |
| --- | --- |
| `D/F#** G**` | `D/F# . G .` |
| `## Name x2` | `\|: … :\|` |
| section export | `{start_of_grid shape="4x4"}` … `{end_of_grid}` |

## Later

A part can move into its own file with the same syntax (`bass.takt`: the same `##` headers and lines without `@`). This enables conflict-free sync — see [brief.md](brief.md#data-and-sync-ideas-for-later).

## Parser test cases

Real lines from our band's PDF that v0 must parse:

```
| E*** G* | E*** G* | E*** G | E |
| E | E | E | E | A | A | E | E | (2x)
| H | H | C#m | C#m | H | H | A - E | E |
| D | | A** G** | | A** G** |
| G*** Hm* | A | D/F# | Hm*** A*|
| Hm** D** | G** A** | (2x)
| F# | F# | F#sus | F#sus |
```

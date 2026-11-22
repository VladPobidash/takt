# 0013. Song forms: named versions over the same sections

- **Status:** accepted
- **Date:** 2026-11-22
- **Decided by:** the author for the concept (a version is a named form, not a copy), the `form <name>: <list>` header line, multi-word names and the setlist option `form:`; Claude Code under the author's delegation of 2026-11-19 for the details below — open to revision.

## Context

A song has a main version the band sees by default, but where they play changes the structure: an instrumental interlude is dropped, the bridge or the chorus is played fewer times. These changes have to travel with the song to every member, the band has to see how many versions a song has, and a setlist has to say which one it holds.

A copy of the song per version would let the harmony drift apart: a chord corrected in one copy stays wrong in the other. So a version is a **form**: a named order of the song's own sections, with repeats and omissions. The harmony is written once. In code the concept is called `form` (change history will own "version" and "revision"); the UI calls it "Versions" / «Версії».

What had to be decided:

| Question | Chosen | Alternative and why not |
| --- | --- | --- |
| A name shared by several sections (`## Chorus` twice) | The k-th mention of a name in the form is the k-th section of that name in the file (the last one once the file has no more); `Chorus #2` names one explicitly | Always the first, `#n` for the others: the main order typed out (`…, Chorus, Verse 2, Chorus`) would show the first chorus twice and lose the second one's notes. Numbering every section (`C2`, `V1`): not how the band names them |
| Separator, when names contain commas (`## 1, 2 Verse x2`) | Commas; pieces are joined back into the longest run that names a section of the file | `;`, `/` or `→`: harder to type on a phone, and not what the author's syntax uses. Quoting names: noisy |
| Repeats | `x2`, `2x`, `(2x)` in an entry replaces the section's own repeat; without one the section keeps its own | Multiplying the section's repeat: surprising when the section already says `x2` |
| Reuse | Follows the file: a section left out of a form still lends its bars | Following the form: dropping `## Chorus` would empty every later reused chorus |
| Where the code lives | `parse` splits and matches entries (it needs the section names to split them); `resolveSong` orders the sections | Everything in `resolveSong`: the editor would get no positions for unknown names |

## Decision

### Syntax

- A header line (before the first `##`): `form <name>: <entry>, <entry>, …`. The keyword is `form` in any letter case. The **name** is everything between `form ` and the first `:` — several words, any language; spaces are collapsed. Names are compared without letter case.
- An **entry** is a section name, optionally `#n`, optionally a repeat: `Bridge x2`, `Chorus #2`, `Verse 2 (2x)`. Names are matched as the section headers write them, without their tag and repeat (`## Bridge [яма] x4` is `Bridge`), without letter case, ignoring the spacing around commas (`1,2 Verse` finds `## 1, 2 Verse`). There is no prefix or kind matching: `Chorus` does not name `## Chorus 2`.
- **Commas inside names:** the list is split at commas, then the pieces are joined back, left to right, into the longest run that names a section of the file: in a file with `## 1, 2 Verse`, `Intro, 1, 2 Verse x2, Chorus` has three entries.
- **Several sections with one name:** without `#n`, the k-th time a name appears in the form names the k-th section of that name in the file, and the last one when the file has fewer. So the main order written out names every section as the file does, and the second `Chorus` keeps its own notes and personal notes. `#n` is the n-th section of that name — the same "name + which one of that name" that anchors personal notes (`apps/web/src/notes/anchors.ts`). A section whose own name ends in `#n` is matched by its whole name first.
- **Repeats:** a repeat in an entry replaces the section's repeat; without one the section plays its own (also one it took over by reuse).
- **Reuse follows the file:** bars, parts and repeats are resolved over every section of the file first; a form only picks and orders the result.
- A version cannot have different chords. If the band needs that, it is a separately named section in the file. There is no explicit main `form:` line: the main version is the order of the sections in the file, has no name and always exists.

### Library

- `parse` returns `doc.forms`: name, entries (`text`, `section` — the index in `doc.sections`, or null — `repeat`, span), and the spans of the line, the name and the list.
- `resolveSong(doc, { instrument, form })` with a form name returns that version: `sections` and `form` in its order, with its repeats. Each resolved section's `index` is now its position in `sections` (the same as before for the main version); `docIndex` is the section in the file. A section played twice appears twice. `song.forms` lists the version names; `song.formName` is the version played, or null for the main.
- An unknown form name, or a form of which no entry names a section, plays the **main version**, and `formName` is null — the app says so (a setlist entry pointing at a version the song does not have).
- **Diagnostics** (codes; the app owns the texts): `unknown-form-section` (warning, on the entry; the entry is skipped), `duplicate-form` (warning, on the second line; the first form of a name wins), `empty-form` (warning, a form with no entries).
- **Text rewriting stays span-based** ([ADR 0005](0005-format-library.md)): `setForm(text, name, entries)` replaces the list of an existing form or adds a line after the last form line (else after the header), `renameForm`, `removeForm` (the whole line). `formatFormEntries` writes the names as the file does and adds `#n` only where the k-th rule would pick another section. `cleanFormName` drops what a name cannot hold (`:`, `|`, line breaks). `transposeText` does not touch form lines.
- **Setlists:** `| form: коротка` is kept in `SetlistEntry.options.form` and written back by `formatSetlist`.

## Consequences

- One harmony, many versions: a corrected chord is corrected in all of them, and versions travel inside the song file.
- The play order is no longer the file order. Consumers that only walk `song.sections` and `song.form` (form timeline, compact mode, auto-scroll) follow a version without knowing about it; personal notes must use `docIndex`, not the position.
- Renaming a section in the file can break a form that names it: the form keeps the old text and reports `unknown-form-section` in the editor.
- An app older than this change reads a form line as an unexpected header line (a warning) and plays the main version.

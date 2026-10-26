# MVP design v1

**Status:** accepted by the author on 2026-10-26 as the first version of the app's design.

This folder is a snapshot of the "Takt — MVP design" canvas made in Claude Design. The rules behind it (tokens, components, layout, localisation) live in the [design system](../README.md); when the two disagree, the design system wins and the screens get fixed.

- `screens/` — PNG screenshots of every board, rendered at 1× (phone 390 × 844, laptop 1280 × 800).
- `source/` — the board sources (`.dc.html`, Claude Design component format) and `canvas.json` (board layout and titles). They are reference material, not app code. The canvas itself is a private Claude Design artifact owned by the author.

## Boards

| # | Screen | What it shows |
| --- | --- | --- |
| 1 | [Song — stage](screens/01-song-stage.png) (dark, EN) | Top bar with title and meta line, form timeline, instrument tabs, section tiles with bar grid and beat-proportional chord cells, band note, player toolbar (prev · auto-scroll · transposer · next). |
| 2 | [Song — guitar, auto-scroll playing](screens/02-song-guitar-autoscroll.png) (light, UA) | Guitar view: capo control with suggestions, chord shapes large + sounding chords small. Auto-scroll running: passed sections faded on the timeline, current section underlined. Ukrainian UI strings. |
| 3 | [Song — compact mode](screens/03-song-compact.png) (dark, EN) | The whole song on one screen: 34 px label column (abbr, ×N, tag, "now" marker), no beat dots, current section outlined. |
| 4 | [Song — view options](screens/04-song-view-options.png) | Bottom sheet with scope tabs *This song · This setlist · Everywhere*; each option shows where its value comes from. |
| 5 | [Service map](screens/05-service-map.png) | Setlist: number, title, key, meta + "tonight" note, mini form strip; current song marked; compact Start button. |
| 6 | [Library](screens/06-library.png) | Search, Songs / Setlists tabs, song rows with key, meta and form strip; section switcher in the top bar (no bottom navigation). |
| 7 | [Editor](screens/07-editor.png) | `.takt` text with syntax highlighting, linter warning ("5 beats in 4/4"), Text / Preview tabs, quick-symbol bar, history button. |
| 8 | [Settings](screens/08-settings.png) (UA) | Searchable selects for UI language and instrument, radio groups for H/B notation and theme, song-view defaults ("Everywhere" layer), chord size, data export. |
| 9 | [History](screens/09-history-future.png) — future | Changes per song grouped by day, filter by author, pending suggestion on top, bar-level diffs, compare / restore, "played on" marker. See [change history idea](../../ideas/change-history.md). |
| 10 | [Review a suggestion](screens/10-review-future.png) — future | A bandmate's suggestion: their comment, each change as −/+ bar diffs, discussion, accept all / reject / accept only some changes. |
| 11 | [Laptop — keys player](screens/11-laptop-keys-compact.png) | Setlist sidebar + song area, keys view, compact mode in 3 columns, auto-scroll playing. |
| 12 | [UI kit](screens/12-ui-kit.png) | Tokens, section tiles, type scale, and every component mapped to its shadcn/ui (Base UI) counterpart ([ADR 0003](../../decisions/0003-ui-kit.md), still proposed) plus our music components. |

## Notes for implementation

- The boards are interactive prototypes. `source/Main.dc.html` holds the song component used by boards 1–4 and 11 (props: theme, UI language, instrument view, layout, compact, playing, beat, open sheet). Its script contains a **throwaway** prototype of bar parsing, transposition, capo and H/B naming — useful as a behaviour reference, not as code to port. The real parser is written test-first against [format.md](../../format.md), in its own library (structure still to be decided).
- Auto-scroll in the prototype ticks with `setInterval`; the real app needs a drift-free clock (see [tech planning](../../tech-planning.md)).
- EN and UA UI strings used on the boards are in each board's `STR` table — a starting point for the real translation files.
- Song data on the boards is illustrative (titles, keys, forms, chords only — no lyrics).
- Screenshots were rendered with the Onest font installed locally; the boards load Onest from Google Fonts.

# Design system — "Swiss Blocks" (v0)

The visual language of Takt. Chosen on 2026-10-25 after comparing five directions (see [Exploration history](#exploration-history)). Decision record: [ADR 0002](../decisions/0002-visual-direction.md).

**In one line:** flat, editorial, high-contrast UI in **Onest**, where the only strong colour is the song itself — every section type has its own tile colour, consistent across all songs.

## Principles

1. **Chords first.** Chords are the largest, boldest, highest-contrast element on screen. Everything else is secondary.
2. **Colour = song structure.** Section colours are an orientation system, not decoration. UI chrome stays monochrome (plus one signal colour).
3. **No pills.** Rectangles with small radii (4–8 px). Selection is shown with an underline, fill or weight — not with capsules.
4. **Readable from a music stand.** Assume 1–1.5 m viewing distance, quick glances, hands busy.
5. **Two themes, both first-class.** Dark for the stage, light for daytime. Default follows the system setting.
6. **Built for any language.** English by default, Ukrainian from day one, any language later (see [Localisation](#localisation)).

## Typography

One family: **[Onest](https://fonts.google.com/specimen/Onest)** (has full Cyrillic), weights 400–800.

| Role | Size / weight | Notes |
| --- | --- | --- |
| Song title (song screen) | 30 / 800, tracking −0.03em, line-height 1.05 | |
| Screen title (setlist) | 40 / 800, tracking −0.03em | |
| Chord root | 26 / 800, tracking −0.02em | phone; 28 on laptop |
| Chord quality / slash bass | 15 / 700 | slash bass at 70% opacity |
| Meta labels | 12 / 600, UPPERCASE, tracking 0.06em | values inline at 15 / 800 |
| Section name | 16 / 700 | |
| Body / notes | 13–15 / 500–600 | |
| Tabs | 15 / 600 (selected 800) | |

## Colour tokens

### UI (monochrome + signal)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | `#FFFFFF` | `#0B0B0C` | screen background |
| `surface` | `#F3F3F1` | `#18181A` | buttons, inputs, selected rows |
| `surface2` | `#E9E9E6` | `#222225` | nested surfaces, note chips |
| `line` | `#E2E2DE` | `#2A2A2E` | dividers, borders |
| `text` | `#0B0B0C` | `#F4F4F1` | primary text |
| `muted` | `#5C5C61` | `#A6A6AB` | secondary text (≥ 4.5:1) |
| `accent` | `#0B0B0C` | `#F4F4F1` | primary buttons, selected fills |
| `accentFg` | `#FFFFFF` | `#0B0B0C` | text on accent |
| `signal` | `#F0501E` | `#FF6A3D` | active tab underline, current song number — never for text blocks |
| `mineDot` | `#FFB000` | `#FFC933` | personal-note marker |
| `mineBg` / `mineFg` | `#FFF0C2` / `#4F3600` | `rgba(255,201,51,.18)` / `#FFDC85` | personal-note chip |

### Section tiles

Each section type has an **ink** (text, chords), a **tile** (background) and a **bar** (bar lines, beat dots).

| Type | Light ink / tile / bar | Dark ink / tile / bar |
| --- | --- | --- |
| Verse | `#0A3A8C` / `#D9E8FF` / `rgba(10,58,140,.28)` | `#B3D2FF` / `#162E4D` / `rgba(179,210,255,.32)` |
| Chorus | `#743000` / `#FFE0BF` / `rgba(116,48,0,.28)` | `#FFC892` / `#45270C` / `rgba(255,200,146,.32)` |
| Bridge | `#461C9B` / `#EADCFF` / `rgba(70,28,155,.28)` | `#DEC9FF` / `#31204D` / `rgba(222,201,255,.32)` |
| Pre-chorus | `#08523E` / `#CCF3E4` / `rgba(8,82,62,.28)` | `#98EACB` / `#103A2E` / `rgba(152,234,203,.32)` |
| Intro / interlude / instrumental / outro | `#33334A` / `#ECECF2` / `rgba(51,51,74,.24)` | `#D2D2DE` / `#23232D` / `rgba(210,210,222,.26)` |

Mini form strips (setlist rows) use saturated swatches: light — verse `#4C8DF0`, chorus `#FF9A3D`, bridge `#9C74F0`, pre `#2EBF8E`, instrumental `#D3D3DE`; dark — `#6FA6F5`, `#FFA95E`, `#B596F5`, `#5ED1A7`, `#3C3C4C`.

Blue vs orange (verse vs chorus) also differ in lightness, so they stay distinguishable for colour-blind users.

## Shape and spacing

| Element | Radius |
| --- | --- |
| Buttons, inputs, CTA | 8 px |
| Section tiles | 6 px |
| Badges, tags, note chips | 4 px |
| Form-timeline blocks | 3 px |
| Beat dots | 0 (square) |

- Touch targets ≥ 44 × 44 px; primary CTA 56 px tall.
- Phone screen padding 16 px; section tiles 14 / 10 px inside; 6 px between tiles.
- Bars per row: 4 on phone, 8 on laptop. Bar lines 2 px in the section's bar colour; the last bar of a line also gets a closing line.

## Key components

- **Header** — back (icon button), position ("Song 2 of 6", uppercase meta), language toggle, theme toggle.
- **Meta line** — `KEY D · 135 BPM · 4/4 · CAPO 2 → C`: uppercase labels, bold values.
- **Form timeline** — one row of blocks, width proportional to bars × repeats (min 26 px), tile colour per section, abbreviation bottom-left; tap scrolls to the section. Always visible in the fixed header.
- **Instrument tabs** — text tabs with a 3 px `signal` underline on the active one; scroll horizontally if labels are long.
- **Capo control** (guitar view) — `−` / value / `+` plus suggested capos (`2 → C`, `7 → G`).
- **Section tile** — badge (abbr) + name + tag (`яма`) + `×N` on the right; band notes; bar grid.
- **Chord cell** — width ∝ beats; root large, quality and slash bass small; beat dots underneath; in guitar view shape large, sounding chord small below.
- **Personal note** — yellow dot in the bar's corner + highlighted chip under the line.
- **Bottom bar** — previous song · transposer (`−` key `+`, "original" / `+1`) · next song.
- **Setlist row** — number, title, key, meta, mini form strip, "Tonight:" note; rows separated by lines, current song marked by `signal` number.

## Choosing from options

| Number of options | Control |
| --- | --- |
| 2–4, fixed (theme, H/B notation, Text / Preview) | Radio rows or underline tabs |
| 5+ or a list that can grow (UI language, instrument, song, key) | **Searchable select** (combobox): a field showing the current value → opens a list with a search input on top, filtered as you type, current value marked |

Never a long row of toggles or chips for many options.

## Collaboration (future)

Change history and review — see [docs/ideas/change-history.md](../ideas/change-history.md). Visual rules already fixed:

- Authors are shown as square initials avatars (4 px radius) + name + role.
- Diffs are bar-level: removed bar with `−` marker and strike-through on a light red tint, added bar with `+` marker on a light green tint — markers carry the meaning, colour only supports it.
- No git words in the UI ("changes", "suggestion", "restore", "compare").

## Scrollbars

Minimal and neutral from day one:

```css
* { scrollbar-width: thin; scrollbar-color: rgba(128,128,128,.35) transparent; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(128,128,128,.35); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,.55); }
```

Horizontal strips (tabs, chips) hide the scrollbar entirely (`scrollbar-width: none`).

## Layout

- Phone: fixed header (title, meta, form timeline) + scrolling sections + fixed bottom bar. Only the middle scrolls.
- Laptop: setlist sidebar (≈300 px) + song area, 8 bars per row.

## Localisation

- UI language: **English by default**; **Ukrainian** shipped from day one; architecture ready for any language.
- Song content (titles, tags like `яма`, band notes, lyrics) is never translated.
- Every label must survive ~40% longer text: no fixed widths for text; labels either wrap (button groups, chips) or truncate with an ellipsis (titles, prev/next).
- Note naming (H/B) is a separate personal setting, independent of UI language.

## Exploration history

Design canvases (private to the author): v1 prototype — "Takt — stage screens"; v2 — "Takt — design v2" with directions A · Warm Stage, B · Paper Chart, C · Color Pop, C1 · Expressive, C2 · Swiss Blocks (chosen) and font options (Onest chosen over Manrope, Jost, Unbounded + Onest).

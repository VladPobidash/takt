# Design system — "Swiss Blocks" (v0)

The visual language of Takt. Chosen on 2026-10-25 after comparing five directions (see [Exploration history](#exploration-history)). Decision record: [ADR 0002](../decisions/0002-visual-direction.md).

**Status:** MVP design v1 accepted on 2026-10-26 — screens and sources in [mvp-v1/](mvp-v1/README.md). This document stays the source of truth for tokens and rules.

**In one line:** flat, editorial, high-contrast UI in **Onest**, where the only strong colour is the song itself — every section type has its own tile colour, consistent across all songs.

## Principles

1. **Chords first.** Chords are the largest, boldest, highest-contrast element on screen. Everything else is secondary.
2. **Colour = song structure.** Section colours are an orientation system, not decoration. UI chrome stays monochrome (plus one signal colour).
3. **No pills.** Rectangles with small radii (4–8 px). Selection is shown with an underline, fill or weight — not with capsules.
4. **Readable from a music stand.** Assume 1–1.5 m viewing distance, quick glances, hands busy.
5. **Two themes, both first-class.** Dark for the stage, light for daytime. Default follows the system setting.
6. **Built for any language.** English by default, Ukrainian from day one, any language later (see [Localisation](#localisation)).
7. **Every pixel of height counts.** No decorative air, no big hero titles, no bottom navigation. Chrome is as thin as touch targets allow; the song gets the rest.

## Typography

One family: **[Onest](https://fonts.google.com/specimen/Onest)** (has full Cyrillic), weights 400–800.

| Role | Size / weight | Notes |
| --- | --- | --- |
| Screen title in the top bar (section switcher) | 20 / 800, tracking −0.02em | |
| Song title in the top bar | 17 / 800 (phone), 20 (laptop) | one line, ellipsis; meta line 11 / 600 caps under it |
| Chord root | 25–26 / 800, tracking −0.02em | normal mode; 17 in compact mode |
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

- Touch targets ≥ 44 × 44 px (40 px wide is acceptable inside a grouped control). No element taller than it needs to be: top bar 52 px, tabs 40 px, player toolbar 56 px.
- Phone screen padding 10–12 px; section tiles 10 / 8 px inside (6 / 8 compact); 4–6 px between tiles; list rows 9–10 px vertical padding.
- Bars per row: 4 on phone, 8 on laptop (normal mode); 4 per column in compact mode. Bar lines 2 px in the section's bar colour; the last bar of a line also gets a closing line.

## Key components

- **Top bar (52 px)** — on main screens: section switcher (logo square + section name + chevron → menu with Service / Library / Settings) and contextual icon actions. On the song screen: back, song title + meta line, compact-mode toggle, view-options button. **No bottom navigation.**
- **Meta line** — `KEY D · 135 BPM · 4/4 · CAPO 2→C`: uppercase labels, bold values, one line.
- **Form timeline** — one row of blocks (30 px), width proportional to bars × repeats (min 24 px), tile colour per section, abbreviation bottom-left; tap scrolls to the section. Always visible in the fixed header. While auto-scrolling: passed sections fade to 45%, the current one gets a 3 px `signal` underline.
- **Instrument tabs** — text tabs (40 px) with a 3 px `signal` underline on the active one; scroll horizontally if labels are long.
- **Capo control** (guitar view) — `−` / value / `+` plus suggested capos (`2 → C`, `7 → G`).
- **Section tile** — badge (abbr) + name + tag (`яма`) + `×N` on the right; band notes; bar grid.
- **Chord cell** — width ∝ beats; root large, quality and slash bass small; beat dots underneath; in guitar view shape large, sounding chord small below.
- **Personal note** — yellow dot in the bar's corner + highlighted chip under the line.
- **Player toolbar (song screen, 56 px)** — previous (icon) · play/pause auto-scroll · status (section, "bar 2 of 4 · pass 3 of 4") · transposer (`−` key `+`) · next (icon).
- **Auto-scroll** — driven by the metronome (tempo, time signature, optional one-bar count-in). It counts bars and repeats, **highlights and scrolls to the current section only** (3 px inset outline in the section ink + "Now" badge). Chords and beats are never highlighted — that would distract.
- **Compact mode** — the whole song on one screen: chords 17 px, no beat dots, a 34 px label column (abbr, ×N, tag, "now" marker) instead of a header row. Phone: 1 column; laptop and tablets: 2–3 columns (CSS columns, sections never split).
- **View options (sheet)** — opened from the song's sliders icon. Scope tabs: *This song · This setlist · Everywhere*. Values cascade song → setlist → everywhere; each row shows its source ("From this setlist", "Set for this song" in `signal`) and a Reset link for overrides. Options: beat dots, guitar sounding chords under shapes, band notes, notes for my instrument, personal notes, open in compact mode. The "Everywhere" layer is also editable in Settings.
- **Setlist row** — number, title, key, meta + "tonight" note on one line, mini form strip (4 px); rows separated by lines, current song marked by `signal` number. "Start" is a compact button in the sub-header, not a full-width CTA.

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

- Phone, song: fixed header (top bar, form timeline, instrument tabs ≈ 136 px) + scrolling sections + player toolbar (56 px). Only the middle scrolls.
- Phone, other screens: top bar + content. No bottom navigation, no full-width footer bars unless the screen is a task flow (editor, review).
- Laptop: setlist sidebar (≈300 px) + song area; normal mode 8 bars per row, compact mode 3 columns.

## Localisation

- UI language: **English by default**; **Ukrainian** shipped from day one; architecture ready for any language.
- Song content (titles, tags like `яма`, band notes, lyrics) is never translated.
- Every label must survive ~40% longer text: no fixed widths for text; labels either wrap (button groups, chips) or truncate with an ellipsis (titles, prev/next).
- Note naming (H/B) is a separate personal setting, independent of UI language.

## Exploration history

Design canvases (private to the author): v1 prototype — "Takt — stage screens"; v2 — "Takt — design v2" with directions A · Warm Stage, B · Paper Chart, C · Color Pop, C1 · Expressive, C2 · Swiss Blocks (chosen) and font options (Onest chosen over Manrope, Jost, Unbounded + Onest); MVP — "Takt — MVP design", 12 boards, accepted as v1 and exported to [mvp-v1/](mvp-v1/README.md).

# Design brief (for Claude Design)

> The visual direction is now decided — see [README.md](README.md). This brief stays as the original input; where they differ, README.md wins.

Design starts with two screens: first the song in stage mode, then the service map. The other screens are supporting. The text below can be pasted into Claude Design as is. Design outputs (links, screenshots, exports) go into this folder.

**Product.** Takt — bar-based chord charts for instrumentalists: one arrangement, a view for every instrument. Lyrics are optional.

**Users and context.**

- A guitarist with a phone on a music stand 1–1.5 m from their eyes, hands busy, glancing at the screen.
- A keys player with a laptop or tablet.
- Bass and cajón players with phones.
- Conditions: a dark stage or a bright street. Services of 8+ songs that are similar in form.

**Screens**

1. **Song — stage mode** (primary).
    - Header: title, key, capo, BPM, time signature.
    - Form strip with color-coded sections.
    - Sections with a bar grid (4 bars per row on a phone, 8 on a laptop). Chord width depends on beats, with subtle beat marks underneath.
    - Repeats and cues ("dip", "quiet"), band notes and personal notes.
    - Instrument switcher. In the guitar view — capo shapes large, sounding chords small.
    - Lyrics toggle, transpose ±1, previous/next song.
2. **Service map.** All songs on one screen: number, title, key (+ capo), BPM, time signature, mini form strip, note for the night. Reorder by drag.
3. **Library.** Song list with search, import and export of files.
4. **Editor.** `.takt` text and live preview. On a phone — tabs and a quick-symbol bar above the keyboard.
5. **Settings.** My instrument, H/B notation, theme, font size, language (UA/EN).

**Visual principles**

- Chords come first: monospaced or tabular figures, high contrast. Everything else is secondary.
- Bars aligned in columns across lines, no centering.
- Section colors are stable across all songs: verse, chorus, bridge, intro/interlude — an orientation system, not decoration.
- Dark theme for the stage and light theme for daytime, both first-class.
- Large touch targets, one-handed use, minimal chrome.
- Screen widths: phone 360–430 px, laptop 1280+ px.

**Content for mockups.** The example from [format.md](../format.md) and a 6-song setlist: "Достойний Ти Один" (D, 135, 4/4), "Могутній Бог" (E, 86, 4/4), "Вдячність" (F#, 78, 6/8), "Маранафа" (Hm, 75, 4/4), "Боже, я вдячний Тобі" (D, 72, 4/4), "Краса Хреста" (B♭, 69). Song titles stay in Ukrainian — the band's UI language.

**Out of scope for now.** Accounts, cloud sync, live session, tap-based editor.

# Takt — Product Brief

Takt (working name) is a tool for instrumentalists: one arrangement, a dedicated view for every instrument. Open plain-text format, data stays on the device, open source. The first real-world test is a worship night on 12 December 2026; until then, weekly Saturday services serve as smaller tests.

Related: [`.takt` format v0](format.md) · [roadmap & open questions](roadmap.md) · [design brief](design/brief.md) · [decisions (ADR)](decisions/)

## Problem

Amateur musicians need a song's structure and its chords with durations in bars. Existing tools mostly show lyrics with chords above them. The pain is the same across three scenarios: a busker with a guitar, a four-piece band, and a church team of 10+ instruments playing an 8+ song service.

1. **Form and durations are invisible.** How many beats each chord gets, how many bars in a section, where the repeats are.
2. **No room for your own version.** A band's arrangement differs from the original, and chord sites don't let you change it.
3. **Every instrument sees the song differently.** Guitar plays with a capo in another key, bass has passing chords, keys have small parts, cajón has dynamics.
4. **Manual transposition.** Especially for guitar with a capo.
5. **No annotations.** Neither shared band cues ("dip", "quiet", "stop") nor personal notes.
6. **No service map.** One file = one song, so the file map is rebuilt before every service.
7. **Easy to get lost.** Songs are similar in form, key and mood.
8. **Hard to read.** In our PDF the text is centered, bars are not aligned, and durations are counted by asterisks (`E*** G*`).
9. **Needs to work on both phone and laptop.**

Constraint from experience: the tool must stay simple. Full notation solves everything, but someone has to write it out. Knowing your parts by heart is best, so the app is a safety net on stage, not a replacement for knowing the music.

## Existing solutions

Almost everything on the market is built around lyrics with chords (ChordPro). Only iReal Pro does a bar grid, and it is aimed at practicing with a backing band. Among the tools reviewed, none combines bars, per-instrument parts and an open plain-text format.

| Solution | Strengths | Gaps |
| --- | --- | --- |
| holychords.pro | Structure, live transposition, capo, hide chords or lyrics, good on phones | No custom version, annotations, durations, setlists or per-instrument parts |
| Our band's PDF (`\| E*** G* \|`) | Our form, durations, whole service in one file | Hard to read, no capo or transposition, no annotations |
| .docx (Purim Music style) | Lyrics and bars side by side, metadata (key, BPM, time) | One file = one song, no transposition or sync |
| .xlsx (my attempt) | Schematic grid, cues like "dip" and "powerful", a sheet per instrument | Hard to sync and to read on a phone |
| [WorshipTools Charts](https://apps.apple.com/us/app/charts-by-worshiptools/id1511797596) | Free, iOS + Android + web, setlists, capo, leader-driven sync | Lyrics-first, basic annotations, no per-instrument parts mentioned |
| [OnSong](https://learnofchrist.com/resources/onsong) | Strong capo and transposition, pedals, sync via Dropbox and Google Drive | Apple-only, paid, songs live in a database rather than text |
| [Planning Center Music Stand](https://help.planningcenter.com/en/138512-transpose-charts-in-music-stand.html) | Standard in large churches, personal transposition | Heavy for amateurs, tied to service planning |
| [SongbookPro](https://songbook-pro.com/) | iOS, Android, Windows, shared band library, handwritten annotations | Lyrics-first |
| [ChartBuilder (MultiTracks)](https://apps.apple.com/app/id1208264687) | Capo, number charts, annotations, scrolling synced to audio | Subscription, tied to the MultiTracks ecosystem |
| [iReal Pro](https://apps.apple.com/us/app/298206806) | Bar grid, transposition, backing tracks; $21.99, rated 4.9 from ~11K reviews | No per-instrument parts, closed format, mostly jazz and practice |
| [ChordPro (format)](https://chordpro.org/beta/directives-env_grid/) | Open standard; grid sections with bars, repeats, voltas | Lyrics-first, no concept of an instrument part |

Data collected on 24 October 2026.

## Vision and principles

**One arrangement — a view for every instrument.** The tool is for instrumentalists first; lyrics are optional. It works for one person with a guitar on the street and for a team of 10+ instruments.

**Philosophy.** I build the product for myself and my band. The code is open on GitHub: anyone who wants it can use it. Market considerations do not change the product.

- **Simple over complete.** Chords, bars and cues — not staff notation.
- **Plain text is the source of truth.** A song file is readable and editable without the app.
- **Close to how people already write.** The `| E*** G* |` notation from our PDF must parse as is.
- **Local-first.** Data lives on the device. The service has no song library of its own, stores no files and is not responsible for backups.
- **Sync through the user's own cloud.** OneDrive, Google Drive, etc., when needed. We are responsible only for functionality and the format.
- **Offline on stage.** The app does not depend on Wi-Fi.
- **Open format.** As compatible with ChordPro grid as possible, for import and export.
- **Phone first, comfortable on a laptop.**

Side benefits of local-first: servers cost almost nothing, and since we never store other people's lyrics or charts, there is no copyright exposure.

## Solution: key features

The core is a readable bar grid and the service map. Everything else is built around them.

**Song view**

- Bar grid: bars aligned in columns, text left-aligned.
- Duration is visible from width: a chord on 3 beats takes 3/4 of the bar, with subtle beat marks underneath. No counting asterisks.
- Header: key, BPM, time signature, capo (for guitar).
- Form strip: `I V1 C I V2 C C Inst B C`. Each section type has its own color, consistent across all songs. Tapping jumps to the section.
- Repeats (`x2`) and cues ("quiet", "dip", "powerful") shown as badges next to the line.
- Lyrics can be toggled on and off.

**Per-instrument view**

- Pick your instrument once per device: base harmony, guitar, bass, keys, drums/cajón.
- Guitar: capo is a view parameter, not a separate part. Chord shapes shown large, sounding chords small. The app suggests a capo, e.g. for F#: capo 2 → E shapes.
- Bass and keys see their own bars where they differ from the base, plus their own cues.

**Transposition and notation**

- Live transposition; sharps or flats chosen by the target key.
- H/B notation: in our tradition H = B and B = B♭. Display mode is a personal setting.

**Service map (setlist)**

- One screen with all songs: title, key (+ capo), BPM, time signature, mini form strip.
- Each song in a setlist can have its own key and a note for that night.
- Previous/next song: swipe, buttons, arrow keys or a pedal (pedals usually send arrows or PageUp/PageDown).

**Annotations**

- Shared band cues live in the song file.
- Personal notes live in a separate layer on the device: tap a bar or section — add a note.

**Stage and editing**

- Stage mode: large type, dark theme, screen stays awake, nothing extra. Optional dot blinking at tempo.
- Editor: text and live preview side by side on a laptop, tabs on a phone. Quick-symbol bar (`|` `*` `#` `/` `##` `@` `>`). Later — a tap-based bar editor.
- Import and export of `.takt` files; a setlist bundle as one file (to send via Telegram). Later — ChordPro grid.

## Data and sync (ideas for later)

The MVP has neither sync nor connectors: data lives on the device and the band exchanges files. Below are ideas and pitfalls, so the architecture doesn't close these doors.

1. **There are two kinds of sync.**
    - The library (songs, parts, setlists) goes through the user's cloud. A delay of seconds or minutes is fine.
    - A live session (leader moved to the bridge, transpose right now) cannot go through a cloud drive. It needs a direct device-to-device connection on the local network. On the web that means WebRTC, which needs a small server for device discovery. That server stores nothing, so the principle holds.
2. **Conflicts.** Cloud drives sync whole files and the last save wins. The defense is to split files by owner so that each person mostly writes only their own:

    ```
    dostoinyi/
      song.takt          ← form + harmony (arranger)
      bass.takt          ← bass differences only
      keys.takt
      notes/vlad.notes   ← personal notes
    setlists/2026-12-12.taktset
    ```

3. **Connectors may not be needed.** On iOS a native app can reach iCloud, Google Drive, OneDrive and Dropbox folders through Files. On Android the Storage Access Framework does the same. On desktop Chrome, the File System Access API lets the user pick a folder already synced by their cloud client. For offline use, the "keep on device" mode needs to be verified.
4. **Google Drive API.** Google classifies the `drive.file` scope as non-sensitive: only files the app created or the user picked via the Picker. Full `drive` is "restricted" and requires a security assessment if data passes through servers ([source](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)). So keep everything client-side on `drive.file`. Verify on a prototype how `drive.file` behaves with a shared folder created by another band member.
5. **iOS and browser storage.** For a PWA on iPhone, browser storage is not a reliable place for the only copy of data. In the MVP, file export is the safety net; later, a native wrapper (Capacitor or Tauri) with real files.
6. **Personal notes anchored to bars.** If tied to section/line/bar indices, they shift after the song is edited. Acceptable for v0. Later, introduce stable anchors: section name + bar number.
7. **Hosting.** The app is static: Railway Hobby (or GitHub Pages for free). Development happens in Claude Code in the cloud.

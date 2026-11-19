# Roadmap and open questions

## Stages to the worship night on 12 December

Each Saturday service is a test: afterwards we write down what got in the way. Dates are a guide, not a commitment.

**Re-planned on 2026-11-19.** The first plan put the song view on 31 October and the service map on 14 November; technical planning started only on 19 November, with no code written. Three Saturday services remain (21.11, 28.11, 5.12). Work is tracked in GitHub issues under [the MVP tracking issue](https://github.com/VladPobidash/takt/issues/1); every change reaches `main` through a pull request.

1. **24–26 October.** ✅ Repository and docs. ✅ Design system and MVP design v1 — accepted 26.10 ([screens](design/mvp-v1/README.md)).
2. **Stage 1 — by 22 November. Foundations and the format library.** ✅ Done on 19 November: the first example is a public-domain song, the band's own songs follow. Technical decisions ([questions](tech-planning.md)) → ADRs; repository scaffold and CI; first real song written in `.takt` by hand; parser, beat resolution, chords, transposition and capo, test-first on real lines from the PDF.
3. **Stage 2 — by 28 November. A song on a phone.** ✅ Done on 19 November except for checks on real phones: the app is live at <https://web-production-e41cbcc9.up.railway.app>. Song view (grid, durations, form timeline), instrument views and capo, transposition, H/B, library with file import, offline (PWA), EN + UA, deploy. First demo to the band at the Saturday service.
4. **Stage 3 — by 5 December. A whole service.** ✅ Features done on 19 November: the editor, export and backup, the service map, previous / next, compact mode and the tablet and laptop layout. Entering the band's songs and checks on real devices remain. Service map, previous / next with a pedal, stage mode, editor, export and backup, settings, compact mode, tablet and laptop layout. All worship-night songs entered; each member has added their part.
5. **5 December.** Dress rehearsal at a service, then bug fixes only.
6. **12 December.** Worship night.

The stretch features — auto-scroll with the metronome, the three-level view options, personal notes — were also built on 19 November.

After the worship night: cloud sync, live session, tap-based editor, native wrapper, [change history and review](ideas/change-history.md).

## Open questions

- [ ] Product name and file extension (`.takt` is a working name).
- [x] 6/8 time: one asterisk is an eighth note (6 per bar); `tempo` counts the dotted-quarter pulse ([ADR 0005](decisions/0005-format-library.md)). To confirm on the band's own 6/8 songs.
- [x] Empty bar `| |` and `%` are different: keep the last chord vs play the previous bar again ([ADR 0005](decisions/0005-format-library.md)).
- [ ] How to write small keys parts: text, note names, mini-tab? (v0: plain-text cues, `@keys > …`.)
- [ ] Rhythm cues for cajón and drums: just notes or a dedicated notation? (v0: plain-text cues, `@drums > …`.)
- [x] Repeats are shown folded as `×4`; the timeline and the metronome unroll them ([ADR 0005](decisions/0005-format-library.md)).
- [ ] Lyrics: only a block under the section, or eventually aligned to bars? (v0: a block under the section.)
- [x] PWA only for the MVP; a native wrapper later ([ADR 0007](decisions/0007-platform-pwa.md)).
- [x] App stack and UI foundation: React 19 + shadcn/ui (Base UI) + Tailwind v4, modern devices only ([ADR 0003](decisions/0003-ui-kit.md), accepted 2026-11-19).
- [x] Default H/B notation: the file decides (`notation:` header, or any `H` in it); otherwise the device setting, which starts as H for a Ukrainian UI and B for others ([ADR 0005](decisions/0005-format-library.md)).
- [x] Repository structure and tooling ([ADR 0004](decisions/0004-repo-structure-and-tooling.md), accepted 2026-11-19); format library design ([ADR 0005](decisions/0005-format-library.md)); testing ([ADR 0006](decisions/0006-testing.md)).
- [x] UI language: English by default, Ukrainian from day one ([ADR 0002](decisions/0002-visual-direction.md)).
- [x] Visual direction: "Swiss Blocks" in Onest ([ADR 0002](decisions/0002-visual-direction.md)).
- [x] MVP screens: design v1 accepted on 2026-10-26 ([mvp-v1](design/mvp-v1/README.md)).
- [x] License: Apache-2.0. Repository is public.

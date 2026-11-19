# Roadmap and open questions

## Stages to the worship night on 12 December

Each Saturday service is a test: afterwards we write down what got in the way. Dates are a guide, not a commitment.

**Re-planned on 2026-11-19.** The first plan put the song view on 31 October and the service map on 14 November; technical planning started only on 19 November, with no code written. Three Saturday services remain (21.11, 28.11, 5.12). Work is tracked in GitHub issues under [the MVP tracking issue](https://github.com/VladPobidash/takt/issues/1); every change reaches `main` through a pull request.

1. **24–26 October.** ✅ Repository and docs. ✅ Design system and MVP design v1 — accepted 26.10 ([screens](design/mvp-v1/README.md)).
2. **Stage 1 — by 22 November. Foundations and the format library.** Technical decisions ([questions](tech-planning.md)) → ADRs; repository scaffold and CI; first real song written in `.takt` by hand; parser, beat resolution, chords, transposition and capo, test-first on real lines from the PDF.
3. **Stage 2 — by 28 November. A song on a phone.** Song view (grid, durations, form timeline), instrument views and capo, transposition, H/B, library with file import, offline (PWA), EN + UA, deploy. First demo to the band at the Saturday service.
4. **Stage 3 — by 5 December. A whole service.** Service map, previous / next with a pedal, stage mode, editor, export and backup, settings, compact mode, tablet and laptop layout. All worship-night songs entered; each member has added their part.
5. **5 December.** Dress rehearsal at a service, then bug fixes only.
6. **12 December.** Worship night.

Stretch, only if stage 3 is finished early — otherwise after the worship night: auto-scroll with the metronome, the three-level view options, personal notes.

After the worship night: cloud sync, live session, tap-based editor, native wrapper, [change history and review](ideas/change-history.md).

## Open questions

- [ ] Product name and file extension (`.takt` is a working name).
- [ ] 6/8 time: is one asterisk an eighth note (6 per bar) or a pulse (2 per bar)?
- [ ] Empty bar `| |` and `%` — the same thing or different?
- [ ] How to write small keys parts: text, note names, mini-tab?
- [ ] Rhythm cues for cajón and drums: just notes or a dedicated notation?
- [ ] Show repeats as `x4` or unroll them (for "where are we now")?
- [ ] Lyrics: only a block under the section, or eventually aligned to bars?
- [ ] PWA or native wrapper from the start?
- [x] App stack and UI foundation: React 19 + shadcn/ui (Base UI) + Tailwind v4, modern devices only ([ADR 0003](decisions/0003-ui-kit.md), accepted 2026-11-19).
- [ ] Default H/B notation.
- [x] UI language: English by default, Ukrainian from day one ([ADR 0002](decisions/0002-visual-direction.md)).
- [x] Visual direction: "Swiss Blocks" in Onest ([ADR 0002](decisions/0002-visual-direction.md)).
- [x] MVP screens: design v1 accepted on 2026-10-26 ([mvp-v1](design/mvp-v1/README.md)).
- [x] License: Apache-2.0. Repository is public.

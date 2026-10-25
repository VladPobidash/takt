# Roadmap and open questions

## Stages to the worship night on 12 December

Six Saturday services remain before the worship night (31.10 – 5.12). Each one is a test: afterwards we write down what got in the way. Dates are a guide, not a commitment.

1. **24–25 October.** Repository and docs. Design of the two main screens in Claude Design. First song written in `.takt` by hand. Parser and tests on real lines from the PDF.
2. **By 31 October.** Song view: grid, durations, form strip, transposition, capo, H/B. First demo to the band.
3. **By 14 November.** Instrument parts, notes, service map, stage mode.
4. **By 28 November.** Editor, import and export, offline (PWA). All worship-night songs entered; each member has added their part.
5. **5 December.** Dress rehearsal at a service, then bug fixes only.
6. **12 December.** Worship night.

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
- [ ] Accept UI foundation: React + shadcn/ui (Base UI) + Tailwind ([ADR 0003](decisions/0003-ui-kit.md), proposed).
- [ ] Default H/B notation.
- [x] UI language: English by default, Ukrainian from day one ([ADR 0002](decisions/0002-visual-direction.md)).
- [x] Visual direction: "Swiss Blocks" in Onest ([ADR 0002](decisions/0002-visual-direction.md)).
- [x] License: Apache-2.0. Repository is public.

# 0012. Timing: auto-scroll follows a time anchor, section by section

- **Status:** accepted
- **Date:** 2026-11-19
- **Decided by:** Claude Code under the author's delegation of 2026-11-19 ("decide yourself") — open to revision.

## Context

Auto-scroll shows where the band is in the song: it counts bars and repeats at the song's tempo, highlights the current section and scrolls to it ([design system](../design/README.md)). Chords and beats are never highlighted. The prototype ticked with `setInterval`, which drifts by seconds over a song.

| Option | For | Against |
| --- | --- | --- |
| `setInterval` ticks added up | Trivial | Timers are late by a few milliseconds each time and throttled in the background: the count drifts |
| **Time anchor: `performance.now()` + `requestAnimationFrame`** | The position is computed from elapsed time, so it cannot drift and is right again after the tab was hidden; no audio permission, no extra thread | Not sample-accurate — irrelevant for a display that changes once per bar |
| Web Audio clock | Sample-accurate, needed for an audible click | Needs a user gesture and an audio context for a feature that makes no sound |
| Timer in a worker | Keeps ticking in the background | A hidden page has nothing to show; the anchor already gives the right position on return |

## Decision

- **Clock:** the start time of beat 0 is stored as a `performance.now()` anchor. Every animation frame the current beat is `(now − anchor) ÷ seconds per beat`; nothing is accumulated. React re-renders only when the bar changes.
- **Tempo:** `tempo` counts the pulse the band taps. In simple time that is the beat; in compound time (6/8, 9/8, 12/8) it is the dotted quarter, so a beat — an eighth, one `*` — lasts a third of it. In other eighth-note meters the tempo counts quarters.
- **Timeline:** the form is unrolled bar by bar: every pass of every section, line repeats included; a short bar lasts as long as its beats, an empty or `%` bar a full bar. Reused sections are played like any other.
- **Count-in:** one bar before the first section.
- **Current section** is the section of the bar being played. It gets a 3 px inset outline and a "Now" badge and is scrolled to the top when it changes; on the timeline earlier sections fade to 45% and the current one is underlined in the signal colour. The toolbar shows the section, "bar 2 of 4" and "pass 3 of 4".
- **Tapping the timeline while playing** continues from the start of that section — the way to re-sync when the band jumps. Scrolling by hand does not stop playback; the next section change scrolls again.
- **Background and lock:** the screen is kept awake by the wake lock ([ADR 0007](0007-platform-pwa.md)). If the page is hidden anyway, it shows the right place as soon as it is visible again.
- **No sound and no blinking dot in the MVP.** An audible click would be built on the Web Audio clock, scheduled from the same timeline.
- A song without a tempo cannot be followed; the button is disabled.

## Consequences

- No dependency and no permission prompt.
- The model is a pure function over the resolved song and is unit-tested; the end-to-end test drives it with a fake clock.
- The app does not listen to the band: when the tempo on stage moves, the display is off until someone taps the timeline.
- An audible click is a separate piece of work.

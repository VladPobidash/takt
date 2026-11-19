import type { ResolvedSong, TimeSignature } from "@takt/format";

/** One bar of the song as it is played, with repeats unrolled. */
export interface Step {
  /** Index into `song.sections`. */
  section: number;
  /** Which time through the section this is, from 1. */
  pass: number;
  passes: number;
  /** Bar number inside this pass, from 1. */
  bar: number;
  bars: number;
  /** Beat at which the bar starts, counted from the start of the song. */
  startBeat: number;
  beats: number;
}

export interface Timeline {
  steps: Step[];
  totalBeats: number;
}

/** Unrolls the form: every pass of every section, bar by bar (ADR 0012). */
export function buildTimeline(song: Pick<ResolvedSong, "sections" | "time">): Timeline {
  const steps: Step[] = [];
  let beat = 0;
  song.sections.forEach((section, index) => {
    const bars: number[] = [];
    for (const line of section.lines) {
      for (let repeat = 0; repeat < line.repeat; repeat++) {
        // An empty or repeated bar lasts a full bar of the time signature.
        for (const bar of line.bars) bars.push(bar.kind === "chords" ? bar.beats : song.time.beats);
      }
    }
    for (let pass = 1; pass <= section.repeat; pass++) {
      bars.forEach((beats, bar) => {
        steps.push({
          section: index,
          pass,
          passes: section.repeat,
          bar: bar + 1,
          bars: bars.length,
          startBeat: beat,
          beats,
        });
        beat += beats;
      });
    }
  });
  return { steps, totalBeats: beat };
}

/**
 * Seconds one beat (one `*`) lasts. `tempo` counts the pulse the band taps: the beat itself
 * in simple time, the dotted quarter (three eighths) in compound time such as 6/8.
 */
export function secondsPerBeat(tempo: number, time: TimeSignature): number {
  const compound = time.unit === 8 && time.beats % 3 === 0 && time.beats > 3;
  const beatsPerPulse = compound ? 3 : time.unit === 8 ? 2 : 1;
  return 60 / tempo / beatsPerPulse;
}

/** The bar being played at `beat`; null before the song starts or after it ends. */
export function stepAt(timeline: Timeline, beat: number): Step | null {
  if (beat < 0 || beat >= timeline.totalBeats) return null;
  let low = 0;
  let high = timeline.steps.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if ((timeline.steps[middle] as Step).startBeat <= beat) low = middle;
    else high = middle - 1;
  }
  return timeline.steps[low] ?? null;
}

/** The beat at which the first pass of a section starts; null if the section has no bars. */
export function sectionStart(timeline: Timeline, section: number): number | null {
  return timeline.steps.find((step) => step.section === section)?.startBeat ?? null;
}

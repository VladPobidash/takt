import type { ResolvedSong } from "@takt/format";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildTimeline, type Step, secondsPerBeat, sectionStart, stepAt } from "./playback.ts";

export interface Playback {
  /** False when the song has no tempo or no bars: there is nothing to follow. */
  available: boolean;
  playing: boolean;
  /** True during the one-bar count-in before the first section. */
  countIn: boolean;
  /** The bar being played; null when stopped or counting in. */
  step: Step | null;
  toggle: () => void;
  /** While playing, continues from the start of a section. */
  jumpTo: (section: number) => void;
}

/**
 * Follows the song at its tempo (ADR 0012). The position is always computed from the time
 * that has passed since an anchor (`performance.now()`), never by adding up ticks, so it
 * cannot drift and is right again after the tab was in the background.
 */
export function usePlayback(song: ResolvedSong | null): Playback {
  const timeline = useMemo(() => (song ? buildTimeline(song) : null), [song]);
  const beatSeconds = song && song.tempo !== null ? secondsPerBeat(song.tempo, song.time) : null;
  const available = Boolean(timeline && timeline.totalBeats > 0 && beatSeconds);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [countIn, setCountIn] = useState(false);
  /** `performance.now()` at beat 0 of the song. */
  const anchor = useRef(0);

  // The song changed under us (another instrument tab, an edit): stop.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the timeline identity is the trigger
  useEffect(() => {
    setPlaying(false);
    setStep(null);
    setCountIn(false);
  }, [timeline, beatSeconds]);

  useEffect(() => {
    if (!playing || !timeline || !beatSeconds) return;
    let frame = 0;
    const tick = () => {
      const beat = (performance.now() - anchor.current) / 1000 / beatSeconds;
      if (beat >= timeline.totalBeats) {
        setPlaying(false);
        setStep(null);
        setCountIn(false);
        return;
      }
      const next = stepAt(timeline, beat);
      // Same object for the same bar, so React re-renders once per bar, not once per frame.
      setStep(next);
      setCountIn(beat < 0);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // rAF is paused in a hidden tab; catch up as soon as the page is visible again.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [playing, timeline, beatSeconds]);

  const toggle = useCallback(() => {
    if (!song || !timeline || !beatSeconds) return;
    if (playing) {
      setPlaying(false);
      setStep(null);
      setCountIn(false);
      return;
    }
    // One bar of count-in before the first beat.
    anchor.current = performance.now() + song.time.beats * beatSeconds * 1000;
    setCountIn(true);
    setPlaying(true);
  }, [song, timeline, beatSeconds, playing]);

  const jumpTo = useCallback(
    (section: number) => {
      if (!playing || !timeline || !beatSeconds) return;
      const start = sectionStart(timeline, section);
      if (start !== null) anchor.current = performance.now() - start * beatSeconds * 1000;
    },
    [playing, timeline, beatSeconds],
  );

  return { available, playing, countIn, step, toggle, jumpTo };
}

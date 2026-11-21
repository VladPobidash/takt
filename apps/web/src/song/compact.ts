import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Compact mode: the whole song on one screen, on ONE grid.
 *
 * A bar has the same width everywhere in the song: every section has the same columns and a
 * bar takes exactly one of them, so bar lines of different sections meet and a verse bar is
 * never wider than a chorus bar. A line shorter than the grid leaves the rest of its row
 * empty; a longer line wraps.
 */

type Lines = { lines: { bars: { length: number } }[] };

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 8;
/** Sizes compact mode may shrink to, as a share of the design's sizes. Below 80% chords get hard to read. */
export const SCALES = [1, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.8];
const MIN_SCALE = SCALES[SCALES.length - 1] as number;
/** How much bigger a later candidate must be to replace an earlier one that fits. */
const BIGGER = 1.1;

/** Rows a song takes in a grid of `columns`, and how much of their width the bars fill (0–1). */
export function gridUse(columns: number, sections: Lines[]): { rows: number; fill: number } {
  let rows = 0;
  let used = 0;
  for (const section of sections) {
    for (const line of section.lines) {
      const bars = line.bars.length;
      if (bars === 0) continue;
      rows += Math.ceil(bars / columns);
      used += bars / columns;
    }
  }
  return { rows, fill: rows === 0 ? 1 : used / rows };
}

/**
 * Column counts worth trying for a song, best first: few rows, rows that are filled, and —
 * between near-equals — fewer, wider columns. Whether a count really fits the screen is
 * decided by measuring (see `useCompactFit`).
 */
export function columnCandidates(sections: Lines[]): number[] {
  const scored: { columns: number; score: number }[] = [];
  for (let columns = MIN_COLUMNS; columns <= MAX_COLUMNS; columns++) {
    const { rows, fill } = gridUse(columns, sections);
    scored.push({ columns, score: (rows / fill) * (1 + 0.02 * columns) });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.columns - b.columns)
    .map((item) => item.columns);
}

export interface CompactFit {
  /** Columns of the song's grid. */
  columns: number;
  /** Size of rows and chords, 1 = the design's size. */
  scale: number;
}

/** The largest scale step that is not larger than `ratio`. */
function scaleFor(ratio: number): number {
  return SCALES.find((scale) => scale <= ratio) ?? MIN_SCALE;
}

/**
 * Finds the grid and the size at which the song fits its screen, by measuring the real layout.
 * A candidate fits when no bar is wider than its cell and the song is not taller than the
 * scroller, at a scale of 80% or more. Candidates are tried in order and the first that fits is
 * taken — unless a later one fits clearly bigger (by more than 10%): seven narrow columns at
 * 80% lose to six at full size. If none fits (a very long song), the first candidate whose bars
 * fit the width is used and the song scrolls.
 */
export function useCompactFit(
  scroller: { current: HTMLElement | null },
  active: boolean,
  candidates: number[],
  resetKey: string,
): CompactFit {
  const start = (): CompactFit => ({ columns: candidates[0] ?? 4, scale: 1 });
  const [fit, setFit] = useState(start);
  const [resized, setResized] = useState(0);
  /**
   * Progress of the search. `shown` is the fit the layout must show for a measurement to count:
   * a render with an older fit is never measured.
   */
  const search = useRef({
    shown: null as CompactFit | null,
    index: 0,
    /** "fit": looking for a grid that fits the screen; "scroll": none does, only the width counts. */
    phase: "fit" as "fit" | "scroll" | "settled",
    /** The candidate to use so far: it fits the screen at this scale. */
    best: null as CompactFit | null,
    /** The first candidate whose bars are wide enough for their chords at 80% or more. */
    wideEnough: null as number | null,
    /** The scroller's size when the search started. */
    size: "",
  });
  const key = `${active}/${resetKey}/${candidates.join(",")}/${resized}`;

  const show = (next: CompactFit) => {
    search.current.shown = next;
    setFit(next);
  };

  // Start over when the content or the screen changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for everything that matters
  useLayoutEffect(() => {
    const element = scroller.current;
    const size = element ? `${element.clientWidth}x${element.clientHeight}` : "";
    search.current = { shown: null, index: 0, phase: "fit", best: null, wideEnough: null, size };
    show(start());
  }, [key]);

  // No dependency list: after every render the layout on screen is measured and, if it does
  // not fit, the next size or grid is tried. It settles within a few steps, before the paint.
  useLayoutEffect(() => {
    const element = scroller.current;
    const state = search.current;
    if (!active || !element || state.phase === "settled" || state.shown !== fit) return;

    let widthRatio = 1;
    for (const bar of element.querySelectorAll<HTMLElement>("[data-bar]")) {
      if (bar.scrollWidth > bar.clientWidth + 1)
        widthRatio = Math.min(widthRatio, bar.clientWidth / bar.scrollWidth);
    }
    const heightRatio =
      element.scrollHeight > element.clientHeight + 1
        ? element.clientHeight / element.scrollHeight
        : 1;
    const ratio = state.phase === "scroll" ? widthRatio : Math.min(widthRatio, heightRatio);
    // The scale this grid seems to need; the next step to try is at or just below it.
    const needed = fit.scale * ratio;
    const smaller = SCALES.find((scale) => scale < fit.scale && scale <= needed * 1.02);

    if (state.phase === "scroll") {
      // As small as the widest bar asks for, never below 80%.
      const next = smaller ?? MIN_SCALE;
      if (ratio < 1 && next < fit.scale) show({ columns: fit.columns, scale: next });
      else state.phase = "settled";
      return;
    }

    if (state.wideEnough === null && fit.scale * widthRatio >= MIN_SCALE * 0.98) {
      state.wideEnough = fit.columns;
    }
    // A later candidate is worth taking only when it is clearly bigger than the one we have.
    const floor = state.best ? state.best.scale * BIGGER : MIN_SCALE;
    if (ratio >= 1) {
      if (!state.best || fit.scale > floor) state.best = fit;
    } else if (smaller !== undefined && needed >= MIN_SCALE * 0.98 && smaller > floor * 0.999) {
      show({ columns: fit.columns, scale: smaller });
      return;
    }
    // This candidate is done. Go on while a later one could still be clearly bigger.
    const next = candidates[state.index + 1];
    if (next !== undefined && (!state.best || state.best.scale * BIGGER < 1)) {
      state.index += 1;
      show({ columns: next, scale: 1 });
      return;
    }
    if (state.best) {
      state.phase = "settled";
      if (state.best !== fit) show(state.best);
      return;
    }
    // Nothing fits the screen: the song scrolls, at the size its chords need.
    state.phase = "scroll";
    show({ columns: state.wideEnough ?? candidates[0] ?? 4, scale: 1 });
  });

  useEffect(() => {
    const element = scroller.current;
    if (!active || !element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      // The observer also reports the size it starts with: only a real change restarts the search.
      if (`${element.clientWidth}x${element.clientHeight}` !== search.current.size)
        setResized((count) => count + 1);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [scroller, active]);

  return active ? fit : start();
}

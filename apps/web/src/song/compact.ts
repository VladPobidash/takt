import type { ResolvedLine } from "@takt/format";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** More bars than this in one row are too narrow to read on any screen. */
const MAX_COLUMNS = 8;

/** Bars per row for a line of `bars` bars: all of them, or equal rows when there are more than eight. */
function balanced(bars: number): number {
  if (bars === 0) return 0;
  return Math.ceil(bars / Math.ceil(bars / MAX_COLUMNS));
}

/**
 * How many bars a compact section puts in a row: as many as its longest line has, so a
 * three-bar line fills the width and a five-bar line does not leave one bar on a row of
 * its own. All lines of the section share these columns, which keeps the bar lines aligned.
 */
export function compactColumns(lines: Pick<ResolvedLine, "bars">[]): number {
  return Math.max(1, ...lines.map((line) => balanced(line.bars.length)));
}

/**
 * The columns that actually fit: starts from `wanted` and halves while the grid is wider
 * than its box (long chord names on a narrow screen). Measured again when the width changes.
 */
export function useFittingColumns(wanted: number) {
  const grid = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(wanted);

  useLayoutEffect(() => setColumns(wanted), [wanted]);

  // No dependency list: measured after every render; it settles in a step or two.
  useLayoutEffect(() => {
    const element = grid.current;
    if (element && columns > 1 && element.scrollWidth > element.clientWidth + 1) {
      setColumns(Math.ceil(columns / 2));
    }
  });

  useEffect(() => {
    const element = grid.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      setColumns(wanted);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [wanted]);

  return { grid, columns };
}

/** Sizes compact mode may shrink to, as a share of the design's sizes. Below 80% chords get hard to read. */
const SCALES = [1, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.8];

/**
 * Fits the compact song to the screen: while the content is taller than its scroller, the
 * next smaller scale is tried. `resetKey` changes when the content does (song, instrument,
 * transposition), and the size starts from full again; so does a change of the screen size.
 */
export function useFitScale(
  scroller: { current: HTMLElement | null },
  active: boolean,
  resetKey: string,
): number {
  const [step, setStep] = useState(0);
  const [size, setSize] = useState("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: these are the triggers for starting over
  useLayoutEffect(() => setStep(0), [active, resetKey, size]);

  // No dependency list: measured after every render; it settles within the few steps above.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!active || !element || step >= SCALES.length - 1) return;
    if (element.scrollHeight > element.clientHeight + 1) setStep(step + 1);
  });

  useEffect(() => {
    const element = scroller.current;
    if (!active || !element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      setSize(`${element.clientWidth}x${element.clientHeight}`),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [scroller, active]);

  return active ? (SCALES[step] ?? 1) : 1;
}

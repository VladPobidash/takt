import type { Bar, ResolvedLine, TimeSignature } from "@takt/format";
import { ChordName } from "./Chord.tsx";
import { displayChord, type SongDisplay } from "./view.ts";

export interface BarGridOptions {
  display: SongDisplay;
  time: TimeSignature;
  beatDots: boolean;
  /** Under a capo shape, also show the sounding chord. */
  soundingChords: boolean;
  /** Compact mode: the whole song on one screen — small chords, no beat dots, one grid for the song. */
  compact?: boolean;
  /** Compact mode: columns of the song's grid (see `compact.ts`). */
  columns?: number;
}

/**
 * One line of bars: 4 per row on a phone, 8 on wide screens (plain DOM, ADR 0003).
 * A chord's width is proportional to its beats; a short bar is drawn narrower.
 */
export interface LineNotes {
  /** The personal note on each bar of the line, by bar index. */
  notes: (string | undefined)[];
  /** A bar was tapped: open its note. */
  onTap: (bar: number) => void;
  /** Label of the tap target, e.g. "Personal note, bar 4". */
  label: (bar: number) => string;
  /** False hides dots and chips (view option) but keeps bars tappable. */
  visible: boolean;
}

export function BarLine({
  line,
  options,
  personal,
  shared = false,
}: {
  line: ResolvedLine;
  options: BarGridOptions;
  personal?: LineNotes;
  /**
   * The bars are placed straight into the section's grid (compact mode), which has the
   * columns of the whole song: one bar, one column. Otherwise the line is a grid of its own.
   */
  shared?: boolean;
}) {
  const extras = [line.repeat > 1 ? `×${line.repeat}` : null, line.cue].filter(Boolean).join(" · ");
  const bars = line.bars.map((bar, index) => (
    <BarCell
      // Bars have no identity of their own: the position in the line is the key.
      // biome-ignore lint/suspicious/noArrayIndexKey: static list, never reordered
      key={index}
      bar={bar}
      first={index === 0}
      last={index === line.bars.length - 1}
      options={options}
      noted={Boolean(personal?.visible && personal.notes[index])}
      onTap={personal ? () => personal.onTap(index) : undefined}
      tapLabel={personal?.label(index)}
    />
  ));
  const chips =
    personal?.visible &&
    personal.notes
      .flatMap((note, bar) => (note ? [{ bar, note }] : []))
      .map((item) => (
        <button
          type="button"
          key={item.bar}
          onClick={() => personal.onTap(item.bar)}
          className="mr-1 mt-1 inline-flex max-w-full items-center gap-1.5 rounded-badge bg-mine-bg px-1.5 py-0.5 text-left text-[12px] font-semibold text-mine-fg"
        >
          <span aria-hidden="true" className="size-2 shrink-0 bg-mine-dot" />
          <span className="min-w-0 break-words">{item.note}</span>
        </button>
      ));
  const hasChips = Array.isArray(chips) && chips.length > 0;

  if (shared) {
    return (
      <>
        {line.label && (
          <p className="col-span-full text-[12px] font-semibold opacity-80">{line.label}</p>
        )}
        {bars}
        {extras && (
          <p className="col-span-full text-right text-[12px] font-bold opacity-80">{extras}</p>
        )}
        {hasChips && <div className="col-span-full">{chips}</div>}
      </>
    );
  }
  return (
    <div>
      {line.label && <p className="mb-0.5 text-[12px] font-semibold opacity-80">{line.label}</p>}
      <div className="grid grid-cols-4 gap-y-1.5 wide:grid-cols-8">{bars}</div>
      {extras && <p className="mt-0.5 text-right text-[12px] font-bold opacity-80">{extras}</p>}
      {chips}
    </div>
  );
}

function BarCell({
  bar,
  first,
  last,
  options,
  noted,
  onTap,
  tapLabel,
}: {
  bar: Bar;
  /** The first bar of a line starts a new row of the grid. */
  first: boolean;
  last: boolean;
  options: BarGridOptions;
  /** The bar has a personal note: a yellow dot in its corner. */
  noted: boolean;
  onTap?: () => void;
  tapLabel?: string;
}) {
  const { display, time } = options;
  const width = Math.min(1, bar.beats / time.beats);
  const dots = Math.max(1, Math.round(bar.beats));
  let position = 0;
  return (
    <div data-bar className={`relative min-w-0 ${first ? "col-start-1" : ""}`}>
      {onTap && (
        // The whole bar is the tap target; the chords stay plain text underneath.
        <button
          type="button"
          aria-label={tapLabel}
          onClick={onTap}
          // A bar is only as tall as its content, so the target also takes half of the gap
          // above and below it.
          className={`absolute inset-x-0 z-10 rounded-badge ${options.compact ? "inset-y-0" : "-inset-y-[3px]"}`}
        />
      )}
      {noted && <span aria-hidden="true" className="absolute right-1 top-0 size-2 bg-mine-dot" />}
      <div
        // A bar is as tall as what it shows: without beat dots and sounding chords it is just
        // the chord. Compact: the closing line is drawn just outside the bar, exactly where the
        // next column's line would be, so it meets the bar lines of the other sections.
        className={`flex flex-col justify-between border-l-2 border-bar ${options.compact ? "min-h-[calc(22px*var(--compact-scale,1))] pl-1" : "min-h-[calc(var(--chord-size,25px)+4px)] pl-1.5"} ${last ? (options.compact ? "shadow-[2px_0_0_var(--bar)]" : "border-r-2") : ""}`}
        style={{ width: `${width * 100}%` }}
      >
        <div className={`flex min-w-0 items-start ${options.compact ? "gap-x-1" : "gap-x-1.5"}`}>
          {bar.kind === "repeat" && (
            <span className="text-[22px] font-extrabold leading-none opacity-60">%</span>
          )}
          {bar.cells.map((cell) => {
            const gap = cell.start - position;
            position = cell.start + cell.beats;
            const shown = cell.chord ? displayChord(cell.chord, display) : null;
            return (
              <div
                key={cell.start}
                className="flex min-w-0 flex-col gap-1"
                style={{
                  // Never narrower than its text; the room that is left is shared by beats.
                  flex: `${cell.beats} 0 auto`,
                  marginLeft: gap > 0 ? `${(gap / bar.beats) * 100}%` : 0,
                }}
              >
                {shown ? (
                  <>
                    <ChordName chord={shown.main} />
                    {shown.sounding && options.soundingChords && (
                      <ChordName chord={shown.sounding} small />
                    )}
                  </>
                ) : (
                  <span className="whitespace-nowrap text-[15px] font-bold leading-none opacity-70">
                    {cell.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {options.beatDots && !options.compact && (
          <div aria-hidden="true" data-beat-dots className="mt-1.5 flex">
            {Array.from({ length: dots }, (_, beat) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: identical decorative dots
              <span key={beat} className="flex-1">
                <span className="block size-[3px] bg-bar" />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

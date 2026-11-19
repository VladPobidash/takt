import type { Bar, ResolvedLine, TimeSignature } from "@takt/format";
import { ChordName } from "./Chord.tsx";
import { displayChord, type SongDisplay } from "./view.ts";

export interface BarGridOptions {
  display: SongDisplay;
  time: TimeSignature;
  beatDots: boolean;
  /** Under a capo shape, also show the sounding chord. */
  soundingChords: boolean;
}

/**
 * One line of bars: 4 per row on a phone, 8 on wide screens (plain DOM, ADR 0003).
 * A chord's width is proportional to its beats; a short bar is drawn narrower.
 */
export function BarLine({ line, options }: { line: ResolvedLine; options: BarGridOptions }) {
  const extras = [line.repeat > 1 ? `×${line.repeat}` : null, line.cue].filter(Boolean).join(" · ");
  return (
    <div>
      {line.label && <p className="mb-0.5 text-[12px] font-semibold opacity-80">{line.label}</p>}
      <div className="grid grid-cols-4 gap-y-1.5 wide:grid-cols-8">
        {line.bars.map((bar, index) => (
          <BarCell
            // Bars have no identity of their own: the position in the line is the key.
            // biome-ignore lint/suspicious/noArrayIndexKey: static list, never reordered
            key={index}
            bar={bar}
            last={index === line.bars.length - 1}
            options={options}
          />
        ))}
      </div>
      {extras && <p className="mt-0.5 text-right text-[12px] font-bold opacity-80">{extras}</p>}
    </div>
  );
}

function BarCell({ bar, last, options }: { bar: Bar; last: boolean; options: BarGridOptions }) {
  const { display, time } = options;
  const width = Math.min(1, bar.beats / time.beats);
  const dots = Math.max(1, Math.round(bar.beats));
  let position = 0;
  return (
    <div className="min-w-0">
      <div
        className={`flex min-h-11 flex-col justify-between border-l-2 border-bar pl-1.5 ${last ? "border-r-2" : ""}`}
        style={{ width: `${width * 100}%` }}
      >
        <div className="flex min-w-0 items-start gap-x-1.5">
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
        {options.beatDots && (
          <div aria-hidden="true" className="mt-1.5 flex">
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

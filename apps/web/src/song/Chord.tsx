import type { ChordText } from "./view.ts";

/** A chord name: the root large, quality and slash bass small (bass at 70% opacity). */
export function ChordName({ chord, small = false }: { chord: ChordText; small?: boolean }) {
  if (small) {
    return (
      <span className="whitespace-nowrap text-[12px] font-bold leading-none opacity-75">
        {chord.root}
        {chord.quality}
        {chord.bass && `/${chord.bass}`}
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap leading-none">
      <span className="text-[length:var(--chord-size,25px)] font-extrabold tracking-[-0.02em]">
        {chord.root}
      </span>
      <span className="text-[calc(var(--chord-size,25px)*0.6)] font-bold">
        {chord.quality}
        {chord.bass && <span className="opacity-70">/{chord.bass}</span>}
      </span>
    </span>
  );
}

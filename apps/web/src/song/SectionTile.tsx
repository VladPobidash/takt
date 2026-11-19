import type { ResolvedSection } from "@takt/format";
import { useApp } from "../app-context.tsx";
import type { MessageKey } from "../i18n/en.ts";
import { type BarGridOptions, BarLine } from "./BarGrid.tsx";

const INSTRUMENT_LABEL: Record<string, MessageKey> = {
  guitar: "instrument.guitar",
  bass: "instrument.bass",
  keys: "instrument.keys",
  drums: "instrument.drums",
};

export const sectionAnchor = (index: number) => `s${index + 1}`;

/** A section of the song as a coloured tile: badge, name, tag, repeat, notes, bars. */
export function SectionTile({
  section,
  options,
}: {
  section: ResolvedSection;
  options: BarGridOptions;
}) {
  const { t } = useApp();
  const notes = section.notes.map((note) => {
    const label = note.instrument === null ? "song.bandNote" : INSTRUMENT_LABEL[note.instrument];
    return (
      <p
        key={`${note.instrument}:${note.text}`}
        className={options.compact ? "text-[12px] font-semibold" : "mb-2 text-[13px] font-semibold"}
      >
        <b className="font-extrabold">{label ? t(label) : note.instrumentName}:</b> {note.text}
      </p>
    );
  });
  const lines = (
    <div className={`flex flex-col ${options.compact ? "gap-1" : "gap-2.5"}`}>
      {section.lines.map((line, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
        <BarLine key={index} line={line} options={options} />
      ))}
    </div>
  );
  const badge = section.abbr && (
    <span className="grid h-6 min-w-6 place-items-center rounded-badge bg-ink px-1 text-[12px] font-extrabold text-tile">
      {section.abbr}
    </span>
  );

  if (options.compact) {
    // A narrow label column replaces the header row.
    return (
      <section
        id={sectionAnchor(section.index)}
        data-section={section.type}
        aria-label={section.name}
        className="mb-1 flex break-inside-avoid gap-1.5 rounded-tile bg-tile px-1.5 py-1.5 text-ink"
      >
        <div className="flex w-[34px] shrink-0 flex-col items-start gap-0.5">
          {badge}
          {section.repeat > 1 && (
            <span className="text-[12px] font-extrabold">×{section.repeat}</span>
          )}
          {section.tag && (
            <span className="max-w-full break-words rounded-badge bg-ink px-1 text-[10px] font-bold leading-tight text-tile">
              {section.tag}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {lines}
          {notes}
        </div>
      </section>
    );
  }

  return (
    <section
      id={sectionAnchor(section.index)}
      data-section={section.type}
      aria-label={section.name}
      className="scroll-mt-1 rounded-tile bg-tile px-2 py-2.5 text-ink"
    >
      <header className="mb-2 flex items-center gap-2">
        {badge}
        <h2 className="min-w-0 truncate text-[16px] font-bold">{section.name}</h2>
        {section.tag && (
          <span className="shrink-0 rounded-badge bg-ink px-1.5 py-0.5 text-[12px] font-bold text-tile">
            {section.tag}
          </span>
        )}
        {section.repeat > 1 && (
          <span className="ml-auto shrink-0 text-[16px] font-extrabold">×{section.repeat}</span>
        )}
      </header>
      {notes}
      {lines}
    </section>
  );
}

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

export interface SectionNotes {
  barNote: (line: number, bar: number) => string | undefined;
  barLabel: (line: number, bar: number) => string;
  /** The note on the section as a whole. */
  sectionNote: string | undefined;
  /** `line` and `bar` are null for the section itself. */
  onTap: (line: number | null, bar: number | null) => void;
  visible: boolean;
}

export const sectionAnchor = (index: number) => `s${index + 1}`;

/** A section of the song as a coloured tile: badge, name, tag, repeat, notes, bars. */
export function SectionTile({
  section,
  options,
  now = false,
  personal,
}: {
  section: ResolvedSection;
  options: BarGridOptions;
  /** Auto-scroll is playing this section: it gets an outline, never the chords or beats. */
  now?: boolean;
  /** Personal notes of this section; leave out where notes cannot be edited (editor preview). */
  personal?: SectionNotes;
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
  const sectionChip = personal?.visible && personal.sectionNote && (
    <button
      type="button"
      onClick={() => personal.onTap(null, null)}
      className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-badge bg-mine-bg px-1.5 py-0.5 text-left text-[12px] font-semibold text-mine-fg"
    >
      <span aria-hidden="true" className="size-2 shrink-0 bg-mine-dot" />
      <span className="min-w-0 break-words">{personal.sectionNote}</span>
    </button>
  );
  const lineOf = (line: ResolvedSection["lines"][number], index: number, shared: boolean) => (
    <BarLine
      // Lines are positional: a line has no identity of its own.
      key={index}
      line={line}
      options={options}
      shared={shared}
      personal={
        personal && {
          notes: line.bars.map((_, bar) => personal.barNote(index, bar)),
          onTap: (bar) => personal.onTap(index, bar),
          label: (bar) => personal.barLabel(index, bar),
          visible: personal.visible,
        }
      }
    />
  );
  // Compact: every section has the columns of the whole song, so a bar has one width everywhere
  // and bar lines meet across sections.
  const lines = options.compact ? (
    <div
      className="grid gap-y-0.5"
      style={{ gridTemplateColumns: `repeat(${options.columns ?? 4}, minmax(0, 1fr))` }}
    >
      {section.lines.map((line, index) => lineOf(line, index, true))}
    </div>
  ) : (
    <div className="flex flex-col gap-2.5">
      {section.lines.map((line, index) => lineOf(line, index, false))}
    </div>
  );
  const badge = section.abbr && (
    <span
      className={`grid min-w-6 place-items-center rounded-badge bg-ink px-1 text-[12px] font-extrabold text-tile ${
        options.compact ? "h-[calc(24px*var(--compact-scale,1))]" : "h-6"
      }`}
    >
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
        aria-current={now ? "step" : undefined}
        className={`mb-[calc(4px*var(--compact-scale,1))] flex break-inside-avoid gap-1.5 rounded-tile bg-tile px-1.5 py-[calc(4px*var(--compact-scale,1))] text-ink ${now ? "shadow-[inset_0_0_0_3px_var(--ink)]" : ""}`}
      >
        <div className="flex w-[34px] shrink-0 flex-col items-start gap-0.5">
          {badge}
          {section.repeat > 1 && (
            <span className="text-[12px] font-extrabold">×{section.repeat}</span>
          )}
          {now && (
            <span
              role="img"
              aria-label={t("song.now")}
              className="mt-0.5 block size-2.5 bg-signal"
            />
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
          {sectionChip}
        </div>
      </section>
    );
  }

  return (
    <section
      id={sectionAnchor(section.index)}
      data-section={section.type}
      aria-label={section.name}
      aria-current={now ? "step" : undefined}
      className={`scroll-mt-1 rounded-tile bg-tile px-2 py-2.5 text-ink ${now ? "shadow-[inset_0_0_0_3px_var(--ink)]" : ""}`}
    >
      <header className="mb-2 flex items-center gap-2">
        {badge}
        <h2 className="min-w-0 truncate text-[16px] font-bold">
          {personal ? (
            <button
              type="button"
              onClick={() => personal.onTap(null, null)}
              className="max-w-full truncate text-left"
            >
              {section.name}
            </button>
          ) : (
            section.name
          )}
        </h2>
        {section.tag && (
          <span className="shrink-0 rounded-badge bg-ink px-1.5 py-0.5 text-[12px] font-bold text-tile">
            {section.tag}
          </span>
        )}
        {now && (
          <span className="shrink-0 rounded-badge bg-ink px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-tile">
            {t("song.now")}
          </span>
        )}
        {section.repeat > 1 && (
          <span className="ml-auto shrink-0 text-[16px] font-extrabold">×{section.repeat}</span>
        )}
      </header>
      {notes}
      {sectionChip}
      {lines}
    </section>
  );
}

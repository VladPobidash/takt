import { parse, resolveSong } from "@takt/format";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useApp } from "../app-context.tsx";
import type { MessageKey } from "../i18n/en.ts";
import type { InstrumentChoice } from "../storage/app-state.ts";
import { BackIcon, MinusIcon, PlusIcon } from "../ui/icons.tsx";
import { IconButton } from "../ui/TopBar.tsx";
import { FormTimeline } from "./FormTimeline.tsx";
import { SectionTile } from "./SectionTile.tsx";
import { capoLabel, keyLabel, songDisplay } from "./view.ts";

const TABS: { id: InstrumentChoice; label: MessageKey }[] = [
  { id: "harmony", label: "instrument.harmony" },
  { id: "guitar", label: "instrument.guitar" },
  { id: "bass", label: "instrument.bass" },
  { id: "keys", label: "instrument.keys" },
  { id: "drums", label: "instrument.drums" },
];
const MAX_CAPO = 11;

export function SongScreen({ id }: { id: string }) {
  const { songs, settings, t } = useApp();
  const stored = songs.find((song) => song.id === id);
  const [instrument, setInstrument] = useState<InstrumentChoice>(settings.instrument);
  const [transpose, setTranspose] = useState(0);
  const [capoChoice, setCapoChoice] = useState<number | null>(null);

  const doc = useMemo(
    () => (stored ? parse(stored.text, { defaultNotation: settings.notation }).doc : null),
    [stored, settings.notation],
  );
  const song = useMemo(
    () =>
      doc ? resolveSong(doc, { instrument: instrument === "harmony" ? null : instrument }) : null,
    [doc, instrument],
  );

  if (!song) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex h-[52px] items-center px-1">
          <Link
            href="/library"
            aria-label={t("common.back")}
            className="grid size-11 place-items-center"
          >
            <BackIcon />
          </Link>
        </header>
        <p className="px-4 text-muted">{t("song.notFound")}</p>
      </div>
    );
  }

  const guitar = instrument === "guitar";
  const capo = guitar ? (capoChoice ?? song.capo ?? 0) : 0;
  const display = songDisplay(song, { notation: settings.notation, transpose, capo });
  const options = {
    display,
    time: song.time,
    beatDots: settings.beatDots,
    soundingChords: settings.soundingChords,
  };
  const meta: [string, string][] = [
    [t("song.key"), keyLabel(display.soundingKey, settings.notation)],
  ];
  if (song.tempo !== null) meta.push(["", `${song.tempo} ${t("song.bpm")}`]);
  meta.push(["", `${song.time.beats}/${song.time.unit}`]);
  if (capo > 0) meta.push([t("song.capo"), capoLabel(capo, display.shapeKey, settings.notation)]);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-line pb-0">
        <div className="flex h-[52px] items-center gap-1 px-1">
          <Link
            href="/library"
            aria-label={t("common.back")}
            className="grid size-11 shrink-0 place-items-center"
          >
            <BackIcon />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-[-0.01em] wide:text-[20px]">
              {song.title ?? id}
            </h1>
            <p className="truncate text-[11px] font-semibold leading-tight tracking-[0.06em] text-muted">
              {meta.map(([label, value], index) => (
                <span key={label + value}>
                  {index > 0 && " · "}
                  {label && <span className="uppercase">{label} </span>}
                  {/* Values keep their case: "Bb" must not become "BB". */}
                  <span className="font-extrabold text-text">{value}</span>
                </span>
              ))}
            </p>
          </div>
        </div>
        <FormTimeline form={song.form} sections={song.sections} />
        <div
          role="tablist"
          aria-label={t("song.instruments")}
          className="no-scrollbar mt-1 flex gap-4 overflow-x-auto px-3"
        >
          {TABS.map((tab) => (
            <button
              type="button"
              role="tab"
              key={tab.id}
              aria-selected={instrument === tab.id}
              onClick={() => setInstrument(tab.id)}
              className={`h-10 shrink-0 border-b-[3px] text-[15px] ${
                instrument === tab.id
                  ? "border-signal font-extrabold"
                  : "border-transparent font-semibold text-muted"
              }`}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 pt-2">
        {guitar && (
          <div className="mb-2 flex flex-wrap items-center gap-2 px-0.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
              {t("song.capo")}
            </span>
            <IconButton
              label={t("song.capoDown")}
              variant="surface"
              disabled={capo === 0}
              onClick={() => setCapoChoice(Math.max(0, capo - 1))}
            >
              <MinusIcon />
            </IconButton>
            <span className="w-5 text-center text-[17px] font-extrabold">{capo}</span>
            <IconButton
              label={t("song.capoUp")}
              variant="surface"
              disabled={capo === MAX_CAPO}
              onClick={() => setCapoChoice(Math.min(MAX_CAPO, capo + 1))}
            >
              <PlusIcon />
            </IconButton>
            {display.capoSuggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion.capo}
                aria-pressed={suggestion.capo === capo}
                onClick={() => setCapoChoice(suggestion.capo)}
                className={`h-11 rounded-control px-3 text-[14px] font-bold ${
                  suggestion.capo === capo ? "bg-accent text-accent-fg" : "bg-surface"
                }`}
              >
                {capoLabel(suggestion.capo, suggestion.shapeKey, settings.notation)}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {song.sections.map((section) => (
            <SectionTile key={section.index} section={section} options={options} />
          ))}
        </div>
      </main>

      <footer className="flex h-14 shrink-0 items-center justify-end gap-2 border-t border-line px-3 pb-[env(safe-area-inset-bottom)]">
        <IconButton
          label={t("song.transposeDown")}
          variant="surface"
          onClick={() => setTranspose(transpose - 1)}
        >
          <MinusIcon />
        </IconButton>
        <button
          type="button"
          onClick={() => setTranspose(0)}
          disabled={transpose % 12 === 0}
          className="flex w-16 flex-col items-center leading-tight"
        >
          <span className="text-[17px] font-extrabold">
            {keyLabel(display.soundingKey, settings.notation)}
          </span>
          <span className="text-[11px] font-semibold text-muted">
            {transpose % 12 === 0
              ? t("song.original")
              : `${transpose > 0 ? "+" : "−"}${Math.abs(transpose)}`}
          </span>
        </button>
        <IconButton
          label={t("song.transposeUp")}
          variant="surface"
          onClick={() => setTranspose(transpose + 1)}
        >
          <PlusIcon />
        </IconButton>
      </footer>
    </div>
  );
}

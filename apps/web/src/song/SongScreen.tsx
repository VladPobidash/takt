import { parse, resolveSong } from "@takt/format";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "../app-context.tsx";
import type { MessageKey } from "../i18n/en.ts";
import type { InstrumentChoice } from "../storage/app-state.ts";
import { BackIcon, EditIcon, MinusIcon, NextIcon, PlusIcon, PreviousIcon } from "../ui/icons.tsx";
import { IconButton } from "../ui/TopBar.tsx";
import { FormTimeline } from "./FormTimeline.tsx";
import { SectionTile } from "./SectionTile.tsx";
import { useWakeLock } from "./useWakeLock.ts";
import { capoLabel, keyLabel, songDisplay } from "./view.ts";

const TABS: { id: InstrumentChoice; label: MessageKey }[] = [
  { id: "harmony", label: "instrument.harmony" },
  { id: "guitar", label: "instrument.guitar" },
  { id: "bass", label: "instrument.bass" },
  { id: "keys", label: "instrument.keys" },
  { id: "drums", label: "instrument.drums" },
];
const MAX_CAPO = 11;

/** Where a song sits in a setlist, when it was opened from one. */
export interface SetlistContext {
  backHref: string;
  /** Transposition chosen for this song in the setlist. */
  transpose: number;
  /** Stores a new transposition in the setlist. */
  onTranspose: (semitones: number) => void;
  previousHref: string | null;
  nextHref: string | null;
  /** "2 of 6" */
  position: string;
}

const SWIPE_MIN_PX = 70;

export function SongScreen({ id, context }: { id: string; context?: SetlistContext }) {
  const { songs, settings, t } = useApp();
  const stored = songs.find((song) => song.id === id);
  const [instrument, setInstrument] = useState<InstrumentChoice>(settings.instrument);
  const [ownTranspose, setOwnTranspose] = useState(0);
  const transpose = context ? context.transpose : ownTranspose;
  const setTranspose = context ? context.onTranspose : setOwnTranspose;
  const [capoChoice, setCapoChoice] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const scroller = useRef<HTMLElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useWakeLock();
  const backHref = context?.backHref ?? "/library";
  const previousHref = context?.previousHref ?? null;
  const nextHref = context?.nextHref ?? null;

  // Keys and page-turner pedals: ← → and PageUp / PageDown change the song, ↑ ↓ the section.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (
        event.target instanceof HTMLElement &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)
      )
        return;
      const song = {
        ArrowLeft: previousHref,
        PageUp: previousHref,
        ArrowRight: nextHref,
        PageDown: nextHref,
      }[event.key];
      if (song !== undefined) {
        event.preventDefault();
        if (song) navigate(song);
        return;
      }
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      const main = scroller.current;
      if (!main) return;
      event.preventDefault();
      const sections = [...main.querySelectorAll<HTMLElement>("section[id]")];
      const top = main.getBoundingClientRect().top;
      const current = sections.findLastIndex(
        (section) => section.getBoundingClientRect().top <= top + 12,
      );
      const target = sections[event.key === "ArrowDown" ? current + 1 : Math.max(0, current - 1)];
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previousHref, nextHref, navigate]);

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
            href={backHref}
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
            href={backHref}
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
          <Link
            href={`/songs/${encodeURIComponent(id)}/edit`}
            aria-label={t("song.edit")}
            title={t("song.edit")}
            className="ml-auto grid size-11 shrink-0 place-items-center"
          >
            <EditIcon />
          </Link>
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

      <main
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 pt-2"
        onTouchStart={(event) => {
          const point = event.touches[0];
          touch.current = point ? { x: point.clientX, y: point.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = touch.current;
          const point = event.changedTouches[0];
          touch.current = null;
          if (!start || !point) return;
          const dx = point.clientX - start.x;
          const dy = point.clientY - start.y;
          // A clearly horizontal swipe changes the song; anything else is scrolling.
          if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 2) return;
          const target = dx < 0 ? nextHref : previousHref;
          if (target) navigate(target);
        }}
      >
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

      <footer className="flex h-14 shrink-0 items-center gap-2 border-t border-line px-3 pb-[env(safe-area-inset-bottom)]">
        {context && (
          <>
            <NavButton href={previousHref} label={t("setlist.previous")}>
              <PreviousIcon />
            </NavButton>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-muted">
              {context.position}
            </span>
          </>
        )}
        <span className="ml-auto" />
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
        {context && (
          <NavButton href={nextHref} label={t("setlist.next")}>
            <NextIcon />
          </NavButton>
        )}
      </footer>
    </div>
  );
}

/** Previous / next song: a link when there is one, a dimmed placeholder at the ends of the setlist. */
function NavButton({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: ReactNode;
}) {
  const className = "grid size-11 shrink-0 place-items-center rounded-control";
  if (!href) {
    return (
      <span aria-hidden="true" className={`${className} opacity-30`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} title={label} className={className}>
      {children}
    </Link>
  );
}

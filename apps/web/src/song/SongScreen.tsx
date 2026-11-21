import { parse, resolveSong } from "@takt/format";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "../app-context.tsx";
import type { MessageKey } from "../i18n/en.ts";
import { anchorKey, sectionOccurrences } from "../notes/anchors.ts";
import { NoteDialog } from "../notes/NoteDialog.tsx";
import type { InstrumentChoice } from "../storage/app-state.ts";
import { resolveViewOptions } from "../storage/view-options.ts";
import {
  BackIcon,
  CompactIcon,
  MinusIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  PreviousIcon,
  SlidersIcon,
} from "../ui/icons.tsx";
import { IconButton } from "../ui/TopBar.tsx";
import { FormTimeline } from "./FormTimeline.tsx";
import { type SectionNotes, SectionTile, sectionAnchor } from "./SectionTile.tsx";
import { usePlayback } from "./usePlayback.ts";
import { useWakeLock } from "./useWakeLock.ts";
import { everywhereOptions, ViewOptionsSheet } from "./ViewOptionsSheet.tsx";
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
  setlistId: string;
}

const SWIPE_MIN_PX = 70;

export function SongScreen({ id, context }: { id: string; context?: SetlistContext }) {
  const { songs, settings, viewOverrides, personalNotes, data, t } = useApp();
  const stored = songs.find((song) => song.id === id);
  const [instrument, setInstrument] = useState<InstrumentChoice>(settings.instrument);
  const [ownTranspose, setOwnTranspose] = useState(0);
  const transpose = context ? context.transpose : ownTranspose;
  const setTranspose = context ? context.onTranspose : setOwnTranspose;
  const [capoChoice, setCapoChoice] = useState<number | null>(null);
  const view = resolveViewOptions(
    everywhereOptions(settings),
    context ? viewOverrides.setlist[context.setlistId] : undefined,
    viewOverrides.song[id],
  ).value;
  const [compact, setCompact] = useState(view.compact);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<{ key: string; title: string } | null>(null);
  const [, navigate] = useLocation();
  const scroller = useRef<HTMLElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const wakeLock = useWakeLock();
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

  const playback = usePlayback(song);
  const nowSection = playback.step?.section ?? null;
  // Auto-scroll follows sections only: when the section changes, it is brought to the top.
  useEffect(() => {
    if (nowSection !== null) {
      document
        .getElementById(sectionAnchor(nowSection))
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [nowSection]);

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

  const songNotes = personalNotes[id] ?? {};
  const occurrences = sectionOccurrences(song.sections);
  /** Personal notes of one section: what is on each bar, and what a tap opens. */
  const personalFor = (index: number): SectionNotes => {
    const place = occurrences[index] ?? { section: "", occurrence: 1 };
    const section = song.sections[index];
    const barNumber = (line: number, bar: number) =>
      (section?.lines.slice(0, line).reduce((sum, item) => sum + item.bars.length, 0) ?? 0) +
      bar +
      1;
    return {
      barNote: (line, bar) => songNotes[anchorKey({ ...place, line, bar })],
      barLabel: (line, bar) => t("notes.barLabel", { bar: barNumber(line, bar) }),
      sectionNote: songNotes[anchorKey({ ...place, line: null, bar: null })],
      onTap: (line, bar) =>
        setNoteTarget({
          key: anchorKey({ ...place, line, bar }),
          title:
            line === null || bar === null
              ? t("notes.section", { section: place.section })
              : t("notes.bar", { bar: barNumber(line, bar), section: place.section }),
        }),
      visible: view.personalNotes,
    };
  };

  const guitar = instrument === "guitar";
  const capo = guitar ? (capoChoice ?? song.capo ?? 0) : 0;
  const display = songDisplay(song, { notation: settings.notation, transpose, capo });
  const options = {
    display,
    time: song.time,
    beatDots: view.beatDots,
    soundingChords: view.soundingChords,
    compact,
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
          <button
            type="button"
            aria-label={t("song.compact")}
            title={t("song.compact")}
            aria-pressed={compact}
            onClick={() => setCompact(!compact)}
            className={`ml-auto grid size-11 shrink-0 place-items-center rounded-control ${compact ? "bg-accent text-accent-fg" : ""}`}
          >
            <CompactIcon />
          </button>
          <button
            type="button"
            aria-label={t("view.title")}
            title={t("view.title")}
            onClick={() => setOptionsOpen(true)}
            className="relative grid size-11 shrink-0 place-items-center rounded-control"
          >
            <SlidersIcon />
            {/* A quiet marker: the sheet explains that the screen may turn off. */}
            {wakeLock === "refused" && (
              <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2 bg-signal" />
            )}
          </button>
        </div>
        <FormTimeline
          form={song.form}
          sections={song.sections}
          current={nowSection}
          onJump={playback.jumpTo}
        />
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
        <div
          // Compact: one column on a phone, two or three on wider screens; a section never splits.
          className={compact ? "gap-1.5 md:columns-2 xl:columns-3" : "flex flex-col gap-1.5"}
          style={compact ? ({ "--chord-size": "17px" } as CSSProperties) : undefined}
        >
          {song.sections.map((section) => (
            <SectionTile
              key={section.index}
              section={{
                ...section,
                notes: section.notes.filter((note) =>
                  note.instrument === null ? view.bandNotes : view.instrumentNotes,
                ),
              }}
              options={options}
              now={section.index === nowSection}
              personal={personalFor(section.index)}
            />
          ))}
        </div>
      </main>

      {/* box-content: the 56 px are for the controls; the home-indicator inset is added below them. */}
      <footer className="box-content flex h-14 shrink-0 items-center gap-2 border-t border-line px-3 pb-[var(--safe-bottom)]">
        {context && (
          <NavButton href={previousHref} label={t("setlist.previous")}>
            <PreviousIcon />
          </NavButton>
        )}
        <button
          type="button"
          aria-label={playback.playing ? t("song.pause") : t("song.play")}
          title={
            playback.available
              ? playback.playing
                ? t("song.pause")
                : t("song.play")
              : t("song.noTempo")
          }
          aria-pressed={playback.playing}
          disabled={!playback.available}
          onClick={playback.toggle}
          className={`grid size-11 shrink-0 place-items-center rounded-control disabled:opacity-40 ${
            playback.playing ? "bg-accent text-accent-fg" : "bg-surface"
          }`}
        >
          {playback.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <p role="status" className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[14px] font-extrabold">
            {playback.step
              ? (song.sections[playback.step.section]?.name ?? "")
              : playback.countIn
                ? t("song.countIn")
                : t("song.autoScroll")}
          </span>
          <span className="block truncate text-[11px] font-semibold text-muted">
            {playback.step
              ? [
                  t("song.barOf", { bar: playback.step.bar, bars: playback.step.bars }),
                  playback.step.passes > 1
                    ? t("song.passOf", { pass: playback.step.pass, passes: playback.step.passes })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : (context?.position ??
                (song.tempo !== null ? `${song.tempo} ${t("song.bpm")}` : t("song.noTempo")))}
          </span>
        </p>
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
      <NoteDialog
        target={noteTarget && { title: noteTarget.title, text: songNotes[noteTarget.key] ?? "" }}
        onClose={() => setNoteTarget(null)}
        onSave={(text) => {
          if (noteTarget) void data.setPersonalNote(id, noteTarget.key, text);
          setNoteTarget(null);
        }}
      />
      <ViewOptionsSheet
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        songId={id}
        songTitle={song.title ?? id}
        setlistId={context?.setlistId ?? null}
        screenMayTurnOff={wakeLock === "refused"}
      />
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

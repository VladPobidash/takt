import { type Diagnostic, parse, resolveSong } from "@takt/format";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation } from "wouter";
import { useApp } from "../app-context.tsx";
import type { MessageKey } from "../i18n/en.ts";
import { SectionTile } from "../song/SectionTile.tsx";
import { songDisplay } from "../song/view.ts";
import { ConfirmDialog } from "../ui/ConfirmDialog.tsx";
import { BackIcon, WarningIcon } from "../ui/icons.tsx";
import { saveFile } from "../ui/save-file.ts";
import { insertAt } from "./template.ts";

const SYMBOLS = ["|", "*", "#", "b", "/", "##", "@", ">"];
const SAVE_DELAY_MS = 400;

/** The `.takt` text of one song with a live preview, parser warnings and a quick-symbol bar. */
export function EditorScreen({ id }: { id: string }) {
  const { songs, settings, data, t } = useApp();
  const stored = songs.find((song) => song.id === id);
  const [, navigate] = useLocation();
  const [text, setText] = useState(stored?.text ?? "");
  const [tab, setTab] = useState<"text" | "preview">("text");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const saved = useRef(stored?.text ?? "");
  const latest = useRef(text);
  latest.current = text;

  const save = useMemo(
    () => () => {
      if (latest.current === saved.current) return;
      saved.current = latest.current;
      void data.saveSong({ id, text: latest.current, updatedAt: Date.now() });
    },
    [data, id],
  );
  // Every change is saved shortly after typing stops, and when the screen is left.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `text` is the trigger; `save` reads the latest text itself
  useEffect(() => {
    const timer = setTimeout(save, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, save]);
  useEffect(() => save, [save]);

  const { doc, diagnostics } = useMemo(
    () => parse(text, { defaultNotation: settings.notation }),
    [text, settings.notation],
  );
  const song = useMemo(() => resolveSong(doc), [doc]);
  const problems = diagnostics.filter((d) => d.severity !== "info");
  const shown = problems[0] ?? diagnostics[0];

  if (!stored) {
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

  const display = songDisplay(song, { notation: settings.notation, transpose: 0, capo: 0 });
  const options = {
    display,
    time: song.time,
    beatDots: settings.beatDots,
    soundingChords: settings.soundingChords,
  };
  const songPath = `/songs/${encodeURIComponent(id)}`;

  function insert(symbol: string) {
    const element = area.current;
    if (!element) return;
    const next = insertAt(text, element.selectionStart, element.selectionEnd, symbol);
    // Render first, then place the caret in the same tick: typing may continue at once.
    flushSync(() => setText(next.text));
    element.focus();
    element.setSelectionRange(next.caret, next.caret);
  }

  function show(diagnostic: Diagnostic) {
    flushSync(() => setTab("text"));
    const element = area.current;
    if (!element) return;
    element.focus();
    const end = Math.max(diagnostic.span.end.offset, diagnostic.span.start.offset + 1);
    element.setSelectionRange(diagnostic.span.start.offset, end);
  }

  const tabButton = (value: "text" | "preview", label: MessageKey) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === value}
      onClick={() => setTab(value)}
      className={`h-10 border-b-[3px] text-[15px] ${
        tab === value
          ? "border-signal font-extrabold"
          : "border-transparent font-semibold text-muted"
      }`}
    >
      {t(label)}
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-[52px] shrink-0 items-center gap-1 px-1">
        <Link
          href={songPath}
          aria-label={t("common.back")}
          className="grid size-11 shrink-0 place-items-center"
        >
          <BackIcon />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] text-muted">
            {t("editor.editing")}
          </p>
          <h1 className="truncate text-[17px] font-extrabold leading-tight">{song.title ?? id}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            save();
            navigate(songPath);
          }}
          className="mr-2 h-11 shrink-0 rounded-control bg-accent px-4 text-[15px] font-bold text-accent-fg"
        >
          {t("editor.done")}
        </button>
      </header>
      <div role="tablist" className="flex shrink-0 gap-4 border-b border-line px-3 wide:hidden">
        {tabButton("text", "editor.text")}
        {tabButton("preview", "editor.preview")}
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className={`min-w-0 flex-1 flex-col wide:flex wide:border-r wide:border-line ${tab === "text" ? "flex" : "hidden"}`}
        >
          <textarea
            ref={area}
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label={t("editor.textLabel")}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            className="min-h-0 w-full flex-1 resize-none bg-bg px-3 py-2 text-[16px] font-semibold leading-[1.7] outline-none"
          />
          <div className="shrink-0 px-3 pb-2">
            {shown ? (
              <div
                role="status"
                className={`flex items-center gap-2 rounded-control px-3 py-2 ${
                  shown.severity === "info" ? "bg-surface" : "bg-mine-bg text-mine-fg"
                }`}
              >
                <WarningIcon />
                <p className="min-w-0 flex-1 text-[13px] font-semibold">
                  <b className="font-extrabold">
                    {t("editor.line", { line: shown.span.start.line })}:
                  </b>{" "}
                  {t(`diagnostic.${shown.code}`, shown.data)}
                  {problems.length > 1 && (
                    <span className="opacity-75">
                      {" "}
                      · {t("editor.problems", { count: problems.length })}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => show(shown)}
                  className="h-9 shrink-0 rounded-control bg-bg px-3 text-[13px] font-bold text-text"
                >
                  {t("editor.show")}
                </button>
              </div>
            ) : (
              <p className="px-1 text-[13px] font-semibold text-muted">{t("editor.noProblems")}</p>
            )}
          </div>
          <div
            role="toolbar"
            aria-label={t("editor.symbols")}
            className="flex shrink-0 gap-1.5 border-t border-line px-2 py-2 pb-[max(0.5rem,var(--safe-bottom))]"
          >
            {SYMBOLS.map((symbol) => (
              <button
                type="button"
                key={symbol}
                aria-label={t("editor.insert", { symbol })}
                // Keep the caret in the text while a symbol is tapped.
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => insert(symbol)}
                className="h-11 min-w-0 flex-1 rounded-control bg-surface text-[17px] font-extrabold"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`min-w-0 flex-1 overflow-y-auto px-2.5 py-2 wide:block ${tab === "preview" ? "block" : "hidden"}`}
        >
          <div className="flex flex-col gap-1.5">
            {song.sections.map((section) => (
              <SectionTile key={section.index} section={section} options={options} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => void saveFile(`${id}.takt`, text, "text/plain")}
            className="mt-6 h-11 w-full rounded-control bg-surface text-[15px] font-bold"
          >
            {t("editor.export")}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-2 h-11 w-full rounded-control border border-line text-[15px] font-bold text-muted"
          >
            {t("editor.delete")}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t("editor.deleteTitle", { title: song.title ?? id })}
        text={t("editor.deleteText")}
        confirmLabel={t("editor.deleteConfirm")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          saved.current = latest.current;
          void data.deleteSong(id).then(() => navigate("/library"));
        }}
      />
    </div>
  );
}

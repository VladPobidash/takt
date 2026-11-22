import { cleanFormName, parse, type ResolvedSection, resolveSong, setForm } from "@takt/format";
import { type ReactNode, useState } from "react";
import { Link } from "wouter";
import { useApp } from "../app-context.tsx";
import { MiniFormStrip } from "../song/FormTimeline.tsx";
import { ConfirmDialog } from "../ui/ConfirmDialog.tsx";
import { BackIcon, ChevronDownIcon, MinusIcon, PlusIcon, UpIcon } from "../ui/icons.tsx";
import {
  type DraftRow,
  draftSteps,
  formDraft,
  MAX_REPEAT,
  MIN_REPEAT,
  mainDraft,
  moveRow,
  newFormName,
  repeatFor,
} from "./form-draft.ts";

/**
 * The versions of one song (ADR 0013), edited without typing: a list of versions, and for one
 * version its sections — on or off, repeats, order — and its name. Every change is written into
 * the song's `form` line at once; the rest of the file is never touched.
 */
export function VersionsScreen({ id }: { id: string }) {
  const { songs, settings, data, t } = useApp();
  const stored = songs.find((song) => song.id === id);
  const [open, setOpen] = useState<string | null>(null);
  const songPath = `/songs/${encodeURIComponent(id)}`;

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

  const doc = parse(stored.text, { defaultNotation: settings.notation }).doc;
  const main = resolveSong(doc);
  const editing = open !== null && main.forms.some((name) => same(name, open)) ? open : null;

  function create() {
    const name = newFormName(main.forms, (count) => t("versions.newName", { count }));
    const text = setForm(stored?.text ?? "", name, draftSteps(mainDraft(doc)));
    void data.saveSong({ id, text, updatedAt: Date.now() });
    setOpen(name);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-[52px] shrink-0 items-center gap-1 px-1">
        {editing === null ? (
          <Link
            href={songPath}
            aria-label={t("common.back")}
            className="grid size-11 shrink-0 place-items-center"
          >
            <BackIcon />
          </Link>
        ) : (
          <button
            type="button"
            aria-label={t("common.back")}
            onClick={() => setOpen(null)}
            className="grid size-11 shrink-0 place-items-center"
          >
            <BackIcon />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] text-muted">
            {t("versions.of")}
          </p>
          <h1 className="truncate text-[17px] font-extrabold leading-tight">{main.title ?? id}</h1>
        </div>
        <Link
          href={songPath}
          className="mr-2 grid h-11 shrink-0 place-items-center rounded-control bg-accent px-4 text-[15px] font-bold text-accent-fg"
        >
          {t("editor.done")}
        </Link>
      </header>

      <main className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto border-t border-line px-3 pb-6">
        {editing === null ? (
          <>
            <div className="border-b border-line py-2.5">
              <p className="mb-1.5 truncate text-[15px] font-semibold text-muted">
                {t("versions.main")}
              </p>
              <MiniFormStrip form={main.form} />
            </div>
            {main.forms.length === 0 && (
              <p className="py-4 text-[15px] text-muted">{t("versions.none")}</p>
            )}
            <ul>
              {main.forms.map((name) => {
                const version = resolveSong(doc, { form: name });
                return (
                  <li key={name} className="border-b border-line">
                    <button
                      type="button"
                      onClick={() => setOpen(name)}
                      className="block w-full py-2.5 text-left"
                    >
                      <span className="mb-1.5 flex items-baseline gap-3">
                        <span className="min-w-0 flex-1 truncate text-[17px] font-extrabold">
                          {name}
                        </span>
                        <span className="shrink-0 text-[13px] font-semibold text-muted">
                          {t("library.sections", { count: version.sections.length })}
                        </span>
                      </span>
                      <MiniFormStrip form={version.form} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={create}
              className="flex h-12 items-center gap-2 text-[15px] font-bold"
            >
              <PlusIcon />
              {t("versions.new")}
            </button>
          </>
        ) : (
          <VersionEditor
            key={editing}
            songId={id}
            text={stored.text}
            name={editing}
            others={main.forms.filter((name) => !same(name, editing))}
            sections={main.sections}
            onRenamed={setOpen}
            onDeleted={() => setOpen(null)}
          />
        )}
      </main>
    </div>
  );
}

const same = (a: string, b: string) =>
  a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

function VersionEditor(props: {
  songId: string;
  text: string;
  name: string;
  others: string[];
  /** The song's sections in file order (the main version), by `docIndex`. */
  sections: ResolvedSection[];
  onRenamed: (name: string) => void;
  onDeleted: () => void;
}) {
  const { data, t } = useApp();
  const doc = parse(props.text).doc;
  // Rows that are switched off are not in the file; they live here while the editor is open.
  const [rows, setRows] = useState<DraftRow[]>(() => formDraft(doc, props.name));
  const [name, setName] = useState(props.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const clean = cleanFormName(name);
  const nameError =
    clean === ""
      ? t("versions.nameEmpty")
      : props.others.some((other) => same(other, clean))
        ? t("versions.nameTaken", { name: clean })
        : null;
  const playing = rows.filter((row) => row.on).length;

  function write(next: DraftRow[]) {
    setRows(next);
    const text = setForm(props.text, props.name, draftSteps(next));
    void data.saveSong({ id: props.songId, text, updatedAt: Date.now() });
  }

  function rename() {
    if (nameError !== null) {
      setName(props.name);
      return;
    }
    if (clean === props.name) return;
    // The screen moves on once the song and its setlists are stored.
    void data.renameSongForm(props.songId, props.name, clean).then(() => props.onRenamed(clean));
  }

  return (
    <>
      <label className="block border-b border-line py-3">
        <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
          {t("versions.name")}
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={rename}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          aria-invalid={nameError !== null}
          enterKeyHint="done"
          className="h-11 w-full rounded-control bg-surface px-3 text-[16px] font-bold outline-none aria-invalid:outline-2 aria-invalid:outline-signal"
        />
        {nameError !== null && (
          <span role="alert" className="mt-1 block text-[13px] font-semibold text-signal">
            {nameError}
          </span>
        )}
      </label>

      <h2 className="pt-3 pb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
        {t("versions.sections")}
      </h2>
      <ol>
        {rows.map((row, index) => {
          const section = props.sections[row.section];
          if (!section) return null;
          const label = section.abbr ? `${section.abbr} ${section.name}` : section.name;
          const repeat = row.repeat ?? section.repeat;
          const setRepeat = (value: number) =>
            write(
              rows.map((item, i) =>
                i === index ? { ...item, repeat: repeatFor(value, section.repeat) } : item,
              ),
            );
          return (
            <li
              key={row.section}
              data-section={section.type}
              className="flex min-h-12 items-center gap-1.5 border-b border-line"
            >
              <input
                type="checkbox"
                checked={row.on}
                // The last section that is played cannot be switched off: a version plays something.
                disabled={row.on && playing === 1}
                aria-label={t("versions.play", { section: label })}
                onChange={(event) =>
                  write(
                    rows.map((item, i) =>
                      i === index ? { ...item, on: event.target.checked } : item,
                    ),
                  )
                }
                className="size-5 shrink-0 accent-[var(--accent)]"
              />
              <span
                className={`flex min-w-0 flex-1 items-center gap-1.5 ${row.on ? "" : "opacity-45"}`}
              >
                {section.abbr && (
                  <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-badge bg-ink px-1 text-[12px] font-extrabold text-tile">
                    {section.abbr}
                  </span>
                )}
                <span className="min-w-0 truncate text-[15px] font-bold">{section.name}</span>
              </span>
              {row.on && (
                <span className="flex shrink-0 items-center">
                  <StepButton
                    label={t("versions.fewer", { section: label })}
                    disabled={repeat <= MIN_REPEAT}
                    onClick={() => setRepeat(repeat - 1)}
                  >
                    <MinusIcon />
                  </StepButton>
                  <span
                    className={`w-8 text-center text-[15px] ${row.repeat === null ? "font-semibold text-muted" : "font-extrabold"}`}
                  >
                    ×{repeat}
                  </span>
                  <StepButton
                    label={t("versions.more", { section: label })}
                    disabled={repeat >= MAX_REPEAT}
                    onClick={() => setRepeat(repeat + 1)}
                  >
                    <PlusIcon />
                  </StepButton>
                </span>
              )}
              <StepButton
                label={t("versions.moveUp", { section: label })}
                disabled={index === 0}
                onClick={() => write(moveRow(rows, index, index - 1))}
              >
                <UpIcon />
              </StepButton>
              <StepButton
                label={t("versions.moveDown", { section: label })}
                disabled={index === rows.length - 1}
                onClick={() => write(moveRow(rows, index, index + 1))}
              >
                <ChevronDownIcon />
              </StepButton>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        className="mt-6 h-11 w-full rounded-control border border-line text-[15px] font-bold text-muted"
      >
        {t("versions.delete")}
      </button>
      <ConfirmDialog
        open={confirmDelete}
        title={t("versions.deleteTitle", { name: props.name })}
        text={t("versions.deleteText")}
        confirmLabel={t("editor.deleteConfirm")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void data.removeSongForm(props.songId, props.name).then(props.onDeleted);
        }}
      />
    </>
  );
}

function StepButton(props: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      className="grid size-9 shrink-0 place-items-center rounded-control disabled:opacity-30"
    >
      {props.children}
    </button>
  );
}

import { formatKey, parse, type ResolvedSong, resolveSong, transposeKey } from "@takt/format";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "../app-context.tsx";
import { MiniFormStrip } from "../song/FormTimeline.tsx";
import { BUNDLE_EXTENSION, formatBundle } from "../storage/bundle.ts";
import { ConfirmDialog } from "../ui/ConfirmDialog.tsx";
import {
  ChevronDownIcon,
  CloseIcon,
  PlayIcon,
  PlusIcon,
  ShareIcon,
  SlidersIcon,
  UpIcon,
} from "../ui/icons.tsx";
import { saveFile } from "../ui/save-file.ts";
import { IconButton, MainTopBar } from "../ui/TopBar.tsx";
import {
  addSong,
  formatSetlist,
  move,
  readEntryKey,
  readSetlist,
  removeAt,
  setMeta,
  transposeFor,
  updateEntry,
} from "./model.ts";

/** The map of one service: songs in order with key, tempo, note for the night and form strip. */
export function ServiceMapScreen({ id }: { id: string }) {
  const { setlists, songs, settings, data, t } = useApp();
  const stored = setlists.find((setlist) => setlist.id === id);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (stored && settings.lastSetlistId !== id) void data.setSetting("lastSetlistId", id);
  }, [stored, settings.lastSetlistId, id, data]);

  const resolved = useMemo(() => {
    const map = new Map<string, ResolvedSong>();
    for (const song of songs)
      map.set(song.id, resolveSong(parse(song.text, { defaultNotation: settings.notation }).doc));
    return map;
  }, [songs, settings.notation]);

  if (!stored) {
    return (
      <div className="flex h-full flex-col">
        <MainTopBar current="nav.service" />
        <p className="px-4 text-muted">{t("setlist.notFound")}</p>
      </div>
    );
  }

  const { setlist, notation, date } = readSetlist(stored.text, settings.notation);
  const title = setlist.title ?? id;
  const save = (next: typeof setlist) =>
    void data.saveSetlist({ id, text: formatSetlist(next), updatedAt: Date.now() });
  const dateLabel = date
    ? new Intl.DateTimeFormat(settings.language, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(`${date}T12:00:00`))
    : null;
  const base = `/setlists/${encodeURIComponent(id)}`;

  async function share() {
    const now = new Date();
    const bundle = data.exportSetlistBundle(
      id,
      setlist.entries.map((entry) => entry.song),
      now,
    );
    await saveFile(`${id}${BUNDLE_EXTENSION}`, formatBundle(bundle), "application/json");
  }

  return (
    <div className="flex h-full flex-col">
      <MainTopBar
        current="nav.service"
        actions={
          <>
            <IconButton
              label={editing ? t("setlist.doneEditing") : t("setlist.edit")}
              variant={editing ? "surface" : "plain"}
              onClick={() => setEditing(!editing)}
            >
              <SlidersIcon />
            </IconButton>
            <IconButton label={t("setlist.share")} onClick={() => void share()}>
              <ShareIcon />
            </IconButton>
          </>
        }
      />
      <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center gap-3 border-b border-line px-3 pb-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-extrabold">{title}</h1>
          <p className="truncate text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
            {[dateLabel, t("library.songCount", { count: setlist.entries.length })]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {setlist.entries.length > 0 && (
          <Link
            href={`${base}/1`}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-control bg-accent pl-3 pr-4 text-[15px] font-bold text-accent-fg"
          >
            <PlayIcon />
            {t("setlist.start")}
          </Link>
        )}
      </div>

      <main className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto px-3 pb-6">
        {editing && (
          <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-line py-3">
            <label className="min-w-0">
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
                {t("setlist.title")}
              </span>
              <input
                value={setlist.title ?? ""}
                onChange={(event) => save({ ...setlist, title: event.target.value })}
                className="h-11 w-full rounded-control bg-surface px-3 text-[16px] font-bold outline-none"
              />
            </label>
            <label>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
                {t("setlist.date")}
              </span>
              <input
                type="date"
                value={date ?? ""}
                onChange={(event) => save(setMeta(setlist, "date", event.target.value))}
                className="h-11 rounded-control bg-surface px-2 text-[16px] font-bold outline-none"
              />
            </label>
          </div>
        )}
        {setlist.entries.length === 0 && <p className="py-4 text-muted">{t("setlist.empty")}</p>}
        <ol>
          {setlist.entries.map((entry, index) => {
            const song = resolved.get(entry.song);
            const name = song?.title ?? entry.song;
            const entryKey = readEntryKey(entry, notation);
            const key = song?.key
              ? transposeKey(song.key, transposeFor(song.key, entryKey))
              : entryKey;
            const meta = song
              ? [
                  song.tempo !== null ? `${song.tempo} ${t("song.bpm")}` : null,
                  `${song.time.beats}/${song.time.unit}`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : t("setlist.missing");
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: a song may appear twice; the position is its identity
              <li key={index} className="border-b border-line py-2.5">
                <Link href={`${base}/${index + 1}`} className="flex gap-3">
                  <span className="w-5 shrink-0 text-[17px] font-extrabold text-muted">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-3">
                      <span className="min-w-0 flex-1 truncate text-[17px] font-extrabold">
                        {name}
                      </span>
                      {key && (
                        <span className="text-[17px] font-extrabold">
                          {formatKey(key, settings.notation)}
                        </span>
                      )}
                    </span>
                    <span className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-muted">
                      <span className="shrink-0">{meta}</span>
                      {entry.note && !editing && (
                        <span className="truncate rounded-badge bg-surface2 px-1.5 py-0.5 text-[12px] font-bold text-text">
                          {entry.note}
                        </span>
                      )}
                    </span>
                    {song && <MiniFormStrip form={song.form} />}
                  </span>
                </Link>
                {editing && (
                  <div className="mt-2 flex items-center gap-1 pl-8">
                    <input
                      value={entry.note ?? ""}
                      onChange={(event) =>
                        save(updateEntry(setlist, index, { note: event.target.value || null }))
                      }
                      placeholder={t("setlist.note")}
                      aria-label={`${t("setlist.note")}: ${name}`}
                      className="h-11 min-w-0 flex-1 rounded-control bg-surface px-3 text-[16px] font-semibold outline-none placeholder:text-muted"
                    />
                    <IconButton
                      label={t("setlist.moveUp", { title: name })}
                      disabled={index === 0}
                      onClick={() => save(move(setlist, index, index - 1))}
                    >
                      <UpIcon />
                    </IconButton>
                    <IconButton
                      label={t("setlist.moveDown", { title: name })}
                      disabled={index === setlist.entries.length - 1}
                      onClick={() => save(move(setlist, index, index + 1))}
                    >
                      <ChevronDownIcon />
                    </IconButton>
                    <IconButton
                      label={t("setlist.remove", { title: name })}
                      onClick={() => save(removeAt(setlist, index))}
                    >
                      <CloseIcon />
                    </IconButton>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex h-12 items-center gap-2 text-[15px] font-bold"
        >
          <PlusIcon />
          {t("setlist.add")}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-6 h-11 w-full rounded-control border border-line text-[15px] font-bold text-muted"
          >
            {t("setlist.delete")}
          </button>
        )}
      </main>

      <SongPicker
        open={picking}
        songs={[...resolved].map(([songId, song]) => ({ id: songId, title: song.title ?? songId }))}
        onClose={() => setPicking(false)}
        onPick={(songId) => {
          save(addSong(setlist, songId));
          setPicking(false);
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t("setlist.deleteTitle", { title })}
        text={t("setlist.deleteText")}
        confirmLabel={t("editor.deleteConfirm")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void data.deleteSetlist(id).then(() => navigate("/library?tab=setlists"))}
      />
    </div>
  );
}

/** A searchable list of the library's songs in a modal dialog. */
function SongPicker(props: {
  open: boolean;
  songs: { id: string; title: string }[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { settings, t } = useApp();
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (props.open && !element.open) {
      setQuery("");
      element.showModal();
    }
    if (!props.open && element.open) element.close();
  }, [props.open]);

  const needle = query.trim().toLocaleLowerCase();
  const collator = new Intl.Collator(settings.language);
  const visible = props.songs
    .filter((song) => song.title.toLocaleLowerCase().includes(needle))
    .sort((a, b) => collator.compare(a.title, b.title));

  return (
    <dialog
      ref={dialog}
      aria-label={t("setlist.pick")}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
      className="m-auto h-[min(32rem,calc(100dvh-2rem))] w-[min(26rem,calc(100vw-1.5rem))] rounded-control bg-bg p-0 text-text shadow-xl backdrop:bg-black/50"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-1 border-b border-line p-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("library.search")}
            aria-label={t("library.search")}
            className="h-11 min-w-0 flex-1 rounded-control bg-surface px-3 text-[16px] font-semibold outline-none placeholder:text-muted"
          />
          <IconButton label={t("common.close")} onClick={props.onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-1">
          {visible.map((song) => (
            <li key={song.id}>
              <button
                type="button"
                onClick={() => props.onPick(song.id)}
                className="flex min-h-11 w-full items-center rounded-badge px-3 text-left text-[15px] font-bold hover:bg-surface"
              >
                {song.title}
              </button>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-3 py-3 text-muted">{t("library.nothingFound")}</li>
          )}
        </ul>
      </div>
    </dialog>
  );
}

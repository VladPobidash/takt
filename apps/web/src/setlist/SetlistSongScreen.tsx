import { formatKey, parse, type ResolvedSong, resolveSong, transposeKey } from "@takt/format";
import { useMemo } from "react";
import { Link, Redirect } from "wouter";
import { useApp } from "../app-context.tsx";
import { MiniFormStrip } from "../song/FormTimeline.tsx";
import { type SetlistContext, SongScreen } from "../song/SongScreen.tsx";
import {
  entryKeyFor,
  formatSetlist,
  readEntryKey,
  readSetlist,
  transposeFor,
  updateEntry,
} from "./model.ts";

/** A song opened from a setlist: it knows its neighbours and the key chosen for that night. */
export function SetlistSongScreen({
  setlistId,
  position,
}: {
  setlistId: string;
  position: number;
}) {
  const { setlists, songs, settings, data, t } = useApp();
  const stored = setlists.find((setlist) => setlist.id === setlistId);
  const read = useMemo(
    () => (stored ? readSetlist(stored.text, settings.notation) : null),
    [stored, settings.notation],
  );
  const entry = read?.setlist.entries[position - 1];

  // Every song of the setlist, resolved once: the sidebar needs titles, keys and forms.
  const resolved = useMemo(() => {
    const wanted = new Set(read?.setlist.entries.map((item) => item.song));
    const map = new Map<string, ResolvedSong>();
    for (const song of songs) {
      if (wanted.has(song.id))
        map.set(song.id, resolveSong(parse(song.text, { defaultNotation: settings.notation }).doc));
    }
    return map;
  }, [read, songs, settings.notation]);

  const base = `/setlists/${encodeURIComponent(setlistId)}`;
  if (!read || !entry) return <Redirect to={stored ? base : "/library"} replace />;

  const { setlist, notation, date } = read;
  const songKey = resolved.get(entry.song)?.key ?? null;
  const count = setlist.entries.length;
  const context: SetlistContext = {
    backHref: base,
    transpose: transposeFor(songKey, readEntryKey(entry, notation)),
    onTranspose: (semitones) => {
      const next = updateEntry(setlist, position - 1, {
        key: entryKeyFor(songKey, semitones, notation),
      });
      void data.saveSetlist({ id: setlistId, text: formatSetlist(next), updatedAt: Date.now() });
    },
    previousHref: position > 1 ? `${base}/${position - 1}` : null,
    nextHref: position < count ? `${base}/${position + 1}` : null,
    position: t("setlist.position", { position, count }),
  };
  const dateLabel = date
    ? new Intl.DateTimeFormat(settings.language, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(`${date}T12:00:00`))
    : null;

  return (
    <div className="flex h-full">
      {/* Wide screens (from 64rem: laptops, tablets in landscape) keep the setlist next to the song. */}
      <aside className="hidden w-[300px] shrink-0 flex-col border-r border-line wide:flex">
        <Link href={base} className="flex h-[52px] shrink-0 items-center gap-2 px-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-badge bg-accent text-[15px] font-extrabold text-accent-fg">
            T
          </span>
          <span className="min-w-0 flex-1 truncate text-[20px] font-extrabold tracking-[-0.02em]">
            {setlist.title ?? setlistId}
          </span>
          {dateLabel && (
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              {dateLabel}
            </span>
          )}
        </Link>
        <nav aria-label={t("setlist.songs")} className="min-h-0 flex-1 overflow-y-auto px-4">
          <ol>
            {setlist.entries.map((item, index) => {
              const song = resolved.get(item.song);
              const itemKey = readEntryKey(item, notation);
              const key = song?.key
                ? transposeKey(song.key, transposeFor(song.key, itemKey))
                : itemKey;
              const current = index === position - 1;
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: a song may appear twice; the position is its identity
                <li key={index} className="border-b border-line">
                  <Link
                    href={`${base}/${index + 1}`}
                    aria-current={current ? "page" : undefined}
                    className="flex gap-3 py-3"
                  >
                    <span
                      className={`w-5 shrink-0 text-[17px] font-extrabold ${current ? "text-signal" : "text-muted"}`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1.5 flex items-baseline gap-2">
                        <span
                          className={`min-w-0 flex-1 truncate text-[15px] ${current ? "font-extrabold" : "font-semibold"}`}
                        >
                          {song?.title ?? item.song}
                        </span>
                        {key && (
                          <span className="text-[15px] font-extrabold">
                            {formatKey(key, settings.notation)}
                          </span>
                        )}
                      </span>
                      {song && <MiniFormStrip form={song.form} />}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
        <p className="shrink-0 px-4 py-3 text-[12px] font-medium text-muted">
          {t("setlist.keysHint")}
        </p>
      </aside>
      <div className="min-w-0 flex-1">
        <SongScreen key={`${setlistId}/${position}`} id={entry.song} context={context} />
      </div>
    </div>
  );
}

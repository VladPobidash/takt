import { parse, resolveSong } from "@takt/format";
import { useMemo } from "react";
import { Redirect } from "wouter";
import { useApp } from "../app-context.tsx";
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
  const songText = songs.find((song) => song.id === entry?.song)?.text;
  const songKey = useMemo(
    () =>
      songText === undefined
        ? null
        : resolveSong(parse(songText, { defaultNotation: settings.notation }).doc).key,
    [songText, settings.notation],
  );

  const base = `/setlists/${encodeURIComponent(setlistId)}`;
  if (!read || !entry) return <Redirect to={stored ? base : "/library"} replace />;

  const { setlist, notation } = read;
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
  return <SongScreen key={`${setlistId}/${position}`} id={entry.song} context={context} />;
}

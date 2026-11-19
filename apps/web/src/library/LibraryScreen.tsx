import { formatKey, parse, type ResolvedSong, resolveSong } from "@takt/format";
import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useApp } from "../app-context.tsx";
import { MiniFormStrip } from "../song/FormTimeline.tsx";
import { ImportIcon, SearchIcon } from "../ui/icons.tsx";
import { IconButton, MainTopBar } from "../ui/TopBar.tsx";

interface Row {
  id: string;
  song: ResolvedSong;
  warnings: number;
}

export function LibraryScreen() {
  const { songs, settings, data, t } = useApp();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    const collator = new Intl.Collator(settings.language);
    return songs
      .map((stored): Row => {
        const { doc, diagnostics } = parse(stored.text, { defaultNotation: settings.notation });
        return {
          id: stored.id,
          song: resolveSong(doc),
          warnings: diagnostics.filter((d) => d.severity !== "info").length,
        };
      })
      .sort((a, b) => collator.compare(a.song.title ?? a.id, b.song.title ?? b.id));
  }, [songs, settings.language, settings.notation]);

  const needle = query.trim().toLocaleLowerCase();
  const visible = needle
    ? rows.filter((row) =>
        `${row.song.title ?? ""} ${row.id} ${row.song.artist ?? ""}`
          .toLocaleLowerCase()
          .includes(needle),
      )
    : rows;

  async function importFiles(list: FileList | null) {
    const files = [...(list ?? [])].filter((file) => /\.(takt|txt)$/i.test(file.name));
    if (files.length === 0) return;
    const read = await Promise.all(
      files.map(async (file) => ({ name: file.name, text: await file.text() })),
    );
    const added = await data.importSongs(read);
    setMessage(t("library.imported", { count: added.length }));
  }

  return (
    <div className="flex h-full flex-col">
      <MainTopBar
        current="nav.library"
        actions={
          <>
            <IconButton label={t("library.import")} onClick={() => input.current?.click()}>
              <ImportIcon />
            </IconButton>
            <input
              ref={input}
              type="file"
              accept=".takt,.txt,text/plain"
              multiple
              hidden
              onChange={(event) => {
                void importFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </>
        }
      />
      <div className="shrink-0 px-3 pb-2">
        <label className="flex h-11 items-center gap-2 rounded-control bg-surface px-3 text-muted">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("library.search")}
            aria-label={t("library.search")}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-text outline-none placeholder:text-muted"
          />
        </label>
        <p className="mt-2 flex items-baseline gap-1.5 border-b border-line pb-2 text-[15px] font-extrabold">
          {t("library.songs")} <span className="font-semibold text-muted">{rows.length}</span>
        </p>
        {message && (
          <p
            role="status"
            className="mt-2 rounded-badge bg-surface px-3 py-2 text-[13px] font-semibold"
          >
            {message}
          </p>
        )}
      </div>
      <main className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto px-3 pb-4">
        {rows.length === 0 && <p className="py-6 text-muted">{t("library.empty")}</p>}
        {rows.length > 0 && visible.length === 0 && (
          <p className="py-6 text-muted">{t("library.nothingFound")}</p>
        )}
        <ul>
          {visible.map(({ id, song, warnings }) => (
            <li key={id} className="border-b border-line">
              <Link href={`/songs/${encodeURIComponent(id)}`} className="block py-2.5">
                <div className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-[17px] font-extrabold">
                    {song.title ?? id}
                  </span>
                  {song.key && (
                    <span className="text-[17px] font-extrabold">
                      {formatKey(song.key, settings.notation)}
                    </span>
                  )}
                </div>
                <p className="mb-1.5 truncate text-[13px] font-semibold text-muted">
                  {[
                    song.tempo !== null ? `${song.tempo} ${t("song.bpm")}` : null,
                    `${song.time.beats}/${song.time.unit}`,
                    t("library.sections", { count: song.sections.length }),
                    warnings > 0 ? t("library.warnings", { count: warnings }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <MiniFormStrip form={song.form} />
              </Link>
            </li>
          ))}
        </ul>
        <p className="pt-4 text-[13px] font-semibold text-muted">{t("library.onDevice")}</p>
      </main>
    </div>
  );
}

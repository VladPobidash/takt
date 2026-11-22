import { formatKey, parse, type ResolvedSong, resolveSong } from "@takt/format";
import { useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useApp } from "../app-context.tsx";
import { newSongText } from "../editor/template.ts";
import { requestPersistentStorage } from "../pwa.ts";
import { newSetlistText, readSetlist } from "../setlist/model.ts";
import { MiniFormStrip } from "../song/FormTimeline.tsx";
import { parseBundle } from "../storage/bundle.ts";
import { InstallHint } from "../ui/InstallHint.tsx";
import { ImportIcon, PlusIcon, SearchIcon } from "../ui/icons.tsx";
import { IconButton, MainTopBar } from "../ui/TopBar.tsx";
import { UpdateNotice } from "../ui/UpdateNotice.tsx";

interface Row {
  id: string;
  song: ResolvedSong;
  warnings: number;
}

export function LibraryScreen() {
  const { songs, setlists, settings, data, t } = useApp();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const tab = new URLSearchParams(useSearch()).get("tab") === "setlists" ? "setlists" : "songs";

  async function createSetlist() {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const title = t("library.newSetlistTitle");
    const setlist = await data.createSetlist(
      `${title} ${date}`,
      newSetlistText(title, date, settings.notation),
    );
    requestPersistentStorage();
    navigate(`/setlists/${encodeURIComponent(setlist.id)}`);
  }

  async function createSong() {
    const title = t("library.newTitle");
    const song = await data.createSong(title, newSongText(title, settings.notation));
    requestPersistentStorage();
    navigate(`/songs/${encodeURIComponent(song.id)}/edit`);
  }

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
    const files = [...(list ?? [])];
    if (files.length === 0) return;
    let added = 0;
    let unchanged = 0;
    const songFiles: { name: string; text: string }[] = [];
    for (const file of files) {
      const text = await file.text();
      const bundle = parseBundle(text);
      if (bundle) {
        const result = await data.importBundle(bundle);
        added += result.added;
        unchanged += result.unchanged;
      } else if (/\.(takt|txt)$/i.test(file.name)) {
        songFiles.push({ name: file.name, text });
      } else {
        setMessage(t("library.notReadable", { name: file.name }));
        return;
      }
    }
    added += (await data.importSongs(songFiles)).length;
    requestPersistentStorage();
    const parts = [t("library.imported", { count: added })];
    if (unchanged > 0) parts.push(t("library.unchanged", { count: unchanged }));
    setMessage(parts.join(" · "));
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
              // No `accept`: iOS greys out a file whose extension it does not know
              // (`.taktbundle`, `.takt`), so the picker offers every file and
              // `importFiles` decides by the content.
              multiple
              hidden
              onChange={(event) => {
                void importFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              aria-label={tab === "songs" ? t("library.new") : t("library.newSetlist")}
              title={tab === "songs" ? t("library.new") : t("library.newSetlist")}
              onClick={() => void (tab === "songs" ? createSong() : createSetlist())}
              className="grid size-11 shrink-0 place-items-center rounded-control bg-accent text-accent-fg"
            >
              <PlusIcon />
            </button>
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
        <div role="tablist" className="mt-1 flex gap-4 border-b border-line">
          {(["songs", "setlists"] as const).map((value) => (
            <Link
              key={value}
              href={value === "songs" ? "/library" : "/library?tab=setlists"}
              role="tab"
              aria-selected={tab === value}
              replace
              className={`flex h-10 items-center gap-1.5 border-b-[3px] text-[15px] ${
                tab === value
                  ? "border-signal font-extrabold"
                  : "border-transparent font-semibold text-muted"
              }`}
            >
              {t(value === "songs" ? "library.songs" : "library.setlists")}
              <span className="font-semibold text-muted">
                {value === "songs" ? rows.length : setlists.length}
              </span>
            </Link>
          ))}
        </div>
        <UpdateNotice />
        <InstallHint />
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
        {tab === "songs" && (
          <>
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
                        song.forms.length > 0
                          ? t("library.versions", { count: song.forms.length + 1 })
                          : null,
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
          </>
        )}
        {tab === "setlists" && (
          <>
            {setlists.length === 0 && <p className="py-6 text-muted">{t("library.noSetlists")}</p>}
            <ul>
              {[...setlists]
                .map((stored) => ({
                  id: stored.id,
                  ...readSetlist(stored.text, settings.notation),
                }))
                .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
                .map(({ id, setlist, date }) => (
                  <li key={id} className="border-b border-line">
                    <Link href={`/setlists/${encodeURIComponent(id)}`} className="block py-2.5">
                      <span className="block truncate text-[17px] font-extrabold">
                        {setlist.title ?? id}
                      </span>
                      <span className="block truncate text-[13px] font-semibold text-muted">
                        {[
                          date
                            ? new Intl.DateTimeFormat(settings.language, {
                                dateStyle: "medium",
                              }).format(new Date(`${date}T12:00:00`))
                            : null,
                          t("library.songCount", { count: setlist.entries.length }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </>
        )}
        <p className="pt-4 text-[13px] font-semibold text-muted">
          {t("library.onDevice")}{" "}
          {settings.lastBackupAt === null
            ? t("library.noBackup")
            : t("library.lastBackup", {
                date: new Intl.DateTimeFormat(settings.language, { dateStyle: "medium" }).format(
                  settings.lastBackupAt,
                ),
              })}
        </p>
      </main>
    </div>
  );
}

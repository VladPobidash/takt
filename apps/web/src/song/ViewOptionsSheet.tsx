import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useApp } from "../app-context.tsx";
import type { MessageKey } from "../i18n/en.ts";
import {
  resolveViewOptions,
  VIEW_OPTION_KEYS,
  type ViewOptionKey,
  type ViewOptions,
  type ViewScope,
} from "../storage/view-options.ts";
import { CloseIcon } from "../ui/icons.tsx";
import { IconButton } from "../ui/TopBar.tsx";

const LABELS: Record<ViewOptionKey, MessageKey> = {
  beatDots: "settings.beatDots",
  soundingChords: "settings.soundingChords",
  bandNotes: "view.bandNotes",
  instrumentNotes: "view.instrumentNotes",
  personalNotes: "view.personalNotes",
  compact: "settings.compact",
};
const SOURCE: Record<ViewScope, MessageKey> = {
  song: "view.fromSong",
  setlist: "view.fromSetlist",
  everywhere: "view.fromEverywhere",
};

/** The everywhere level of the view options is part of the device settings. */
export function everywhereOptions(settings: ViewOptions): ViewOptions {
  const options = {} as ViewOptions;
  for (const key of VIEW_OPTION_KEYS) options[key] = settings[key];
  return options;
}

/**
 * View options on three levels — this song, this setlist, everywhere. Each row shows where
 * its value comes from; a value set on the level being edited can be reset to the inherited one.
 */
export function ViewOptionsSheet(props: {
  open: boolean;
  onClose: () => void;
  songId: string;
  songTitle: string;
  /** Set when the song was opened from a setlist. */
  setlistId: string | null;
}) {
  const { settings, viewOverrides, data, t } = useApp();
  const dialog = useRef<HTMLDialogElement>(null);
  const [scope, setScope] = useState<ViewScope>("song");
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (props.open && !element.open) element.showModal();
    if (!props.open && element.open) element.close();
  }, [props.open]);

  const everywhere = everywhereOptions(settings);
  const setlistLevel = props.setlistId ? viewOverrides.setlist[props.setlistId] : undefined;
  const songLevel = viewOverrides.song[props.songId];
  // What this level shows: everything above it applied, nothing below it.
  const resolved = resolveViewOptions(
    everywhere,
    scope === "everywhere" ? undefined : setlistLevel,
    scope === "song" ? songLevel : undefined,
  );
  const scopes: ViewScope[] = props.setlistId
    ? ["song", "setlist", "everywhere"]
    : ["song", "everywhere"];
  const intro: Record<ViewScope, string> = {
    song: t("view.introSong", { title: props.songTitle }),
    setlist: t("view.introSetlist"),
    everywhere: t("view.introEverywhere"),
  };

  function set(key: ViewOptionKey, value: boolean | undefined) {
    if (scope === "everywhere") {
      if (value !== undefined) void data.setSetting(key, value);
    } else {
      const id = scope === "song" ? props.songId : props.setlistId;
      if (id) void data.setViewOverride(scope, id, key, value);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-label={t("view.title")}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") props.onClose();
      }}
      onClick={(event) => {
        // A tap on the backdrop closes the sheet.
        if (event.target === dialog.current) props.onClose();
      }}
      className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-[12px] bg-bg p-0 text-text shadow-xl backdrop:bg-black/40"
    >
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex items-center">
          <h2 className="flex-1 text-[17px] font-extrabold">{t("view.title")}</h2>
          <IconButton label={t("common.close")} onClick={props.onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div role="tablist" className="flex gap-4 border-b border-line">
          {scopes.map((value) => (
            <button
              type="button"
              role="tab"
              key={value}
              aria-selected={scope === value}
              onClick={() => setScope(value)}
              className={`h-10 border-b-[3px] text-[15px] ${
                scope === value
                  ? "border-signal font-extrabold"
                  : "border-transparent font-semibold text-muted"
              }`}
            >
              {t(`view.scope.${value}`)}
            </button>
          ))}
        </div>
        <p className="py-2 text-[13px] font-medium text-muted">{intro[scope]}</p>
        {VIEW_OPTION_KEYS.map((key) => {
          const source = resolved.source[key];
          const own = source === scope && scope !== "everywhere";
          return (
            <div key={key} className="flex min-h-12 items-center gap-3 border-b border-line py-1.5">
              <label htmlFor={`view-${key}`} className="min-w-0 flex-1 cursor-pointer">
                <span className="block text-[15px] font-bold">{t(LABELS[key])}</span>
                <span
                  className={`block text-[13px] font-medium ${own ? "text-signal" : "text-muted"}`}
                >
                  {t(SOURCE[source])}
                </span>
              </label>
              {own && (
                <button
                  type="button"
                  onClick={() => set(key, undefined)}
                  className="h-9 px-1 text-[13px] font-bold underline"
                >
                  {t("view.reset")}
                </button>
              )}
              <input
                id={`view-${key}`}
                type="checkbox"
                role="switch"
                aria-checked={resolved.value[key]}
                checked={resolved.value[key]}
                onChange={(event) => set(key, event.target.checked)}
                className="size-5 accent-[var(--accent)]"
              />
            </div>
          );
        })}
        <Link
          href={`/songs/${encodeURIComponent(props.songId)}/edit`}
          className="mt-4 flex h-11 items-center justify-center rounded-control bg-surface text-[15px] font-bold"
        >
          {t("view.editSong")}
        </Link>
      </div>
    </dialog>
  );
}

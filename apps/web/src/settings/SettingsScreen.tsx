import type { ReactNode } from "react";
import { useApp } from "../app-context.tsx";
import type { MessageKey } from "../i18n/en.ts";
import { LANGUAGES } from "../i18n/index.ts";
import type { InstrumentChoice, Settings, Theme } from "../storage/app-state.ts";
import { backupFileName, formatBundle } from "../storage/bundle.ts";
import { saveFile } from "../ui/save-file.ts";
import { MainTopBar } from "../ui/TopBar.tsx";
import { UpdateNotice } from "../ui/UpdateNotice.tsx";

const INSTRUMENTS: { id: InstrumentChoice; label: MessageKey }[] = [
  { id: "harmony", label: "instrument.harmony" },
  { id: "guitar", label: "instrument.guitar" },
  { id: "bass", label: "instrument.bass" },
  { id: "keys", label: "instrument.keys" },
  { id: "drums", label: "instrument.drums" },
];
const THEMES: { id: Theme; label: MessageKey; hint?: MessageKey }[] = [
  { id: "system", label: "settings.theme.system" },
  { id: "light", label: "settings.theme.light" },
  { id: "dark", label: "settings.theme.dark", hint: "settings.theme.dark.hint" },
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function RadioRow(props: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-line py-2">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{props.label}</span>
        {props.hint && (
          <span className="block text-[13px] font-medium text-muted">{props.hint}</span>
        )}
      </span>
      <input
        type="radio"
        name={props.name}
        checked={props.checked}
        onChange={props.onChange}
        className="size-5 accent-[var(--accent)]"
      />
    </label>
  );
}

function SwitchRow(props: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-line py-2">
      <span className="min-w-0 flex-1 text-[15px] font-bold">{props.label}</span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={props.checked}
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
        className="size-5 accent-[var(--accent)]"
      />
    </label>
  );
}

export function SettingsScreen() {
  const { settings, data, t } = useApp();
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    void data.setSetting(key, value);
  const select = "h-12 w-full rounded-control bg-surface px-3 text-[15px] font-bold";

  async function backup() {
    const now = new Date();
    const saved = await saveFile(
      backupFileName(now),
      formatBundle(data.exportBundle(now)),
      "application/json",
    );
    if (saved) await data.setSetting("lastBackupAt", now.getTime());
  }

  return (
    <div className="flex h-full flex-col">
      <MainTopBar
        current="nav.settings"
        actions={
          <span className="pr-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
            {t("settings.thisDevice")}
          </span>
        }
      />
      <main className="mx-auto min-h-0 w-full max-w-xl flex-1 overflow-y-auto px-3 pb-6 pt-1">
        <UpdateNotice />
        <Group title={t("settings.language")}>
          <select
            aria-label={t("settings.language")}
            value={settings.language}
            onChange={(event) => set("language", event.target.value as Settings["language"])}
            className={select}
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name} — {language.english}
              </option>
            ))}
          </select>
        </Group>
        <Group title={t("settings.instrument")}>
          <select
            aria-label={t("settings.instrument")}
            value={settings.instrument}
            onChange={(event) => set("instrument", event.target.value as InstrumentChoice)}
            className={select}
          >
            {INSTRUMENTS.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>
                {t(instrument.label)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[13px] font-medium text-muted">{t("settings.instrumentHint")}</p>
        </Group>
        <Group title={t("settings.notation")}>
          {(["H", "B"] as const).map((notation) => (
            <RadioRow
              key={notation}
              name="notation"
              checked={settings.notation === notation}
              onChange={() => set("notation", notation)}
              label={t(`settings.notation.${notation}`)}
              hint={t(`settings.notation.${notation}.hint`)}
            />
          ))}
        </Group>
        <Group title={t("settings.theme")}>
          {THEMES.map((theme) => (
            <RadioRow
              key={theme.id}
              name="theme"
              checked={settings.theme === theme.id}
              onChange={() => set("theme", theme.id)}
              label={t(theme.label)}
              hint={theme.hint && t(theme.hint)}
            />
          ))}
        </Group>
        <Group title={t("settings.chordSize")}>
          {(["s", "m", "l"] as const).map((size) => (
            <RadioRow
              key={size}
              name="chord-size"
              checked={settings.chordSize === size}
              onChange={() => set("chordSize", size)}
              label={t(`settings.chordSize.${size}`)}
              hint={size === "l" ? t("settings.chordSize.l.hint") : undefined}
            />
          ))}
        </Group>
        <Group title={t("settings.songView")}>
          <SwitchRow
            checked={settings.beatDots}
            onChange={(value) => set("beatDots", value)}
            label={t("settings.beatDots")}
          />
          <SwitchRow
            checked={settings.soundingChords}
            onChange={(value) => set("soundingChords", value)}
            label={t("settings.soundingChords")}
          />
        </Group>
        <Group title={t("song.compact")}>
          <SwitchRow
            checked={settings.compact}
            onChange={(value) => set("compact", value)}
            label={t("settings.compact")}
          />
        </Group>
        <Group title={t("settings.data")}>
          <p className="mb-2 text-[13px] font-medium text-muted">{t("settings.dataHint")}</p>
          <button
            type="button"
            onClick={() => void backup()}
            className="h-12 w-full rounded-control bg-accent text-[15px] font-bold text-accent-fg"
          >
            {t("settings.backup")}
          </button>
          <p className="mt-2 text-[13px] font-medium text-muted">
            {settings.lastBackupAt === null
              ? t("library.noBackup")
              : t("library.lastBackup", {
                  date: new Intl.DateTimeFormat(settings.language, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(settings.lastBackupAt),
                })}{" "}
            {t("settings.restoreHint")}
          </p>
        </Group>
        <p className="text-[13px] font-medium text-muted">
          {t("settings.version")} {__APP_VERSION__}
        </p>
      </main>
    </div>
  );
}

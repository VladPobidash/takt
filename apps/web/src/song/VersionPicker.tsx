import { lazy, Suspense, useId } from "react";
import { useApp } from "../app-context.tsx";
import type { SelectOption } from "../ui/SearchableSelect.tsx";

// The combobox brings Base UI with it: it is loaded only for a song with five versions or more,
// so the song screen stays within its JavaScript budget (ADR 0003).
const SearchableSelect = lazy(() =>
  import("../ui/SearchableSelect.tsx").then((module) => ({ default: module.SearchableSelect })),
);

/** Up to this many choices (the main version included) are underline tabs; more get a searchable select. */
const MAX_TABS = 4;
const MAIN = "";

/**
 * Chooses a version of a song (ADR 0013): the main one or a named form. `value` is the
 * form's name, null for the main version. A name the song does not have checks nothing, so
 * that choosing the main version clears it.
 */
export function VersionPicker(props: {
  forms: string[];
  value: string | null;
  onChange: (form: string | null) => void;
  /** `bar`: the strip under the song's title. `field`: a row in a list being edited. */
  variant?: "bar" | "field";
}) {
  const { t } = useApp();
  const name = useId();
  const current = props.value ?? MAIN;
  const options: SelectOption<string>[] = [
    { value: MAIN, label: t("song.versionMain") },
    ...props.forms.map((form) => ({ value: form, label: form })),
  ];
  const change = (value: string) => props.onChange(value === MAIN ? null : value);
  const bar = props.variant !== "field";

  if (options.length > MAX_TABS) {
    const selected = options.find((option) => option.value === current) ?? options[0];
    return (
      <div className={bar ? "px-3 pb-1.5" : ""}>
        <Suspense
          fallback={
            <div className="flex min-h-12 items-center rounded-control bg-surface px-3 text-[15px] font-bold">
              {selected?.label}
            </div>
          }
        >
          <SearchableSelect
            label={t("song.versions")}
            options={options}
            value={current}
            onChange={change}
            searchPlaceholder={t("song.versionSearch")}
            emptyText={t("song.versionNone")}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <fieldset
      className={`no-scrollbar flex min-w-0 items-center gap-3 overflow-x-auto ${bar ? "px-3" : ""}`}
    >
      <legend className="sr-only">{t("song.versions")}</legend>
      <span
        aria-hidden="true"
        className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted"
      >
        {t("song.versions")}
      </span>
      {options.map((option) => {
        const selected = option.value === current;
        return (
          <label
            key={option.value}
            className={`flex h-9 max-w-[16rem] shrink-0 cursor-pointer items-center border-b-2 text-[14px] has-focus-visible:outline-2 has-focus-visible:outline-text ${
              selected
                ? "border-signal font-extrabold"
                : "border-transparent font-semibold text-muted"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => change(option.value)}
              className="sr-only"
            />
            <span className="truncate">{option.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

import { Combobox } from "@base-ui/react/combobox";
import { ChevronDownIcon, SearchIcon } from "./icons.tsx";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** A second, quieter line: a translation, an explanation. */
  hint?: string;
}

/**
 * The design system's control for five or more options, or a list that can grow: a field
 * showing the current value that opens a list with a search input on top (Base UI Combobox).
 */
export function SearchableSelect<T extends string>(props: {
  label: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  searchPlaceholder: string;
  emptyText: string;
}) {
  const selected = props.options.find((option) => option.value === props.value) ?? null;
  return (
    <Combobox.Root
      items={props.options}
      value={selected}
      onValueChange={(option: SelectOption<T> | null) => {
        if (option) props.onChange(option.value);
      }}
      isItemEqualToValue={(item: SelectOption<T>, value: SelectOption<T>) =>
        item.value === value.value
      }
      // The hint takes part in the search: "ukr" finds "Українська — Ukrainian".
      itemToStringLabel={(option: SelectOption<T>) => `${option.label} ${option.hint ?? ""}`}
    >
      <Combobox.Trigger
        aria-label={props.label}
        className="flex min-h-12 w-full items-center gap-3 rounded-control bg-surface px-3 py-1.5 text-left data-popup-open:outline-2 data-popup-open:outline-text"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">{selected?.label}</span>
          {selected?.hint && (
            <span className="block truncate text-[13px] font-medium text-muted">
              {selected.hint}
            </span>
          )}
        </span>
        <ChevronDownIcon />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner align="start" sideOffset={4} className="z-30">
          <Combobox.Popup
            aria-label={props.label}
            className="w-[var(--anchor-width)] max-w-[var(--available-width)] rounded-control border border-line bg-bg text-text shadow-lg"
          >
            <div className="flex items-center gap-2 border-b border-line px-3 text-muted">
              <SearchIcon />
              <Combobox.Input
                placeholder={props.searchPlaceholder}
                aria-label={props.searchPlaceholder}
                className="h-11 min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-text outline-none placeholder:text-muted"
              />
            </div>
            <Combobox.Empty>
              <div className="px-3 py-3 text-[14px] font-medium text-muted">{props.emptyText}</div>
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 empty:p-0">
              {(option: SelectOption<T>) => (
                <Combobox.Item
                  key={option.value}
                  value={option}
                  className="flex min-h-11 cursor-default items-center gap-2 rounded-badge px-2 py-1 outline-none select-none data-highlighted:bg-surface data-selected:bg-surface"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{option.label}</span>
                    {option.hint && (
                      <span className="block truncate text-[13px] font-medium text-muted">
                        {option.hint}
                      </span>
                    )}
                  </span>
                  <Combobox.ItemIndicator className="shrink-0 text-[15px] font-extrabold">
                    ✓
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

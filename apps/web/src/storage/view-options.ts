/** What a musician can switch on and off in the song view. */
export interface ViewOptions {
  beatDots: boolean;
  /** Guitar: the sounding chord under each capo shape. */
  soundingChords: boolean;
  bandNotes: boolean;
  /** Cues written for the instrument being viewed. */
  instrumentNotes: boolean;
  /** The words of each section, under its bars (never in compact mode). */
  lyrics: boolean;
  personalNotes: boolean;
  /** Open in compact mode. */
  compact: boolean;
}

export type ViewOptionKey = keyof ViewOptions;
export const VIEW_OPTION_KEYS: ViewOptionKey[] = [
  "beatDots",
  "soundingChords",
  "bandNotes",
  "instrumentNotes",
  "lyrics",
  "personalNotes",
  "compact",
];
export const DEFAULT_VIEW_OPTIONS: ViewOptions = {
  beatDots: true,
  soundingChords: true,
  bandNotes: true,
  instrumentNotes: true,
  lyrics: true,
  personalNotes: true,
  compact: false,
};

/** The options set on one level only; everything else is inherited. */
export type ViewOverrides = Partial<ViewOptions>;
/** The three levels, from the most specific to the least (ADR 0009). */
export type ViewScope = "song" | "setlist" | "everywhere";

export interface ResolvedViewOptions {
  value: ViewOptions;
  /** The level each value comes from. */
  source: Record<ViewOptionKey, ViewScope>;
}

/** The most specific level that sets an option wins: song, then setlist, then everywhere. */
export function resolveViewOptions(
  everywhere: ViewOptions,
  setlist: ViewOverrides | undefined,
  song: ViewOverrides | undefined,
): ResolvedViewOptions {
  const value = { ...everywhere };
  const source = {} as Record<ViewOptionKey, ViewScope>;
  for (const key of VIEW_OPTION_KEYS) {
    source[key] = "everywhere";
    if (setlist?.[key] !== undefined) {
      value[key] = setlist[key];
      source[key] = "setlist";
    }
    if (song?.[key] !== undefined) {
      value[key] = song[key];
      source[key] = "song";
    }
  }
  return { value, source };
}

/** Sets or, with `undefined`, removes one option on a level. Returns undefined when nothing is left. */
export function withOverride(
  overrides: ViewOverrides | undefined,
  key: ViewOptionKey,
  value: boolean | undefined,
): ViewOverrides | undefined {
  const next: ViewOverrides = { ...overrides };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return Object.keys(next).length > 0 ? next : undefined;
}

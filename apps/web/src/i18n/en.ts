/** English messages: the source of keys. Plural entries are keyed by `Intl.PluralRules` categories. */
export const en = {
  "app.name": "Takt",
  "nav.library": "Library",
  "nav.settings": "Settings",
  "nav.menu": "Sections",
  "common.back": "Back",

  "library.import": "Import files",
  "library.search": "Search songs",
  "library.empty": "No songs yet. Import a .takt file to start.",
  "library.nothingFound": "Nothing found",
  "library.songs": "Songs",
  "library.sections": { one: "{count} section", other: "{count} sections" },
  "library.imported": { one: "{count} song imported", other: "{count} songs imported" },
  "library.warnings": { one: "{count} warning", other: "{count} warnings" },
  "library.onDevice": "Songs live only on this device.",

  "song.notFound": "This song is not on this device.",
  "song.key": "Key",
  "song.bpm": "BPM",
  "song.capo": "Capo",
  "song.original": "original",
  "song.transposeUp": "Transpose up",
  "song.transposeDown": "Transpose down",
  "song.capoUp": "Capo up",
  "song.capoDown": "Capo down",
  "song.form": "Song form",
  "song.instruments": "Instrument view",
  "song.bandNote": "Band",

  "instrument.harmony": "Harmony",
  "instrument.guitar": "Guitar",
  "instrument.bass": "Bass",
  "instrument.keys": "Keys",
  "instrument.drums": "Drums",

  "settings.thisDevice": "This device",
  "settings.language": "Interface language",
  "settings.instrument": "My instrument",
  "settings.instrumentHint": "The view a song opens in.",
  "settings.notation": "Chord names",
  "settings.notation.H": "H and B (German / Ukrainian)",
  "settings.notation.H.hint": "H = B natural, B = B flat",
  "settings.notation.B": "B and B♭ (English)",
  "settings.notation.B.hint": "B = B natural",
  "settings.theme": "Theme",
  "settings.theme.system": "Same as the system",
  "settings.theme.light": "Light",
  "settings.theme.dark": "Dark",
  "settings.theme.dark.hint": "Recommended on stage",
  "settings.beatDots": "Beat dots under chords",
  "settings.soundingChords": "Guitar: sounding chords under shapes",
  "settings.songView": "Song view",
  "settings.chordSize": "Chord size",
  "settings.chordSize.s": "Small",
  "settings.chordSize.m": "Medium",
  "settings.chordSize.l": "Large",
  "settings.chordSize.l.hint": "For a phone on a music stand",
  "settings.version": "Version",

  "update.available": "A new version of Takt is ready.",
  "update.apply": "Update now",
} as const;

export type MessageKey = keyof typeof en;
type Plural = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
/** Every language must provide exactly the keys of `en`. */
export type Messages = { [K in MessageKey]: (typeof en)[K] extends string ? string : Plural };

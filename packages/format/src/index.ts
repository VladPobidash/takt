/** Version of the `.takt` format this library reads. */
export const FORMAT_VERSION = 0;

export { extractRepeat, parseBars } from "./bars.ts";
export { formatChord, formatNote, parseChord, semitone } from "./chord.ts";
export {
  cleanFormName,
  type FormStepInput,
  findForm,
  formatFormEntries,
} from "./forms.ts";
export { readHeader } from "./header.ts";
export {
  isVocal,
  type KnownInstrument,
  normalizeInstrument,
  VOICE_PARTS,
  type VoicePart,
} from "./instruments.ts";
export { parse } from "./parse.ts";
export { resolveSong, sectionType } from "./resolve.ts";
export { removeForm, renameForm, setForm, transposeText } from "./rewrite.ts";
export { formatSetlist, parseSetlist, type Setlist, type SetlistEntry } from "./setlist.ts";
export {
  type CapoSuggestion,
  capoShape,
  formatKey,
  parseKey,
  prefersFlats,
  suggestCapos,
  transposeChord,
  transposeKey,
} from "./transpose.ts";
export type * from "./types.ts";

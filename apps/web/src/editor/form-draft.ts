import { type FormStepInput, findForm, type SongDoc } from "@takt/format";

/**
 * One row of the version editor: a section of the file (`docIndex`), whether this version
 * plays it, and its repeat (null keeps the section's own, ADR 0013).
 */
export interface DraftRow {
  section: number;
  repeat: number | null;
  on: boolean;
}

export const MIN_REPEAT = 1;
export const MAX_REPEAT = 16;

/** Sections a form line can name: every section with a name. */
function nameable(doc: SongDoc): number[] {
  return doc.sections.flatMap((section, index) => (section.name === "" ? [] : [index]));
}

/** The rows of the main version: every section, in file order, with its own repeat. */
export function mainDraft(doc: SongDoc): DraftRow[] {
  return nameable(doc).map((section) => ({ section, repeat: null, on: true }));
}

/**
 * The rows of a named version: its entries in order, then — switched off, so they can be
 * switched back on in place — every section it leaves out, after the last played section
 * that comes before it in the file.
 */
export function formDraft(doc: SongDoc, name: string): DraftRow[] {
  const form = findForm(doc, name);
  if (!form) return mainDraft(doc);
  const rows: DraftRow[] = form.entries.flatMap((entry) =>
    entry.section === null ? [] : [{ section: entry.section, repeat: entry.repeat, on: true }],
  );
  const played = new Set(rows.map((row) => row.section));
  for (const section of nameable(doc)) {
    if (played.has(section)) continue;
    const after = rows.findLastIndex((row) => row.section < section);
    rows.splice(after + 1, 0, { section, repeat: null, on: false });
  }
  return rows;
}

/** What the form line holds: the rows that are played. */
export function draftSteps(rows: DraftRow[]): FormStepInput[] {
  return rows.filter((row) => row.on).map(({ section, repeat }) => ({ section, repeat }));
}

/** A repeat to store: the section's own repeat is not written, so it keeps following the file. */
export function repeatFor(value: number, own: number): number | null {
  const clamped = Math.min(MAX_REPEAT, Math.max(MIN_REPEAT, value));
  return clamped === own ? null : clamped;
}

/** Moves a row; out-of-range moves change nothing. */
export function moveRow(rows: DraftRow[], from: number, to: number): DraftRow[] {
  if (to < 0 || to >= rows.length || from === to) return rows;
  const next = [...rows];
  const [row] = next.splice(from, 1);
  if (!row) return rows;
  next.splice(to, 0, row);
  return next;
}

/** A free name for a new version: `Version 2`, `Version 3`, … as the caller words it. */
export function newFormName(taken: string[], word: (count: number) => string): string {
  const used = new Set(taken.map((name) => name.trim().toLowerCase()));
  for (let count = taken.length + 1; ; count++) {
    const name = word(count);
    if (!used.has(name.toLowerCase())) return name;
  }
}

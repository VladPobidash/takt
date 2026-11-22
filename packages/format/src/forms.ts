import { extractRepeat } from "./bars.ts";
import type { Diagnostic, FormEntry, Pos, Section, SongDoc, SongForm, Span } from "./types.ts";

/**
 * Named versions of a song (ADR 0013): `form <name>: <entry>, <entry>, …` in the header.
 * An entry is a section name, optionally `#n`, optionally a repeat.
 */

const OCCURRENCE = /^(.*?)\s*#\s*(\d+)$/s;

/** How names are compared: without letter case, spaces collapsed, no spaces around commas. */
function sectionKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .trim();
}

function formKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/** A name a form line can hold: no colon, no bar line, no line break; spaces collapsed. */
export function cleanFormName(name: string): string {
  return name.replace(/[:|]/g, "").replace(/\s+/g, " ").trim();
}

/** A form line before its entries are matched to sections. */
export interface FormLine {
  name: string;
  nameFrom: number;
  nameTo: number;
  listFrom: number;
  listTo: number;
}

/** Reads `form <name>: <list>` out of one trimmed line; null when it is not a form line. */
export function readFormLine(text: string): FormLine | null {
  if (!/^form\s/i.test(text) || text.includes("|")) return null;
  const colon = text.indexOf(":");
  if (colon === -1) return null;
  const rawName = text.slice(4, colon);
  const name = rawName.replace(/\s+/g, " ").trim();
  if (name === "") return null;
  const nameFrom = 4 + (rawName.length - rawName.trimStart().length);
  const nameTo = colon - (rawName.length - rawName.trimEnd().length);
  const rawList = text.slice(colon + 1);
  const listFrom = colon + 1 + (rawList.length - rawList.trimStart().length);
  return { name, nameFrom, nameTo, listFrom, listTo: Math.max(listFrom, text.length) };
}

/** Section indices by name key, in file order. */
function sectionsByName(sections: Section[]): Map<string, number[]> {
  const byName = new Map<string, number[]>();
  sections.forEach((section, index) => {
    if (section.name === "") return;
    const key = sectionKey(section.name);
    byName.set(key, [...(byName.get(key) ?? []), index]);
  });
  return byName;
}

interface Read {
  key: string | null;
  occurrence: number | null;
  /** The entry without its repeat: what an unknown entry reports. */
  name: string;
  repeat: number | null;
}

function readEntry(text: string, byName: Map<string, number[]>): Read {
  const { repeat, rest } = extractRepeat(text);
  const whole = sectionKey(rest);
  if (byName.has(whole)) return { key: whole, occurrence: null, name: rest, repeat };
  const numbered = OCCURRENCE.exec(rest);
  if (numbered) {
    const key = sectionKey(numbered[1] as string);
    if (byName.has(key)) return { key, occurrence: Number(numbered[2]), name: rest, repeat };
  }
  return { key: null, occurrence: null, name: rest, repeat };
}

/**
 * Splits a form's list into entries and matches them to the sections of the file.
 * Pieces between commas are joined back into the longest run that names a section, so
 * `1, 2 Verse` stays one entry. Without `#n` the k-th mention of a name is the k-th section
 * of that name (the last one once the file has no more).
 */
export function readFormEntries(
  list: string,
  at: Pos,
  sections: Section[],
  form: string,
  diagnostics: Diagnostic[],
): FormEntry[] {
  const byName = sectionsByName(sections);
  const pieces: { from: number; to: number }[] = [];
  let start = 0;
  for (let i = 0; i <= list.length; i++) {
    if (i < list.length && list[i] !== ",") continue;
    const raw = list.slice(start, i);
    const from = start + (raw.length - raw.trimStart().length);
    pieces.push({ from, to: Math.max(from, i - (raw.length - raw.trimEnd().length)) });
    start = i + 1;
  }
  const spanOf = (from: number, to: number): Span => ({
    start: { offset: at.offset + from, line: at.line, column: at.column + from },
    end: { offset: at.offset + to, line: at.line, column: at.column + to },
  });

  const mentions = new Map<string, number>();
  const entries: FormEntry[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const first = pieces[i] as { from: number; to: number };
    if (first.from === first.to) continue;
    let last = i;
    let read: Read | null = null;
    for (let j = pieces.length - 1; j >= i; j--) {
      const end = pieces[j] as { from: number; to: number };
      if (end.from === end.to) continue;
      const candidate = readEntry(list.slice(first.from, end.to), byName);
      if (candidate.key !== null || j === i) {
        read = candidate;
        last = j;
        if (candidate.key !== null) break;
      }
    }
    if (!read) continue;
    const to = (pieces[last] as { to: number }).to;
    let section: number | null = null;
    if (read.key !== null) {
      const indices = byName.get(read.key) as number[];
      const mention = (mentions.get(read.key) ?? 0) + 1;
      mentions.set(read.key, mention);
      const nth = read.occurrence ?? Math.min(mention, indices.length);
      section = indices[nth - 1] ?? null;
    }
    const span = spanOf(first.from, to);
    if (section === null) {
      diagnostics.push({
        code: "unknown-form-section",
        severity: "warning",
        span,
        data: { name: read.name, form },
      });
    }
    entries.push({ text: list.slice(first.from, to), section, repeat: read.repeat, span });
    i = last;
  }
  return entries;
}

/** Reports forms that repeat an earlier name and forms with nothing in them. */
export function checkForms(forms: SongForm[], diagnostics: Diagnostic[]): void {
  const seen = new Set<string>();
  for (const form of forms) {
    const key = formKey(form.name);
    if (seen.has(key)) {
      diagnostics.push({
        code: "duplicate-form",
        severity: "warning",
        span: form.span,
        data: { name: form.name },
      });
    }
    seen.add(key);
    if (form.entries.length === 0) {
      diagnostics.push({
        code: "empty-form",
        severity: "warning",
        span: form.span,
        data: { name: form.name },
      });
    }
  }
}

/** The form of that name (letter case and extra spaces ignored); the first one when the file repeats it. */
export function findForm(doc: SongDoc, name: string): SongForm | null {
  const key = formKey(name);
  return doc.forms.find((form) => formKey(form.name) === key) ?? null;
}

/** Names of the versions that have something to play, the first of each name, in file order. */
export function playableForms(doc: SongDoc): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const form of doc.forms) {
    const key = formKey(form.name);
    if (seen.has(key)) continue;
    seen.add(key);
    if (form.entries.some((entry) => entry.section !== null)) names.push(form.name);
  }
  return names;
}

/** What the form editor writes: a section of the file and a repeat (null keeps the section's own). */
export interface FormStepInput {
  section: number;
  repeat: number | null;
}

/**
 * Writes a form's list: section names as the file writes them, `#n` only where the k-th
 * mention rule would pick another section of that name, and repeats as `x2`.
 * Sections without a name cannot be named and are left out.
 */
export function formatFormEntries(doc: SongDoc, steps: FormStepInput[]): string {
  const byName = sectionsByName(doc.sections);
  const mentions = new Map<string, number>();
  const parts: string[] = [];
  for (const step of steps) {
    const section = doc.sections[step.section];
    if (!section || section.name === "") continue;
    const key = sectionKey(section.name);
    const indices = byName.get(key) as number[];
    const mention = (mentions.get(key) ?? 0) + 1;
    mentions.set(key, mention);
    const implied = indices[Math.min(mention, indices.length) - 1];
    let text = section.name;
    if (implied !== step.section) text += ` #${indices.indexOf(step.section) + 1}`;
    if (step.repeat !== null) text += ` x${Math.max(1, Math.round(step.repeat))}`;
    parts.push(text);
  }
  return parts.join(", ");
}

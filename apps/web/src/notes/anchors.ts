import type { ResolvedSection } from "@takt/format";

/**
 * Where a personal note is attached (ADR 0008): the section by name and by which section of
 * that name it is, then the line and the bar inside it. A note on the whole section has no
 * line and no bar. Editing other sections does not move the note.
 */
export interface NoteAnchor {
  section: string;
  /** 1 for the first section with this name, 2 for the second, … */
  occurrence: number;
  line: number | null;
  bar: number | null;
}

export function anchorKey(anchor: NoteAnchor): string {
  const place = anchor.line === null || anchor.bar === null ? "" : `/${anchor.line}/${anchor.bar}`;
  return `${anchor.section.trim().toLowerCase()}#${anchor.occurrence}${place}`;
}

/** For every section: its name and which section of that name it is. */
export function sectionOccurrences(
  sections: Pick<ResolvedSection, "name">[],
): { section: string; occurrence: number }[] {
  const seen = new Map<string, number>();
  return sections.map(({ name }) => {
    const key = name.trim().toLowerCase();
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);
    return { section: name, occurrence };
  });
}

/** Personal notes of one song, by anchor key. */
export type SongNotes = Record<string, string>;

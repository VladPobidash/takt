import { sectionType } from "./section-type.ts";
import type { BarsLine, Section } from "./types.ts";

export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function baseBars(section: Section): BarsLine[] {
  return section.lines.filter(
    (line): line is BarsLine => line.kind === "bars" && line.instrument === null,
  );
}

export function partBars(section: Section, instrument: string): BarsLine[] {
  return section.lines.filter(
    (line): line is BarsLine => line.kind === "bars" && line.instrument === instrument,
  );
}

/**
 * The section whose bars `sections[index]` plays: itself if it has base bar lines, otherwise
 * the section it references (`## A = B`), or the most recent earlier section with the same
 * name, or — as musicians write `Verse 2` under `1 Verse` — the most recent earlier section
 * of the same kind. Returns null when there is nothing to reuse.
 */
export function sourceIndex(sections: Section[], index: number): number | null {
  const seen = new Set<number>();
  let current = index;
  for (;;) {
    const section = sections[current];
    if (!section || seen.has(current)) return null;
    if (baseBars(section).length > 0) return current;
    seen.add(current);
    const wanted = section.ref ?? section.name;
    let next = -1;
    for (let i = current - 1; i >= 0; i--) {
      if (sameName((sections[i] as Section).name, wanted)) {
        next = i;
        break;
      }
    }
    // A reference may also point forward (`## Intro = Outro`).
    if (next === -1 && section.ref !== null) {
      next = sections.findIndex((s, i) => i !== current && sameName(s.name, wanted));
    }
    // No section of that name: an empty `Chorus 2` means "the chorus again".
    if (next === -1 && section.ref === null) {
      const kind = sectionType(section.name);
      if (kind !== "other") {
        for (let i = current - 1; i >= 0; i--) {
          if (sectionType((sections[i] as Section).name) === kind) {
            next = i;
            break;
          }
        }
      }
    }
    if (next === -1) return null;
    current = next;
  }
}

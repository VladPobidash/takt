import type { SectionType } from "./types.ts";

/** Name prefixes per section type, English and Ukrainian. Order matters: pre-chorus before chorus. */
const TYPE_NAMES: [SectionType, string[]][] = [
  ["pre-chorus", ["pre-chorus", "prechorus", "pre chorus", "pre", "передприспів", "перед приспів"]],
  ["chorus", ["chorus", "refrain", "приспів", "рефрен"]],
  ["verse", ["verse", "куплет", "строфа"]],
  ["bridge", ["bridge", "брідж", "бридж"]],
  ["intro", ["intro", "вступ", "інтро"]],
  ["interlude", ["interlud", "програш", "інтерлюд"]],
  ["instrumental", ["instrumental", "inst", "solo", "інструментал", "соло"]],
  ["outro", ["outro", "ending", "coda", "кінцівка", "аутро", "кода"]],
];

/** Numbers written before the name, as in `3 Verse` or `1, 2 Verse`. */
export const LEADING_NUMBERS = /^\s*(\d+(?:\s*[,&+–-]\s*\d+)*)[.):]?\s+/;

function withoutLeadingNumbers(name: string): string {
  return name.replace(LEADING_NUMBERS, "").trim();
}

/** Detects the section type from its name: `Verse 2` → `verse`, `Приспів` → `chorus`. */
export function sectionType(name: string): SectionType {
  const lower = withoutLeadingNumbers(name).toLowerCase();
  for (const [type, prefixes] of TYPE_NAMES) {
    if (prefixes.some((prefix) => lower.startsWith(prefix))) return type;
  }
  return "other";
}

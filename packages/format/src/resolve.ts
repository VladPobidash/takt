import { readHeader } from "./header.ts";
import { baseBars, partBars, sourceIndex } from "./sections.ts";
import type {
  BarsLine,
  FormItem,
  ResolvedLine,
  ResolvedNote,
  ResolvedSection,
  ResolvedSong,
  ResolveOptions,
  Section,
  SectionType,
  SongDoc,
} from "./types.ts";

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

const ABBREVIATION: Record<SectionType, string> = {
  intro: "I",
  verse: "V",
  "pre-chorus": "P",
  chorus: "C",
  bridge: "B",
  interlude: "I",
  instrumental: "Inst",
  outro: "O",
  other: "",
};

/** Section types that are numbered when they occur more than once (`C`, `C2`, `C3`). */
const COUNTED = new Set<SectionType>(["verse", "pre-chorus", "chorus", "bridge"]);

/** Detects the section type from its name: `Verse 2` → `verse`, `Приспів` → `chorus`. */
export function sectionType(name: string): SectionType {
  const lower = withoutLeadingNumbers(name).toLowerCase();
  for (const [type, prefixes] of TYPE_NAMES) {
    if (prefixes.some((prefix) => lower.startsWith(prefix))) return type;
  }
  return "other";
}

/** Numbers written before the name, as in `3 Verse` or `1, 2 Verse`. */
const LEADING_NUMBERS = /^\s*(\d+(?:\s*[,&+–-]\s*\d+)*)[.):]?\s+/;

function withoutLeadingNumbers(name: string): string {
  return name.replace(LEADING_NUMBERS, "").trim();
}

function abbreviation(name: string, type: SectionType, occurrence: number): string {
  if (type === "other") return (name.trim().split(/\s+/)[0] ?? "").slice(0, 4);
  const short = ABBREVIATION[type];
  // The band numbers sections either way: `Chorus 2` or `3 Verse`, also `1, 2 Verse`.
  const leading = LEADING_NUMBERS.exec(name);
  if (leading) return short + (leading[1] as string).replace(/\s+/g, "");
  const numbered = /(\d+)\s*$/.exec(name);
  if (numbered) return short + numbered[1];
  return COUNTED.has(type) && occurrence > 1 ? short + occurrence : short;
}

function toLine(line: BarsLine, source: ResolvedLine["source"]): ResolvedLine {
  return { bars: line.bars, label: line.label, cue: line.cue, repeat: line.repeat, source };
}

/**
 * Resolves a document into the song one instrument sees: reused sections get their bars,
 * the instrument's own lines replace the base lines with the same ordinal number,
 * and every section gets its type, abbreviation and bar count.
 */
export function resolveSong(doc: SongDoc, options: ResolveOptions = {}): ResolvedSong {
  const instrument = options.instrument ?? null;
  const header = readHeader(doc.meta, doc.notation);
  const occurrences = new Map<SectionType, number>();
  const instruments: string[] = [];

  const sections = doc.sections.map((section, index): ResolvedSection => {
    for (const line of section.lines) {
      if ((line.kind === "bars" || line.kind === "note") && line.instrument !== null) {
        if (!instruments.includes(line.instrument)) instruments.push(line.instrument);
      }
    }

    const sourceAt = sourceIndex(doc.sections, index);
    const source: Section | null = sourceAt === null ? null : (doc.sections[sourceAt] as Section);
    const reused = source !== null && sourceAt !== index;
    const base = source ? baseBars(source) : [];
    const own = instrument === null ? [] : partBars(section, instrument);
    const inherited = instrument !== null && reused ? partBars(source, instrument) : [];
    const count = Math.max(base.length, own.length);
    const lines: ResolvedLine[] = [];
    for (let i = 0; i < count; i++) {
      const part = own[i] ?? inherited[i];
      if (part) lines.push(toLine(part, "part"));
      else lines.push(toLine(base[i] as BarsLine, "base"));
    }

    const notes: ResolvedNote[] = [];
    const lyrics: string[] = [];
    for (const line of section.lines) {
      if (line.kind === "lyrics") lyrics.push(line.text);
      if (line.kind === "note" && (line.instrument === null || line.instrument === instrument)) {
        notes.push({
          text: line.text,
          instrument: line.instrument,
          instrumentName: line.instrumentName,
        });
      }
    }

    const type = sectionType(section.name);
    const occurrence = (occurrences.get(type) ?? 0) + 1;
    occurrences.set(type, occurrence);
    return {
      index,
      name: section.name,
      type,
      abbr: abbreviation(section.name, type, occurrence),
      tag: section.tag,
      repeat: section.repeat ?? (reused ? source.repeat : null) ?? 1,
      reusedFrom: reused ? sourceAt : null,
      lines,
      notes,
      lyrics,
      bars: lines.reduce((sum, line) => sum + line.bars.length * line.repeat, 0),
    };
  });

  const form: FormItem[] = sections.map((section, index) => ({
    section: index,
    type: section.type,
    abbr: section.abbr,
    bars: section.bars,
    repeat: section.repeat,
  }));

  return {
    title: doc.title,
    artist: header.artist,
    link: header.link,
    key: header.key,
    tempo: header.tempo,
    capo: header.capo,
    time: doc.time,
    notation: doc.notation,
    instruments,
    sections,
    form,
  };
}

import { en, type MessageKey, type Messages } from "./en.ts";
import { uk } from "./uk.ts";

export type Language = "en" | "uk";
export const LANGUAGES: { code: Language; name: string; english: string }[] = [
  { code: "en", name: "English", english: "English" },
  { code: "uk", name: "Українська", english: "Ukrainian" },
];

const TABLES: Record<Language, Messages> = { en, uk };
const plurals = new Map<Language, Intl.PluralRules>();

export type Params = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: Params) => string;

/** Picks the UI language from the browser's preferences: Ukrainian if listed first among ours, else English. */
export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (base === "uk") return "uk";
    if (base === "en") return "en";
  }
  return "en";
}

/** Translates a UI message. Plural messages need a `count` parameter. */
export function translate(language: Language, key: MessageKey, params: Params = {}): string {
  const entry = TABLES[language][key] ?? en[key];
  let message: string;
  if (typeof entry === "string") {
    message = entry;
  } else {
    let rules = plurals.get(language);
    if (!rules) {
      rules = new Intl.PluralRules(language);
      plurals.set(language, rules);
    }
    message = entry[rules.select(Number(params.count ?? 0))] ?? entry.other;
  }
  return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

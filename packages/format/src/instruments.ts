/** Instruments with a view of their own. Other names are kept as written, lowercased. */
export type KnownInstrument = "guitar" | "bass" | "keys" | "drums";

const SYNONYMS: Record<string, KnownInstrument> = {
  guitar: "guitar",
  gtr: "guitar",
  гітара: "guitar",
  гитара: "guitar",
  bass: "bass",
  бас: "bass",
  keys: "keys",
  keyboard: "keys",
  piano: "keys",
  клавіші: "keys",
  клавишные: "keys",
  піано: "keys",
  фортепіано: "keys",
  drums: "drums",
  барабани: "drums",
  cajon: "drums",
  cajón: "drums",
  кахон: "drums",
  percussion: "drums",
  перкусія: "drums",
};

/** Turns a name written after `@` into an instrument id: `Бас` → `bass`, `cajon` → `drums`, `Sax` → `sax`. */
export function normalizeInstrument(name: string): string {
  const key = name.trim().toLowerCase();
  return SYNONYMS[key] ?? key;
}

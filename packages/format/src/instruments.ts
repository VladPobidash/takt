/** A singer's part. `@bass` is the bass guitar, so there is no bass voice part. */
export type VoicePart = "soprano" | "alto" | "tenor";
export const VOICE_PARTS: readonly VoicePart[] = ["soprano", "alto", "tenor"];

/** Instruments with a view of their own, and the singers. Other names are kept as written, lowercased. */
export type KnownInstrument = "guitar" | "bass" | "keys" | "drums" | "vocals" | VoicePart;

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
  vocals: "vocals",
  vocal: "vocals",
  voice: "vocals",
  voices: "vocals",
  vox: "vocals",
  вокал: "vocals",
  голос: "vocals",
  голоси: "vocals",
  soprano: "soprano",
  сопрано: "soprano",
  alto: "alto",
  альт: "alto",
  tenor: "tenor",
  тенор: "tenor",
};

/** True for `vocals` and the voice parts: the cues the vocal view shows. */
export function isVocal(instrument: string): boolean {
  return instrument === "vocals" || (VOICE_PARTS as readonly string[]).includes(instrument);
}

/** Turns a name written after `@` into an instrument id: `Бас` → `bass`, `cajon` → `drums`, `Sax` → `sax`. */
export function normalizeInstrument(name: string): string {
  const key = name.trim().toLowerCase();
  return SYNONYMS[key] ?? key;
}

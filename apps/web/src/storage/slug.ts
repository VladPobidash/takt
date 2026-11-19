/** Turns a title or a file name into a song id: lowercase words joined by hyphens, any script. */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFC")
    .toLowerCase()
    .replace(/\.(takt|taktset)$/u, "")
    .replace(/['’ʼ`]/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "song";
}

/** Makes `id` unique among `taken` by adding `-2`, `-3`, … */
export function uniqueId(id: string, taken: ReadonlySet<string>): string {
  if (!taken.has(id)) return id;
  for (let n = 2; ; n++) {
    if (!taken.has(`${id}-${n}`)) return `${id}-${n}`;
  }
}

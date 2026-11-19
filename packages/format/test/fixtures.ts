import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const examplesDir = fileURLToPath(new URL("../../../examples/", import.meta.url));

/** Every `.takt` file in the repository's `examples/` folder. */
export function exampleSongs(): { name: string; text: string }[] {
  return readdirSync(examplesDir)
    .filter((name) => name.endsWith(".takt"))
    .sort()
    .map((name) => ({ name, text: readFileSync(examplesDir + name, "utf8") }));
}

export function exampleSong(name: string): string {
  return readFileSync(examplesDir + name, "utf8");
}

/** The example from docs/format.md. */
export const WORTHY = `# Достойний Ти Один
artist: Elevation Worship — Worthy
key: D
tempo: 135
time: 4/4

## Intro x2
| Hm** D** | G** A** |

## Verse 1
| D | A | D/F#** G** | Asus4* A*** |
| D | A | D/F#** G** | Asus4* A*** | A |
@bass | D | A | F#** G** | A |
> first line — keys only

## Chorus
| G*** Hm* | A | D/F# | Hm |
| G*** Hm* | A | D/F# |
@keys > right hand: melody an octave up

## Interlude = Intro

## Verse 2 x2
| D | A | D/F#** G** | Asus4* A*** |

## Chorus

## Bridge [яма] x4
| G | Em | Hm | A** D/F#** |
@cajon > first 2 times — hand only
`;

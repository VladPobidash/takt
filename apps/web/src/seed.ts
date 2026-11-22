import thankful from "../../../examples/bozhe-ia-vdiachnyi-tobi.takt?raw";
import worthy from "../../../examples/dostoinyi-ty-odyn.takt?raw";
import silentNight from "../../../examples/silent-night.takt?raw";
import gratitude from "../../../examples/vdiachnist.takt?raw";
import type { SeedSong } from "./storage/app-state.ts";

/**
 * The band's first three charts were example songs until 2026-11-22. The band now imports its
 * own files, so the app no longer ships them; they stay in `examples/` as parser fixtures, and
 * the end-to-end tests build the app with `VITE_SEED_FIXTURES=1` to have songs to play with.
 * Without the flag the bundler drops them from the build.
 */
const FIXTURES: SeedSong[] =
  import.meta.env.VITE_SEED_FIXTURES === "1"
    ? [
        { name: "dostoinyi-ty-odyn.takt", text: worthy, original: true },
        { name: "vdiachnist.takt", text: gratitude },
        { name: "bozhe-ia-vdiachnyi-tobi.takt", text: thankful },
      ]
    : [];

/**
 * Example songs every device is given once. To ship another one, add its file to `examples/`
 * and a line here: devices that already use the app get it on their next start. A song taken
 * off this list stays on the devices that have it, until the musician deletes it.
 */
export const SEED_SONGS: SeedSong[] = [
  { name: "silent-night.takt", text: silentNight, original: true },
  ...FIXTURES,
];

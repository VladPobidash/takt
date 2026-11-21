import worthy from "../../../examples/dostoinyi-ty-odyn.takt?raw";
import silentNight from "../../../examples/silent-night.takt?raw";
import gratitude from "../../../examples/vdiachnist.takt?raw";
import type { SeedSong } from "./storage/app-state.ts";

/**
 * Example songs every device is given once. To ship another one, add its file to `examples/`
 * and a line here: devices that already use the app get it on their next start.
 */
export const SEED_SONGS: SeedSong[] = [
  { name: "silent-night.takt", text: silentNight, original: true },
  { name: "dostoinyi-ty-odyn.takt", text: worthy, original: true },
  { name: "vdiachnist.takt", text: gratitude },
];

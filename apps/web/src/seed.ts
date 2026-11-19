import worthy from "../../../examples/dostoinyi-ty-odyn.takt?raw";
import silentNight from "../../../examples/silent-night.takt?raw";

/** Example songs stored on the very first run, so the app is never empty. */
export const SEED_SONGS = [
  { name: "silent-night.takt", text: silentNight },
  { name: "dostoinyi-ty-odyn.takt", text: worthy },
];

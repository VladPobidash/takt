/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** The app's version, from `apps/web/package.json` (ADR 0014): `0.5.0`. */
declare const __APP_VERSION__: string;
/** The day this build was made: `2026-11-22`. */
declare const __APP_BUILD_DATE__: string;

interface ImportMetaEnv {
  /** "1" in the end-to-end build: also seed the fixture songs (see seed.ts). */
  readonly VITE_SEED_FIXTURES?: string;
}

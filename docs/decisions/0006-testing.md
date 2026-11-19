# 0006. Testing strategy

- **Status:** accepted
- **Date:** 2026-11-19
- **Decided by:** Claude Code under the author's delegation of 2026-11-19 ("decide yourself") — open to revision.

## Context

The parser is the core of the product and is written test-first. The app has to be trusted on stage after three Saturday tests, by one developer, so tests must be cheap to write and fast to run. The cloud development container already ships Chromium with Playwright.

Options considered (versions from npm, 2026-11-19):

| Topic | Chosen | Alternatives and why not |
| --- | --- | --- |
| Runner | Vitest 5 for both packages | Node's built-in runner: no dependency, but weaker watch mode, no browser-like environment for the app later. Jest: slower, needs transforms that Vite already does |
| Parser tests | Example-based tests, the test list in [format.md](../format.md) and every file in `examples/` | Snapshot-only tests: quick to write, but they approve whatever the code does |
| Transposition | Property tests with fast-check 4 | Only examples: misses enharmonic corner cases |
| App | A few end-to-end smoke tests in a phone viewport (Playwright); logic kept in pure functions that Vitest covers | Component tests for every component: slow to write before the design settles. Pixel-diff against the design screenshots: brittle, fails on any font rendering difference |

## Decision

- **Vitest** runs all unit tests; `pnpm test` at the root runs every package.
- **`@takt/format` is test-first:** a failing test is written before the behaviour. Sources of cases, in order: "Parser test cases" in format.md, the example in format.md, every `.takt` file in `examples/` (must parse without `error` diagnostics), then regressions from the band's songs.
- **Property tests (fast-check)** for the laws: transposing by +n then −n returns the same chords, +12 is the identity, `parse` never throws on arbitrary text, rewriting a file by 0 semitones returns the same bytes.
- **App:** rendering logic lives in pure functions tested by Vitest. End-to-end smoke tests (Playwright, 390 × 844, light and dark) open the built app, load an example song and fail on console errors; they also save screenshots for a human to compare with [the accepted screens](../design/mvp-v1/README.md). No pixel-diff gate.
- **Before a Saturday build:** `pnpm verify` is green, the smoke tests are green, and the manual checklist is done on a real phone (installed app starts offline, the screen stays awake, the setlist plays through).

## Consequences

- One runner and one command for everything except the browser smoke tests.
- Two development dependencies in the library (`vitest`, `fast-check`); it still has no runtime dependencies.
- The smoke tests are added with the app shell, not before.
- Visual fidelity is checked by eye, so design regressions can slip through between manual checks.

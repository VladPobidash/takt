# 0014. App version numbers and a manual check for updates

- **Status:** accepted
- **Date:** 2026-11-22
- **Decided by:** the author for the two requirements (a classic `v0.x.y` number instead of a commit hash; a button that checks for updates now); the details below by Claude Code under the author's delegation of 2026-11-19 — open to revision.

## Context

Settings showed the build as a commit hash and a date ([ADR 0011](0011-hosting.md)). A band member cannot tell from `9ccb5dd` whether their phone is behind someone else's, and the author cannot say "you need 0.5 for versions of a song". A new build reached a device only when the browser happened to check for it; the one thing a musician could do was restart the app and hope for the "new version is ready" notice ([ADR 0007](0007-platform-pwa.md)).

Several pull requests are now merged in parallel by separate agents, so a version kept by hand must not silently repeat or be forgotten.

| Question | Chosen | Alternative and why not |
| --- | --- | --- |
| Where the number lives | `version` in `apps/web/package.json`, read by the build | Derived from git tags or history: Railway builds without a `.git` folder. A file per change folded into a number: no conflicts, but two merge orders can give one number to two builds |
| Who raises it | The pull request that changes the app, checked by CI | A bot commit after each merge: needs write access to `main` and adds a commit per change |
| How a device checks | `ServiceWorkerRegistration.update()` from a button | A `version.json` fetched and compared: a second source of truth that must be kept out of the precache |

## Decision

- **The app has a version `0.x.y`**, shown in Settings as `Takt v0.5.0 · 2026-11-22` (the date is the day of the build). The commit hash is no longer shown. While the app is in active development the first number stays 0.
- **Every pull request that changes what the app ships raises it**: a feature raises the middle number and sets the last to 0; a fix raises the last number. What the app ships is the sources of `apps/web` and `packages/format`, tests aside. Docs, CI and test-only changes leave the version alone.
- **CI enforces it.** `scripts/check-version.mjs` compares the change with the commit before it (`HEAD^1`: the tip of `main` under a pull request's merge commit, or the previous commit after a push to `main`). A change to the app without a higher version fails, and so does a version that goes down. Two pull requests that raise the version to the same number are caught when the second one updates from `main`, which the workflow already requires before merging; if one slips through, the check on `main` goes red and the next change fixes it forward.
- **It starts at 0.5.0.** Counting back: the MVP of 21 November is 0.1.0; lyrics, the vocal view and versions of a song are 0.2.0–0.4.0; this change is 0.5.0. `@takt/format` keeps its own package version ([ADR 0004](0004-repo-structure-and-tooling.md)), and the format's "v0" stays independent of both.
- **"Check for updates" in Settings** asks the server for a new service worker at once. The answer is one of: a newer version was downloaded and waits ("Update now", exactly the flow of ADR 0007 — nothing is applied without a tap, never on the song or service screens); this is the latest version; the check could not be made (no network). The button exists only in Settings.

## Consequences

- The author and the band can name a build. A deploy can be checked by its number.
- Parallel pull requests meet on one line of `apps/web/package.json`; the later one raises the version again after updating from `main`.
- The number says how many features and fixes were merged, nothing about compatibility; that is all `0.x.y` promises.
- A device that never opens Settings still updates the old way: the browser's own check, then the notice in the library.

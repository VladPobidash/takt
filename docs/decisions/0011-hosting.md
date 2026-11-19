# 0011. Hosting: a static site on Railway

- **Status:** accepted — host chosen by the author on 2026-11-19; configuration to be completed when access is granted
- **Date:** 2026-11-19

## Context

The app is a static build ([ADR 0001](0001-local-first.md), [ADR 0007](0007-platform-pwa.md)). The author has a Railway Hobby subscription and will provide access; GitHub Pages was the free alternative.

## Decision

- The app is hosted on the author's **Railway** account as static files built from `apps/web`.
- `main` is what the band uses: a merge to `main` deploys. Every path is answered with `index.html`; the service worker file and `index.html` are served without long-lived caching, hashed assets with it.
- **No telemetry and no error reporting service.** The app version (commit and date) is shown in Settings so a band member can say which build they have.
- Release rhythm: nothing is deployed on a Saturday before the service or in the week of the worship night, except agreed fixes; the update flow of ADR 0007 keeps a running session untouched in any case.

## Implementation (2026-11-19)

- `apps/web/server.mjs` is a dependency-free Node static server: it serves `apps/web/dist`, answers every app route with `index.html`, compresses text, caches hashed assets forever and revalidates everything else.
- The root `package.json` has `build` and `start` scripts, which is what Railway's builder (Railpack) looks for in a Node project. No Railway config file is committed: `railway.json` (Config as Code) is deprecated, closed to new services and stops working on 2026-12-01.
- The end-to-end tests run against this same server.

## Consequences

- The project, the service and the domain are created on Railway once access exists; the repository needs no further change for that.
- Preview deploys per pull request are not set up for now.

## Sources

- [Railway — Config as Code reference (deprecation notice)](https://docs.railway.com/config-as-code/reference)
- [Railpack — Node and static sites](https://railpack.com/languages/staticfile)

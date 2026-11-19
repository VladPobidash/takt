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

## Consequences

- Deploy configuration (build command, static server, domain) is written once access exists; it adds no application code.
- Preview deploys per pull request are not set up for now.

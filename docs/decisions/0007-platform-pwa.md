# 0007. Platform: an installable PWA, no native wrapper for the MVP

- **Status:** accepted
- **Date:** 2026-11-19
- **Decided by:** Claude Code under the author's delegation of 2026-11-19 ("decide yourself") — open to revision.

## Context

The app must start and play with no network ([ADR 0001](0001-local-first.md)), keep the screen awake on a music stand, and reach the band's phones within days. One developer; no Apple or Google developer accounts; modern devices only ([ADR 0003](0003-ui-kit.md)).

| Option | For | Against |
| --- | --- | --- |
| **PWA only** | One build, one URL, updates without a store; installs from the browser on Android, iOS and desktop | iOS gives web apps fewer guarantees than native apps (storage, background) |
| Capacitor wrapper from the start | Real files, reliable wake lock on any iOS version | App Store / TestFlight setup and review before 12 December; two release channels |
| Tauri (mobile) | Small binaries | Same store overhead; younger on mobile |

Facts checked on 2026-11-19:

- Screen Wake Lock works in iOS Home Screen web apps since iOS 18.4 (it failed there from 16.4 to 18.3).
- Safari's seven-day cap on script-writable storage applies to sites opened in Safari, not to web apps added to the Home Screen; `navigator.storage.persist()` asks for persistent storage and is granted by heuristics that include being a Home Screen app.
- `vite-plugin-pwa` 2.0 supports Vite 8 and generates a Workbox service worker.

## Decision

- **PWA only** until after the worship night. A native wrapper stays an option for later (real files, cloud folders).
- The service worker (`vite-plugin-pwa`, Workbox) **precaches the whole app**: HTML, JavaScript, CSS, the Onest font files, icons. After the first visit the app starts from the cache; nothing on the playing path makes a network request.
- **Updates never interrupt playing.** A new version is downloaded in the background and waits. The app shows "Update available" only on the library and settings screens; it is applied when the user taps it, or on the next cold start. No automatic reload, never on the song or service screens.
- The app asks for persistent storage (`navigator.storage.persist()`) the first time something is saved.
- The screen is kept awake with the Screen Wake Lock API while a song is open. Where it is refused, the app says so and suggests the system setting.
- Recommended minimum for stage use on Apple devices: **iOS / iPadOS 18.4**, installed to the Home Screen.

## Consequences

- No store accounts, no review, the band gets a link.
- On iOS the app must be installed to the Home Screen to be trusted on stage; the app explains this once.
- Browser storage is still not a backup: export stays a first-class feature ([ADR 0008](0008-storage.md)).
- Real file access and cloud folders wait for a wrapper or for the File System Access API on desktop.

## Sources

- [Safari 18.4 release notes — Wake Lock in Home Screen web apps](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes)
- [WebKit bug 254545 — Wake Lock API does not work in PWA (fixed)](https://bugs.webkit.org/show_bug.cgi?id=254545)
- [WebKit — Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
- [MDN — Storage quotas and eviction criteria](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- `vite-plugin-pwa` peer dependencies: npm registry, 2026-11-19.

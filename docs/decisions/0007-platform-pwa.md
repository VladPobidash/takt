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
- **Updates never interrupt playing.** A new version is downloaded in the background and waits. The app shows "Update available" only on the library and settings screens; it is applied when the user taps it, or on the next cold start. No automatic reload, never on the song or service screens. Since [ADR 0014](0014-app-version.md) Settings also has "Check for updates", which asks the server at once; what it finds waits for the same tap.
- The app asks for persistent storage (`navigator.storage.persist()`) the first time something is saved.
- The screen is kept awake with the Screen Wake Lock API while a song is open. Where it is refused, the app says so and suggests the system setting.
- Recommended minimum for stage use on Apple devices: **iOS / iPadOS 18.4**, installed to the Home Screen.

## What real iPhones taught us (2026-11-21)

Found by the author on an installed app on iOS 26:

- **The top of the screen is blurred.** iOS 26 and later draw a progressive blur over the top of a Home Screen web app, for about 40 pt below the status bar; no meta tag or CSS switches it off. The first fix kept a 32 px band free above the header, which cost exactly the height the band's phones lack. Since 2026-11-21 the app instead puts a thin opaque `position: fixed` strip (11 px, full width, the page's background) at the top edge — another project confirmed on an iPhone with iOS 26 that WebKit leaves the blur out when the box at the top edge is fixed, opaque and nearly full width — and starts only 8 px lower, so the strip covers nothing (installed, iOS 26+, not an iPhone in landscape). This rests on that report, not on Apple documentation; a later iOS may change it. iOS versions are told apart by a CSS feature that arrived in Safari 26, because an installed app's user agent does not say.
- **The keyboard does not resize the page on iOS** — only the visual viewport shrinks. The app root is sized and positioned after `window.visualViewport`, so the editor's symbol bar and the bottom sheets stay above the keyboard. Android gets the same result from `interactive-widget=resizes-content`.
- **A fixed height plus a safe-area padding squeezes the content.** Bars at the bottom use `box-content` so the home-indicator inset is added below the controls, and read the inset from `--safe-bottom`, which is zero while the keyboard is open.

All three are covered by tests that emulate the inset and the keyboard in Chromium; the blur itself can only be seen on a device.

Found on 2026-11-22, when the band's first file was shared: **the iOS file picker greys out a file whose extension it does not know.** The import control listed `.takt` and `.taktbundle` in `accept`, so a bundle saved from a messenger could not be chosen. The control has no `accept` now; the app decides by the file's content. A device is the only place this shows.

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
- [qui — keep the top of the iOS Home Screen app clear of the status bar fade](https://github.com/autobrr/qui/pull/4261) and [herdr-web-ui — header clear of iOS 26's edge blur](https://github.com/devswha/herdr-web-ui/pull/106): other projects' reports of the blurred band and its size.
- [WebKit bug 230225 — visual viewport and the virtual keyboard](https://bugs.webkit.org/show_bug.cgi?id=230225); [Safari 26 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes).
- [planestro — fixed edge strip, confirmed on an iPhone](https://github.com/gravesisme/planestro/pull/574).

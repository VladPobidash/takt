# 0003. App stack and UI foundation: React + shadcn/ui (Base UI) + Tailwind CSS v4

- **Status:** accepted
- **Date:** 2026-11-19 (proposed 2026-10-25, revised and accepted in the technical planning session)

## Context

We need an app framework and a component foundation before building the app. Requirements:

- touch-first (phone on a music stand), works as a PWA and later inside a native wrapper;
- strong accessibility and keyboard / pedal support;
- localisation from day one (EN + UA, more later), long labels;
- full visual control — the "Swiss Blocks" design system ([ADR 0002](0002-visual-direction.md)) must not look like a stock library;
- searchable selects (combobox), sheets/drawers, dialogs, tabs, toasts out of the box;
- friendly to AI-assisted development (well-known, well-documented, lots of examples);
- one developer and a hard date (worship night on 2026-12-12): no time to fight the tools.

Device policy, set by the author on 2026-11-19: **modern devices only.** We do not support or test old phones and old browsers. The app is **mobile-first** and must also be comfortable on tablets and desktops.

Options considered (facts checked on 2026-11-19 against npm and the projects' docs):

| Option | For | Against |
| --- | --- | --- |
| **React 19 + shadcn/ui on Base UI + Tailwind v4** | The accepted UI kit board already maps every component to its shadcn/ui counterpart; components are copied into our repo, so we own and restyle them fully; Base UI is stable (1.0 in 2025, 1.9 now) and has been shadcn's default primitive layer since July 2026; has Combobox, Drawer, Dialog, Tabs, toasts; the best-documented stack for AI agents | React + ReactDOM is roughly 45 kB gzip of runtime; Tailwind-centric; we maintain the copied components |
| Preact 11 + `preact/compat`, same kit | Runtime of a few kB; Preact 11 is stable since 2026-09-30 | Base UI declares React 17–19 as its peer dependency, so running it on `preact/compat` is unsupported: any incompatibility is ours to debug before 12 December |
| Svelte 5 + shadcn-svelte (Bits UI) | Smaller runtime, fine-grained reactivity; the kit port is Svelte 5-ready | Smaller ecosystem; the UI kit mapping has to be redone; fewer examples |
| SolidJS 2.0 | Smallest and fastest runtime | 2.0.0 went stable on 2026-11-17 — too young to bet a deadline on; no shadcn/Base UI equivalent of the same maturity |
| React Aria Components | Deepest accessibility and i18n support | More verbose, fewer ready-made styled examples — kept as a per-component fallback |
| Mantine / MUI / Ionic | Batteries included | Strong default look to fight against; heavier |

The runtime-size advantage of Preact, Svelte and Solid matters little here: the device policy excludes slow phones, and an installed PWA starts from the service-worker cache, not from the network.

## Decision

1. **Framework:** React 19 + TypeScript. Current versions: `react` / `react-dom` 19.3.
2. **Components:** shadcn/ui with **Base UI** primitives (`@base-ui/react` 1.9), copied into the app and restyled. Our own music components (`ChordCell`, `BarGrid`, `SectionTile`, `FormTimeline`, `SetlistRow`, `DiffBar`) are built on top, in the same style. If a primitive falls short on i18n or touch, we may use a React Aria hook for that one component.
3. **Styling:** Tailwind CSS v4 (4.3), configured in CSS (`@theme`), no JavaScript config file.
4. **Design tokens:** one CSS file holds every token from the [design system](../design/README.md) as custom properties — UI colours, the ink / tile / bar triple of every section type, radii, sizes. Light values sit on `:root`, dark values on `[data-theme="dark"]`; with no explicit choice the theme follows `prefers-color-scheme`. Tailwind's theme and shadcn's semantic variables both point at these tokens, so there is one source of truth: tokens → CSS variables → Tailwind theme → components.
5. **Font:** Onest is self-hosted and precached, never loaded from Google Fonts at runtime — the playing path must work offline ([ADR 0001](0001-local-first.md)).
6. **Rendering:** the bar grid is plain DOM laid out with CSS grid / flexbox; chord-cell width is proportional to beats. No canvas and no SVG for the grid: chord text stays crisp at any size, follows the theme, can be scaled by a setting and is readable by assistive technology. A song has at most a few hundred bars, which is trivial for the DOM. SVG is used for icons only.
7. **Browser floor:** Safari / iOS 16.4, Chrome 111, Firefox 128 — the floor of Tailwind v4, which matches the default build target of Vite 8 (Baseline Widely Available). No polyfills, no legacy build, no testing below it.
8. **Mobile-first layout:** base styles target a phone (360–430 px); wider layouts are added with min-width breakpoints for tablets and desktops. Layout depends on the available width, never on device detection; touch, mouse and keyboard all work at every width.
9. **JavaScript budget:** the song screen loads at most **150 kB gzip** of JavaScript. This is a guard against accidental bloat (checked in CI once the app exists), not a hard device constraint; raising it is a conscious decision.
10. **React Compiler:** not used in the MVP. Revisit only if profiling shows a real rendering problem.

## Consequences

- Accepting this ADR fixes the app framework (React). The format library stays framework-free and dependency-free.
- The UI kit board on the "Takt — MVP design" canvas remains the mapping from visual components to shadcn/ui components.
- We own the copied component code: upgrades of shadcn/ui are manual, per component.
- Devices below the browser floor (for example iPhone 7 and older, which stopped at iOS 15) may not work, and that is accepted.
- Tablet-specific layout details (which width switches to the sidebar layout, columns in compact mode) are decided with the screens, not here.
- Build tool, package manager, TypeScript settings and linting are decided in the ADR on repository structure and tooling.

## Sources

- [shadcn/ui changelog — Base UI default (July 2026)](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
- [Base UI — About (browser and React support)](https://base-ui.com/react/overview/about)
- [Tailwind CSS — Compatibility](https://tailwindcss.com/docs/compatibility)
- [Vite — Migration from v7 (default build target)](https://vite.dev/guide/migration)
- [React Compiler v1.0](https://react.dev/blog/2025/10/07/react-compiler-1)
- Package versions, release dates and peer dependencies: npm registry, 2026-11-19.

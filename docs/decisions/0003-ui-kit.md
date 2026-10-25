# 0003. UI foundation: React + shadcn/ui (Base UI) + Tailwind CSS

- **Status:** proposed — waiting for the author's acceptance
- **Date:** 2026-10-25

## Context

We need a component foundation before building the app. Requirements:

- touch-first (phone on a music stand), works as a PWA and later inside a native wrapper (Capacitor);
- strong accessibility and keyboard / pedal support;
- localisation from day one (EN + UA, more later), long labels;
- full visual control — the "Swiss Blocks" design system ([ADR 0002](0002-visual-direction.md)) must not look like a stock library;
- searchable selects (combobox), sheets/drawers, dialogs, tabs, toasts out of the box;
- friendly to AI-assisted development (well-known, well-documented, lots of examples).

Options considered (as of October 2026):

| Option | For | Against |
| --- | --- | --- |
| **shadcn/ui on Base UI** + Tailwind | Components are copied into our repo, so we own and restyle them fully; Base UI became shadcn's default primitive layer in July 2026, Radix still supported; has Combobox, Sheet/Drawer, Dialog, Tabs, Sonner toasts; best-known stack for AI agents | Tailwind-centric; we maintain the copied code |
| React Aria Components (Adobe) | Deepest accessibility and i18n support (locale-aware behaviour, RTL, touch interactions) | More verbose, steeper learning curve, fewer ready-made styled examples |
| Ark UI (Zag.js) | Same components for React, Vue, Solid | Smaller ecosystem |
| Mantine / MUI / Ionic | Batteries included | Strong default look to fight against; heavier |

## Decision (proposed)

- **React + TypeScript**, components from **shadcn/ui using Base UI primitives**, styled with **Tailwind CSS** and our design tokens ([docs/design/README.md](../design/README.md)) as CSS variables.
- Our own music components (`ChordCell`, `BarGrid`, `SectionTile`, `FormTimeline`, `SetlistRow`, `DiffBar`) are built on top, in the same style.
- If a primitive falls short on i18n or touch, we may use a React Aria hook for that one component.

## Consequences

- One themable source of truth: design tokens → CSS variables → Tailwind theme → components.
- The UI kit board on the "Takt — MVP design" canvas maps each visual component to its shadcn/ui counterpart.
- Accepting this ADR also fixes the app framework (React); the format library (`packages/format`) stays framework-free.

## Sources

- [shadcn/ui changelog — Base UI default (July 2026)](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
- [Radix UI alternatives (2026)](https://designrevision.com/alternatives/radix-ui)

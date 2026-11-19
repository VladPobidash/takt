# Architecture Decision Records

Every decision that is hard to reverse (storage, format, stack, repo structure) gets its own file: `NNNN-short-name.md`.

Since 2026-11-19 the author has delegated the remaining technical decisions: such an ADR is written, marked accepted with a **Decided by** line, and work continues; the author reviews it afterwards and can reopen it.

Template:

```
# NNNN. Title

- **Status:** proposed | accepted | superseded by NNNN
- **Date:** YYYY-MM-DD

## Context
What forces the decision.

## Decision
What we decided.

## Consequences
What it gives us and what it costs.
```

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-local-first.md) | Local-first, no server-side storage | accepted |
| [0002](0002-visual-direction.md) | Visual direction: "Swiss Blocks" in Onest | accepted |
| [0003](0003-ui-kit.md) | App stack and UI foundation: React + shadcn/ui (Base UI) + Tailwind CSS v4 | accepted |
| [0004](0004-repo-structure-and-tooling.md) | Repository structure and tooling: pnpm monorepo, TypeScript 7, Biome, Vite 8, PR workflow | accepted |
| [0005](0005-format-library.md) | Format library design: two layers, diagnostics, span-based rewriting | accepted |
| [0006](0006-testing.md) | Testing strategy: Vitest, test-first parser, property tests, phone-viewport smoke tests | accepted (delegated) |
| [0007](0007-platform-pwa.md) | Platform: an installable PWA, no native wrapper for the MVP | accepted (delegated) |
| [0008](0008-storage.md) | Storage: `.takt` text in IndexedDB behind an adapter, JSON bundles for exchange | accepted (delegated) |
| [0009](0009-app-state-and-routing.md) | App state, routing and the view-option cascade | accepted (delegated) |
| [0010](0010-localisation.md) | Localisation: typed message tables and `Intl` | accepted (delegated) |
| [0011](0011-hosting.md) | Hosting: a static site on Railway | accepted |
| [0012](0012-timing.md) | Timing: auto-scroll follows a time anchor, section by section | accepted (delegated) |

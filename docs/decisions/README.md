# Architecture Decision Records

Every decision that is hard to reverse (storage, format, stack, repo structure) gets its own file: `NNNN-short-name.md`.

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
| [0004](0004-repo-structure-and-tooling.md) | Repository structure and tooling: pnpm monorepo, TypeScript 7, Biome, Vite 8, PR workflow | proposed |

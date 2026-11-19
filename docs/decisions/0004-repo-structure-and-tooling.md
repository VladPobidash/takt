# 0004. Repository structure and tooling

- **Status:** accepted
- **Date:** 2026-11-19

## Context

[ADR 0003](0003-ui-kit.md) fixed the app stack (React 19, TypeScript, Tailwind v4). Before any code we need to decide where the code lives and which tools build, check and test it.

Forces:

- The `.takt` format is the core of the product. Its parser must stay usable without the app (tests, a future CLI or converter, other people's tools) and must never pick up a UI or browser dependency by accident.
- One developer working with Claude Code in a cloud container (Node 22 and 24 are installed there). Tooling must be boring, fast and nearly configuration-free.
- Hard date: worship night on 2026-12-12. Every tool has to earn its place.

Options considered (versions and peer dependencies checked on npm, 2026-11-19):

| Topic | Chosen | Alternatives and why not |
| --- | --- | --- |
| Layout | Monorepo with `packages/format` + `apps/web` | One package with a `src/format/` folder: simpler, but the boundary is only a convention and is hard to extract later. Two repositories: release overhead for one developer |
| Package manager | pnpm workspaces | npm workspaces: nothing to install, but a flat `node_modules` lets a package import what it never declared. Bun: one more runtime to trust, and the test runner runs on Node anyway |
| Node | 24 LTS | 26 (newest LTS, October 2026): not in the cloud image yet. 22 only: maintenance ends April 2027 |
| TypeScript | 7.0 (native compiler) | 6.x: only needed by tools that use the compiler's JavaScript API, such as typescript-eslint |
| Lint + format | Biome 2 | ESLint 10 + typescript-eslint + Prettier: the largest rule set, but three tools, and typescript-eslint declares `typescript <6.1`, so it cannot run on TypeScript 7.0 today. Oxlint: fastest, but the formatter is a separate tool |
| App build | Vite 8 | No serious alternative for React + Tailwind v4 + a PWA plugin |
| Library build | None for now | Building `packages/format` to `dist/` is needed only to publish it to npm |
| Task runner | pnpm scripts | Turborepo / Nx: caching and orchestration that two packages do not need |

## Decision

### Layout

```
apps/web/            the app (React, Vite) — depends on @takt/format
packages/format/     .takt / .taktset parser, song model, transposition, capo, serializer
docs/                unchanged
examples/            sample .takt files, also used as parser fixtures
package.json         root scripts, packageManager, engines
pnpm-workspace.yaml
biome.json
tsconfig.base.json
.github/workflows/ci.yml
```

- `packages/format` has **zero runtime dependencies** and uses no DOM or Node APIs, so it runs anywhere JavaScript runs. Development dependencies (TypeScript, test runner) are allowed.
- `apps/web` may import `@takt/format`; `packages/format` never imports from the app.
- The package is named `@takt/format` and stays `private` until it is published. The name follows the product name, which is still a working name.

### Tools

- **pnpm 12** workspaces. The exact version is pinned in the root `packageManager` field; installs use the lockfile (`--frozen-lockfile` in CI).
- **Node 24 LTS** in CI and in `.node-version`; `engines` is `>=22.12` (the floor of Vite 8 and Vitest 5), so the cloud container's default Node also works.
- **TypeScript 7.0**, one `tsconfig.base.json` extended by both packages: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly` (no enums or namespaces, so any tool can transpile a file on its own). ES modules only. If a tool we need turns out to require the old compiler API, we fall back to TypeScript 6 and record it here.
- **Biome 2** for linting and formatting, one `biome.json` at the root, recommended rules plus the React hooks and accessibility rules. No ESLint, no Prettier.
- **Vite 8** builds and serves `apps/web`, with the default build target ([ADR 0003](0003-ui-kit.md), browser floor).
- **No build step for `packages/format`:** the app imports its TypeScript sources through the workspace; `tsc --noEmit` type-checks it. A real build is added when the package is published.
- Root scripts are the single entry point: `pnpm check` (Biome), `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm verify`, which runs all four — the same thing CI runs.

The test runner and the testing strategy are decided in a separate ADR.

### CI (GitHub Actions)

One workflow on every pull request and every push to `main`: install → `pnpm check` → `pnpm typecheck` → `pnpm test` → `pnpm build`. Added later, each when its subject exists: EN/UA message-key parity, the JavaScript budget from ADR 0003, a phone-viewport smoke test. Deployment is a separate decision.

### Workflow

- `main` is always in a working state. Work happens on short-lived branches and reaches `main` only through a **pull request** with green CI, squash-merged.
- Work is tracked in **GitHub issues**; a pull request names the issue it closes (`Closes #N`). One issue per pull request where practical.
- Since 2026-11-19 the author lets Claude Code squash-merge its own pull requests once CI is green, without a review of each one.
- Commit messages: plain imperative English, no prefix convention.
- A new runtime dependency in `apps/web` is named and justified in the pull request description. `packages/format` gets none.
- Versioning: `@takt/format` is `0.x` and is not published to npm before the worship night. The format's own version ("v0") lives in [format.md](../format.md) and is independent of the package version.
- Dependency updates are manual until after 12 December — no update bot.

## Consequences

- The dependency-free rule for the format library is enforced by pnpm's strict `node_modules`, not by discipline.
- One command (`pnpm verify`) answers "is it safe to merge?" locally and in CI.
- TypeScript 7 and Biome are a pair: choosing ESLint later means going back to TypeScript 6 until typescript-eslint supports the new compiler.
- Biome has fewer rules than the ESLint ecosystem; we accept that for one config and one tool.
- Without a library build, the first npm release of `@takt/format` needs a small follow-up (build + `exports`).
- Scaffolding the repository according to this ADR is the first code change; it adds development dependencies only.

## Sources

- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [Vite — Migration from v7](https://vite.dev/guide/migration)
- [Node.js — Evolving the release schedule](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule)
- Package versions, engines and peer dependencies (`pnpm` 12, `vite` 8.3, `vitest` 5.1, `@biomejs/biome` 2.6, `typescript` 7.0, `typescript-eslint` peer range): npm registry, 2026-11-19.

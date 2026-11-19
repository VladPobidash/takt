# 0010. Localisation: typed message tables and `Intl`

- **Status:** accepted
- **Date:** 2026-11-19
- **Decided by:** Claude Code under the author's delegation of 2026-11-19 ("decide yourself") — open to revision.

## Context

English by default, Ukrainian from day one ([ADR 0002](0002-visual-direction.md)); Ukrainian needs the one / few / many plural forms. Song content is never translated. Parser diagnostics arrive as codes with data ([ADR 0005](0005-format-library.md)).

| Option | For | Against |
| --- | --- | --- |
| **Own module: typed tables + `Intl.PluralRules`** | No dependency, a few dozen lines; TypeScript fails the build when a key is missing in a language | No translator tooling (not needed for two languages maintained by the author) |
| i18next + react-i18next | Standard, rich | Roughly 20 kB for features we do not use; key parity needs an extra check |
| Lingui / FormatJS (ICU, compile step) | Best message syntax, extraction | A compiler plugin in the build chain — one more thing that can break before 12 December |

## Decision

- Messages live in `apps/web/src/i18n/` as TypeScript objects: `en.ts` is the source of keys, `uk.ts` must satisfy the same type. A missing or extra key is a type error, so **`pnpm typecheck` is the parity check in CI**.
- `t(key, params?)` interpolates `{name}` placeholders. Plural messages are objects keyed by `Intl.PluralRules` categories (`one`, `few`, `many`, `other`) and take a `count`.
- Dates and numbers are formatted with `Intl.DateTimeFormat` / `Intl.NumberFormat` in the UI language.
- Language: the saved setting, else Ukrainian when the browser's preferred languages start with `uk`, else English. Language codes follow BCP 47 (`en`, `uk`).
- Diagnostics are translated by code: `diagnostic.bar-too-long` → "This bar has {beats} beats in {expected}".
- Only UI strings pass through `t()`. Titles, section names, tags, notes and lyrics are rendered as written.
- Note naming (H/B) is a separate setting; its first-run default is H for a Ukrainian UI and B otherwise.

## Consequences

- No i18n dependency and no build plugin.
- Adding a language is one file that the compiler checks.
- No ICU features such as select or nested plurals; if they become necessary, the tables can be fed to a library later.

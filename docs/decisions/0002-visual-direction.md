# 0002. Visual direction: "Swiss Blocks" in Onest

- **Status:** accepted
- **Date:** 2026-10-25

## Context

Takt is used on stage from a music stand by amateur, creative musicians. A first prototype in a technical, IT-style look (IBM Plex, dark dashboard) felt wrong for that audience. Five directions were compared on the same content: Warm Stage, Paper Chart, Color Pop, Expressive (Material-3-like) and Swiss Blocks. Color Pop's idea — each section as a coloured tile — won, but its pill-shaped controls felt dated.

## Decision

- Visual direction: **Swiss Blocks** — flat, editorial, high-contrast UI; colour only for song structure (section tiles); small radii (4–8 px), no pill buttons; underline tabs; proportional form timeline.
- Typeface: **Onest** everywhere (full Cyrillic support). Other families may be added later only with a reason.
- Light and dark themes are both first-class; default follows the system.
- UI language: English by default, Ukrainian from day one.
- Details and tokens: [docs/design/README.md](../design/README.md).

## Consequences

- One font family keeps bundle size and visual noise low.
- Section colours must stay consistent across every screen and song.
- All components must handle long labels (wrap or ellipsis) from the start.

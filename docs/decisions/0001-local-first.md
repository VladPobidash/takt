# 0001. Local-first, no server-side storage

- **Status:** accepted
- **Date:** 2026-10-24

## Context

Musicians want their arrangements on all their devices and offline on stage. A service with its own song library means server costs, responsibility for backups, and copyright exposure for lyrics and charts.

## Decision

- User data lives on the user's device in an open plain-text format (`.takt`).
- The app has no song library of its own and does not store user files on our servers.
- Sync (later) goes through the user's own cloud (Google Drive, OneDrive, iCloud, Dropbox) or system file providers.
- The only acceptable server is one that stores nothing (e.g. device discovery for a live session).

## Consequences

- Hosting is a static site; costs are close to zero.
- Reliable file export/import is required already in the MVP.
- On iOS, browser storage is unreliable → a native wrapper eventually.
- Sync conflicts are handled by file structure (split by owner), not by a server.

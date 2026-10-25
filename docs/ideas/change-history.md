# Idea: change history and review ("git for charts")

- **Status:** idea for after the 12 December worship night — not in the MVP
- **Raised:** 2026-10-25

## Why

A band edits the same arrangement over weeks: the bassist adds a passing chord, the keys player rewrites the intro, the leader moves the bridge. Today nobody knows who changed what, when, or why — and a wrong edit before a service is hard to undo. Developers solve this with git and code review; musicians deserve the same, without the jargon.

## What people get

1. **History per song.** Every saved edit becomes a *change*: who, when, what (bar-level diff), optional message. Readable as a timeline: "Andriy · Tue 20:14 · Verse 1, bar 3: `D/F#` → `Dsus4/F#`".
2. **Restore and compare.** Open any earlier version, compare two versions, restore one (restoring is itself a new change — nothing is lost).
3. **"Who changed this bar?"** Tap a bar → see its last change and author (like `git blame`).
4. **Suggestions and review.** A member can *suggest* a change instead of editing directly (like a pull request). The song's arranger sees "1 suggestion", reviews a bar-level diff, comments, accepts or rejects.
5. **Rehearsal snapshot.** Mark a version as "played on 31 Oct" (like a git tag) to return to exactly what was played.

## How it can work local-first (no server storage)

Fits [ADR 0001](../decisions/0001-local-first.md): history lives next to the song, in the user's own folder/cloud.

```
dostoinyi/
  song.takt                      ← current version (what everyone plays)
  .history/
    vlad@iphone.jsonl            ← append-only log, written only by this device
    andriy@pixel.jsonl
  .suggestions/
    2026-10-28-andriy-bass.takt.patch
```

- **One log file per author-device, append-only.** Each device writes only its own file, so cloud-drive sync never produces conflicting writes. The full history = all logs merged and sorted by time.
- **A change record** (one JSON line): `id`, `parent` (previous version hash), `author` (display name + device key), `time`, `message`, `ops` (bar-level operations: replace bar, insert line, change meta…).
- **Identity without accounts.** A display name chosen in Settings plus a per-device key pair; changes can be signed so authorship can't be spoofed by editing a file.
- **Concurrent edits.** Two changes made from the same parent touching *different* bars merge automatically; touching the *same* bar → shown as a conflict for the arranger to pick (same UX as review).
- **Alternatives to evaluate:** a CRDT (Automerge / Yjs) persisted to files; or real git (e.g. isomorphic-git) inside the shared folder — but syncing `.git` internals through a cloud drive is fragile.

## UX principles

- No git words in the UI: "changes", "suggestions", "restore", "compare" — not commit / PR / merge / rebase.
- Diffs are musical: show bars side by side, removed vs added, with `−` / `+` markers (never colour alone).
- Default for small bands: everyone edits directly, history protects you. Suggestions mode is opt-in per song or per setlist.

## Open questions

- [ ] Who is the "arranger" of a song, and can it change hands?
- [ ] Do personal notes get history too, or only shared content?
- [ ] How long to keep history; compacting old logs.
- [ ] Clock skew between devices (use parent hashes, not only timestamps).
- [ ] How suggestions travel when there is no sync yet (share a `.patch` file in a messenger?).

Design sketch: "Takt — MVP design" canvas, boards **8 · History** and **9 · Review a suggestion**.

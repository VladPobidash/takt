#!/usr/bin/env node
// Checks that a change to the app raises its version (ADR 0014).
//
//   node scripts/check-version.mjs [base]
//
// `base` is the commit the change is compared with: `HEAD^1` in CI (the tip of `main` under a
// pull request's merge commit, or the commit before a push to `main`), `origin/main` by default.
// A change to what the app ships — the sources of `apps/web` or `packages/format`, tests aside —
// must come with a higher `version` in `apps/web/package.json`: a feature raises the middle
// number and sets the last to 0, a fix raises the last number.
import { execFileSync } from "node:child_process";

const VERSION_FILE = "apps/web/package.json";
const base = process.argv[2] ?? "origin/main";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

/** `0.5.1` → [0, 5, 1]; null for anything that is not three plain numbers. */
function parseVersion(text) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text ?? "");
  return match ? match.slice(1).map(Number) : null;
}

function versionAt(ref) {
  try {
    return JSON.parse(git("show", `${ref}:${VERSION_FILE}`)).version;
  } catch {
    return null;
  }
}

/** True for a file that changes what a musician gets. */
function shipped(file) {
  if (/\.test\.tsx?$/.test(file)) return false;
  if (file.startsWith("packages/format/src/")) return true;
  if (!file.startsWith("apps/web/")) return false;
  return !file.startsWith("apps/web/e2e/") && file !== "apps/web/playwright.config.ts";
}

let changed;
try {
  changed = git("diff", "--name-only", base, "HEAD").split("\n").filter(Boolean);
} catch {
  console.error(`check-version: cannot compare with "${base}". Fetch it first.`);
  process.exit(1);
}

const before = versionAt(base);
const after = versionAt("HEAD");
const now = parseVersion(after);
if (!now) {
  console.error(`check-version: "${after}" in ${VERSION_FILE} is not a version like 0.5.1.`);
  process.exit(1);
}

const was = parseVersion(before) ?? [0, 0, 0];
const order = now.findIndex((part, index) => part !== was[index]);
const higher = order !== -1 && now[order] > was[order];
const touched = changed.filter((file) => shipped(file) && file !== VERSION_FILE);

if (after !== before && !higher) {
  console.error(
    `check-version: the version went from ${before} to ${after}. It may only go up. ` +
      `If "${base}" moved, update your branch from it and raise the version again.`,
  );
  process.exit(1);
}
if (touched.length > 0 && !higher) {
  console.error(
    `check-version: this change touches the app but ${VERSION_FILE} still says ${after}.\n` +
      "Raise the version: a feature → 0.(x+1).0, a fix → 0.x.(y+1). " +
      `If "${base}" already has ${after}, update your branch from it first.\n` +
      `Changed: ${touched.slice(0, 8).join(", ")}${touched.length > 8 ? ", …" : ""}`,
  );
  process.exit(1);
}
console.log(
  higher
    ? `check-version: ${before ?? "no version"} → ${after}.`
    : `check-version: nothing the app ships has changed; the version stays ${after}.`,
);

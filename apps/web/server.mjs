// Serves the built app (apps/web/dist) as a static site: ADR 0011.
// No dependencies, so it runs anywhere Node runs — `node apps/web/server.mjs`, port from $PORT.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("./dist/", import.meta.url));
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".svg", ".txt"]);

/** Files are few and small: each is read and compressed once, then kept in memory. */
const cache = new Map();

async function load(path) {
  if (cache.has(path)) return cache.get(path);
  let entry = null;
  try {
    const body = await readFile(path);
    const ext = extname(path);
    entry = { body, type: TYPES[ext] ?? "application/octet-stream" };
    if (COMPRESSIBLE.has(ext)) {
      entry.br = brotliCompressSync(body);
      entry.gzip = gzipSync(body);
    }
  } catch {
    // Missing or unreadable: remembered as "not there".
  }
  cache.set(path, entry);
  return entry;
}

function resolve(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const path = normalize(join(ROOT, decoded));
  return path.startsWith(ROOT) && !path.endsWith(sep) ? path : null;
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const path = resolve(pathname);
  let entry = path ? await load(path) : null;
  let hashed = pathname.startsWith("/assets/");
  if (!entry) {
    // A missing asset is a real 404; any other path is a route of the app.
    if (hashed || extname(pathname) !== "") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }
    entry = await load(join(ROOT, "index.html"));
    hashed = false;
    if (!entry) {
      response
        .writeHead(503, { "Content-Type": "text/plain; charset=utf-8" })
        .end("The app is not built");
      return;
    }
  }
  const accepts = String(request.headers["accept-encoding"] ?? "");
  const encoding =
    entry.br && /\bbr\b/.test(accepts)
      ? "br"
      : entry.gzip && /\bgzip\b/.test(accepts)
        ? "gzip"
        : null;
  const body = encoding === "br" ? entry.br : encoding === "gzip" ? entry.gzip : entry.body;
  const headers = {
    "Content-Type": entry.type,
    "Content-Length": body.length,
    // Hashed assets never change; everything else (index.html, sw.js, the manifest) is
    // revalidated so a new version is noticed — the service worker decides when to apply it.
    "Cache-Control": hashed ? "public, max-age=31536000, immutable" : "no-cache",
    "X-Content-Type-Options": "nosniff",
    Vary: "Accept-Encoding",
  };
  if (encoding) headers["Content-Encoding"] = encoding;
  response.writeHead(200, headers).end(request.method === "HEAD" ? undefined : body);
});

server.listen(PORT, () => {
  console.log(`Takt is served on port ${PORT}`);
});

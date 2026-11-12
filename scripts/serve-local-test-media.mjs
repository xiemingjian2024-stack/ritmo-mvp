import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

// Separate loopback-only server: files remain outside Vite public/ and dist/.
const port = Number(process.env.RITMO_LOCAL_MEDIA_PORT ?? 4184);
const allowed = new Set([
  "0025-EIeI8Vf.mp4", "0861-fUBheHs.mp4", "0310-3eGE2JC.mp4",
  "0298-Qyk5J3p.mp4", "1760-yn8yg1r.mp4",
]);
const loopback = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

createServer((req, res) => {
  if (!loopback.has(req.socket.remoteAddress ?? "") || !["GET", "HEAD"].includes(req.method ?? "")) {
    res.writeHead(403).end(); return;
  }
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
    res.writeHead(403).end(); return;
  }
  const filename = (req.url ?? "").split("?")[0].replace(/^\//, "");
  if (!allowed.has(filename)) { res.writeHead(404).end(); return; }
  try {
    const path = resolve(process.cwd(), ".local-media", "derived", filename);
    const size = statSync(path).size;
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || end < start) { res.writeHead(416).end(); return; }
    const bytes = readFileSync(path).subarray(start, end + 1);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Length", bytes.length);
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    if (range) { res.statusCode = 206; res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`); }
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch { res.writeHead(404).end(); }
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Private RITMO media preview on http://127.0.0.1:${port}\n`);
});

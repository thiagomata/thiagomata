// Serves the site locally without browser caching, so every reload runs the current files.
// Usage: npm run serve   (or: node tools/serve.js [port])
//
// The browser tests serve the site through the same server, on a free port.
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_PORT = 8765;
const TYPES = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".md": "text/markdown; charset=utf-8",
    ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".wml": "text/vnd.wap.wml",
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
    ".gif": "image/gif", ".ico": "image/x-icon", ".pdf": "application/pdf", ".mp3": "audio/mpeg",
    ".woff": "font/woff", ".woff2": "font/woff2",
};

const kind = path => { try { return statSync(path); } catch { return null; } };

/** A server for the files under root: a folder serves its index.html, like GitHub Pages. */
export function siteServer(root = SITE_ROOT) {
    return createServer((request, response) => {
        const { pathname } = new URL(request.url, "http://localhost");
        let file;
        try {
            file = join(root, normalize(decodeURIComponent(pathname)));
        } catch {
            response.writeHead(400).end("Bad request");
            return;
        }
        if (file !== root.replace(/[\\/]$/, "") && !file.startsWith(root)) {
            response.writeHead(403).end();
            return;
        }
        if (kind(file)?.isDirectory()) {
            if (!pathname.endsWith("/")) {
                response.writeHead(301, { Location: `${pathname}/` }).end();
                return;
            }
            file = join(file, "index.html");
        }
        if (!kind(file)?.isFile()) {
            response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
            return;
        }
        response.writeHead(200, {
            "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
            // modules loaded on demand are cached even through a hard reload; never cache here
            "Cache-Control": "no-store",
        });
        createReadStream(file).on("error", () => response.destroy()).pipe(response);
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const port = Number(process.argv[2]) || DEFAULT_PORT;
    siteServer().listen(port, "127.0.0.1", () => {
        console.log(`Serving ${SITE_ROOT.replace(new RegExp(`\\${sep}$`), "")} at http://127.0.0.1:${port}/ (no caching)`);
    });
}

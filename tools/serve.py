"""Serves the site locally without browser caching, so every reload runs the current files.

Usage: npm run serve  (or: python3 tools/serve.py [port])
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DEFAULT_PORT = 8765
SITE_ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Modules loaded on demand are cached even through a hard reload; never cache them here.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    handler = partial(NoCacheHandler, directory=str(SITE_ROOT))
    print(f"Serving {SITE_ROOT} at http://127.0.0.1:{port}/ (no caching)")
    ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()

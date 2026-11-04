// Stamps the page's own scripts and styles with a hash of their contents (./js/scene.js?v=1a2b3c4d),
// so a browser never mixes a cached old file with a new one after the site changes. Modules that
// other modules import are stamped through the page's import map, with the same hashes.
//
// Usage: npm run stamp   (rewrites index.html; test/version-assets.test.js fails until it is run)
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const PAGE = "index.html";
/** The folders of the site's own files, and the kind of file stamped in each. */
const ASSET_FOLDERS = [["js", ".js"], ["style", ".css"]];
/** Enough of the hash to tell versions apart. */
const VERSION_LENGTH = 8;
/** The import map sits this deep in the page's indentation. */
const IMPORT_MAP_INDENT = " ".repeat(8);
const JSON_INDENT = 4;

const IMPORT_MAP = /(<script type="importmap">\s*)([\s\S]*?)(\s*<\/script>)/;
const ASSET_REFERENCE = /(src|href)="(\.\/(?:js|style)\/[^"?]+)(?:\?v=[0-9a-f]+)?"/g;

/** A short hash of a file's contents: it changes whenever the file does. */
export const contentVersion = contents => createHash("sha256").update(contents).digest("hex").slice(0, VERSION_LENGTH);

/** The site's own scripts and styles, as page-relative paths ("./js/scene.js") with their versions. */
export function assetVersions(root = SITE_ROOT) {
    const versions = new Map();
    for (const [folder, extension] of ASSET_FOLDERS) {
        for (const file of readdirSync(join(root, folder), { recursive: true })) {
            if (!file.endsWith(extension)) continue;
            const path = join(root, folder, file);
            versions.set(`./${relative(root, path).split("\\").join("/")}`, contentVersion(readFileSync(path)));
        }
    }
    return versions;
}

/**
 * The page with each of its scripts and styles stamped with its version, and the import map
 * stamping every module (so imports between modules get the new versions too).
 */
export function stampPage(html, versions) {
    const stamp = path => (versions.has(path) ? `${path}?v=${versions.get(path)}` : path);
    const stamped = html.replace(ASSET_REFERENCE, (_, attribute, path) => `${attribute}="${stamp(path)}"`);
    return stamped.replace(IMPORT_MAP, (_, opening, json, closing) => {
        const importMap = JSON.parse(json);
        const elsewhere = Object.entries(importMap.imports).filter(([name]) => !name.startsWith("./"));
        const modules = [...versions.keys()].filter(path => path.endsWith(".js")).sort().map(path => [path, stamp(path)]);
        importMap.imports = Object.fromEntries([...elsewhere, ...modules]);
        const indented = JSON.stringify(importMap, null, JSON_INDENT).split("\n").join(`\n${IMPORT_MAP_INDENT}`);
        return `${opening}${indented}${closing}`;
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const pagePath = join(SITE_ROOT, PAGE);
    writeFileSync(pagePath, stampPage(readFileSync(pagePath, "utf8"), assetVersions()));
    console.log(`Stamped ${PAGE}`);
}

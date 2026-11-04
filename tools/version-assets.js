// Stamps the site's files with a hash of their contents (./js/scene.js?v=1a2b3c4d), so a browser
// never mixes a cached old file with a new one after the site changes:
//   - the styles' pictures, in each style (url("../img/bridge/water.svg?v=…"));
//   - the page's scripts, styles and pictures, in index.html;
//   - the modules other modules import, through the page's import map.
// The styles are stamped first, so the page gets their stamped versions.
//
// Usage: npm run stamp   (test/version-assets.test.js fails until it is run)
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const PAGE = "index.html";
const STYLES = "style";
/** The folders of the site's own files, and the kinds of file stamped in each. */
const ASSET_FOLDERS = [["js", [".js"]], [STYLES, [".css"]], ["img", [".svg", ".webp", ".jpg", ".png"]]];
/** Enough of the hash to tell versions apart. */
const VERSION_LENGTH = 8;
/** The import map sits this deep in the page's indentation. */
const IMPORT_MAP_INDENT = " ".repeat(8);
const JSON_INDENT = 4;

const IMPORT_MAP = /(<script type="importmap">\s*)([\s\S]*?)(\s*<\/script>)/;
const PAGE_REFERENCE = /(src|href)="(\.\/(?:js|style|img)\/[^"?]+)(?:\?v=[0-9a-f]+)?"/g;
/** A picture in a style, relative to the styles' folder. */
const STYLE_REFERENCE = /url\("\.\.\/(img\/[^"?]+)(?:\?v=[0-9a-f]+)?"\)/g;

/** A short hash of a file's contents: it changes whenever the file does. */
export const contentVersion = contents => createHash("sha256").update(contents).digest("hex").slice(0, VERSION_LENGTH);

/** The site's own files, as page-relative paths ("./js/scene.js") with their versions. */
export function assetVersions(root = SITE_ROOT) {
    const versions = new Map();
    for (const [folder, extensions] of ASSET_FOLDERS) {
        for (const file of readdirSync(join(root, folder), { recursive: true })) {
            if (!extensions.some(extension => file.endsWith(extension))) continue;
            const path = join(root, folder, file);
            versions.set(`./${relative(root, path).split("\\").join("/")}`, contentVersion(readFileSync(path)));
        }
    }
    return versions;
}

const stamper = versions => path => (versions.has(path) ? `${path}?v=${versions.get(path)}` : path);

/** A style with each of its pictures stamped with its version. */
export function stampStyle(css, versions) {
    const stamp = stamper(versions);
    return css.replace(STYLE_REFERENCE, (_, path) => `url("../${stamp(`./${path}`).slice("./".length)}")`);
}

/**
 * The page with each of its scripts, styles and pictures stamped with its version, and the import
 * map stamping every module (so imports between modules get the new versions too).
 */
export function stampPage(html, versions) {
    const stamp = stamper(versions);
    const stamped = html.replace(PAGE_REFERENCE, (_, attribute, path) => `${attribute}="${stamp(path)}"`);
    return stamped.replace(IMPORT_MAP, (_, opening, json, closing) => {
        const importMap = JSON.parse(json);
        const elsewhere = Object.entries(importMap.imports).filter(([name]) => !name.startsWith("./"));
        const modules = [...versions.keys()].filter(path => path.endsWith(".js")).sort().map(path => [path, stamp(path)]);
        importMap.imports = Object.fromEntries([...elsewhere, ...modules]);
        const indented = JSON.stringify(importMap, null, JSON_INDENT).split("\n").join(`\n${IMPORT_MAP_INDENT}`);
        return `${opening}${indented}${closing}`;
    });
}

/** The styles' files, as paths from the site's root. */
export const styleFiles = (root = SITE_ROOT) =>
    readdirSync(join(root, STYLES)).filter(file => file.endsWith(".css")).map(file => join(STYLES, file));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    for (const style of styleFiles()) {
        const path = join(SITE_ROOT, style);
        writeFileSync(path, stampStyle(readFileSync(path, "utf8"), assetVersions()));
    }
    const pagePath = join(SITE_ROOT, PAGE);
    writeFileSync(pagePath, stampPage(readFileSync(pagePath, "utf8"), assetVersions()));
    console.log(`Stamped ${PAGE} and ${styleFiles().length} styles`);
}

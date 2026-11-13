// Renders the site's icons from img/favicon.svg: favicon.ico (16, 32 and 48 px, for browsers that
// only look for /favicon.ico) and apple-touch-icon.png (180 px on white, for iPhone and iPad home
// screens, which turn transparent corners black). Usage: node tools/icons.js
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const at = path => fileURLToPath(new URL(`../${path}`, import.meta.url));
const svg = "data:image/svg+xml;base64," + readFileSync(at("img/favicon.svg")).toString("base64");

const browser = await chromium.launch();

/** The icon as a PNG of `size` px, `padding` px in from each edge, on `background` (none: transparent). */
async function render(size, { padding = 0, background = "transparent" } = {}) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<body style="margin:0;background:${background}"><img src="${svg}" style="display:block;margin:${padding}px;width:${size - 2 * padding}px;height:${size - 2 * padding}px"></body>`);
    await page.locator("img").evaluate(img => img.decode());
    const png = await page.screenshot({ omitBackground: background === "transparent" });
    await page.close();
    return png;
}

/** An .ico file holding each PNG as it is: a 6-byte header, a 16-byte entry per image, then the images. */
function ico(images) {
    const header = Buffer.alloc(6 + 16 * images.length);
    header.writeUInt16LE(1, 2);                     // type: icon
    header.writeUInt16LE(images.length, 4);
    let offset = header.length;
    images.forEach(({ size, png }, index) => {
        const entry = 6 + 16 * index;
        header.writeUInt8(size % 256, entry);       // 256 is written as 0
        header.writeUInt8(size % 256, entry + 1);
        header.writeUInt16LE(1, entry + 4);         // colour planes
        header.writeUInt16LE(32, entry + 6);        // bits per pixel
        header.writeUInt32LE(png.length, entry + 8);
        header.writeUInt32LE(offset, entry + 12);
        offset += png.length;
    });
    return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

const sizes = [16, 32, 48];
writeFileSync(at("favicon.ico"), ico(await Promise.all(sizes.map(async size => ({ size, png: await render(size) })))));
writeFileSync(at("apple-touch-icon.png"), await render(180, { padding: 14, background: "white" }));
await browser.close();
console.log("Wrote favicon.ico and apple-touch-icon.png");

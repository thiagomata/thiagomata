// Measures how readable the Elegant card's text is over its live scene, and how much of the scene
// still shows, for each variant in lab/elegant-contrast/variants.js. It opens the real page in
// headless Chrome at desktop and phone sizes, and at a few moments (the northern lights move):
//
//   - text contrast: the page is photographed with its text hidden (shadows and layers stay), and
//     each line of text is compared with the pixels behind it (tools/contrast.js);
//   - scene kept: the scene's detail around the text, with the variant's layer, compared with no
//     layer at all.
//
// The results go to lab/elegant-contrast/results.json, which the lab shows under each variant.
//
// Usage: npm run contrast
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { VARIANTS } from "../lab/elegant-contrast/variants.js";

const SITE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const RESULTS = join(SITE_ROOT, "lab/elegant-contrast/results.json");
const CARD = "#values section.value-elegant";
const SIZES = {
    desktop: { width: 1440, height: 900 },
    phone: { width: 393, height: 852 },
};
/** Photograph the card this many times, this far apart, as the lights move. */
const MOMENTS = 3;
const MOMENT_MILLISECONDS = 2000;
/** Give the live scene this long to start, and its pictures to load. */
const LIVE_TIMEOUT_MILLISECONDS = 30000;
const SETTLE_MILLISECONDS = 1500;
/** Leave this much around the text out of the scene's detail (its shadow and halo). */
const TEXT_MARGIN = 12;
/** Read every second pixel: plenty for averages, and twice as fast. */
const PIXEL_STEP = 2;
const DECIMALS = 2;
/** Software WebGL, so the scene draws in headless Chrome without a graphics card. */
const BROWSER_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];

const CONTENT_TYPES = {
    ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
    ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg",
};

/** Serves the site's files, as GitHub Pages would. */
function serveSite() {
    const server = createServer(async (request, response) => {
        const path = normalize(decodeURIComponent(new URL(request.url, "http://site").pathname)).replace(/^([/\\])+/, "");
        try {
            const body = await readFile(join(SITE_ROOT, path || "index.html"));
            response.writeHead(200, { "Content-Type": CONTENT_TYPES[extname(path)] ?? "application/octet-stream" });
            response.end(body);
        } catch {
            response.writeHead(404).end();
        }
    });
    return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

/** Each line of the card's text: its boxes on screen, its colour, and the ratio it needs. */
const readText = page => page.evaluate(selector => {
    const lines = [];
    const walker = document.createTreeWalker(document.querySelector(selector), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent.trim();
        if (!text) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = [...range.getClientRects()].map(({ left, top, width, height }) => ({ left, top, width, height }));
        const style = getComputedStyle(node.parentElement);
        lines.push({ text, rects, colour: style.color, fontSize: parseFloat(style.fontSize), fontWeight: Number(style.fontWeight) });
    }
    const { left, top, width, height } = document.querySelector(selector).getBoundingClientRect();
    return { lines, card: { left, top, width, height } };
}, CARD);

/** Photographs the page with the card's text hidden; `withLayer` false also takes the variant and the layer away. */
async function photograph(page, variantStyle, withLayer) {
    const hidden = await page.addStyleTag({ content: `${CARD} * { color: transparent !important; }` });
    const noLayer = withLayer ? null : await page.addStyleTag({
        content: `${CARD}, ${CARD}::after { border-image: none !important; }`,
    });
    if (!withLayer) await variantStyle.evaluate(style => { style.disabled = true; });
    const shot = (await page.screenshot()).toString("base64");
    if (!withLayer) await variantStyle.evaluate(style => { style.disabled = false; });
    await noLayer?.evaluate(style => style.remove());
    await hidden.evaluate(style => style.remove());
    return shot;
}

/** Reads the photographs' pixels in the page, with tools/contrast.js. */
const analyse = (page, measurement) => page.evaluate(async ({ withLayer, withoutLayer, lines, card, margin, step }) => {
    const { detail, parseColour, relativeLuminance, requiredRatio, textContrast } = await import("/tools/contrast.js");
    const pixels = async base64 => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
    };
    const [shown, bare] = [await pixels(withLayer), await pixels(withoutLayer)];
    const textRects = lines.flatMap(line => line.rects).map(rect => ({
        left: rect.left - margin, top: rect.top - margin, width: rect.width + 2 * margin, height: rect.height + 2 * margin,
    }));
    return {
        lines: lines.map(line => ({
            text: line.text,
            contrast: textContrast(shown, line.rects, relativeLuminance(parseColour(line.colour)), 1),
            required: requiredRatio(line.fontSize, line.fontWeight),
        })),
        sceneKept: detail(shown, card, textRects, step) / (detail(bare, card, textRects, step) || 1),
    };
}, measurement);

/** One variant at one size: the worst line of text over every moment, and the share of the scene kept. */
async function measure(browser, origin, variant, size) {
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
    await page.goto(`${origin}/index.html`);
    // A comment for the variant with no CSS: an empty style is refused.
    const variantStyle = await page.addStyleTag({ content: variant.css(CARD) || `/* ${variant.id} */` });
    await page.evaluate(selector => {
        document.documentElement.style.scrollBehavior = "auto";
        document.querySelector(selector).scrollIntoView({ block: "center" });
    }, CARD);
    await page.waitForSelector(`${CARD}.windmills-live`, { timeout: LIVE_TIMEOUT_MILLISECONDS });
    await page.waitForTimeout(SETTLE_MILLISECONDS);

    const worst = new Map(), kept = [];
    for (let moment = 0; moment < MOMENTS; moment++) {
        if (moment) await page.waitForTimeout(MOMENT_MILLISECONDS);
        const { lines, card } = await readText(page);
        const withLayer = await photograph(page, variantStyle, true);
        const withoutLayer = await photograph(page, variantStyle, false);
        const result = await analyse(page, { withLayer, withoutLayer, lines, card, margin: TEXT_MARGIN, step: PIXEL_STEP });
        kept.push(result.sceneKept);
        for (const line of result.lines) {
            if (line.contrast === null) continue;
            const before = worst.get(line.text);
            if (!before || line.contrast < before.contrast) worst.set(line.text, line);
        }
    }
    await page.close();

    const lines = [...worst.values()];
    const hardest = lines.reduce((lowest, line) => (line.contrast / line.required < lowest.contrast / lowest.required ? line : lowest));
    return {
        worstContrast: Number(hardest.contrast.toFixed(DECIMALS)),
        worstText: hardest.text,
        required: hardest.required,
        passes: lines.every(line => line.contrast >= line.required),
        failingLines: lines.filter(line => line.contrast < line.required).length,
        lines: lines.length,
        sceneKept: Number((kept.reduce((total, share) => total + share, 0) / kept.length).toFixed(DECIMALS)),
    };
}

const server = await serveSite();
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: BROWSER_ARGS });
const results = { measuredAt: new Date().toISOString(), variants: {} };
try {
    for (const variant of VARIANTS) {
        results.variants[variant.id] = {};
        for (const [name, size] of Object.entries(SIZES)) {
            const result = await measure(browser, origin, variant, size);
            results.variants[variant.id][name] = result;
            console.log(`${variant.id.padEnd(8)} ${name.padEnd(8)} worst ${result.worstContrast}:1 (needs ${result.required}:1, `
                + `"${result.worstText.slice(0, 30)}"), ${result.failingLines}/${result.lines} lines fail, scene kept ${Math.round(result.sceneKept * 100)}%`);
        }
    }
} finally {
    await browser.close();
    server.close();
}
await writeFile(RESULTS, `${JSON.stringify(results, null, 4)}\n`);
console.log(`Wrote ${RESULTS}`);

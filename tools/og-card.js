// Renders tools/og-card.html to img/og-card.png, the 1200 × 630 picture shown when a link to the
// site is shared. Usage: node tools/og-card.js
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const card = new URL("./og-card.html", import.meta.url);
const output = fileURLToPath(new URL("../img/og-card.png", import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(card.href);
await page.screenshot({ path: output });
await browser.close();
console.log(`Wrote ${output}`);

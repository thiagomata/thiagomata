// The WAP phone in a real browser: dialling, calls, long presses, touch, god mode, the emergency
// screen, Back and the backlight. Needs Playwright's Chromium (npx playwright install chromium).
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { chromium } from "playwright";
import { siteServer } from "../tools/serve.js";

// The site, served by the local server (npm run serve), on a free port.
const serve = () => new Promise(resolve => { const server = siteServer(); server.listen(0, "127.0.0.1", () => resolve(server)); });

describe("wap: the phone in a browser", () => {
    let server, browser, base;

    before(async () => {
        server = await serve();
        base = `http://127.0.0.1:${server.address().port}`;
        try {
            browser = await chromium.launch();
        } catch (e) {
            throw new Error(`Chromium for Playwright is missing: run \`npx playwright install chromium\`\n${e.message}`);
        }
    });
    after(async () => {
        await browser?.close();
        server?.close();
    });

    // The phone at a deep link, with every page error and console error it raises collected.
    async function phone(hash = "", { clock = false } = {}) {
        const page = await browser.newPage();
        page.errors = [];
        page.on("pageerror", e => page.errors.push(e.message));
        page.on("console", m => { if (m.type() === "error") page.errors.push(m.text()); });
        if (clock) await page.clock.install();
        await page.goto(`${base}/wap/${hash}`);
        await page.waitForFunction(() => document.querySelector("#cardtitle").textContent !== "Loading...");
        return page;
    }
    const screen = page => page.locator("#callscreen");
    const dialled = page => page.evaluate(() => {
        const dialer = document.querySelector("#dialer");
        return dialer.hidden ? "" : dialer.textContent;
    });
    const done = async page => {
        assert.deepEqual(page.errors, []);
        await page.close();
    };

    it("opens the card a deep link names, under its section", async () => {
        const page = await phone("#sli");
        assert.equal(await page.locator("#cardtitle").textContent(), "SLI Systems");
        assert.equal(new URL(page.url()).hash, "#experience/sli");
        await done(page);
    });

    it("dials typed letters, calls on Enter, and hangs up on red", async () => {
        const page = await phone();
        await page.keyboard.type("matrix");
        assert.equal(await dialled(page), "628749");
        await page.keyboard.press("Enter");
        assert.match(await screen(page).innerText(), /^Calling\n628749/);
        await page.click("#key-end");
        assert.ok(await screen(page).isHidden());
        await done(page);
    });

    it("hangs up when a key is pressed during a call, and starts the new number", async () => {
        const page = await phone();
        await page.keyboard.type("42");
        await page.keyboard.press("Enter");
        assert.ok(await screen(page).isVisible());
        await page.click("#key-call");                  // green during a call does nothing
        assert.ok(await screen(page).isVisible());
        await page.keyboard.type("5");
        assert.ok(await screen(page).isHidden());
        assert.equal(await dialled(page), "5");
        await done(page);
    });

    it("speed-dials whoever is on a key held down, by name", async () => {
        const page = await phone();
        const two = page.locator(".num", { hasText: "abc" });
        await two.hover();
        await page.mouse.down();
        await page.waitForTimeout(1000);
        await page.mouse.up();
        assert.match(await screen(page).innerText(), /^Calling\nMorpheus/);
        await done(page);
    });

    it("dials a tapped key as the finger lifts, and nothing when the touch becomes a scroll", async () => {
        const page = await phone();
        const touch = (digit, ...types) => page.evaluate(([digit, types]) => {
            const key = [...document.querySelectorAll(".num")].find(b => b.firstChild.textContent === digit);
            for (const type of types) key.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: "touch", button: 0 }));
        }, [digit, types]);
        await touch("8", "pointerdown", "pointercancel");
        assert.equal(await dialled(page), "");
        await touch("7", "pointerdown");
        assert.equal(await dialled(page), "");
        await touch("7", "pointerup");
        assert.equal(await dialled(page), "7");
        await done(page);
    });

    it("opens home, at #home, for an anchor the deck has no card for", async () => {
        for (const hash of ["#nope", "#constructor", "#experience/toString", "#%E0"]) {
            const page = await phone(hash);
            assert.equal(await page.locator("#cardtitle").textContent(), "Thiago Mata", hash);
            assert.equal(new URL(page.url()).hash, "#home", hash);
            await done(page);
        }
        const page = await phone();
        await page.evaluate(() => { location.hash = "#__proto__"; });
        await page.waitForFunction(() => location.hash === "#home");
        assert.equal(await page.locator("#cardtitle").textContent(), "Thiago Mata");
        await done(page);
    });

    it("turns on god mode with 214 + C and green, and leaves numbers with 2142 in them alone", async () => {
        const page = await phone();
        await page.keyboard.type("0221420000");
        assert.equal(await dialled(page), "0221420000");
        assert.ok(await screen(page).isHidden());
        await page.click("#key-end");
        assert.equal(await page.locator("#signal i:not(.off)").count(), 2);
        await page.keyboard.type("214c");
        await page.keyboard.press("Enter");
        assert.match(await screen(page).innerText(), /^GOD MODE/);
        assert.equal(await page.locator("#signal i:not(.off)").count(), 4);
        await done(page);
    });

    it("puts help first on an emergency number, with a support line to tap but never the emergency number", async () => {
        const page = await phone();
        await page.keyboard.type("000");
        await page.keyboard.press("Enter");
        assert.match(await screen(page).innerText(), /^For a real emergency, call your local emergency services\./);
        assert.equal(await page.locator('#callscreen a[href="tel:131114"]').count(), 1);
        assert.equal(await page.locator('#callscreen a[href="tel:000"]').count(), 0);
        await page.click("#key-end");
        await page.keyboard.type("help");
        await page.keyboard.press("Enter");
        assert.match(await screen(page).innerText(), /^If you need me, contact me at/);
        await done(page);
    });

    it("goes back the same way with the Back soft key and the browser's back button", async () => {
        const page = await phone();
        await page.click('#content a[href="#experience"]');
        await page.click('#content a[href="#macquarie"]');
        assert.equal(new URL(page.url()).hash, "#experience/macquarie");
        await page.click("#sk-left");
        await page.waitForFunction(() => location.hash === "#experience");
        await page.goBack();
        await page.waitForFunction(() => location.hash === "#home");
        assert.equal(await page.locator("#cardtitle").textContent(), "Thiago Mata");
        await done(page);
    });

    it("keeps the backlight on until the first key press, then dims it after a while", async () => {
        const page = await phone("", { clock: true });
        await page.clock.runFor(60_000);
        assert.ok(!(await page.locator(".screen").evaluate(s => s.classList.contains("unlit"))));
        await page.keyboard.press("ArrowDown");
        await page.clock.runFor(16_000);
        assert.ok(await page.locator(".screen").evaluate(s => s.classList.contains("unlit")));
        await done(page);
    });

    it("hangs up in the middle of a line, while its recording still loads, without an error", async () => {
        const page = await phone();
        // a slow network: the recording is still on its way when the call ends
        await page.route(/\/voice\/[^/]+\.mp3/, async route => {
            await new Promise(resolve => setTimeout(resolve, 1500));
            await route.continue().catch(() => {});
        });
        await page.keyboard.type("7110");
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => document.querySelector("#callscreen").innerText.includes("You f"), null, { timeout: 8000 });
        await page.click("#key-end");
        await page.waitForTimeout(2500);
        assert.ok(await screen(page).isHidden());
        await done(page);
    });
});

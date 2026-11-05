import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { loadSoon } from "../js/shared/load-soon.js";

/** A fake browser: the card's observer, idle callbacks and the page's load event, triggered by hand. */
function fakeBrowser(readyState) {
    const browser = { observers: [], idleCallbacks: [], loadListeners: [] };
    globalThis.document = { readyState };
    globalThis.window = {
        IntersectionObserver: class {
            constructor(callback) {
                this.callback = callback;
                this.disconnected = false;
                browser.observers.push(this);
            }
            observe() {}
            disconnect() { this.disconnected = true; }
        },
        requestIdleCallback: callback => browser.idleCallbacks.push(callback),
        addEventListener: (type, listener) => type === "load" && browser.loadListeners.push(listener),
    };
    globalThis.IntersectionObserver = window.IntersectionObserver;
    browser.cardNear = () => browser.observers.forEach(observer => observer.callback([{ isIntersecting: true }]));
    browser.cardFar = () => browser.observers.forEach(observer => observer.callback([{ isIntersecting: false }]));
    browser.idle = () => browser.idleCallbacks.splice(0).forEach(callback => callback());
    browser.pageLoaded = () => browser.loadListeners.splice(0).forEach(listener => listener());
    return browser;
}

describe("load soon", () => {
    let loads;
    const load = () => loads++;
    beforeEach(() => { loads = 0; });
    afterEach(() => {
        delete globalThis.window;
        delete globalThis.document;
        delete globalThis.IntersectionObserver;
    });

    it("loads when the card gets near the screen, and stops watching it", () => {
        const browser = fakeBrowser("loading");
        loadSoon({}, load);
        browser.cardFar();
        assert.equal(loads, 0);
        browser.cardNear();
        assert.equal(loads, 1);
        assert.ok(browser.observers[0].disconnected);
    });

    it("waits for the page to load, then for the browser to be idle", () => {
        const browser = fakeBrowser("loading");
        loadSoon({}, load);
        browser.idle();
        assert.equal(loads, 0);
        browser.pageLoaded();
        assert.equal(loads, 0);
        browser.idle();
        assert.equal(loads, 1);
    });

    it("waits only for the browser to be idle when the page has already loaded", () => {
        const browser = fakeBrowser("complete");
        loadSoon({}, load);
        browser.idle();
        assert.equal(loads, 1);
    });

    it("loads only once, whichever comes first", () => {
        const browser = fakeBrowser("complete");
        loadSoon({}, load);
        browser.cardNear();
        browser.idle();
        browser.cardNear();
        assert.equal(loads, 1);
    });
});

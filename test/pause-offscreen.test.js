import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { PAUSED, RESUME_BEFORE_VISIBLE, pauseOffscreen } from "../js/shared/pause-offscreen.js";

/** A card with a class list, as the page would have. */
function fakeCard(company) {
    const classes = new Set();
    return {
        dataset: { company },
        querySelector: () => null,
        classList: {
            add: name => classes.add(name),
            toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
            contains: name => classes.has(name),
        },
    };
}

/** A fake browser whose one observer is triggered by hand, recording what the log was told. */
function fakeBrowser({ withObserver = true } = {}) {
    const browser = { observer: null, log: [] };
    globalThis.window = { logAnimation: (...entry) => browser.log.push(entry) };
    if (withObserver) {
        window.IntersectionObserver = class {
            constructor(callback, options) {
                this.callback = callback;
                this.options = options;
                this.observed = [];
                browser.observer = this;
            }
            observe(card) { this.observed.push(card); }
        };
        globalThis.IntersectionObserver = window.IntersectionObserver;
    }
    browser.show = (card, onScreen) => browser.observer.callback([{ target: card, isIntersecting: onScreen }]);
    return browser;
}

describe("pause off screen", () => {
    afterEach(() => {
        delete globalThis.window;
        delete globalThis.IntersectionObserver;
    });

    it("starts every card paused, and watches it a little beyond the screen", () => {
        const browser = fakeBrowser();
        const cards = [fakeCard("rokt"), fakeCard("mec")];
        pauseOffscreen(cards);
        assert.ok(cards.every(card => card.classList.contains(PAUSED)));
        assert.deepEqual(browser.observer.observed, cards);
        assert.equal(browser.observer.options.rootMargin, RESUME_BEFORE_VISIBLE);
    });

    it("resumes a card on screen and pauses it again when it leaves", () => {
        const browser = fakeBrowser();
        const [card, other] = [fakeCard("rokt"), fakeCard("mec")];
        pauseOffscreen([card, other]);
        browser.show(card, true);
        assert.equal(card.classList.contains(PAUSED), false);
        assert.equal(other.classList.contains(PAUSED), true, "only the card on screen resumes");
        browser.show(card, false);
        assert.equal(card.classList.contains(PAUSED), true);
    });

    it("logs each change by the card's name", () => {
        const browser = fakeBrowser();
        const card = fakeCard("rokt");
        pauseOffscreen([card]);
        browser.show(card, true);
        browser.show(card, false);
        assert.deepEqual(browser.log, [["rokt", "running", ""], ["rokt", "paused", "off screen"]]);
    });

    it("leaves the cards animated when the browser cannot tell what is on screen", () => {
        fakeBrowser({ withObserver: false });
        const card = fakeCard("rokt");
        pauseOffscreen([card]);
        assert.equal(card.classList.contains(PAUSED), false);
    });
});

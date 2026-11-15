import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { checkDeck, renderCard, renderDeck } from "../tools/wap-deck.js";
import { manifest, recordingKey, spoken, voiceLines } from "../tools/wap-voices.js";
import {
    cardPath, dtmf, keyFor, numberFor, pronounce, SECRETS, sections, SPEED_DIAL, SUPPORT, telHref,
} from "../wap/phone.js";

const PAGE = readFileSync(new URL("../wap/index.html", import.meta.url), "utf8");
const DECK = readFileSync(new URL("../index.wml", import.meta.url), "utf8");
const VOICE = voiceLines(PAGE);
const MANIFEST = JSON.parse(readFileSync(new URL("../wap/voice/manifest.json", import.meta.url), "utf8"));

// The deck's cards, each with the hrefs of its links: <a> only, as the page builds its sections,
// not the soft keys' <go>.
function deckLinks() {
    const links = {};
    for (const [, id, body] of DECK.matchAll(/<card id="([^"]+)"[^>]*>([\s\S]*?)<\/card>/g)) {
        links[id] = [...body.matchAll(/<a href="([^"]+)"/g)].map(([, href]) => href);
    }
    return links;
}
// The numbers the page has a call for.
function callNumbers() {
    const calls = PAGE.match(/const CALLS = \{([\s\S]*?)\n\};/)[1];
    const numbers = [...calls.matchAll(/^ {2}'([^']+)':/gm)].map(([, n]) => n);
    const emergency = calls.match(/\.\.\.Object\.fromEntries\(\[([^\]]+)\]/)[1].match(/'[^']+'/g).map(n => n.slice(1, -1));
    return { numbers, emergency };
}

describe("wap: the keypad", () => {
    it("dials digits, * and # as themselves, and letters on the key they are printed on", () => {
        assert.equal(keyFor("7"), "7");
        assert.equal(keyFor("#"), "#");
        assert.equal(keyFor("c"), "2");
        assert.equal(keyFor("S"), "7");
        assert.equal(keyFor("z"), "9");
        assert.equal(keyFor("Enter"), null);
        assert.equal(keyFor("!"), null);
    });

    it("spells the secret words as their numbers", () => {
        const number = Object.fromEntries(SECRETS);
        for (const word of ["matrix", "portal", "rick", "rickroll", "help"]) {
            assert.equal(numberFor(word), number[word], word);
        }
        assert.equal(numberFor("nevergonna"), number.never_gonna);
    });

    it("sounds a different pair of standard DTMF tones on every key", () => {
        assert.deepEqual(dtmf("1"), [697, 1209]);
        assert.deepEqual(dtmf("5"), [770, 1336]);
        assert.deepEqual(dtmf("#"), [941, 1477]);
        const pairs = new Set([..."123456789*0#"].map(k => dtmf(k).join()));
        assert.equal(pairs.size, 12);
    });
});

describe("wap: 214 + C", () => {
    it("is 2142 on the keypad, C being on the 2 key", () => {
        assert.equal(numberFor("214c"), "2142");
        assert.deepEqual(SECRETS.find(([name]) => name === "special_214c"), ["special_214c", "2142"]);
    });
});

describe("wap: deep links", () => {
    it("puts a card under the first card, other than home, that links to it", () => {
        const links = { home: ["#a", "#b"], a: ["#b", "#c"], b: ["#c"], c: [] };
        const parents = sections(links);
        assert.deepEqual({ ...parents }, { b: "a", c: "a" });
        assert.equal(cardPath("c", parents), "a/c");
        assert.equal(cardPath("a", parents), "a");
    });

    it("stops at a cycle instead of looping", () => {
        const parents = sections({ home: ["#a"], a: ["#b"], b: ["#a"] });
        assert.equal(cardPath("b", parents), "a/b");
        assert.equal(cardPath("a", parents), "b/a");
    });

    it("files the job cards under Experience and the cases under their jobs", () => {
        const parents = sections(deckLinks());
        assert.equal(cardPath("sli", parents), "experience/sli");
        assert.equal(cardPath("identity", parents), "experience/rokt/identity");
        assert.equal(cardPath("experience", parents), "experience");
    });

    it("never takes an Object built-in for a card", () => {
        const parents = sections({ home: ["#a", "#constructor"], a: ["#toString"] });
        assert.equal(cardPath("constructor", parents), "constructor");
        assert.equal(Object.keys(parents).length, 0);
    });

    it("gives every card in the deck a path that ends at the card", () => {
        const links = deckLinks();
        const parents = sections(links);
        assert.ok(Object.keys(links).length > 20);
        for (const id of Object.keys(links)) {
            const path = cardPath(id, parents).split("/");
            assert.equal(path.at(-1), id);
            for (const step of path) assert.ok(step in links, `${id}: ${step}`);
        }
    });

    it("links only to cards the deck has", () => {
        const links = deckLinks();
        for (const [id, hrefs] of Object.entries(links)) {
            for (const href of hrefs.filter(h => h.startsWith("#"))) {
                assert.ok(href.slice(1) in links, `${id} -> ${href}`);
            }
        }
    });
});

describe("wap: secret numbers", () => {
    const dialable = SECRETS.filter(([name]) => !["god_mode", "speed_dial"].includes(name));

    it("has a call for every secret 777 lists", () => {
        const { numbers, emergency } = callNumbers();
        for (const [name, number] of dialable) {
            assert.ok(numbers.includes(number) || emergency.includes(number), `${name} ${number}`);
        }
    });

    it("lists every call in 777, except voicemail and the emergency numbers, but HELP", () => {
        const { numbers, emergency } = callNumbers();
        const listed = new Set(dialable.map(([, n]) => n));
        for (const number of numbers.filter(n => n !== "voicemail")) {
            assert.ok(listed.has(number), number);
        }
        for (const number of emergency) assert.equal(listed.has(number), number === numberFor("help"), number);
    });

    it("speed-dials only numbers that answer, with 1 as voicemail", () => {
        const { numbers, emergency } = callNumbers();
        assert.deepEqual(SPEED_DIAL["1"], ["Voicemail", ""]);
        for (const [key, [name, number]] of Object.entries(SPEED_DIAL)) {
            assert.match(key, /^[1-9]$/);
            if (number) assert.ok(numbers.includes(number) && !emergency.includes(number), `${key}: ${name}`);
        }
    });

    it("never gives two secrets the same number", () => {
        const numbers = SECRETS.map(([, n]) => n);
        assert.equal(new Set(numbers).size, numbers.length);
    });
});

describe("wap: emergency numbers", () => {
    it("offers each region's support line as a number to tap", () => {
        assert.equal(telHref("13 11 14"), "tel:131114");
        assert.equal(telHref("116 123"), "tel:116123");
        assert.equal(telHref("988"), "tel:988");
    });

    it("has a support line only for numbers that reach the emergency screen, never as the number itself", () => {
        const { emergency } = callNumbers();
        for (const [number, [who, line]] of Object.entries(SUPPORT)) {
            assert.ok(emergency.includes(number), number);
            assert.notEqual(telHref(line), telHref(number), who);
        }
    });
});

describe("wap: the deck", () => {
    it("is exactly what tools/wap-deck.js makes (run `npm run wap:deck` after editing the deck)", () => {
        assert.equal(renderDeck(), DECK);
    });

    it("is valid XML whose every #link names a card", () => {
        assert.equal(checkDeck(DECK).size, Object.keys(deckLinks()).length);
    });

    it("rejects a deck that is not XML, or that links to a missing card", () => {
        assert.throws(() => checkDeck("<wml><card id=\"a\"></wml>"), /Invalid XML/);
        const broken = renderDeck([{ id: "a", title: "A", label: "B", href: "#b", art: null, items: [] }]);
        assert.throws(() => checkDeck(broken), /Broken link: #b on card a/);
    });

    it("escapes text and attributes, writes $ as WML's $$, and keeps logos aligned", () => {
        const card = renderCard({
            id: "x", title: 'Say "R&D"', label: "OK", href: "#x", art: "rokt",
            items: ["1 < 2 costs $5M", { text: "Search", href: "https://x.example/?a=1&b=2" }],
        });
        assert.match(card, /title="Say &quot;R&amp;D&quot;"/);
        assert.match(card, /1 &lt; 2 costs \$\$5M<br\/>/);
        assert.match(card, /<a href="https:\/\/x\.example\/\?a=1&amp;b=2">Search<\/a>/);
        assert.match(card, /<p mode="nowrap">\n {6}&#160;&#160;____/);
        const deck = renderDeck([{ id: "x", title: 'Say "R&D"', label: "OK", href: "#x", art: null, items: ["$5", { text: "Q", href: "https://x.example/?a=1&b=2" }] }]);
        assert.doesNotThrow(() => checkDeck(deck));
    });
});

describe("wap: voices", () => {
    it("has a voice for every caller the page puts on the line", () => {
        const callers = [...PAGE.matchAll(/quoteCall\('[^']*', '([^']+)'|caller: '([^']+)'/g)].map(([, a, b]) => a || b);
        assert.ok(callers.length > 5);
        for (const caller of callers) assert.ok(caller in VOICE, caller);
    });

    it("has a recording of every line, made from that line as it reads now", () => {
        for (const [name, key] of Object.entries(manifest(VOICE))) {
            assert.ok(existsSync(new URL(`../wap/voice/${name}`, import.meta.url)), `${name} is missing`);
            assert.equal(MANIFEST[name], key, `${name} is stale: run \`npm run wap:voices\``);
        }
        assert.deepEqual(Object.keys(MANIFEST).sort(), Object.keys(manifest(VOICE)).sort(), "the manifest lists a line no longer in the page");
    });

    it("says names the way they are spelled for it, and re-records when the voice or the words change", () => {
        const voice = { espeak: "en+m1", pronounce: { Thiago: "Cheeahgo" }, lines: [] };
        assert.equal(spoken(voice, "Hi, Thiago."), "Hi, Cheeahgo.");
        assert.equal(spoken(voice, "Hi, Thiago."), pronounce(voice.pronounce, "Hi, Thiago."), "the page says it the same way");
        assert.equal(pronounce(undefined, "Hi"), "Hi");
        assert.equal(recordingKey(voice, "Hi"), recordingKey(voice, "Hi"));
        assert.notEqual(recordingKey(voice, "Hi"), recordingKey(voice, "Hello"));
        assert.notEqual(recordingKey(voice, "Hi"), recordingKey({ ...voice, espeak: "en+f2" }, "Hi"));
        assert.match(recordingKey(voice, "Hi"), /^[0-9a-f]{16}$/);
    });
});

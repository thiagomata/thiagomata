import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lerp } from "../js/shared/motion.js";
import { COLOURS, Fade, cssColour, easeInOut, fadeShare, mixColour } from "../js/sli/fading.js";

const DURATION = 1000;

describe("SLI fading", () => {
    it("eases in and out: slow at both ends, halfway at half the time", () => {
        assert.equal(easeInOut(0), 0);
        assert.equal(easeInOut(0.5), 0.5);
        assert.equal(easeInOut(1), 1);
        assert.ok(easeInOut(0.1) < 0.1 && easeInOut(0.9) > 0.9);
    });

    it("measures a fade's progress, from 0 before it starts to 1 once it is over", () => {
        assert.equal(fadeShare(100, 50, DURATION), 0);
        assert.equal(fadeShare(100, 600, DURATION), 0.5);
        assert.equal(fadeShare(100, 5000, DURATION), 1);
    });

    it("mixes colours channel by channel, in whole values", () => {
        assert.deepEqual(mixColour(COLOURS.grey, COLOURS.white, 0), COLOURS.grey);
        assert.deepEqual(mixColour(COLOURS.grey, COLOURS.white, 1), COLOURS.white);
        assert.deepEqual(mixColour([0, 0, 0], [255, 100, 11], 0.5), [128, 50, 6]);
        assert.equal(cssColour([1, 2, 3]), "rgb(1, 2, 3)");
    });

    it("fades towards a new target and settles there", () => {
        const size = new Fade(0, DURATION, lerp);
        assert.ok(size.settled(0));
        size.towards(1, 0);
        assert.equal(size.at(0), 0);
        assert.equal(size.at(DURATION / 2), 0.5);
        assert.ok(!size.settled(DURATION / 2));
        assert.equal(size.at(DURATION), 1);
        assert.ok(size.settled(DURATION));
    });

    it("turns back from wherever it is, without jumping", () => {
        const size = new Fade(0, DURATION, lerp);
        size.towards(1, 0);
        const halfway = size.at(DURATION / 2);
        size.towards(0, DURATION / 2);
        assert.equal(size.at(DURATION / 2), halfway);
        assert.equal(size.at(DURATION * 1.5), 0);
    });
});

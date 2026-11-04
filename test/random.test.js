import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { seededRandom } from "../js/ideia/random.js";

const sample = (random, count, draw) => Array.from({ length: count }, () => draw(random));

describe("seededRandom", () => {
    it("gives the same sequence for the same seed", () => {
        assert.deepEqual(sample(seededRandom(42), 20, r => r.next()), sample(seededRandom(42), 20, r => r.next()));
    });

    it("gives a different sequence for a different seed", () => {
        assert.notDeepEqual(sample(seededRandom(1), 20, r => r.next()), sample(seededRandom(2), 20, r => r.next()));
    });

    it("keeps next() in [0, 1)", () => {
        for (const value of sample(seededRandom(3), 5000, r => r.next())) {
            assert.ok(value >= 0 && value < 1, `${value} out of range`);
        }
    });

    it("keeps range() within its bounds", () => {
        for (const value of sample(seededRandom(4), 5000, r => r.range(-2.5, 7))) {
            assert.ok(value >= -2.5 && value < 7, `${value} out of range`);
        }
    });

    it("gives integers from min to max, both included", () => {
        const values = new Set(sample(seededRandom(5), 5000, r => r.integer(3, 6)));
        assert.deepEqual([...values].sort(), [3, 4, 5, 6]);
    });

    it("only picks items of the list, and all of them eventually", () => {
        const list = ["a", "b", "c"];
        const picked = new Set(sample(seededRandom(6), 1000, r => r.pick(list)));
        assert.deepEqual([...picked].sort(), list);
    });

    it("makes chance() true about as often as asked", () => {
        const hits = sample(seededRandom(7), 10000, r => r.chance(0.3)).filter(Boolean).length;
        assert.ok(Math.abs(hits / 10000 - 0.3) < 0.02, `${hits} hits`);
    });
});

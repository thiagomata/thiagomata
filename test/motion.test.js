import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FULL_TURN, clamp, lerp, pulse, toUnitRange, travellingWave } from "../js/shared/motion.js";

const closeTo = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `${actual} ≠ ${expected}`);

describe("motion helpers", () => {
    it("interpolates between two values", () => {
        assert.equal(lerp(10, 20, 0), 10);
        assert.equal(lerp(10, 20, 1), 20);
        assert.equal(lerp(10, 20, 0.25), 12.5);
    });

    it("keeps a value within its limits", () => {
        assert.equal(clamp(-3, 0, 1), 0);
        assert.equal(clamp(0.4, 0, 1), 0.4);
        assert.equal(clamp(7, 0, 1), 1);
    });

    it("moves a sine's -1..1 to 0..1", () => {
        assert.equal(toUnitRange(-1), 0);
        assert.equal(toUnitRange(0), 0.5);
        assert.equal(toUnitRange(1), 1);
    });

    it("moves a travelling wave forward by one width every period", () => {
        const width = 100, period = 4;
        for (const position of [0, 13, 57]) {
            closeTo(travellingWave(position, width, 0, period), travellingWave(position + width, width, period, period));
        }
    });

    it("repeats a pulse every period and keeps it between 0 and 1", () => {
        const period = 3, phase = 0.7;
        for (let seconds = 0; seconds < 2 * period; seconds += 0.1) {
            const value = pulse(seconds, period, phase);
            assert.ok(value >= 0 && value <= 1, `${value} out of range`);
            closeTo(value, pulse(seconds + period, period, phase));
        }
    });

    it("measures a full turn in radians", () => {
        closeTo(FULL_TURN, 2 * Math.PI);
    });
});

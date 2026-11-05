import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CRUISING_KMH, SPEED_KMH, needleAngle, speedAt, turnWheels } from "../js/otimicar/speed.js";

const closeTo = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `${actual} ≠ ${expected}`);

describe("OtimiCar speed", () => {
    it("drifts between the low and the high speed, once a cycle", () => {
        closeTo(speedAt(0), SPEED_KMH.low);
        closeTo(speedAt(SPEED_KMH.cycleSeconds / 2), SPEED_KMH.high);
        for (let seconds = 0; seconds < 2 * SPEED_KMH.cycleSeconds; seconds += 0.1) {
            const speed = speedAt(seconds);
            assert.ok(speed >= SPEED_KMH.low - 1e-9 && speed <= SPEED_KMH.high + 1e-9, `${speed} out of range`);
            closeTo(speed, speedAt(seconds + SPEED_KMH.cycleSeconds));
        }
    });

    it("cruises halfway between the low and the high", () => {
        closeTo(CRUISING_KMH, (SPEED_KMH.low + SPEED_KMH.high) / 2);
    });

    it("points the needle left at 0 km/h, up at half the dial and right at its top", () => {
        assert.equal(needleAngle(0), -120);
        assert.equal(needleAngle(120), 0);
        assert.equal(needleAngle(240), 120);
    });

    it("turns the wheels faster at higher speeds, within one turn", () => {
        assert.ok(turnWheels(0, SPEED_KMH.high, 0.1) > turnWheels(0, SPEED_KMH.low, 0.1));
        assert.equal(turnWheels(42, SPEED_KMH.high, 0), 42);
        for (let seconds = 0; seconds < 10; seconds += 0.7) {
            const angle = turnWheels(0, SPEED_KMH.high, seconds);
            assert.ok(angle >= 0 && angle < 360, `${angle} out of range`);
        }
    });

    it("turns the wheels once every 0.3 seconds at 160 km/h", () => {
        closeTo(turnWheels(0, 160, 0.3), 0);
        closeTo(turnWheels(0, 160, 0.15), 180);
    });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    CLEARANCE, CROSS_GREEN, CYCLE, MAIN_GREEN, WALK, carsMayEnter, cycleAt, secondsIntoWalk,
} from "../js/ideia/signals.js";

/** Times across two cycles, every tenth of a second. */
const moments = Array.from({ length: 2 * CYCLE * 10 }, (_, index) => index / 10);

describe("traffic lights", () => {
    it("adds up to one cycle", () => {
        assert.equal(MAIN_GREEN + CROSS_GREEN + WALK, CYCLE);
    });

    it("leaves each street time to enter before clearing the junction", () => {
        assert.ok(CLEARANCE < MAIN_GREEN && CLEARANCE < CROSS_GREEN);
    });

    it("lets the main street go first, then the cross street", () => {
        assert.ok(carsMayEnter("main", 0));
        assert.ok(!carsMayEnter("cross", 0));
        assert.ok(carsMayEnter("cross", MAIN_GREEN));
        assert.ok(!carsMayEnter("main", MAIN_GREEN));
    });

    it("stops cars entering for the last CLEARANCE seconds of their green", () => {
        assert.ok(!carsMayEnter("main", MAIN_GREEN - CLEARANCE));
        assert.ok(!carsMayEnter("cross", MAIN_GREEN + CROSS_GREEN - CLEARANCE));
    });

    it("never lets both streets enter at once", () => {
        for (const seconds of moments) {
            assert.ok(!(carsMayEnter("main", seconds) && carsMayEnter("cross", seconds)), `both green at ${seconds}`);
        }
    });

    it("keeps every car out while people walk", () => {
        for (const seconds of moments) {
            if (secondsIntoWalk(seconds) >= 0) {
                assert.ok(!carsMayEnter("main", seconds) && !carsMayEnter("cross", seconds), `car green at ${seconds}`);
            }
        }
    });

    it("gives people the last WALK seconds of every cycle", () => {
        assert.equal(secondsIntoWalk(CYCLE - WALK), 0);
        assert.ok(secondsIntoWalk(CYCLE - WALK - 0.1) < 0);
        assert.ok(Math.abs(secondsIntoWalk(CYCLE - 0.1) - (WALK - 0.1)) < 1e-9);
    });

    it("numbers cycles and restarts the elapsed time each cycle", () => {
        assert.deepEqual(cycleAt(0), { number: 0, elapsed: 0 });
        assert.equal(cycleAt(CYCLE + 3).number, 1);
        assert.ok(Math.abs(cycleAt(CYCLE + 3).elapsed - 3) < 1e-9);
    });
});

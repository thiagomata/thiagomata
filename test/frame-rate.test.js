import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FRAMES_PER_SECOND, MILLISECONDS_PER_FRAME, isTimeToDraw } from "../js/shared/frame-rate.js";

const SIXTY_HERTZ_FRAME = 1000 / 60;

describe("frame rate", () => {
    it("always draws the first frame", () => {
        assert.equal(isTimeToDraw(0, null), true);
    });

    it("draws every other frame of a 60Hz screen", () => {
        let lastDrawn = null, drawn = 0;
        const frames = 120;
        for (let frame = 0; frame < frames; frame++) {
            const now = frame * SIXTY_HERTZ_FRAME;
            if (isTimeToDraw(now, lastDrawn)) {
                lastDrawn = now;
                drawn++;
            }
        }
        assert.equal(drawn, frames / 2);
    });

    it("draws less often when asked for fewer frames a second", () => {
        const tenPerSecond = 10;
        assert.equal(isTimeToDraw(50, 0, tenPerSecond), false);
        assert.equal(isTimeToDraw(100, 0, tenPerSecond), true);
    });

    it("measures a frame at the shared rate", () => {
        assert.ok(Math.abs(MILLISECONDS_PER_FRAME * FRAMES_PER_SECOND - 1000) < 1e-9);
    });
});

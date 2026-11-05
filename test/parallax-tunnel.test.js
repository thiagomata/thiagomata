import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    EYE_DISTANCE, EYE_REACH, TUNNEL, WINDOW_SIDE, easeTowards, eyeTarget, frameGrey, windowFrustum, windowSize,
} from "../js/parallax/tunnel.js";

const closeTo = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `${actual} ≠ ${expected}`);
const NEAR = 1;

describe("Parallax tunnel", () => {
    it("sizes the window to the card's shape, its shorter side always the same", () => {
        assert.deepEqual(windowSize(2), [2 * WINDOW_SIDE, WINDOW_SIDE]);
        assert.deepEqual(windowSize(0.5), [WINDOW_SIDE, 2 * WINDOW_SIDE]);
    });

    it("sees the window straight on from the middle", () => {
        const view = windowFrustum([0, 0, EYE_DISTANCE], 800, 400, NEAR);
        closeTo(view.left, -view.right);
        closeTo(view.top, -view.bottom);
    });

    it("keeps the window's edges where they are as the eye moves", () => {
        // An edge of the window, projected from the eye onto the near plane and back, stays put.
        for (const eye of [[0, 0, EYE_DISTANCE], [120, -80, EYE_DISTANCE], [-60, 40, 300]]) {
            const view = windowFrustum(eye, 800, 400, NEAR);
            const backToWindow = edge => eye[0] + edge * eye[2] / NEAR;
            closeTo(backToWindow(view.left), -400);
            closeTo(backToWindow(view.right), 400);
        }
    });

    it("skews the view away from the eye: looking from the right shows more of the left", () => {
        const view = windowFrustum([100, 0, EYE_DISTANCE], 800, 400, NEAR);
        assert.ok(-view.left > view.right);
    });

    it("darkens the frames with depth, never below black", () => {
        closeTo(frameGrey(0), TUNNEL.nearestGrey);
        for (let index = 1; index < TUNNEL.frames; index++) assert.ok(frameGrey(index) < frameGrey(index - 1));
        assert.equal(frameGrey(1000), 0);
    });

    it("follows the pointer within its reach, up on the card being up in the scene", () => {
        const reach = EYE_REACH * WINDOW_SIDE;
        assert.deepEqual(eyeTarget([1, -1], 0), [reach, reach]);
        assert.deepEqual(eyeTarget([0, 0], 0), [0, -0]);
    });

    it("wanders within its reach without a pointer", () => {
        const reach = EYE_REACH * WINDOW_SIDE;
        for (let seconds = 0; seconds < 120; seconds += 0.5) {
            const [x, y] = eyeTarget(null, seconds);
            assert.ok(Math.abs(x) <= reach && Math.abs(y) <= reach);
        }
    });

    it("eases towards the target at the same pace at any frame rate", () => {
        let at30 = 0, at60 = 0;
        for (let frame = 0; frame < 30; frame++) at30 = easeTowards(at30, 100, 1 / 30);
        for (let frame = 0; frame < 60; frame++) at60 = easeTowards(at60, 100, 1 / 60);
        closeTo(at30, at60);
        assert.ok(at30 > 90 && at30 < 100);
        assert.equal(easeTowards(50, 100, 0), 50);
    });
});

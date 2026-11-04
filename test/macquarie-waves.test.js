import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    LINES, SPEED, advance, linePoint, lineStyle, noise, pointsAcross, restingY, settle, stir,
} from "../js/macquarie/waves.js";

const closeTo = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `${actual} ≠ ${expected}`);

describe("Macquarie waves", () => {
    it("gives repeatable noise between 0 and 1", () => {
        for (let seed = 0; seed < 500; seed++) {
            const value = noise(seed);
            assert.ok(value >= 0 && value < 1, `${value} out of range`);
            assert.equal(value, noise(seed));
        }
    });

    it("stacks the lines evenly around the middle line at rest", () => {
        const top = 100;
        assert.equal(restingY(0, top), top);
        closeTo(restingY(1, top) - restingY(0, top), restingY(0, top) - restingY(-1, top));
    });

    it("starts the middle line on its resting place: the swell grows along the line, the ripple away from the middle", () => {
        const top = 80;
        for (const clock of [0, 123, 4567]) {
            closeTo(linePoint(0, 0, clock, 0.5, top).y, restingY(0, top));
        }
    });

    it("draws enough points to reach past the right edge, and never more than the width", () => {
        for (const width of [200, 640, 1200]) {
            const lastPoint = pointsAcross(width);
            assert.ok(lastPoint <= width);
            const reach = linePoint(0, lastPoint, 0, 0, 0).x;
            assert.ok(reach >= width, `width ${width}: lines stop at ${reach}`);
        }
    });

    it("makes taller waves when stirred", () => {
        const offset = 20, along = 150, clock = 0, top = 0;
        const calm = Math.abs(linePoint(offset, along, clock, 0, top).y - restingY(offset, top));
        const stirred = Math.abs(linePoint(offset, along, clock, 1, top).y - restingY(offset, top));
        assert.ok(stirred > calm, `${stirred} ≤ ${calm}`);
    });

    it("keeps each line's style within its range, brighter in the band of light and when stirred", () => {
        const glow = 0.45;
        for (let line = 0; line < LINES; line++) {
            const { width, opacity } = lineStyle(line, 0, 0, glow);
            assert.ok(width > 0 && opacity > 0, `line ${line}`);
        }
        const inTheBand = Math.PI / 2;            // the band's peak passes line 0
        assert.ok(lineStyle(0, inTheBand, 0, glow).opacity > lineStyle(0, 0, 0, glow).opacity);
        assert.ok(lineStyle(0, inTheBand, 1, glow).opacity > lineStyle(0, inTheBand, 0, glow).opacity);
    });

    it("stirs with scrolling, up to full energy, and settles back", () => {
        assert.equal(stir(0, 0), 0);
        assert.ok(stir(0, 100) > 0);
        assert.equal(stir(0.9, 10_000), 1);
        assert.ok(settle(1, 500) < 1);
        assert.ok(settle(1, 5000) < settle(1, 500));
        closeTo(settle(1, 300), settle(settle(1, 100), 200), "settling is the same in one step or two");
    });

    it("moves at the calm speed at rest and the stirred speed when fully stirred", () => {
        const milliseconds = 100;
        closeTo(advance(0, milliseconds).waves, SPEED.waves.calm * milliseconds);
        closeTo(advance(1, milliseconds).waves, SPEED.waves.stirred * milliseconds);
        closeTo(advance(0, milliseconds).light, SPEED.light.calm * milliseconds);
        closeTo(advance(1, milliseconds).light, SPEED.light.stirred * milliseconds);
    });
});

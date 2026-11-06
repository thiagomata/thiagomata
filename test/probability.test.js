import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { curvePoints, fitView, mixCurves, smooth, smoothPath, toPeak } from "../js/probability/curve.js";
import { ANSWERS, PROBABILITIES } from "../js/probability/survey.js";

const closeTo = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
const DESIGN = { width: 1600, height: 670 };
const CHART = { left: 790, top: 150, width: 720, height: 370 };
const MARGIN = 60;
/** From a phone (0.5:1) to a very wide screen (4.5:1). */
const CARD_SHAPES = [0.5, 0.54, 0.8, 1.2, 2.1, 1600 / 670, 2.8, 3.5, 4.5];

describe("Perceptions of Probability: the survey", () => {
    it("has every phrase's answers at each probability, adding up to everyone", () => {
        assert.deepEqual(PROBABILITIES, [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);
        assert.equal(Object.keys(ANSWERS).length, 17);
        for (const [phrase, answers] of Object.entries(ANSWERS)) {
            assert.equal(answers.length, PROBABILITIES.length, phrase);
            closeTo(answers.reduce((sum, share) => sum + share, 0), 100, 0.1);
        }
    });
});

describe("Perceptions of Probability: the curve", () => {
    it("smooths a spike into a bump, keeping its total", () => {
        const spike = [0, 0, 0, 16, 0, 0, 0];
        const bump = smooth(spike);
        assert.deepEqual(bump, [0, 1, 4, 6, 4, 1, 0]);
        closeTo(bump.reduce((sum, value) => sum + value, 0), 16);
    });

    it("scales a curve to a peak of 1, and leaves an empty one empty", () => {
        assert.deepEqual(toPeak([1, 4, 2]), [0.25, 1, 0.5]);
        assert.deepEqual(toPeak([0, 0]), [0, 0]);
    });

    it("mixes two curves point by point", () => {
        assert.deepEqual(mixCurves([0, 1], [1, 0], 0.25), [0.25, 0.75]);
    });

    it("places the curve in its box, peaks at the top", () => {
        const box = { left: 100, top: 50, width: 200, height: 100 };
        assert.deepEqual(curvePoints([0, 1, 0.5], box), [[100, 150], [200, 50], [300, 100]]);
    });

    it("draws a smooth path through every point", () => {
        const path = smoothPath([[0, 10], [10, 0], [20, 10]], { left: 0, top: 0, width: 20, height: 10 });
        assert.match(path, /^M0\.0 10\.0 C/);
        assert.match(path, / 10\.0 0\.0 C/);
        assert.match(path, / 20\.0 10\.0$/);
    });

    it("never dips below the baseline or above the peak, beside a run of zeros", () => {
        const box = { left: 0, top: 0, width: 200, height: 100 };
        // A rise right after a flat zero stretch is where Catmull-Rom overshoots below the baseline.
        const path = smoothPath(curvePoints([0, 0, 0, 1, 0.2, 0, 0], box), box);
        const numbers = path.match(/-?\d+(\.\d+)?/g).map(Number);
        const downs = numbers.filter((_, index) => index % 2 === 1);
        assert.ok(Math.max(...downs) <= box.top + box.height, "below the baseline");
        assert.ok(Math.min(...downs) >= box.top, "above the peak");
    });
});

describe("Perceptions of Probability: fitting a card", () => {
    it("keeps the card's shape and the whole chart in view, whatever the card", () => {
        for (const aspect of CARD_SHAPES) {
            const view = fitView(aspect, DESIGN, CHART, MARGIN);
            closeTo(view.width / view.height, aspect, 1e-6);
            assert.ok(view.left <= CHART.left - MARGIN && view.left + view.width >= CHART.left + CHART.width + MARGIN, `aspect ${aspect}: the chart is cut across`);
            assert.ok(view.top <= CHART.top - MARGIN && view.top + view.height >= CHART.top + CHART.height + MARGIN, `aspect ${aspect}: the chart is cut top or bottom`);
        }
    });

    it("shows the static picture's full width on a card of its shape", () => {
        const view = fitView(DESIGN.width / DESIGN.height, DESIGN, CHART, MARGIN);
        for (const [side, expected] of Object.entries({ left: 0, top: 0, width: 1600, height: 670 })) closeTo(view[side], expected, 1e-6);
    });

    it("keeps the chart's margin on a phone, where the card is narrower than the chart", () => {
        const view = fitView(0.54, DESIGN, CHART, MARGIN);
        closeTo(view.width, CHART.width + 2 * MARGIN);
        closeTo(view.left, CHART.left - MARGIN);
    });
});

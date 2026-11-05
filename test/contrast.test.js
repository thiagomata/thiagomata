import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    WCAG, contrastRatio, detail, parseColour, percentile, relativeLuminance, requiredRatio, textContrast,
} from "../tools/contrast.js";

const closeTo = (actual, expected, tolerance = 0.01) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

/** An image `width` × `height`, every pixel coloured by `colourAt(column, row)`, as ImageData. */
function image(width, height, colourAt) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let row = 0; row < height; row++) {
        for (let column = 0; column < width; column++) data.set([...colourAt(column, row), 255], (row * width + column) * 4);
    }
    return { data, width, height };
}
const WHITE = [255, 255, 255], BLACK = [0, 0, 0], GREY = [119, 119, 119];

describe("contrast", () => {
    it("measures luminance and contrast as WCAG does", () => {
        assert.equal(relativeLuminance(BLACK), 0);
        assert.equal(relativeLuminance(WHITE), 1);
        assert.equal(contrastRatio(1, 0), 21);
        assert.equal(contrastRatio(0, 1), 21, "either way round");
        assert.equal(contrastRatio(0.5, 0.5), 1);
        // #777 on white is the textbook just-passing grey: about 4.48:1.
        closeTo(contrastRatio(relativeLuminance(GREY), 1), 4.48);
    });

    it("reads colours as getComputedStyle gives them", () => {
        assert.deepEqual(parseColour("rgb(233, 236, 239)"), [233, 236, 239]);
        assert.deepEqual(parseColour("rgba(0, 0, 0, 0.5)"), [0, 0, 0]);
        assert.throws(() => parseColour("transparent"));
    });

    it("asks less of large text", () => {
        assert.equal(requiredRatio(16, 400), WCAG.smallText);
        assert.equal(requiredRatio(24, 400), WCAG.largeText);
        assert.equal(requiredRatio(19, 700), WCAG.largeText);
        assert.equal(requiredRatio(19, 400), WCAG.smallText);
    });

    it("takes percentiles of unsorted values", () => {
        assert.equal(percentile([5, 1, 3, 2, 4], 0), 1);
        assert.equal(percentile([5, 1, 3, 2, 4], 0.5), 3);
        assert.equal(percentile([5, 1, 3, 2, 4], 1), 5);
    });

    it("judges text by the worst tenth of what is behind it, not by single pixels", () => {
        // White text over black, but with one white pixel in a hundred: still fully readable.
        const background = image(10, 10, (column, row) => (column === 0 && row === 0 ? WHITE : BLACK));
        const rect = { left: 0, top: 0, width: 10, height: 10 };
        assert.equal(textContrast(background, [rect], 1), 21);
        // Over a background half white, the worst tenth is white: unreadable.
        const halfWhite = image(10, 10, column => (column < 5 ? WHITE : BLACK));
        assert.equal(textContrast(halfWhite, [rect], 1), 1);
        assert.equal(textContrast(halfWhite, [{ left: 20, top: 20, width: 5, height: 5 }], 1), null, "nothing behind it");
    });

    it("finds less detail in a scene behind a layer, and none in a flat colour", () => {
        const stripes = image(20, 20, column => (column % 2 ? WHITE : BLACK));
        const dimmed = image(20, 20, column => (column % 2 ? GREY : BLACK));
        const whole = { left: 0, top: 0, width: 20, height: 20 };
        assert.ok(detail(dimmed, whole) < detail(stripes, whole));
        assert.equal(detail(image(20, 20, () => GREY), whole), 0);
        // Skipping the text's boxes leaves out what is inside them.
        const stripedLeft = image(20, 20, column => (column < 10 && column % 2 ? WHITE : BLACK));
        assert.equal(detail(stripedLeft, whole, [{ left: 0, top: 0, width: 11, height: 20 }]), 0);
    });
});

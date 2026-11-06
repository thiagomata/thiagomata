import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { EYE, LAYERS, PAINTED, easeTowards, eyeHeightAt, framing } from "../js/parallax/village.js";

const closeTo = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `${actual} ≠ ${expected}`);
const DEGREES_PER_RADIAN = 180 / Math.PI;
/** How far the view reaches to each side, in degrees, for a field of view and a card's shape. */
const halfAcross = (fieldOfView, aspect) => Math.atan(Math.tan(fieldOfView / 2 / DEGREES_PER_RADIAN) * aspect) * DEGREES_PER_RADIAN;
/** From a phone (0.5:1) to a very wide screen (4:1). */
const CARD_SHAPES = [0.5, 0.54, 0.8, 1, 1.6, 2.1, 2.8, 3.8, 4];
const MARGIN = 1e-9;

describe("Parallax village", () => {
    it("never looks past the painted part of the scene, whatever the card's shape", () => {
        for (const aspect of CARD_SHAPES) {
            const { fieldOfView, tilt, pan } = framing(aspect);
            const halfUp = fieldOfView / 2;
            assert.ok(tilt + halfUp <= PAINTED.up + MARGIN, `aspect ${aspect}: sees above the sky`);
            assert.ok(tilt - halfUp >= -PAINTED.down - MARGIN, `aspect ${aspect}: sees below the ground`);
            assert.ok(pan + halfAcross(fieldOfView, aspect) <= PAINTED.across + MARGIN, `aspect ${aspect}: sees past the right edge`);
            assert.ok(pan - halfAcross(fieldOfView, aspect) >= -PAINTED.across - MARGIN, `aspect ${aspect}: sees past the left edge`);
        }
    });

    it("keeps the hero's own view where the card allows it, and crops a wide card top and bottom", () => {
        assert.equal(framing(1).fieldOfView, EYE.fieldOfViewDegrees);
        const wide = framing(3.8);
        assert.ok(wide.fieldOfView < EYE.fieldOfViewDegrees);
        closeTo(halfAcross(wide.fieldOfView, 3.8), PAINTED.across);
    });

    it("tilts up towards the sky on a wide card, and turns towards the houses on a tall one", () => {
        assert.ok(framing(2.1).tilt > 0);
        assert.equal(framing(2.1).pan, 0, "no room to turn on a wide card");
        assert.ok(framing(0.54).pan > 0);
    });

    it("moves the eye from above its rest to below it as the card scrolls up the screen", () => {
        const rest = EYE.at[1];
        assert.ok(eyeHeightAt(0) < rest, "above (y points down)");
        closeTo(eyeHeightAt(0.5), rest);
        assert.ok(eyeHeightAt(1) > rest, "below");
    });

    it("eases towards the target at the same pace at any frame rate", () => {
        let at30 = 0, at60 = 0;
        for (let frame = 0; frame < 30; frame++) at30 = easeTowards(at30, 100, 1 / 30);
        for (let frame = 0; frame < 60; frame++) at60 = easeTowards(at60, 100, 1 / 60);
        closeTo(at30, at60);
    });

    it("has every layer's picture, and keeps overlapping layers at different depths", () => {
        for (const { picture } of LAYERS) {
            assert.ok(existsSync(new URL(`../img/parallax-village/${picture}.webp`, import.meta.url)), `${picture}.webp is missing`);
        }
        const depths = LAYERS.map(layer => layer.at[2]);
        assert.equal(new Set(depths).size, depths.length, "two layers share a depth and would flicker");
    });
});

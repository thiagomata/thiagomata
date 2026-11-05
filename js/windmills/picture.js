// The windmill picture's layout, shared by the sails, the grass and the aurora.
//
// Everything is in picture units: the units of the original drawing's viewBox
// (img/simple2.svg), with x to the right and y down from its top-left corner.
import { clamp, lerp } from "../shared/motion.js";

export const PICTURE = { width: 4294, height: 2474 };

/**
 * The part of the picture a card shows. The stage (the whole picture, `stageWidth` pixels wide)
 * sits `stageLeft` pixels from the card's left edge (0 or less), and the card is `cardWidth`
 * pixels wide. The slice is given in the stage's pixels (`left`, `width`) and in picture units
 * (`pictureLeft`, `pictureWidth`); the layers draw only this much, not the whole picture.
 */
export function shownSlice(stageLeft, stageWidth, cardWidth) {
    const fromPixel = clamp(-stageLeft, 0, stageWidth);
    const toPixel = clamp(cardWidth - stageLeft, fromPixel, stageWidth);
    const picturePerPixel = PICTURE.width / stageWidth;
    return {
        left: fromPixel,
        width: toPixel - fromPixel,
        pictureLeft: fromPixel * picturePerPixel,
        pictureWidth: (toPixel - fromPixel) * picturePerPixel,
    };
}

/** The whole picture, for a canvas that covers all of it. */
export const WHOLE_PICTURE = { pictureLeft: 0, pictureWidth: PICTURE.width };

/** Makes a 2D context draw in picture units, its canvas covering `slice` of the picture. */
export function scaleToPicture(context, canvas, slice = WHOLE_PICTURE) {
    const scaleX = canvas.width / slice.pictureWidth;
    context.setTransform(scaleX, 0, 0, canvas.height / PICTURE.height, -slice.pictureLeft * scaleX, 0);
}

/** Places `canvas` over `slice` of the stage. */
export function placeOnSlice(canvas, slice) {
    canvas.style.left = `${slice.left}px`;
    canvas.style.width = `${slice.width}px`;
}

/** Sizes `canvas` to `slice` of the stage, `heightPixels` tall, at `resolution` pixels per CSS pixel, and places it there. */
export function fitToSlice(canvas, slice, heightPixels, resolution) {
    canvas.width = Math.max(1, Math.round(slice.width * resolution));
    canvas.height = Math.max(1, Math.round(heightPixels * resolution));
    placeOnSlice(canvas, slice);
}

/** Where the sky meets the field. */
export const HORIZON_Y = 1950;

/**
 * The two windmills, read off the drawing:
 *   hub          where the sails cross and turn;
 *   sailLength   how far a sail reaches from the hub;
 *   reach        the span the sails sweep across the picture, [left, right];
 *   baseY        the bottom of the windmill's base, where it stands in the field.
 */
export const WINDMILLS = [
    { name: "left", hub: [1603, 1870], sailLength: 260, reach: [1300, 1900], baseY: 2094 },
    { name: "right", hub: [2936, 1895], sailLength: 450, reach: [2450, 3400], baseY: 2304 },
];

/** The road from the horizon to the bottom edge, as a centre line that widens towards the viewer. */
const ROAD = { centreX: 2330, halfWidthAtHorizon: 20, halfWidthAtBottom: 150 };

/** How far a point is from the horizon to the bottom edge: 0 at the horizon, 1 at the bottom. */
export const depthAt = y => (y - HORIZON_Y) / (PICTURE.height - HORIZON_Y);

/** Is this point of the field on the road? */
export function isOnRoad(x, y) {
    const halfWidth = lerp(ROAD.halfWidthAtHorizon, ROAD.halfWidthAtBottom, depthAt(y));
    return Math.abs(x - ROAD.centreX) < halfWidth;
}

/** Is this point of the field behind a windmill (within its sails' reach, further than its base)? */
export function isBehindAWindmill(x, y) {
    return WINDMILLS.some(({ reach: [left, right], baseY }) => x > left && x < right && y < baseY);
}

// The windmill picture's layout, shared by the sails, the grass and the aurora.
//
// Everything is in picture units: the units of the original drawing's viewBox
// (img/simple2.svg), with x to the right and y down from its top-left corner.
import { lerp } from "../shared/motion.js";

export const PICTURE = { width: 4294, height: 2474 };

/** Canvases are drawn at most this many pixels per CSS pixel: sharper is not worth the cost. */
export const MAX_PIXEL_RATIO = 2;

/** Makes a 2D context draw in picture units, filling its canvas. */
export const scaleToPicture = (context, canvas) =>
    context.setTransform(canvas.width / PICTURE.width, 0, 0, canvas.height / PICTURE.height, 0, 0);

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

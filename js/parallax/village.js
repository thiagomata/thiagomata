// The Parallax card's scene: the Parallax Engine's hero village (its src/docs/hero/hero_parallax.ts),
// a cartoon village painted in layers at different depths, from the sky and mountains far away to
// the lamp post and the ground frame up close. As the page scrolls, the eye rises and sinks past
// it, so near layers slide more than far ones. This file holds the layout and the maths; scene.js
// draws it.
//
// Units follow the hero: one unit is about one pixel of the original artwork, and the eye rests at
// (0, 60, 150) looking into the scene. Like the hero, y points down here; scene.js turns it up.
import { clamp, lerp } from "../shared/motion.js";

/** The far backdrops share layer-02's shape, 4000 units wide. */
const BACKDROP = { width: 4000, height: 4000 * 847 / 1603, depth: -2500 };

/**
 * Every layer, back to front: its picture (in img/parallax-village/), size and place, and whether
 * it is mirrored (to extend the land sideways). The backdrops are 1.0, 0.9 and 0.8 copies of one
 * box. The hero's own title is left out: the card has its own.
 */
export const LAYERS = [
    { picture: "layer-01", width: BACKDROP.width, height: BACKDROP.height, at: [0, -450, BACKDROP.depth] },
    { picture: "layer-02", width: BACKDROP.width * 0.9, height: BACKDROP.height * 0.9, at: [400, -400, BACKDROP.depth * 0.9] },
    { picture: "layer-03", width: BACKDROP.width * 0.8, height: BACKDROP.height * 0.8, at: [-100, -400, BACKDROP.depth * 0.8] },
    { picture: "layer-05", width: 908, height: 565, at: [550, 50, -1200] },
    { picture: "layer-05", width: 908, height: 565, at: [550 + 908, 50, -1210], mirrored: true },
    { picture: "layer-04", width: 696, height: 507, at: [-350, 50, -800] },
    { picture: "layer-04", width: 696, height: 507, at: [-350 - 696, 50, -810], mirrored: true },
    { picture: "layer-09", width: 299, height: 495, at: [460, 100, -680] },
    { picture: "layer-06", width: 221, height: 813, at: [250, 180, -650] },
    { picture: "layer-07", width: 674, height: 594, at: [-250, 50, -420] },
    { picture: "layer-08", width: 872, height: 302, at: [470, 200, -400] },
    { picture: "layer-10", width: 70, height: 309, at: [-140, 0, -380], mirrored: true },
    { picture: "post-light", width: 48, height: 41, at: [-130, -135, -377], mirrored: true, tint: "#dfd2b8" },
    { picture: "layer-11", width: 1650, height: 1177, at: [0, -100, -300] },
];
/** The water under the waterfall: a wide floor ahead of and below the eye. */
export const WATER = { colour: "#00ffff", size: 6000, at: [0, 400, -600] };
export const SKY = "#1b2238";

export const EYE = { at: [0, 60, 150], fieldOfViewDegrees: 45, near: 1, far: 10000 };
/** As the card scrolls through the screen, the eye moves this far up and down from its rest. */
const SCROLL_RISE = 70;

/**
 * The painted part of the scene, as angles from the eye (in degrees), with a small margin: the top
 * of the sky picture (layer 01), the bottom of the ground frame (layer 11), and the mountains'
 * edges (layer 02, the narrowest backdrop). The hero composed it for one screen shape and hid its
 * sides with walls; a card can be far wider or taller, so the camera fits inside it instead.
 */
export const PAINTED = { up: 28, down: 41, across: 28 };
/** Looking slightly up, where there is room to, shows the sky and mountains on wide cards. */
const PREFERRED_TILT = 10;
/** Turning right, where there is room to (on tall cards), brings in the houses on the right. */
const PREFERRED_PAN = 12;

const DEGREES_PER_RADIAN = 180 / Math.PI;
const tan = degrees => Math.tan(degrees / DEGREES_PER_RADIAN);
const atan = value => Math.atan(value) * DEGREES_PER_RADIAN;

/**
 * The camera for a card `aspect` (width / height) wide: its vertical field of view, its tilt (up
 * positive) and its pan (right positive), in degrees, as wide as the card allows without looking
 * past the painted part. A wide card crops top and bottom (and tilts up, towards the sky); a tall
 * one crops the sides (and turns right, towards the houses).
 */
export function framing(aspect) {
    const tallest = (PAINTED.up + PAINTED.down) / 2;
    let halfUp = Math.min(EYE.fieldOfViewDegrees / 2, tallest);
    if (atan(tan(halfUp) * aspect) > PAINTED.across) halfUp = atan(tan(PAINTED.across) / aspect);
    const halfAcross = atan(tan(halfUp) * aspect);
    const tilt = clamp(PREFERRED_TILT, halfUp - PAINTED.down, PAINTED.up - halfUp);
    const pan = clamp(PREFERRED_PAN, 0, PAINTED.across - halfAcross);
    return { fieldOfView: 2 * halfUp, tilt, pan };
}

/** The eye's height (y down) for a card `scrolled` (0 to 1) through the screen: above the rest as it enters at the bottom. */
export const eyeHeightAt = scrolled => EYE.at[1] + lerp(-SCROLL_RISE, SCROLL_RISE, scrolled);

/** The eye eases towards where the scroll puts it: this share of the way each second. */
const EASING_PER_SECOND = 0.95;

/** `current` eased towards `target` over `stepSeconds`, at the same pace at any frame rate. */
export const easeTowards = (current, target, stepSeconds) =>
    target + (current - target) * (1 - EASING_PER_SECOND) ** stepSeconds;

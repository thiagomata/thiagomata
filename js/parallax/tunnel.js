// The Parallax card's scene, after the Parallax Engine's Tutorial 9 (3D Parallax Depth): a tunnel
// of frames fading into the dark, targets on sticks floating at different depths, and coloured
// cubes on the floor. The card is a window into it: the eye moves and the window stays put, so
// near things shift more than far ones. This file holds the layout and the maths; scene.js draws it.
//
// Units follow the tutorial: the window (the card) sits at depth 0, and depth grows towards the
// viewer. Unlike the tutorial (p5), y points up.

/** The window's shorter side in scene units; the longer one follows the card's shape. */
export const WINDOW_SIDE = 400;
/** How far the eye sits in front of the window, at rest. */
export const EYE_DISTANCE = 600;

export const TUNNEL = {
    frames: 25,
    spacing: 60,            // between frames, going away from the viewer
    barWidth: 3,
    nearestGrey: 1,         // the nearest frame's brightness, from 0 (black) to 1 (white)
    greyStep: 10 / 255,     // each frame further away is this much darker
};

/** The red and white rings of a target, outermost first, as shares of its radius. */
export const TARGET_RINGS = [[1, "white"], [0.75, "red"], [0.5, "white"], [0.25, "red"]];
export const TARGET = {
    radius: 8,
    stickLength: 100,       // the stick points away from the viewer, behind the target
    stickRadius: 2,
};

/** Where the targets float, as in the tutorial (y flipped). */
export const TARGET_POSITIONS = [
    [0, 0, 0], [-70, 10, 50], [50, -10, 80], [10, 80, 30], [10, 200, 10], [-30, -30, 90],
    [50, 50, 70], [-30, 20, 20], [-130, 120, 200], [130, -120, 250], [200, -200, 400], [-200, 200, 500],
    [-150, 0, 100], [150, 0, 120], [0, -150, 150], [0, 150, 180], [-100, -100, 200], [100, 100, 220],
    [-180, 50, 300], [180, -50, 320], [50, -180, 350], [-50, 180, 380], [-220, -100, 450], [220, 100, 480],
    [100, -200, 520], [-100, 200, 550], [60, 0, -50], [-80, -50, -30], [80, 50, -40], [0, 100, -20],
    [0, -100, -10],
];

/** The cubes on the floor: [x, depth, size, colour]. */
const FLOOR_Y = -150;
export const CUBES = [
    [0, 0, 50, "red"], [-150, -100, 40, "blue"], [150, -100, 40, "orange"],
    [0, -300, 30, "cyan"], [0, -30, 30, "purple"],
].map(([x, depth, size, colour]) => ({ position: [x, FLOOR_Y + size / 2, depth], size, colour }));

export const COLOURS = {
    background: "#141414",
    white: "#ffffff",
    red: "#e8392b",
    stick: "#640000",
    blue: "#0000ff",
    orange: "#f0a33a",
    cyan: "#7ffbff",
    purple: "#8a2be2",
};

/** The window's [width, height] for a card `aspect` (width / height) wide: its shorter side is WINDOW_SIDE. */
export const windowSize = aspect => (aspect >= 1 ? [WINDOW_SIDE * aspect, WINDOW_SIDE] : [WINDOW_SIDE, WINDOW_SIDE / aspect]);

/** The brightness of the frame `index` frames into the tunnel, from 0 to 1. */
export const frameGrey = index => Math.max(TUNNEL.nearestGrey - index * TUNNEL.greyStep, 0);

/**
 * The view through the window from `eye` ([x, y, distance in front of the window]): the edges of
 * the window, seen from the eye, on the near plane. The window stays put while the eye moves, so
 * the view is skewed (an off-axis projection) rather than turned.
 */
export function windowFrustum([eyeX, eyeY, eyeDistance], windowWidth, windowHeight, near) {
    const scale = near / eyeDistance;
    return {
        left: (-windowWidth / 2 - eyeX) * scale,
        right: (windowWidth / 2 - eyeX) * scale,
        top: (windowHeight / 2 - eyeY) * scale,
        bottom: (-windowHeight / 2 - eyeY) * scale,
    };
}

/** How far the eye moves from the middle, at most, as a share of the window's shorter side. */
export const EYE_REACH = 0.35;
/** Without a pointer, the eye wanders on its own: one loop across in this many seconds. */
const WANDER_SECONDS = 24;
/** ...and up and down at a different pace, so the path never quite repeats. */
const WANDER_UP_SECONDS = 17;
/** The wandering eye covers this share of its reach. */
const WANDER_SHARE = 0.6;

/**
 * Where the eye wants to be: following the pointer over the card (`pointer` is [x, y] from -1 to 1,
 * from the card's middle, y down), or wandering slowly when there is none. Returns [x, y] in scene
 * units, y up.
 */
export function eyeTarget(pointer, seconds) {
    const reach = EYE_REACH * WINDOW_SIDE;
    if (pointer) return [pointer[0] * reach, -pointer[1] * reach];
    const turn = 2 * Math.PI;
    return [
        Math.sin(turn * seconds / WANDER_SECONDS) * reach * WANDER_SHARE,
        Math.sin(turn * seconds / WANDER_UP_SECONDS) * reach * WANDER_SHARE / 2,
    ];
}

/** The eye eases towards its target: this share of the way each second. */
const EASING_PER_SECOND = 0.95;

/** `current` eased towards `target` over `stepSeconds`, at the same pace at any frame rate. */
export const easeTowards = (current, target, stepSeconds) =>
    target + (current - target) * (1 - EASING_PER_SECOND) ** stepSeconds;

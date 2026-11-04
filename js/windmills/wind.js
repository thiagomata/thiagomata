// The wind over the windmills' field: gusts that sweep across the picture from left to right.
// The grass bends with it and the sails turn faster as a gust passes over them, so both move
// with the same wind.

const GUST = {
    widthUnits: 1600,       // distance between two gusts, in picture units
    secondsToCross: 7,      // how long a gust takes to travel one gust width
    calm: 0.35,             // the wind between gusts, as a share of a full gust
};
const FLUTTER = { widthUnits: 260, seconds: 1.3, share: 0.25 };   // small fast ripples on top

/**
 * Wind strength at picture position `x` and time `seconds`: 0 is still air, 1 a full gust.
 * Gusts move to the right, so a point feels them one after another.
 */
export function windAt(x, seconds) {
    const gust = 0.5 + 0.5 * Math.sin(2 * Math.PI * (x / GUST.widthUnits - seconds / GUST.secondsToCross));
    const flutter = Math.sin(2 * Math.PI * (x / FLUTTER.widthUnits - seconds / FLUTTER.seconds));
    const strength = GUST.calm + (1 - GUST.calm) * gust ** 2;
    return Math.min(Math.max(strength + FLUTTER.share * strength * flutter, 0), 1);
}

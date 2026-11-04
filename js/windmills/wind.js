// The wind over the windmills' field: gusts that sweep across the picture from left to right,
// with small fast flutters on top. The grass bends with it and the sails turn faster as a gust
// passes over them, so both move with the same wind.
import { clamp, lerp, toUnitRange, travellingWave } from "../shared/motion.js";

const GUST = {
    widthUnits: 1600,       // distance between two gusts, in picture units
    secondsToCross: 7,      // how long a gust takes to travel one gust width
    calm: 0.35,             // the wind between gusts, as a share of a full gust
};
const FLUTTER = { widthUnits: 260, seconds: 1.3, share: 0.25 };

/** How fast the sails turn compared with their normal speed: in still air, and in a full gust. */
export const SAIL_SPEED = { stillAir: 0.5, fullGust: 1.6 };

/**
 * Wind strength at picture position `x` and time `seconds`: 0 is still air, 1 a full gust.
 * Gusts move to the right, so a point feels them one after another.
 */
export function windAt(x, seconds) {
    const gust = toUnitRange(travellingWave(x, GUST.widthUnits, seconds, GUST.secondsToCross));
    // Squaring the gust keeps the calm longer and makes the gusts short and strong.
    const strength = lerp(GUST.calm, 1, gust * gust);
    const flutter = FLUTTER.share * strength * travellingWave(x, FLUTTER.widthUnits, seconds, FLUTTER.seconds);
    return clamp(strength + flutter, 0, 1);
}

/** How fast sails at `x` turn at `seconds`, as a multiple of their normal speed. */
export const sailSpeedAt = (x, seconds) => lerp(SAIL_SPEED.stillAir, SAIL_SPEED.fullGust, windAt(x, seconds));

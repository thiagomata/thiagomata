// The OtimiCar scene's one speed, which drives both the speedometer's needle and the wheels, so
// they always agree.

/** The speed drifts smoothly between these, in km/h, over one cycle. */
export const SPEED_KMH = { low: 150, high: 175, cycleSeconds: 5.2 };
/** The dial reads 0 to `maxKmh` over `sweepDegrees`, centred on straight up. */
const DIAL = { maxKmh: 240, sweepDegrees: 240 };
/** At 160 km/h, the wheels turn once every 0.9 s. */
const WHEEL_DEGREES_PER_SECOND_PER_KMH = 2.5;
const FULL_TURN_DEGREES = 360;

/** The speed between the low and the high, halfway between them: shown when motion is reduced. */
export const CRUISING_KMH = (SPEED_KMH.low + SPEED_KMH.high) / 2;

/** The speed at `seconds`: low at the start of each cycle, high halfway through. */
export function speedAt(seconds) {
    const swing = (SPEED_KMH.high - SPEED_KMH.low) / 2;
    return CRUISING_KMH - swing * Math.cos(2 * Math.PI * seconds / SPEED_KMH.cycleSeconds);
}

/** The needle's angle for `speed`, in degrees from straight up (negative to the left). */
export const needleAngle = speed => speed / DIAL.maxKmh * DIAL.sweepDegrees - DIAL.sweepDegrees / 2;

/** The wheels' angle after turning at `speed` for `seconds`, kept within one turn. */
export const turnWheels = (angle, speed, seconds) =>
    (angle + speed * WHEEL_DEGREES_PER_SECOND_PER_KMH * seconds) % FULL_TURN_DEGREES;

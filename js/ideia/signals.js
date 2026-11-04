// The traffic lights: one fixed cycle shared by cars and people.
//
//   main street green -> cross street green -> everyone walks (scramble) -> repeat
//
// A car may only enter the junction while it can still get through before its green ends
// (CLEARANCE seconds), so the junction is empty whenever the other street or the people go.

export const MAIN_GREEN = 14;
export const CROSS_GREEN = 12;
export const WALK = 14;
export const CYCLE = MAIN_GREEN + CROSS_GREEN + WALK;
export const CLEARANCE = 6.5;

const WALK_STARTS = MAIN_GREEN + CROSS_GREEN;

/** Which cycle this moment belongs to, and how far into it we are. */
export const cycleAt = seconds => ({
    number: Math.floor(seconds / CYCLE),
    elapsed: seconds - Math.floor(seconds / CYCLE) * CYCLE,
});

/** May a car of this street ("main" or "cross") enter the junction now? */
export function carsMayEnter(street, seconds) {
    const { elapsed } = cycleAt(seconds);
    if (street === "main") return elapsed < MAIN_GREEN - CLEARANCE;
    return elapsed >= MAIN_GREEN && elapsed < WALK_STARTS - CLEARANCE;
}

/** Seconds since people got the green in this cycle (negative while they wait). */
export const secondsIntoWalk = seconds => cycleAt(seconds).elapsed - WALK_STARTS;

// Seeded random numbers (mulberry32), so the same seed always gives the same city and crowd.

export function seededRandom(seed) {
    let state = seed;

    const next = () => {
        state = (state + 0x6D2B79F5) | 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };

    return {
        /** A number in [0, 1). */
        next,
        /** A number in [min, max). */
        range: (min, max) => min + next() * (max - min),
        /** An integer in [min, max]. */
        integer: (min, max) => min + Math.floor(next() * (max - min + 1)),
        /** One item of the list. */
        pick: list => list[Math.floor(next() * list.length)],
        /** True with the given probability. */
        chance: probability => next() < probability,
    };
}

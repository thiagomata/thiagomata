// The maths of the Macquarie card's wave field (drawn by js/water-field.js): about a hundred
// parallel lines, each point a sum of two cosine waves, with a band of light travelling through
// them. Scrolling stirs the field (faster, taller waves, brighter light) and it settles back.
//
// After the wave technique from desarrollolibre.net (canvas + requestAnimationFrame).

export const LINES = 110;
/** Distance between neighbouring lines at rest, in CSS pixels. */
const LINE_SPACING = 1.1;

/** Where a line starts at the left edge, before any wave: `offset` lines from the middle line at `top`. */
export const restingY = (offset, top) => top + offset * LINE_SPACING;
/** Points along each line are this far apart, in CSS pixels. */
export const POINT_SPACING = 10;
/** Each line starts a little left or right of the edge, so their ends don't line up. */
const START_STAGGER = 10;
/** Lines stretch to the right as if seen in perspective: x = along + STRETCH × along². */
const STRETCH = 0.008;
/** Lines run this far past the right edge, so they never end inside the card. */
const PAST_THE_EDGE = 20;

/** A long, slow swell (grows along the line) and a short ripple (grows with the line's offset). */
const SWELL = { slope: 0.22, length: 50, period: 50, lineShift: 118 };
const RIPPLE = { spread: 0.9, length: 25, period: 65 };

/** Stirred by scrolling, waves grow up to this many times taller than at rest. */
const STIRRED_EXTRA_HEIGHT = 1.4;

/** Each line has its own thickness and opacity, from a repeatable noise. */
const LINE_WIDTH = { thinnest: 0.6, range: 0.8, noiseStep: 7, noiseOffset: 2 };
const LINE_OPACITY = { faintest: 0.18, range: 0.2, noiseStep: 11, noiseOffset: 5 };
/** The travelling band of light: how far apart lines light up, and how sharp the band is. */
const LIGHT_BAND = { lineSpacing: 0.09, sharpness: 4, extraWhenStirred: 0.2 };

/** How the field reacts to scrolling: energy per pixel scrolled, and how fast it settles. */
const STIR_PER_PIXEL = 0.0025;
const SETTLE_MILLISECONDS = 1200;
/** How fast the light band and the waves move, at rest and fully stirred (per millisecond). */
export const SPEED = {
    light: { calm: 0.0006, stirred: 0.0046 },
    waves: { calm: 0.054, stirred: 0.18 },
};

/**
 * A repeatable noise between 0 and 1 for a whole number (the classic shader one-liner: the
 * fractional part of a large multiple of a sine). The same `seed` always gives the same value.
 */
const NOISE = { frequency: 127.1, phase: 311.7, amplitude: 43758.5453 };
export function noise(seed) {
    const value = Math.sin(seed * NOISE.frequency + NOISE.phase) * NOISE.amplitude;
    return value - Math.floor(value);
}

/** How far along a line must go to cross a card `width` pixels wide, given the stretch. */
export function pointsAcross(width) {
    // Solve STRETCH × along² + along = width + PAST_THE_EDGE + START_STAGGER for `along`: even a
    // line staggered to start left of the edge ends past the right edge.
    const reach = width + PAST_THE_EDGE + START_STAGGER;
    const along = (Math.sqrt(1 + 4 * STRETCH * reach) - 1) / (2 * STRETCH);
    return Math.min(width, Math.ceil(along));
}

/** The points along each line, POINT_SPACING apart, always ending at the last one needed. */
export function pointsAlong(width) {
    const lastPoint = pointsAcross(width);
    const points = [];
    for (let along = 0; along < lastPoint; along += POINT_SPACING) points.push(along);
    points.push(lastPoint);
    return points;
}

/** Line `line` (0 to LINES − 1): its thickness, and its opacity as the light band passes. */
export function lineStyle(line, lightPhase, energy, glow) {
    const width = LINE_WIDTH.thinnest + LINE_WIDTH.range * noise(line * LINE_WIDTH.noiseStep + LINE_WIDTH.noiseOffset);
    const resting = LINE_OPACITY.faintest + LINE_OPACITY.range * noise(line * LINE_OPACITY.noiseStep + LINE_OPACITY.noiseOffset);
    const inBand = Math.max(Math.sin(lightPhase - line * LIGHT_BAND.lineSpacing), 0) ** LIGHT_BAND.sharpness;
    return { width, opacity: resting + (glow + LIGHT_BAND.extraWhenStirred * energy) * inBand };
}

/**
 * Where a point of a line is. `offset` is the line's distance from the middle line (in lines),
 * `along` how far along the line it is (in pixels), `top` where the middle line sits.
 */
export function linePoint(offset, along, wavesClock, energy, top) {
    const height = 1 + STIRRED_EXTRA_HEIGHT * energy;
    const swell = along * SWELL.slope * height
        * Math.cos(along / SWELL.length - wavesClock / SWELL.period - offset / SWELL.lineShift);
    const ripple = offset * RIPPLE.spread * height
        * Math.cos(along / RIPPLE.length - (offset + wavesClock) / RIPPLE.period);
    return {
        x: START_STAGGER * Math.cos(offset) + along + STRETCH * along * along,
        y: restingY(offset, top) + swell + ripple,
    };
}

/** Scrolling `pixels` stirs the field, up to full energy (1). */
export const stir = (energy, pixels) => Math.min(1, energy + pixels * STIR_PER_PIXEL);

/** The field's energy after `milliseconds` without scrolling: it fades away smoothly. */
export const settle = (energy, milliseconds) => energy * Math.exp(-milliseconds / SETTLE_MILLISECONDS);

/** How far the light band and the waves move in `milliseconds`, at this energy. */
export const advance = (energy, milliseconds) => ({
    light: milliseconds * (SPEED.light.calm + (SPEED.light.stirred - SPEED.light.calm) * energy),
    waves: milliseconds * (SPEED.waves.calm + (SPEED.waves.stirred - SPEED.waves.calm) * energy),
});

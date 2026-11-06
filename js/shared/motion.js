// Small maths helpers for the animated backgrounds: interpolation, limits, and waves.

/** A full turn, in radians. */
export const FULL_TURN = 2 * Math.PI;

/** The value `share` of the way from `from` to `to` (share 0 gives `from`, 1 gives `to`). */
export const lerp = (from, to, share) => from + (to - from) * share;

/** `value`, kept between `lowest` and `highest`. */
export const clamp = (value, lowest, highest) => Math.min(Math.max(value, lowest), highest);

/** Starts and ends slowly, like CSS's ease-in-out (0 to 1 for a share 0 to 1 of the time). */
export const easeInOut = share => share * share * (3 - 2 * share);

/** A sine's value (-1 to 1) moved to the range 0 to 1. */
export const toUnitRange = sine => (sine + 1) / 2;

/**
 * A wave travelling across space: its value (-1 to 1) at `position` and time `seconds`, for crests
 * `width` apart that move one `width` forward every `period` seconds.
 */
export const travellingWave = (position, width, seconds, period) =>
    Math.sin(FULL_TURN * (position / width - seconds / period));

/** A slow pulse that repeats every `period` seconds, from 0 to 1, starting at `phase` radians. */
export const pulse = (seconds, period, phase) => toUnitRange(Math.sin(FULL_TURN * seconds / period + phase));

/**
 * How far a card has scrolled through the screen, from its box's `top` and `height` and the
 * screen's height: 0 as it enters at the bottom, 1 as it leaves at the top.
 */
export const scrollShare = (top, height, screenHeight) => clamp((screenHeight - top) / (screenHeight + height), 0, 1);

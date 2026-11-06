// Colours as [red, green, blue] (0 to 255 each), mixed and written as CSS, for the cards that
// blend one colour into another as they animate.
import { lerp } from "./motion.js";

/** A colour written as "#rrggbb", as [red, green, blue]. */
export const fromHex = hex => [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));

/** The colour `share` of the way from `from` to `to`, rounded to whole channel values. */
export const mixColour = (from, to, share) => from.map((channel, index) => Math.round(lerp(channel, to[index], share)));

/** A colour as CSS. */
export const cssColour = ([red, green, blue]) => `rgb(${red}, ${green}, ${blue})`;

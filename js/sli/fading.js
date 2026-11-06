// How the SLI card's balls change (drawn by js/sli-blobs.js): each colour change and each bridge
// growing or shrinking fades smoothly over a set time. The script redraws the fades at most 30
// times a second, instead of CSS transitions running at the screen's full rate.
import { clamp, easeInOut, lerp } from "../shared/motion.js";

/** The balls' colours, as [red, green, blue]. */
export const COLOURS = {
    grey: [0xBE, 0xBC, 0xBF],
    lavender: [0xBB, 0xB3, 0xDC],
    white: [0xFF, 0xFF, 0xFF],
};

/** How long a colour change and a bridge's growing or shrinking take. */
export const FADE_MILLISECONDS = { colour: 1800, size: 2200 };

/** How far through a fade that started at `startedAt` and lasts `duration` it is at `now`, from 0 to 1. */
export const fadeShare = (startedAt, now, duration) => clamp((now - startedAt) / duration, 0, 1);

/** The colour `share` of the way from `from` to `to`, rounded to whole channel values. */
export const mixColour = (from, to, share) => from.map((channel, index) => Math.round(lerp(channel, to[index], share)));

/** A colour as CSS. */
export const cssColour = ([red, green, blue]) => `rgb(${red}, ${green}, ${blue})`;

/**
 * A value that fades from where it is to a new target: `at(now)` gives its eased value, and
 * `settled(now)` says when it has arrived (and needs no more redrawing).
 */
export class Fade {
    constructor(value, duration, mix) {
        this.from = value;
        this.to = value;
        this.startedAt = -Infinity;
        this.duration = duration;
        this.mix = mix;
    }

    at(now) {
        return this.mix(this.from, this.to, easeInOut(fadeShare(this.startedAt, now, this.duration)));
    }

    settled(now) {
        return now - this.startedAt >= this.duration;
    }

    /** Heads for `target` from wherever the fade is at `now`. */
    towards(target, now) {
        this.from = this.at(now);
        this.to = target;
        this.startedAt = now;
    }
}

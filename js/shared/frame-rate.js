// How often the animated backgrounds redraw, and how sharp their canvases are. They sit behind
// text and move slowly, so 30 frames a second and 1.5 pixels per CSS pixel look the same as more,
// at a fraction of the cost (and battery).

export const FRAMES_PER_SECOND = 30;
export const MAX_PIXEL_RATIO = 1.5;
export const MILLISECONDS_PER_SECOND = 1000;

const MILLISECONDS_PER_FRAME = MILLISECONDS_PER_SECOND / FRAMES_PER_SECOND;
/** Browsers report frame times slightly early; allow a little slack so 60Hz screens draw every other frame. */
const SLACK_MILLISECONDS = 2;

/** Should a frame at `now` be drawn, given the last one drawn at `lastDrawn` (null if none yet)? */
export const isTimeToDraw = (now, lastDrawn, framesPerSecond = FRAMES_PER_SECOND) =>
    lastDrawn === null || now - lastDrawn >= MILLISECONDS_PER_SECOND / framesPerSecond - SLACK_MILLISECONDS;

/** Pixels per CSS pixel to draw at on this screen. */
export const pixelRatio = () => Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

export { MILLISECONDS_PER_FRAME };

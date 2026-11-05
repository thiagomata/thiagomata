// The northern lights over the windmills, after the photo that inspired the drawing: soft
// curtains of rays, magenta and violet on the left through blue to green lower down and to the
// right, rippling and drifting slowly, with faint stars in the gaps.
//
// The rays and stars are placed once and their brightness is worked out by pure functions; the
// Aurora class only draws them on a canvas laid over the picture, blended like light ("screen")
// so the drawing's own sky shows through. The windmills' silhouettes are cut out of it, so they
// stay dark.
import { MILLISECONDS_PER_SECOND, isTimeToDraw, pixelRatio } from "../shared/frame-rate.js";
import { FULL_TURN, pulse, toUnitRange, travellingWave } from "../shared/motion.js";
import { seededRandom } from "../shared/random.js";
import { PICTURE, WHOLE_PICTURE, fitToSlice, scaleToPicture } from "./picture.js";

const RAYS_SEED = 33;
const STARS_SEED = 34;

export const RAYS = 520;
const RAY_WIDTH = [10, 30];
/** How far rays reach down from the top, as shares of the picture's height. */
const RAY_LENGTH = [0.55, 0.8];
/** Rays are placed a little past the picture's sides, so its edges are covered too. */
const RAY_OVERHANG = 200;
/** Rays slant a little, as the curtains do in the photo (picture units across, per unit down). */
const SLANT = 0.06;
/**
 * The rays are drawn on a canvas this many times smaller and stretched to full size, which
 * softens them into blurred curtains (cheaper than a blur filter). Higher is softer.
 */
const RAY_SOFTNESS = 24;
/**
 * The aurora is soft and moves slowly, so it is redrawn less often and at a lower resolution than
 * the rest of the scene: nobody can tell the difference, and it costs a fraction.
 */
const AURORA_FRAMES_PER_SECOND = 10;
const AURORA_RESOLUTION = 0.5;

/** Slow waves across the sky: where the curtains are brighter, and how fast they drift. */
export const CURTAINS = [
    { widthUnits: 1500, secondsPerWidth: 40, weight: 0.55 },
    { widthUnits: 520, secondsPerWidth: 18, weight: 0.3 },
];
/** Each ray also pulses on its own, gently: how long a pulse takes, and how much it dims. */
const PULSE_SECONDS = [3, 9];
const PULSE_DIMMING = 0.35;
/** How strong the aurora is overall, at its brightest. */
const STRENGTH = 0.85;

/** Colours across the sky (left to right), from the photo: [position, colour]. */
const HUES = [
    [0, "#d0306f"],
    [0.22, "#b43cc0"],
    [0.42, "#6a52e0"],
    [0.58, "#3f7fe0"],
    [0.75, "#38c48a"],
    [1, "#7ae06a"],
];
/** How visible the aurora is from the top of the picture down to the horizon: [position, opacity]. */
const FADE = [
    [0, 0.5],
    [0.25, 0.75],
    [0.55, 0.65],
    [0.7, 0.3],
    [0.79, 0],
];
/** Lower in the sky the curtains turn greener: between these heights, towards this colour. */
const GREENER_LOWER = { from: 0.35, to: 0.72, colour: "rgba(90, 225, 120, 0.55)" };
const TRANSPARENT = "rgba(0, 0, 0, 0)";
/** The colour map is small and stretched: colours change slowly, so detail would be wasted. */
const COLOUR_MAP_SCALE = 4;

export const STARS = 140;
/** Stars only shine high in the sky, above this share of the picture's height. */
export const STAR_SKY_BOTTOM = 0.62;
const STAR_RADIUS = [1.5, 3.5];
const STAR_TWINKLE_SECONDS = [2, 6];
/** A star's opacity twinkles between its dimmest and its dimmest plus this. */
const STAR_OPACITY = { dimmest: 0.35, twinkle: 0.45 };
const WHITE = "#fff";

/** How bright the curtains are at `x`: slow waves drifting across the sky (0 to the weights' sum). */
export function curtainBrightness(x, seconds) {
    return CURTAINS.reduce(
        (total, curtain) =>
            total + curtain.weight * toUnitRange(travellingWave(x, curtain.widthUnits, seconds, curtain.secondsPerWidth)),
        0,
    );
}

/** The rays, from a seeded random stream: the same sky on every visit. */
export function placeRays(random = seededRandom(RAYS_SEED)) {
    return Array.from({ length: RAYS }, () => ({
        x: random.range(-RAY_OVERHANG, PICTURE.width + RAY_OVERHANG),
        width: random.range(...RAY_WIDTH),
        length: random.range(...RAY_LENGTH) * PICTURE.height,
        pulseSeconds: random.range(...PULSE_SECONDS),
        pulsePhase: random.range(0, FULL_TURN),
    }));
}

/** The stars, from their own seeded stream. */
export function placeStars(random = seededRandom(STARS_SEED)) {
    return Array.from({ length: STARS }, () => ({
        x: random.range(0, PICTURE.width),
        y: random.range(0, STAR_SKY_BOTTOM * PICTURE.height),
        radius: random.range(...STAR_RADIUS),
        twinkleSeconds: random.range(...STAR_TWINKLE_SECONDS),
        twinklePhase: random.range(0, FULL_TURN),
    }));
}

/** How opaque a ray is at `seconds`: its curtain's brightness, dimmed by its own pulse. */
export function rayOpacity(ray, seconds) {
    const ownPulse = 1 - PULSE_DIMMING * pulse(seconds, ray.pulseSeconds, ray.pulsePhase);
    return Math.min(1, STRENGTH * curtainBrightness(ray.x, seconds) * ownPulse);
}

/** How opaque a star is at `seconds`, as it twinkles. */
export const starOpacity = (star, seconds) =>
    STAR_OPACITY.dimmest + STAR_OPACITY.twinkle * pulse(seconds, star.twinkleSeconds, star.twinklePhase);

/** A canvas of the given size in pixels, with its 2D context. */
function newCanvas(widthPixels, heightPixels) {
    const canvas = document.createElement("canvas");
    canvas.width = widthPixels;
    canvas.height = heightPixels;
    return { canvas, context: canvas.getContext("2d") };
}

/** A small canvas with the aurora's colours and their fade towards the horizon. */
function colourMap() {
    const { canvas, context } = newCanvas(
        Math.round(PICTURE.width / COLOUR_MAP_SCALE), Math.round(PICTURE.height / COLOUR_MAP_SCALE),
    );
    const across = context.createLinearGradient(0, 0, canvas.width, 0);
    for (const [position, colour] of HUES) across.addColorStop(position, colour);
    context.fillStyle = across;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const greener = context.createLinearGradient(0, 0, 0, canvas.height);
    greener.addColorStop(GREENER_LOWER.from, TRANSPARENT);
    greener.addColorStop(GREENER_LOWER.to, GREENER_LOWER.colour);
    context.fillStyle = greener;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const fade = context.createLinearGradient(0, 0, 0, canvas.height);
    for (const [position, opacity] of FADE) fade.addColorStop(position, `rgba(0, 0, 0, ${opacity})`);
    context.globalCompositeOperation = "destination-in";
    context.fillStyle = fade;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
}

export class Aurora {
    /** Adds the aurora's canvas to `container`; `windmillsImage` is cut out so they stay dark. */
    constructor(container, windmillsImage) {
        const { canvas, context } = newCanvas(1, 1);
        this.canvas = canvas;
        this.context = context;
        this.canvas.className = "windmill-aurora";
        this.canvas.setAttribute("aria-hidden", "true");
        this.colours = colourMap();
        this.soft = newCanvas(Math.round(PICTURE.width / RAY_SOFTNESS), Math.round(PICTURE.height / RAY_SOFTNESS));
        this.windmills = new Image();
        // Frames drawn before the windmills load can't cut them out: redraw the last one once they do
        // (with reduced motion, it is the only frame).
        this.windmills.addEventListener("load", () => {
            if (this.lastSeconds !== null) this.draw(this.lastSeconds);
        }, { once: true });
        this.windmills.src = windmillsImage;
        this.rays = placeRays();
        this.stars = placeStars();
        this.lastDrawn = null;
        this.lastSeconds = null;
        this.slice = WHOLE_PICTURE;
        container.append(this.canvas);
    }

    /** Sizes the canvas to the `slice` of the picture the card shows (picture.js). */
    resize(slice, heightPixels) {
        this.slice = slice;
        fitToSlice(this.canvas, slice, heightPixels, pixelRatio() * AURORA_RESOLUTION);
        this.lastDrawn = null;            // a resized canvas is blank: draw on the next frame
    }

    /** Draws the aurora for `seconds`, unless it was drawn less than a tenth of a second ago. */
    drawIfDue(seconds) {
        const now = seconds * MILLISECONDS_PER_SECOND;
        if (!isTimeToDraw(now, this.lastDrawn, AURORA_FRAMES_PER_SECOND)) return;
        this.lastDrawn = now;
        this.draw(seconds);
    }

    draw(seconds) {
        this.lastSeconds = seconds;
        this.drawSoftRays(seconds);
        const { context, canvas } = this;
        scaleToPicture(context, canvas, this.slice);
        context.globalCompositeOperation = "source-over";
        context.clearRect(0, 0, PICTURE.width, PICTURE.height);
        // Stretching the small canvas to full size is what blurs the rays.
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(this.soft.canvas, 0, 0, PICTURE.width, PICTURE.height);
        this.drawStars(seconds);
        this.cutOutWindmills();
    }

    /** The rays on the small canvas: white shapes as opaque as they are bright, then coloured. */
    drawSoftRays(seconds) {
        const { canvas, context } = this.soft;
        scaleToPicture(context, canvas);
        context.globalCompositeOperation = "source-over";
        context.clearRect(0, 0, PICTURE.width, PICTURE.height);
        context.fillStyle = WHITE;
        for (const ray of this.rays) {
            context.globalAlpha = rayOpacity(ray, seconds);
            const slantAtBottom = SLANT * ray.length;
            context.beginPath();
            context.moveTo(ray.x, 0);
            context.lineTo(ray.x + ray.width, 0);
            context.lineTo(ray.x + ray.width + slantAtBottom, ray.length);
            context.lineTo(ray.x + slantAtBottom, ray.length);
            context.fill();
        }
        context.globalAlpha = 1;
        // The colour map colours the rays and fades them out towards the horizon.
        context.globalCompositeOperation = "source-in";
        context.drawImage(this.colours, 0, 0, PICTURE.width, PICTURE.height);
    }

    /** Stars behind the rays, so they show in the gaps. */
    drawStars(seconds) {
        const { context } = this;
        context.globalCompositeOperation = "destination-over";
        context.fillStyle = WHITE;
        for (const star of this.stars) {
            context.globalAlpha = starOpacity(star, seconds);
            context.beginPath();
            context.arc(star.x, star.y, star.radius, 0, FULL_TURN);
            context.fill();
        }
        context.globalAlpha = 1;
    }

    /** The windmills cut out, so the light never falls on them. */
    cutOutWindmills() {
        const { context } = this;
        if (this.windmills.complete && this.windmills.naturalWidth) {
            context.globalCompositeOperation = "destination-out";
            context.drawImage(this.windmills, 0, 0, PICTURE.width, PICTURE.height);
        }
        context.globalCompositeOperation = "source-over";
    }
}

// The windmills' field grass, drawn on 2D canvases and bent by the wind (js/windmills/wind.js),
// in the style of the original drawing: thin tapering blades in the drawing's greens, some with
// curled tips.
//
// The grass comes in two layers so it can grow both behind and in front of the windmills: blades
// rooted behind a windmill (further up the picture than its base, within the reach of its sails)
// go in the back layer, drawn under the windmill and its sails; all the others go in front.
//
// Blades are placed once, from a seeded random stream, in picture units (the picture's viewBox
// is 4294 x 2474); the canvas is scaled so those units fill it.
import { seededRandom } from "../ideia/random.js";
import { windAt } from "./wind.js";

const PICTURE = { width: 4294, height: 2474 };
const HORIZON_Y = 1950;
const BLADES = 1400;
const GRASS_SEED = 21;

/** Blades grow taller towards the viewer (lower in the picture). */
const HEIGHT = { atHorizon: [25, 60], atBottom: [160, 330] };
const BASE_WIDTH = { atHorizon: 2, atBottom: 9 };
/** How far the wind bends a blade's tip, as a share of its height. */
const BEND = { calm: 0.05, gust: 0.32 };
const STIFFNESS = [0.6, 1.4];
const CURLED_SHARE = 0.3;

const COLOURS = ["#363C20", "#363C20", "#616A41", "#6F8131", "#4B5428"];   // from the drawing

/** Each windmill's reach across the picture (its sails' span) and the bottom of its base. */
const WINDMILLS = [
    { left: 1300, right: 1900, baseY: 2094 },
    { left: 2450, right: 3400, baseY: 2304 },
];
const growsBehindAWindmill = blade =>
    WINDMILLS.some(mill => blade.x > mill.left && blade.x < mill.right && blade.y < mill.baseY);

/** The road runs from the horizon to the bottom edge; no grass grows on it. */
const ROAD = { topX: 2330, bottomX: 2330, topHalfWidth: 20, bottomHalfWidth: 150 };

const lerp = (a, b, share) => a + (b - a) * share;
const onRoad = (x, y) => {
    const depth = (y - HORIZON_Y) / (PICTURE.height - HORIZON_Y);
    return Math.abs(x - lerp(ROAD.topX, ROAD.bottomX, depth)) < lerp(ROAD.topHalfWidth, ROAD.bottomHalfWidth, depth);
};

function plantBlades() {
    const random = seededRandom(GRASS_SEED);
    const blades = [];
    while (blades.length < BLADES) {
        // More blades near the viewer: depth is skewed towards the bottom of the picture.
        const depth = Math.sqrt(random.next());
        const x = random.range(-50, PICTURE.width + 50);
        const y = lerp(HORIZON_Y, PICTURE.height + 40, depth);
        if (onRoad(x, y)) continue;
        blades.push({
            x, y, depth,
            height: lerp(random.range(...HEIGHT.atHorizon), random.range(...HEIGHT.atBottom), depth),
            width: lerp(BASE_WIDTH.atHorizon, BASE_WIDTH.atBottom, depth),
            lean: random.range(-0.25, 0.25),          // its own slant, before the wind
            stiffness: random.range(...STIFFNESS),
            curled: random.chance(CURLED_SHARE),
            colour: random.pick(COLOURS),
        });
    }
    return blades.sort((a, b) => a.y - b.y);          // far blades first, near ones on top
}

/** One blade: a tapering curve from the root, bent sideways by the wind at its spot. */
function drawBlade(context, blade, seconds) {
    const wind = windAt(blade.x, seconds);
    const bend = (BEND.calm + (BEND.gust - BEND.calm) * wind) / blade.stiffness;
    const tipX = blade.x + blade.height * (blade.lean + bend);
    const tipY = blade.y - blade.height * (1 - 0.35 * Math.abs(blade.lean + bend));
    const middleX = blade.x + (tipX - blade.x) * 0.25;
    const middleY = blade.y - blade.height * 0.6;
    const half = blade.width / 2;

    context.fillStyle = blade.colour;
    context.beginPath();
    context.moveTo(blade.x - half, blade.y);
    context.quadraticCurveTo(middleX - half * 0.6, middleY, tipX, tipY);
    context.quadraticCurveTo(middleX + half * 0.6, middleY, blade.x + half, blade.y);
    context.fill();

    if (blade.curled) {
        // A small hook at the tip, falling the way the blade bends.
        const side = Math.sign(tipX - blade.x) || 1;
        const hook = blade.height * 0.12;
        context.strokeStyle = blade.colour;
        context.lineWidth = Math.max(half * 0.5, 0.8);
        context.beginPath();
        context.moveTo(tipX, tipY);
        context.quadraticCurveTo(tipX + side * hook, tipY - hook * 0.4, tipX + side * hook * 0.9, tipY + hook * 0.7);
        context.stroke();
    }
}

/** All the field's blades, planted once and shared by both layers. */
const FIELD = plantBlades();

export class Grass {
    /** `layer` is "back" (behind the windmills) or "front"; the canvas is added to `container`. */
    constructor(container, layer) {
        this.canvas = document.createElement("canvas");
        this.canvas.className = `windmill-grass ${layer}`;
        this.canvas.setAttribute("aria-hidden", "true");
        this.context = this.canvas.getContext("2d");
        this.blades = FIELD.filter(blade => growsBehindAWindmill(blade) === (layer === "back"));
        container.append(this.canvas);
    }

    resize(width, height) {
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        this.canvas.width = Math.round(width * pixelRatio);
        this.canvas.height = Math.round(height * pixelRatio);
    }

    draw(seconds) {
        const { context, canvas } = this;
        context.setTransform(canvas.width / PICTURE.width, 0, 0, canvas.height / PICTURE.height, 0, 0);
        context.clearRect(0, 0, PICTURE.width, PICTURE.height);
        context.lineCap = "round";
        for (const blade of this.blades) drawBlade(context, blade, seconds);
    }
}

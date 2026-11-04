// The windmills' field grass, bent by the wind (js/windmills/wind.js), in the style of the
// original drawing: thin tapering blades in the drawing's greens, some with curled tips.
//
// The blades are planted once (`plantBlades`) and bent by a pure function (`bladeShape`); the
// Grass class only draws them on a canvas. The grass comes in two layers so it can grow both
// behind and in front of the windmills: blades rooted behind a windmill go in the back layer,
// drawn under the windmill and its sails; all the others go in front.
import { lerp } from "../shared/motion.js";
import { seededRandom } from "../shared/random.js";
import { HORIZON_Y, MAX_PIXEL_RATIO, PICTURE, isBehindAWindmill, isOnRoad, scaleToPicture } from "./picture.js";
import { windAt } from "./wind.js";

export const BLADES = 1400;
const GRASS_SEED = 21;

/** Blades grow taller and wider towards the viewer (lower in the picture). */
export const HEIGHT = { atHorizon: [25, 60], atBottom: [160, 330] };
const BASE_WIDTH = { atHorizon: 2, atBottom: 9 };
/** A blade's own slant, before the wind, as a share of its height. */
const LEAN = [-0.25, 0.25];
/** How far the wind bends a blade's tip, as a share of its height, in calm air and a full gust. */
const BEND = { calm: 0.05, gust: 0.32 };
/** Stiffer blades bend less. */
const STIFFNESS = [0.6, 1.4];
const CURLED_SHARE = 0.3;
/** Blades are planted a little past the picture's sides and bottom, so its edges are covered. */
const OVERHANG = { sides: 50, bottom: 40 };

const COLOURS = ["#363C20", "#363C20", "#616A41", "#6F8131", "#4B5428"];   // from the drawing

// The shape of a blade: where its curve bends, and how its tip hooks when it is curled.
const BLADE_CURVE = { middleHeight: 0.6, middleShare: 0.25, edgeShare: 0.6, droopPerBend: 0.35 };
const HOOK = { share: 0.12, rise: 0.4, reach: 0.9, fall: 0.7, widthShare: 0.5, minimumWidth: 0.8 };
/** A blade with no bend at all still hooks one way: to the right. */
const RIGHT = 1;

/** The field's blades, from a seeded random stream: the same field on every visit. */
export function plantBlades() {
    const random = seededRandom(GRASS_SEED);
    const blades = [];
    while (blades.length < BLADES) {
        // More blades near the viewer: depth is skewed towards the bottom of the picture.
        const nearness = Math.sqrt(random.next());
        const x = random.range(-OVERHANG.sides, PICTURE.width + OVERHANG.sides);
        const y = lerp(HORIZON_Y, PICTURE.height + OVERHANG.bottom, nearness);
        if (isOnRoad(x, y)) continue;
        blades.push({
            x,
            y,
            height: lerp(random.range(...HEIGHT.atHorizon), random.range(...HEIGHT.atBottom), nearness),
            width: lerp(BASE_WIDTH.atHorizon, BASE_WIDTH.atBottom, nearness),
            lean: random.range(...LEAN),
            stiffness: random.range(...STIFFNESS),
            curled: random.chance(CURLED_SHARE),
            colour: random.pick(COLOURS),
        });
    }
    return blades.sort((first, second) => first.y - second.y);     // far blades first, near ones cover them
}

/** Where a blade's tip and the middle of its curve are, bent by the wind at its spot. */
export function bladeShape(blade, seconds) {
    const bend = lerp(BEND.calm, BEND.gust, windAt(blade.x, seconds)) / blade.stiffness;
    const slant = blade.lean + bend;
    const tip = {
        x: blade.x + blade.height * slant,
        y: blade.y - blade.height * (1 - BLADE_CURVE.droopPerBend * Math.abs(slant)),
    };
    const middle = {
        x: blade.x + (tip.x - blade.x) * BLADE_CURVE.middleShare,
        y: blade.y - blade.height * BLADE_CURVE.middleHeight,
    };
    return { tip, middle };
}

function drawBlade(context, blade, seconds) {
    const { tip, middle } = bladeShape(blade, seconds);
    const half = blade.width / 2;
    const edge = half * BLADE_CURVE.edgeShare;

    context.fillStyle = blade.colour;
    context.beginPath();
    context.moveTo(blade.x - half, blade.y);
    context.quadraticCurveTo(middle.x - edge, middle.y, tip.x, tip.y);
    context.quadraticCurveTo(middle.x + edge, middle.y, blade.x + half, blade.y);
    context.fill();

    if (blade.curled) {
        // A small hook at the tip, falling the way the blade bends.
        const side = Math.sign(tip.x - blade.x) || RIGHT;
        const hook = blade.height * HOOK.share;
        context.strokeStyle = blade.colour;
        context.lineWidth = Math.max(half * HOOK.widthShare, HOOK.minimumWidth);
        context.beginPath();
        context.moveTo(tip.x, tip.y);
        context.quadraticCurveTo(
            tip.x + side * hook, tip.y - hook * HOOK.rise,
            tip.x + side * hook * HOOK.reach, tip.y + hook * HOOK.fall,
        );
        context.stroke();
    }
}

/** All the field's blades, planted once and shared by both layers. */
const FIELD = plantBlades();

/** Which blades belong to a layer: "back" (behind a windmill) or "front" (all the others). */
export const bladesFor = (layer, blades = FIELD) =>
    blades.filter(blade => isBehindAWindmill(blade.x, blade.y) === (layer === "back"));

export class Grass {
    /** A canvas for one layer of the grass ("back" or "front"), added to `container`. */
    constructor(container, layer) {
        this.canvas = document.createElement("canvas");
        this.canvas.className = `windmill-grass ${layer}`;
        this.canvas.setAttribute("aria-hidden", "true");
        this.context = this.canvas.getContext("2d");
        this.blades = bladesFor(layer);
        container.append(this.canvas);
    }

    resize(widthPixels, heightPixels) {
        const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
        this.canvas.width = Math.round(widthPixels * pixelRatio);
        this.canvas.height = Math.round(heightPixels * pixelRatio);
    }

    draw(seconds) {
        const { context, canvas } = this;
        scaleToPicture(context, canvas);
        context.clearRect(0, 0, PICTURE.width, PICTURE.height);
        context.lineCap = "round";
        for (const blade of this.blades) drawBlade(context, blade, seconds);
    }
}

// The "Perceptions of Probability" card's live chart: how people read a phrase as a probability
// (survey.js), morphing from phrase to phrase, from "Almost No Chance" to "Almost Certainly". It
// comes in two forms: a smoothed curve, or a histogram of the answers with a colour for each phrase
// (from one palette, blending as the bars morph). It keeps the static picture's look
// (img/project-probability.svg) and draws at most 30 frames a second, only while the card is on
// screen; with reduced motion, it shows one phrase, still.
import { MILLISECONDS_PER_SECOND, isTimeToDraw } from "../shared/frame-rate.js";
import { cssColour, fromHex, mixColour } from "../shared/colour.js";
import { clamp, easeInOut } from "../shared/motion.js";
import { curvePoints, fitView, mixCurves, smooth, smoothPath, toPeak } from "./curve.js";
import { ANSWERS } from "./survey.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
/**
 * The phrases shown, in turn (after the last, back to the first), and each one's colour in the
 * histogram: one palette, from blue-teal (unlikely) through the card's mint (about even) to lime
 * (certain).
 */
const PHRASE_COLOURS = {
    "Almost No Chance": "#5fa8c7",
    "Unlikely": "#6cb8c4",
    "We Doubt": "#7cc6bd",
    "About Even": "#91d3b8",
    "Probably": "#a8dba0",
    "Almost Certainly": "#c3e08a",
};
const PHRASES = Object.keys(PHRASE_COLOURS);
/** With reduced motion, this phrase shows, still. */
const STILL_PHRASE = "Probably";
/** Each phrase holds, then morphs into the next. */
const HOLD_SECONDS = 2.6;
const MORPH_SECONDS = 1.4;

/** The static picture's drawing and chart, in its units (1600 × 670, the chart on the right). */
const DESIGN = { width: 1600, height: 670 };
const CHART = { left: 790, top: 150, width: 720, height: 370 };
const AXES = { baseline: 520, left: 810, right: 1510, top: 160 };
/** The curve, inside the axes: 0% on the vertical axis, 100% at the horizontal one's end. */
const CURVE = { left: AXES.left, top: 190, width: AXES.right - AXES.left, height: AXES.baseline - 190 };
/** Kept around the chart on every card. */
const MARGIN = 60;
/**
 * The chart's colours, as CSS: each can be set by a CSS variable on the card (light mode does, in
 * style.css), falling back to the static picture's dark look.
 */
const COLOURS = {
    stroke: "var(--probability-stroke, #91d3b8)",
    from: "var(--probability-from, #10171c)",
    to: "var(--probability-to, #202c36)",
};
const STROKE_WIDTH = 3;
const OPACITY = 0.5;
/** Each bar takes this share of its slot; the rest is the gap between bars. */
const BAR_SHARE = 0.72;
const BAR_OPACITY = 0.75;
/** The background reaches far past the drawing, for cards taller or wider than it. */
const BACKGROUND_REACH = 4000;

/** Each phrase's curve, smoothed and scaled to one height; and its answers as they are, for the bars. */
const CURVES = Object.fromEntries(PHRASES.map(phrase => [phrase, toPeak(smooth(ANSWERS[phrase]))]));
const HISTOGRAMS = Object.fromEntries(PHRASES.map(phrase => [phrase, toPeak(ANSWERS[phrase])]));
const BAR_COLOURS = Object.fromEntries(PHRASES.map(phrase => [phrase, fromHex(PHRASE_COLOURS[phrase])]));

function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NAMESPACE, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
}

/** The chart's elements: background, axes, and the curve or the bars (one per probability answered). */
function chart(form) {
    const svg = svgElement("svg", { class: "probability-chart", "aria-hidden": "true" });
    const gradient = svgElement("linearGradient", { id: "probability-background" });
    gradient.append(svgElement("stop", { style: `stop-color: ${COLOURS.from}` }), svgElement("stop", { offset: 1, style: `stop-color: ${COLOURS.to}` }));
    const defs = svgElement("defs");
    defs.append(gradient);
    const background = svgElement("rect", {
        x: -BACKGROUND_REACH, y: -BACKGROUND_REACH, width: DESIGN.width + 2 * BACKGROUND_REACH, height: DESIGN.height + 2 * BACKGROUND_REACH,
        fill: "url(#probability-background)",
    });
    const lines = svgElement("g", { fill: "none", style: `stroke: ${COLOURS.stroke}`, "stroke-width": STROKE_WIDTH, opacity: OPACITY });
    lines.append(svgElement("path", { d: `M${AXES.left - 20} ${AXES.baseline}H${AXES.right} M${AXES.left} ${AXES.baseline}V${AXES.top}` }));
    const curve = form === "curve" ? lines.appendChild(svgElement("path")) : null;
    const barGroup = svgElement("g", { opacity: BAR_OPACITY });
    const slot = CURVE.width / ANSWERS[PHRASES[0]].length;
    const bars = form === "bars" ? ANSWERS[PHRASES[0]].map((_, index) => barGroup.appendChild(svgElement("rect", {
        x: (CURVE.left + slot * (index + (1 - BAR_SHARE) / 2)).toFixed(1), width: (slot * BAR_SHARE).toFixed(1),
    }))) : [];
    svg.append(defs, background, barGroup, lines);
    return { svg, curve, barGroup, bars };
}

/** Which phrase is showing at `seconds`, which is next, and how far the morph between them is (0 to 1). */
function moment(seconds) {
    const period = HOLD_SECONDS + MORPH_SECONDS;
    const step = Math.floor(seconds / period);
    const into = seconds - step * period;
    const current = PHRASES[step % PHRASES.length];
    const next = PHRASES[(step + 1) % PHRASES.length];
    return { current, next, share: easeInOut(clamp((into - HOLD_SECONDS) / MORPH_SECONDS, 0, 1)) };
}

/** Draws the chart between `current` and `next` phrases, `share` of the way. */
function draw({ curve, barGroup, bars }, { current, next, share }) {
    if (curve) {
        const values = mixCurves(CURVES[current], CURVES[next], share);
        curve.setAttribute("d", smoothPath(curvePoints(values, CURVE), CURVE));
    }
    if (bars.length) {
        const values = mixCurves(HISTOGRAMS[current], HISTOGRAMS[next], share);
        values.forEach((value, index) => {
            const height = value * CURVE.height;
            bars[index].setAttribute("y", (AXES.baseline - height).toFixed(1));
            bars[index].setAttribute("height", height.toFixed(1));
        });
        barGroup.setAttribute("fill", cssColour(mixColour(BAR_COLOURS[current], BAR_COLOURS[next], share)));
    }
}

/** Draws the live chart behind `card`'s text, in place of its static picture, as a "curve" or as "bars". */
export function start(card, { form = "curve" } = {}) {
    const parts = chart(form);
    card.prepend(parts.svg);
    card.classList.add("probability-live");

    const resize = () => {
        if (!card.clientWidth || !card.clientHeight) return;
        const view = fitView(card.clientWidth / card.clientHeight, DESIGN, CHART, MARGIN);
        parts.svg.setAttribute("viewBox", [view.left, view.top, view.width, view.height].map(value => value.toFixed(1)).join(" "));
    };
    new ResizeObserver(resize).observe(card);
    resize();

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = false, frameRequest = null, lastDrawn = null;
    const frame = now => {
        frameRequest = onScreen && !still.matches ? requestAnimationFrame(frame) : null;
        if (!isTimeToDraw(now, lastDrawn)) return;
        lastDrawn = now;
        draw(parts, moment(now / MILLISECONDS_PER_SECOND));
    };
    const update = () => {
        if (still.matches) {
            draw(parts, { current: STILL_PHRASE, next: STILL_PHRASE, share: 0 });
            window.logAnimation?.("probability", "still", "reduced motion");
        } else if (onScreen) {
            if (frameRequest === null) {
                lastDrawn = null;
                frameRequest = requestAnimationFrame(frame);
            }
            window.logAnimation?.("probability", "running");
        } else {
            window.logAnimation?.("probability", "paused", "off screen");
        }
    };
    draw(parts, moment(performance.now() / MILLISECONDS_PER_SECOND));
    new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        update();
    }).observe(card);
    still.addEventListener("change", update);
}

// The "Perceptions of Probability" card's live chart: how people read a phrase as a probability
// (survey.js), as a curve that morphs from phrase to phrase, from "Almost No Chance" to "Almost
// Certainly", with the phrase above its peak and dashed lines at the answers' median and quartiles.
// It keeps the static picture's look (img/project-probability.svg) and draws at most 30 frames a
// second, only while the card is on screen; with reduced motion, it shows one phrase, still.
import { MILLISECONDS_PER_SECOND, isTimeToDraw } from "../shared/frame-rate.js";
import { clamp, easeInOut } from "../shared/motion.js";
import { curvePoints, fitView, mixCurves, quantile, smooth, smoothPath, toPeak } from "./curve.js";
import { ANSWERS, PROBABILITIES } from "./survey.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
/** The phrases shown, in turn; after the last, back to the first. */
const PHRASES = ["Almost No Chance", "Unlikely", "We Doubt", "About Even", "Probably", "Almost Certainly"];
/** With reduced motion, this phrase shows, still. */
const STILL_PHRASE = "Probably";
/** Each phrase holds, then morphs into the next. */
const HOLD_SECONDS = 2.6;
const MORPH_SECONDS = 1.4;

/** The static picture's drawing and chart, in its units (1600 × 670, the chart on the right). */
const DESIGN = { width: 1600, height: 670 };
/** The chart, with room above it for the phrase over the highest peak. */
const CHART = { left: 790, top: 120, width: 720, height: 400 };
/** The curve, inside the chart: its baseline and its highest peak. */
const CURVE = { left: 800, top: 190, width: 700, height: 325 };
const AXES = { baseline: 520, left: 810, right: 1510, top: 160 };
/** Kept around the chart, so the phrase above a peak at either end still fits. */
const MARGIN = 60;
const LABEL = { above: 26, size: 30 };
const COLOURS = { stroke: "#91d3b8", from: "#10171c", to: "#202c36" };
const STROKE_WIDTH = 3;
const DASHES = "6 9";
/** The dashed lines: where a quarter, half and three quarters of the answers fall below. */
const QUARTILES = [0.25, 0.5, 0.75];
const OPACITY = 0.5;
const LABEL_OPACITY = 0.85;
/** The background reaches far past the drawing, for cards taller or wider than it. */
const BACKGROUND_REACH = 4000;

/** Each phrase's curve, smoothed and scaled to one height. */
const CURVES = Object.fromEntries(PHRASES.map(phrase => [phrase, toPeak(smooth(ANSWERS[phrase]))]));

/** A probability (in %) as a position across the curve. */
const across = probability => CURVE.left + CURVE.width * probability / 100;

function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NAMESPACE, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
}

/** The chart's elements: background, axes, curve, dashed lines and the phrase. */
function chart() {
    const svg = svgElement("svg", { class: "probability-chart", "aria-hidden": "true" });
    const gradient = svgElement("linearGradient", { id: "probability-background" });
    gradient.append(svgElement("stop", { "stop-color": COLOURS.from }), svgElement("stop", { offset: 1, "stop-color": COLOURS.to }));
    const defs = svgElement("defs");
    defs.append(gradient);
    const background = svgElement("rect", {
        x: -BACKGROUND_REACH, y: -BACKGROUND_REACH, width: DESIGN.width + 2 * BACKGROUND_REACH, height: DESIGN.height + 2 * BACKGROUND_REACH,
        fill: "url(#probability-background)",
    });
    const lines = svgElement("g", { fill: "none", stroke: COLOURS.stroke, "stroke-width": STROKE_WIDTH, opacity: OPACITY });
    lines.append(svgElement("path", { d: `M${AXES.left - 20} ${AXES.baseline}H${AXES.right} M${AXES.left} ${AXES.baseline}V${AXES.top}` }));
    const curve = svgElement("path");
    const dashes = svgElement("path", { "stroke-dasharray": DASHES });
    lines.append(curve, dashes);
    const label = svgElement("text", {
        fill: COLOURS.stroke, "font-family": "Roboto, sans-serif", "font-size": LABEL.size, "text-anchor": "middle",
    });
    svg.append(defs, background, lines, label);
    return { svg, curve, dashes, label };
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

/** Draws the curve between `current` and `next` phrases, `share` of the way. */
function draw({ curve, dashes, label }, { current, next, share }) {
    const values = mixCurves(CURVES[current], CURVES[next], share);
    const points = curvePoints(values, CURVE);
    curve.setAttribute("d", smoothPath(points));
    const quartiles = QUARTILES.map(fraction => across(quantile(PROBABILITIES, values, fraction)));
    dashes.setAttribute("d", quartiles.map(position => `M${position.toFixed(1)} ${AXES.baseline}V${CURVE.top + CURVE.height / 2}`).join(" "));
    // The phrase above the peak: the one leaving fades out, then the one arriving fades in.
    const [peakX, peakY] = points.reduce((highest, point) => (point[1] < highest[1] ? point : highest));
    label.textContent = share < 0.5 ? current : next;
    label.setAttribute("x", peakX.toFixed(1));
    label.setAttribute("y", (peakY - LABEL.above).toFixed(1));
    label.setAttribute("opacity", (LABEL_OPACITY * Math.abs(1 - 2 * share)).toFixed(2));
}

/** Draws the live chart behind `card`'s text, in place of its static picture. */
export function start(card) {
    const parts = chart();
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

// The Macquarie card's wave field on a canvas: parallel lines rippling like water, with a band of
// light travelling through them; scrolling stirs it and it settles back. The maths lives in
// js/macquarie/waves.js; this file only draws it, at most 30 times a second, while the card is on
// screen. The card keeps its static image as the no-JS fallback; reduced motion keeps one still
// frame.
import { MILLISECONDS_PER_FRAME, isTimeToDraw, pixelRatio } from "./shared/frame-rate.js";
import { scrollShare } from "./shared/motion.js";
import {
    LINES, advance, linePoint, lineStyle, pointsAlong, restingY, settle, stir,
} from "./macquarie/waves.js";

const DEFAULTS = {
    stroke: "#c3b9a6",
    background: ["#111315", "#1c1d1e"],                // a diagonal gradient
    /** The lines fade in from left to right, staying quiet under the card's text: [position, opacity]. */
    fade: [[0.30, 0], [0.65, 0.5], [1, 1]],
    glow: 0.45,                                        // how bright the band of light is
    middleLine: 0.55,                                  // where the middle line sits, as a share of the height
};
/** Scrolling past the card moves the field up or down by this much at most, in pixels. */
const SCROLL_DRIFT = 60;
const MIDDLE = 0.5;
/** After a pause, carry on instead of jumping ahead. */
const MAX_STEP_MILLISECONDS = 4 * MILLISECONDS_PER_FRAME;

/** How far the card has scrolled through the screen: 0 entering at the bottom, 1 leaving at the top. */
function scrollProgress(card) {
    const box = card.getBoundingClientRect();
    return scrollShare(box.top, box.height, window.innerHeight);
}

/** The stroke colour with each fade stop's opacity, as a CSS rgba(). */
function rgba(hexColour, opacity) {
    const [red, green, blue] = [1, 3, 5].map(start => parseInt(hexColour.slice(start, start + 2), 16));
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function start(card, options = {}) {
    if (!card) return;
    const settings = { ...DEFAULTS, ...options };
    const name = card.dataset.company || "water";

    const canvas = document.createElement("canvas");
    canvas.setAttribute("class", "live-bg");
    canvas.setAttribute("aria-hidden", "true");
    const context = canvas.getContext("2d");
    if (!context) return;                         // keep the static image
    card.prepend(canvas);
    card.classList.add("is-live");

    let cardWidth = 1, cardHeight = 1, ratio = 1, strokeStyle = null, backgroundStyle = null, points = [];
    let lightPhase = 0, wavesClock = 0, energy = 0, lastScrollY = window.scrollY;

    const draw = () => {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.fillStyle = backgroundStyle;
        context.fillRect(0, 0, cardWidth, cardHeight);
        const middleY = cardHeight * settings.middleLine + (scrollProgress(card) - MIDDLE) * SCROLL_DRIFT;
        context.strokeStyle = strokeStyle;
        for (let line = 0; line < LINES; line++) {
            const offset = line - LINES / 2;          // from the middle line
            const { width, opacity } = lineStyle(line, lightPhase, energy, settings.glow);
            context.lineWidth = width;
            context.globalAlpha = opacity;
            context.beginPath();
            context.moveTo(0, restingY(offset, middleY));
            for (const along of points) {
                const point = linePoint(offset, along, wavesClock, energy, middleY);
                context.lineTo(point.x, point.y);
            }
            context.stroke();
        }
        context.globalAlpha = 1;
    };

    const fit = () => {
        const box = card.getBoundingClientRect();
        ratio = pixelRatio();
        cardWidth = Math.max(1, Math.round(box.width));
        cardHeight = Math.max(1, Math.round(box.height));
        canvas.width = cardWidth * ratio;
        canvas.height = cardHeight * ratio;
        points = pointsAlong(cardWidth);
        strokeStyle = context.createLinearGradient(0, 0, cardWidth, 0);
        for (const [position, opacity] of settings.fade) strokeStyle.addColorStop(position, rgba(settings.stroke, opacity));
        backgroundStyle = context.createLinearGradient(0, 0, cardWidth, cardHeight);
        backgroundStyle.addColorStop(0, settings.background[0]);
        backgroundStyle.addColorStop(1, settings.background[1]);
        draw();       // a resize never leaves a blank canvas, even when paused
    };

    let frameRequest = null, lastFrame = null, lastDrawn = null, onScreen = false;
    const loop = now => {
        frameRequest = requestAnimationFrame(loop);
        const step = lastFrame === null ? MILLISECONDS_PER_FRAME : Math.min(now - lastFrame, MAX_STEP_MILLISECONDS);
        lastFrame = now;
        energy = settle(energy, step);
        const moved = advance(energy, step);
        lightPhase += moved.light;
        wavesClock += moved.waves;
        if (!isTimeToDraw(now, lastDrawn)) return;
        lastDrawn = now;
        draw();
    };

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startLoop = () => {
        if (still.matches) return window.logAnimation?.(name, "still", "reduced motion");
        if (!onScreen) return;
        if (frameRequest === null) {
            lastFrame = null;
            frameRequest = requestAnimationFrame(loop);
        }
        window.logAnimation?.(name, "running");
    };
    const stopLoop = () => {
        if (frameRequest !== null) cancelAnimationFrame(frameRequest);
        frameRequest = null;
        window.logAnimation?.(name, "paused", "off screen");
    };

    window.addEventListener("scroll", () => {
        energy = stir(energy, Math.abs(window.scrollY - lastScrollY));
        lastScrollY = window.scrollY;
    }, { passive: true });

    fit();
    new ResizeObserver(fit).observe(card);
    new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) startLoop();
        else stopLoop();
    }).observe(card);
    still.addEventListener("change", () => (still.matches ? (stopLoop(), draw()) : startLoop()));
}

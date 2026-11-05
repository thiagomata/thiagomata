// Live background for the SLI card, from lab/sli-circles.html: circles in a fixed grid switch
// between the SLI lavender, grey and white; neighbours of the same colour melt together through a
// "goo" filter (blur, then a hard alpha threshold), so blobs form and dissolve as the colours
// change. The changes fade smoothly (js/sli/fading.js), redrawn at most 30 times a second while
// the card is on screen. The static img/sli-bg.svg stays as the fallback.
import { isTimeToDraw } from "./shared/frame-rate.js";
import { COLOURS, FADE_MILLISECONDS, Fade, cssColour, mixColour } from "./sli/fading.js";
import { lerp } from "./shared/motion.js";

const card = document.querySelector('#top-companies section[data-company="sli"]');

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const COLOUR_NAMES = Object.keys(COLOURS);
const SPACING = 72;             // px between circle centres (16px gap between edges)
const RADIUS = 28;              // px
const BRIDGE_RADIUS = 14;       // px, the ball that joins two neighbours of the same colour
const FLIP_SHARE = 0.01;        // share of circles that switch colour each tick
const TICK_MILLISECONDS = 300;  // half the lab page's pace: it sits behind text
const MINIMUM_FLIPS = 1;
const DECIMALS = 1;
/** A bridge's size: grown (its neighbours share a colour) or gone. */
const BRIDGE_SHOWN = 1, BRIDGE_HIDDEN = 0;

// The goo: blur the balls, then turn the soft edge back into a sharp outline (alpha × 20 − 9),
// so balls close enough to blur into each other become one shape.
const GOO = { blur: 8, alphaGain: 20, alphaShift: -9 };
// The same shade as the static image, multiplied over the balls so the text stays readable.
const SHADE = { top: "#877B7B", bottom: "#211E1E", opacity: 0.85 };

const pickFrom = choices => choices[Math.floor(Math.random() * choices.length)];

function newCircle(centreX, centreY, radius) {
    const circle = document.createElementNS(SVG_NAMESPACE, "circle");
    circle.setAttribute("cx", centreX.toFixed(DECIMALS));
    circle.setAttribute("cy", centreY.toFixed(DECIMALS));
    circle.setAttribute("r", radius);
    return circle;
}

function newSvg() {
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    svg.setAttribute("class", "live-bg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");   // drawn for the card, shown 1px smaller (style.css)
    svg.innerHTML = `
        <defs>
            <filter id="sli-goo" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                <feGaussianBlur stdDeviation="${GOO.blur}" />
                <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${GOO.alphaGain} ${GOO.alphaShift}" />
            </filter>
            <linearGradient id="sli-shade" x1="0" y1="0" x2="0" y2="1">
                <stop stop-color="${SHADE.top}"/><stop offset="1" stop-color="${SHADE.bottom}"/>
            </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="white"/>
        <g class="balls" filter="url(#sli-goo)"></g>
        <rect class="shade" width="100%" height="100%" fill="url(#sli-shade)" fill-opacity="${SHADE.opacity}"/>`;
    return svg;
}

function start() {
    const svg = newSvg();
    const balls = svg.querySelector(".balls");
    let circles = [], bridges = [];

    /** A ball: its colour's name, and its fill fading towards that colour. */
    const newBall = (centreX, centreY) => {
        const colour = pickFrom(COLOUR_NAMES);
        return { element: newCircle(centreX, centreY, RADIUS), colour, fill: new Fade(COLOURS[colour], FADE_MILLISECONDS.colour, mixColour) };
    };

    /**
     * The grid is turned 45 degrees around the card's centre, like the balls in the SLI logo. It is
     * built over the card's diagonal so the corners are covered; balls outside the card are skipped.
     */
    const build = () => {
        const cardWidth = card.clientWidth, cardHeight = card.clientHeight;
        svg.setAttribute("viewBox", `0 0 ${cardWidth} ${cardHeight}`);
        balls.replaceChildren();
        const bridgeLayer = balls.appendChild(document.createElementNS(SVG_NAMESPACE, "g"));
        const cellsPerSide = Math.ceil(Math.hypot(cardWidth, cardHeight) / SPACING) + 1;
        const middleCell = (cellsPerSide - 1) / 2;
        const isOutsideCard = (centreX, centreY) =>
            centreX < -SPACING || centreX > cardWidth + SPACING || centreY < -SPACING || centreY > cardHeight + SPACING;

        const grid = [];
        circles = [];
        bridges = [];
        for (let row = 0; row < cellsPerSide; row++) {
            grid.push([]);
            for (let column = 0; column < cellsPerSide; column++) {
                const acrossGrid = (column - middleCell) * SPACING, downGrid = (row - middleCell) * SPACING;
                const centreX = cardWidth / 2 + (acrossGrid - downGrid) / Math.SQRT2;
                const centreY = cardHeight / 2 + (acrossGrid + downGrid) / Math.SQRT2;
                if (isOutsideCard(centreX, centreY)) {
                    grid[row].push(null);
                    continue;
                }
                const ball = newBall(centreX, centreY);
                balls.appendChild(ball.element);
                circles.push(ball);
                grid[row].push(ball);
            }
        }
        // A bridge between each ball and its neighbours on the right and below.
        grid.forEach((line, row) => line.forEach((ball, column) => {
            for (const neighbour of [line[column + 1], grid[row + 1]?.[column]]) {
                if (!ball || !neighbour) continue;
                const middleX = (Number(ball.element.getAttribute("cx")) + Number(neighbour.element.getAttribute("cx"))) / 2;
                const middleY = (Number(ball.element.getAttribute("cy")) + Number(neighbour.element.getAttribute("cy"))) / 2;
                const element = bridgeLayer.appendChild(newCircle(middleX, middleY, BRIDGE_RADIUS));
                const shown = ball.colour === neighbour.colour ? BRIDGE_SHOWN : BRIDGE_HIDDEN;
                bridges.push({ element, ball, neighbour, size: new Fade(shown, FADE_MILLISECONDS.size, lerp) });
            }
        }));
        paint(performance.now(), { everything: true });
    };

    /** A few balls switch to one of the other colours; bridges grow between neighbours that now match. */
    const flip = now => {
        const flips = Math.max(MINIMUM_FLIPS, Math.round(circles.length * FLIP_SHARE));
        for (let flipped = 0; flipped < flips; flipped++) {
            const ball = pickFrom(circles);
            ball.colour = pickFrom(COLOUR_NAMES.filter(colour => colour !== ball.colour));
            ball.fill.towards(COLOURS[ball.colour], now);
        }
        for (const bridge of bridges) {
            const shown = bridge.ball.colour === bridge.neighbour.colour ? BRIDGE_SHOWN : BRIDGE_HIDDEN;
            if (shown !== bridge.size.to) bridge.size.towards(shown, now);
        }
    };

    /** Draws what is still fading (or, after a rebuild, everything). A bridge wears its ball's colour. */
    const paint = (now, { everything = false } = {}) => {
        for (const ball of circles) {
            if (everything || !ball.fill.settled(now)) ball.element.setAttribute("fill", cssColour(ball.fill.at(now)));
        }
        for (const bridge of bridges) {
            if (everything || !bridge.ball.fill.settled(now)) bridge.element.setAttribute("fill", cssColour(bridge.ball.fill.at(now)));
            if (everything || !bridge.size.settled(now)) bridge.element.style.transform = `scale(${bridge.size.at(now)})`;
        }
    };

    card.prepend(svg);
    card.classList.add("is-live");
    build();

    let builtWidth = card.clientWidth, builtHeight = card.clientHeight;
    new ResizeObserver(() => {
        if (card.clientWidth === builtWidth && card.clientHeight === builtHeight) return;
        builtWidth = card.clientWidth;
        builtHeight = card.clientHeight;
        build();
    }).observe(card);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = false, frameRequest = null, lastDrawn = null, lastFlip = null;
    const frame = now => {
        frameRequest = requestAnimationFrame(frame);
        if (!isTimeToDraw(now, lastDrawn)) return;
        lastDrawn = now;
        if (lastFlip === null || now - lastFlip >= TICK_MILLISECONDS) {
            lastFlip = now;
            flip(now);
        }
        paint(now);
    };
    const run = () => {
        if (still.matches) window.logAnimation?.("sli", "still", "reduced motion");
        else window.logAnimation?.("sli", onScreen ? "running" : "paused", onScreen ? "" : "off screen");
        if (onScreen && !still.matches) {
            if (frameRequest === null) frameRequest = requestAnimationFrame(frame);
            return;
        }
        if (frameRequest !== null) cancelAnimationFrame(frameRequest);
        frameRequest = null;
        lastDrawn = null;
        lastFlip = null;
    };
    new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        run();
    }).observe(card);
    still.addEventListener("change", run);
}

if (card) start();

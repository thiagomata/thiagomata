// Live background for the SLI card, from lab/sli-circles.html: circles in a fixed grid switch
// between the SLI lavender, grey and white; neighbours of the same colour melt together through a
// "goo" filter (blur, then a hard alpha threshold), so blobs form and dissolve as the colours
// change. The static img/sli-bg.svg stays as the fallback.
(() => {
    const card = document.querySelector('#top-companies section[data-company="sli"]');
    if (!card) return;

    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    const COLOURS = ["grey", "lavender", "white"];
    const SPACING = 72;             // px between circle centres (16px gap between edges)
    const RADIUS = 28;              // px
    const BRIDGE_RADIUS = 14;       // px, the ball that joins two neighbours of the same colour
    const FLIP_SHARE = 0.01;        // share of circles that switch colour each tick
    const TICK_MILLISECONDS = 300;  // half the lab page's pace: it sits behind text
    const MINIMUM_FLIPS = 1;
    const DECIMALS = 1;

    // The goo: blur the balls, then turn the soft edge back into a sharp outline (alpha × 20 − 9),
    // so balls close enough to blur into each other become one shape.
    const GOO = { blur: 8, alphaGain: 20, alphaShift: -9 };
    // The same shade as the static image, multiplied over the balls so the text stays readable.
    const SHADE = { top: "#877B7B", bottom: "#211E1E", opacity: 0.85 };
    const BRIDGE_SHOWN = "scale(1)", BRIDGE_HIDDEN = "scale(0)";

    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    svg.setAttribute("class", "live-bg");
    svg.setAttribute("aria-hidden", "true");
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
    const balls = svg.querySelector(".balls");
    let circles = [], bridges = [];

    const pickFrom = choices => choices[Math.floor(Math.random() * choices.length)];

    const newCircle = (centreX, centreY, radius) => {
        const circle = document.createElementNS(SVG_NAMESPACE, "circle");
        circle.setAttribute("cx", centreX.toFixed(DECIMALS));
        circle.setAttribute("cy", centreY.toFixed(DECIMALS));
        circle.setAttribute("r", radius);
        return circle;
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
                const ball = newCircle(centreX, centreY, RADIUS);
                ball.dataset.colour = pickFrom(COLOURS);
                circles.push(balls.appendChild(ball));
                grid[row].push(ball);
            }
        }
        // A bridge between each ball and its neighbours on the right and below.
        grid.forEach((line, row) => line.forEach((ball, column) => {
            for (const neighbour of [line[column + 1], grid[row + 1]?.[column]]) {
                if (!ball || !neighbour) continue;
                const middleX = (Number(ball.getAttribute("cx")) + Number(neighbour.getAttribute("cx"))) / 2;
                const middleY = (Number(ball.getAttribute("cy")) + Number(neighbour.getAttribute("cy"))) / 2;
                const bridge = bridgeLayer.appendChild(newCircle(middleX, middleY, BRIDGE_RADIUS));
                bridges.push({ bridge, ball, neighbour });
            }
        }));
        connect();
    };

    /** A few balls switch to one of the other colours. */
    const flip = () => {
        const flips = Math.max(MINIMUM_FLIPS, Math.round(circles.length * FLIP_SHARE));
        for (let flipped = 0; flipped < flips; flipped++) {
            const ball = pickFrom(circles);
            ball.dataset.colour = pickFrom(COLOURS.filter(colour => colour !== ball.dataset.colour));
        }
    };

    /** Balls stay in place; the bridge between two neighbours grows when they share a colour. */
    const connect = () => {
        for (const { bridge, ball, neighbour } of bridges) {
            bridge.dataset.colour = ball.dataset.colour;
            bridge.style.transform = ball.dataset.colour === neighbour.dataset.colour ? BRIDGE_SHOWN : BRIDGE_HIDDEN;
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
    let timer = null;
    const start = () => {
        if (still.matches) return window.logAnimation?.("sli", "still", "reduced motion");
        if (timer === null) timer = setInterval(() => { flip(); connect(); }, TICK_MILLISECONDS);
        window.logAnimation?.("sli", "running");
    };
    const stop = () => {
        clearInterval(timer);
        timer = null;
        window.logAnimation?.("sli", "paused", "off screen");
    };
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(card);
    still.addEventListener("change", () => (still.matches ? stop() : start()));
})();

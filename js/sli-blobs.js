// Live background for the SLI card, from lab/sli-circles.html: circles in a fixed grid
// switch between the SLI lavender, grey and white; neighbours of the same colour melt
// together through a "goo" filter (blur, then a hard alpha threshold), so blobs form and
// dissolve as the colours change. The static img/sli-bg.svg stays as the fallback.
(() => {
    const card = document.querySelector('#top-companies section[data-company="sli"]');
    if (!card) return;

    const NS = "http://www.w3.org/2000/svg";
    const COLOURS = ["grey", "lavender", "white"];
    const SPACING = 72;        // px between circle centres (16px gap between edges)
    const RADIUS = 28;         // px
    const BRIDGE = 14;         // px radius of the ball that joins two neighbours of the same colour
    const FLIPS = 0.01;        // share of circles that switch colour each tick
    const TICK = 300;          // ms between ticks (half the lab page's pace: it sits behind text)

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "live-bg");
    svg.setAttribute("aria-hidden", "true");
    // The multiply gradient is the same shade the static image uses, so the text stays readable.
    svg.innerHTML = `
        <defs>
            <filter id="sli-goo" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                <feGaussianBlur stdDeviation="8" />
                <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
            </filter>
            <linearGradient id="sli-shade" x1="0" y1="0" x2="0" y2="1">
                <stop stop-color="#877B7B"/><stop offset="1" stop-color="#211E1E"/>
            </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="white"/>
        <g class="balls" filter="url(#sli-goo)"></g>
        <rect class="shade" width="100%" height="100%" fill="url(#sli-shade)" fill-opacity="0.85"/>`;
    const balls = svg.querySelector(".balls");
    let circles = [], bridges = [];

    const build = () => {
        const w = card.clientWidth, h = card.clientHeight;
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
        balls.replaceChildren();
        const bridgeLayer = balls.appendChild(document.createElementNS(NS, "g"));
        // The grid is turned 45 degrees around the card centre, like the balls in the SLI logo.
        // It is built over the card's diagonal so the corners are covered, and balls that land
        // outside the card are skipped.
        const size = Math.ceil(Math.hypot(w, h) / SPACING) + 1, middle = (size - 1) / 2;
        const grid = [];
        circles = [];
        bridges = [];
        for (let row = 0; row < size; row++) {
            grid.push([]);
            for (let col = 0; col < size; col++) {
                const u = (col - middle) * SPACING, v = (row - middle) * SPACING;
                const x = w / 2 + (u - v) / Math.SQRT2, y = h / 2 + (u + v) / Math.SQRT2;
                if (x < -SPACING || x > w + SPACING || y < -SPACING || y > h + SPACING) {
                    grid[row].push(null);
                    continue;
                }
                const c = document.createElementNS(NS, "circle");
                c.setAttribute("cx", x.toFixed(1));
                c.setAttribute("cy", y.toFixed(1));
                c.setAttribute("r", RADIUS);
                c.dataset.colour = COLOURS[Math.floor(Math.random() * COLOURS.length)];
                circles.push(balls.appendChild(c));
                grid[row].push(c);
            }
        }
        grid.forEach((line, row) => line.forEach((a, col) => {
            for (const b of [line[col + 1], grid[row + 1]?.[col]]) {
                if (!a || !b) continue;
                const el = document.createElementNS(NS, "circle");
                el.setAttribute("cx", (+a.getAttribute("cx") + +b.getAttribute("cx")) / 2);
                el.setAttribute("cy", (+a.getAttribute("cy") + +b.getAttribute("cy")) / 2);
                el.setAttribute("r", BRIDGE);
                bridges.push({ el: bridgeLayer.appendChild(el), a, b });
            }
        }));
        connect();
    };

    const flip = () => {
        const count = Math.max(1, Math.round(circles.length * FLIPS));
        for (let i = 0; i < count; i++) {
            const ball = circles[Math.floor(Math.random() * circles.length)];
            const others = COLOURS.filter(colour => colour !== ball.dataset.colour);
            ball.dataset.colour = others[Math.floor(Math.random() * others.length)];
        }
    };

    // Balls stay in place; the bridge between two neighbours grows when they share a colour.
    const connect = () => {
        bridges.forEach(({ el, a, b }) => {
            el.dataset.colour = a.dataset.colour;
            el.style.transform = a.dataset.colour === b.dataset.colour ? "scale(1)" : "scale(0)";
        });
    };

    card.prepend(svg);
    card.classList.add("is-live");
    build();

    let width = card.clientWidth, height = card.clientHeight;
    new ResizeObserver(() => {
        if (card.clientWidth === width && card.clientHeight === height) return;
        width = card.clientWidth;
        height = card.clientHeight;
        build();
    }).observe(card);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = null;
    const start = () => { if (timer === null && !still.matches) timer = setInterval(() => { flip(); connect(); }, TICK); };
    const stop = () => { clearInterval(timer); timer = null; };
    new IntersectionObserver(([entry]) => entry.isIntersecting ? start() : stop()).observe(card);
    still.addEventListener("change", () => still.matches ? stop() : start());
})();

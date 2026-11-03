// Live version of img/macquarie-background.svg: the same rings and curves,
// redrawn from their formulas. A slow wave of light travels outward on its own;
// scrolling adds energy to it, like a stone in water, and it settles back when you stop.
// The static image stays as the fallback (no JS, reduced motion keeps one still frame).
(() => {
    const card = document.querySelector('#top-companies section[data-company="macquarie"]');
    if (!card) return;

    const NS = "http://www.w3.org/2000/svg";
    const CX = 1390, CY = 195, R0 = 230, STEP = 14, RINGS = 30, ASPECT = 0.83;
    const CURVES = 14;
    const CALM_SPEED = 0.0006;     // rad/ms of the resting wave (about one band every 10s)
    const STIR_SPEED = 0.004;      // extra rad/ms at full energy
    const CALM_AMPLITUDE = 3;      // px of ring movement at rest
    const STIR_AMPLITUDE = 18;     // extra px at full energy
    const GLOW = 0.45;             // extra opacity of the band of light
    const STIR = 0.0025;           // energy added per px scrolled
    const SETTLE = 1200;           // ms for the energy to fade to about a third
    const DRIFT = 60;              // px of scroll parallax

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "live-bg");
    svg.setAttribute("viewBox", "0 0 1600 700");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = `
        <defs>
            <linearGradient id="mq-base"><stop stop-color="#111315"/><stop offset="1" stop-color="#1c1d1e"/></linearGradient>
            <linearGradient id="mq-fade"><stop offset="0.35" stop-color="white" stop-opacity="0"/><stop offset="0.7" stop-color="white" stop-opacity="0.5"/><stop offset="1" stop-color="white"/></linearGradient>
            <mask id="mq-lines"><path fill="url(#mq-fade)" d="M0 0H1600V700H0Z"/></mask>
        </defs>
        <path fill="url(#mq-base)" d="M0 0H1600V700H0Z"/>
        <g mask="url(#mq-lines)"><g class="lines" fill="none" stroke="#c3b9a6" stroke-width="0.7"></g></g>`;
    const group = svg.querySelector(".lines");

    const rings = Array.from({ length: RINGS }, () => group.appendChild(document.createElementNS(NS, "ellipse")));
    const curves = Array.from({ length: CURVES }, () => group.appendChild(document.createElementNS(NS, "path")));
    rings.forEach(e => { e.setAttribute("cx", CX); e.setAttribute("cy", CY); });

    // phase: where the wave is; energy: 0 at rest, 1 when stirred hard; progress: card position on screen (0..1).
    const draw = (phase, energy, progress) => {
        const amplitude = CALM_AMPLITUDE + STIR_AMPLITUDE * energy;
        const spacing = 0.25 + 0.3 * progress;   // the wave gets shorter as the card moves up
        rings.forEach((e, i) => {
            const wave = Math.sin(phase - i * spacing);
            const rx = R0 + i * STEP + amplitude * wave;
            e.setAttribute("rx", rx.toFixed(1));
            e.setAttribute("ry", (rx * ASPECT).toFixed(1));
            e.setAttribute("stroke-opacity", (0.25 + (GLOW + 0.2 * energy) * Math.max(wave, 0) ** 4).toFixed(3));
        });
        curves.forEach((p, i) => {
            const sway = (8 + 24 * energy) * Math.sin(phase * 0.6 + i * 0.2);
            p.setAttribute("d",
                `M ${770 + 14 * i} 700 C ${870 + 10 * i} ${380 + sway} ${1260 + 8 * i} ${440 - sway} 1600 ${220 + 12 * i}`);
        });
        group.setAttribute("transform", `translate(0 ${((progress - 0.5) * DRIFT).toFixed(1)})`);
    };

    // 0 when the card enters at the bottom of the screen, 1 when it leaves at the top.
    const scrollProgress = () => {
        const box = card.getBoundingClientRect();
        const progress = (window.innerHeight - box.top) / (window.innerHeight + box.height);
        return Math.min(Math.max(progress, 0), 1);
    };

    card.prepend(svg);
    card.classList.add("is-live");

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let phase = 0, energy = 0, lastY = window.scrollY, lastT = null, frame = null;

    const loop = t => {
        const dt = lastT === null ? 16 : Math.min(t - lastT, 64);
        lastT = t;
        energy *= Math.exp(-dt / SETTLE);
        phase += dt * (CALM_SPEED + STIR_SPEED * energy);
        draw(phase, energy, scrollProgress());
        frame = requestAnimationFrame(loop);
    };
    const start = () => { if (frame === null && !still.matches) { lastT = null; frame = requestAnimationFrame(loop); } };
    const stop = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; };

    window.addEventListener("scroll", () => {
        energy = Math.min(1, energy + Math.abs(window.scrollY - lastY) * STIR);
        lastY = window.scrollY;
    }, { passive: true });

    draw(0, 0, 0.5);
    new IntersectionObserver(([entry]) => entry.isIntersecting ? start() : stop()).observe(card);
    still.addEventListener("change", () => still.matches ? (stop(), draw(0, 0, 0.5)) : start());
})();

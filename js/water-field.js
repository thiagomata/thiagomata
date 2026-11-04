// A canvas wave field, after the wave technique from desarrollolibre.net (canvas +
// requestAnimationFrame): ~110 parallel polylines, each point a superposition of
// cosines with different frequencies and phases. A slow wave of light travels
// through the field; scrolling quickens it about threefold, and it settles back.
// The container keeps its static image as the no-JS fallback (reduced motion keeps
// one still frame).
const DEFAULTS = {
    lines: 110,
    stroke: "c3b9a6",                  // stroke colour, rgb hex
    base: ["#111315", "#1c1d1e"],      // background gradient
    fade: [[0.30, 0], [0.65, 0.5], [1, 1]], // left-to-right stroke gradient (quiet under copy)
    glow: 0.45,
    yAnchor: 0.55
};

const CALM_SPEED = 0.0006, STIR_SPEED = 0.004;
const STIR = 0.0025, SETTLE = 1200, DRIFT = 60;
const CLOCK_CALM = 0.054, CLOCK_STIR = 0.126, AMP_STIR = 1.4;

const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function start(card, options = {}) {
    if (!card) return;
    const o = { ...DEFAULTS, ...options };

    const canvas = document.createElement("canvas");
    canvas.setAttribute("class", "live-bg");
    canvas.setAttribute("aria-hidden", "true");
    card.prepend(canvas);
    card.classList.add("is-live");
    const ctx = canvas.getContext("2d");

    let w = 1, h = 1, dpr = 1, stroke = null, base = null;
    let phase = 0, clock = 0, energy = 0, lastY = window.scrollY, lastT = null, frame = null;

    const scrollProgress = () => {
        const box = card.getBoundingClientRect();
        const p = (window.innerHeight - box.top) / (window.innerHeight + box.height);
        return Math.min(Math.max(p, 0), 1);
    };

    const draw = (phase, t, energy, progress) => {
        if (w < 2) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);

        const amp = 1 + AMP_STIR * energy;
        const y0 = h * o.yAnchor + (progress - 0.5) * DRIFT;
        const maxJ = Math.min(w, Math.ceil((Math.sqrt(1 + 0.032 * (w + 20)) - 1) / 0.016));
        ctx.strokeStyle = stroke;

        for (let i = -o.lines / 2; i < o.lines / 2; i++) {
            const n = i + o.lines / 2;
            ctx.lineWidth = 0.6 + 0.8 * hash(n * 7 + 2);
            ctx.globalAlpha = 0.18 + 0.2 * hash(n * 11 + 5)
                + (o.glow + 0.2 * energy) * Math.max(Math.sin(phase - n * 0.09), 0) ** 4;
            ctx.beginPath();
            ctx.moveTo(0, y0 + i * 1.1);
            for (let j = 0; j <= maxJ; j += 10) {
                ctx.lineTo(
                    10 * Math.cos(i) + j + 0.008 * j * j,
                    y0 + i * 1.1
                        + j * 0.22 * amp * Math.cos(j / 50 - t / 50 - i / 118)
                        + (i * 0.9) * amp * Math.cos(j / 25 - (i + t) / 65));
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    };

    const fit = () => {
        const box = card.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = Math.max(1, Math.round(box.width));
        h = Math.max(1, Math.round(box.height));
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        const rgb = [o.stroke.slice(0, 2), o.stroke.slice(2, 4), o.stroke.slice(4, 6)]
            .map(hex => parseInt(hex, 16)).join(",");
        stroke = ctx.createLinearGradient(0, 0, w, 0);
        for (const [at, alpha] of o.fade) stroke.addColorStop(at, `rgba(${rgb},${alpha})`);
        base = ctx.createLinearGradient(0, 0, w, h);
        base.addColorStop(0, o.base[0]);
        base.addColorStop(1, o.base[1]);
        // Repaint the still frame if the animation is not running, so a resize or
        // reduced-motion state never leaves a blank canvas.
        if (frame === null) draw(phase, clock, energy, scrollProgress());
    };

    const loop = now => {
        const dt = lastT === null ? 16 : Math.min(now - lastT, 64);
        lastT = now;
        energy *= Math.exp(-dt / SETTLE);
        phase += dt * (CALM_SPEED + STIR_SPEED * energy);
        clock += dt * (CLOCK_CALM + CLOCK_STIR * energy);
        draw(phase, clock, energy, scrollProgress());
        frame = requestAnimationFrame(loop);
    };

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startLoop = () => { if (frame === null && !still.matches) { lastT = null; frame = requestAnimationFrame(loop); } };
    const stopLoop = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; };

    window.addEventListener("scroll", () => {
        energy = Math.min(1, energy + Math.abs(window.scrollY - lastY) * STIR);
        lastY = window.scrollY;
    }, { passive: true });

    fit();
    new ResizeObserver(fit).observe(card);
    new IntersectionObserver(([entry]) => entry.isIntersecting ? startLoop() : stopLoop()).observe(card);
    still.addEventListener("change", () => still.matches
        ? (stopLoop(), draw(phase, clock, energy, scrollProgress()))
        : startLoop());
}

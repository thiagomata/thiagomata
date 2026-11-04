// The OtimiCar scene: the car in pieces in front of a speedometer (styles in style/otimicar.css).
// One speed drives the needle and the wheels, so they always agree.

const SPEED_KMH = { low: 150, high: 175, cycleSeconds: 5.2 };    // drifts smoothly between these
const DIAL = { maxKmh: 240, sweepDegrees: 240 };                  // 0 km/h 120 degrees left of up
const WHEEL_DEGREES_PER_SECOND_PER_KMH = 2.5;                     // one turn every 0.9 s at 160 km/h
const MAX_STEP_SECONDS = 0.1;                                     // after a pause, carry on, don't jump
const SMOKE_PUFFS = 10;

/** The pieces, back to front. `turns` pieces follow the speed; the rest are still or CSS-animated. */
const PIECES = [
    { file: "speedometer-dial", classes: "crop speedometer" },
    { file: "speedometer-needle", classes: "crop speedometer needle" },
    { file: "ground-shadow", classes: "whole" },
    { smoke: true },
    { file: "far-wheel-front", classes: "crop far-wheel front" },
    { file: "far-wheel-rear", classes: "crop far-wheel rear" },
    { file: "arch-panel", classes: "crop arch-panel" },
    { file: "tyre-front", classes: "crop tyre front" },
    { file: "tyre-rear", classes: "crop tyre rear" },
    ...["front", "rear"].flatMap(wheel => [
        { file: "wheel-disc", classes: `crop wheel turns ${wheel}` },
        { file: "wheel-caliper", classes: `crop wheel ${wheel}` },
        { file: "wheel-spokes", classes: `crop wheel turns ${wheel}` },
    ]),
    { file: "car", classes: "whole body" },
];

const speedAt = seconds => {
    const middle = (SPEED_KMH.low + SPEED_KMH.high) / 2;
    const swing = (SPEED_KMH.high - SPEED_KMH.low) / 2;
    return middle - swing * Math.cos(2 * Math.PI * seconds / SPEED_KMH.cycleSeconds);
};
const needleAngle = speed => speed / DIAL.maxKmh * DIAL.sweepDegrees - DIAL.sweepDegrees / 2;

function buildStage(imageFolder) {
    const stage = document.createElement("div");
    stage.className = "otimicar-stage";
    for (const piece of PIECES) {
        if (piece.smoke) {
            const exhaust = document.createElement("div");
            exhaust.className = "crop exhaust";
            for (let puff = 0; puff < SMOKE_PUFFS; puff++) {
                const cloud = document.createElement("span");
                cloud.className = "puff";
                cloud.style.setProperty("--puff", puff);
                exhaust.append(cloud);
            }
            stage.append(exhaust);
            continue;
        }
        const image = document.createElement("img");
        image.className = piece.classes;
        image.src = `${imageFolder}/${piece.file}.svg`;
        image.alt = "";
        stage.append(image);
    }
    return stage;
}

/**
 * Builds the scene inside `container` (a positioned element) and runs it while it is on screen.
 * `imageFolder` is where the pieces are, relative to the page.
 */
export function start(container, imageFolder) {
    const scene = document.createElement("div");
    scene.className = "otimicar-scene live-bg";
    scene.setAttribute("aria-hidden", "true");
    const stage = buildStage(imageFolder);
    scene.append(stage);

    let wheelAngle = 0, last = null, onScreen = false, frameRequest = null;
    const show = speed => {
        stage.style.setProperty("--needle-turn", `${needleAngle(speed)}deg`);
        // The car drives to the left, so its wheels turn anticlockwise.
        stage.style.setProperty("--wheel-turn", `${-wheelAngle}deg`);
    };
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = now => {
        frameRequest = null;
        const seconds = now / 1000;
        const step = last === null ? 0 : Math.min(seconds - last, MAX_STEP_SECONDS);
        last = seconds;
        const speed = speedAt(seconds);
        wheelAngle = (wheelAngle + speed * WHEEL_DEGREES_PER_SECOND_PER_KMH * step) % 360;
        show(speed);
        if (onScreen && !still.matches) frameRequest = requestAnimationFrame(frame);
    };
    const run = () => {
        stage.classList.toggle("paused", !onScreen);
        if (still.matches) show((SPEED_KMH.low + SPEED_KMH.high) / 2);
        else if (onScreen && frameRequest === null) {
            last = null;
            frameRequest = requestAnimationFrame(frame);
        }
    };
    new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        run();
    }).observe(container);
    still.addEventListener("change", run);

    container.prepend(scene);
    container.classList.add("is-live");
    show(SPEED_KMH.low);
}

// A Shibuya-style scramble crossing in the flat, illustrated style of the site: the live
// background of the Ideia card (loaded by js/ideia-scramble.js) and of lab/ideia-scramble.html.
//
// The simulation is deterministic: it advances in fixed ticks counted by an integer, and the
// lights, cars and people all read the time from that counter. How often the screen redraws
// (or whether it is paused while off screen) never changes what happens, only when we look.
import * as THREE from "three";
import { CarsView } from "./cars-view.js";
import { buildCity } from "./city.js";
import { crowdSizeFor } from "./crowd.js";
import { CrowdView } from "./crowd-view.js";
import { COLOURS } from "./plan.js";
import { seededRandom } from "./random.js";
import { Simulation, TICK_SECONDS } from "./simulation.js";

const MAX_TICKS_PER_FRAME = 6;          // after a long pause, resume instead of fast-forwarding
const MIN_MS_BETWEEN_FRAMES = 32;       // draw at most about 30 frames a second

/** Sharper is not worth the cost on dense screens for a background. */
const MAX_PIXEL_RATIO = 1.5;

// Fixed seeds: the same buildings and the same faces on every visit.
const CITY_SEED = 3;
const LOOKS_SEED = 5;

// Fixed camera, as if from a rooftop looking down the main street at the junction.
const CAMERA = { fieldOfView: 44, pitchDegrees: -26, yawDegrees: 4, distance: 800, near: 1, far: 9000 };

/** The street fades into the night sky between these distances from the camera. */
const FOG = { start: 1200, end: 5200 };

// Night light: a cool sky over a warm ground, and the moon from the back left.
const SKY_LIGHT = { sky: 0xc9d4ff, ground: 0x29201b, intensity: 1.4 };
const MOONLIGHT = { colour: 0xffffff, intensity: 1.6, direction: [-0.6, 1, 0.35] };

function createCamera() {
    const camera = new THREE.PerspectiveCamera(CAMERA.fieldOfView, 1, CAMERA.near, CAMERA.far);
    const pitch = THREE.MathUtils.degToRad(CAMERA.pitchDegrees), yaw = THREE.MathUtils.degToRad(CAMERA.yawDegrees);
    camera.position.set(
        Math.sin(yaw) * Math.cos(pitch) * CAMERA.distance,
        -Math.sin(pitch) * CAMERA.distance,
        Math.cos(yaw) * Math.cos(pitch) * CAMERA.distance,
    );
    camera.lookAt(0, 0, 0);
    return camera;
}

function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLOURS.sky);
    scene.fog = new THREE.Fog(COLOURS.sky, FOG.start, FOG.end);
    scene.add(new THREE.HemisphereLight(SKY_LIGHT.sky, SKY_LIGHT.ground, SKY_LIGHT.intensity));
    const moonlight = new THREE.DirectionalLight(MOONLIGHT.colour, MOONLIGHT.intensity);
    moonlight.position.set(...MOONLIGHT.direction);
    scene.add(moonlight);
    return scene;
}

/**
 * Renders the scene behind the content of `container` (a positioned element). Throws if WebGL
 * is unavailable, before touching the page, so the caller can keep its static image.
 */
export function start(container) {
    const canvas = document.createElement("canvas");
    canvas.className = "live-bg";
    canvas.setAttribute("aria-hidden", "true");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

    const scene = createScene();
    const camera = createCamera();
    buildCity(scene, renderer, seededRandom(CITY_SEED));
    const simulation = new Simulation({ crowdSize: crowdSizeFor(container.clientWidth) });
    const carsView = new CarsView(scene, simulation.traffic);
    const crowdView = new CrowdView(scene, renderer, simulation.crowd, seededRandom(LOOKS_SEED));

    const stillPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Advances the simulation by whole ticks to catch up with real time.
    let pendingSeconds = 0;
    const advance = elapsedSeconds => {
        pendingSeconds = Math.min(pendingSeconds + elapsedSeconds, MAX_TICKS_PER_FRAME * TICK_SECONDS);
        while (pendingSeconds >= TICK_SECONDS) {
            simulation.step();
            pendingSeconds -= TICK_SECONDS;
        }
    };

    const draw = () => {
        carsView.update();
        crowdView.update(simulation.seconds, camera);
        renderer.render(scene, camera);
    };

    // Run only while the container is on screen; with reduced motion, draw one still frame.
    let onScreen = false, frameRequest = null, lastFrameAt = null;
    const frame = now => {
        frameRequest = null;
        if (lastFrameAt === null || now - lastFrameAt >= MIN_MS_BETWEEN_FRAMES) {
            if (lastFrameAt !== null && !stillPreference.matches) advance((now - lastFrameAt) / 1000);
            lastFrameAt = now;
            draw();
        }
        if (onScreen && !stillPreference.matches) frameRequest = requestAnimationFrame(frame);
    };
    const requestFrame = () => {
        if (frameRequest === null) frameRequest = requestAnimationFrame(frame);
    };
    const pause = () => { lastFrameAt = null; };      // the next frame starts counting afresh

    const resize = () => {
        const { clientWidth: width, clientHeight: height } = container;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        draw();
    };

    new ResizeObserver(resize).observe(container);
    new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) requestFrame();
        else pause();
        if (stillPreference.matches) window.logAnimation?.("ideia", "still", "reduced motion");
        else window.logAnimation?.("ideia", onScreen ? "running" : "paused", onScreen ? "" : "off screen");
    }).observe(container);
    stillPreference.addEventListener("change", () => { pause(); requestFrame(); });

    // Swap the static image for the live scene.
    container.prepend(canvas);
    container.classList.add("is-live");
    resize();
}

// Draws the Parallax card's village (village.js) in three.js. As the page scrolls, the eye rises and
// sinks past the painted layers; the camera always stays inside the painted part of the scene,
// whatever the card's shape. It draws at most 30 frames a second, only while the card is on screen
// and the eye is moving; with reduced motion, it shows one still frame from the middle.
import * as THREE from "three";
import { MILLISECONDS_PER_SECOND, isTimeToDraw, pixelRatio } from "../shared/frame-rate.js";
import { scrollShare } from "../shared/motion.js";
import { versioned } from "../shared/picture-versions.js";
import { EYE, LAYERS, SKY, WATER, easeTowards, eyeHeightAt, framing } from "./village.js";

/** The site's root, so the pictures are found from the page and from the labs alike. */
const SITE_ROOT = new URL("../../", import.meta.url);
/** Transparent pixels below this alpha are cut out, so layers never hide what is behind them. */
const ALPHA_CUTOFF = 0.5;
/** The eye is still once this close to where it is heading: stop drawing. */
const STILL_DISTANCE = 0.05;
/** After a pause, carry on from where the eye was instead of jumping. */
const MAX_STEP_SECONDS = 0.1;
/** With reduced motion, the eye stays at rest, level with the middle of the scroll. */
const LEVEL = 0.5;
const toRadians = THREE.MathUtils.degToRad;

/** A point of the village (y down) in three.js's world (y up). */
const fromVillage = ([across, down, depth]) => new THREE.Vector3(across, -down, depth);

/** A layer's picture: its versioned address, from the site's root. */
const pictureAddress = picture => new URL(versioned(`./img/parallax-village/${picture}.webp`), SITE_ROOT).href;

function layerMesh(loader, { picture, width, height, at, mirrored = false, tint = "#ffffff" }) {
    const texture = loader.load(pictureAddress(picture));
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, color: tint, alphaTest: ALPHA_CUTOFF, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.copy(fromVillage(at));
    if (mirrored) mesh.scale.x = -1;
    return mesh;
}

function water() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(WATER.size, WATER.size), new THREE.MeshBasicMaterial({ color: WATER.colour }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.copy(fromVillage(WATER.at));
    return floor;
}

/** Draws the village on a canvas inside `container`, moving with the page's scroll. Throws without WebGL. */
export function start(container) {
    const canvas = document.createElement("canvas");
    canvas.className = "parallax-scene";
    canvas.setAttribute("aria-hidden", "true");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(pixelRatio());
    renderer.setClearColor(SKY);
    container.append(canvas);

    const scene = new THREE.Scene();
    const manager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader(manager);
    scene.add(water(), ...LAYERS.map(layer => layerMesh(loader, layer)));
    const camera = new THREE.PerspectiveCamera(EYE.fieldOfViewDegrees, 1, EYE.near, EYE.far);
    const [eyeAcross, , eyeDepth] = EYE.at;

    const scrolled = () => {
        const box = container.getBoundingClientRect();
        return scrollShare(box.top, box.height, window.innerHeight);
    };
    let eyeHeight = eyeHeightAt(scrolled());
    let view = framing(1);

    const draw = () => {
        camera.position.copy(fromVillage([eyeAcross, eyeHeight, eyeDepth]));
        camera.rotation.set(toRadians(view.tilt), -toRadians(view.pan), 0, "YXZ");
        renderer.render(scene, camera);
    };
    const resize = () => {
        const { clientWidth: widthPixels, clientHeight: heightPixels } = container;
        if (!widthPixels || !heightPixels) return;
        renderer.setSize(widthPixels, heightPixels, false);
        camera.aspect = widthPixels / heightPixels;
        view = framing(camera.aspect);
        camera.fov = view.fieldOfView;
        camera.updateProjectionMatrix();
        draw();
    };
    manager.onLoad = draw;        // the pictures arrive after the first frame

    /** Eases the eye towards where the scroll puts it; false once it is there (nothing to draw). */
    const moveEye = stepSeconds => {
        const target = eyeHeightAt(scrolled());
        if (Math.abs(target - eyeHeight) < STILL_DISTANCE) return false;
        eyeHeight = easeTowards(eyeHeight, target, stepSeconds);
        return true;
    };
    const drawStill = () => {
        eyeHeight = eyeHeightAt(LEVEL);
        draw();
    };

    animateWhileVisible(container, { moveEye, draw, drawStill });
    new ResizeObserver(resize).observe(container);
    resize();
}

/**
 * Runs the animation while `container` is on screen and the eye is moving: it stops once the eye
 * settles, and scrolling wakes it. With reduced motion, it shows a still frame.
 */
function animateWhileVisible(container, { moveEye, draw, drawStill }) {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = false, frameRequest = null, lastSeconds = null, lastDrawn = null;

    const frame = now => {
        frameRequest = requestAnimationFrame(frame);
        if (!isTimeToDraw(now, lastDrawn)) return;
        lastDrawn = now;
        const seconds = now / MILLISECONDS_PER_SECOND;
        const stepSeconds = lastSeconds === null ? 0 : Math.min(seconds - lastSeconds, MAX_STEP_SECONDS);
        lastSeconds = seconds;
        if (onScreen && moveEye(stepSeconds)) {
            draw();
        } else {
            cancelAnimationFrame(frameRequest);       // settled or off screen: wait for the next scroll
            frameRequest = null;
        }
    };
    const wake = () => {
        if (!onScreen || still.matches || frameRequest !== null) return;
        lastSeconds = null;
        lastDrawn = null;
        frameRequest = requestAnimationFrame(frame);
    };
    const update = () => {
        if (still.matches) {
            drawStill();
            window.logAnimation?.("parallax", "still", "reduced motion");
        } else if (onScreen) {
            wake();
            window.logAnimation?.("parallax", "running");
        } else {
            window.logAnimation?.("parallax", "paused", "off screen");
        }
    };
    new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        update();
    }).observe(container);
    still.addEventListener("change", update);
    window.addEventListener("scroll", wake, { passive: true });
}

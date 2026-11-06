// Draws the Parallax card's tunnel (tunnel.js) in three.js, seen through the card as a window: as
// the page scrolls, the eye passes the window from above to below and the near targets slide past
// the far frames. It draws at most 30 frames a second, only while the card is on screen and the eye
// is moving; with reduced motion, it shows one still frame from the middle.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MILLISECONDS_PER_SECOND, isTimeToDraw, pixelRatio } from "../../js/shared/frame-rate.js";
import { scrollShare } from "../../js/shared/motion.js";
import {
    COLOURS, CUBES, EYE_DISTANCE, TARGET, TARGET_POSITIONS, TARGET_RINGS, TUNNEL,
    easeTowards, eyeAt, frameGrey, windowFrustum, windowSize,
} from "./tunnel.js";

/** The camera sees from just in front of the eye to past the end of the tunnel. */
const NEAR = 1;
const FAR = EYE_DISTANCE + TUNNEL.frames * TUNNEL.spacing * 2;
const CIRCLE_SEGMENTS = 32;
const STICK_SEGMENTS = 8;
/** Each ring of a target sits this far in front of the one around it, so they never flicker. */
const RING_GAP = 0.2;
/** After a pause, carry on from where the eye was instead of jumping. */
const MAX_STEP_SECONDS = 0.1;
/** The eye is still once it is this close to where it is heading, in scene units: stop drawing. */
const STILL_DISTANCE = 0.05;
/** With reduced motion, the eye stays level with the middle of the window. */
const LEVEL = 0.5;

const flatMaterial = colour => new THREE.MeshBasicMaterial({ color: colour });

/** One frame of the tunnel: four bars around the window's edge, `depth` away. */
function frameGeometry(width, height, depth) {
    const bar = (barWidth, barHeight, centreX, centreY) => new THREE.PlaneGeometry(barWidth, barHeight).translate(centreX, centreY, -depth);
    const { barWidth } = TUNNEL;
    return mergeGeometries([
        bar(width, barWidth, 0, (height - barWidth) / 2),
        bar(width, barWidth, 0, -(height - barWidth) / 2),
        bar(barWidth, height, -(width - barWidth) / 2, 0),
        bar(barWidth, height, (width - barWidth) / 2, 0),
    ]);
}

/** The tunnel's frames, the size of the window, each one further away and darker. */
function tunnel(width, height) {
    const group = new THREE.Group();
    for (let index = 0; index < TUNNEL.frames; index++) {
        const grey = frameGrey(index);
        group.add(new THREE.Mesh(frameGeometry(width, height, index * TUNNEL.spacing), flatMaterial(new THREE.Color(grey, grey, grey))));
    }
    return group;
}

/** Every target's rings and sticks, merged into one mesh per colour. */
function targets() {
    const parts = { white: [], red: [], stick: [] };
    for (const [targetX, targetY, depth] of TARGET_POSITIONS) {
        TARGET_RINGS.forEach(([share, colour], index) => {
            parts[colour].push(new THREE.CircleGeometry(TARGET.radius * share, CIRCLE_SEGMENTS).translate(targetX, targetY, depth + index * RING_GAP));
        });
        parts.stick.push(new THREE.CylinderGeometry(TARGET.stickRadius, TARGET.stickRadius, TARGET.stickLength, STICK_SEGMENTS)
            .rotateX(Math.PI / 2)
            .translate(targetX, targetY, depth - TARGET.stickLength / 2));
    }
    const group = new THREE.Group();
    for (const [colour, geometries] of Object.entries(parts)) {
        group.add(new THREE.Mesh(mergeGeometries(geometries), flatMaterial(COLOURS[colour])));
    }
    return group;
}

/** The coloured cubes on the floor, with white edges. */
function cubes() {
    const group = new THREE.Group();
    const edges = new THREE.LineBasicMaterial({ color: COLOURS.white });
    for (const { position, size, colour } of CUBES) {
        const box = new THREE.BoxGeometry(size, size, size);
        const cube = new THREE.Mesh(box, flatMaterial(COLOURS[colour]));
        cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(box), edges));
        cube.position.set(...position);
        group.add(cube);
    }
    return group;
}

/** Frees a group's geometries and materials (the tunnel is rebuilt when the card changes shape). */
function dispose(group) {
    group.traverse(part => {
        part.geometry?.dispose();
        part.material?.dispose();
    });
}

/**
 * Draws the tunnel on a canvas inside `container` (positioned, any shape), with the eye following
 * the page's scroll. Throws if WebGL is unavailable.
 */
export function start(container) {
    const canvas = document.createElement("canvas");
    canvas.className = "parallax-tunnel";
    canvas.setAttribute("aria-hidden", "true");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(pixelRatio());
    renderer.setClearColor(COLOURS.background);
    container.append(canvas);

    const scene = new THREE.Scene();
    scene.add(targets(), cubes());
    let frames = null, windowWidth = 1, windowHeight = 1;
    const camera = new THREE.PerspectiveCamera();
    const scrolled = () => {
        const box = container.getBoundingClientRect();
        return scrollShare(box.top, box.height, window.innerHeight);
    };
    const eye = eyeAt(scrolled());

    const draw = () => {
        camera.position.set(eye[0], eye[1], EYE_DISTANCE);
        const { left, right, top, bottom } = windowFrustum([eye[0], eye[1], EYE_DISTANCE], windowWidth, windowHeight, NEAR);
        camera.projectionMatrix.makePerspective(left, right, top, bottom, NEAR, FAR);
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
        renderer.render(scene, camera);
    };
    const resize = () => {
        const { clientWidth: widthPixels, clientHeight: heightPixels } = container;
        if (!widthPixels || !heightPixels) return;
        renderer.setSize(widthPixels, heightPixels, false);
        [windowWidth, windowHeight] = windowSize(widthPixels / heightPixels);
        if (frames) {
            scene.remove(frames);
            dispose(frames);
        }
        frames = tunnel(windowWidth, windowHeight);
        scene.add(frames);
        draw();
    };
    /** Eases the eye towards where the scroll puts it; false once it is there (nothing to draw). */
    const moveEye = stepSeconds => {
        const target = eyeAt(scrolled());
        if (target.every((value, axis) => Math.abs(value - eye[axis]) < STILL_DISTANCE)) return false;
        target.forEach((value, axis) => { eye[axis] = easeTowards(eye[axis], value, stepSeconds); });
        return true;
    };
    const drawStill = () => {
        eye.splice(0, eye.length, ...eyeAt(LEVEL));
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

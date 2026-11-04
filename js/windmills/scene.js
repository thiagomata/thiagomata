// The windmills' live layers, over the windmill picture (js/windmills/picture.js): sails turning in
// three.js, and optionally the swaying grass (grass.js) and the northern lights (aurora.js).
//
// Each windmill's four lattice sails turn in a plane seen at an angle, as in the drawing. The
// canvases cover the picture exactly, and an orthographic camera maps one world unit to one
// picture unit, so positions are read straight off the drawing.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MILLISECONDS_PER_SECOND, isTimeToDraw, pixelRatio } from "../shared/frame-rate.js";
import { FULL_TURN } from "../shared/motion.js";
import { Aurora } from "./aurora.js";
import { Grass } from "./grass.js";
import { PICTURE, WINDMILLS } from "./picture.js";
import { sailSpeedAt } from "./wind.js";

const SAILS_PER_WINDMILL = 4;
/** The sails' plane turns this far away from the viewer, as in the drawing. */
const SAIL_PLANE_TURN_DEGREES = 55;
/** One turn of the sails at their normal speed. */
const SECONDS_PER_TURN = 9;
/** Without wind (no grass), the sails turn at their normal speed. */
const STEADY_SPEED = 1;
/** After a pause, carry on from where the sails were instead of jumping ahead. */
const MAX_STEP_SECONDS = 0.1;
/** The camera sees this far in front of and behind the picture's plane (the sails turn in depth). */
const CAMERA_DEPTH = 2000;

/** A sail, as shares of its length: the stock (the arm) and the lattice beside it. */
const SAIL = {
    stockWidth: 0.035,
    latticeStart: 0.22,     // the lattice begins this far from the hub
    latticeWidth: 0.2,
    barWidth: 0.012,
    crossBars: 16,
    hubRadius: 0.06,
};
const HUB_SEGMENTS = 24;
const COLOURS = {
    stock: "#2b2416",
    lattice: "#4a4331",
    cloth: "#2f2a1d",
    hub: "#1a150d",
};
const CLOTH_OPACITY = 0.45;

/** Flat colour on both sides, like the drawing. */
const flatMaterial = (colour, extra = {}) => new THREE.MeshBasicMaterial({ color: colour, side: THREE.DoubleSide, ...extra });

/** One sail's parts, pointing up from the hub: the stock, the lattice bars and the cloth. */
function sailParts(length) {
    const bar = (width, height, x, y) => new THREE.PlaneGeometry(width, height).translate(x, y, 0);
    const stockWidth = SAIL.stockWidth * length;
    const latticeFrom = SAIL.latticeStart * length;
    const latticeLength = length - latticeFrom;
    const latticeWidth = SAIL.latticeWidth * length;
    const barWidth = SAIL.barWidth * length;
    const latticeMiddleX = stockWidth / 2 + latticeWidth / 2;
    const latticeMiddleY = latticeFrom + latticeLength / 2;

    // The lattice: two rails along the sail (its middle and its outer edge) and bars across it.
    const rails = [latticeMiddleX, stockWidth / 2 + latticeWidth]
        .map(railX => bar(barWidth, latticeLength, railX, latticeMiddleY));
    const crossBars = Array.from({ length: SAIL.crossBars + 1 }, (_, index) =>
        bar(latticeWidth, barWidth, latticeMiddleX, latticeFrom + latticeLength * index / SAIL.crossBars));
    return {
        stock: [bar(stockWidth, length, 0, length / 2)],
        lattice: [...rails, ...crossBars],
        cloth: [bar(latticeWidth, latticeLength, latticeMiddleX, latticeMiddleY)],
    };
}

/** A windmill's sails, evenly spaced around the hub in the XY plane, as one turning group. */
function sailRig(length) {
    const parts = { stock: [], lattice: [], cloth: [] };
    for (let sail = 0; sail < SAILS_PER_WINDMILL; sail++) {
        const angle = sail * FULL_TURN / SAILS_PER_WINDMILL;
        for (const [name, geometries] of Object.entries(sailParts(length))) {
            parts[name].push(...geometries.map(geometry => geometry.rotateZ(angle)));
        }
    }
    const rig = new THREE.Group();
    rig.add(new THREE.Mesh(mergeGeometries(parts.cloth), flatMaterial(COLOURS.cloth, {
        transparent: true, opacity: CLOTH_OPACITY, depthWrite: false,
    })));
    rig.add(new THREE.Mesh(mergeGeometries(parts.lattice), flatMaterial(COLOURS.lattice)));
    rig.add(new THREE.Mesh(mergeGeometries(parts.stock), flatMaterial(COLOURS.stock)));
    rig.add(new THREE.Mesh(new THREE.CircleGeometry(SAIL.hubRadius * length, HUB_SEGMENTS), flatMaterial(COLOURS.hub)));
    return rig;
}

/** Each windmill's sails, on their hub, in the plane seen at an angle. */
function addSails(scene) {
    return WINDMILLS.map(({ hub: [hubX, hubY], sailLength }) => {
        const rig = sailRig(sailLength);
        const plane = new THREE.Group();
        plane.position.set(hubX, -hubY, 0);         // the picture's y points down, the world's up
        plane.rotation.y = THREE.MathUtils.degToRad(SAIL_PLANE_TURN_DEGREES);
        plane.add(rig);
        scene.add(plane);
        return { rig, hubX, angle: 0 };
    });
}

/**
 * Draws the sails over the picture inside `container` (positioned, with the picture's shape)
 * and turns them while the container is on screen. Throws if WebGL is unavailable.
 *
 * `grass: "front"` adds the swaying grass that grows in front of the windmills, over a picture
 * that already has its own grass and windmills (so nothing is drawn over a windmill from behind);
 * the wind (js/windmills/wind.js) then drives both the grass and the sails' speed.
 *
 * `aurora` adds the northern lights over the sky, under everything else; it needs
 * `windmillsImage` to keep the windmills dark.
 */
export function start(container, { grass = "none", windmillsImage = "", aurora: withAurora = false } = {}) {
    const windy = grass !== "none";
    const canvas = document.createElement("canvas");
    canvas.className = "windmill-sails";
    canvas.setAttribute("aria-hidden", "true");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(pixelRatio());

    const scene = new THREE.Scene();
    // The camera's view is the picture: (0, 0) at its top-left corner, y pointing down.
    const camera = new THREE.OrthographicCamera(0, PICTURE.width, 0, -PICTURE.height, -CAMERA_DEPTH, CAMERA_DEPTH);
    const sails = addSails(scene);

    // Layers, back to front: aurora, sails, then the front grass.
    const aurora = withAurora ? new Aurora(container, windmillsImage) : null;
    container.append(canvas);
    const grassLayers = windy ? [new Grass(container, "front")] : [];

    // Turns the sails by the time since the last frame: steadily, or with the wind at each hub.
    const turnSails = (seconds, stepSeconds) => {
        for (const windmill of sails) {
            const speed = windy ? sailSpeedAt(windmill.hubX, seconds) : STEADY_SPEED;
            windmill.angle -= FULL_TURN * speed * stepSeconds / SECONDS_PER_TURN;
            windmill.rig.rotation.z = windmill.angle;
        }
    };
    const draw = seconds => {
        aurora?.drawIfDue(seconds);
        renderer.render(scene, camera);
        for (const layer of grassLayers) layer.draw(seconds);
    };
    const resize = () => {
        const { clientWidth: widthPixels, clientHeight: heightPixels } = container;
        if (!widthPixels || !heightPixels) return;
        renderer.setSize(widthPixels, heightPixels, false);
        // The picture keeps its shape and its frame crops it: the card shows only this much of it.
        const shownWidth = Math.min(widthPixels, container.parentElement?.clientWidth ?? widthPixels);
        for (const layer of grassLayers) layer.resize(widthPixels, heightPixels, shownWidth);
        aurora?.resize(widthPixels, heightPixels);
        draw(performance.now() / MILLISECONDS_PER_SECOND);
    };
    animateWhileVisible(container, { turnSails, draw });
    new ResizeObserver(resize).observe(container);
    resize();
}

/**
 * Runs the animation while `container` is on screen, drawing at most 30 frames a second; with
 * reduced motion, shows a still frame.
 */
function animateWhileVisible(container, { turnSails, draw }) {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = false, frameRequest = null, lastSeconds = null, lastDrawn = null;

    const frame = now => {
        frameRequest = null;
        if (onScreen && !still.matches) frameRequest = requestAnimationFrame(frame);
        if (!isTimeToDraw(now, lastDrawn)) return;
        lastDrawn = now;
        const seconds = now / MILLISECONDS_PER_SECOND;
        const stepSeconds = lastSeconds === null ? 0 : Math.min(seconds - lastSeconds, MAX_STEP_SECONDS);
        lastSeconds = seconds;
        turnSails(seconds, stepSeconds);
        draw(seconds);
    };
    const update = () => {
        if (still.matches) {
            draw(0);
            window.logAnimation?.("elegant", "still", "reduced motion");
        } else if (onScreen) {
            if (frameRequest === null) {
                lastSeconds = null;
                lastDrawn = null;
                frameRequest = requestAnimationFrame(frame);
            }
            window.logAnimation?.("elegant", "running");
        } else {
            window.logAnimation?.("elegant", "paused", "off screen");
        }
    };
    new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        update();
    }).observe(container);
    still.addEventListener("change", update);
}

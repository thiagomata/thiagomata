// The Parallax Engine's hero scene (its src/docs/hero/hero_parallax.ts), rebuilt in three.js for
// a card: a cartoon village painted in layers at different depths, from the sky and mountains far
// away to the lamp post and the ground frame up close. As the page scrolls, the eye rises and sinks
// past it, so near layers slide more than far ones. Lab only, to judge it against the tunnel.
//
// Units follow the hero: one unit is about one pixel of the original artwork, and the eye rests at
// (0, 60, 150) looking into the scene. The hero's y points down; three.js's points up, so every y
// is negated here. Its pictures are WebP copies at 60% of their original size.
import * as THREE from "three";
import { MILLISECONDS_PER_SECOND, isTimeToDraw, pixelRatio } from "../../js/shared/frame-rate.js";
import { clamp, lerp, scrollShare } from "../../js/shared/motion.js";

const PICTURES = new URL("./img/", import.meta.url);

/** The far backdrops share layer-02's shape, 4000 units wide. */
const BACKDROP = { width: 4000, height: 4000 * 847 / 1603, depth: -2500 };

/**
 * Every layer, back to front: its picture, size and place (as in the hero, y down), and whether it
 * is mirrored (to extend the land sideways). The backdrops are 1.0, 0.9 and 0.8 copies of one box.
 */
const LAYERS = [
    { picture: "layer-01", width: BACKDROP.width, height: BACKDROP.height, at: [0, -450, BACKDROP.depth] },
    { picture: "layer-02", width: BACKDROP.width * 0.9, height: BACKDROP.height * 0.9, at: [400, -400, BACKDROP.depth * 0.9] },
    { picture: "layer-03", width: BACKDROP.width * 0.8, height: BACKDROP.height * 0.8, at: [-100, -400, BACKDROP.depth * 0.8] },
    { picture: "layer-05", width: 908, height: 565, at: [550, 50, -1200] },
    { picture: "layer-05", width: 908, height: 565, at: [550 + 908, 50, -1210], mirrored: true },
    { picture: "layer-04", width: 696, height: 507, at: [-350, 50, -800] },
    { picture: "layer-04", width: 696, height: 507, at: [-350 - 696, 50, -810], mirrored: true },
    { picture: "layer-09", width: 299, height: 495, at: [460, 100, -680] },
    { picture: "layer-06", width: 221, height: 813, at: [250, 180, -650] },
    { picture: "layer-07", width: 674, height: 594, at: [-250, 50, -420] },
    { picture: "layer-08", width: 872, height: 302, at: [470, 200, -400] },
    { picture: "layer-10", width: 70, height: 309, at: [-140, 0, -380], mirrored: true },
    { picture: "post-light", width: 48, height: 41, at: [-130, -135, -377], mirrored: true, tint: "#dfd2b8" },
    { picture: "layer-11", width: 1650, height: 1177, at: [0, -100, -300] },
];
/** The water under the waterfall: a wide floor ahead of and below the eye. */
const WATER = { colour: "#00ffff", size: 6000, at: [0, 400, -600] };
const SKY = "#1b2238";

const EYE = { at: [0, 60, 150], fieldOfViewDegrees: 45, near: 1, far: 10000 };
/**
 * The painted part of the scene, as angles from the eye (in degrees), with a small margin: the top
 * of the sky picture (layer 01), the bottom of the ground frame (layer 11), and the mountains'
 * edges (layer 02, the narrowest backdrop). The hero composed it for one screen shape and hid its
 * sides with walls; a card can be far wider or taller, so the camera fits inside it instead.
 */
const PAINTED = { up: 28, down: 41, across: 28 };
/** Looking slightly up, where there is room to, shows the sky and mountains on wide cards. */
const PREFERRED_TILT = 10;
/** Turning right, where there is room to (on tall cards), brings in the houses on the right. */
const PREFERRED_PAN = 12;

/**
 * The camera for a card `aspect` (width / height) wide: its vertical field of view, its tilt (up
 * positive) and its pan (right positive), in degrees, as wide as the card allows without looking
 * past the painted part. A wide card crops top and bottom (and tilts up, towards the sky); a tall
 * one crops the sides (and turns right, towards the houses).
 */
export function framing(aspect) {
    const tan = degrees => Math.tan(THREE.MathUtils.degToRad(degrees));
    const atan = value => THREE.MathUtils.radToDeg(Math.atan(value));
    const tallest = (PAINTED.up + PAINTED.down) / 2;
    let halfUp = Math.min(EYE.fieldOfViewDegrees / 2, tallest);
    if (atan(tan(halfUp) * aspect) > PAINTED.across) halfUp = atan(tan(PAINTED.across) / aspect);
    const halfAcross = atan(tan(halfUp) * aspect);
    const tilt = clamp(PREFERRED_TILT, halfUp - PAINTED.down, PAINTED.up - halfUp);
    const pan = clamp(PREFERRED_PAN, 0, PAINTED.across - halfAcross);
    return { fieldOfView: 2 * halfUp, tilt, pan };
}

/** As the card scrolls through the screen, the eye moves this far up and down from its rest. */
const SCROLL_RISE = 70;
/** Transparent pixels below this alpha are cut out, so layers never hide what is behind them. */
const ALPHA_CUTOFF = 0.5;
/** The eye eases towards where the scroll puts it: this share of the way each second. */
const EASING_PER_SECOND = 0.95;
/** The eye is still once this close to where it is heading: stop drawing. */
const STILL_DISTANCE = 0.05;
const MAX_STEP_SECONDS = 0.1;

/** A point of the hero's world (y down) in three.js's (y up). */
const fromHero = ([across, down, depth]) => new THREE.Vector3(across, -down, depth);

function layerMesh(loader, { picture, width, height, at, mirrored = false, tint = "#ffffff" }) {
    const texture = loader.load(new URL(`${picture}.webp`, PICTURES).href);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, color: tint, alphaTest: ALPHA_CUTOFF, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.copy(fromHero(at));
    if (mirrored) mesh.scale.x = -1;
    return mesh;
}

function water() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(WATER.size, WATER.size), new THREE.MeshBasicMaterial({ color: WATER.colour }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.copy(fromHero(WATER.at));
    return floor;
}

/** Draws the scene on a canvas inside `container`, moving with the page's scroll. Throws without WebGL. */
export function start(container) {
    const canvas = document.createElement("canvas");
    canvas.className = "parallax-hero";
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
    const rest = fromHero(EYE.at);

    const scrolled = () => {
        const box = container.getBoundingClientRect();
        return scrollShare(box.top, box.height, window.innerHeight);
    };
    const eyeHeightFor = share => rest.y + lerp(SCROLL_RISE, -SCROLL_RISE, share);
    let eyeHeight = eyeHeightFor(scrolled());
    let view = framing(1);

    const draw = () => {
        camera.position.set(rest.x, eyeHeight, rest.z);
        camera.rotation.set(THREE.MathUtils.degToRad(view.tilt), -THREE.MathUtils.degToRad(view.pan), 0, "YXZ");
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

    let frameRequest = null, lastDrawn = null, lastSeconds = null;
    const frame = now => {
        frameRequest = requestAnimationFrame(frame);
        if (!isTimeToDraw(now, lastDrawn)) return;
        lastDrawn = now;
        const seconds = now / MILLISECONDS_PER_SECOND;
        const step = lastSeconds === null ? 0 : Math.min(seconds - lastSeconds, MAX_STEP_SECONDS);
        lastSeconds = seconds;
        const target = eyeHeightFor(scrolled());
        if (Math.abs(target - eyeHeight) < STILL_DISTANCE) {
            cancelAnimationFrame(frameRequest);       // settled: wait for the next scroll
            frameRequest = null;
            return;
        }
        eyeHeight = target + (eyeHeight - target) * (1 - EASING_PER_SECOND) ** step;
        draw();
    };
    const wake = () => {
        if (frameRequest !== null) return;
        lastDrawn = null;
        lastSeconds = null;
        frameRequest = requestAnimationFrame(frame);
    };
    window.addEventListener("scroll", wake, { passive: true });
    new ResizeObserver(resize).observe(container);
    resize();
}

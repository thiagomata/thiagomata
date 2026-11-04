// The windmills' sails for the Elegant card, drawn with three.js over img/simple2-no-sails.svg
// (the picture without its sails). Each windmill gets four lattice sails turning in a plane seen
// at an angle, like in the original drawing.
//
// The canvas covers the picture exactly; an orthographic camera maps one world unit to one unit
// of the picture's viewBox (4294 x 2474), so positions below are read straight off the picture.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const PICTURE = { width: 4294, height: 2474 };

/** Where each windmill's sails turn (their hub, in picture units) and how big they are. */
const WINDMILLS = [
    { name: "left", hub: [1603, 1870], sailLength: 260 },
    { name: "right", hub: [2936, 1895], sailLength: 450 },
];

/** The sails' plane turns this far away from the viewer, as in the drawing. */
const SAIL_PLANE_TURN_DEGREES = 55;
const SECONDS_PER_TURN = 9;

/** A sail, as shares of its length: the stock (the arm) and the lattice beside it. */
const SAIL = {
    stockWidth: 0.035,
    latticeStart: 0.22,     // the lattice begins this far from the hub
    latticeWidth: 0.2,
    barWidth: 0.012,
    crossBars: 16,
    hubRadius: 0.06,
};
const COLOURS = {
    stock: "#2b2416",
    lattice: "#4a4331",
    cloth: "#2f2a1d",
    hub: "#1a150d",
};
const CLOTH_OPACITY = 0.45;

/** Four sails pointing up, right, down and left from the hub, in the XY plane. */
function sailRig(length) {
    const bar = (width, height, x, y) => new THREE.PlaneGeometry(width, height).translate(x, y, 0);
    const stock = [], lattice = [], cloth = [];
    const { stockWidth, latticeStart, latticeWidth, barWidth, crossBars } = SAIL;
    const start = latticeStart * length, panel = length - start, side = latticeWidth * length;

    for (let sail = 0; sail < 4; sail++) {
        const turn = (geometry) => geometry.rotateZ(sail * Math.PI / 2);
        stock.push(turn(bar(stockWidth * length, length, 0, length / 2)));
        // The lattice: two rails along the sail and bars across it, beside the stock.
        const middleX = stockWidth * length / 2 + side / 2;
        for (const railX of [stockWidth * length / 2 + side, middleX]) {
            lattice.push(turn(bar(barWidth * length, panel, railX, start + panel / 2)));
        }
        for (let cross = 0; cross <= crossBars; cross++) {
            const y = start + panel * cross / crossBars;
            lattice.push(turn(bar(side, barWidth * length, middleX, y)));
        }
        cloth.push(turn(bar(side, panel, middleX, start + panel / 2)));
    }

    const rig = new THREE.Group();
    rig.add(new THREE.Mesh(mergeGeometries(cloth), new THREE.MeshBasicMaterial({
        color: COLOURS.cloth, transparent: true, opacity: CLOTH_OPACITY, side: THREE.DoubleSide, depthWrite: false,
    })));
    rig.add(new THREE.Mesh(mergeGeometries(lattice), new THREE.MeshBasicMaterial({ color: COLOURS.lattice, side: THREE.DoubleSide })));
    rig.add(new THREE.Mesh(mergeGeometries(stock), new THREE.MeshBasicMaterial({ color: COLOURS.stock, side: THREE.DoubleSide })));
    rig.add(new THREE.Mesh(new THREE.CircleGeometry(SAIL.hubRadius * length, 24), new THREE.MeshBasicMaterial({ color: COLOURS.hub })));
    return rig;
}

/**
 * Draws the sails over the picture inside `container` (positioned, with the picture's shape)
 * and turns them while the container is on screen. Throws if WebGL is unavailable.
 */
export function start(container) {
    const canvas = document.createElement("canvas");
    canvas.className = "windmill-sails";
    canvas.setAttribute("aria-hidden", "true");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    // Picture units, y pointing down like the SVG: (0, 0) is the picture's top-left corner.
    const camera = new THREE.OrthographicCamera(0, PICTURE.width, 0, -PICTURE.height, -2000, 2000);

    const spinners = WINDMILLS.map(({ hub, sailLength }) => {
        const plane = new THREE.Group();
        plane.position.set(hub[0], -hub[1], 0);
        plane.rotation.y = THREE.MathUtils.degToRad(SAIL_PLANE_TURN_DEGREES);
        const spinner = sailRig(sailLength);
        plane.add(spinner);
        scene.add(plane);
        return spinner;
    });

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = false, frameRequest = null;
    const draw = seconds => {
        const angle = -2 * Math.PI * seconds / SECONDS_PER_TURN;
        for (const spinner of spinners) spinner.rotation.z = angle;
        renderer.render(scene, camera);
    };
    const frame = now => {
        frameRequest = null;
        draw(now / 1000);
        if (onScreen && !still.matches) frameRequest = requestAnimationFrame(frame);
    };
    const run = () => {
        if (still.matches) {
            draw(0);
            window.logAnimation?.("elegant", "still", "reduced motion");
        } else if (onScreen) {
            if (frameRequest === null) frameRequest = requestAnimationFrame(frame);
            window.logAnimation?.("elegant", "running");
        } else {
            window.logAnimation?.("elegant", "paused", "off screen");
        }
    };
    const resize = () => {
        const { clientWidth: width, clientHeight: height } = container;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        draw(performance.now() / 1000);
    };

    new ResizeObserver(resize).observe(container);
    new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        run();
    }).observe(container);
    still.addEventListener("change", run);

    container.append(canvas);
    resize();
}

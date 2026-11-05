// Draws the people of a Crowd simulation (js/ideia/crowd.js) as flat illustrated sprites that
// always face the camera, all in one instanced mesh.
import * as THREE from "three";
import { INK_CSS } from "./plan.js";
import { FACING } from "./crowd.js";

const PEOPLE = {
    childShare: 0.08,
    childHeight: [0.6, 0.75],       // relative to FIGURE_SIZE
    adultHeight: [0.82, 1.16],
    build: [0.9, 1.1],              // narrower or broader
};

// Looks (clothes, skin, hair) x views (front, back, side) x walking frames, drawn like the
// site's vector illustrations: flat fills with an ink outline.

const LOOKS = 32;
/** Sheet row block for each way a person can face (see FACING in crowd.js). */
const VIEW = { [FACING.front]: 0, [FACING.back]: 1, [FACING.side]: 2 };
const VIEWS = Object.keys(VIEW).length;
const STRIDE = [-1, 0, 1, 0];      // leg swing in each walking frame
const FRAMES = STRIDE.length;
const STANDING_FRAME = STRIDE.indexOf(0);
const STEPS_PER_SECOND = 8;

const CELL = { width: 48, height: 96 };
const SHEET_COLUMNS = 16;
const SHEET_ROWS = LOOKS * VIEWS * FRAMES / SHEET_COLUMNS;

/** The figure's size in the world (cars are 22 tall) and when a sprite pixel counts as solid. */
const FIGURE_SIZE = { width: 13, height: 26 };
const ALPHA_CUTOFF = 0.5;

const LONG_HAIR_SHARE = 0.4;
const SHIRTS = ["#B07461", "#7FAFBB", "#BBBD41", "#687FA2", "#D9D9D9", "#925854", "#F6BF78", "#511201", "#97AD53", "#43474E"];
const TROUSERS = ["#192840", "#28393B", "#363636", "#635E5E", "#29201B", "#354146"];
const SKINS = ["#F1C9A5", "#D9A37C", "#B48778", "#A8714F", "#6E4A33"];
const HAIR = ["#1B1512", "#29201B", "#4A2E21", "#7A5232", "#B48A52", "#D8C08A", "#8C8C8C", "#511201"];

/** Proportions of the drawn figure, in pixels of its cell. */
const BODY = {
    centreX: 24,
    outline: 2.5,
    head: { y: 19, radius: 9, profileShift: 1 },
    hair: { radius: 9.5, lift: 1 },
    torso: { top: 30, height: 33, width: 22, profileWidth: 15, corner: 6 },
    shoulderY: 36, handY: 58, hipY: 60, footY: 90,
    hipSpread: 4, shoulderSpread: 10, handSpread: 12,
    legWidth: 6, armWidth: 4,
    stride: 7, armSwing: 0.6, profileArmSwing: 0.8,
    longHair: {
        front: { left: 14, top: 12, width: 20, height: 22, corner: 7 },
        back: { left: 14, top: 14, width: 20, height: 24, corner: 7 },
        profile: { left: 13, top: 12, width: 14, height: 22, corner: 6 },
    },
    // Hair over the head, as arcs in fractions of a half turn.
    fringe: { from: 1.05, to: 1.95 },
    profileHair: { from: 0.6, to: 1.85 },
};

const sheetCell = (look, view, frame) => (look * VIEWS + view) * FRAMES + frame;

function drawFigure(context, { shirt, trousers, skin, hair, longHair }, view, frame) {
    const outlined = (fill, draw) => {
        context.fillStyle = fill;
        context.beginPath();
        draw();
        context.fill();
        context.stroke();
    };
    const limb = (fromX, fromY, toX, toY, colour, width) => {
        context.beginPath();
        context.moveTo(fromX, fromY);
        context.lineTo(toX, toY);
        context.lineWidth = width + BODY.outline;
        context.strokeStyle = INK_CSS;
        context.stroke();
        context.lineWidth = width;
        context.strokeStyle = colour;
        context.stroke();
        context.lineWidth = BODY.outline;
        context.strokeStyle = INK_CSS;
    };
    const box = ({ left, top, width, height, corner }) => () => context.roundRect(left, top, width, height, corner);
    const circle = (middleX, middleY, radius) => () => context.arc(middleX, middleY, radius, 0, Math.PI * 2);
    const arc = (middleX, middleY, radius, { from, to }) => () => {
        context.arc(middleX, middleY, radius, Math.PI * from, Math.PI * to);
        context.closePath();
    };

    const { centreX, head, torso } = BODY;
    const swing = STRIDE[frame] * BODY.stride;

    if (view === VIEW.side) {
        // Profile facing right: both legs and the near arm swing forwards and back.
        const headX = centreX + head.profileShift;
        limb(centreX, BODY.hipY, centreX + swing, BODY.footY, trousers, BODY.legWidth);
        limb(centreX, BODY.hipY, centreX - swing, BODY.footY, trousers, BODY.legWidth);
        outlined(shirt, box({
            left: centreX - torso.profileWidth / 2, top: torso.top,
            width: torso.profileWidth, height: torso.height, corner: torso.corner,
        }));
        limb(centreX, BODY.shoulderY, centreX - swing * BODY.profileArmSwing, BODY.handY, skin, BODY.armWidth);
        if (longHair) outlined(hair, box(BODY.longHair.profile));
        outlined(skin, circle(headX, head.y, head.radius));
        outlined(hair, arc(headX, head.y - BODY.hair.lift, BODY.hair.radius, BODY.profileHair));
        return;
    }

    for (const side of [-1, 1]) {
        limb(centreX + side * BODY.hipSpread, BODY.hipY,
            centreX + side * BODY.hipSpread - side * swing, BODY.footY, trousers, BODY.legWidth);
        limb(centreX + side * BODY.shoulderSpread, BODY.shoulderY,
            centreX + side * BODY.handSpread + side * swing * BODY.armSwing, BODY.handY, skin, BODY.armWidth);
    }
    outlined(shirt, box({
        left: centreX - torso.width / 2, top: torso.top, width: torso.width, height: torso.height, corner: torso.corner,
    }));
    if (view === VIEW.back) {
        // From behind the head is all hair, and long hair falls over the shoulders.
        if (longHair) outlined(hair, box(BODY.longHair.back));
        outlined(hair, circle(centreX, head.y, BODY.hair.radius));
        return;
    }
    if (longHair) outlined(hair, box(BODY.longHair.front));
    outlined(skin, circle(centreX, head.y, head.radius));
    outlined(hair, arc(centreX, head.y - BODY.hair.lift, BODY.hair.radius, BODY.fringe));
}

function spriteSheet(renderer, random) {
    const canvas = document.createElement("canvas");
    canvas.width = SHEET_COLUMNS * CELL.width;
    canvas.height = SHEET_ROWS * CELL.height;
    const context = canvas.getContext("2d");
    context.lineCap = context.lineJoin = "round";
    context.lineWidth = BODY.outline;
    context.strokeStyle = INK_CSS;
    for (let look = 0; look < LOOKS; look++) {
        const appearance = {
            shirt: random.pick(SHIRTS),
            trousers: random.pick(TROUSERS),
            skin: random.pick(SKINS),
            hair: random.pick(HAIR),
            longHair: random.chance(LONG_HAIR_SHARE),
        };
        for (let view = 0; view < VIEWS; view++) {
            for (let frame = 0; frame < FRAMES; frame++) {
                const cell = sheetCell(look, view, frame);
                context.save();
                context.translate((cell % SHEET_COLUMNS) * CELL.width, Math.floor(cell / SHEET_COLUMNS) * CELL.height);
                drawFigure(context, appearance, view, frame);
                context.restore();
            }
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

/** One instanced quad per person; the `spriteCell` attribute picks each one's cell of the sheet. */
function crowdMesh(texture, count) {
    const quad = new THREE.PlaneGeometry(FIGURE_SIZE.width, FIGURE_SIZE.height)
        .translate(0, FIGURE_SIZE.height / 2, 0);                          // feet at the origin
    const cells = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    cells.setUsage(THREE.DynamicDrawUsage);
    quad.setAttribute("spriteCell", cells);
    const material = new THREE.MeshBasicMaterial({ map: texture, alphaTest: ALPHA_CUTOFF, side: THREE.DoubleSide });
    material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nattribute float spriteCell;")
            .replace("#include <uv_vertex>", `#include <uv_vertex>
                vec2 cell = vec2(mod(spriteCell, ${SHEET_COLUMNS}.0), ${SHEET_ROWS - 1}.0 - floor(spriteCell / ${SHEET_COLUMNS}.0));
                vMapUv = (cell + uv) / vec2(${SHEET_COLUMNS}.0, ${SHEET_ROWS}.0);`);
    };
    const mesh = new THREE.InstancedMesh(quad, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    return { mesh, cells };
}

export class CrowdView {
    /** `random` (the layout's stream) chooses how each person looks. */
    constructor(scene, renderer, crowd, random) {
        this.crowd = crowd;
        this.appearances = crowd.people.map(() => {
            const child = random.chance(PEOPLE.childShare);
            return {
                height: random.range(...(child ? PEOPLE.childHeight : PEOPLE.adultHeight)),
                build: random.range(...PEOPLE.build),
                look: random.integer(0, LOOKS - 1),
                stepOffset: random.range(0, FRAMES),
            };
        });
        const { mesh, cells } = crowdMesh(spriteSheet(renderer, random), crowd.people.length);
        this.mesh = mesh;
        this.cells = cells;
        this.placement = new THREE.Object3D();
        scene.add(mesh);
    }

    /** Places everyone for simulation time `seconds`, turned towards the camera. */
    update(seconds, camera) {
        this.crowd.people.forEach((person, index) => {
            const { x: personX, z: personZ, facing, mirror, walking } = this.crowd.pose(person, seconds);
            const { height, build, look, stepOffset } = this.appearances[index];
            this.placement.quaternion.copy(camera.quaternion);
            this.placement.position.set(personX, 0, personZ);
            this.placement.scale.set(build * height * mirror, height, 1);
            this.placement.updateMatrix();
            this.mesh.setMatrixAt(index, this.placement.matrix);
            const frame = walking ? Math.floor(seconds * STEPS_PER_SECOND + stepOffset) % FRAMES : STANDING_FRAME;
            this.cells.array[index] = sheetCell(look, VIEW[facing], frame);
        });
        this.mesh.instanceMatrix.needsUpdate = true;
        this.cells.needsUpdate = true;
    }
}

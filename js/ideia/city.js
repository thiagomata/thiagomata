// The static city: buildings with lit windows, the two streets, their markings and the trees.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
    COLOURS, CROSSING_MIDDLE, CROSSING_OUTER_EDGE, JUNCTION_Y, MAIN_LANE_DIVIDERS, MAIN_ROAD,
    MAIN_SIDEWALKS, MAIN_STREET_CENTRE_X, ROAD_HALF_WIDTH, STREET_LENGTH, isNearJunction, worldX, worldZ,
} from "./plan.js";
import { addOutline, inkEdges, paintGeometry, toonMaterial } from "./style.js";

const BUILDING_COLOURS = [
    "#7FAFBB",
    "#819FAC",
    "#687FA2",
    "#B48778",
    "#AA8B7D",
    "#B07461",
    "#925854",
    "#635E5E",
    "#43474E",
    "#354146",
    "#737373",
    "#9A8F86",
];

const LEAF_COLOURS = [          // from light to dark
    "#B6CB70",
    "#A9C063",
    "#97AD53",
    "#85AC51",
    "#6B9C4B",
    "#648535",
    "#507436",
    "#486C30",
    "#38552E",
];

const TRUNK_COLOUR = "#604031";

/** Height of each flat layer, a little above the one below so they never fight for pixels. */
const LAYER_HEIGHT = {
    ground: 0,
    sidewalk: 0.3,
    road: 0.6,
    laneLines: 0.9,
    zebras: 1.0,
    diagonalZebras: 1.1,
};

/** Adds the whole city to the scene. `random` is the layout's random stream. */
export function buildCity(scene, renderer, random) {
    addBuildings(scene, renderer, random);
    addGround(scene);
    addMarkings(scene);
    addTrees(scene, random);
}

// --- Buildings -----------------------------------------------------------------------------

/** One square tile of windows, repeated over every wall (pixels = world units). */
const WINDOWS = {
    tileSize: 256,
    cellSize: 32,
    pane: { left: 9, top: 8, width: 14, height: 16 },     // inside each cell
    litShare: 0.62,
};
const ROOF_UV = 0.01;               // a corner of the tile with no window in it
const WALL_TINT = "#fff";           // multiplied by each building's colour
const DARK_PANE = "#555";
const NO_GLOW = "#000";

/** Each building's colour is shifted by up to this much lightness, so neighbours differ. */
const LIGHTNESS_VARIATION = 0.1;
const LIGHTNESS_STEPS = 21;
const LIGHTNESS_SCRAMBLE = 97;      // coprime with the steps: next-door buildings get unrelated shades

// Two rows of buildings on each side: one along the sidewalk and a taller one behind it.
const FRONT_ROW = {
    firstY: 40,
    depth: [110, 210],
    width: [170, 260],
    heights: [90, 140, 180, 220, 260, 320, 400],
    gap: [14, 40],
};
const BACK_ROW = {
    firstY: 80,
    depth: [150, 260],
    width: [180, 300],
    heights: [200, 280, 360, 460],
    gap: [20, 60],
};
const GAP_BETWEEN_ROWS = 30;
const ROWS_END_BEFORE_STREET_END = 100;

/** A tile of windows, some lit and some dark. */
function windowTexture(renderer, litWindows, background, litColour, darkColour) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = WINDOWS.tileSize;
    const context = canvas.getContext("2d");
    context.fillStyle = background;
    context.fillRect(0, 0, WINDOWS.tileSize, WINDOWS.tileSize);

    const cellsPerRow = WINDOWS.tileSize / WINDOWS.cellSize;
    litWindows.forEach((lit, index) => {
        context.fillStyle = lit ? litColour : darkColour;
        context.fillRect(
            (index % cellsPerRow) * WINDOWS.cellSize + WINDOWS.pane.left,
            Math.floor(index / cellsPerRow) * WINDOWS.cellSize + WINDOWS.pane.top,
            WINDOWS.pane.width,
            WINDOWS.pane.height,
        );
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

/**
 * A building block. Wall UVs are in world units / tile size, so windows keep the same size on
 * every building; the roof samples a window-free corner of the tile.
 */
function buildingGeometry(width, height, depth, colour) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const uv = geometry.attributes.uv;
    const VERTICES_PER_FACE = 4;
    const faceSizes = [         // in BoxGeometry's face order: +x, -x, +y, -y, +z, -z
        [depth, height],
        [depth, height],
        null,
        null,
        [width, height],
        [width, height],
    ];
    faceSizes.forEach((size, face) => {
        for (let vertex = face * VERTICES_PER_FACE; vertex < (face + 1) * VERTICES_PER_FACE; vertex++) {
            if (size) {
                uv.setXY(
                    vertex,
                    uv.getX(vertex) * size[0] / WINDOWS.tileSize,
                    uv.getY(vertex) * size[1] / WINDOWS.tileSize,
                );
            } else {
                uv.setXY(vertex, ROOF_UV, ROOF_UV);
            }
        }
    });
    return paintGeometry(geometry, colour);
}

function addBuildings(scene, renderer, random) {
    const cellsPerTile = (WINDOWS.tileSize / WINDOWS.cellSize) ** 2;
    const litWindows = Array.from({ length: cellsPerTile }, () => random.chance(WINDOWS.litShare));
    const wallMap = windowTexture(renderer, litWindows, WALL_TINT, WALL_TINT, DARK_PANE);
    const glowMap = windowTexture(renderer, litWindows, NO_GLOW, COLOURS.windowLight, NO_GLOW);

    const blocks = [];
    const addBlock = (planX, planY, width, depth, height) => {
        // The cross street and its sidewalks stay open.
        const crossesCrossStreet =
            planY < JUNCTION_Y + CROSSING_OUTER_EDGE && planY + depth > JUNCTION_Y - CROSSING_OUTER_EDGE;
        if (crossesCrossStreet) return;
        const step = (blocks.length * LIGHTNESS_SCRAMBLE) % LIGHTNESS_STEPS;
        const shade = (step / (LIGHTNESS_STEPS - 1) * 2 - 1) * LIGHTNESS_VARIATION;
        const colour = new THREE.Color(random.pick(BUILDING_COLOURS)).offsetHSL(0, 0, shade);
        const geometry = buildingGeometry(width, height, depth, colour);
        geometry.translate(worldX(planX + width / 2), height / 2, worldZ(planY + depth / 2));
        blocks.push(geometry);
    };

    // `edge` is where a row's buildings line up; rows on the left grow away to the left.
    const backRowOffset = FRONT_ROW.width[1] + GAP_BETWEEN_ROWS;
    const rows = [
        { ...FRONT_ROW, edge: MAIN_SIDEWALKS[0][0], growsLeft: true },
        { ...BACK_ROW, edge: MAIN_SIDEWALKS[0][0] - backRowOffset, growsLeft: true },
        { ...FRONT_ROW, edge: MAIN_SIDEWALKS[1][1], growsLeft: false },
        { ...BACK_ROW, edge: MAIN_SIDEWALKS[1][1] + backRowOffset, growsLeft: false },
    ];
    for (const row of rows) {
        for (let planY = row.firstY; planY < STREET_LENGTH - ROWS_END_BEFORE_STREET_END;) {
            const depth = random.integer(...row.depth);
            const width = random.integer(...row.width);
            const height = random.pick(row.heights);
            addBlock(row.growsLeft ? row.edge - width : row.edge, planY, width, depth, height);
            planY += depth + random.integer(...row.gap);
        }
    }

    const city = mergeGeometries(blocks);
    scene.add(new THREE.Mesh(city, toonMaterial({
        map: wallMap,
        vertexColors: true,
        emissiveMap: glowMap,
        emissive: 0xffffff,
    })));
    scene.add(inkEdges(city));
}

// --- Ground ---------------------------------------------------------------------------------

/** How far the ground and the cross street reach: well past what the camera can see. */
const GROUND_EXTENT = 4000;

function addFlatArea(scene, width, depth, colour, centreZ, height) {
    const area = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), toonMaterial({ color: colour }));
    area.rotation.x = -Math.PI / 2;
    area.position.set(0, height, centreZ);
    scene.add(area);
}

function addGround(scene) {
    const streetMiddle = worldZ(STREET_LENGTH / 2), junction = worldZ(JUNCTION_Y);
    const mainSidewalksWidth = MAIN_SIDEWALKS[1][1] - MAIN_SIDEWALKS[0][0];
    const mainRoadWidth = MAIN_ROAD[1] - MAIN_ROAD[0];
    addFlatArea(scene, GROUND_EXTENT, STREET_LENGTH + GROUND_EXTENT, COLOURS.ground, streetMiddle, LAYER_HEIGHT.ground);
    addFlatArea(scene, mainSidewalksWidth, STREET_LENGTH, COLOURS.sidewalk, streetMiddle, LAYER_HEIGHT.sidewalk);
    addFlatArea(scene, mainRoadWidth, STREET_LENGTH, COLOURS.road, streetMiddle, LAYER_HEIGHT.road);
    addFlatArea(scene, GROUND_EXTENT, 2 * CROSSING_OUTER_EDGE, COLOURS.sidewalk, junction, LAYER_HEIGHT.sidewalk);
    addFlatArea(scene, GROUND_EXTENT, 2 * ROAD_HALF_WIDTH, COLOURS.road, junction, LAYER_HEIGHT.road);
}

// --- Markings -------------------------------------------------------------------------------

const DASH = { width: 4, length: 40, spacing: 90, firstY: 20 };
/** Lane lines stop this far before the zebra crossings. */
const DASHES_STOP_BEFORE_CROSSING = 20;

const ZEBRA = {
    bars: 11,
    diagonalBars: 15,
    barWidth: 9,
    barLength: 50,
    spacing: 18,
    kerbInset: 10,          // the first bar starts this far from the kerb
};

/** Many identical flat marks (one instanced mesh); `turn` rotates them on the ground. */
function addMarks(scene, positions, width, length, colour, turn = 0) {
    const marks = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(width, length),
        new THREE.MeshBasicMaterial({ color: colour }),
        positions.length,
    );
    const placement = new THREE.Object3D();
    positions.forEach((position, index) => {
        placement.rotation.set(-Math.PI / 2, 0, turn);
        placement.position.set(...position);
        placement.updateMatrix();
        marks.setMatrixAt(index, placement.matrix);
    });
    scene.add(marks);
}

/** Distance from the kerb to the middle of each zebra bar, across one road. */
const zebraBarOffsets = () =>
    Array.from({ length: ZEBRA.bars }, (_, bar) => ZEBRA.kerbInset + bar * ZEBRA.spacing + ZEBRA.barWidth / 2);

/** Lane lines, and the scramble: zebra crossings on all four sides and both diagonals. */
function addMarkings(scene) {
    // Dashed lines along the main street, stopping before the junction.
    const centreLine = [], laneLines = [];
    for (let planY = DASH.firstY; planY < STREET_LENGTH; planY += DASH.spacing) {
        if (isNearJunction(planY, CROSSING_OUTER_EDGE + DASHES_STOP_BEFORE_CROSSING)) continue;
        const dashZ = worldZ(planY);
        centreLine.push([worldX(MAIN_STREET_CENTRE_X), LAYER_HEIGHT.laneLines, dashZ]);
        for (const planX of MAIN_LANE_DIVIDERS) laneLines.push([worldX(planX), LAYER_HEIGHT.laneLines, dashZ]);
    }
    addMarks(scene, centreLine, DASH.width, DASH.length, COLOURS.centreLine);
    addMarks(scene, laneLines, DASH.width, DASH.length, COLOURS.laneLine);

    const sides = [-1, 1];
    const acrossMainStreet = sides.flatMap(side => zebraBarOffsets().map(offset =>
        [worldX(MAIN_ROAD[0] + offset), LAYER_HEIGHT.zebras, side * CROSSING_MIDDLE]));
    addMarks(scene, acrossMainStreet, ZEBRA.barWidth, ZEBRA.barLength, COLOURS.zebra);

    const acrossCrossStreet = sides.flatMap(side => zebraBarOffsets().map(offset =>
        [side * CROSSING_MIDDLE, LAYER_HEIGHT.zebras, offset - ROAD_HALF_WIDTH]));
    addMarks(scene, acrossCrossStreet, ZEBRA.barLength, ZEBRA.barWidth, COLOURS.zebra);

    // The two diagonals through the middle of the junction, bars square to the walking line.
    const diagonals = [
        { direction: 1, turn: -Math.PI / 4 },
        { direction: -1, turn: Math.PI / 4 },
    ];
    for (const { direction, turn } of diagonals) {
        const bars = Array.from({ length: ZEBRA.diagonalBars }, (_, bar) => {
            const along = ((bar + 0.5) / ZEBRA.diagonalBars - 0.5) * 2 * ROAD_HALF_WIDTH;
            return [along, LAYER_HEIGHT.diagonalZebras, direction * along];
        });
        addMarks(scene, bars, ZEBRA.barWidth, ZEBRA.barLength, COLOURS.zebra, turn);
    }
}

// --- Trees ----------------------------------------------------------------------------------

const TREES = {
    kerbOffset: 10,             // planted this far back from the kerb, on the sidewalk
    spacing: 170,
    firstY: 90,
    endBeforeStreetEnd: 100,
    junctionClearance: 240,     // no trees this close to the junction centre
};
const TRUNK = { topRadius: 2.5, bottomRadius: 3.5, height: 42, sides: 8, outlineGrow: 1.25 };
/** The canopy: overlapping spheres, wide and dark at the bottom, small and light on top. */
const CANOPY = {
    puffs: 6,
    bottomRadius: 15,
    topRadius: 10,
    radiusJitter: 4,
    bottomHeight: 46,
    rise: 22,
    bottomSpread: 10,           // how far the bottom puffs sit from the trunk
    sphereDetail: [14, 10],
    shadeJitter: 3,             // steps of LEAF_COLOURS a puff may be darker than its height says
    lightestShare: 0.8,         // how much of LEAF_COLOURS the bottom-to-top gradient uses
    outlineGrow: 1.07,
};

function addTrees(scene, random) {
    const spots = [];
    const kerbs = [MAIN_ROAD[0] - TREES.kerbOffset, MAIN_ROAD[1] + TREES.kerbOffset];
    for (const planX of kerbs) {
        for (let planY = TREES.firstY; planY < STREET_LENGTH - TREES.endBeforeStreetEnd; planY += TREES.spacing) {
            if (!isNearJunction(planY, TREES.junctionClearance)) spots.push([worldX(planX), worldZ(planY)]);
        }
    }

    const trunks = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(TRUNK.topRadius, TRUNK.bottomRadius, TRUNK.height, TRUNK.sides),
        toonMaterial({ color: TRUNK_COLOUR }),
        spots.length,
    );
    const canopies = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, ...CANOPY.sphereDetail),
        toonMaterial(),
        spots.length * CANOPY.puffs,
    );

    const placement = new THREE.Object3D();
    const darkestShade = LEAF_COLOURS.length - 1;
    spots.forEach(([spotX, spotZ], tree) => {
        placement.scale.setScalar(1);
        placement.position.set(spotX, TRUNK.height / 2, spotZ);
        placement.updateMatrix();
        trunks.setMatrixAt(tree, placement.matrix);

        for (let puff = 0; puff < CANOPY.puffs; puff++) {
            const height = puff / (CANOPY.puffs - 1);          // 0 at the bottom, 1 on top
            const radius = CANOPY.bottomRadius - height * (CANOPY.bottomRadius - CANOPY.topRadius)
                + random.range(0, CANOPY.radiusJitter);
            const angle = random.range(0, Math.PI * 2);
            const spread = (1 - height) * CANOPY.bottomSpread;
            placement.scale.setScalar(radius);
            placement.position.set(
                x + Math.cos(angle) * spread,
                CANOPY.bottomHeight + height * CANOPY.rise,
                z + Math.sin(angle) * spread,
            );
            placement.updateMatrix();
            const index = tree * CANOPY.puffs + puff;
            canopies.setMatrixAt(index, placement.matrix);
            const shade = Math.floor((1 - height) * darkestShade * CANOPY.lightestShare + random.range(0, CANOPY.shadeJitter));
            canopies.setColorAt(index, new THREE.Color(LEAF_COLOURS[Math.min(shade, darkestShade)]));
        }
    });

    scene.add(trunks, canopies);
    addOutline(scene, trunks, TRUNK.outlineGrow);
    addOutline(scene, canopies, CANOPY.outlineGrow);
}

// The street plan shared by every part of the scene.
//
// Plan coordinates follow the original illustration (1 unit = 1 CSS pixel of it):
//   planX runs across the main street,
//   planY runs along it, growing towards the camera.
// World coordinates are three.js units, with the origin at the junction centre:
//   worldX = planX - MAIN_STREET_CENTRE_X, worldZ = planY - JUNCTION_Y (the camera sits at +z).

export const STREET_LENGTH = 6000;
export const JUNCTION_Y = 5000;
export const MAIN_STREET_CENTRE_X = 1000;

// Both streets have a four-lane road with a sidewalk on each side.
export const LANE_WIDTH = 50;
export const LANES_PER_ROAD = 4;
export const ROAD_HALF_WIDTH = LANE_WIDTH * LANES_PER_ROAD / 2;
export const SIDEWALK_WIDTH = 70;

export const MAIN_ROAD = [
    MAIN_STREET_CENTRE_X - ROAD_HALF_WIDTH,
    MAIN_STREET_CENTRE_X + ROAD_HALF_WIDTH,
];
export const MAIN_SIDEWALKS = [
    [MAIN_ROAD[0] - SIDEWALK_WIDTH, MAIN_ROAD[0]],
    [MAIN_ROAD[1], MAIN_ROAD[1] + SIDEWALK_WIDTH],
];

/** planX of the middle of each lane of the main road, from left to right. */
export const MAIN_LANE_CENTRES = Array.from(
    { length: LANES_PER_ROAD },
    (_, lane) => MAIN_ROAD[0] + LANE_WIDTH * (lane + 0.5),
);

/** planX of the dashed lines between same-direction lanes (the centre line is separate). */
export const MAIN_LANE_DIVIDERS = [
    MAIN_ROAD[0] + LANE_WIDTH,
    MAIN_ROAD[1] - LANE_WIDTH,
];

/** From the junction centre to the far edge of the zebra crossings around it. */
export const CROSSING_OUTER_EDGE = ROAD_HALF_WIDTH + SIDEWALK_WIDTH;
/** From the junction centre to the middle of the zebra crossings around it. */
export const CROSSING_MIDDLE = ROAD_HALF_WIDTH + SIDEWALK_WIDTH / 2;
/** Cars stop this far before the crossings. */
const STOP_LINE_GAP = 10;
/** From the junction centre to the stop lines. */
export const STOP_LINE_DISTANCE = CROSSING_OUTER_EDGE + STOP_LINE_GAP;

export const worldX = planX => planX - MAIN_STREET_CENTRE_X;
export const worldZ = planY => planY - JUNCTION_Y;

/** Is this point along the main street within `distance` of the junction centre? */
export const isNearJunction = (planY, distance) => Math.abs(planY - JUNCTION_Y) < distance;

// Colours, from the illustrations on the site.
export const COLOURS = {
    sky: 0x192840,
    ink: 0x0b1c26,
    ground: "#29201B",
    sidewalk: "#635E5E",
    road: "#2D2D2D",
    zebra: "#D9D9D9",
    laneLine: "#D9D9D9",
    centreLine: "#BBBD41",
    windowLight: "#F6BF78",
};

/** The ink colour as a CSS string, for drawing on a canvas. */
export const INK_CSS = `#${COLOURS.ink.toString(16).padStart(6, "0")}`;

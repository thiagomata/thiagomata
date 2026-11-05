// The crowd. Pure simulation: where each person is and which way they face; the sprites are
// drawn by js/ideia/crowd-view.js.
//
// Two kinds of people:
//   - strollers walk up and down one block of the main street's sidewalk; at the junction they
//     stop for a while before turning back, so they never step onto a road;
//   - crossers wait at a corner of the junction and cross to another corner (straight over or
//     diagonally) when people get the green, always on the zebra crossings.
import {
    CROSSING_MIDDLE, JUNCTION_Y, MAIN_SIDEWALKS, ROAD_HALF_WIDTH, SIDEWALK_WIDTH,
    STOP_LINE_DISTANCE, STREET_LENGTH, worldX, worldZ,
} from "./plan.js";
import { WALK, cycleAt, secondsIntoWalk } from "./signals.js";

export const CROWD_SIZE = { strollers: 1300, crossers: 420 };

/** Narrow screens (phones) get a smaller crowd: the people are tiny there anyway. */
const NARROW_SCREEN_WIDTH = 700;
const NARROW_SCREEN_CROWD = 0.5;
export const crowdSizeFor = width => (width < NARROW_SCREEN_WIDTH ? NARROW_SCREEN_CROWD : 1);

export const STROLLING = {
    speed: [14, 28],                // units per second
    pauseAtJunction: [2, 9],        // seconds
    nearBlockShare: 0.3,            // the block between the junction and the camera is shorter
    turnBeforeStreetEnd: 20,
    waitingDepth: 50,               // they stop up to this much further back, as a group
    sidewalkMargin: 6,              // keep this far from the sidewalk's edges
};

export const CROSSING = {
    startDelay: [0, 2],             // seconds after people get the green
    speed: [22, 36],
    arriveBeforeEnd: 1,             // seconds to spare before the green ends
    spread: 20,                     // how far from the crossing's middle line people walk
    kerbStep: 10,                   // routes start this far from the kerb
    diagonalCornerInset: 5,
    diagonalSpreadShare: 0.25,      // diagonals are narrower, so people spread less
};

const WAITING = {
    onMainStreetShare: 0.5,         // the others wait along the cross street
    queueDepth: 150,                // along the main street's sidewalk
    crossStreetReach: 200,          // along the cross street's sidewalk
    edgeMargin: 6,
};

/** Which side of a sprite shows: towards the camera (+z), away from it, or in profile. */
export const FACING = { front: "front", back: "back", side: "side" };

// --- Where people walk ----------------------------------------------------------------------

// Corners of the junction: 0 far left, 1 far right, 2 near left, 3 near right.
export const CORNERS = 4;
export const cornerSide = corner => ({ east: corner % 2 === 1 ? 1 : -1, near: corner >= 2 ? 1 : -1 });
const isNearCorner = corner => cornerSide(corner).near > 0;

/** A spot to wait at near a corner: along the main street's sidewalk or the cross street's. */
export function waitingSpot(corner, random) {
    const { east, near } = cornerSide(corner);
    const awayFromRoad = depth => worldZ(JUNCTION_Y + near * (ROAD_HALF_WIDTH + depth));
    if (random.chance(WAITING.onMainStreetShare)) {
        const [inner, outer] = MAIN_SIDEWALKS[east > 0 ? 1 : 0];
        const planX = random.range(inner + WAITING.edgeMargin, outer - WAITING.edgeMargin);
        return [worldX(planX), awayFromRoad(random.range(WAITING.edgeMargin, WAITING.edgeMargin + WAITING.queueDepth))];
    }
    const kerb = east > 0 ? MAIN_SIDEWALKS[1][0] : MAIN_SIDEWALKS[0][1];
    const planX = kerb + east * random.range(0, WAITING.crossStreetReach);
    return [worldX(planX), awayFromRoad(random.range(WAITING.edgeMargin, SIDEWALK_WIDTH - WAITING.edgeMargin))];
}

/** Kerb-to-kerb route over the zebra crossing from one corner to another (world x, z). */
export function zebraRoute(fromCorner, toCorner, random) {
    const from = cornerSide(fromCorner), to = cornerSide(toCorner);
    const offset = random.range(-CROSSING.spread, CROSSING.spread);
    const kerb = ROAD_HALF_WIDTH + CROSSING.kerbStep;
    if (from.near === to.near) {                    // over the main street
        const crossingZ = from.near * (CROSSING_MIDDLE + offset);
        return [[from.east * kerb, crossingZ], [to.east * kerb, crossingZ]];
    }
    if (from.east === to.east) {                    // over the cross street
        const crossingX = from.east * (CROSSING_MIDDLE + offset);
        return [[crossingX, from.near * kerb], [crossingX, to.near * kerb]];
    }
    // Diagonally, through the middle of the junction.
    const corner = ROAD_HALF_WIDTH + CROSSING.diagonalCornerInset;
    const shift = offset * CROSSING.diagonalSpreadShare;
    return [
        [from.east * (corner + shift), from.near * (corner - shift)],
        [to.east * (corner + shift), to.near * (corner - shift)],
    ];
}

/** Where along a route a walker is, and which way they are heading. */
export function pointAlong(route, legLengths, distance) {
    let leg = 0;
    while (leg < legLengths.length - 1 && distance > legLengths[leg]) distance -= legLengths[leg++];
    const [fromX, fromZ] = route[leg], [toX, toZ] = route[leg + 1];
    const share = Math.min(distance / (legLengths[leg] || 1), 1);
    return {
        x: fromX + (toX - fromX) * share,
        z: fromZ + (toZ - fromZ) * share,
        heading: [toX - fromX, toZ - fromZ],
    };
}

/** Front and back views win unless someone walks clearly sideways. */
const SIDE_VIEW_BIAS = 0.8;

/** How someone walking in this direction is seen (the camera is at +z). */
export function facingFor([headingX, headingZ]) {
    if (Math.abs(headingZ) > Math.abs(headingX) * SIDE_VIEW_BIAS) {
        return { facing: headingZ > 0 ? FACING.front : FACING.back, mirror: 1 };
    }
    return { facing: FACING.side, mirror: headingX > 0 ? 1 : -1 };
}

// --- The crowd ------------------------------------------------------------------------------

export class Crowd {
    /**
     * `layoutRandom` places people; `behaviourRandom` makes their choices while the scene runs,
     * so behaviour never changes the layout.
     */
    constructor({ layoutRandom, behaviourRandom, size = 1 }) {
        this.behaviourRandom = behaviourRandom;
        this.people = [
            ...Array.from({ length: Math.round(CROWD_SIZE.strollers * size) }, (_, index) => newStroller(index, layoutRandom)),
            ...Array.from({ length: Math.round(CROWD_SIZE.crossers * size) }, (_, index) => newCrosser(index, layoutRandom)),
        ];
    }

    /**
     * Where `person` is at simulation time `seconds`: { x, z, facing, mirror, walking }.
     * Call it for every person in order at each time, as crossers plan a crossing per cycle.
     */
    pose(person, seconds) {
        const position = person.kind === "stroller" ? stroll(person, seconds) : this.cross(person, seconds);
        if (!position.heading) return { ...position, mirror: 1, walking: false };
        return { x: position.x, z: position.z, ...facingFor(position.heading), walking: true };
    }

    /** Wait at a corner, then cross on the zebras to another corner when people get the green. */
    cross(person, seconds) {
        const cycle = cycleAt(seconds).number;
        if (person.cycle !== cycle) this.planCrossing(person, cycle);
        const walked = Math.min(
            Math.max((secondsIntoWalk(seconds) - person.delay) * person.speed, 0),
            person.routeLength,
        );
        if (walked === 0 || walked === person.routeLength) {
            // Waiting (or arrived): face the junction, so the near corners show their backs.
            const waiting = walked === 0;
            const [spotX, spotZ] = waiting ? person.route[0] : person.route[person.route.length - 1];
            const corner = waiting ? person.corner : person.target;
            return { x: spotX, z: spotZ, facing: isNearCorner(corner) ? FACING.back : FACING.front };
        }
        return pointAlong(person.route, person.legLengths, walked);
    }

    /** A new cycle: start from where the last crossing ended and pick another corner. */
    planCrossing(person, cycle) {
        const random = this.behaviourRandom;
        if (person.cycle !== null) {
            person.corner = person.target;
            person.spot = person.route[person.route.length - 1];
        }
        person.cycle = cycle;
        person.target = (person.corner + random.integer(1, CORNERS - 1)) % CORNERS;
        person.route = [
            person.spot,
            ...zebraRoute(person.corner, person.target, random),
            waitingSpot(person.target, random),
        ];
        person.legLengths = person.route.slice(1).map(([legEndX, legEndZ], leg) =>
            Math.hypot(legEndX - person.route[leg][0], legEndZ - person.route[leg][1]));
        person.routeLength = person.legLengths.reduce((total, length) => total + length, 0) || 1;
        // Start a little after the green, and walk fast enough to arrive before it ends.
        person.delay = random.range(...CROSSING.startDelay);
        const timeToWalk = WALK - person.delay - CROSSING.arriveBeforeEnd;
        person.speed = Math.max(random.range(...CROSSING.speed), person.routeLength / timeToWalk);
    }
}

/**
 * Round trip along the block: walk to the junction, wait there, walk back to the far end and
 * turn straight round.
 */
export function stroll(person, seconds) {
    const walkTime = person.blockLength / person.speed;
    const time = (person.startTime + seconds) % person.roundTrip;
    let fromJunction, direction;                // distance from the junction end; +1 walking away
    if (time < walkTime) {
        fromJunction = person.blockLength - time * person.speed;
        direction = -1;
    } else if (time < walkTime + person.pause) {
        fromJunction = 0;
        direction = 0;
    } else {
        fromJunction = (time - walkTime - person.pause) * person.speed;
        direction = 1;
    }
    const planY = person.junctionY + person.awayFromJunction * fromJunction;
    const position = { x: person.x, z: worldZ(planY) };
    if (direction === 0) {
        // Waiting at the junction, facing it: the near block's people show their backs.
        return { ...position, facing: person.awayFromJunction > 0 ? FACING.back : FACING.front };
    }
    return { ...position, heading: [0, direction * person.awayFromJunction] };
}

export function newStroller(index, random) {
    const [inner, outer] = MAIN_SIDEWALKS[index % MAIN_SIDEWALKS.length];
    const nearBlock = random.chance(STROLLING.nearBlockShare);
    // Where they stop near the junction varies a little, so they wait as a group, not a line.
    const stopsAt = STOP_LINE_DISTANCE + random.range(0, STROLLING.waitingDepth);
    const junctionY = nearBlock ? JUNCTION_Y + stopsAt : JUNCTION_Y - stopsAt;
    const farEndY = nearBlock ? STREET_LENGTH - STROLLING.turnBeforeStreetEnd : STROLLING.turnBeforeStreetEnd;
    const blockLength = Math.abs(farEndY - junctionY);
    const speed = random.range(...STROLLING.speed);
    const pause = random.range(...STROLLING.pauseAtJunction);
    const roundTrip = 2 * blockLength / speed + pause;
    return {
        kind: "stroller",
        x: worldX(random.range(inner + STROLLING.sidewalkMargin, outer - STROLLING.sidewalkMargin)),
        junctionY,
        awayFromJunction: nearBlock ? 1 : -1,       // which way (in plan y) the block runs
        blockLength,
        speed,
        pause,
        roundTrip,
        startTime: random.range(0, roundTrip),       // where in the round trip they start
    };
}

export function newCrosser(index, random) {
    const corner = index % CORNERS;
    return { kind: "crosser", corner, spot: waitingSpot(corner, random), cycle: null };
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    CORNERS, CROSSING, Crowd, FACING, STROLLING, cornerSide, facingFor, newStroller, pointAlong, stroll,
    waitingSpot, zebraRoute,
} from "../js/ideia/crowd.js";
import { CROSSING_OUTER_EDGE, ROAD_HALF_WIDTH } from "../js/ideia/plan.js";
import { seededRandom } from "../js/shared/random.js";
import { CYCLE, WALK, secondsIntoWalk } from "../js/ideia/signals.js";

/** Is this world point on a road (either street), rather than on a sidewalk? */
const onRoad = ([x, z]) => Math.abs(x) < ROAD_HALF_WIDTH || Math.abs(z) < ROAD_HALF_WIDTH;
/** Is it on the zebra crossings, or the junction inside them (where the diagonals run)? */
const onCrossings = ([x, z]) => Math.abs(x) <= CROSSING_OUTER_EDGE && Math.abs(z) <= CROSSING_OUTER_EDGE;

const cornerPairs = Array.from({ length: CORNERS }, (_, from) =>
    Array.from({ length: CORNERS }, (_, to) => [from, to])).flat().filter(([from, to]) => from !== to);

describe("crowd: where people wait and walk", () => {
    it("names the four corners: far/near and left/right", () => {
        assert.deepEqual(cornerSide(0), { east: -1, near: -1 });
        assert.deepEqual(cornerSide(3), { east: 1, near: 1 });
    });

    it("only waits on sidewalks, on the right corner's side", () => {
        const random = seededRandom(1);
        for (let corner = 0; corner < CORNERS; corner++) {
            const { east, near } = cornerSide(corner);
            for (let attempt = 0; attempt < 200; attempt++) {
                const spot = waitingSpot(corner, random);
                assert.ok(!onRoad(spot), `corner ${corner} waits on the road at ${spot}`);
                assert.equal(Math.sign(spot[0]), east);
                assert.equal(Math.sign(spot[1]), near);
            }
        }
    });

    it("crosses between any two corners on the zebras only", () => {
        const random = seededRandom(2);
        for (const [from, to] of cornerPairs) {
            const [start, end] = zebraRoute(from, to, random);
            for (let share = 0; share <= 1; share += 0.05) {
                const point = [start[0] + (end[0] - start[0]) * share, start[1] + (end[1] - start[1]) * share];
                assert.ok(!onRoad(point) || onCrossings(point), `${from}->${to} leaves the crossings at ${point}`);
            }
        }
    });

    it("starts and ends every crossing at the kerb of the right corners", () => {
        const random = seededRandom(3);
        for (const [from, to] of cornerPairs) {
            const [start, end] = zebraRoute(from, to, random);
            assert.ok(!onRoad(start) && !onRoad(end), `${from}->${to} starts or ends on the road`);
            assert.equal(Math.sign(start[0]), cornerSide(from).east);
            assert.equal(Math.sign(end[1]), cornerSide(to).near);
        }
    });

    it("finds a point along a route with several legs", () => {
        const route = [[0, 0], [10, 0], [10, 10]];
        const legs = [10, 10];
        assert.deepEqual(pointAlong(route, legs, 5), { x: 5, z: 0, heading: [10, 0] });
        assert.deepEqual(pointAlong(route, legs, 15), { x: 10, z: 5, heading: [0, 10] });
        assert.deepEqual(pointAlong(route, legs, 99), { x: 10, z: 10, heading: [0, 10] });
    });

    it("shows the front towards the camera, the back away from it and a profile sideways", () => {
        assert.deepEqual(facingFor([0, 1]), { facing: FACING.front, mirror: 1 });
        assert.deepEqual(facingFor([0, -1]), { facing: FACING.back, mirror: 1 });
        assert.deepEqual(facingFor([1, 0]), { facing: FACING.side, mirror: 1 });
        assert.deepEqual(facingFor([-1, 0]), { facing: FACING.side, mirror: -1 });
    });
});

describe("crowd: strollers", () => {
    const strollers = Array.from({ length: 200 }, (_, index) => newStroller(index, seededRandom(index + 1)));

    it("never step onto a road", () => {
        for (const person of strollers) {
            for (let seconds = 0; seconds < person.roundTrip; seconds += person.roundTrip / 50) {
                const { x, z } = stroll(person, seconds);
                assert.ok(!onRoad([x, z]), `stroller on the road at ${x}, ${z}`);
            }
        }
    });

    it("wait at the junction for their pause, standing still", () => {
        const person = strollers[0];
        const reachesJunction = person.blockLength / person.speed;
        const waiting = [0.01, 0.5, 0.99].map(share => stroll(person, (reachesJunction + share * person.pause - person.startTime + person.roundTrip) % person.roundTrip));
        assert.ok(waiting.every(pose => pose.heading === undefined), "moving while waiting");
        assert.ok(waiting.every(pose => pose.z === waiting[0].z), "drifting while waiting");
    });

    it("pause for a time within the configured range", () => {
        for (const person of strollers) {
            assert.ok(person.pause >= STROLLING.pauseAtJunction[0] && person.pause <= STROLLING.pauseAtJunction[1]);
        }
    });
});

describe("crowd: crossers", () => {
    const crowd = new Crowd({ layoutRandom: seededRandom(4), behaviourRandom: seededRandom(5), size: 0.2 });
    const crossers = crowd.people.filter(person => person.kind === "crosser");

    it("wait while the cars have the green", () => {
        for (let seconds = 0; seconds < CYCLE - WALK; seconds += 0.5) {
            for (const person of crossers) assert.equal(crowd.pose(person, seconds).walking, false);
        }
    });

    it("arrive at their new corner before the walk ends", () => {
        const lastMoment = CYCLE - CROSSING.arriveBeforeEnd + 0.01;
        for (const person of crossers) {
            crowd.pose(person, 0);                              // plans this cycle's crossing
            assert.equal(crowd.pose(person, lastMoment).walking, false, "still walking");
            assert.ok(secondsIntoWalk(lastMoment) > 0);
        }
    });

    it("move to a different corner every cycle", () => {
        for (const person of crossers) {
            crowd.pose(person, 0);
            assert.notEqual(person.target, person.corner);
        }
    });
});

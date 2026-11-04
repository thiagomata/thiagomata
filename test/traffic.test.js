import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { seededRandom } from "../js/ideia/random.js";
import { CLEARANCE, CROSS_GREEN, MAIN_GREEN } from "../js/ideia/signals.js";
import { TICKS_PER_SECOND, TICK_SECONDS } from "../js/ideia/simulation.js";
import { CAR_LENGTH, DRIVING, Traffic, brakingDistance, crossLane, mainLane } from "../js/ideia/traffic.js";

/** Runs the traffic tick by tick from one simulation time to another. */
function run(traffic, fromSeconds, toSeconds) {
    for (let tick = Math.round(fromSeconds * TICKS_PER_SECOND); tick < Math.round(toSeconds * TICKS_PER_SECOND); tick++) {
        traffic.step(tick * TICK_SECONDS, TICK_SECONDS);
    }
}

/** A cross street lane with the given cars, placed relative to its stop line. */
function crossStreet(...cars) {
    const traffic = new Traffic(seededRandom(1), [crossLane(true, cars.length)]);
    const lane = traffic.lanes[0];
    cars.forEach(({ beforeStopLine, speed = 0 }, index) => {
        Object.assign(lane.vehicles[index], { position: lane.stopPosition - beforeStopLine, speed });
    });
    return { traffic, lane, vehicles: lane.vehicles };
}

// The cross street's cars may enter from MAIN_GREEN until CROSS_GREEN - CLEARANCE later.
const CROSS_ENTRY_ENDS = MAIN_GREEN + CROSS_GREEN - CLEARANCE;

describe("traffic", () => {
    it("brakes over the distance physics says", () => {
        assert.equal(brakingDistance(0), 0);
        assert.equal(brakingDistance(DRIVING.cruiseSpeed), DRIVING.cruiseSpeed ** 2 / (2 * DRIVING.braking));
    });

    it("stops a car at the stop line while its light is red", () => {
        const { traffic, lane, vehicles: [car] } = crossStreet({ beforeStopLine: 600 });
        run(traffic, 0, MAIN_GREEN - TICK_SECONDS);           // the main street's green
        assert.ok(car.position <= lane.stopPosition, "crossed the stop line");
        assert.ok(lane.stopPosition - car.position < 1, "stopped short of the line");
        assert.ok(car.speed < 1, "still moving");
    });

    it("lets it go when its light turns green", () => {
        const { traffic, lane, vehicles: [car] } = crossStreet({ beforeStopLine: 0 });
        run(traffic, MAIN_GREEN, MAIN_GREEN + 3);
        assert.ok(car.position > lane.stopPosition);
    });

    it("lets a car too close to stop drive through when the light changes", () => {
        const { traffic, lane, vehicles: [car] } = crossStreet({
            beforeStopLine: brakingDistance(DRIVING.cruiseSpeed) / 2, speed: DRIVING.cruiseSpeed,
        });
        run(traffic, CROSS_ENTRY_ENDS - TICK_SECONDS, CROSS_ENTRY_ENDS + 1);
        assert.ok(car.position > lane.stopPosition);
    });

    it("stops a car that can still brake in time when the light changes", () => {
        const { traffic, lane, vehicles: [car] } = crossStreet({
            beforeStopLine: 3 * brakingDistance(DRIVING.cruiseSpeed), speed: DRIVING.cruiseSpeed,
        });
        run(traffic, CROSS_ENTRY_ENDS - TICK_SECONDS, CROSS_ENTRY_ENDS + 3);
        assert.ok(car.position <= lane.stopPosition);
        assert.ok(car.speed < 1);
    });

    it("keeps a queue of cars apart while they wait", () => {
        const { traffic, vehicles } = crossStreet(
            { beforeStopLine: 500 },
            { beforeStopLine: 0 },
        );
        run(traffic, 0, MAIN_GREEN - TICK_SECONDS);
        const [back, front] = vehicles;
        assert.ok(front.position - back.position >= CAR_LENGTH + DRIVING.gapBetweenCars - 1e-6);
    });

    it("loops a car back to the start of its lane", () => {
        const { traffic, lane, vehicles: [car] } = crossStreet({ beforeStopLine: 0 });
        car.position = lane.length - 1;
        car.speed = DRIVING.cruiseSpeed;
        run(traffic, MAIN_GREEN, MAIN_GREEN + 0.5);
        assert.ok(car.position < lane.stopPosition);
    });

    it("drives the main street in both directions", () => {
        assert.deepEqual(mainLane(0, 1).direction, [0, -1]);
        assert.deepEqual(mainLane(3, 1).direction, [0, 1]);
    });

    it("ends in the same state from the same seed and ticks", () => {
        const first = new Traffic(seededRandom(9)), second = new Traffic(seededRandom(9));
        run(first, 0, 60);
        run(second, 0, 60);
        const positions = traffic => [...traffic.cars()].map(({ x, z }) => [x, z]);
        assert.deepEqual(positions(first), positions(second));
    });
});

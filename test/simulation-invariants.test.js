// Runs the whole scene's simulation (all cars, the full crowd) for many light cycles and checks
// the rules that must hold at every moment.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CROSSING_OUTER_EDGE, ROAD_HALF_WIDTH } from "../js/ideia/plan.js";
import { CYCLE, secondsIntoWalk } from "../js/ideia/signals.js";
import { Simulation, TICKS_PER_SECOND } from "../js/ideia/simulation.js";
import { CAR_LENGTH, CAR_WIDTH } from "../js/ideia/traffic.js";

const CYCLES = 5;
const CHECKS_PER_SECOND = 20;
const PERSON_RADIUS = 4;
const MAX_REPORTED = 10;

/** A car's footprint: long along its street. */
function footprint({ x, z, lane }) {
    const alongZ = lane.street === "main";
    return {
        x, z,
        halfX: (alongZ ? CAR_WIDTH : CAR_LENGTH) / 2,
        halfZ: (alongZ ? CAR_LENGTH : CAR_WIDTH) / 2,
    };
}

const overlap = (a, b) => Math.abs(a.x - b.x) < a.halfX + b.halfX && Math.abs(a.z - b.z) < a.halfZ + b.halfZ;
const onRoad = ({ x, z }) => Math.abs(x) < ROAD_HALF_WIDTH || Math.abs(z) < ROAD_HALF_WIDTH;
const inJunctionArea = ({ x, z }) => Math.abs(x) <= CROSSING_OUTER_EDGE && Math.abs(z) <= CROSSING_OUTER_EDGE;

describe("the whole scene", () => {
    it(`keeps everyone safe for ${CYCLES} light cycles`, () => {
        const simulation = new Simulation();
        const problems = [];
        const report = message => { if (problems.length < MAX_REPORTED) problems.push(message); };
        let samples = 0, mostPeopleOnRoad = 0;

        const ticks = CYCLES * CYCLE * TICKS_PER_SECOND;
        const checkEvery = TICKS_PER_SECOND / CHECKS_PER_SECOND;
        for (let tick = 0; tick < ticks; tick++) {
            simulation.step();
            if (tick % checkEvery) continue;
            samples++;
            const seconds = simulation.seconds, at = `at ${seconds.toFixed(2)}s`;
            const peopleWalk = secondsIntoWalk(seconds) >= 0;

            const cars = [...simulation.traffic.cars()].map(footprint);
            cars.forEach((car, index) => {
                for (const other of cars.slice(index + 1)) {
                    if (overlap(car, other)) report(`cars collide ${at} near ${car.x.toFixed(0)}, ${car.z.toFixed(0)}`);
                }
                if (peopleWalk && inJunctionArea(car)) report(`car in the junction while people walk ${at}`);
            });

            let peopleOnRoad = 0;
            for (const person of simulation.crowd.people) {
                const { x, z } = simulation.crowd.pose(person, seconds);
                const body = { x, z, halfX: PERSON_RADIUS, halfZ: PERSON_RADIUS };
                if (onRoad(body)) {
                    peopleOnRoad++;
                    if (!peopleWalk) report(`${person.kind} on the road while cars go ${at}`);
                    if (!inJunctionArea(body)) report(`${person.kind} on the road off the crossings ${at}`);
                }
                for (const car of cars) {
                    if (overlap(body, car)) report(`${person.kind} hit by a car ${at} near ${x.toFixed(0)}, ${z.toFixed(0)}`);
                }
            }
            mostPeopleOnRoad = Math.max(mostPeopleOnRoad, peopleOnRoad);
        }

        assert.deepEqual(problems, []);
        // Guard against a test that passes because nothing happens.
        assert.ok(samples > CYCLES * CYCLE * CHECKS_PER_SECOND * 0.9);
        assert.ok(mostPeopleOnRoad > 50, `only ${mostPeopleOnRoad} people ever crossed`);
    });

    it("keeps traffic moving: every car passes the junction", () => {
        const simulation = new Simulation({ crowdSize: 0 });
        const crossed = new Set();
        for (let tick = 0; tick < 3 * CYCLE * TICKS_PER_SECOND; tick++) {
            simulation.step();
            for (const { vehicle, lane } of simulation.traffic.cars()) {
                if (vehicle.position > lane.stopPosition + CAR_LENGTH) crossed.add(vehicle);
            }
        }
        const total = [...simulation.traffic.cars()].length;
        assert.equal(crossed.size, total, `${total - crossed.size} cars never got through`);
    });
});

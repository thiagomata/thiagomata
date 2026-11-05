// Cars on both streets, driving on the traffic lights. Pure simulation: positions and speeds
// only; js/ideia/cars-view.js draws them.
//
// Each lane is a loop: cars drive along it and come back to its start out of sight (behind
// the camera, in the fog, or past the side of the view). Cars never overtake, so the car in
// front of each one is always the next one in its lane's list.
import { LANE_WIDTH, MAIN_LANE_CENTRES, STOP_LINE_DISTANCE, worldX } from "./plan.js";
import { carsMayEnter } from "./signals.js";

export const CAR_LENGTH = 56;
export const CAR_WIDTH = 30;

export const DRIVING = {
    cruiseSpeed: 80,        // units per second
    acceleration: 160,      // units per second squared
    braking: 160,
    gapBetweenCars: 14,
};

const CAR_COLOURS = ["#c4483e", "#d9b44a", "#4f8fc4", "#D9D9D9", "#43474E", "#97AD53", "#B07461"];

// Where lanes begin, out of sight: behind the camera, far down the street in the fog, or past
// the sides of the view along the cross street.
const BEHIND_CAMERA_Z = 1200;
const FAR_AWAY_Z = -5000;
const BEYOND_VIEW_X = 2000;

/** Angle that turns a car (built facing -z) to face each direction of travel. */
export const HEADING = { awayFromCamera: 0, towardsCamera: Math.PI, right: -Math.PI / 2, left: Math.PI / 2 };

/** A main street lane by index, left to right: the left half drives away from the camera. */
export function mainLane(lane, cars) {
    const away = lane < MAIN_LANE_CENTRES.length / 2;
    return {
        street: "main",
        start: [worldX(MAIN_LANE_CENTRES[lane]), away ? BEHIND_CAMERA_Z : FAR_AWAY_Z],
        direction: [0, away ? -1 : 1],
        length: BEHIND_CAMERA_Z - FAR_AWAY_Z,
        cars,
        heading: away ? HEADING.awayFromCamera : HEADING.towardsCamera,
    };
}

/** A cross street lane: the near one drives to the right, the far one to the left. */
export function crossLane(towardsRight, cars) {
    return {
        street: "cross",
        start: [towardsRight ? -BEYOND_VIEW_X : BEYOND_VIEW_X, towardsRight ? LANE_WIDTH : -LANE_WIDTH],
        direction: [towardsRight ? 1 : -1, 0],
        length: 2 * BEYOND_VIEW_X,
        cars,
        heading: towardsRight ? HEADING.right : HEADING.left,
    };
}

export const DEFAULT_LANES = [
    mainLane(0, 10),
    mainLane(1, 8),
    mainLane(2, 10),
    mainLane(3, 7),
    crossLane(true, 7),
    crossLane(false, 6),
];

export const brakingDistance = speed => speed * speed / (2 * DRIVING.braking);

export class Traffic {
    /** `random` picks the car colours; `lanes` defaults to the full junction. */
    constructor(random, lanes = DEFAULT_LANES) {
        this.lanes = lanes.map(settings => createLane(random, settings));
    }

    /** Every car, with where it is in the world and which way it faces. */
    *cars() {
        for (const lane of this.lanes) {
            for (const vehicle of lane.vehicles) {
                yield {
                    vehicle,
                    lane,
                    x: lane.start[0] + lane.direction[0] * vehicle.position,
                    z: lane.start[1] + lane.direction[1] * vehicle.position,
                };
            }
        }
    }

    /** Moves every car by one fixed step of `stepSeconds`, at simulation time `seconds`. */
    step(seconds, stepSeconds) {
        for (const lane of this.lanes) stepLane(lane, seconds, stepSeconds);
    }
}

function createLane(random, settings) {
    const { start, direction, length, cars } = settings;
    // How far along the lane the junction centre is, and where a car's centre stops.
    const junctionPosition = -(start[0] * direction[0] + start[1] * direction[1]);
    const stopPosition = junctionPosition - STOP_LINE_DISTANCE - CAR_LENGTH / 2;
    const junctionSpan = 2 * (STOP_LINE_DISTANCE + CAR_LENGTH / 2);

    // Spread the cars evenly along the lane, none of them inside the junction.
    const vehicles = Array.from({ length: cars }, (_, index) => {
        let position = index * (length - junctionSpan) / cars;
        if (position >= stopPosition) position += junctionSpan;
        return { position, speed: 0, mayRunLight: false, colour: random.pick(CAR_COLOURS) };
    });
    return { ...settings, stopPosition, vehicles, lightWasGreen: true };
}

function stepLane(lane, seconds, stepSeconds) {
    const green = carsMayEnter(lane.street, seconds);
    if (lane.lightWasGreen && !green) {
        // The light just changed: only cars too close to stop smoothly go through.
        for (const vehicle of lane.vehicles) {
            const toStopLine = lane.stopPosition - vehicle.position;
            vehicle.mayRunLight = toStopLine >= 0 && toStopLine < brakingDistance(vehicle.speed);
        }
    }
    lane.lightWasGreen = green;

    const count = lane.vehicles.length;
    lane.vehicles.forEach((vehicle, index) => {
        const inFront = lane.vehicles[(index + 1) % count];
        const gap = (inFront.position - vehicle.position + lane.length) % lane.length;
        // With a single car in the lane, the car "in front" is itself: the whole loop is free.
        let room = count === 1 ? Infinity : gap - CAR_LENGTH - DRIVING.gapBetweenCars;

        const toStopLine = lane.stopPosition - vehicle.position;
        if (toStopLine < 0) vehicle.mayRunLight = false;        // past the line: nothing to decide
        const mustStop = !green && toStopLine >= 0 && !vehicle.mayRunLight;
        if (mustStop) room = Math.min(room, toStopLine);
        room = Math.max(room, 0);

        // Speed up to cruising speed, but never faster than the car can still stop in `room`.
        vehicle.speed = Math.min(
            vehicle.speed + DRIVING.acceleration * stepSeconds,
            DRIVING.cruiseSpeed,
            Math.sqrt(2 * DRIVING.braking * room),
        );
        vehicle.position += Math.min(vehicle.speed * stepSeconds, room);
        if (vehicle.position >= lane.length) vehicle.position -= lane.length;
    });
}

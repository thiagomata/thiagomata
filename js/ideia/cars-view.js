// Draws the cars of a Traffic simulation (js/ideia/traffic.js).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CAR_LENGTH, CAR_WIDTH } from "./traffic.js";
import { inkEdges, paintGeometry, toonMaterial } from "./style.js";

/** The car model, built facing -z with its wheels on the ground. */
const CAR = {
    body: { height: 9, lift: 3.5 },
    cabin: { width: 26, height: 8, length: 28, setBack: 4 },
    roof: { width: 27, thickness: 1.6, length: 26 },
    wheel: { radius: 4.5, thickness: 3, segments: 14, inset: 0.5, axleFromCentre: 17.5 },
    lamp: { width: 6, height: 3, depth: 1, fromCentre: 9, lift: 9, standsOut: 0.2 },
};
const GLASS_COLOUR = "#2a3550";
const TYRE_COLOUR = "#15161a";
const HEADLIGHT_COLOUR = "#fff3c4";
const TAIL_LIGHT_COLOUR = "#ff2e2e";

function carModel(colour) {
    const block = (width, height, depth, paint, centreY, centreZ = 0) =>
        paintGeometry(new THREE.BoxGeometry(width, height, depth), paint).translate(0, centreY, centreZ);
    const wheel = (side, end) => {
        const { radius, thickness, segments, inset, axleFromCentre } = CAR.wheel;
        const tyre = new THREE.CylinderGeometry(radius, radius, thickness, segments).rotateZ(Math.PI / 2);
        return paintGeometry(tyre, TYRE_COLOUR).translate(side * (CAR_WIDTH / 2 - inset), radius, end * axleFromCentre);
    };
    const lamp = (side, end, colour) => {
        const { width, height, depth, fromCentre, lift, standsOut } = CAR.lamp;
        return block(width, height, depth, colour, lift, end * (CAR_LENGTH / 2 + standsOut))
            .translate(side * fromCentre, 0, 0);
    };
    const withoutUv = geometry => {
        geometry.deleteAttribute("uv");
        return geometry;
    };

    const bodyTop = CAR.body.lift + CAR.body.height;
    const body = mergeGeometries([
        block(CAR_WIDTH, CAR.body.height, CAR_LENGTH, colour, CAR.body.lift + CAR.body.height / 2),
        block(CAR.cabin.width, CAR.cabin.height, CAR.cabin.length, GLASS_COLOUR, bodyTop + CAR.cabin.height / 2, CAR.cabin.setBack),
        block(CAR.roof.width, CAR.roof.thickness, CAR.roof.length, colour,
            bodyTop + CAR.cabin.height + CAR.roof.thickness / 2, CAR.cabin.setBack),
        wheel(-1, -1),
        wheel(1, -1),
        wheel(-1, 1),
        wheel(1, 1),
    ].map(withoutUv));
    const lights = mergeGeometries([
        lamp(-1, -1, HEADLIGHT_COLOUR),
        lamp(1, -1, HEADLIGHT_COLOUR),
        lamp(-1, 1, TAIL_LIGHT_COLOUR),
        lamp(1, 1, TAIL_LIGHT_COLOUR),
    ].map(withoutUv));

    const car = new THREE.Group();
    car.add(new THREE.Mesh(body, toonMaterial({ vertexColors: true })));
    car.add(new THREE.Mesh(lights, new THREE.MeshBasicMaterial({ vertexColors: true })));
    car.add(inkEdges(body));
    return car;
}

export class CarsView {
    constructor(scene, traffic) {
        this.traffic = traffic;
        this.models = new Map();
        for (const { vehicle, lane } of traffic.cars()) {
            const model = carModel(vehicle.colour);
            model.rotation.y = lane.heading;
            scene.add(model);
            this.models.set(vehicle, model);
        }
        this.update();
    }

    /** Moves each model to where its car is in the simulation. */
    update() {
        for (const { vehicle, x: carX, z: carZ } of this.traffic.cars()) this.models.get(vehicle).position.set(carX, 0, carZ);
    }
}

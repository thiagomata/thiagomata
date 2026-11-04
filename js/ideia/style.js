// The flat, illustrated look: two-tone (toon) shading and dark ink outlines.
import * as THREE from "three";
import { COLOURS } from "./plan.js";

/** Brightness of the three flat tones, from shadow to full light. */
const TOON_TONES = [90, 170, 255];
/** Edges between faces meeting at more than this angle get an ink line. */
const OUTLINE_EDGE_ANGLE_DEGREES = 30;

const toonSteps = new THREE.DataTexture(new Uint8Array(TOON_TONES), TOON_TONES.length, 1, THREE.RedFormat);
toonSteps.minFilter = toonSteps.magFilter = THREE.NearestFilter;
toonSteps.needsUpdate = true;

/** A material whose light falls into flat tones, like the vector art. */
export const toonMaterial = (options = {}) => new THREE.MeshToonMaterial({ gradientMap: toonSteps, ...options });

const inkLineMaterial = new THREE.LineBasicMaterial({ color: COLOURS.ink });
const inkHullMaterial = new THREE.MeshBasicMaterial({ color: COLOURS.ink, side: THREE.BackSide });

/** Ink lines along the hard edges of a geometry (for boxy shapes: buildings, cars). */
export const inkEdges = geometry =>
    new THREE.LineSegments(new THREE.EdgesGeometry(geometry, OUTLINE_EDGE_ANGLE_DEGREES), inkLineMaterial);

/**
 * Outlines an instanced mesh (for round shapes: trees): a copy `grow` times bigger, drawn inside
 * out in ink and sharing the instance transforms, so only its rim shows around each instance.
 */
export function addOutline(scene, instancedMesh, grow) {
    const hull = new THREE.InstancedMesh(
        instancedMesh.geometry.clone().scale(grow, grow, grow),
        inkHullMaterial,
        instancedMesh.count,
    );
    hull.instanceMatrix = instancedMesh.instanceMatrix;
    hull.frustumCulled = false;
    scene.add(hull);
}

/** Gives every vertex of the geometry one colour (for meshes that use vertexColors). */
export function paintGeometry(geometry, colour) {
    const { r, g, b } = new THREE.Color(colour);
    const count = geometry.attributes.position.count;
    const values = new Float32Array(count * 3);
    for (let vertex = 0; vertex < count; vertex++) values.set([r, g, b], vertex * 3);
    geometry.setAttribute("color", new THREE.BufferAttribute(values, 3));
    return geometry;
}

// The whole simulation (traffic and crowd), advanced in fixed ticks counted by an integer.
// The scene draws it; the tests run it without drawing anything.
import { Crowd } from "./crowd.js";
import { seededRandom } from "./random.js";
import { Traffic } from "./traffic.js";

export const TICKS_PER_SECOND = 60;
export const TICK_SECONDS = 1 / TICKS_PER_SECOND;

// Fixed seeds: the same streets and the same crowd on every visit.
const LAYOUT_SEED = 7;
const BEHAVIOUR_SEED = 11;

export class Simulation {
    constructor({ crowdSize = 1, layoutSeed = LAYOUT_SEED, behaviourSeed = BEHAVIOUR_SEED } = {}) {
        const layoutRandom = seededRandom(layoutSeed);
        this.traffic = new Traffic(layoutRandom);
        this.crowd = new Crowd({ layoutRandom, behaviourRandom: seededRandom(behaviourSeed), size: crowdSize });
        this.tick = 0;
    }

    /** Simulation time: always a whole number of ticks. */
    get seconds() {
        return this.tick * TICK_SECONDS;
    }

    step() {
        this.traffic.step(this.seconds, TICK_SECONDS);
        this.tick += 1;
    }
}

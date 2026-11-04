import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    CROSSING_MIDDLE, CROSSING_OUTER_EDGE, JUNCTION_Y, LANE_WIDTH, LANES_PER_ROAD, MAIN_LANE_CENTRES,
    MAIN_LANE_DIVIDERS, MAIN_ROAD, MAIN_SIDEWALKS, MAIN_STREET_CENTRE_X, ROAD_HALF_WIDTH,
    STOP_LINE_DISTANCE, isNearJunction, worldX, worldZ,
} from "../js/ideia/plan.js";

describe("street plan", () => {
    it("centres the main road on the street and fits all its lanes", () => {
        assert.equal((MAIN_ROAD[0] + MAIN_ROAD[1]) / 2, MAIN_STREET_CENTRE_X);
        assert.equal(MAIN_ROAD[1] - MAIN_ROAD[0], LANE_WIDTH * LANES_PER_ROAD);
        assert.equal(2 * ROAD_HALF_WIDTH, MAIN_ROAD[1] - MAIN_ROAD[0]);
    });

    it("puts the sidewalks right against the road on both sides", () => {
        assert.equal(MAIN_SIDEWALKS[0][1], MAIN_ROAD[0]);
        assert.equal(MAIN_SIDEWALKS[1][0], MAIN_ROAD[1]);
        assert.ok(MAIN_SIDEWALKS.every(([inner, outer]) => outer > inner));
    });

    it("places every lane centre on the road, one lane width apart", () => {
        assert.equal(MAIN_LANE_CENTRES.length, LANES_PER_ROAD);
        MAIN_LANE_CENTRES.forEach((centre, lane) => {
            assert.ok(centre > MAIN_ROAD[0] && centre < MAIN_ROAD[1]);
            if (lane > 0) assert.equal(centre - MAIN_LANE_CENTRES[lane - 1], LANE_WIDTH);
        });
    });

    it("draws the lane dividers between lanes, not on the centre line", () => {
        for (const divider of MAIN_LANE_DIVIDERS) {
            assert.ok(divider > MAIN_ROAD[0] && divider < MAIN_ROAD[1]);
            assert.notEqual(divider, MAIN_STREET_CENTRE_X);
        }
    });

    it("keeps the stop line outside the zebra crossings", () => {
        assert.ok(CROSSING_MIDDLE > ROAD_HALF_WIDTH && CROSSING_MIDDLE < CROSSING_OUTER_EDGE);
        assert.ok(STOP_LINE_DISTANCE > CROSSING_OUTER_EDGE);
    });

    it("maps the junction centre to the world origin", () => {
        assert.equal(worldX(MAIN_STREET_CENTRE_X), 0);
        assert.equal(worldZ(JUNCTION_Y), 0);
        assert.equal(worldZ(JUNCTION_Y + 10), 10);              // planY grows towards the camera (+z)
    });

    it("knows what is near the junction", () => {
        assert.ok(isNearJunction(JUNCTION_Y + 99, 100));
        assert.ok(!isNearJunction(JUNCTION_Y - 100, 100));
    });
});

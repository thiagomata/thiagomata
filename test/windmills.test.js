import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
    CURTAINS, RAYS, STARS, STAR_SKY_BOTTOM, curtainBrightness, placeRays, placeStars, rayOpacity, starOpacity,
} from "../js/windmills/aurora.js";
import { BLADES, HEIGHT, bladeShape, bladesFor, bladesToDraw, plantBlades } from "../js/windmills/grass.js";
import { HORIZON_Y, PICTURE, WINDMILLS, isBehindAWindmill, isOnRoad, shownSlice } from "../js/windmills/picture.js";
import { SAIL_SPEED, sailSpeedAt, windAt } from "../js/windmills/wind.js";

/** Times over a minute and spots across the picture, for checks that must hold everywhere. */
const SECONDS = Array.from({ length: 61 }, (_, index) => index);
const SPOTS = Array.from({ length: 44 }, (_, index) => index * 100);

describe("windmills: the picture", () => {
    it("puts both windmills inside the picture, standing in the field", () => {
        for (const { hub: [hubX, hubY], reach: [left, right], baseY } of WINDMILLS) {
            assert.ok(hubX > 0 && hubX < PICTURE.width && hubY > 0 && hubY < PICTURE.height);
            assert.ok(left < hubX && hubX < right, "the sails' reach is around the hub");
            assert.ok(baseY > HORIZON_Y && baseY > hubY, "the base is below the hub, in the field");
        }
    });

    it("matches the stage's sizes in style/windmills.css", () => {
        const style = readFileSync(new URL("../style/windmills.css", import.meta.url), "utf8");
        const shape = `${PICTURE.width} / ${PICTURE.height}`;
        assert.ok(style.includes(`100cqh * ${shape}`) && style.includes(`aspect-ratio: ${shape}`), "the picture's shape");
        const bigWindmill = WINDMILLS.reduce((biggest, windmill) => (windmill.sailLength > biggest.sailLength ? windmill : biggest));
        assert.ok(style.includes(`--big-windmill: calc(${bigWindmill.hub[0]} / ${PICTURE.width})`), "the big windmill's hub");
    });

    it("finds the slice of the picture a card shows", () => {
        const stageWidth = 1163;
        // A wide card shows all of it.
        assert.deepEqual(shownSlice(0, stageWidth, stageWidth), { left: 0, width: stageWidth, pictureLeft: 0, pictureWidth: PICTURE.width });
        // A phone card, the stage slid 615 pixels left: 361 pixels from the 615th.
        const phone = shownSlice(-615, stageWidth, 361);
        assert.equal(phone.left, 615);
        assert.equal(phone.width, 361);
        assert.ok(Math.abs(phone.pictureLeft - 615 / stageWidth * PICTURE.width) < 1e-9);
        assert.ok(Math.abs(phone.pictureWidth - 361 / stageWidth * PICTURE.width) < 1e-9);
        // Never past the picture's edges.
        assert.equal(shownSlice(-1000, stageWidth, 361).width, stageWidth - 1000);
    });

    it("knows where the road is, widening towards the viewer", () => {
        assert.ok(isOnRoad(2330, HORIZON_Y + 10));
        assert.ok(!isOnRoad(2330 + 60, HORIZON_Y + 10), "narrow near the horizon");
        assert.ok(isOnRoad(2330 + 60, PICTURE.height - 10), "wide near the viewer");
        assert.ok(!isOnRoad(500, PICTURE.height - 10));
    });

    it("knows what is behind a windmill: within its reach and further away than its base", () => {
        const [left] = WINDMILLS;
        assert.ok(isBehindAWindmill(left.hub[0], left.baseY - 1));
        assert.ok(!isBehindAWindmill(left.hub[0], left.baseY + 1), "in front of its base");
        assert.ok(!isBehindAWindmill(left.reach[0] - 1, left.baseY - 1), "outside its reach");
    });
});

describe("windmills: the wind", () => {
    it("blows between still air (0) and a full gust (1)", () => {
        for (const seconds of SECONDS) {
            for (const x of SPOTS) {
                const wind = windAt(x, seconds);
                assert.ok(wind >= 0 && wind <= 1, `${wind} at ${x}, ${seconds}s`);
            }
        }
    });

    it("sends its gusts from left to right", () => {
        // Where the strongest wind is, a moment later, has moved right.
        const strongestAt = seconds => SPOTS.reduce((best, x) => (windAt(x, seconds) > windAt(best, seconds) ? x : best));
        const now = strongestAt(10);
        const soon = strongestAt(10.5);
        assert.ok(soon > now, `from ${now} to ${soon}`);
    });

    it("turns the sails faster in a gust and slower in calm air, within their range", () => {
        for (const seconds of SECONDS) {
            const speed = sailSpeedAt(1000, seconds);
            assert.ok(speed >= SAIL_SPEED.stillAir && speed <= SAIL_SPEED.fullGust, `${speed}`);
            const calmer = windAt(1000, seconds) < windAt(1000, seconds + 0.5);
            if (calmer) assert.ok(sailSpeedAt(1000, seconds) < sailSpeedAt(1000, seconds + 0.5));
        }
    });
});

describe("windmills: the grass", () => {
    const blades = plantBlades();

    it("plants the same field every time", () => {
        assert.deepEqual(plantBlades(), blades);
    });

    it("plants every blade in the field, off the road", () => {
        assert.equal(blades.length, BLADES);
        for (const blade of blades) {
            assert.ok(blade.y >= HORIZON_Y, "below the horizon");
            assert.ok(!isOnRoad(blade.x, blade.y), "off the road");
        }
    });

    it("keeps blades between their shortest and tallest", () => {
        for (const blade of blades) {
            assert.ok(blade.height >= HEIGHT.atHorizon[0] && blade.height <= HEIGHT.atBottom[1], `${blade.height}`);
        }
    });

    it("draws far blades first, so near ones cover them", () => {
        for (let index = 1; index < blades.length; index++) assert.ok(blades[index - 1].y <= blades[index].y);
    });

    it("splits the field between the back and front layers, each blade in exactly one", () => {
        const back = bladesFor("back", blades), front = bladesFor("front", blades);
        assert.equal(back.length + front.length, blades.length);
        assert.ok(back.every(blade => isBehindAWindmill(blade.x, blade.y)));
        assert.ok(front.every(blade => !isBehindAWindmill(blade.x, blade.y)));
        assert.ok(back.length > 0 && front.length > 0);
    });

    it("draws every blade on a wide card, and fewer, evenly spread, on a narrow one", () => {
        const desktop = 1200, phone = 360, tiny = 100;
        assert.deepEqual(bladesToDraw(blades, desktop), blades);
        const onPhone = bladesToDraw(blades, phone);
        assert.ok(onPhone.length < blades.length * 0.5 && onPhone.length >= blades.length * 0.36, `${onPhone.length}`);
        assert.ok(onPhone.every(blade => blades.includes(blade)), "a subset, in the same order");
        assert.equal(bladesToDraw(blades, tiny).length, bladesToDraw(blades, phone / 2).length, "never fewer than the fewest share");
        // Spread across the field's depth: the near half keeps about half of the drawn blades.
        const middleY = blades[blades.length >> 1].y;
        const near = onPhone.filter(blade => blade.y >= middleY).length;
        assert.ok(Math.abs(near / onPhone.length - 0.5) < 0.05, `${near} of ${onPhone.length} near`);
    });

    it("bends blades away from their root, and stiffer blades less", () => {
        const blade = { x: 1000, y: 2200, height: 200, width: 6, lean: 0, stiffness: 1 };
        for (const seconds of SECONDS) {
            const { tip } = bladeShape(blade, seconds);
            assert.ok(tip.y < blade.y, "the tip stands above the root");
            assert.ok(tip.x > blade.x, "the wind blows to the right");
            const stiffer = bladeShape({ ...blade, stiffness: 2 }, seconds);
            assert.ok(stiffer.tip.x - blade.x < tip.x - blade.x, "a stiffer blade bends less");
        }
    });

    it("bends a blade further in a gust than in calm air", () => {
        const blade = { x: 1000, y: 2200, height: 200, width: 6, lean: 0, stiffness: 1 };
        const windAtBlade = seconds => windAt(blade.x, seconds);
        const calmest = SECONDS.reduce((best, seconds) => (windAtBlade(seconds) < windAtBlade(best) ? seconds : best));
        const gustiest = SECONDS.reduce((best, seconds) => (windAtBlade(seconds) > windAtBlade(best) ? seconds : best));
        assert.ok(bladeShape(blade, gustiest).tip.x > bladeShape(blade, calmest).tip.x);
    });
});

describe("windmills: the aurora", () => {
    const rays = placeRays(), stars = placeStars();
    const brightest = CURTAINS.reduce((total, curtain) => total + curtain.weight, 0);

    it("places the same rays and stars every time", () => {
        assert.deepEqual(placeRays(), rays);
        assert.deepEqual(placeStars(), stars);
        assert.equal(rays.length, RAYS);
        assert.equal(stars.length, STARS);
    });

    it("keeps the stars high in the sky", () => {
        for (const star of stars) assert.ok(star.y >= 0 && star.y <= STAR_SKY_BOTTOM * PICTURE.height);
    });

    it("keeps the curtains' brightness between dark and the sum of their weights", () => {
        for (const seconds of SECONDS) {
            for (const x of SPOTS) {
                const brightness = curtainBrightness(x, seconds);
                assert.ok(brightness >= 0 && brightness <= brightest + 1e-9, `${brightness}`);
            }
        }
    });

    it("lets the curtains drift: the sky is not the same a moment later", () => {
        const sky = seconds => SPOTS.map(x => curtainBrightness(x, seconds));
        assert.notDeepEqual(sky(0), sky(5));
    });

    it("keeps every ray and star between transparent and opaque", () => {
        for (const seconds of SECONDS) {
            for (const ray of rays) {
                const opacity = rayOpacity(ray, seconds);
                assert.ok(opacity >= 0 && opacity <= 1, `${opacity}`);
            }
            for (const star of stars) {
                const opacity = starOpacity(star, seconds);
                assert.ok(opacity > 0 && opacity <= 1, `${opacity}`);
            }
        }
    });
});

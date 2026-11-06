// The maths of the "Perceptions of Probability" card's curve (drawn by scene.js): each phrase's
// survey answers (survey.js), smoothed and scaled to one height, mixed from one phrase to the next,
// the curve's path, and how the chart fits a card of any shape.
import { clamp, lerp } from "../shared/motion.js";

/** The answers are spiky (46 people); a small binomial blur turns them into a curve. */
const BLUR = [1, 4, 6, 4, 1];

/** `values` blurred with BLUR, the ends held at their last value. */
export function smooth(values) {
    const reach = (BLUR.length - 1) / 2;
    const total = BLUR.reduce((sum, weight) => sum + weight, 0);
    return values.map((_, index) => BLUR.reduce((sum, weight, offset) => {
        const neighbour = clamp(index + offset - reach, 0, values.length - 1);
        return sum + weight * values[neighbour];
    }, 0) / total);
}

/** `values` scaled so their highest is 1 (all zeros stay zeros). */
export function toPeak(values) {
    const highest = Math.max(...values);
    return highest > 0 ? values.map(value => value / highest) : values.map(() => 0);
}

/** The curve `share` of the way from `first` to `second`, point by point. */
export const mixCurves = (first, second, share) => first.map((value, index) => lerp(value, second[index], share));

/** Where `values` (0 to 1) sit in `box` ({ left, top, width, height }, y down), evenly spread across it. */
export const curvePoints = (values, box) => values.map((value, index) => [
    box.left + box.width * index / (values.length - 1),
    box.top + box.height * (1 - value),
]);

/**
 * A smooth SVG path through `points` (Catmull-Rom, as cubic Béziers), rounded to `decimals`. Each
 * Bézier's handles are kept inside `box` ({ left, top, width, height }): a Bézier never strays
 * outside its points and handles, so the curve can't overshoot the box (dipping below the baseline
 * beside a run of zeros, as Catmull-Rom otherwise does).
 */
export function smoothPath(points, box, decimals = 1) {
    const inside = ([across, down]) => [clamp(across, box.left, box.left + box.width), clamp(down, box.top, box.top + box.height)];
    const at = index => points[clamp(index, 0, points.length - 1)];
    const number = value => value.toFixed(decimals);
    const SMOOTHNESS = 6;       // Catmull-Rom's handles reach a sixth of the way to the next points
    let path = `M${number(points[0][0])} ${number(points[0][1])}`;
    for (let index = 0; index < points.length - 1; index++) {
        const [before, from, to, after] = [at(index - 1), at(index), at(index + 1), at(index + 2)];
        const first = inside([from[0] + (to[0] - before[0]) / SMOOTHNESS, from[1] + (to[1] - before[1]) / SMOOTHNESS]);
        const second = inside([to[0] - (after[0] - from[0]) / SMOOTHNESS, to[1] - (after[1] - from[1]) / SMOOTHNESS]);
        path += ` C${number(first[0])} ${number(first[1])} ${number(second[0])} ${number(second[1])} ${number(to[0])} ${number(to[1])}`;
    }
    return path;
}

/**
 * The part of the drawing (in its units) a card `aspect` (width / height) wide shows. The drawing
 * is `design` ({ width, height }), the chart sits in `chart` ({ left, top, width, height }), and
 * `margin` is kept around it. The chart and its margin always stay in view:
 *   - a card wider than the drawing shows its full width, cropping top and bottom around the
 *     chart, and, if that would cut into the chart, grows wider to the left instead (over the
 *     background, behind the text);
 *   - a narrower card keeps the chart in view, as near the right as the drawing allows, and grows
 *     taller around the chart if the card is narrower than the chart.
 */
export function fitView(aspect, design, chart, margin) {
    const chartMiddle = chart.top + chart.height / 2;
    if (aspect >= design.width / design.height) {
        const height = Math.max(design.width / aspect, chart.height + 2 * margin);
        const width = height * aspect;
        const top = clamp(chartMiddle - height / 2, Math.min(0, design.height - height), Math.max(0, design.height - height));
        return { left: design.width - width, top, width, height };
    }
    const width = Math.max(design.height * aspect, chart.width + 2 * margin);
    const height = width / aspect;
    // Any left edge from `lowest` to `highest` keeps the chart and its margin in view.
    const lowest = chart.left + chart.width + margin - width;
    const highest = chart.left - margin;
    const left = clamp(design.width - width, lowest, highest);
    const top = height > design.height ? chartMiddle - height / 2 : 0;
    return { left, top, width, height };
}

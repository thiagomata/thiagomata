// The maths of the contrast check (tools/check-contrast.js), kept free of the browser so it can be
// tested, and loaded into the page to read its pixels there.
//
// Contrast follows WCAG 2: the relative luminance of two colours, and their ratio from 1:1 (the
// same) to 21:1 (black on white). Small text needs 4.5:1; large text 3:1.

/** WCAG's minimum ratios, and what counts as large text (in CSS pixels; 18.66px is 14pt). */
export const WCAG = {
    smallText: 4.5,
    largeText: 3,
    largeSize: 24,
    largeBoldSize: 18.66,
    bold: 700,
};

/** Behind a line of text, judge by its darkest-against-the-text tenth, not single stray pixels. */
export const WORST_SHARE = 0.1;

const CHANNEL_MAX = 255;
const LINEAR_THRESHOLD = 0.04045;
const LINEAR = { slope: 12.92, offset: 0.055, scale: 1.055, power: 2.4 };
const WEIGHTS = [0.2126, 0.7152, 0.0722];
const FLARE = 0.05;
/** Pixels are read four bytes apiece: red, green, blue, alpha. */
const BYTES_PER_PIXEL = 4;

/** A CSS colour as "rgb(…)" or "rgba(…)" (as getComputedStyle gives it), as [red, green, blue]. */
export function parseColour(css) {
    const channels = css.match(/[\d.]+/g)?.map(Number);
    if (!channels || channels.length < 3) throw new Error(`Not an rgb() colour: ${css}`);
    return channels.slice(0, 3);
}

/** WCAG's relative luminance of [red, green, blue] (0 to 255 each): 0 for black, 1 for white. */
export function relativeLuminance(colour) {
    const linear = colour.map(channel => {
        const share = channel / CHANNEL_MAX;
        return share <= LINEAR_THRESHOLD ? share / LINEAR.slope : ((share + LINEAR.offset) / LINEAR.scale) ** LINEAR.power;
    });
    return linear.reduce((total, value, index) => total + value * WEIGHTS[index], 0);
}

/** The contrast ratio between two luminances, from 1 to 21, whichever is lighter. */
export function contrastRatio(first, second) {
    const [lighter, darker] = first > second ? [first, second] : [second, first];
    return (lighter + FLARE) / (darker + FLARE);
}

/** The ratio WCAG asks of text this size (CSS pixels) and weight. */
export function requiredRatio(fontSize, fontWeight) {
    const large = fontSize >= WCAG.largeSize || (fontSize >= WCAG.largeBoldSize && fontWeight >= WCAG.bold);
    return large ? WCAG.largeText : WCAG.smallText;
}

/** The value `share` of the way up the sorted `values` (0 the smallest, 1 the largest). */
export function percentile(values, share) {
    const sorted = [...values].sort((first, second) => first - second);
    return sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))];
}

/** The luminance of the pixel at (`column`, `row`) of `image` ({ data, width }, as ImageData). */
export function pixelLuminance(image, column, row) {
    const start = (row * image.width + column) * BYTES_PER_PIXEL;
    return relativeLuminance([image.data[start], image.data[start + 1], image.data[start + 2]]);
}

/** Whole pixels of `rect` ({ left, top, width, height }) inside `image`, every `step` pixels. */
function* pixelsIn(image, rect, step) {
    const fromColumn = Math.max(0, Math.floor(rect.left)), toColumn = Math.min(image.width, Math.ceil(rect.left + rect.width));
    const fromRow = Math.max(0, Math.floor(rect.top)), toRow = Math.min(image.height, Math.ceil(rect.top + rect.height));
    for (let row = fromRow; row < toRow; row += step) {
        for (let column = fromColumn; column < toColumn; column += step) yield [column, row];
    }
}

/**
 * How readable text of luminance `textLuminance` is over the background in `rects` of `image`
 * (the page photographed with its text hidden): the contrast of its worst tenth of pixels.
 * Null when the rects hold no pixels.
 */
export function textContrast(image, rects, textLuminance, step = 1) {
    const ratios = [];
    for (const rect of rects) {
        for (const [column, row] of pixelsIn(image, rect, step)) ratios.push(contrastRatio(textLuminance, pixelLuminance(image, column, row)));
    }
    return ratios.length ? percentile(ratios, WORST_SHARE) : null;
}

const isInside = (column, row, rect) =>
    column >= rect.left && column < rect.left + rect.width && row >= rect.top && row < rect.top + rect.height;

/**
 * How much detail `region` of `image` shows: the average change in luminance between neighbouring
 * pixels, skipping pixels inside `skipped` rects (the text). A layer over the scene lowers it.
 */
export function detail(image, region, skipped = [], step = 1) {
    let total = 0, counted = 0;
    for (const [column, row] of pixelsIn(image, region, step)) {
        if (column + 1 >= image.width || row + 1 >= image.height) continue;
        if (skipped.some(rect => isInside(column, row, rect))) continue;
        const here = pixelLuminance(image, column, row);
        total += Math.abs(pixelLuminance(image, column + 1, row) - here) + Math.abs(pixelLuminance(image, column, row + 1) - here);
        counted++;
    }
    return counted ? total / counted : 0;
}

// Ways to keep the Elegant card's text readable over its scene, shared by the lab
// (lab/elegant-contrast/index.html) and the contrast check (tools/check-contrast.js), so both
// look at exactly the same CSS. Each variant is CSS for the card matched by `card`.

/** Every piece of the card's text. */
const TEXT = ":is(h3, h4, p, .quote-author, li, li span, li i)";
/** The card's text blocks: the title, the headline, the quote and the list. */
const BLOCKS = ":is(h3, h4, .section-blockquote, .section-topics)";

/** The card's layer (border-image) is shown above the live scene too, through its ::after. */
const layer = (card, gradient) => `
    ${card} { border-image: ${gradient} fill 1; }
    ${card}.windmills-live::after { border-image: ${gradient} fill 1; }`;

const SHADOW = "0 1px 3px rgba(0, 0, 0, 0.85), 0 0 14px rgba(0, 0, 0, 0.55)";
const DEEP_BLUE = "2, 20, 34";
/** A pale, slightly cool white, so a light patch sits in the night scene rather than glaring. */
const MIST = "236, 242, 246";

/** Soft rounded patches of `colour` behind each text block. */
const halos = (card, colour, opacity) => `
    ${card} ${BLOCKS} {
        background: rgba(${colour}, ${opacity});
        box-shadow: 0 0 28px 18px rgba(${colour}, ${opacity});
        border-radius: 18px;
        width: fit-content;
    }`;

/**
 * The approved effect, black text on a light layer across the left, in different colours: each a
 * top-to-bottom gradient of the scene's own colours mixed about 45% with white. Light enough for
 * black text (the darkest, the blue-grey, still gives about 8.6:1), but clearly coloured.
 */
const LIGHT_COLOURS = {
    white: { label: "plain white", colours: [`rgb(${MIST})`, `rgb(${MIST})`] },
    sky: {
        label: "the sky's colours: teal, blue-grey, lavender, rose, amber",
        colours: ["rgb(157, 199, 204)", "rgb(146, 170, 175) 30%", "rgb(182, 178, 196) 55%", "rgb(213, 149, 173) 80%", "rgb(219, 182, 154)"],
    },
    aurora: { label: "the northern lights: green, teal, blue", colours: ["rgb(187, 240, 174)", "rgb(157, 199, 204) 50%", "rgb(149, 185, 238)"] },
    dusk: { label: "the horizon: lavender, rose, amber", colours: ["rgb(182, 178, 196)", "rgb(213, 149, 173) 55%", "rgb(219, 182, 154)"] },
    teal: { label: "the sky's teal", colours: ["rgb(157, 199, 204)", "rgb(157, 199, 204)"] },
};

/** The light layer: the colours top to bottom, solid on the left and fading out before the windmills. */
const lightLayer = (card, colours) => layer(card, "linear-gradient(transparent, transparent)") + `
    ${card}::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        background: linear-gradient(${colours.join(", ")});
        opacity: 1;
        mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.88), rgba(0, 0, 0, 0.7) 35%, transparent 60%);
    }
    ${card} { position: relative; isolation: isolate; }
    ${card} ${TEXT} { color: #000 !important; }`;

export const VARIANTS = [
    {
        id: "today",
        label: "Today: white text, today's layer",
        css: () => "",
    },
    {
        id: "black",
        label: "Black text, today's layer",
        css: card => `${card} ${TEXT} { color: #000 !important; }`,
    },
    {
        id: "darker",
        label: "White text, darker layer on the left",
        css: card => layer(card, `linear-gradient(90deg, rgba(${DEEP_BLUE}, 0.92), rgba(${DEEP_BLUE}, 0.75) 30%,
            rgba(0, 0, 0, 0.15) 60%, rgba(0, 0, 0, 0.35))`) + `
            ${card} ${TEXT} { text-shadow: ${SHADOW}; }`,
    },
    {
        id: "shadow",
        label: "White text with a shadow, today's layer",
        css: card => `${card} ${TEXT} { text-shadow: ${SHADOW}; }`,
    },
    {
        id: "halo",
        label: "White text, a soft dark halo behind each block, a light layer",
        css: card => layer(card, `linear-gradient(90deg, rgba(${DEEP_BLUE}, 0.45), rgba(${DEEP_BLUE}, 0) 55%)`)
            + halos(card, DEEP_BLUE, 0.5) + `
            ${card} ${TEXT} { text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85); }`,
    },
    ...Object.entries(LIGHT_COLOURS).map(([id, { label, colours }]) => ({
        id: `black-light-${id}`,
        label: `Black text on a light layer across the left: ${label}`,
        css: card => lightLayer(card, colours),
    })),
    {
        id: "black-light-halo",
        label: "Black text on a soft light halo behind each block, no layer",
        css: card => layer(card, "linear-gradient(transparent, transparent)") + halos(card, MIST, 0.8) + `
            ${card} ${TEXT} { color: #000 !important; }`,
    },
];

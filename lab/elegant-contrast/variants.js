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
        css: card => layer(card, `linear-gradient(90deg, rgba(${DEEP_BLUE}, 0.45), rgba(${DEEP_BLUE}, 0) 55%)`) + `
            ${card} ${BLOCKS} {
                background: rgba(${DEEP_BLUE}, 0.5);
                box-shadow: 0 0 28px 18px rgba(${DEEP_BLUE}, 0.5);
                border-radius: 18px;
                width: fit-content;
            }
            ${card} ${TEXT} { text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85); }`,
    },
];

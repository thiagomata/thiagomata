// The Useful card's text over its bridge, shared by the contrast check (tools/check-contrast.js).
// Each variant is CSS for the card matched by `card`.

/** The card, and what shows it is ready (it has no live scene to wait for: its water is an SVG). */
export const CARD = "#values section.useful";
export const LIVE = CARD;
export const SIZE_NAMES = ["phone", "tablet", "desktop", "wide"];

export const VARIANTS = [
    { id: "today", label: "The page as it is", css: () => "" },
];

// The Parallax card's text over its village, for the contrast check (tools/check-contrast.js).
// Each variant is CSS for the card matched by `card`.

/** The card, and what shows its live scene has started. */
export const CARD = '#projects [data-project="parallax"]';
export const LIVE = `${CARD}.parallax-live`;

export const VARIANTS = [
    { id: "today", label: "The page as it is", css: () => "" },
];

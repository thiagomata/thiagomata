// The Probability card's text over its live histogram, for the contrast check
// (tools/check-contrast.js). Each variant is CSS for the card matched by `card`.

/** The card, and what shows its live chart has started. */
export const CARD = '#projects [data-project="probability"]';
export const LIVE = `${CARD}.probability-live`;

export const VARIANTS = [
    { id: "today", label: "The page as it is", css: () => "" },
];

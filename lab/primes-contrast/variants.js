// The Prime Numbers card's text over its grid on a phone, for the contrast check
// (tools/check-contrast.js). Each variant is CSS for the card matched by `card`.

/** The card, and what shows it is ready (it has no live scene: its grid is a picture). */
export const CARD = '#projects [data-project="primes"]';
export const LIVE = CARD;
/** Only phones: on wider screens the grid sits beside the text. */
export const SIZE_NAMES = ["phone"];

export const VARIANTS = [
    { id: "today", label: "The page as it is (a weak layer on phones)", css: () => "" },
    {
        id: "no-layer",
        label: "Without the layer",
        css: card => `${card} { background-image: url("../img/project-primes.svg"); background-position: 75% center; }`,
    },
];

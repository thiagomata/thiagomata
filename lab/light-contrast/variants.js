// The cards that turn light in light mode, measured in light mode by the contrast check
// (tools/check-contrast.js): dark text over their light backgrounds.

/** The cards, and what shows each one is ready. */
export const CARDS = [
    { name: "probability", selector: '#projects [data-project="probability"]', live: '#projects [data-project="probability"].probability-live' },
    { name: "primes", selector: '#projects [data-project="primes"]', live: '#projects [data-project="primes"]' },
    { name: "cv", selector: "#cv .checkout", live: "#cv .checkout" },
];
export const COLOR_SCHEME = "light";

export const VARIANTS = [
    { id: "today", label: "The page as it is, in light mode", css: () => "" },
];

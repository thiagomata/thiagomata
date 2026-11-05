// Ways to keep the Ideia card's white text readable over its live street (js/ideia/scene.js),
// shared by the lab (tuner.html) and the contrast check (tools/check-contrast.js), so both look at
// exactly the same CSS. Each variant is CSS for the card matched by `card`.

/** The card, and what shows its live scene has started (for tools/check-contrast.js). */
export const CARD = '#top-companies section[data-company="ideia"]';
export const LIVE = `${CARD} canvas.live-bg`;

/** The card's own deep blue (its --effect-color), as "red, green, blue". */
export const DEEP_BLUE = "26, 26, 61";

/**
 * A dark layer of `colour` over the street: `strength` (0 to 1) until `hold`, gone by `clear`
 * (CSS lengths, such as "max(19%, 460px)"), in place of the card's own readability layer.
 */
export const darkLayer = (card, { colour = DEEP_BLUE, strength, hold, clear }) => `
    ${card}.is-live::after {
        border-image: none;
        background: rgb(${colour});
        mask-image: linear-gradient(90deg, rgba(0, 0, 0, ${strength}) 0, rgba(0, 0, 0, ${strength}) ${hold}, transparent ${clear});
    }`;

export const VARIANTS = [
    {
        id: "today",
        label: "Today: white text, the card's own layer",
        css: () => "",
    },
];

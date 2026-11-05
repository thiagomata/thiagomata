// Ways to keep the Ideia card's white text readable over its live street (js/ideia/scene.js),
// shared by the lab (tuner.html) and the contrast check (tools/check-contrast.js), so both look at
// exactly the same CSS. Each variant is CSS for the card matched by `card`.

/** The card, and what shows its live scene has started (for tools/check-contrast.js). */
export const CARD = '#top-companies section[data-company="ideia"]';
export const LIVE = `${CARD} canvas.live-bg`;

/** The card's own deep blue (its --effect-color), as "red, green, blue". */
export const DEEP_BLUE = "26, 26, 61";

/**
 * A dark layer of `colour` over the street, as tuned in tuner.html, in place of the card's own
 * readability layer. Across: solid until `hold`, gone by `clear` (CSS lengths). Down: strength
 * `top`, `middle` (at `middleAt`) and `bottom` (0 to 1). The two shapes multiply.
 */
export const darkLayer = (card, { colour = DEEP_BLUE, hold, clear, top, middle, middleAt, bottom }) => `
    ${card}.is-live::after {
        border-image: none;
        background: rgb(${colour});
        mask-image:
            linear-gradient(90deg, #000 0, #000 ${hold}, transparent ${clear}),
            linear-gradient(rgba(0, 0, 0, ${top}), rgba(0, 0, 0, ${middle}) ${middleAt}, rgba(0, 0, 0, ${bottom}));
        mask-composite: intersect;
    }`;

export const VARIANTS = [
    {
        id: "today",
        label: "Today: white text, the card's own layer",
        css: () => "",
    },
    {
        id: "tuned",
        label: "Deep blue layer, tuned: 22% at the top, 85% at 61% down, 21% at the bottom; clear by 75% (or 860px)",
        css: card => darkLayer(card, { hold: "max(0%, 680px)", clear: "max(75%, 860px)", top: 0.22, middle: 0.85, middleAt: "61%", bottom: 0.21 }),
    },
];

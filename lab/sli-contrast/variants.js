// The SLI card's darkening on wide screens, shared by the contrast check (tools/check-contrast.js)
// and matching the tuner (tuner.html). Each variant is CSS for the card matched by `card`.

/** The card, and what shows its live scene has started (for tools/check-contrast.js). */
export const CARD = '#top-companies section[data-company="sli"]';
export const LIVE = `${CARD}.is-live`;
/** Only wide screens: phones keep their own layer. */
export const SIZE_NAMES = ["desktop"];

/**
 * The card's layer in its own dark, as tuned in tuner.html: across, solid until `hold` and gone by
 * `clear`; down, `top`, `middle` (at `middleAt`) and `bottom`. Plus the animation's own `shade`.
 */
const tunedLayer = ({ hold, clear, top, middle, middleAt, bottom, shade }) => card => `
    ${card}.is-live::after {
        border-image: none;
        background: rgb(33, 30, 30);
        mask-image:
            linear-gradient(90deg, #000 0, #000 max(${hold}, 600px), transparent max(${clear}, 760px)),
            linear-gradient(rgba(0, 0, 0, ${top}), rgba(0, 0, 0, ${middle}) ${middleAt}, rgba(0, 0, 0, ${bottom}));
        mask-composite: intersect;
    }
    ${card} .live-bg .shade { fill-opacity: ${shade}; }`;

export const VARIANTS = [
    { id: "today", label: "Today: the card's own layer, the animation's shade at 85%", css: () => "" },
    {
        id: "tuned",
        label: "Tuned: 90% top, 62% middle (at 62%), 40% bottom; fading from 0% to 100%; the animation's shade at 5%",
        css: tunedLayer({ hold: "0%", clear: "100%", top: 0.9, middle: 0.62, middleAt: "62%", bottom: 0.4, shade: 0.05 }),
    },
];

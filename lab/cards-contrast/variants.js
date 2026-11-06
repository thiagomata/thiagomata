// How dark the right side of the MEC, SLI, OtimiCar and Thrifty cards is on a phone, shared by the
// contrast check (tools/check-contrast.js) and matching the tuner (tuner.html). Each variant is CSS
// for the whole page; the check measures these cards at phone size only.

/** The cards, and what shows each one's live scene has started (the card itself when it has none). */
export const CARDS = [
    { name: "mec", selector: '#top-companies section[data-company="mec"]', live: '#top-companies section[data-company="mec"]' },
    { name: "sli", selector: '#top-companies section[data-company="sli"]', live: '#top-companies section[data-company="sli"].is-live' },
    { name: "otimicar", selector: '#top-companies section[data-company="otimicar"]', live: '#top-companies section[data-company="otimicar"].is-live' },
    { name: "thrifty", selector: "#values section.value-thrifty", live: "#values section.value-thrifty" },
    { name: "macquarie", selector: '#top-companies section[data-company="macquarie"]', live: '#top-companies section[data-company="macquarie"].is-live' },
    { name: "rokt", selector: '#top-companies section[data-company="rokt"]', live: '#top-companies section[data-company="rokt"]' },
    { name: "ideia", selector: '#top-companies section[data-company="ideia"]', live: '#top-companies section[data-company="ideia"].is-live' },
    { name: "useful", selector: "#values section.useful", live: "#values section.useful" },
    { name: "reliable", selector: "#values section.value-reliable", live: "#values section.value-reliable" },
];
export const SIZE_NAMES = ["phone"];

/** The company cards' right edge and the next step of their fade, and Thrifty's right edge (0 to 1). */
const darkness = ({ companyEdge, companyNext, valueEdge }) => () => `
    #top-companies section {
        --squared-darkness: ${companyEdge};
        --effect-darkness: ${companyNext};
    }
    #values section.value-thrifty {
        border-image: linear-gradient(269deg, rgba(0, 0, 0, ${valueEdge}), var(--border-gradient-color)) fill 1;
    }`;

export const VARIANTS = [
    { id: "today", label: "The page as it is (46% and 32% on the companies, 15% on the value cards, since 2026-11-06)", css: () => "" },
    { id: "tuned", label: "Tuned: 46% and 32% on the companies, 15% on Thrifty", css: darkness({ companyEdge: 0.46, companyNext: 0.32, valueEdge: 0.15 }) },
    { id: "none", label: "None: no darkness on the right", css: darkness({ companyEdge: 0, companyNext: 0, valueEdge: 0 }) },
];

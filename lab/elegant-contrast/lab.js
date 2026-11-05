// The Elegant contrast labs' page: the real card (copied from index.html) in each variant of
// variants.js, live, with the numbers from `npm run contrast` under each. index.html shows every
// variant; candidates.html only those still in the running.
import { start } from "../../js/windmills/scene.js";
import { VARIANTS } from "./variants.js";

const WINDMILLS_IMAGE = new URL("../../img/simple2-windmills.svg", import.meta.url).href;

/** The real card, from the page. */
export async function realCard() {
    const page = new DOMParser().parseFromString(await (await fetch(new URL("../../index.html", import.meta.url))).text(), "text/html");
    return page.querySelector("#values section.value-elegant");
}

/** The card's live windmills, as js/windmills-card.js adds them. */
export function showWindmills(card) {
    const scene = document.createElement("div");
    scene.className = "windmills-scene";
    scene.setAttribute("aria-hidden", "true");
    const stage = document.createElement("div");
    stage.className = "windmills-stage";
    scene.append(stage);
    card.prepend(scene);
    start(stage, { grass: "front", aurora: true, windmillsImage: WINDMILLS_IMAGE });
    card.classList.add("windmills-live");
}

/** The measured scores, if `npm run contrast` has been run. */
async function scores() {
    try {
        return await (await fetch(new URL("./results.json", import.meta.url), { cache: "no-store" })).json();
    } catch {
        return null;
    }
}

const describe = result => {
    if (!result) return "not measured yet: run <code>npm run contrast</code>";
    const verdict = result.passes ? "passes" : "fails";
    return `text contrast <b class="${verdict}">${result.worstContrast.toFixed(1)}:1</b> at worst
        (“${result.worstText}”, needs ${result.required}:1; ${result.failingLines} of ${result.lines} lines short),
        scene kept <b>${Math.round(result.sceneKept * 100)}%</b>`;
};

/** Shows the card in the variants `ids` (every variant when null), in the page's #values. */
export async function showVariants(ids = null) {
    const template = await realCard();
    const results = await scores();
    const article = document.querySelector("#values");
    const style = document.createElement("style");
    for (const variant of VARIANTS.filter(variant => !ids || ids.includes(variant.id))) {
        const block = document.createElement("div");
        block.className = "variant";
        const heading = document.createElement("h3");
        heading.textContent = variant.label;
        const scoreLine = document.createElement("div");
        scoreLine.className = "scores";
        const measured = results?.variants?.[variant.id];
        scoreLine.innerHTML = ["desktop", "phone"]
            .map(size => `${size}: ${describe(measured?.[size])}`).join("<br>");
        const wide = template.cloneNode(true);
        const narrow = template.cloneNode(true);
        const narrowFrame = document.createElement("div");
        narrowFrame.className = "narrow";
        narrowFrame.append(narrow);
        for (const card of [wide, narrow]) {
            card.removeAttribute("id");
            card.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
            card.classList.add(`variant-${variant.id}`);
        }
        style.textContent += variant.css(`#values section.value-elegant.variant-${variant.id}`);
        block.append(heading, scoreLine, wide, narrowFrame);
        article.append(block);
        showWindmills(wide);
        showWindmills(narrow);
    }
    document.head.append(style);
}

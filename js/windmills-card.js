// Loads the Elegant card's live windmills (js/windmills/scene.js, built with three.js) soon after
// the page loads, or as the card gets near the screen: sails, swaying grass and the northern
// lights. Until then, and if it fails (no WebGL), the card keeps its static picture.
import { loadSoon } from "./shared/load-soon.js";

const WINDMILLS_IMAGE = "./img/simple2-windmills.svg";

function showWindmills(card, { start }) {
    const scene = document.createElement("div");
    scene.className = "windmills-scene";
    scene.setAttribute("aria-hidden", "true");
    const stage = document.createElement("div");
    stage.className = "windmills-stage";
    scene.append(stage);
    card.prepend(scene);
    try {
        start(stage, { grass: "front", aurora: true, windmillsImage: WINDMILLS_IMAGE });
        card.classList.add("windmills-live");
    } catch {
        scene.remove();              // keep the static picture
    }
}

const card = document.querySelector("#values section.value-elegant");
if (card) loadSoon(card, () => import("./windmills/scene.js").then(scene => showWindmills(card, scene)).catch(() => {}));

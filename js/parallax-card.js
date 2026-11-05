// Loads the Parallax card's live tunnel (js/parallax/scene.js, built with three.js) soon after the
// page loads, or as the card gets near the screen. Until then, and if it fails (no WebGL), the card
// keeps its static picture of the Parallax Engine's Tutorial 9.
import { loadSoon } from "./shared/load-soon.js";

function showTunnel(card, { start }) {
    try {
        start(card);
        card.classList.add("parallax-live");
    } catch {
        card.querySelector(".parallax-tunnel")?.remove();      // keep the static picture
    }
}

const card = document.querySelector('#projects [data-project="parallax"]');
if (card) loadSoon(card, () => import("./parallax/scene.js").then(scene => showTunnel(card, scene)).catch(() => {}));

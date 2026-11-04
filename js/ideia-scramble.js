// Loads the live Ideia background (js/ideia/scene.js, built with three.js) soon after the page
// loads, or as the card gets near the screen. Until then, and if it fails (no WebGL), the card
// keeps its image.
import { loadSoon } from "./shared/load-soon.js";

const card = document.querySelector('#top-companies section[data-company="ideia"]');
if (card) loadSoon(card, () => import("./ideia/scene.js").then(({ start }) => start(card)).catch(() => {}));

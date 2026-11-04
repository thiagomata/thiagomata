// Loads the live OtimiCar scene (js/otimicar/scene.js) into its card soon after the page loads,
// or as the card gets near the screen. Until then, the card keeps its image.
import { loadSoon } from "./shared/load-soon.js";

const card = document.querySelector('#top-companies section[data-company="otimicar"]');
if (card) loadSoon(card, () => import("./otimicar/scene.js").then(({ start }) => start(card, "./img/otimicar")).catch(() => {}));

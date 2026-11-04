// Starts the live OtimiCar scene in its card. Without JavaScript the card keeps its image.
import { start } from "./otimicar/scene.js";

const card = document.querySelector('#top-companies section[data-company="otimicar"]');
if (card) start(card, "./img/otimicar");

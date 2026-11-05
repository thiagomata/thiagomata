// Pauses the cards marked data-pause-offscreen while they are off screen (js/shared/pause-offscreen.js).
import { pauseOffscreen } from "./shared/pause-offscreen.js";

pauseOffscreen(document.querySelectorAll("[data-pause-offscreen]"));

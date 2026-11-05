// The Macquarie card's live background: the shared canvas wave field
// (js/water-field.js), in the card's warm-grey palette. The static image
// (img/macquarie-background.webp) stays as the fallback.
import { start } from "./water-field.js";

const card = document.querySelector('#top-companies section[data-company="macquarie"]');
if (card) start(card);

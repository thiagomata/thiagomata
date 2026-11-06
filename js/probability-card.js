// Starts the "Perceptions of Probability" card's live chart (js/probability/scene.js) as a
// histogram, as soon as the page is parsed: it needs no downloads, so the card never shows its
// static picture first. Without JavaScript, the card keeps that picture.
import { start } from "./probability/scene.js";

const card = document.querySelector('#projects [data-project="probability"]');
if (card) start(card, { form: "bars" });

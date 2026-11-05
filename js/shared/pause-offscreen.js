// Pauses the cards whose animation lives inside their background picture (an animated SVG the
// page cannot pause): while such a card is off screen it gets the class "is-paused", and the CSS
// swaps its animated picture for the still original, which looks the same.

/** The animated picture comes back this far before the card scrolls into view. */
export const RESUME_BEFORE_VISIBLE = "300px 0px";
export const PAUSED = "is-paused";

/** A card's name for the animation log: its company, else its title's id. */
const nameOf = card => card.dataset.company || card.querySelector("h3")?.id || "card";

/**
 * Pauses each of `cards` while it is off screen. They start paused, and the observer resumes those
 * on screen. Without IntersectionObserver, the cards are left animated.
 */
export function pauseOffscreen(cards) {
    if (!cards.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
        for (const { target: card, isIntersecting: onScreen } of entries) {
            card.classList.toggle(PAUSED, !onScreen);
            window.logAnimation?.(nameOf(card), onScreen ? "running" : "paused", onScreen ? "" : "off screen");
        }
    }, { rootMargin: RESUME_BEFORE_VISIBLE });
    for (const card of cards) {
        card.classList.add(PAUSED);
        observer.observe(card);
    }
}

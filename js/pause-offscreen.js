// Pauses the cards whose animation lives inside their background picture (an animated SVG the
// page cannot pause): while such a card is off screen it gets the class "is-paused", and the CSS
// swaps its animated picture for the still original, which looks the same.
// The animated picture comes back a little before the card scrolls into view.
(() => {
    const cards = document.querySelectorAll("[data-pause-offscreen]");
    if (!cards.length || !("IntersectionObserver" in window)) return;
    const RESUME_BEFORE_VISIBLE = "300px 0px";
    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
            const card = entry.target;
            card.classList.toggle("is-paused", !entry.isIntersecting);
            const name = card.dataset.company || card.querySelector("h3")?.id || "card";
            window.logAnimation?.(name, entry.isIntersecting ? "running" : "paused", entry.isIntersecting ? "" : "off screen");
        }
    }, { rootMargin: RESUME_BEFORE_VISIBLE });
    cards.forEach(card => {
        card.classList.add("is-paused");      // start still; the observer resumes visible cards
        observer.observe(card);
    });
})();

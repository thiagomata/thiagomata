// Logs when each card's animation starts and stops, to check that nothing runs off screen.
// Off by default; add ?debug=animations to the page's address to turn it on.
// Every card script reports through window.logAnimation(card, state, reason); repeated reports
// of the same state are skipped, so the console only shows changes.
(() => {
    const enabled = new URLSearchParams(window.location.search).get("debug") === "animations";
    const lastState = new Map();
    window.logAnimation = (card, state, reason = "") => {
        if (!enabled || lastState.get(card) === state) return;
        lastState.set(card, state);
        console.info(`[animations] ${card}: ${state}${reason ? ` (${reason})` : ""}`);
    };
})();

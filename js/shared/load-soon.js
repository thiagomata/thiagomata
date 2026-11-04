// Loads a card's live background soon, but never in the way: when the browser is idle after the
// page has loaded, or as the card gets near the screen, whichever comes first. Until then (and if
// loading fails) the card keeps its static picture.

/** Load as the card gets this close to the screen. */
const NEAR_THE_SCREEN = "600px 0px";
/** If the browser is never idle, load this long after the page has loaded anyway. */
const IDLE_TIMEOUT_MILLISECONDS = 3000;

/** Waits for the browser to be idle; browsers without requestIdleCallback wait for the timeout. */
const whenIdle = callback => (window.requestIdleCallback
    ? window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MILLISECONDS })
    : window.setTimeout(callback, IDLE_TIMEOUT_MILLISECONDS));

/** Calls `load` once: when the browser is idle after the page loads, or when `card` is near the screen. */
export function loadSoon(card, load) {
    let observer = null, loaded = false;
    const loadOnce = () => {
        if (loaded) return;
        loaded = true;
        observer?.disconnect();
        load();
    };
    if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver(([entry]) => entry.isIntersecting && loadOnce(), { rootMargin: NEAR_THE_SCREEN });
        observer.observe(card);
    }
    if (document.readyState === "complete") whenIdle(loadOnce);
    else window.addEventListener("load", () => whenIdle(loadOnce), { once: true });
}

// Loads the live Ideia background (js/ideia/scene.js, built with three.js) only when the card
// gets close to the screen. Until then, and if it fails (no WebGL), the card keeps its image.
(() => {
    const card = document.querySelector('#top-companies section[data-company="ideia"]');
    if (!card || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        import("./ideia/scene.js").then(({ start }) => start(card)).catch(() => {});
    }, { rootMargin: "600px 0px" });
    observer.observe(card);
})();

// Loads the Elegant card's live windmills (js/windmills/scene.js, built with three.js) only when
// the card gets close to the screen. Until then, and if it fails (no WebGL), the card keeps its
// static picture.
(() => {
    const card = document.querySelector("#values section.value-elegant");
    if (!card || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        import("./windmills/scene.js").then(({ start }) => {
            const scene = document.createElement("div");
            scene.className = "windmills-scene";
            scene.setAttribute("aria-hidden", "true");
            const stage = document.createElement("div");
            stage.className = "windmills-stage";
            scene.append(stage);
            card.prepend(scene);
            try {
                start(stage, { grass: "front" });
                card.classList.add("windmills-live");
            } catch {
                scene.remove();              // keep the static picture
            }
        }).catch(() => {});
    }, { rootMargin: "600px 0px" });
    observer.observe(card);
})();

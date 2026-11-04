// Loads the Elegant card's live windmills (js/windmills/scene.js, built with three.js) only when
// the card gets close to the screen: sails, swaying grass and the northern lights. Until then, and
// if it fails (no WebGL), the card keeps its static picture.
(() => {
    const WINDMILLS_IMAGE = "./img/simple2-windmills.svg";
    const LOAD_BEFORE_VISIBLE = "600px 0px";
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
                start(stage, { grass: "front", aurora: true, windmillsImage: WINDMILLS_IMAGE });
                card.classList.add("windmills-live");
            } catch {
                scene.remove();              // keep the static picture
            }
        }).catch(() => {});
    }, { rootMargin: LOAD_BEFORE_VISIBLE });
    observer.observe(card);
})();

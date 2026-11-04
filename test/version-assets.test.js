import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { assetVersions, contentVersion, pictureVersionsModule, stampPage, stampStyle, styleFiles } from "../tools/version-assets.js";

const PAGE = `<link rel="stylesheet" href="./style/site.css" />
<script type="importmap">
    {"imports": {"three": "https://cdn.example/three.js", "./js/old.js": "./js/old.js?v=00000000"}}
</script>
<script type="module" src="./js/card.js?v=00000000"></script>
<script src="https://cdn.example/other.js"></script>`;
const VERSIONS = new Map([["./style/site.css", "aaaa1111"], ["./js/card.js", "bbbb2222"], ["./js/shared/helper.js", "cccc3333"]]);

describe("asset versions", () => {
    it("changes the version whenever the contents change", () => {
        assert.equal(contentVersion("one"), contentVersion("one"));
        assert.notEqual(contentVersion("one"), contentVersion("two"));
    });

    it("stamps the page's own scripts and styles, and leaves other sites' alone", () => {
        const stamped = stampPage(PAGE, VERSIONS);
        assert.match(stamped, /href="\.\/style\/site\.css\?v=aaaa1111"/);
        assert.match(stamped, /src="\.\/js\/card\.js\?v=bbbb2222"/);
        assert.match(stamped, /src="https:\/\/cdn\.example\/other\.js"/);
    });

    it("maps every module to its version in the import map, keeping the other imports", () => {
        const json = stampPage(PAGE, VERSIONS).match(/<script type="importmap">([\s\S]*?)<\/script>/)[1];
        assert.deepEqual(JSON.parse(json).imports, {
            "three": "https://cdn.example/three.js",
            "./js/card.js": "./js/card.js?v=bbbb2222",
            "./js/shared/helper.js": "./js/shared/helper.js?v=cccc3333",
        });
    });

    it("stamps a style's pictures, and leaves other references alone", () => {
        const versions = new Map([["./img/bridge/water.svg", "dddd4444"]]);
        const css = 'a { background: url("../img/bridge/water.svg?v=00000000"), url("../img/other.svg"), url("https://cdn.example/x.svg"); }';
        assert.equal(stampStyle(css, versions),
            'a { background: url("../img/bridge/water.svg?v=dddd4444"), url("../img/other.svg"), url("https://cdn.example/x.svg"); }');
    });

    it("stamps the page's pictures", () => {
        const versions = new Map([["./img/logo.svg", "eeee5555"]]);
        assert.equal(stampPage('<img src="./img/logo.svg" />', versions), '<img src="./img/logo.svg?v=eeee5555" />');
    });

    it("gives scripts each picture's version, and leaves other paths alone", async () => {
        const versions = new Map([["./img/car.svg", "ffff6666"], ["./js/card.js", "bbbb2222"]]);
        const source = pictureVersionsModule(versions);
        assert.doesNotMatch(source, /card\.js/);
        const { versioned } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
        assert.equal(versioned("./img/car.svg"), "./img/car.svg?v=ffff6666");
        assert.equal(versioned("../img/car.svg"), "../img/car.svg");
    });

    it("is stamped with the current version of every file (run `npm run stamp` after changing one)", () => {
        const versions = assetVersions();
        const pictureVersions = readFileSync(new URL("../js/shared/picture-versions.js", import.meta.url), "utf8");
        assert.equal(pictureVersionsModule(versions), pictureVersions, "js/shared/picture-versions.js is not current");
        for (const style of styleFiles()) {
            const css = readFileSync(new URL(`../${style}`, import.meta.url), "utf8");
            assert.equal(stampStyle(css, versions), css, `${style} is not stamped`);
        }
        const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
        assert.equal(stampPage(page, versions), page, "index.html is not stamped");
    });
});

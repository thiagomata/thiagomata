import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { assetVersions, contentVersion, stampPage } from "../tools/version-assets.js";

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

    it("is stamped with the current version of every file (run `npm run stamp` after changing one)", () => {
        const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
        assert.equal(stampPage(page, assetVersions()), page);
    });
});

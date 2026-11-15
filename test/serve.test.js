import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { siteServer } from "../tools/serve.js";

describe("the local server", () => {
    let server, base;
    before(async () => {
        server = siteServer();
        await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
        base = `http://127.0.0.1:${server.address().port}`;
    });
    after(() => server.close());

    it("serves a folder's index.html, and redirects the folder without its slash", async () => {
        const page = await fetch(`${base}/wap/`);
        assert.equal(page.status, 200);
        assert.match(page.headers.get("content-type"), /^text\/html/);
        assert.equal(page.headers.get("cache-control"), "no-store");
        const bare = await fetch(`${base}/wap`, { redirect: "manual" });
        assert.equal(bare.status, 301);
        assert.equal(bare.headers.get("location"), "/wap/");
    });

    it("gives the deck and the voices their types", async () => {
        assert.equal((await fetch(`${base}/index.wml`)).headers.get("content-type"), "text/vnd.wap.wml");
        assert.equal((await fetch(`${base}/wap/voice/rick-0.mp3`)).headers.get("content-type"), "audio/mpeg");
    });

    it("answers a bad address, a missing file and a way out of the site, and keeps serving", async () => {
        assert.equal((await fetch(`${base}/wap/%ZZ`)).status, 400);
        assert.equal((await fetch(`${base}/nope.html`)).status, 404);
        assert.equal((await fetch(`${base}/..%2f..%2fetc/passwd`)).status, 404);
        assert.equal((await fetch(`${base}/`)).status, 200);
    });
});

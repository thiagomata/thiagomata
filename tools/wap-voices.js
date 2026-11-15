// Records the WAP phone's calls as MP3s. Every spoken line lives in wap/index.html, in the
// <script type="application/json" id="voice-lines"> block: one entry per caller, with the eSpeak NG
// voice that says it and respellings for names it gets wrong ("pronounce"). Usage:
//
//   npm run wap:voices   (or: node tools/wap-voices.js)
//
// renders each line to wap/voice/<caller>-<n>.mp3 (eSpeak NG, then lame) and removes recordings no
// longer in the block. The encoder's output differs run to run, so wap/voice/manifest.json keeps a
// key of what each file says, and only lines whose key changed are recorded again. Then run
// `npm run stamp`, so the page loads the new manifest. test/wap.test.js fails while a recording is
// stale. eSpeak NG is open source (GPL-3.0); its output carries no licence restrictions.
//
// Needs: Node, and the espeak-ng and lame commands
// (macOS: brew install espeak-ng lame; Debian/Ubuntu: apt install espeak-ng lame).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pronounce } from "../wap/phone.js";

const PAGE = fileURLToPath(new URL("../wap/index.html", import.meta.url));
const OUT = fileURLToPath(new URL("../wap/voice/", import.meta.url));
const MANIFEST = join(OUT, "manifest.json");

/** Every caller's voice and lines, from the page's voice-lines block. */
export function voiceLines(html) {
    const block = html.match(/<script type="application\/json" id="voice-lines">([\s\S]*?)<\/script>/);
    if (!block) throw new Error("No voice-lines block in the page");
    return JSON.parse(block[1]);
}

/** A line as eSpeak should say it: with the caller's respellings ("Thiago" -> "Cheeahgo"). */
export const spoken = (voice, text) => pronounce(voice.pronounce, text);

/** What a recording says, as a short key: it changes when the voice or the words do. */
export const recordingKey = (voice, text) =>
    createHash("sha256").update(`${voice.espeak}\n${spoken(voice, text)}`).digest("hex").slice(0, 16);

/** Each recording's file name and key, for every line in the page. */
export function manifest(voices) {
    const entries = Object.entries(voices).flatMap(([caller, voice]) =>
        voice.lines.map((text, n) => [`${caller}-${n}.mp3`, recordingKey(voice, text)]));
    return Object.fromEntries(entries.sort(([a], [b]) => (a < b ? -1 : 1)));
}

function run(command, args) {
    const result = spawnSync(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr}`);
}

// mono, 22 kHz, 48 kbps: phone quality, ~10 KB a line
function record(voice, text, mp3, dir) {
    const wav = join(dir, "line.wav");
    run("espeak-ng", ["-v", ...voice.espeak.split(/\s+/), "-w", wav, spoken(voice, text)]);
    run("lame", ["--quiet", "-m", "m", "-b", "48", "--resample", "22.05", wav, mp3]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const missing = ["espeak-ng", "lame"].filter(command => spawnSync(command, ["--help"]).error);
    if (missing.length) {
        console.error(`Missing ${missing.join(", ")}: see "Needs" at the top of tools/wap-voices.js`);
        process.exit(1);
    }
    mkdirSync(OUT, { recursive: true });
    const old = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
    const voices = voiceLines(readFileSync(PAGE, "utf8"));
    const wanted = manifest(voices);
    const dir = mkdtempSync(join(tmpdir(), "voice-"));
    let recorded = 0;
    try {
        for (const [caller, voice] of Object.entries(voices)) {
            voice.lines.forEach((text, n) => {
                const name = `${caller}-${n}.mp3`;
                if (old[name] === wanted[name] && existsSync(join(OUT, name))) return;
                record(voice, text, join(OUT, name), dir);
                recorded++;
                console.log(`  ${name.padEnd(16)} ${text}`);
            });
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
    for (const name of readdirSync(OUT)) {
        if (name.endsWith(".mp3") && !(name in wanted)) {
            unlinkSync(join(OUT, name));
            console.log(`  removed ${name}`);
        }
    }
    writeFileSync(MANIFEST, JSON.stringify(wanted, null, 2) + "\n");
    console.log(`OK: ${Object.keys(wanted).length} recordings in ${OUT} (${recorded} recorded, the rest unchanged)`);
}

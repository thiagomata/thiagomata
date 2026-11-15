#!/usr/bin/env python3
"""
gen_voice.py - record the WAP emulator's phone calls as MP3s.

The spoken lines live in wap/index.html, in the
<script type="application/json" id="voice-lines"> block: one entry per
caller, with the eSpeak NG voice that says them and respellings for
names it gets wrong ("pronounce"). Run:

    python3 tools/gen_voice.py

It renders every line to wap/voice/<caller>-<n>.mp3 (eSpeak NG ->
lame) and removes recordings no longer in the block. The encoder's
output differs run to run, so voice/manifest.json remembers what each
file says and lines that have not changed are not recorded again. eSpeak NG is open
source (GPL-3.0); its output carries no licence restrictions.

Needs: brew install espeak-ng lame
"""
import hashlib
import json
import os
import re
import shlex
import subprocess
import tempfile

WAP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "wap")
PAGE = os.path.join(WAP, "index.html")
OUT = os.path.join(WAP, "voice")
MANIFEST = os.path.join(OUT, "manifest.json")


def voice_lines():
    html = open(PAGE, encoding="utf-8").read()
    m = re.search(r'<script type="application/json" id="voice-lines">(.*?)</script>', html, re.S)
    if not m:
        raise SystemExit("voice-lines block not found in " + PAGE)
    return json.loads(m.group(1))


def record(espeak, text, mp3):
    with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
        subprocess.run(["espeak-ng", "-v", *shlex.split(espeak), "-w", wav.name, text], check=True)
        # mono, 22 kHz, 48 kbps: phone quality, ~10 KB per line
        subprocess.run(["lame", "--quiet", "-m", "m", "-b", "48", "--resample", "22.05",
                        wav.name, mp3], check=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    try:
        old = json.load(open(MANIFEST, encoding="utf-8"))
    except FileNotFoundError:
        old = {}
    manifest = {}
    recorded = 0
    for caller, v in voice_lines().items():
        for n, text in enumerate(v["lines"]):
            name = f"{caller}-{n}.mp3"
            spoken = text
            for word, sound in v.get("pronounce", {}).items():
                spoken = spoken.replace(word, sound)
            key = hashlib.sha256(f"{v['espeak']}\n{spoken}".encode()).hexdigest()[:16]
            manifest[name] = key
            if old.get(name) == key and os.path.exists(os.path.join(OUT, name)):
                continue
            record(v["espeak"], spoken, os.path.join(OUT, name))
            recorded += 1
            print(f"  {name:16} {text}")
    wanted = set(manifest)

    for name in sorted(os.listdir(OUT)):
        if name.endswith(".mp3") and name not in wanted:
            os.remove(os.path.join(OUT, name))
            print(f"  removed {name}")

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)
        f.write("\n")
    print(f"OK: {len(wanted)} recordings in {OUT} ({recorded} recorded, the rest unchanged)")


if __name__ == "__main__":
    main()

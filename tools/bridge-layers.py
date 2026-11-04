"""Builds the bridge card's layers from the design's exports in img/bridge/.

The design exports each layer on the frame's opaque white background, and the bridge one taller
than the others. This makes them stack: back to front, background, water and bridge rebuild the
whole picture (img/bridge/combined.svg). The background (background-only.svg) is used as
exported.

    water.svg            the water and the reflections, on a transparent background
    water-animated.svg   the same, rippling: one filter over the whole layer
    bridge.svg           the bridge, on a transparent background, cropped to the frame

Usage: python3 tools/bridge-layers.py
"""
import re
from pathlib import Path

FOLDER = Path(__file__).resolve().parent.parent / "img" / "bridge"
WIDTH, HEIGHT = 2174, 1781
CREDIT = "<!--\ncreated by thiago.henrique.mata@gmail.com\n-->\n"

# The frame's white background, the first shape of every export.
WHITE_BACKGROUND = re.compile(
    r'<path transform="matrix\(1 0 0 1 0 0\)" d="M0 0L2174 0L2174 \d+L0 \d+Z" fill="#FFFFFF"\s*/>')
SVG_SIZE = re.compile(r'<svg width="\d+" height="\d+" viewBox="0 0 \d+ \d+"')

# The water starts at the shore, this far down the frame.
WATER_TOP = 1080
# The ripple: a band of noise that tiles the water and slides down by exactly one band per cycle,
# so the loop never jumps. It only pushes the reflections sideways, like wind on the water.
RIPPLE_BAND_HEIGHT = 300
# Sliding the bands down leaves an empty strip, up to one band tall, at the top of the filter: the
# filter starts one band above the water, so that strip never reaches the reflections.
RIPPLE_TOP = WATER_TOP - RIPPLE_BAND_HEIGHT
RIPPLE = f"""<filter id="ripple" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="{RIPPLE_TOP}" width="{WIDTH}" height="{HEIGHT - RIPPLE_TOP}">
    <feTurbulence type="fractalNoise" baseFrequency="0.004 0.03" numOctaves="2" seed="4" stitchTiles="stitch" x="0" y="{RIPPLE_TOP}" width="{WIDTH}" height="{RIPPLE_BAND_HEIGHT}" result="band" />
    <feTile in="band" result="noise" />
    <feOffset in="noise" dx="0" result="sliding">
        <animate attributeName="dy" from="0" to="{RIPPLE_BAND_HEIGHT}" dur="6s" repeatCount="indefinite" />
    </feOffset>
    <feColorMatrix in="sliding" type="matrix" result="sideways" values="1 0 0 0 0  0 0 0 0 0.5  0 0 1 0 0  0 0 0 0 1" />
    <feDisplacementMap in="SourceGraphic" in2="sideways" scale="10" xChannelSelector="R" yChannelSelector="G" />
</filter>"""
STILL_WHEN_REDUCED_MOTION = "<style>@media (prefers-reduced-motion: reduce) { .ripple { filter: none; } }</style>"


def read(name):
    return (FOLDER / name).read_text()


def write(name, svg):
    (FOLDER / name).write_text(CREDIT + svg)


def transparent(svg):
    """The layer without the frame's white background, at the frame's size."""
    svg, removed = WHITE_BACKGROUND.subn("", svg, count=1)
    assert removed == 1, "no white background found"
    return SVG_SIZE.sub(f'<svg width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}"', svg, count=1)


def rippling(svg):
    """The layer with its content wrapped in one ripple filter."""
    opening = re.search(r"<svg[^>]*>", svg).end()
    defs = svg.rindex("<defs>")
    content = svg[opening:defs]
    return (svg[:opening] + STILL_WHEN_REDUCED_MOTION + '<g class="ripple" filter="url(#ripple)">' + content
            + "</g><defs>" + RIPPLE + svg[defs + len("<defs>"):])


def main():
    water = transparent(read("water-only.svg"))
    write("water.svg", water)
    write("water-animated.svg", rippling(water))
    write("bridge.svg", transparent(read("bridge-only.svg")))


if __name__ == "__main__":
    main()

"""Shrinks an SVG whose drawing repeats the same shapes at different places (like grass tufts).

Each flat-coloured path is rewritten relative to its own starting point, so every copy of the same
shape becomes the same text. Each distinct shape is then defined once in <defs>, and every copy
becomes a short <use> placed at its position, keeping its own colour and other attributes.

Then whole groups repeat too (a tuft of blades drawn many times): runs of copies that follow each
other in the drawing with the same shapes, colours and spacing are defined once as a group, and
each repeat becomes a single <use>. Groups never change the drawing order.

Usage: python3 tools/dedupe-svg-paths.py input.svg output.svg
Only paths with absolute commands (M L H V C S Q T Z) and no url(...) reference are rewritten:
gradients, masks and clips are positioned in the picture's coordinates, so moving a shape that
uses one would move it out of place. Anything else is left as is.
"""
import re
import sys
import xml.etree.ElementTree as ET

NS = "http://www.w3.org/2000/svg"
XLINK = "http://www.w3.org/1999/xlink"
TOKEN = re.compile(r"[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?")
ARGUMENTS = {"M": 2, "L": 2, "H": 1, "V": 1, "C": 6, "S": 4, "Q": 4, "T": 2, "Z": 0}
PRECISION = 2       # decimals kept; copies exported at slightly different offsets still match


def number(value):
    text = f"{value:.{PRECISION}f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def relative_to_start(d):
    """The path moved so it starts at (0, 0), and that start; None if it cannot be rewritten."""
    tokens = TOKEN.findall(d)
    if any(token.isalpha() and token not in ARGUMENTS for token in tokens):
        return None
    out, start, command, i = [], None, None, 0
    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            out.append(command)
            i += 1
            if command == "Z":
                continue
        count = ARGUMENTS[command]
        values = [float(v) for v in tokens[i:i + count]]
        i += count
        if start is None:
            start = (values[0], values[1])
        if command == "H":
            values = [values[0] - start[0]]
        elif command == "V":
            values = [values[0] - start[1]]
        else:
            values = [v - start[k % 2] for k, v in enumerate(values)]
        out.extend(number(v) for v in values)
    return " ".join(out), start


LONGEST_GROUP, SHORTEST_GROUP = 12, 2


def group_repeats(root, defs):
    """Replaces repeated runs of consecutive copies with one <use> of a group defined once."""
    use_tag = f"{{{NS}}}use"

    def key(element):
        attributes = {k: v for k, v in element.attrib.items() if k not in ("x", "y")}
        return tuple(sorted(attributes.items()))

    def run_at(children, start, length):
        """The run's layout (shapes and offsets from its first copy), or None if not all copies."""
        window = children[start:start + length]
        if len(window) < length or any(element.tag != use_tag for element in window):
            return None
        x0, y0 = float(window[0].get("x")), float(window[0].get("y"))
        return tuple((key(e), number(float(e.get("x")) - x0), number(float(e.get("y")) - y0)) for e in window)

    groups = 0
    for length in range(LONGEST_GROUP, SHORTEST_GROUP - 1, -1):
        children = list(root)
        counts = {}
        for start in range(len(children)):
            layout = run_at(children, start, length)
            if layout:
                counts[layout] = counts.get(layout, 0) + 1
        group_ids = {}
        start = 0
        while start < len(children):
            layout = run_at(children, start, length)
            if not layout or counts.get(layout, 0) < 2:
                start += 1
                continue
            if layout not in group_ids:
                group_ids[layout] = f"group-{length}-{len(group_ids)}"
                definition = ET.SubElement(defs, f"{{{NS}}}g", {"id": group_ids[layout]})
                for attributes, dx, dy in layout:
                    ET.SubElement(definition, use_tag, {**dict(attributes), "x": dx, "y": dy})
            window = children[start:start + length]
            replacement = ET.Element(use_tag, {
                "href": f"#{group_ids[layout]}", "x": window[0].get("x"), "y": window[0].get("y"),
            })
            replacement.tail = window[-1].tail
            position = list(root).index(window[0])
            for element in window:
                root.remove(element)
            root.insert(position, replacement)
            start += length
        groups += len(group_ids)
    return groups


def main(source, target):
    ET.register_namespace("", NS)
    ET.register_namespace("xlink", XLINK)
    # Keep comments: illustrations carry their author's credit in one, before the <svg> element,
    # where the XML library would drop it.
    text = open(source, encoding="utf-8").read()
    leading_comments = re.match(r"(\s*<!--.*?-->)*", text, re.S).group(0).strip()
    tree = ET.ElementTree(ET.fromstring(text, parser=ET.XMLParser(target=ET.TreeBuilder(insert_comments=True))))
    root = tree.getroot()
    defs = root.find(f"{{{NS}}}defs")
    if defs is None:
        defs = ET.Element(f"{{{NS}}}defs")
        root.insert(0, defs)

    shape_ids = {}
    for index, child in enumerate(list(root)):
        if child.tag != f"{{{NS}}}path" or not child.get("d"):
            continue
        if any("url(" in value for value in child.attrib.values()):
            continue
        rewritten = relative_to_start(child.get("d"))
        if rewritten is None:
            continue
        shape, (x, y) = rewritten
        if shape not in shape_ids:
            shape_ids[shape] = f"shape-{len(shape_ids)}"
            ET.SubElement(defs, f"{{{NS}}}path", {"id": shape_ids[shape], "d": shape})
        copy = ET.Element(f"{{{NS}}}use", {k: v for k, v in child.attrib.items() if k != "d"})
        copy.set("href", f"#{shape_ids[shape]}")
        copy.set("x", number(x))
        copy.set("y", number(y))
        copy.tail = child.tail
        root.remove(child)
        root.insert(index, copy)
    groups = group_repeats(root, defs)
    with open(target, "w", encoding="utf-8") as output:
        if leading_comments:
            output.write(leading_comments + "\n")
        tree.write(output, encoding="unicode", xml_declaration=False)
    print(f"{len(shape_ids)} distinct shapes, {groups} repeated groups")


if __name__ == "__main__":
    main(*sys.argv[1:3])

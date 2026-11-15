#!/usr/bin/env python3
"""
gen_index_wml.py - single source of truth for the WAP edition deck.

Edit the ASCII art below in plain text (spaces, backslashes, whatever).
Run:

    python3 tools/gen_index_wml.py

It regenerates index.wml at the site root (entity-escaped, valid WML 1.1)
and validates it. Preview with wap/ (the emulator) served by
tools/serve.py.
"""
import xml.etree.ElementTree as ET

OUT = "/Users/thiagomata/github/thiagomata/thiagomata/index.wml"


def esc(lines):
    """ASCII art lines -> WML run: spaces become &#160;, lines joined by <br/>."""
    return "<br/>".join(
        l.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
         .replace(" ", "&#160;")
        for l in lines
    )


# ----------------------------------------------------------------------------
# LOGOS - edit these in plain ASCII, run the script, done.
# ----------------------------------------------------------------------------

ART = {
    "macquarie": [
        r'  .-"""-.  ',
        r' /  ___  \ ',
        r'|  /   \  |',
        r'|  \___/  |',
        r' \       / ',
        r"  '-...-'   ",
        r" MACQUARIE  ",
    ],
    "rokt": [
        r"  ____   ___  _  _______ ",
        r" |  _ \ / _ \| |/ /_   _|",
        r" | |_) | | | | ' /  | |  ",
        r" |  _ <| |_| | . \  | |  ",
        r" |_| \_\\___/|_|\_\ |_|  ",
    ],
    "sli": [
        r"   ____  __    __      ____  _  _  ____  ____  ____  _  _  ____ ",
        r"  / ___)(  )  (  )___ / ___)( \/ )/ ___)(_  _)(  __)( \/ )/ ___)",
        r"  \___ \/ (_/\ )((___)\___ \ )  / \___ \  )(   ) _) / \/ \\___ \ ",
        r"  (____/\____/(__)    (____/(__/  (____/ (__) (____)\_)(_/(____/",
    ],
    "ideia": [
        r" __   _______   _______     ___      ",
        r"|  | |       \ |   ____|   /   \     ",
        r"|  | |  .--.  ||  |__     /  ^  \    ",
        r"|  | |  |  |  ||   __|   /  /_\  \   ",
        r"|  | |  '--'  ||  |____ /  _____  \  ",
        r"|__| |_______/ |_______/__/     \__\ ",
    ],
    "otimicar": [
        r".  ____  __  _           _",
        r"  / __ \/ /_(_)___ ___  (_)________ ______",
        r" / / / / __/ / __ `__ \/ / ___/ __ `/ ___/",
        r"/ /_/ / /_/ / / / / / / / /__/ /_/ / /",
        r"\____/\__/_/_/ /_/ /_/_/\___/\__,_/_/",
    ],
    "inep": [
        r"░▒▓█▓▒░▒▓███████▓▒░░▒▓████████▓▒░▒▓███████▓▒░  ",
        r"░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░ ",
        r"                                               ",
        r"░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓██████▓▒░ ░▒▓███████▓▒░  ",
        r"░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        ",
        r"░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        ",
        r"░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░▒▓█▓▒░        ",
    ],
    "useful": [
        r"  ,-.  ,-.  ",
        r" /    v    \ ",
        r"'=|======|='",
    ],
    "reliable": [
        r"  ,---. ",
        r" /     \ ",
        r" |-----| ",
        r" |  #  | ",
        r" '-----' ",
    ],
    "elegant": [
        r" .  *  . ",
        r"  * + *  ",
        r" .  *  . ",
    ],
    "thrifty": [
        r"  ,----.  ",
        r" (  $$  ) ",
        r"  `----'  ",
    ],
}

# ----------------------------------------------------------------------------
# Deck content (art keys mark where a logo block is inserted)
# ----------------------------------------------------------------------------

CARDS = [
    ("home", "Thiago Mata", "About", "#about", None, [
        "THIAGO MATA", "Technology Leader", "Sydney, Australia", "",
        ("link", "About me", "#about"),
        ("link", "Experience", "#experience"),
        ("link", "Research", "#research"),
        ("link", "Projects", "#projects"),
        ("link", "Values", "#values"),
        ("link", "Contact", "#contact"),
        "",
        ("link", "Full site", "https://thiagomata.com"),
    ]),
    ("about", "About", "Exp.", "#experience", None, [
        "Connects engineering to business outcomes.", "",
        "Twenty years across startups, ad-tech at billions of transactions, and regulated banking.", "",
        "Favouring clarity over cleverness, reliability over novelty.",
    ]),
    ("experience", "Experience", "Resch", "#research", None, [
        "EXPERIENCE 2003-NOW", "",
        ("link", "Macquarie Bank 24-", "#macquarie"),
        ("link", "Rokt 19-24", "#rokt"),
        ("link", "SLI Systems 17-19", "#sli"),
        ("link", "Ideia 14-17", "#ideia"),
        ("link", "Otimicar 13-14", "#otimicar"),
        ("link", "INEP 03-13", "#inep"),
    ]),
    ("macquarie", "Macquarie", "Rokt", "#rokt", "macquarie", [
        "", "Senior Manager", "2024-Present", "",
        "Leads a new team delivering banking products, cutting production incidents through testing, observability and graceful degradation.", "",
        ("link", "Term Deposits", "#deposits"),
    ]),
    ("rokt", "Rokt", "SLI", "#sli", "rokt", [
        "", "Senior Software Eng.", "2019-2024", "",
        "Led bot detection on the critical path of all traffic. Built the identity and attribution systems of a platform processing billions of transactions.", "",
        ("link", "Identity", "#identity"),
        ("link", "Attribution", "#attribution"),
        ("link", "Bot Detection", "#bots"),
    ]),
    ("sli", "SLI Systems", "Ideia", "#ideia", "sli", [
        "", "Senior Data Engineer", "2017-2019", "",
        "Migrated core data services to Google Cloud, making them faster and cheaper, strengthening the company position in its acquisition.", "",
        ("link", "To the Cloud", "#cloud"),
    ]),
    ("ideia", "Ideia", "Otimi", "#otimicar", "ideia", [
        "", "CTO", "2014-2017", "",
        "Hired and led engineering across three offices in three states, from concept to first production products. Created the career ladder for the merger with Pinion.", "",
        ("link", "Alexandria", "#alexandria"),
    ]),
    ("otimicar", "Otimicar", "INEP", "#inep", "otimicar", [
        "", "Co-Founder", "2013-2014", "",
        "Built the first server for a device that turns any car into a smart car.", "",
        ("link", "Data Sharing", "#datasync"),
    ]),
    ("inep", "MEC / INEP", "Resch", "#research", "inep", [
        "", "MEC / INEP", "2003-2013", "",
        "INEP and Ministry of Education: high availability public systems E-MEC and Revalida. Bancoob: credit portfolio transfers. Taught web development for six years.", "",
        ("link", "Education as Platform", "#education"),
    ]),
    ("research", "Research", "Proj.", "#projects", None, [
        "FORMAL VERIFICATION", "",
        "Machine-checked proofs showing software is correct rather than only tested.", "",
        ("link", "Euclid Theorem", "https://doi.org/10.5281/zenodo.22929219"),
        ("link", "Sieve Stages", "https://doi.org/10.5281/zenodo.22955781"),
        ("link", "2-Gaps", "https://doi.org/10.5281/zenodo.22955785"),
        ("link", "All articles", "https://github.com/thiagomata/prime-numbers"),
    ]),
    ("projects", "Projects", "Values", "#values", None, [
        "PROJECTS", "",
        ("link", "Perceptions of Probability", "https://github.com/thiagomata/perceptions-of-probability"),
        "estimating with ranges, not numbers", "",
        ("link", "Parallax Engine", "https://github.com/thiagomata/parallax"),
        "testable 3D scenes, head tracking", "",
        ("link", "Courses", "https://github.com/thiagomata/courses-and-certifications"),
    ]),
    ("values", "Values", "Useful", "#useful", None, [
        "FOUR VALUES", "",
        ("link", "1. Useful", "#useful"),
        ("link", "2. Reliable", "#reliable"),
        ("link", "3. Elegant", "#elegant"),
        ("link", "4. Thrifty", "#thrifty"),
    ]),
    ("useful", "Useful", "Relia.", "#reliable", "useful", [
        "", "USEFUL", "Influential and meaningful", "",
        '"The largest source of waste is building a product no one will find useful." - Eric Ries', "",
        "Market fit, data decisions, impact forecast, risk, prototypes",
    ]),
    ("reliable", "Reliable", "Eleg.", "#elegant", "reliable", [
        "", "RELIABLE", "Steady and trustworthy", "",
        '"Whatever is worth doing at all, is worth doing well." - Stanhope', "",
        "Verified, resilient, progressive delivery, observability, degradation levels",
    ]),
    ("elegant", "Elegant", "Thrift", "#thrifty", "elegant", [
        "", "ELEGANT", "Straightforward but thorough", "",
        '"Everything should be made as simple as possible, but not simpler." - Einstein', "",
        "Simplicity, cleanliness, clarity, alignment, traceability",
    ]),
    ("thrifty", "Thrifty", "Contact", "#contact", "thrifty", [
        "", "THRIFTY", "Budget-conscious and efficient", "",
        '"A penny saved is a penny earned." - Franklin', "",
        "Thoroughness, resource optimization, efficiency, business impact, adaptability",
    ]),
    ("contact", "Contact", "Home", "#home", None, [
        "CONTACT", "",
        ("link", "thiagomata.com", "https://thiagomata.com"),
        ("link", "One-page CV", "https://thiagomata.com/one-page-cv.html"),
        ("link", "Detailed CV", "https://thiagomata.com/detailed-cv.html"),
        ("link", "LinkedIn", "https://www.linkedin.com/in/thiagomata/"),
        ("link", "ORCID", "https://orcid.org/0009-0002-7366-939X"),
        ("link", "GitHub", "https://github.com/thiagomata"),
        ("link", "Email me", "mailto:thiago.henrique.mata@gmail.com"),
        "",
        "WAP edition 1.2", "Sydney, Australia",
    ]),
]


# ----------------------------------------------------------------------------
# Case studies: one short card per case, condensed from cases/*.md, each
# linking out to the full page. Listed after CARDS so the emulator files
# them under the job card that links to them (#experience/rokt/identity).
FULL = "https://thiagomata.com/cases/"
CASES = [
    ("deposits", "Term Deposits", "Mcq.", "#macquarie", None, [
        "TERM DEPOSITS", "Macquarie Bank", "",
        "Account opening, from days to minutes.", "",
        "A cross-team effort replacing a slow, bureaucratic process with a lean digital journey.", "",
        "Change managed through evidence: A/B tests, feature flags, live old-vs-new comparisons and reconciliation reports.", "",
        "An end-to-end scenario tool, local testing, CI/CD and load tests made quality part of delivery.", "",
        "Result: no incidents related to the change.", "",
        ("link", "Full case", FULL + "macquarie-term-deposits.html"),
    ]),
    ("identity", "Identity", "Rokt", "#rokt", None, [
        "IDENTITY", "Rokt", "",
        "Connecting touchpoints and devices to one customer through a multi-hop identity graph, with privacy, data residency and client isolation.", "",
        "Result: real-time identification in a fraction of the time and resources, open to new identifiers and strategies.", "",
        "Scala, Spark, Kafka, AWS Neptune", "",
        ("link", "Attribution", "#attribution"),
        ("link", "Bot Detection", "#bots"),
        ("link", "Full case", FULL + "rokt-identity.html"),
    ]),
    ("attribution", "Attribution", "Rokt", "#rokt", None, [
        "ATTRIBUTION", "Rokt", "",
        "Matching campaign events to outcomes with per-campaign rules, consistent and explainable.", "",
        "Result: matches in a fraction of the time and resources, rules that change on the fly, and ML models that optimise campaigns faster.", "",
        "Scala, Spark, Kafka, HBase", "",
        ("link", "Identity", "#identity"),
        ("link", "Bot Detection", "#bots"),
        ("link", "Full case", FULL + "rokt-attribution.html"),
    ]),
    ("bots", "Bot Detection", "Rokt", "#rokt", None, [
        "BOT DETECTION", "Rokt", "",
        "Screening every public request in real time, blocking malicious bots that create fake transactions.", "",
        "Every decision explained for audit; a rule engine measures new rules before they reach customers.", "",
        "Go, Istio, Envoy, WASM, Kubernetes, Kafka", "",
        ("link", "Identity", "#identity"),
        ("link", "Attribution", "#attribution"),
        ("link", "Full case", FULL + "rokt-bot-detection.html"),
    ]),
    ("cloud", "To the Cloud", "SLI", "#sli", None, [
        "TO THE CLOUD", "SLI Systems", "",
        "Rewrote AI services from Apache Spark to Apache Beam on Google Dataflow, keeping data consistent across both platforms during the move.", "",
        "Result: faster, cheaper services that scale on demand and strengthened the company in its acquisition.", "",
        "Beam, Dataflow, BigQuery, Pub/Sub", "",
        ("link", "Full case", FULL + "sli-to-the-cloud.html"),
    ]),
    ("alexandria", "Alexandria", "Ideia", "#ideia", None, [
        "ALEXANDRIA", "Ideia", "",
        "Turned an internal reporting tool into a self-service platform: clients upload files, query their databases and find insights themselves.", "",
        "Result: less dependence on the technical team, and a foundation to serve more clients.", "",
        "PHP, Python, Scala, Spark, PostgreSQL", "",
        ("link", "Full case", FULL + "ideia-alexandria.html"),
    ]),
    ("datasync", "Data Sharing", "Otimi", "#otimicar", None, [
        "DATA SHARING", "Otimicar", "",
        "Server for a device that makes any car smart: compares each car with similar models and recommends services and maintenance.", "",
        "Integrated workshops, car stores and insurers that shared no common data standard.", "",
        "Result: working integrations that boosted investor confidence.", "",
        "Java, REST, SOAP, gRPC, MongoDB", "",
        ("link", "Full case", FULL + "otimicar-data-sync.html"),
    ]),
    ("education", "Education", "INEP", "#inep", None, [
        "EDUCATION AS PLATFORM", "MEC / INEP", "",
        "Services for millions of students, schools and universities, monitoring financial transactions that reach millions per day.", "",
        "Built E-MEC (accreditation of every university), Revalida (foreign medical diplomas) and SISTEC (technical courses).", "",
        "PHP, Java, Oracle, Postgres", "",
        ("link", "Full case", FULL + "mec-education-platform.html"),
    ]),
]


def render_card(cid, title, accept_label, accept_href, art_key, items):
    parts = [
        f'  <card id="{cid}" title="{title}">',
        f'    <do type="accept" label="{accept_label}">',
        f'      <go href="{accept_href}"/>',
        '    </do>',
    ]

    # Art goes in its own <p mode="nowrap"> so wide logos scroll
    # sideways instead of breaking at "/" or ")" mid-row.
    def art(key):
        parts.append('    <p mode="nowrap">')
        parts.append('      ' + esc(ART[key]) + '<br/>')
        parts.append('    </p>')

    if art_key:
        art(art_key)
    parts.append('    <p>')
    for it in items:
        if it == "":
            parts.append('      <br/>')
        elif isinstance(it, tuple):
            parts.append(f'      <a href="{it[2]}">{it[1]}</a><br/>')
        elif it.startswith("@art:"):
            parts.append('    </p>')
            art(it[5:])
            parts.append('    <p>')
        else:
            parts.append('      ' + it + '<br/>')
    parts += ['    </p>', '  </card>']
    return "\n".join(parts)


def main():
    cards_xml = "\n\n".join(render_card(*c) for c in CARDS + CASES)
    wml = f'''<?xml version="1.0"?>
<!DOCTYPE wml PUBLIC "-//WAPFORUM//DTD WML 1.1//EN" "http://www.wapforum.org/DTD/wml_1.1.xml">
<!--
  index.wml - the thiagomata.com WAP edition.
  GENERATED by gen_index_wml.py - edit that file, not this one.
  Logos are ASCII art with &#160; entities, the authentic way
  to keep art aligned in WML.
-->
<wml>
  <head>
    <meta name="author" content="Thiago Mata"/>
    <meta name="description" content="Thiago Mata - Technology Leader - WAP edition"/>
  </head>

  <template>
    <do type="prev" label="Back">
      <prev/>
    </do>
  </template>

{cards_xml}
</wml>
'''
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(wml)

    # validate before declaring success
    tree = ET.parse(OUT)
    n = len(tree.getroot().findall("card"))
    ids = {c.get("id") for c in tree.getroot().findall("card")}
    for c in tree.getroot().findall("card"):
        for a in c.iter("a"):
            h = a.get("href") or ""
            if h.startswith("#") and h[1:] not in ids:
                raise SystemExit(f"BROKEN LINK: {h} on card {c.get('id')}")
        for g in c.iter("go"):
            h = g.get("href") or ""
            if h.startswith("#") and h[1:] not in ids:
                raise SystemExit(f"BROKEN LINK: {h} on card {c.get('id')}")

    print(f"OK: {OUT} written, {n} cards, XML valid, all links resolve")


if __name__ == "__main__":
    main()

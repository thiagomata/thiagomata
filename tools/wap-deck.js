// The WAP edition's deck, index.wml: its cards, written here, and the WML they become. Usage:
//
//   npm run wap:deck   (or: node tools/wap-deck.js [out])
//
// writes index.wml at the site root, or at out, as valid WML 1.1 with every #link resolving to a
// card, then `npm run stamp` so the WAP page loads the new deck. test/wap.test.js fails while
// index.wml is not what this makes. The logos are text art: edit them as they look.
//
// Needs: Node, and its dev dependencies (npm install), for @xmldom/xmldom.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DOMParser } from "@xmldom/xmldom";

const OUT = fileURLToPath(new URL("../index.wml", import.meta.url));
const FULL = "https://thiagomata.com/cases/";

/** A card: its id and title, its right soft key ([label, href]), an optional logo, and its lines. */
const card = (id, title, [label, href], art, items) => ({ id, title, label, href, art, items });
/** A link line on a card. */
const link = (text, href) => ({ text, href });

// ----------------------------------------------------------------------------
// LOGOS - text art (ASCII, and block characters for INEP), one line per string; trailing
// spaces keep the rows aligned.
// ----------------------------------------------------------------------------

const ART = {
    rokt: [
        String.raw`  ____   ___  _  _______ `,
        String.raw` |  _ \ / _ \| |/ /_   _|`,
        String.raw` | |_) | | | | ' /  | |  `,
        String.raw` |  _ <| |_| | . \  | |  `,
        String.raw` |_| \_\\___/|_|\_\ |_|  `,
    ],
    sli: [
        String.raw`   ____  __    __      ____  _  _  ____  ____  ____  _  _  ____ `,
        String.raw`  / ___)(  )  (  )___ / ___)( \/ )/ ___)(_  _)(  __)( \/ )/ ___)`,
        String.raw`  \___ \/ (_/\ )((___)\___ \ )  / \___ \  )(   ) _) / \/ \\___ \ `,
        String.raw`  (____/\____/(__)    (____/(__/  (____/ (__) (____)\_)(_/(____/`,
    ],
    ideia: [
        String.raw` __   _______   _______     ___      `,
        String.raw`|  | |       \ |   ____|   /   \     `,
        String.raw`|  | |  .--.  ||  |__     /  ^  \    `,
        String.raw`|  | |  |  |  ||   __|   /  /_\  \   `,
        String.raw`|  | |  '--'  ||  |____ /  _____  \  `,
        String.raw`|__| |_______/ |_______/__/     \__\ `,
    ],
    otimicar: [
        String.raw`.  ____  __  _           _`,
        String.raw`  / __ \/ /_(_)___ ___  (_)________ ______`,
        String.raw` / / / / __/ / __ ${"`"}__ \/ / ___/ __ ${"`"}/ ___/`,
        String.raw`/ /_/ / /_/ / / / / / / / /__/ /_/ / /`,
        String.raw`\____/\__/_/_/ /_/ /_/_/\___/\__,_/_/`,
    ],
    inep: [
        String.raw`░▒▓█▓▒░▒▓███████▓▒░░▒▓████████▓▒░▒▓███████▓▒░  `,
        String.raw`░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░ `,
        String.raw`                                               `,
        String.raw`░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓██████▓▒░ ░▒▓███████▓▒░  `,
        String.raw`░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        `,
        String.raw`░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        `,
        String.raw`░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░▒▓█▓▒░        `,
    ],
};

// ----------------------------------------------------------------------------
// Deck content: "" is a blank line.
// ----------------------------------------------------------------------------

const CARDS = [
    card("home", "Thiago Mata", ["About", "#about"], null, [
        "THIAGO MATA",
        "Technology Leader",
        "Sydney, Australia",
        "",
        link("About me", "#about"),
        link("Experience", "#experience"),
        link("Research", "#research"),
        link("Projects", "#projects"),
        link("Values", "#values"),
        link("Contact", "#contact"),
        "",
        link("Full site", "https://thiagomata.com"),
    ]),
    card("about", "About", ["Exp.", "#experience"], null, [
        "Connects engineering to business outcomes.",
        "",
        "Twenty years across startups, ad-tech at billions of transactions, and regulated banking.",
        "",
        "Favouring clarity over cleverness, reliability over novelty.",
    ]),
    card("experience", "Experience", ["Resch", "#research"], null, [
        "EXPERIENCE 2003-NOW",
        "",
        link("Macquarie Bank 24-", "#macquarie"),
        link("Rokt 19-24", "#rokt"),
        link("SLI Systems 17-19", "#sli"),
        link("Ideia 14-17", "#ideia"),
        link("Otimicar 13-14", "#otimicar"),
        link("INEP 03-13", "#inep"),
    ]),
    card("macquarie", "Macquarie", ["Rokt", "#rokt"], null, [
        "",
        "Senior Manager",
        "2024-Present",
        "",
        "Leads a new team delivering banking products, cutting production incidents through testing, observability and graceful degradation.",
        "",
        link("Term Deposits", "#deposits"),
    ]),
    card("rokt", "Rokt", ["SLI", "#sli"], "rokt", [
        "",
        "Senior Software Eng.",
        "2019-2024",
        "",
        "Led bot detection on the critical path of all traffic. Built the identity and attribution systems of a platform processing billions of transactions.",
        "",
        link("Identity", "#identity"),
        link("Attribution", "#attribution"),
        link("Bot Detection", "#bots"),
    ]),
    card("sli", "SLI Systems", ["Ideia", "#ideia"], "sli", [
        "",
        "Senior Data Engineer",
        "2017-2019",
        "",
        "Migrated core data services to Google Cloud, making them faster and cheaper, strengthening the company position in its acquisition.",
        "",
        link("To the Cloud", "#cloud"),
    ]),
    card("ideia", "Ideia", ["Otimi", "#otimicar"], "ideia", [
        "",
        "CTO",
        "2014-2017",
        "",
        "Hired and led engineering across three offices in three states, from concept to first production products. Created the career ladder for the merger with Pinion.",
        "",
        link("Alexandria", "#alexandria"),
    ]),
    card("otimicar", "Otimicar", ["INEP", "#inep"], "otimicar", [
        "",
        "Co-Founder",
        "2013-2014",
        "",
        "Built the first server for a device that turns any car into a smart car.",
        "",
        link("Data Sharing", "#datasync"),
    ]),
    card("inep", "MEC / INEP", ["Resch", "#research"], "inep", [
        "",
        "MEC / INEP",
        "2003-2013",
        "",
        "INEP and Ministry of Education: high availability public systems E-MEC and Revalida. Bancoob: credit portfolio transfers. Taught web development for six years.",
        "",
        link("Education as Platform", "#education"),
    ]),
    card("research", "Research", ["Proj.", "#projects"], null, [
        "FORMAL VERIFICATION",
        "",
        "Machine-checked proofs showing software is correct rather than only tested.",
        "",
        link("Euclid Theorem", "https://doi.org/10.5281/zenodo.22929219"),
        link("Sieve Stages", "https://doi.org/10.5281/zenodo.22955781"),
        link("2-Gaps", "https://doi.org/10.5281/zenodo.22955785"),
        link("All articles", "https://github.com/thiagomata/prime-numbers"),
    ]),
    card("projects", "Projects", ["Values", "#values"], null, [
        "PROJECTS",
        "",
        link("Perceptions of Probability", "https://github.com/thiagomata/perceptions-of-probability"),
        "estimating with ranges, not numbers",
        "",
        link("Parallax Engine", "https://github.com/thiagomata/parallax"),
        "testable 3D scenes, head tracking",
        "",
        link("Courses", "https://github.com/thiagomata/courses-and-certifications"),
    ]),
    card("values", "Values", ["Useful", "#useful"], null, [
        "FOUR VALUES",
        "",
        link("1. Useful", "#useful"),
        link("2. Reliable", "#reliable"),
        link("3. Elegant", "#elegant"),
        link("4. Thrifty", "#thrifty"),
    ]),
    card("useful", "Useful", ["Relia.", "#reliable"], null, [
        "",
        "USEFUL",
        "Influential and meaningful",
        "",
        "\"The largest source of waste is building a product no one will find useful.\" - Eric Ries",
        "",
        "Market fit, data decisions, impact forecast, risk, prototypes",
    ]),
    card("reliable", "Reliable", ["Eleg.", "#elegant"], null, [
        "",
        "RELIABLE",
        "Steady and trustworthy",
        "",
        "\"Whatever is worth doing at all, is worth doing well.\" - Stanhope",
        "",
        "Verified, resilient, progressive delivery, observability, degradation levels",
    ]),
    card("elegant", "Elegant", ["Thrift", "#thrifty"], null, [
        "",
        "ELEGANT",
        "Straightforward but thorough",
        "",
        "\"Everything should be made as simple as possible, but not simpler.\" - Einstein",
        "",
        "Simplicity, cleanliness, clarity, alignment, traceability",
    ]),
    card("thrifty", "Thrifty", ["Contact", "#contact"], null, [
        "",
        "THRIFTY",
        "Budget-conscious and efficient",
        "",
        "\"A penny saved is a penny earned.\" - Franklin",
        "",
        "Thoroughness, resource optimization, efficiency, business impact, adaptability",
    ]),
    card("contact", "Contact", ["Home", "#home"], null, [
        "CONTACT",
        "",
        link("thiagomata.com", "https://thiagomata.com"),
        link("One-page CV", "https://thiagomata.com/one-page-cv.html"),
        link("Detailed CV", "https://thiagomata.com/detailed-cv.html"),
        link("LinkedIn", "https://www.linkedin.com/in/thiagomata/"),
        link("ORCID", "https://orcid.org/0009-0002-7366-939X"),
        link("GitHub", "https://github.com/thiagomata"),
        link("Email me", "mailto:thiago.henrique.mata@gmail.com"),
        "",
        "WAP edition 1.2",
        "Sydney, Australia",
    ]),
];

// Case studies: one short card per case, condensed from cases/*.md, each linking out to the full
// page. Listed after CARDS so the emulator files them under the job card that links to them
// (#experience/rokt/identity).
const CASES = [
    card("deposits", "Term Deposits", ["Mcq.", "#macquarie"], null, [
        "TERM DEPOSITS",
        "Macquarie Bank",
        "",
        "Account opening, from days to minutes.",
        "",
        "A cross-team effort replacing a slow, bureaucratic process with a lean digital journey.",
        "",
        "Change managed through evidence: A/B tests, feature flags, live old-vs-new comparisons and reconciliation reports.",
        "",
        "An end-to-end scenario tool, local testing, CI/CD and load tests made quality part of delivery.",
        "",
        "Result: no incidents related to the change.",
        "",
        link("Full case", FULL + "macquarie-term-deposits.html"),
    ]),
    card("identity", "Identity", ["Rokt", "#rokt"], null, [
        "IDENTITY",
        "Rokt",
        "",
        "Connecting touchpoints and devices to one customer through a multi-hop identity graph, with privacy, data residency and client isolation.",
        "",
        "Result: real-time identification in a fraction of the time and resources, open to new identifiers and strategies.",
        "",
        "Scala, Spark, Kafka, AWS Neptune",
        "",
        link("Attribution", "#attribution"),
        link("Bot Detection", "#bots"),
        link("Full case", FULL + "rokt-identity.html"),
    ]),
    card("attribution", "Attribution", ["Rokt", "#rokt"], null, [
        "ATTRIBUTION",
        "Rokt",
        "",
        "Matching campaign events to outcomes with per-campaign rules, consistent and explainable.",
        "",
        "Result: matches in a fraction of the time and resources, rules that change on the fly, and ML models that optimise campaigns faster.",
        "",
        "Scala, Spark, Kafka, HBase",
        "",
        link("Identity", "#identity"),
        link("Bot Detection", "#bots"),
        link("Full case", FULL + "rokt-attribution.html"),
    ]),
    card("bots", "Bot Detection", ["Rokt", "#rokt"], null, [
        "BOT DETECTION",
        "Rokt",
        "",
        "Screening every public request in real time, blocking malicious bots that create fake transactions.",
        "",
        "Every decision explained for audit; a rule engine measures new rules before they reach customers.",
        "",
        "Go, Istio, Envoy, WASM, Kubernetes, Kafka",
        "",
        link("Identity", "#identity"),
        link("Attribution", "#attribution"),
        link("Full case", FULL + "rokt-bot-detection.html"),
    ]),
    card("cloud", "To the Cloud", ["SLI", "#sli"], null, [
        "TO THE CLOUD",
        "SLI Systems",
        "",
        "Rewrote AI services from Apache Spark to Apache Beam on Google Dataflow, keeping data consistent across both platforms during the move.",
        "",
        "Result: faster, cheaper services that scale on demand and strengthened the company in its acquisition.",
        "",
        "Beam, Dataflow, BigQuery, Pub/Sub",
        "",
        link("Full case", FULL + "sli-to-the-cloud.html"),
    ]),
    card("alexandria", "Alexandria", ["Ideia", "#ideia"], null, [
        "ALEXANDRIA",
        "Ideia",
        "",
        "Turned an internal reporting tool into a self-service platform: clients upload files, query their databases and find insights themselves.",
        "",
        "Result: less dependence on the technical team, and a foundation to serve more clients.",
        "",
        "PHP, Python, Scala, Spark, PostgreSQL",
        "",
        link("Full case", FULL + "ideia-alexandria.html"),
    ]),
    card("datasync", "Data Sharing", ["Otimi", "#otimicar"], null, [
        "DATA SHARING",
        "Otimicar",
        "",
        "Server for a device that makes any car smart: compares each car with similar models and recommends services and maintenance.",
        "",
        "Integrated workshops, car stores and insurers that shared no common data standard.",
        "",
        "Result: working integrations that boosted investor confidence.",
        "",
        "Java, REST, SOAP, gRPC, MongoDB",
        "",
        link("Full case", FULL + "otimicar-data-sync.html"),
    ]),
    card("education", "Education", ["INEP", "#inep"], null, [
        "EDUCATION AS PLATFORM",
        "MEC / INEP",
        "",
        "Services for millions of students, schools and universities, monitoring financial transactions that reach millions per day.",
        "",
        "Built E-MEC (accreditation of every university), Revalida (foreign medical diplomas) and SISTEC (technical courses).",
        "",
        "PHP, Java, Oracle, Postgres",
        "",
        link("Full case", FULL + "mec-education-platform.html"),
    ]),
];

// WML text: XML's escapes, and $$ for $, since $ starts a variable in WML.
const escape = text =>
    text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("$", "$$$$");
// An attribute value: the same, and its quotes.
const attribute = value => escape(value).replaceAll('"', "&quot;");
/** ASCII art as one WML run: spaces become &#160; (WML collapses spaces), rows end in <br/>. */
const art = lines => lines.map(line => escape(line).replaceAll(" ", "&#160;")).join("<br/>");

/** One card as WML. A logo goes in its own <p mode="nowrap">, so it scrolls sideways instead of
 *  breaking mid-row. */
export function renderCard({ id, title, label, href, art: logo, items }) {
    const lines = [
        `  <card id="${attribute(id)}" title="${attribute(title)}">`,
        `    <do type="accept" label="${attribute(label)}">`,
        `      <go href="${attribute(href)}"/>`,
        "    </do>",
    ];
    if (logo) lines.push('    <p mode="nowrap">', `      ${art(ART[logo])}<br/>`, "    </p>");
    lines.push("    <p>");
    for (const item of items) {
        if (item === "") lines.push("      <br/>");
        else if (typeof item === "string") lines.push(`      ${escape(item)}<br/>`);
        else lines.push(`      <a href="${attribute(item.href)}">${escape(item.text)}</a><br/>`);
    }
    lines.push("    </p>", "  </card>");
    return lines.join("\n");
}

/** The whole deck. */
export function renderDeck(cards = [...CARDS, ...CASES]) {
    return `<?xml version="1.0"?>
<!DOCTYPE wml PUBLIC "-//WAPFORUM//DTD WML 1.1//EN" "http://www.wapforum.org/DTD/wml_1.1.xml">
<!--
  index.wml - the thiagomata.com WAP edition.
  GENERATED by tools/wap-deck.js - edit that file, not this one.
  Logos are text art with &#160; entities, the authentic way
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

${cards.map(renderCard).join("\n\n")}
</wml>
`;
}

/** The deck's card ids, once it parses as XML and every #link names one of its cards; else throws. */
export function checkDeck(wml) {
    const doc = new DOMParser({
        onError: (level, message) => { if (level !== "warning") throw new Error(`Invalid XML: ${message}`); },
    }).parseFromString(wml, "text/xml");
    const cards = [...doc.getElementsByTagName("card")];
    const ids = new Set(cards.map(c => c.getAttribute("id")));
    for (const c of cards) {
        for (const tag of ["a", "go"]) {
            for (const element of [...c.getElementsByTagName(tag)]) {
                const href = element.getAttribute("href") || "";
                if (href.startsWith("#") && !ids.has(href.slice(1))) {
                    throw new Error(`Broken link: ${href} on card ${c.getAttribute("id")}`);
                }
            }
        }
    }
    return ids;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const out = process.argv[2] || OUT;
    const wml = renderDeck();
    const ids = checkDeck(wml);       // check before writing: never leave a broken deck
    writeFileSync(out, wml);
    console.log(`OK: ${out} written, ${ids.size} cards, XML valid, all links resolve`);
}

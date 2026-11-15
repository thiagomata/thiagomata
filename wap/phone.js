// The phone's rules, apart from the page: the keypad, its tones, where
// each card sits in the deck, the secret numbers, and how names are said.

// The 12 keys and the letters printed under them.
export const KEYS = [["1", ""], ["2", "abc"], ["3", "def"], ["4", "ghi"], ["5", "jkl"], ["6", "mno"],
    ["7", "pqrs"], ["8", "tuv"], ["9", "wxyz"], ["*", "+"], ["0", ""], ["#", ""]];

// The key a character is typed on: digits, * and # are their own key,
// letters dial the key they are printed on, like vanity numbers.
export function keyFor(ch) {
    if ("0123456789*#".includes(ch) && ch.length === 1) return ch;
    if (!/^[a-z]$/i.test(ch)) return null;
    return KEYS.find(([, letters]) => letters.includes(ch.toLowerCase()))[0];
}
export function numberFor(word) {
    return [...word].map(keyFor).join("");
}

// DTMF: every key sounds its row's tone and its column's tone together.
const ROWS = [["123", 697], ["456", 770], ["789", 852], ["*0#", 941]];
const COLUMNS = [["147*", 1209], ["2580", 1336], ["369#", 1477]];
export function dtmf(key) {
    const tone = table => table.find(([keys]) => keys.includes(key))[1];
    return [tone(ROWS), tone(COLUMNS)];
}

// A line with a caller's respellings, for names a voice gets wrong:
// pronounce({ Thiago: "Cheeahgo" }, "Hi, Thiago") is "Hi, Cheeahgo". The
// recordings (tools/wap-voices.js) and the browser's voice both use it.
export const pronounce = (respellings, text) =>
    Object.entries(respellings || {}).reduce((line, [word, sound]) => line.replaceAll(word, sound), text);

// Where each card sits: its section is the first card, other than home,
// that links to it. links maps a card id to the hrefs on that card.
export function sections(links) {
    const parents = Object.create(null);
    for (const [id, hrefs] of Object.entries(links)) {
        if (id === "home") continue;
        for (const href of hrefs) {
            const target = href.slice(1);
            if (href.startsWith("#") && Object.hasOwn(links, target) && !Object.hasOwn(parents, target)) parents[target] = id;
        }
    }
    return parents;
}
// A card's deep link, e.g. experience/rokt; safe against link cycles.
export function cardPath(id, parents) {
    const path = [id];
    while (parents[path[0]] && !path.includes(parents[path[0]])) path.unshift(parents[path[0]]);
    return path.join("/");
}

// Speed dial: hold a key to call whoever is stored on it. As on real
// phones, 1 is voicemail (no number: the call goes to Thiago).
export const LONG_PRESS_MS = 800;
export const SPEED_DIAL = {
    "1": ["Voicemail", ""], "2": ["Morpheus", "628749"], "3": ["GLaDOS", "767825"],
    "4": ["Deep Thought", "42"], "5": ["Rollers", "7425"], "6": ["Mary", "3212333"],
    "7": ["Beethoven", "336996321123322"], "8": ["Santa", "33333339123"], "9": ["Terminal", "777"],
};

// Support lines for the region of the emergency number dialled (checked
// Nov 2026), as [who, number]. 112 and HELP get the worldwide directory.
export const SUPPORT = {
    "000": ["Lifeline (Australia)", "13 11 14"],
    "911": ["988 Lifeline (US, Canada), call or text", "988"],
    "999": ["Samaritans (UK, Ireland)", "116 123"],
    "190": ["CVV (Brasil)", "188"],
    "192": ["CVV (Brasil)", "188"],
    "193": ["CVV (Brasil)", "188"],
};
// A phone number as a link that calls it: tel: and its digits.
export const telHref = number => "tel:" + number.replace(/[^\d+]/g, "");

// Every secret, as 777 lists it. The page has a call for each number.
// special_214c is fighting-game notation, a quarter circle back and C:
// 2 1 4, then 2, since C is on the 2 key.
export const SECRETS = [
    ["matrix", "628749"], ["portal", "767825"], ["rick", "7425"],
    ["never_gonna", "6383746662"], ["rickroll", "74257655"], ["rick_tune", "1262##9"],
    ["wake_up", "1999"], ["deep_thought", "42"], ["the_phone", "7110"],
    ["not_found", "404"], ["imei", "*#06#"], ["firmware", "*#0000#"],
    ["help", "4357"], ["terminal", "777"], ["little_lamb", "3212333"],
    ["ode_to_joy", "336996321123322"], ["frere_jacques", "12311231369369"],
    ["jingle_bells", "33333339123"], ["twinkle", "1199##9"], ["birthday", "112163"],
    ["plumber", "333139"],
    ["god_mode", "↑↑↓↓←→←→BA"], ["special_214c", "2142"], ["speed_dial", "hold 1-9"],
];

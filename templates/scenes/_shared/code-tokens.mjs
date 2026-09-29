// code-tokens.mjs — a tiny, deterministic syntax colourer for the code templates (code-typing, code-morph,
// editor-window). The registry blocks bake Shiki tokens at author time; a compiled frame cannot run Shiki, so this
// splits one line of code into coloured tokens with a few regexes that read well for JS/TS, Python and shell.
// Colours come from the theme: keywords gold, strings cyan, numbers warm, comments muted, calls a cyan-ink mix.

/** JetBrains Mono advance width, em */
export const CHAR = 0.6;

const KEYWORDS = new Set(("const let var function return if else for while in of async await import from export default class "
  + "extends new try catch finally throw def self None True False null true false undefined elif lambda with as pass raise "
  + "break continue yield and or not is type interface enum public private static void int str bool dict list print "
  + "echo cd sudo npm npx pip git curl export source fn match case").split(" "));

const RE = /(\/\/.*$|#.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`[^`]*`?)|(\b\d+(?:\.\d+)?\b)|([\p{L}_$][\p{L}\p{N}_$]*)|(\s+)|(.)/gu;

/** one line of code → [{ text, kind }], kind ∈ kw str num com fn id sp pun */
export function tokenize(line) {
  const src = String(line).normalize("NFC");
  const out = [];
  for (const m of src.matchAll(RE)) {
    let kind;
    if (m[1] !== undefined) kind = "com"; // "//" or "#" to the end of the line (a string opened earlier wins)
    else if (m[2] !== undefined) kind = "str";
    else if (m[3] !== undefined) kind = "num";
    else if (m[4] !== undefined) kind = KEYWORDS.has(m[4]) ? "kw" : src[m.index + m[4].length] === "(" ? "fn" : "id";
    else if (m[5] !== undefined) kind = "sp";
    else kind = "pun";
    out.push({ text: m[0], kind });
  }
  return out;
}

/** the colour classes S-kw, S-str, … for one shot */
export const tokenCss = (S) => `
.${S}-kw { color: var(--gold); }
.${S}-str { color: var(--cyan); }
.${S}-num { color: color-mix(in srgb, var(--warn) 70%, var(--gold)); }
.${S}-com { color: var(--muted); font-style: italic; }
.${S}-fn { color: color-mix(in srgb, var(--cyan) 45%, var(--ink)); }
.${S}-id { color: var(--ink); }
.${S}-pun { color: color-mix(in srgb, var(--ink) 70%, var(--muted)); }
.${S}-sp { color: var(--ink); }`;

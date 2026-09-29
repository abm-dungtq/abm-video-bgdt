// code-line.mjs — a small, language-agnostic syntax colouring for one line of code (comments, strings, numbers,
// keywords, function calls), shared by the code-card and code-scroll templates. Colours come from the theme through
// the classes `${cls}-kw / -fn / -str / -num / -com`, which each template styles.

const KW = new Set(("def return if elif else for while in import from as const let var function class async await export new true false "
  + "True False None null undefined and or not try catch except finally with yield lambda pass break continue fn pub use struct impl match "
  + "type interface extends implements static public private protected void int str bool self this echo then fi do done").split(" "));

const RE = /(#.*$|\/\/.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`[^`]*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;

/** one code line → HTML with coloured spans (the text itself is escaped with `esc`; `attrs` goes on every span) */
export function highlight(line, esc, cls, attrs = "") {
  let out = "", last = 0;
  for (const m of line.matchAll(RE)) {
    out += esc(line.slice(last, m.index));
    const [tok, com, str, num, id] = m;
    const next = line.slice(m.index + tok.length);
    const k = com ? "com" : str ? "str" : num ? "num" : KW.has(id) ? "kw" : /^\s*\(/.test(next) ? "fn" : null;
    out += k ? `<span class="${cls}-${k}"${attrs}>${esc(tok)}</span>` : esc(tok);
    last = m.index + tok.length;
  }
  return out + esc(line.slice(last));
}

/** the CSS for those classes, scoped to one shot */
export const highlightCss = (cls) => `
.${cls}-kw { color: var(--gold); font-weight: 700; }
.${cls}-fn { color: var(--cyan); }
.${cls}-str { color: color-mix(in srgb, var(--gold) 55%, var(--ink)); }
.${cls}-num { color: color-mix(in srgb, var(--warn) 80%, var(--ink)); }
.${cls}-com { color: var(--muted); font-style: italic; }`;

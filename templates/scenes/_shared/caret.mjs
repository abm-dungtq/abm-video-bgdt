// caret.mjs — a text caret that follows typing, shared by the cursor-text and terminal-window templates.
// Every typed character is a span holding its own out-of-flow caret bar (absolutely positioned, so it never changes
// line breaking); "moving" the caret means showing one of those bars and hiding the previous one, with `swap` sets.
// The glyph spans start hidden in CSS (opacity 0) and are shown with `swap`, so a later deletion is one more `swap`.

const r3 = (x) => Math.round(x * 1000) / 1000;

/** text → character spans `${idp}${k}` (class `${S}-ch ${cls}`), each with a caret child `${idp}${k}c` */
export const caretChars = (text, { S, esc, cls, idp }) => [...text.normalize("NFC")]
  .map((c, k) => `<span class="${S}-ch ${cls}" id="${idp}${k}">${esc(c)}<i class="${S}-cr" id="${idp}${k}c"></i></span>`).join("");

/** CSS for the spans and bars; `color` is the bar colour, `w` its width in em */
export const caretCss = (S, { color = "var(--gold)", w = 0.08 } = {}) => `
.${S}-ch { position: relative; opacity: 0; }
.${S}-cr { position: absolute; right: -${(w / 2).toFixed(3)}em; top: 0.08em; width: ${w}em; height: 1.08em; border-radius: 2px; background: ${color};
  opacity: 0; }`;

/**
 * Motions for a caret that sits on `events` = [{ t, id }] (id: the caret bar element id, or null for "no caret") in time
 * order: each bar is shown at its event and hidden at the next one. After the last event the bar blinks until `end`.
 * `initial` is the id of a bar visible from the start in CSS (its first hide needs no show).
 */
export function caretMotions(events, end, { initial = null, blink = 0.5 } = {}) {
  const m = [];
  const ev = events.filter((e, i) => i === events.length - 1 || events[i + 1].t - e.t > 0.004);
  let cur = initial;
  ev.forEach((e) => {
    if (cur && cur !== e.id && e.t > 0.001) m.push({ prim: "swap", target: `#${cur}`, at: r3(e.t), props: { opacity: 0 } });
    if (e.id && e.id !== cur && e.t > 0.001) m.push({ prim: "swap", target: `#${e.id}`, at: r3(e.t), props: { opacity: 1 } });
    cur = e.id;
  });
  if (cur) {
    const from = ev.length ? ev.at(-1).t : 0;
    for (let k = 1, at = from + blink; at < end - 0.05; k++, at += blink) {
      m.push({ prim: "swap", target: `#${cur}`, at: r3(at), props: { opacity: k % 2 ? 0 : 1 } });
    }
  }
  return m;
}

/** show each character span of `ids` at start + k * step */
export const typeMotions = (ids, start, step) => ids.map((id, k) => ({ prim: "swap", target: `#${id}`, at: r3(start + k * step), props: { opacity: 1 } }));

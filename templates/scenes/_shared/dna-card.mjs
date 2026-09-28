// dna-card.mjs — the fixed identity shared by the six DNA card templates (card-objective, card-principle,
// card-antipattern, card-case, card-exercise, card-quiz), from templates/worker-kit/worker-layouts.md.tmpl § DNA cards:
//   card box x 160–1600, y 60–760 (ctx.zones.CARD) on var(--surface) with a 2 px var(--gold) top border;
//   a 36 px icon and, right of it, the uppercase mono 24 px var(--gold) label (letter-spacing 0.12em) at card x +48, y +40.
// The card enters at the window start; the identity lights on the reveal key `label`. Everything inside #S-in
// (card-local px, 1440 × 700) belongs to the variant and drifts slowly after the variant's last reveal.

/** estimated wrapped line count of `text` at font size `fs` in a box `width` px wide (Be Vietnam Pro ≈ 0.55 em/char) */
export const lines = (text, fs, width) => Math.max(1, Math.ceil(([...String(text)].length * fs * 0.55) / width));

/** pick a font size from [[maxChars, px], …] by the text length */
export const fit = (text, steps) => steps.find(([n]) => [...String(text)].length <= n)?.[1] ?? steps.at(-1)[1];

const DUR = { reveal: 0.5, slide: 0.6, draw: 0.8, count: 1, type: 1 };
/**
 * Keep every motion inside the shot: a reveal cued late in the window (a keyword may sit 0.3 s before its end) is
 * shortened, or moved back, so it still ends by `b` (the emitter rejects tweens that run past the frame).
 */
export function keepInside(motions, b) {
  const end = b - 0.02;
  return motions.map((x) => {
    if (x.prim === "swap") return x;
    if (x.prim === "dim") return x.at + 0.3 <= end ? x : { ...x, at: end - 0.3 };
    const dur = x.dur ?? DUR[x.prim] ?? 0.5;
    if (x.at + dur <= end) return x;
    const d = Math.max(0.12, end - x.at);
    return { ...x, dur: d, at: Math.min(x.at, end - d) };
  });
}

export function dnaCard(ctx, { label, icon }) {
  const { S, esc, theme, window: w } = ctx;
  const B = ctx.zones.CARD;
  const tLabel = ctx.at("label");
  const css = `
#${S}-card { position: absolute; left: ${B.x}px; top: ${B.y}px; width: ${B.w}px; height: ${B.h}px; box-sizing: border-box;
  background: var(--surface); border-top: 2px solid var(--gold); border-radius: ${theme.radius ?? 18}px; }
#${S}-id { position: absolute; left: 48px; top: 40px; height: 36px; display: flex; align-items: center; gap: 14px; }
#${S}-idi { width: 36px; height: 36px; color: var(--gold); }
#${S}-idi svg { width: 36px; height: 36px; display: block; }
#${S}-idl { font-family: "${theme.mono}", monospace; font-size: 24px; line-height: 36px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--gold); white-space: nowrap; }
#${S}-in { position: absolute; left: 0; top: 0; width: ${B.w}px; height: ${B.h}px; }`;
  return {
    B,
    tLabel,
    /** assemble the card: the variant's css/html (inside #S-in), its motions, and when its content starts drifting */
    wrap({ css: inner = "", html = "", motions = [], driftFrom = null }) {
      const m = [
        { prim: "reveal", target: `#${S}-card`, at: w.a, dur: 0.55, from: { opacity: 0, y: 36 }, ease: ctx.ease },
        { prim: "reveal", target: `#${S}-idi`, at: tLabel, dur: 0.45, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" },
        { prim: "reveal", target: `#${S}-idl`, at: tLabel + 0.08, dur: 0.45, from: { opacity: 0, x: -18 } },
        ...motions,
      ];
      const d = driftFrom != null ? ctx.drift(`#${S}-in`, driftFrom) : null;
      if (d) m.push(d);
      const html_ = `<div id="${S}-card">
  <div id="${S}-id"><div id="${S}-idi">${icon}</div><div id="${S}-idl">${esc(label)}</div></div>
  <div id="${S}-in">
${html}
  </div>
</div>`;
      return { css: css + inner, html: html_, motions: keepInside(m, w.b) };
    },
  };
}

/** the card identity without the box: icon + uppercase mono gold label at stage (x, y), lit on the `label` cue */
export function openLabel(ctx, { label, icon, x, y }) {
  const { S, esc, theme } = ctx;
  const t = ctx.at("label");
  return {
    css: `
#${S}-id { position: absolute; left: ${x}px; top: ${y}px; height: 36px; display: flex; align-items: center; gap: 14px; }
#${S}-idi { width: 36px; height: 36px; color: var(--gold); }
#${S}-idi svg { width: 36px; height: 36px; display: block; }
#${S}-idl { font-family: "${theme.mono}", monospace; font-size: 24px; line-height: 36px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--gold); white-space: nowrap; }`,
    html: `    <div id="${S}-id"><div id="${S}-idi">${icon}</div><div id="${S}-idl">${esc(label)}</div></div>`,
    motions: [
      { prim: "reveal", target: `#${S}-idi`, at: t, dur: 0.45, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" },
      { prim: "reveal", target: `#${S}-idl`, at: t + 0.08, dur: 0.45, from: { opacity: 0, x: -18 } },
    ],
  };
}

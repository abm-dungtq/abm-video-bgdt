// opener-write — after the HyperFrames registry block "hw-write-title" (Apache-2.0, heygen-com/hyperframes).
// A chapter opener whose title is written on by hand. The registry block traces baked Caveat glyph centrelines; Caveat
// has no Vietnamese, so the title uses the theme font and the hand is in the motion instead: each character is inked in
// writing order (its outline drawn, then filled), a squiggle underline is drawn after the last one, and the whole
// board "boils" (a tiny jitter re-drawn 8 times a second) as hand-drawn animation does.
// chalk (signature): chalk on the dark board: glyph outlines drawn one after another with a rough chalk edge, then filled.
// ink: a sheet of paper; a pen nib rides along each line and wipes the ink in behind it.

import { fit, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.kicker ? ["kicker"] : []), "title", ...(slots.note ? ["note"] : [])];

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;
/** deterministic hash in [-1, 1] (the registry block's hwHash) */
const hash = (n, seed) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };

/** one line up to 16 characters, else two lines split at the space nearest the middle */
function splitLines(text) {
  const t = text.normalize("NFC");
  if ([...t].length <= 16 || !t.includes(" ")) return [t];
  const mid = t.length / 2;
  let best = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [t.slice(0, best), t.slice(best + 1)];
}

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const ink = ctx.variant === "ink";
  const tTitle = ctx.at("title"), tKick = slots.kicker ? ctx.at("kicker") : null, tNote = slots.note ? ctx.at("note") : null;
  const lines = splitLines(slots.title);
  const longest = lines.reduce((a, b) => ([...a].length >= [...b].length ? a : b));
  const fs = ink ? fit(longest, [[8, 150], [12, 124], [16, 104], [30, 88]]) : fit(longest, [[8, 170], [12, 140], [16, 116], [30, 96]]);
  const lh = Math.round(fs * 1.2);
  const estW = (t) => Math.min(ink ? 1290 : 1560, Math.round([...t].length * fs * 0.64 + 40));
  const seed = 8;
  const m = [];
  const chars = lines.map((l) => [...l]);
  const n = chars.reduce((s, c) => s + c.length, 0);
  const writeDur = Math.min(2.2, Math.max(0.9, n * 0.075), Math.max(0.6, w.b - tTitle - 1.0));
  const at0 = Math.max(tTitle, w.a + 0.2);
  const lineAt = []; // when each line starts and ends being written
  let acc = 0;
  chars.forEach((c) => { lineAt.push([at0 + (acc / n) * writeDur, at0 + ((acc + c.length) / n) * writeDur]); acc += c.length; });
  const doneAt = at0 + writeDur;

  let css, html;
  const scribble = (x0, x1, y) => {
    const k = 4, seg = (x1 - x0) / k;
    let d = `M${r1(x0)} ${r1(y + hash(1, seed) * 3)}`;
    for (let i = 0; i < k; i++) d += ` Q${r1(x0 + seg * (i + 0.5))} ${r1(y + (i % 2 ? 9 : -9) + hash(i + 2, seed) * 3)} ${r1(x0 + seg * (i + 1))} ${r1(y + hash(i + 9, seed) * 3)}`;
    return d;
  };

  if (!ink) {
    const H = lines.length * lh + 30;
    const top = Math.round(400 - H / 2 - 20);
    const underY = top + H + 12, noteTop = underY + 40;
    const uw = Math.min(1100, estW(longest) * 0.8);
    let gi = 0;
    const text = (cls, p) => `<text class="${cls}" x="800" text-anchor="middle" data-layout-allow-overlap>${lines.map((l, j) => `<tspan x="800" y="${Math.round(fs * 0.98 + j * lh)}">${[...l].map((c) => `<tspan id="${S}-${p}${gi++}">${esc(c)}</tspan>`).join("")}</tspan>`).join("")}</text>`;
    const outline = text(`${S}-go`, "o");
    gi = 0;
    const fill = text(`${S}-gf`, "f");
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-boil { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 80px; top: ${top}px; width: 1600px; height: ${H}px; overflow: visible; }
#${S}-svg text { font-size: ${fs}px; font-weight: 800; letter-spacing: 0.01em; white-space: pre; }
.${S}-go { fill: color-mix(in srgb, var(--ink) 10%, transparent); stroke: var(--ink); stroke-width: 2.5; stroke-linejoin: round; stroke-dasharray: 1600; filter: url(#${S}-rough); }
.${S}-gf { fill: color-mix(in srgb, var(--ink) 92%, transparent); filter: url(#${S}-rough); }
#${S}-under { position: absolute; left: ${880 - uw / 2}px; top: ${underY - 12}px; width: ${uw}px; height: 24px; overflow: visible; }
#${S}-under path { fill: none; stroke: var(--gold); stroke-width: 7; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-kick { position: absolute; left: 0; width: 1760px; top: ${top - 70}px; text-align: center; font-family: "${theme.mono}", monospace; font-size: 30px;
  letter-spacing: 0.22em; text-transform: uppercase; color: var(--cyan); white-space: nowrap; }
#${S}-note { position: absolute; left: 80px; width: 1600px; top: ${noteTop}px; text-align: center; font-size: 38px; font-weight: 600; color: var(--muted); font-style: italic; }`;
    html = `<div id="${S}-root">
 ${slots.kicker ? `<div id="${S}-kick">${esc(slots.kicker)}</div>` : ""}
 <div id="${S}-boil">
  <svg id="${S}-svg" viewBox="0 0 1600 ${H}">
   <defs><filter id="${S}-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter></defs>
   ${outline}
   ${fill}
  </svg>
  <svg id="${S}-under" viewBox="0 0 ${uw} 24"><path id="${S}-up" pathLength="1000" d="${scribble(4, uw - 4, 12)}"/></svg>
 </div>
 ${slots.note ? `<div id="${S}-note">${esc(slots.note)}</div>` : ""}
</div>`;
    // each character: its outline is traced, then it fills in; spaces are skipped
    let k = 0;
    chars.forEach((c, j) => c.forEach((ch, i) => {
      const at = r3(lineAt[j][0] + (i / c.length) * (lineAt[j][1] - lineAt[j][0]));
      if (ch !== " ") {
        m.push({ prim: "reveal", target: `#${S}-o${k}`, at, dur: 0.4, from: { opacity: 0, strokeDashoffset: 1600 }, to: { opacity: 1, strokeDashoffset: 0 }, ease: "power1.inOut" });
        m.push({ prim: "reveal", target: `#${S}-f${k}`, at: r3(at + 0.28), dur: 0.3, from: { opacity: 0 }, ease: "power1.out" });
      }
      k++;
    }));
    m.push({ prim: "draw", target: `#${S}-up`, at: r3(doneAt + 0.15), dur: 0.55, ease: "power2.out" });
    if (slots.note) m.push({ prim: "reveal", target: `#${S}-note`, at: Math.max(tNote, doneAt + 0.4), dur: 0.5, from: { opacity: 0, y: 12 }, ease: ctx.ease });
    if (slots.kicker) m.push({ prim: "reveal", target: `#${S}-kick`, at: Math.max(w.a, Math.min(tKick, at0)), dur: 0.45, from: { opacity: 0, y: -12 }, ease: ctx.ease });
    // the board layer is live from the window start (its glyphs stay hidden until they are written)
    m.push({ prim: "reveal", target: `#${S}-svg`, at: w.a, dur: 0.3, from: { opacity: 0 }, ease: "power1.out" });
  } else {
    // paper: 1400 × PH, tilted a touch; lines are left-aligned on it
    const PX = 180, PW = 1400, pad = 90;
    const kickH = slots.kicker ? 64 : 0, noteH = slots.note ? 70 : 0;
    const PH = Math.min(760, kickH + lines.length * lh + 60 + noteH + 2 * 56);
    const PY = Math.round((820 - PH) / 2) - 10;
    const ty = 56 + kickH;
    const underY = ty + lines.length * lh + 18;
    const uw = Math.min(PW - 2 * pad, estW(longest) * 0.7);
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-tiltw { position: absolute; left: ${PX}px; top: ${PY}px; width: ${PW}px; height: ${PH}px; transform: rotate(-1.2deg); }
#${S}-paper { position: absolute; inset: 0; border-radius: 10px; background: var(--ink); box-shadow: 0 30px 70px color-mix(in srgb, #000 50%, transparent); }
#${S}-boil { position: absolute; inset: 0; }
.${S}-wipe { position: absolute; left: ${pad}px; height: ${lh}px; overflow: hidden; }
.${S}-line { position: absolute; left: 0; top: 0; height: ${lh}px; line-height: ${lh}px; font-size: ${fs}px; font-weight: 800; color: var(--canvas); white-space: pre; }
#${S}-pen { position: absolute; left: ${pad - 10}px; top: 0; width: 64px; height: 64px; overflow: visible; }
#${S}-pen path { fill: var(--canvas); stroke: var(--canvas); stroke-width: 2; stroke-linejoin: round; }
#${S}-under { position: absolute; left: ${pad}px; top: ${underY - 12}px; width: ${uw}px; height: 24px; overflow: visible; }
#${S}-under path { fill: none; stroke: var(--warn); stroke-width: 7; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-kick { position: absolute; left: ${pad}px; top: 50px; font-family: "${theme.mono}", monospace; font-size: 28px; letter-spacing: 0.2em; text-transform: uppercase;
  color: color-mix(in srgb, var(--canvas) 80%, var(--ink)); white-space: nowrap; }
#${S}-note { position: absolute; left: ${pad}px; width: ${PW - 2 * pad}px; top: ${underY + 34}px; font-size: 36px; font-weight: 600; font-style: italic;
  color: color-mix(in srgb, var(--canvas) 78%, var(--ink)); }`;
    html = `<div id="${S}-root">
 <div id="${S}-tiltw">
  <div id="${S}-paper">
   <div id="${S}-boil">
    ${slots.kicker ? `<div id="${S}-kick">${esc(slots.kicker)}</div>` : ""}
${lines.map((l, j) => `    <div class="${S}-wipe" id="${S}-w${j}" style="top: ${ty + j * lh}px; width: ${estW(l)}px" data-layout-allow-overflow><div class="${S}-line" id="${S}-i${j}" data-layout-allow-overflow>${esc(l)}</div></div>`).join("\n")}
    <svg id="${S}-under" viewBox="0 0 ${uw} 24"><path id="${S}-up" pathLength="1000" d="${scribble(4, uw - 4, 12)}"/></svg>
    ${slots.note ? `<div id="${S}-note">${esc(slots.note)}</div>` : ""}
    <svg id="${S}-pen" viewBox="0 0 64 64" data-layout-allow-overlap><path d="M6 58 L16 30 L44 4 L60 20 L34 48 Z M6 58 L22 42"/></svg>
   </div>
  </div>
 </div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-paper`, at: w.a, dur: 0.6, from: { opacity: 0, y: 40, rotation: -3 }, ease: ctx.ease });
    lines.forEach((l, j) => {
      const W = estW(l), [a, b] = lineAt[j], dur = r3(Math.max(0.3, b - a - ctx.gap));
      m.push({ prim: "reveal", target: `#${S}-w${j}`, at: r3(a), dur, from: { x: -W }, to: { x: 0 }, ease: "none" });
      m.push({ prim: "reveal", target: `#${S}-i${j}`, at: r3(a), dur, from: { x: W }, to: { x: 0 }, ease: "none" });
      // the nib sits on the wipe edge, on this line's baseline
      const py = ty + j * lh + lh * 0.72 - 58;
      m.push({ prim: j === 0 ? "reveal" : "slide", target: `#${S}-pen`, at: r3(a), dur, from: { x: 0, y: py }, to: { x: W, y: py }, ease: "none" });
    });
    m.push({ prim: "reveal", target: `#${S}-pen`, at: w.a + 0.1, dur: 0.3, from: { opacity: 0 }, ease: "power1.out" });
    m.push({ prim: "reveal", target: `#${S}-pen`, at: r3(doneAt + 0.05), dur: 0.35, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.in" });
    m.push({ prim: "draw", target: `#${S}-up`, at: r3(doneAt + 0.15), dur: 0.55, ease: "power2.out" });
    if (slots.note) m.push({ prim: "reveal", target: `#${S}-note`, at: Math.max(tNote, doneAt + 0.4), dur: 0.5, from: { opacity: 0, y: 12 }, ease: ctx.ease });
    if (slots.kicker) m.push({ prim: "reveal", target: `#${S}-kick`, at: Math.max(w.a + 0.2, Math.min(tKick, at0)), dur: 0.45, from: { opacity: 0, x: -12 }, ease: ctx.ease });
  }

  // boil: the drawing jitters a little, 8 times a second
  for (let k = 0, at = w.a + 0.125; at < w.b - 0.05; k++, at += 0.125) {
    m.push({ prim: "swap", target: `#${S}-boil`, at: r2(at), props: { x: r2(hash(k * 3, seed) * 1.2), y: r2(hash(k * 3 + 1, seed) * 1.2), rotation: r2(hash(k * 3 + 2, seed) * 0.25) } });
  }
  return { css, html, motions: keepInside(m, w.b) };
}

// myth-fact — 1–3 pairs "lầm tưởng" (a common belief) vs "sự thật" (what is really so). Keys in spoken order:
// myth.0, fact.0, myth.1, fact.1, … Every pair's shell (number, empty slots) is on stage from the window start.
// stamp: two columns (LẦM TƯỞNG | SỰ THẬT), one row per pair; on the fact a red "SAI" stamp slams onto the myth, the
//   myth dims, an arrow draws across and the fact card lights.
// flip-cards: a row of tall cards showing the myth; on the fact each card flips (scaleX through 0) to its gold back.
// tear: a sidebar with the two headings; on the right one strip per pair where the myth is a paper sheet that tears in
//   two on the fact and falls away, uncovering the fact underneath.

import { lines, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => slots.pairs.flatMap((_, i) => [`myth.${i}`, `fact.${i}`]);

const num = (i) => String(i + 1).padStart(2, "0");
/** the largest size in `steps` at which every text fits `width` × `height` (bold Be Vietnam Pro, line-height 1.2) */
const sizeFor = (texts, width, height, steps) =>
  steps.find((fs) => texts.every((t) => lines(t, fs, width * 0.9) * fs * 1.2 <= height)) ?? steps.at(-1);

export function render(ctx) {
  const { S, slots, esc, window: w, theme } = ctx;
  const pairs = slots.pairs;
  const n = pairs.length;
  const tm = pairs.map((_, i) => ctx.at(`myth.${i}`));
  const tf = pairs.map((_, i) => ctx.at(`fact.${i}`));
  const last = Math.max(...tm, ...tf);
  const mono = `"${theme.mono}", monospace`;
  const R = theme.radius ?? 18;
  const clamp = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const m = [];
  const tagCss = `
.${S}-tag { display: flex; align-items: center; gap: 12px; font-family: ${mono}; font-size: 24px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; white-space: nowrap; }
.${S}-tag span { width: 30px; height: 30px; display: block; }
.${S}-tag svg { width: 30px; height: 30px; display: block; }
.${S}-bad { color: var(--warn); }
.${S}-good { color: var(--gold); }`;
  const tag = (kind, extra = "") => kind === "bad"
    ? `<div class="${S}-tag ${S}-bad"${extra}><span>${ctx.icon("cross")}</span>Lầm tưởng</div>`
    : `<div class="${S}-tag ${S}-good"${extra}><span>${ctx.icon("check")}</span>Sự thật</div>`;
  let css, html;

  if (ctx.variant === "flip-cards") {
    const gap = 60, cw = n === 1 ? 900 : n === 2 ? 720 : 520, ch = 600, top = 30;
    const x0 = (1760 - (n * cw + (n - 1) * gap)) / 2;
    const fsM = sizeFor(pairs.map((p) => p.myth), cw - 96, 330, [56, 48, 42, 36, 32, 28]);
    const fsF = sizeFor(pairs.map((p) => p.fact), cw - 96, 360, [52, 46, 40, 34, 30, 26]);
    css = `${tagCss}
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-floor { position: absolute; left: 180px; top: ${top + ch + 40}px; width: 1400px; height: 90px; border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--cyan) 18%, transparent), transparent); }
.${S}-slot { position: absolute; top: ${top}px; width: ${cw}px; height: ${ch}px; }
.${S}-face { position: absolute; inset: 0; box-sizing: border-box; border-radius: 28px; padding: 44px 48px; overflow: hidden; }
.${S}-front { background: var(--surface); border: 3px solid color-mix(in srgb, var(--warn) 55%, transparent); }
.${S}-back { background: color-mix(in srgb, var(--gold) 12%, var(--surface)); border: 3px solid var(--gold);
  box-shadow: 0 0 40px color-mix(in srgb, var(--gold) 22%, transparent); }
.${S}-wm { position: absolute; right: -30px; bottom: -30px; width: 240px; height: 240px; color: var(--ink); opacity: 0.06; }
.${S}-wm svg { width: 240px; height: 240px; display: block; }
.${S}-mt { position: absolute; left: 48px; right: 48px; top: 130px; font-size: ${fsM}px; font-weight: 800; line-height: 1.2; color: var(--ink); }
.${S}-ft { position: absolute; left: 48px; right: 48px; top: 130px; font-size: ${fsF}px; font-weight: 800; line-height: 1.2; color: var(--ink); }
.${S}-no { position: absolute; top: ${top + ch + 60}px; width: ${cw}px; text-align: center; font-family: ${mono}; font-size: 28px; font-weight: 700; color: var(--cyan); }
${pairs.map((_, i) => `#${S}-s${i + 1}, #${S}-n${i + 1} { left: ${x0 + i * (cw + gap)}px; }`).join("\n")}`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <div id="${S}-floor"></div>
${pairs.map((p, i) => `    <div class="${S}-slot" id="${S}-s${i + 1}">
      <div class="${S}-face ${S}-front" id="${S}-fr${i + 1}"><div class="${S}-wm">${ctx.icon("question")}</div>${tag("bad")}
        <div class="${S}-mt" id="${S}-m${i + 1}">${esc(p.myth)}</div></div>
      <div class="${S}-face ${S}-back" id="${S}-bk${i + 1}"><div class="${S}-wm">${ctx.icon("lightbulb")}</div>${tag("good")}
        <div class="${S}-ft">${esc(p.fact)}</div></div>
    </div>
    <div class="${S}-no" id="${S}-n${i + 1}">${num(i)}</div>`).join("\n")}
  </div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-floor`, at: w.a + 0.05, dur: 0.8, from: { opacity: 0 } });
    pairs.forEach((_, i) => {
      const k = i + 1;
      const flip = clamp(tf[i], 0.6);
      m.push({ prim: "reveal", target: `#${S}-s${k}`, at: w.a + 0.05 + i * 0.1, dur: 0.55, from: { opacity: 0, y: 50 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-n${k}`, at: w.a + 0.2 + i * 0.1, dur: 0.4, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-m${k}`, at: clamp(tm[i], 0.45), dur: 0.45, from: ctx.motionFrom(), ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-fr${k}`, at: flip, dur: 0.25, from: { scaleX: 1 }, to: { scaleX: 0 }, ease: "power2.in" });
      m.push({ prim: "reveal", target: `#${S}-bk${k}`, at: flip + 0.27, dur: 0.3, from: { scaleX: 0 }, to: { scaleX: 1 }, ease: "power2.out" });
    });
  } else if (ctx.variant === "tear") {
    const X0 = 620, W = 1140, gap = 24, top = 10;
    const sh = (800 - (n - 1) * gap) / n;
    const fsM = sizeFor(pairs.map((p) => p.myth), W - 100, sh - 90, [52, 46, 40, 36, 32, 28]);
    const fsF = sizeFor(pairs.map((p) => p.fact), W - 120, sh - 100, [50, 44, 38, 34, 30, 26]);
    const jag = [0, 18, 34, 50, 66, 82, 100].map((y, j) => [j % 2 ? 46 : 54, y]);
    // the left half reaches 0.5 % past the tear so the two halves meet without an anti-aliased seam
    const clipL = `polygon(0 0, ${jag.map(([x, y]) => `${x + 0.5}% ${y}%`).join(", ")}, 0 100%)`;
    const clipR = `polygon(100% 0, ${jag.map(([x, y]) => `${x}% ${y}%`).join(", ")}, 100% 100%)`;
    const tearD = jag.map(([x, y], j) => `${j ? "L" : "M"}${Math.round((x * W) / 100)} ${Math.round((y * sh) / 100)}`).join(" ");
    css = `${tagCss}
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-side { position: absolute; left: 0; top: 10px; width: 480px; height: 800px; box-sizing: border-box; border-radius: ${R}px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-disc { position: absolute; left: 150px; top: 70px; width: 180px; height: 180px; box-sizing: border-box; border-radius: 50%;
  border: 4px solid var(--gold); display: flex; align-items: center; justify-content: center; color: var(--gold);
  box-shadow: 0 0 0 14px color-mix(in srgb, var(--gold) 8%, transparent); }
#${S}-disc svg { width: 96px; height: 96px; display: block; }
#${S}-h1 { position: absolute; left: 40px; top: 330px; width: 400px; text-align: center; font-size: 60px; font-weight: 800; color: var(--warn); }
#${S}-strike { position: absolute; left: 40px; top: 330px; width: 400px; height: 80px; overflow: visible; }
#${S}-strike path { fill: none; stroke: var(--warn); stroke-width: 6; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-vs { position: absolute; left: 40px; top: 440px; width: 400px; text-align: center; font-family: ${mono}; font-size: 26px; color: var(--muted); }
#${S}-h2 { position: absolute; left: 40px; top: 500px; width: 400px; text-align: center; font-size: 60px; font-weight: 800; color: var(--gold); }
#${S}-h2l { position: absolute; left: 90px; top: 600px; width: 300px; height: 6px; border-radius: 3px; background: var(--gold); transform-origin: 50% 50%; }
.${S}-strip { position: absolute; left: ${X0}px; width: ${W}px; height: ${sh}px; }
.${S}-shell { position: absolute; inset: 0; box-sizing: border-box; border-radius: ${R}px; border: 2px dashed color-mix(in srgb, var(--ink) 22%, transparent); }
.${S}-no { position: absolute; left: ${X0 - 84}px; width: 64px; text-align: right; font-family: ${mono}; font-size: 28px; font-weight: 700; color: var(--cyan); }
.${S}-fact { position: absolute; inset: 0; box-sizing: border-box; border-radius: ${R}px; padding: 22px 60px 22px 40px; background: var(--surface);
  border-left: 8px solid var(--gold); }
.${S}-ft { margin-top: 12px; font-size: ${fsF}px; font-weight: 800; line-height: 1.2; color: var(--ink); }
.${S}-sheet { position: absolute; inset: 0; }
.${S}-half { position: absolute; inset: 0; }
.${S}-paper { position: absolute; inset: 0; border-radius: ${R}px; background: var(--ink); }
.${S}-pl { clip-path: ${clipL}; }
.${S}-pr { clip-path: ${clipR}; }
.${S}-txt { position: absolute; inset: 0; box-sizing: border-box; padding: 22px 50px 22px 40px; }
.${S}-txt .${S}-tag { color: color-mix(in srgb, var(--warn) 62%, #000); }
.${S}-tl { position: absolute; left: 0; top: 0; width: ${W}px; height: ${sh}px; overflow: visible; }
.${S}-tl path { fill: none; stroke: color-mix(in srgb, var(--warn) 70%, #000); stroke-width: 4; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-mt { margin-top: 12px; font-size: ${fsM}px; font-weight: 800; line-height: 1.2; color: var(--canvas); }
${pairs.map((_, i) => `#${S}-s${i + 1} { top: ${top + i * (sh + gap)}px; }
#${S}-n${i + 1} { top: ${top + i * (sh + gap) + 18}px; }`).join("\n")}`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <div id="${S}-side"><div id="${S}-disc">${ctx.icon("lightbulb")}</div>
      <div id="${S}-h1">Lầm tưởng</div>
      <svg id="${S}-strike" viewBox="0 0 400 80"><path id="${S}-sk" pathLength="1000" d="M40 44 L360 36"/></svg>
      <div id="${S}-vs">hay là</div>
      <div id="${S}-h2">Sự thật</div><div id="${S}-h2l"></div></div>
${pairs.map((p, i) => `    <div class="${S}-no" id="${S}-n${i + 1}">${num(i)}</div>
    <div class="${S}-strip" id="${S}-s${i + 1}"><div class="${S}-shell"></div>
      <div class="${S}-fact" id="${S}-f${i + 1}">${tag("good")}<div class="${S}-ft">${esc(p.fact)}</div></div>
      <div class="${S}-sheet" id="${S}-p${i + 1}">
        <div class="${S}-half" id="${S}-hl${i + 1}"><div class="${S}-paper ${S}-pl"></div></div>
        <div class="${S}-half" id="${S}-hr${i + 1}"><div class="${S}-paper ${S}-pr"></div></div>
        <div class="${S}-txt" id="${S}-x${i + 1}">${tag("bad")}<div class="${S}-mt">${esc(p.myth)}</div>
          <svg class="${S}-tl" viewBox="0 0 ${W} ${sh}"><path id="${S}-tr${i + 1}" pathLength="1000" d="${tearD}"/></svg></div>
      </div></div>`).join("\n")}
  </div>
</div>`;
    const t0 = clamp(tf[0], 0.6);
    m.push({ prim: "reveal", target: `#${S}-side`, at: w.a + 0.05, dur: 0.55, from: { opacity: 0, x: -40 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-disc`, at: w.a + 0.2, dur: 0.5, from: { opacity: 0, scale: 0.6 }, ease: "back.out(2)" });
    m.push({ prim: "draw", target: `#${S}-sk`, at: t0, dur: 0.45 });
    m.push({ prim: "reveal", target: `#${S}-h2l`, at: t0 + 0.2, dur: 0.4, from: { scaleX: 0 }, ease: "power2.out" });
    if (w.b - (w.a + 0.9) > 1) m.push({ prim: "slide", target: `#${S}-disc`, at: w.a + 0.9, dur: w.b - w.a - 0.95, from: { rotation: 0 }, to: { rotation: -12 }, ease: "sine.inOut" });
    pairs.forEach((_, i) => {
      const k = i + 1;
      // the tear: a jagged line draws on the sheet, the sheet and its writing fade over two blank halves that fall
      // apart, then the fact shows
      const tt = clamp(tf[i], 1.3);
      m.push({ prim: "reveal", target: `#${S}-n${k}`, at: w.a + 0.1 + i * 0.1, dur: 0.4, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-s${k}`, at: w.a + 0.1 + i * 0.1, dur: 0.45, from: { opacity: 0, x: 40 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-p${k}`, at: clamp(tm[i], 0.45), dur: 0.45, from: { opacity: 0, y: -30, rotation: -2 }, ease: ctx.ease });
      m.push({ prim: "draw", target: `#${S}-tr${k}`, at: tt, dur: 0.25, ease: "none" });
      m.push({ prim: "reveal", target: `#${S}-x${k}`, at: tt + 0.27, dur: 0.15, from: { opacity: 1 }, to: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-hl${k}`, at: tt + 0.3, dur: 0.45, from: { opacity: 1, x: 0, y: 0, rotation: 0 }, to: { opacity: 0, x: -90, y: 60, rotation: -9 }, ease: "power2.in" });
      m.push({ prim: "reveal", target: `#${S}-hr${k}`, at: tt + 0.3, dur: 0.45, from: { opacity: 1, x: 0, y: 0, rotation: 0 }, to: { opacity: 0, x: 90, y: 80, rotation: 7 }, ease: "power2.in" });
      m.push({ prim: "reveal", target: `#${S}-f${k}`, at: tt + 0.8, dur: 0.45, from: { opacity: 0, scale: 0.96 }, ease: ctx.ease });
    });
  } else {
    // stamp (signature): two columns, one row per pair
    const top = 96, gap = 24, rh = (820 - top - (n - 1) * gap) / n;
    const L = 0, LW = 780, RX = 960, RW = 800;
    const fsM = sizeFor(pairs.map((p) => p.myth), LW - 320, rh - 50, [48, 42, 38, 34, 30, 26]);
    const fsF = sizeFor(pairs.map((p) => p.fact), RW - 100, rh - 50, [48, 42, 38, 34, 30, 26]);
    const st = Math.min(120, Math.round(rh * 0.5));
    css = `${tagCss}
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-hl { position: absolute; left: ${L + 20}px; top: 20px; }
#${S}-hr { position: absolute; left: ${RX + 20}px; top: 20px; }
#${S}-hl .${S}-tag, #${S}-hr .${S}-tag { font-size: 30px; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-div { fill: none; stroke: color-mix(in srgb, var(--ink) 16%, transparent); stroke-width: 2; stroke-dasharray: 1000; }
.${S}-arr { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-row { position: absolute; height: ${rh}px; box-sizing: border-box; border-radius: ${R}px; }
.${S}-my { left: ${L}px; width: ${LW}px; background: var(--surface); border: 2px solid color-mix(in srgb, var(--warn) 35%, transparent); }
.${S}-fc { left: ${RX}px; width: ${RW}px; border: 2px dashed color-mix(in srgb, var(--ink) 22%, transparent); }
.${S}-lit { position: absolute; inset: -2px; border-radius: inherit; background: color-mix(in srgb, var(--gold) 9%, var(--surface)); border: 3px solid var(--gold); }
.${S}-no { position: absolute; left: 28px; top: 18px; font-family: ${mono}; font-size: 24px; font-weight: 700; color: var(--cyan); }
.${S}-q { position: absolute; left: ${RW / 2 - 36}px; top: ${rh / 2 - 36}px; width: 72px; height: 72px; color: var(--ink); opacity: 0.16; }
.${S}-q svg { width: 72px; height: 72px; display: block; }
.${S}-mt { position: absolute; left: 80px; right: 240px; top: 50%; transform: translateY(-50%); font-size: ${fsM}px; font-weight: 700; line-height: 1.2; color: var(--ink); }
.${S}-ftw { position: absolute; left: 50px; right: 40px; top: 0; bottom: 0; display: flex; align-items: center; }
.${S}-ft { font-size: ${fsF}px; font-weight: 800; line-height: 1.2; color: var(--ink); }
.${S}-stw { position: absolute; right: 26px; top: ${rh / 2 - st / 2}px; width: ${Math.round(st * 1.5)}px; height: ${st}px; transform: rotate(-12deg); }
.${S}-stamp { position: absolute; inset: 0; box-sizing: border-box; border: 5px solid var(--warn); border-radius: 12px; display: flex; align-items: center;
  justify-content: center; font-family: ${mono}; font-size: ${Math.round(st * 0.46)}px; font-weight: 700; letter-spacing: 0.12em; color: var(--warn);
  background: color-mix(in srgb, var(--warn) 10%, var(--surface)); }
${pairs.map((_, i) => `#${S}-m${i + 1}, #${S}-f${i + 1} { top: ${top + i * (rh + gap)}px; }`).join("\n")}`;
    const ys = pairs.map((_, i) => Math.round(top + i * (rh + gap) + rh / 2));
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-svg" viewBox="0 0 1760 820">
      <path id="${S}-div" pathLength="1000" d="M870 20 L870 800"/>
${ys.map((y, i) => `      <path class="${S}-arr" id="${S}-a${i + 1}" pathLength="1000" d="M${LW + 18} ${y} L${RX - 18} ${y} M${RX - 36} ${y - 16} L${RX - 18} ${y} L${RX - 36} ${y + 16}"/>`).join("\n")}
    </svg>
    <div id="${S}-hl">${tag("bad")}</div>
    <div id="${S}-hr">${tag("good")}</div>
${pairs.map((p, i) => `    <div class="${S}-row ${S}-my" id="${S}-m${i + 1}"><div class="${S}-no">${num(i)}</div>
      <div class="${S}-mt" id="${S}-mt${i + 1}">${esc(p.myth)}</div>
      <div class="${S}-stw"><div class="${S}-stamp" id="${S}-st${i + 1}">SAI</div></div></div>
    <div class="${S}-row ${S}-fc" id="${S}-f${i + 1}"><div class="${S}-lit" id="${S}-k${i + 1}"></div><div class="${S}-q" id="${S}-q${i + 1}">${ctx.icon("question")}</div>
      <div class="${S}-ftw"><div class="${S}-ft" id="${S}-ft${i + 1}">${esc(p.fact)}</div></div></div>`).join("\n")}
  </div>
</div>`;
    m.push({ prim: "draw", target: `#${S}-div`, at: w.a + 0.05, dur: 0.8 });
    m.push({ prim: "reveal", target: `#${S}-hl`, at: w.a + 0.05, dur: 0.45, from: { opacity: 0, y: -16 } });
    m.push({ prim: "reveal", target: `#${S}-hr`, at: w.a + 0.15, dur: 0.45, from: { opacity: 0, y: -16 } });
    pairs.forEach((_, i) => {
      const k = i + 1;
      const f = clamp(tf[i], 0.5);
      m.push({ prim: "reveal", target: `#${S}-m${k}`, at: w.a + 0.1 + i * 0.1, dur: 0.45, from: { opacity: 0, x: -40 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-f${k}`, at: w.a + 0.15 + i * 0.1, dur: 0.45, from: { opacity: 0, x: 40 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-mt${k}`, at: clamp(tm[i], 0.45), dur: 0.45, from: { opacity: 0 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-st${k}`, at: f, dur: 0.3, from: { opacity: 0, scale: 1.9 }, ease: "power4.in" });
      m.push({ prim: "draw", target: `#${S}-a${k}`, at: clamp(f + 0.25, 0.4), dur: 0.4 });
      m.push({ prim: "reveal", target: `#${S}-q${k}`, at: clamp(f + 0.25, 0.3), dur: 0.3, from: { opacity: 0.16 }, to: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-k${k}`, at: clamp(f + 0.35, 0.4), dur: 0.4, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-ft${k}`, at: clamp(f + 0.4, 0.45), dur: 0.45, from: { opacity: 0, x: -20 }, ease: ctx.ease });
    });
  }
  const d = ctx.drift(`#${S}-grp`, clamp(last + 0.9, 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

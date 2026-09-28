// balance — two sides (a label and 1–3 items each) weighed against each other; on the `tip` cue the balance tips
// toward the winning side (`winner`: left | right | even — the heavier, winning side goes down or pulls ahead;
// even wobbles and settles level). Each side's label lands on its cue, then its items one by one.
// scale-tilt: a beam scale on a pillar; items are chips stacked in two hanging pans, the side label under each pan;
//   the beam (with its needle over a drawn gauge) rotates and the pans follow with an elastic settle.
// tug: a tug of war; the sides are team cards at the left and right, a rope with a red pennant runs under them across
//   a dashed centre line; the rope strains in small jolts, then is pulled toward the winner, whose card leans back
//   while the other leans in.
// seesaw: a plank on a triangular fulcrum; items are crates that drop onto each end, the side label floats above its
//   stack; the plank pivots down on the winner's side and a gold arrow bobs above it.

import { keepInside } from "../_shared/dna-card.mjs";

const SIDES = ["left", "right"];
export const revealKeys = (slots) => SIDES.flatMap((s) => [s, ...slots[s].items.map((_, i) => `${s}.items.${i}`)]).concat("tip");

const r1 = (x) => Math.round(x * 10) / 10;
const rad = (d) => (d * Math.PI) / 180;
/** font size from [[maxChars, px], …] */
const size = (text, steps) => steps.find(([n]) => [...String(text)].length <= n)?.[1] ?? steps.at(-1)[1];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const mono = `"${theme.mono}", monospace`;
  const R = theme.radius ?? 18;
  const dir = slots.winner === "left" ? -1 : slots.winner === "right" ? 1 : 0;
  const clamp = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const tS = Object.fromEntries(SIDES.map((s) => [s, ctx.at(s)]));
  const tI = Object.fromEntries(SIDES.map((s) => [s, slots[s].items.map((_, i) => ctx.at(`${s}.items.${i}`))]));
  const lastItem = Math.max(...SIDES.flatMap((s) => [tS[s], ...tI[s]]));
  const TIP = 1.0; // the tip motion and its settle
  const tip = clamp(Math.max(ctx.at("tip"), lastItem + 0.3), TIP);
  const win = dir < 0 ? "left" : dir > 0 ? "right" : null;
  const m = [];
  let css, html;

  if (ctx.variant === "tug") {
    const SH = 130; // how far the rope is pulled
    const CW = 540, CY = 70;
    const cx = { left: 60, right: 1760 - 60 - CW };
    const iconOf = (s) => (slots[s].icon ? ctx.icon(slots[s].icon) : "");
    css = `
#${S}-grp { position: absolute; inset: 0; }
#${S}-bg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-mid { stroke: color-mix(in srgb, var(--ink) 30%, transparent); stroke-width: 3; stroke-dasharray: 14 12; }
#${S}-mk { fill: var(--gold); }
#${S}-gnd { stroke: color-mix(in srgb, var(--ink) 14%, transparent); stroke-width: 2; }
#${S}-rope { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; }
#${S}-rsv { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-rb { fill: none; stroke: color-mix(in srgb, var(--gold) 55%, var(--surface)); stroke-width: 18; stroke-linecap: round; }
.${S}-rw { fill: none; stroke: color-mix(in srgb, var(--ink) 35%, transparent); stroke-width: 18; stroke-dasharray: 6 16; }
#${S}-flag path { fill: var(--warn); }
#${S}-flag line { stroke: var(--ink); stroke-width: 4; }
.${S}-grip { fill: var(--surface); stroke: var(--cyan); stroke-width: 4; }
.${S}-man { position: absolute; top: 590px; width: 110px; height: 110px; color: color-mix(in srgb, var(--ink) 45%, transparent); }
.${S}-man svg { width: 110px; height: 110px; display: block; }
.${S}-cw { position: absolute; top: ${CY}px; width: ${CW}px; transform-origin: 50% 100%; }
.${S}-card { position: relative; box-sizing: border-box; width: ${CW}px; min-height: ${160 + Math.max(slots.left.items.length, slots.right.items.length) * 72}px; border-radius: ${R}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); padding: 28px 34px; }
.${S}-lit { position: absolute; inset: -2px; border-radius: ${R}px; border: 4px solid var(--gold); box-shadow: 0 0 26px color-mix(in srgb, var(--gold) 30%, transparent); }
.${S}-hd { display: flex; align-items: center; gap: 18px; height: 70px; }
.${S}-hi { width: 56px; height: 56px; color: var(--gold); flex: none; }
.${S}-hi svg { width: 56px; height: 56px; display: block; }
.${S}-hl { font-size: 46px; font-weight: 800; color: var(--gold); white-space: nowrap; }
.${S}-rule { height: 3px; margin: 18px 0 14px; background: color-mix(in srgb, var(--cyan) 45%, transparent); transform-origin: 0 50%; }
.${S}-it { display: flex; align-items: center; gap: 18px; height: 72px; font-size: 36px; font-weight: 700; color: var(--ink); white-space: nowrap; }
.${S}-bu { width: 16px; height: 16px; border-radius: 4px; background: var(--cyan); flex: none; }
.${S}-side { position: absolute; top: 18px; font-family: ${mono}; font-size: 22px; letter-spacing: 0.14em; color: var(--muted); }`;
    const card = (s) => `<div class="${S}-cw" id="${S}-c${s}" style="left: ${cx[s]}px"><div class="${S}-card" id="${S}-k${s}">
    ${win === s ? `<div class="${S}-lit" id="${S}-lt"></div>` : ""}
    <div class="${S}-hd" id="${S}-h${s}">${slots[s].icon ? `<span class="${S}-hi">${iconOf(s)}</span>` : ""}<span class="${S}-hl" style="font-size: ${size(slots[s].label, [[12, 50], [15, 42], [18, 36]])}px">${esc(slots[s].label)}</span></div>
    <div class="${S}-rule" id="${S}-r${s}"></div>
${slots[s].items.map((it, i) => `    <div class="${S}-it" id="${S}-${s}${i}" style="font-size: ${size(it, [[18, 36], [22, 32]])}px"><span class="${S}-bu"></span>${esc(it)}</div>`).join("\n")}
  </div></div>`;
    html = `<div id="${S}-grp">
  <svg id="${S}-bg" viewBox="0 0 1760 820">
    <line id="${S}-gnd" x1="80" y1="708" x2="1680" y2="708"/>
    <line id="${S}-mid" x1="880" y1="490" x2="880" y2="740"/>
    <path id="${S}-mk" d="M862 470 L898 470 L880 494 Z"/>
  </svg>
  <div id="${S}-rope"><svg id="${S}-rsv" viewBox="0 0 1760 820">
    <path class="${S}-rb" d="M150 566 Q880 590 1610 566"/>
    <path class="${S}-rw" d="M150 566 Q880 590 1610 566"/>
    <circle class="${S}-grip" cx="330" cy="570" r="18"/><circle class="${S}-grip" cx="1430" cy="570" r="18"/>
    <g id="${S}-flag"><line x1="880" y1="578" x2="880" y2="660"/><path d="M880 600 L950 626 L880 652 Z"/></g>
  </svg>
    <div class="${S}-man" style="left: 170px">${ctx.icon("person")}</div>
    <div class="${S}-man" style="left: 1480px">${ctx.icon("person")}</div>
  </div>
${card("left")}
${card("right")}
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-bg`, at: w.a, dur: 0.5, from: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-rope`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0, y: 30 }, ease: ctx.ease },
    );
    SIDES.forEach((s, k) => {
      const enter = Math.min(tS[s], w.a + 0.1 + k * 0.1);
      m.push({ prim: "reveal", target: `#${S}-k${s}`, at: enter, dur: 0.5, from: { opacity: 0, x: s === "left" ? -60 : 60 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-h${s}`, at: clamp(tS[s], 0.45), dur: 0.45, from: { opacity: 0, y: 18 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-r${s}`, at: clamp(tS[s] + 0.15, 0.5), dur: 0.5, from: { scaleX: 0 }, ease: "power2.out" });
      tI[s].forEach((t, i) => m.push({ prim: "reveal", target: `#${S}-${s}${i}`, at: clamp(t, 0.4), dur: 0.4, from: { opacity: 0, x: s === "left" ? -30 : 30 }, ease: ctx.ease }));
    });
    // the rope strains in small jolts until the pull (x only; the entrance above moves y)
    const j0 = w.a + 0.7;
    let jx = 0, k = 0;
    for (let t = j0; t + 0.4 < tip - 0.05; t += 0.42, k++) {
      const nx = k % 2 ? -10 : 10;
      m.push({ prim: "slide", target: `#${S}-rope`, at: t, dur: 0.38, from: { x: jx }, to: { x: nx }, ease: "sine.inOut" });
      jx = nx;
    }
    m.push({ prim: "slide", target: `#${S}-rope`, at: tip, dur: TIP - 0.05, from: { x: jx }, to: { x: dir * SH }, ease: dir ? "back.out(1.6)" : "elastic.out(1, 0.4)" });
    // the cards lean: the winner back (away from the centre), the other in (toward it); even — both lean back
    SIDES.forEach((s) => {
      const out = s === "left" ? -1 : 1; // outward direction (positive rotation = clockwise = toward the right)
      const back = win === s || !win;
      const rot = back ? out * 4 : -out * 5;
      const dx = back ? out * 30 : -out * 50;
      m.push({ prim: "slide", target: `#${S}-c${s}`, at: tip, dur: TIP - 0.05, from: { x: 0, rotation: 0 }, to: { x: dx, rotation: rot }, ease: "back.out(1.4)" });
    });
    if (win) m.push({ prim: "reveal", target: `#${S}-lt`, at: tip + 0.3, dur: 0.4, from: { opacity: 0 } });
  } else if (ctx.variant === "seesaw") {
    const P = { x: 880, y: 600 };
    const L = 680; // half plank
    const TH = 9 * dir;
    const CRW = 400, CRH = 74;
    const sx = { left: 230, right: 1130 }; // stack centres, plank-local
    css = `
#${S}-grp { position: absolute; inset: 0; }
#${S}-bg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-arc { fill: none; stroke: color-mix(in srgb, var(--cyan) 34%, transparent); stroke-width: 3; stroke-dasharray: 8 14; }
.${S}-slot { position: absolute; width: ${CRW}px; height: ${CRH}px; box-sizing: border-box; border-radius: 12px; border: 2px dashed color-mix(in srgb, var(--ink) 22%, transparent); }
#${S}-tk { stroke: color-mix(in srgb, var(--cyan) 45%, transparent); stroke-width: 3; stroke-linecap: round; }
#${S}-gnd { stroke: color-mix(in srgb, var(--ink) 16%, transparent); stroke-width: 3; stroke-linecap: round; }
#${S}-ful { fill: color-mix(in srgb, var(--gold) 22%, var(--surface)); stroke: var(--gold); stroke-width: 4; stroke-linejoin: round; }
#${S}-pin { fill: var(--gold); }
#${S}-pl { position: absolute; left: ${P.x - L}px; top: 0; width: ${2 * L}px; height: ${P.y + 10}px; transform-origin: ${L}px ${P.y}px; }
#${S}-bar { position: absolute; left: 0; top: ${P.y - 20}px; width: ${2 * L}px; height: 24px; box-sizing: border-box; border-radius: 12px;
  background: var(--surface); border: 3px solid var(--gold); }
.${S}-crate { position: absolute; width: ${CRW}px; height: ${CRH}px; box-sizing: border-box; border-radius: 12px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--cyan) 45%, transparent); display: flex; align-items: center; gap: 16px; padding: 0 22px 0 0; overflow: hidden; }
.${S}-strip { width: 12px; align-self: stretch; background: var(--cyan); flex: none; }
.${S}-ct { font-weight: 700; color: var(--ink); white-space: nowrap; }
.${S}-glow { position: absolute; inset: -2px; border-radius: 12px; border: 3px solid var(--gold); background: color-mix(in srgb, var(--gold) 10%, transparent); }
.${S}-tag { position: absolute; height: 72px; display: flex; align-items: center; justify-content: center; gap: 14px; padding: 0 30px; box-sizing: border-box;
  border-radius: 36px; background: color-mix(in srgb, var(--gold) 16%, var(--surface)); border: 2px solid var(--gold); white-space: nowrap; }
.${S}-tl { font-weight: 800; color: var(--gold); }
.${S}-ti { width: 44px; height: 44px; color: var(--gold); }
.${S}-ti svg { width: 44px; height: 44px; display: block; }
.${S}-tie { position: absolute; width: 3px; background: color-mix(in srgb, var(--gold) 55%, transparent); }
#${S}-arw { position: absolute; top: 40px; width: 90px; height: 110px; }
#${S}-arw svg { width: 90px; height: 110px; display: block; overflow: visible; }
#${S}-arw path { fill: none; stroke: var(--gold); stroke-width: 12; stroke-linecap: round; stroke-linejoin: round; }`;
    const stack = (s) => {
      const n = slots[s].items.length;
      const top = P.y - 20 - n * (CRH + 8);
      const tagY = top - 118;
      const tw = Math.min(560, [...slots[s].label].length * 40 * 0.6 + (slots[s].icon ? 110 : 60));
      return `  <div class="${S}-tie" style="left: ${sx[s] - 1}px; top: ${tagY + 72}px; height: ${top - tagY - 72}px"></div>
  <div class="${S}-tag" id="${S}-g${s}" style="left: ${r1(sx[s] - tw / 2)}px; top: ${tagY}px; width: ${r1(tw)}px">${slots[s].icon ? `<span class="${S}-ti">${ctx.icon(slots[s].icon)}</span>` : ""}<span class="${S}-tl" style="font-size: ${size(slots[s].label, [[14, 40], [18, 34]])}px">${esc(slots[s].label)}</span></div>
${slots[s].items.map((_, i) => `  <div class="${S}-slot" style="left: ${sx[s] - CRW / 2}px; top: ${P.y - 20 - (i + 1) * (CRH + 8) + 8}px"></div>`).join("\n")}
${slots[s].items.map((it, i) => `  <div class="${S}-crate" id="${S}-${s}${i}" style="left: ${sx[s] - CRW / 2}px; top: ${P.y - 20 - (i + 1) * (CRH + 8) + 8}px">${win === s ? `<div class="${S}-glow" id="${S}-gl${s}${i}"></div>` : ""}<span class="${S}-strip"></span><span class="${S}-ct" style="font-size: ${size(it, [[16, 34], [22, 29]])}px">${esc(it)}</span></div>`).join("\n")}`;
    };
    const ticks = [-TH || -9, 0, TH || 9].map((a) => {
      const t = rad(a - 90);
      return `M${r1(P.x + 520 * Math.cos(t))} ${r1(P.y + 520 * Math.sin(t))} L${r1(P.x + 560 * Math.cos(t))} ${r1(P.y + 560 * Math.sin(t))}`;
    }).join(" ");
    const ax = win === "left" ? P.x - L + sx.left - 45 : P.x - L + sx.right - 45;
    html = `<div id="${S}-grp">
  <svg id="${S}-bg" viewBox="0 0 1760 820">
    <path id="${S}-arc" d="M${P.x - 540} ${P.y} A540 540 0 0 1 ${P.x + 540} ${P.y}"/>
    <path id="${S}-tk" d="${ticks}"/>
    <line id="${S}-gnd" x1="180" y1="762" x2="1580" y2="762"/>
    <path id="${S}-ful" d="M${P.x} ${P.y + 6} L${P.x + 100} 760 L${P.x - 100} 760 Z"/>
    <circle id="${S}-pin" cx="${P.x}" cy="${P.y}" r="12"/>
  </svg>
  <div id="${S}-pl">
    <div id="${S}-bar"></div>
${stack("left")}
${stack("right")}
  </div>
  ${win ? `<div id="${S}-arw" style="left: ${ax}px"><svg viewBox="0 0 90 110"><path d="M45 8 L45 96 M12 64 L45 98 L78 64"/></svg></div>` : ""}
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-bg`, at: w.a, dur: 0.5, from: { opacity: 0, y: 20 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-bar`, at: w.a + 0.1, dur: 0.55, from: { opacity: 0, scaleX: 0.4 }, ease: ctx.ease },
    );
    SIDES.forEach((s) => {
      m.push({ prim: "reveal", target: `#${S}-g${s}`, at: clamp(tS[s], 0.5), dur: 0.5, from: { opacity: 0, y: -40, scale: 0.8 }, ease: "back.out(1.8)" });
      tI[s].forEach((t, i) => m.push({ prim: "reveal", target: `#${S}-${s}${i}`, at: clamp(t, 0.5), dur: 0.5, from: { opacity: 0, y: -140 }, ease: "bounce.out" }));
      if (win === s) tI[s].forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-gl${s}${i}`, at: tip + 0.35 + i * 0.05, dur: 0.4, from: { opacity: 0 } }));
    });
    if (dir) m.push({ prim: "slide", target: `#${S}-pl`, at: tip, dur: TIP - 0.05, from: { rotation: 0 }, to: { rotation: TH }, ease: "elastic.out(1, 0.45)" });
    else {
      m.push({ prim: "slide", target: `#${S}-pl`, at: tip, dur: 0.4, from: { rotation: 0 }, to: { rotation: 4 }, ease: "sine.out" });
      m.push({ prim: "slide", target: `#${S}-pl`, at: tip + 0.4 + ctx.gap + 0.01, dur: TIP - 0.47, from: { rotation: 4 }, to: { rotation: 0 }, ease: "elastic.out(1, 0.35)" });
    }
    if (win) {
      m.push({ prim: "reveal", target: `#${S}-arw`, at: tip + 0.2, dur: 0.45, from: { opacity: 0, y: -40 }, ease: ctx.ease });
      const b0 = tip + 0.7;
      const hops = Math.floor((w.b - 0.1 - b0) / 0.5);
      for (let h = 0; h < hops; h++) m.push({ prim: "slide", target: `#${S}-arw`, at: b0 + h * 0.5, dur: 0.46, from: { y: h % 2 ? 14 : 0 }, to: { y: h % 2 ? 0 : 14 }, ease: "sine.inOut" });
    }
  } else {
    // scale-tilt
    const P = { x: 880, y: 170 };
    const L = 560; // half beam
    const TH = 7 * dir;
    const dy = r1(L * Math.sin(rad(Math.abs(TH))));
    const PW = 520, TRAY = 560; // pan box width, tray y (stage)
    const px = { left: P.x - L, right: P.x + L };
    css = `
#${S}-grp { position: absolute; inset: 0; }
#${S}-bg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-gauge { fill: none; stroke: color-mix(in srgb, var(--cyan) 30%, transparent); stroke-width: 3; }
#${S}-gt { stroke: color-mix(in srgb, var(--cyan) 50%, transparent); stroke-width: 3; stroke-linecap: round; }
#${S}-pil { fill: color-mix(in srgb, var(--ink) 16%, var(--surface)); }
#${S}-base { fill: var(--surface); stroke: color-mix(in srgb, var(--gold) 55%, transparent); stroke-width: 3; }
#${S}-beam { position: absolute; left: ${P.x - L - 30}px; top: ${P.y - 140}px; width: ${2 * L + 60}px; height: 280px; }
#${S}-beam svg { width: ${2 * L + 60}px; height: 280px; display: block; overflow: visible; }
#${S}-bm { fill: var(--gold); }
#${S}-nd { stroke: var(--warn); stroke-width: 6; stroke-linecap: round; }
#${S}-hub { fill: var(--surface); stroke: var(--gold); stroke-width: 6; }
.${S}-pan { position: absolute; top: ${P.y}px; width: ${PW}px; height: ${TRAY - P.y + 170}px; }
.${S}-pan svg { position: absolute; left: 0; top: 0; width: ${PW}px; height: ${TRAY - P.y + 170}px; overflow: visible; }
.${S}-str { stroke: color-mix(in srgb, var(--ink) 40%, transparent); stroke-width: 3; }
.${S}-tray { fill: var(--surface); stroke: var(--gold); stroke-width: 4; }
.${S}-trl { fill: none; stroke: var(--gold); stroke-width: 8; opacity: 0.9; }
.${S}-gc { position: absolute; left: ${PW / 2 - 150}px; width: 300px; height: 62px; box-sizing: border-box; border-radius: 31px;
  border: 2px dashed color-mix(in srgb, var(--ink) 20%, transparent); }
.${S}-chip { position: absolute; left: 0; width: ${PW}px; height: 62px; display: flex; justify-content: center; }
.${S}-cb { height: 62px; box-sizing: border-box; padding: 0 26px; border-radius: 31px; background: var(--surface); display: flex; align-items: center;
  border: 2px solid color-mix(in srgb, var(--cyan) 55%, transparent); font-weight: 700; color: var(--ink); white-space: nowrap; }
.${S}-lab { position: absolute; left: 0; top: ${TRAY - P.y + 78}px; width: ${PW}px; display: flex; justify-content: center; align-items: center; gap: 14px; }
.${S}-li { width: 48px; height: 48px; color: var(--cyan); }
.${S}-li svg { width: 48px; height: 48px; display: block; }
.${S}-lt { font-weight: 800; color: var(--ink); white-space: nowrap; }
.${S}-wl { color: var(--gold); }`;
    const hook = PW / 2;
    const ty = TRAY - P.y; // tray y, pan-local
    const pan = (s) => `  <div class="${S}-pan" id="${S}-p${s}" style="left: ${px[s] - PW / 2}px">
    <svg viewBox="0 0 ${PW} ${ty + 170}">
      <line class="${S}-str" x1="${hook}" y1="6" x2="14" y2="${ty}"/><line class="${S}-str" x1="${hook}" y1="6" x2="${PW - 14}" y2="${ty}"/>
      <path class="${S}-tray" d="M4 ${ty} L${PW - 4} ${ty} Q${PW - 40} ${ty + 58} ${hook} ${ty + 58} Q40 ${ty + 58} 4 ${ty} Z"/>
      ${win === s ? `<path class="${S}-trl" id="${S}-tl" d="M4 ${ty} Q40 ${ty + 58} ${hook} ${ty + 58} Q${PW - 40} ${ty + 58} ${PW - 4} ${ty}"/>` : ""}
    </svg>
${slots[s].items.map((_, i) => `    <div class="${S}-gc" style="top: ${ty - 8 - (i + 1) * 70}px"></div>`).join("\n")}
${slots[s].items.map((it, i) => `    <div class="${S}-chip" id="${S}-${s}${i}" style="top: ${ty - 8 - (i + 1) * 70}px"><span class="${S}-cb" style="font-size: ${size(it, [[16, 32], [22, 28]])}px">${esc(it)}</span></div>`).join("\n")}
    <div class="${S}-lab" id="${S}-l${s}">${slots[s].icon ? `<span class="${S}-li">${ctx.icon(slots[s].icon)}</span>` : ""}<span class="${S}-lt${win === s ? ` ${S}-wl` : ""}" style="font-size: ${size(slots[s].label, [[12, 46], [15, 40], [18, 36]])}px">${esc(slots[s].label)}</span></div>
  </div>`;
    const gt = [-14, -7, 0, 7, 14].map((a) => {
      const t = rad(a - 90);
      return `M${r1(P.x + 118 * Math.cos(t))} ${r1(P.y + 118 * Math.sin(t))} L${r1(P.x + 136 * Math.cos(t))} ${r1(P.y + 136 * Math.sin(t))}`;
    }).join(" ");
    const bx = L + 30, by = 140; // pivot, beam-local
    html = `<div id="${S}-grp">
  <svg id="${S}-bg" viewBox="0 0 1760 820">
    <path id="${S}-gauge" d="M${r1(P.x - 110 * Math.sin(rad(20)))} ${r1(P.y - 110 * Math.cos(rad(20)))} A110 110 0 0 1 ${r1(P.x + 110 * Math.sin(rad(20)))} ${r1(P.y - 110 * Math.cos(rad(20)))}"/>
    <path id="${S}-gt" d="${gt}"/>
    <rect id="${S}-pil" x="${P.x - 14}" y="${P.y}" width="28" height="${750 - P.y}"/>
    <path id="${S}-base" d="M${P.x - 170} 772 L${P.x - 110} 740 L${P.x + 110} 740 L${P.x + 170} 772 Z"/>
  </svg>
${pan("left")}
${pan("right")}
  <div id="${S}-beam"><svg viewBox="0 0 ${2 * L + 60} 280">
    <line id="${S}-nd" x1="${bx}" y1="${by}" x2="${bx}" y2="${by - 104}"/>
    <rect id="${S}-bm" x="20" y="${by - 11}" width="${2 * L + 20}" height="22" rx="11"/>
    <circle class="${S}-tray" cx="30" cy="${by}" r="14"/><circle class="${S}-tray" cx="${2 * L + 30}" cy="${by}" r="14"/>
    <circle id="${S}-hub" cx="${bx}" cy="${by}" r="24"/>
  </svg></div>
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-bg`, at: w.a, dur: 0.5, from: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-beam`, at: w.a + 0.05, dur: 0.55, from: { opacity: 0, scaleX: 0.5 }, ease: ctx.ease },
    );
    SIDES.forEach((s, k) => {
      m.push({ prim: "reveal", target: `#${S}-p${s}`, at: w.a + 0.15 + k * 0.1, dur: 0.5, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-l${s}`, at: clamp(tS[s], 0.45), dur: 0.45, from: { opacity: 0, y: 20 }, ease: ctx.ease });
      tI[s].forEach((t, i) => m.push({ prim: "reveal", target: `#${S}-${s}${i}`, at: clamp(t, 0.5), dur: 0.5, from: { opacity: 0, y: -90 }, ease: "bounce.out" }));
    });
    if (dir) {
      m.push({ prim: "slide", target: `#${S}-beam`, at: tip, dur: TIP - 0.05, from: { rotation: 0 }, to: { rotation: TH }, ease: "elastic.out(1, 0.5)" });
      SIDES.forEach((s) => m.push({ prim: "slide", target: `#${S}-p${s}`, at: tip, dur: TIP - 0.05, from: { y: 0 }, to: { y: (s === "right" ? 1 : -1) * dir * dy }, ease: "elastic.out(1, 0.5)" }));
      m.push({ prim: "reveal", target: `#${S}-tl`, at: tip + 0.35, dur: 0.4, from: { opacity: 0 } });
    } else {
      const d1 = r1(L * Math.sin(rad(4)));
      const t2 = tip + 0.4 + ctx.gap + 0.01;
      m.push({ prim: "slide", target: `#${S}-beam`, at: tip, dur: 0.4, from: { rotation: 0 }, to: { rotation: 4 }, ease: "sine.out" });
      m.push({ prim: "slide", target: `#${S}-beam`, at: t2, dur: TIP - 0.47, from: { rotation: 4 }, to: { rotation: 0 }, ease: "elastic.out(1, 0.35)" });
      SIDES.forEach((s) => {
        const sg = s === "right" ? 1 : -1;
        m.push({ prim: "slide", target: `#${S}-p${s}`, at: tip, dur: 0.4, from: { y: 0 }, to: { y: sg * d1 }, ease: "sine.out" });
        m.push({ prim: "slide", target: `#${S}-p${s}`, at: t2, dur: TIP - 0.47, from: { y: sg * d1 }, to: { y: 0 }, ease: "elastic.out(1, 0.35)" });
      });
    }
  }

  const d = ctx.drift(`#${S}-grp`, clamp(tip + TIP + ctx.gap, 0.7), 12);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

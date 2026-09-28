// iceberg — one visible "tip" above the waterline and 2–4 hidden causes below it.
// The water, the berg and every hidden slot are on stage from the window start; the tip lights on its keyword and
// each hidden cause surfaces on its own keyword.
// waterline: a classic iceberg — a bright peak over a rolling waterline, a huge translucent mass below with the
//   hidden causes as pills inside it; each pill starts as a faint "?" slot.
// sonar: the tip sits on the surface strip; below, a sonar beam sweeps a half-disc of range rings and each hidden
//   cause pings as a blip with its label.
// cutaway: a geological cross-section — the peak on the left, one stratum per hidden cause; a drill probe descends
//   stratum by stratum and each layer's label is tied to it.

import { fit as sizeFor, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["tip", ...slots.hidden.map((_, i) => `hidden.${i}`)];

const r1 = (x) => Math.round(x * 10) / 10;
const num = (i) => String(i + 1).padStart(2, "0");
const longest = (list) => list.reduce((a, s) => ([...s].length > [...a].length ? s : a), "");

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const hidden = slots.hidden;
  const n = hidden.length;
  const tT = ctx.at("tip");
  const t = hidden.map((_, i) => ctx.at(`hidden.${i}`));
  const last = Math.max(tT, ...t);
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const clamp = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const enter = (i) => Math.min(t[i], w.a + 0.1 + i * 0.07);
  const m = [];
  const icon = (name, cls, id) => (name ? `<span class="${S}-${cls}"${id ? ` id="${id}"` : ""}>${ctx.icon(name)}</span>` : "");
  const tipFs = sizeFor(slots.tip.label, [[14, 54], [18, 48], [22, 42]]);
  const hidFs = sizeFor(longest(hidden.map((h) => h.label)), [[16, 40], [22, 36], [26, 32]]);
  const kicker = (id, text) => `<div class="${S}-kick" id="${id}">${text}</div>`;
  const baseCss = `
#${S}-grp { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-kick { font-family: ${mono}; font-size: 24px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); white-space: nowrap; }
.${S}-num { font-family: ${mono}; font-size: 26px; font-weight: 700; color: var(--cyan); flex: none; }
.${S}-ic { width: 44px; height: 44px; color: var(--cyan); flex: none; }
.${S}-ic svg { width: 44px; height: 44px; display: block; }
.${S}-ti { width: 56px; height: 56px; color: var(--gold); flex: none; }
.${S}-ti svg { width: 56px; height: 56px; display: block; }
.${S}-tl { font-size: ${tipFs}px; font-weight: 800; line-height: 1.1; color: var(--ink); white-space: nowrap; }
.${S}-hl { font-size: ${hidFs}px; font-weight: 800; line-height: 1.15; color: var(--ink); white-space: nowrap; }
.${S}-ice { fill: color-mix(in srgb, var(--ink) 82%, var(--cyan)); }
.${S}-icelit { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linejoin: round; stroke-dasharray: 1000; }`;
  let css, html;

  if (ctx.variant === "sonar") {
    // ── sonar: surface strip with the tip, a sweeping beam and blips below ────
    const P = { x: 880, y: 214 }, RR = 560;
    const rings = [140, 280, 420, 560];
    const spots = { 2: [[680, 440, "L"], [1110, 620, "R"]], 3: [[680, 390, "L"], [1110, 520, "R"], [720, 680, "L"]],
      4: [[680, 360, "L"], [1110, 460, "R"], [720, 600, "L"], [1120, 720, "R"]] }[n];
    const lblW = 620;
    css = `${baseCss}
.${S}-ring { fill: none; stroke: color-mix(in srgb, var(--cyan) 26%, transparent); stroke-width: 2; stroke-dasharray: 6 10; }
#${S}-water { position: absolute; left: 0; top: ${P.y}px; width: 1760px; height: ${820 - P.y}px; border-radius: ${R}px ${R}px 0 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--cyan) 12%, transparent), transparent 85%); }
#${S}-sea { fill: none; stroke: var(--cyan); stroke-width: 3; stroke-dasharray: 1000; opacity: 0.8; }
#${S}-beam { position: absolute; left: ${P.x}px; top: ${P.y - 2}px; width: ${RR}px; height: 4px; transform-origin: 0 50%;
  background: linear-gradient(90deg, color-mix(in srgb, var(--cyan) 20%, transparent), var(--cyan)); border-radius: 2px; }
#${S}-fan { position: absolute; left: 0; top: -118px; width: ${RR}px; height: 240px; overflow: visible; }
#${S}-fan path { fill: color-mix(in srgb, var(--cyan) 12%, transparent); }
#${S}-tipk { position: absolute; left: 80px; top: 40px; width: 640px; text-align: right; }
#${S}-tip { position: absolute; left: 60px; top: 80px; width: 660px; height: 100px; display: flex; align-items: center; justify-content: flex-end; gap: 16px; }
#${S}-downk { position: absolute; left: 1060px; top: 120px; display: flex; align-items: center; gap: 14px; color: var(--muted); }
#${S}-downk .${S}-kick { color: var(--muted); }
#${S}-downk svg { width: 28px; height: 34px; }
#${S}-downk path { fill: none; stroke: var(--muted); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
.${S}-dot { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; background: var(--gold);
  box-shadow: 0 0 18px color-mix(in srgb, var(--gold) 70%, transparent); }
.${S}-ping { position: absolute; width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 50%; border: 3px solid var(--gold); }
.${S}-lbl { position: absolute; width: ${lblW}px; height: 70px; display: flex; align-items: center; gap: 14px; }
.${S}-pill { display: flex; align-items: center; gap: 14px; padding: 10px 22px; border-radius: ${R}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--gold) 45%, transparent); }
${spots.map(([x, y, side], i) => `#${S}-d${i + 1}, #${S}-g${i + 1} { left: ${x}px; top: ${y}px; }
#${S}-b${i + 1} { left: ${side === "L" ? x - 30 - lblW : x + 30}px; top: ${y - 35}px; justify-content: ${side === "L" ? "flex-end" : "flex-start"}; }`).join("\n")}`;
    const arcD = (r) => `M${P.x - r} ${P.y} A${r} ${r} 0 0 0 ${P.x + r} ${P.y}`;
    const fanH = Math.tan((9 * Math.PI) / 180) * RR;
    html = `<div id="${S}-grp">
  <div id="${S}-water"></div>
  <svg id="${S}-svg" viewBox="0 0 1760 820">
${rings.map((r, i) => `    <path class="${S}-ring" id="${S}-r${i + 1}" d="${arcD(r)}"/>`).join("\n")}
    <path id="${S}-sea" pathLength="1000" d="M0 ${P.y} L1760 ${P.y}"/>
    <polygon class="${S}-ice" id="${S}-ice" points="760,${P.y} 830,130 880,86 935,124 1004,${P.y}"/>
    <path class="${S}-icelit" id="${S}-icel" pathLength="1000" d="M760 ${P.y} L830 130 L880 86 L935 124 L1004 ${P.y}"/>
  </svg>
  <div id="${S}-beam"><svg id="${S}-fan" viewBox="0 0 ${RR} 240"><path d="M0 120 L${RR} ${r1(120 - fanH)} L${RR} ${r1(120 + fanH)} Z"/></svg></div>
  <div id="${S}-tipk">${kicker(`${S}-kk1`, "Bề nổi")}</div>
  <div id="${S}-tip">${icon(slots.tip.icon, "ti")}<span class="${S}-tl">${esc(slots.tip.label)}</span></div>
  <div id="${S}-downk"><svg viewBox="0 0 28 34"><path d="M14 3 L14 30 M4 20 L14 31 L24 20"/></svg>${kicker(`${S}-kk2`, "Bên dưới")}</div>
${hidden.map((h, i) => `  <div class="${S}-ping" id="${S}-g${i + 1}"></div>
  <div class="${S}-dot" id="${S}-d${i + 1}"></div>
  <div class="${S}-lbl" id="${S}-b${i + 1}"><div class="${S}-pill"><span class="${S}-num">${num(i)}</span>${icon(h.icon, "ic")}<span class="${S}-hl">${esc(h.label)}</span></div></div>`).join("\n")}
</div>`;
    m.push({ prim: "draw", target: `#${S}-sea`, at: w.a, dur: 0.7 });
    m.push({ prim: "reveal", target: `#${S}-water`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0 } });
    rings.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-r${i + 1}`, at: w.a + 0.1 + i * 0.08, dur: 0.5, from: { opacity: 0 } }));
    m.push({ prim: "reveal", target: `#${S}-ice`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, y: 30 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-downk`, at: w.a + 0.2, dur: 0.5, from: { opacity: 0, y: -12 } });
    m.push({ prim: "reveal", target: `#${S}-beam`, at: w.a + 0.1, dur: 0.4, from: { opacity: 0 } });
    // the beam sweeps the half-disc back and forth until the shot ends
    const seg = 2.2;
    let a0 = w.a + 0.1, dir = 0;
    while (a0 + 0.6 < w.b - 0.05) {
      const d = Math.min(seg, w.b - 0.05 - a0);
      const [f, to] = dir ? [155, 25] : [25, 155];
      const part = d / seg;
      m.push({ prim: "slide", target: `#${S}-beam`, at: a0, dur: d - 0.02, from: { rotation: f }, to: { rotation: r1(f + (to - f) * part) }, ease: part < 1 ? "none" : "sine.inOut" });
      a0 += d;
      dir = 1 - dir;
    }
    m.push({ prim: "reveal", target: `#${S}-tipk`, at: clamp(tT, 0.4), dur: 0.4, from: { opacity: 0 } });
    m.push({ prim: "reveal", target: `#${S}-tip`, at: clamp(tT, 0.5), dur: 0.5, from: { opacity: 0, x: 30 }, ease: ctx.ease });
    m.push({ prim: "draw", target: `#${S}-icel`, at: clamp(tT, 0.6), dur: 0.6 });
    hidden.forEach((_, i) => {
      const k = i + 1;
      const ghost = t[i] - enter(i) >= 0.7;
      if (ghost) m.push({ prim: "reveal", target: `#${S}-d${k}`, at: enter(i), dur: 0.4, from: { opacity: 0, scale: 0.4 }, to: { opacity: 0.3, scale: 0.7 } });
      m.push({ prim: "reveal", target: `#${S}-d${k}`, at: clamp(ghost ? t[i] : Math.max(t[i], enter(i)), 0.4), dur: 0.4,
        from: ghost ? { opacity: 0.3, scale: 0.7 } : { opacity: 0, scale: 0.4 }, to: { opacity: 1, scale: 1 }, ease: "back.out(2.4)" });
      m.push({ prim: "reveal", target: `#${S}-g${k}`, at: clamp(t[i], 0.8), dur: 0.8, from: { opacity: 1, scale: 0.6 }, to: { opacity: 0, scale: 3.2 }, ease: "power2.out" });
      m.push({ prim: "reveal", target: `#${S}-b${k}`, at: clamp(t[i] + 0.15, 0.45), dur: 0.45, from: { opacity: 0, x: spots[i][2] === "L" ? 30 : -30 }, ease: ctx.ease });
    });
  } else if (ctx.variant === "cutaway") {
    // ── cutaway: strata cross-section with a drill probe ──────────────────────
    const wl = 196, bot = 800, bandH = (bot - wl - 10) / n, PX = 250, LX = 540;
    const top = (i) => r1(wl + 10 + i * bandH);
    const mid = (i) => r1(top(i) + bandH / 2);
    const wave = (y, amp, ph) => {
      const pts = Array.from({ length: 9 }, (_, k) => [k * 220, r1(y + amp * Math.sin(k * 1.3 + ph))]);
      return `M${pts[0][0]} ${pts[0][1]} ${pts.slice(1).map(([x, yy], k) => `Q${r1(pts[k][0] + 110)} ${r1(pts[k][1] + (k % 2 ? amp : -amp))} ${x} ${yy}`).join(" ")}`;
    };
    const stratum = (i) => `${wave(top(i), i ? 10 : 0, i * 0.9)} L1760 ${r1(i === n - 1 ? bot : top(i + 1) + 12)} L0 ${r1(i === n - 1 ? bot : top(i + 1) + 12)} Z`;
    css = `${baseCss}
.${S}-st { stroke: color-mix(in srgb, var(--cyan) 40%, transparent); stroke-width: 2; }
${hidden.map((_, i) => `#${S}-s${i + 1} { fill: color-mix(in srgb, var(--cyan) ${8 + i * 5}%, transparent); }`).join("\n")}
#${S}-wl { fill: none; stroke: var(--cyan); stroke-width: 4; stroke-dasharray: 1000; }
.${S}-probe { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-dasharray: 1000; }
.${S}-tie { fill: none; stroke: color-mix(in srgb, var(--gold) 60%, transparent); stroke-width: 2; stroke-dasharray: 1000; }
#${S}-rail { fill: none; stroke: color-mix(in srgb, var(--ink) 20%, transparent); stroke-width: 2; stroke-dasharray: 4 10; }
#${S}-head { position: absolute; left: ${PX - 22}px; top: ${wl - 22}px; width: 44px; height: 44px; }
#${S}-hc { position: absolute; inset: 0; border-radius: 50%; background: var(--gold); box-shadow: 0 0 24px 6px color-mix(in srgb, var(--gold) 50%, transparent); }
#${S}-tipk { position: absolute; left: ${LX}px; top: 22px; }
#${S}-tip { position: absolute; left: ${LX}px; top: 60px; width: ${1740 - LX}px; height: 100px; display: flex; align-items: center; gap: 18px; }
.${S}-row { position: absolute; left: ${LX}px; width: ${1740 - LX}px; height: 64px; display: flex; align-items: center; gap: 18px; }
${hidden.map((_, i) => `#${S}-h${i + 1} { top: ${r1(mid(i) - 32)}px; }`).join("\n")}`;
    const peak = `100,${wl} 170,140 220,112 262,58 300,96 350,122 420,${wl}`;
    html = `<div id="${S}-grp">
  <svg id="${S}-svg" viewBox="0 0 1760 820">
${hidden.map((_, i) => `    <path class="${S}-st" id="${S}-s${i + 1}" d="${stratum(i)}"/>`).join("\n")}
    <path id="${S}-wl" pathLength="1000" d="M0 ${wl} L1760 ${wl}"/>
    <polygon class="${S}-ice" id="${S}-ice" points="${peak}"/>
    <path class="${S}-icelit" id="${S}-icel" pathLength="1000" d="M${peak.split(" ").join(" L")}"/>
    <path id="${S}-rail" d="M${PX} ${wl} L${PX} ${bot - 10}"/>
${hidden.map((_, i) => `    <path class="${S}-probe" id="${S}-p${i + 1}" pathLength="1000" d="M${PX} ${i ? mid(i - 1) : wl} L${PX} ${mid(i)}"/>
    <path class="${S}-tie" id="${S}-e${i + 1}" pathLength="1000" d="M${PX + 26} ${mid(i)} L${LX - 20} ${mid(i)}"/>`).join("\n")}
  </svg>
  <div id="${S}-head"><div id="${S}-hc"></div></div>
  <div id="${S}-tipk">${kicker(`${S}-kk1`, "Bề nổi")}</div>
  <div id="${S}-tip">${icon(slots.tip.icon, "ti")}<span class="${S}-tl">${esc(slots.tip.label)}</span></div>
${hidden.map((h, i) => `  <div class="${S}-row" id="${S}-h${i + 1}"><span class="${S}-num">${num(i)}</span>${icon(h.icon, "ic")}<span class="${S}-hl">${esc(h.label)}</span></div>`).join("\n")}
</div>`;
    m.push({ prim: "draw", target: `#${S}-wl`, at: w.a, dur: 0.7 });
    m.push({ prim: "reveal", target: `#${S}-ice`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, y: 24 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-rail`, at: w.a + 0.2, dur: 0.5, from: { opacity: 0 } });
    m.push({ prim: "reveal", target: `#${S}-head`, at: w.a + 0.2, dur: 0.4, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" });
    m.push({ prim: "reveal", target: `#${S}-tipk`, at: clamp(tT, 0.4), dur: 0.4, from: { opacity: 0 } });
    m.push({ prim: "reveal", target: `#${S}-tip`, at: clamp(tT, 0.5), dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    m.push({ prim: "draw", target: `#${S}-icel`, at: clamp(tT, 0.6), dur: 0.6 });
    let prevY = 0, headEnd = w.a + 0.62;
    hidden.forEach((_, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-s${k}`, at: enter(i), dur: 0.5, from: { opacity: 0, y: 20 }, ease: ctx.ease });
      m.push({ prim: "draw", target: `#${S}-p${k}`, at: clamp(t[i], 0.45), dur: 0.45, ease: "power1.in" });
      // the head rides down to this stratum; never two moves at once
      const y = r1(mid(i) - wl);
      const at = Math.max(clamp(t[i], 0.45), headEnd + 0.03);
      const d = Math.min(0.45, w.b - 0.05 - at);
      if (d >= 0.12) {
        m.push({ prim: "slide", target: `#${S}-head`, at, dur: d, from: { y: prevY }, to: { y }, ease: "power1.in" });
        prevY = y;
        headEnd = at + d;
      }
      m.push({ prim: "draw", target: `#${S}-e${k}`, at: clamp(t[i] + 0.35, 0.35), dur: 0.35 });
      m.push({ prim: "reveal", target: `#${S}-h${k}`, at: clamp(t[i] + 0.4, 0.45), dur: 0.45, from: { opacity: 0, x: -30 }, ease: ctx.ease });
    });
    const pulseAt = Math.max(headEnd + 0.1, last + 0.6);
    if (w.b - 0.05 - pulseAt >= 1.2) m.push({ prim: "pulse", target: `#${S}-hc`, at: pulseAt, dur: r1(w.b - 0.1 - pulseAt) });
  } else {
    // ── waterline (signature): the classic iceberg ────────────────────────────
    const wl = 250, cx = 880;
    const tipPts = `700,${wl} 760,172 822,124 866,66 910,108 966,150 1016,198 1060,${wl}`;
    const mass = `M700 ${wl} C600 280 470 360 420 470 C380 570 430 690 560 760 C700 812 1060 812 1200 760 C1330 700 1390 580 1350 460 C1310 350 1180 290 1060 ${wl} Z`;
    const ys = hidden.map((_, i) => r1(n === 1 ? 520 : 356 + (i * 364) / (n - 1)));
    const pillW = 700;
    css = `${baseCss}
#${S}-deep { position: absolute; left: 0; top: ${wl}px; width: 1760px; height: ${820 - wl}px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--cyan) 14%, transparent), transparent 90%); }
#${S}-mass { fill: color-mix(in srgb, var(--cyan) 14%, transparent); stroke: color-mix(in srgb, var(--cyan) 45%, transparent); stroke-width: 3; }
#${S}-seaw { position: absolute; left: 0; top: ${wl - 20}px; width: 1760px; height: 40px; overflow: hidden; }
#${S}-wave { position: absolute; left: 0; top: 0; width: 2400px; height: 40px; }
#${S}-wave path { fill: none; stroke: var(--cyan); stroke-width: 4; }
#${S}-tipbox { position: absolute; left: 1110px; top: 70px; width: 640px; }
#${S}-tip { margin-top: 12px; display: flex; align-items: center; gap: 16px; }
.${S}-pill { position: absolute; left: ${cx - pillW / 2}px; width: ${pillW}px; height: 78px; box-sizing: border-box; border-radius: ${R}px;
  background: var(--surface); border: 2px dashed color-mix(in srgb, var(--cyan) 40%, transparent);
  display: flex; align-items: center; gap: 16px; padding: 0 26px; }
.${S}-lit { position: absolute; inset: -2px; border-radius: ${R}px; border: 3px solid var(--gold);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--gold) 12%, transparent); }
.${S}-q { width: 40px; height: 40px; color: var(--muted); flex: none; }
.${S}-q svg { width: 40px; height: 40px; display: block; }
.${S}-body { display: flex; align-items: center; gap: 16px; }
${ys.map((y, i) => `#${S}-h${i + 1} { top: ${r1(y - 39)}px; }`).join("\n")}`;
    // a seamless wave: period 120 px, moved by one or more periods
    const wave = `M0 20 ${Array.from({ length: 20 }, (_, k) => `Q${k * 120 + 30} 6 ${k * 120 + 60} 20 Q${k * 120 + 90} 34 ${k * 120 + 120} 20`).join(" ")}`;
    html = `<div id="${S}-grp">
  <div id="${S}-deep"></div>
  <svg id="${S}-svg" viewBox="0 0 1760 820">
    <path id="${S}-mass" d="${mass}"/>
    <polygon class="${S}-ice" id="${S}-ice" points="${tipPts}"/>
    <path class="${S}-icelit" id="${S}-icel" pathLength="1000" d="M${tipPts.split(" ").join(" L")}"/>
  </svg>
  <div id="${S}-seaw"><svg id="${S}-wave" viewBox="0 0 2400 40"><path d="${wave}"/></svg></div>
  <div id="${S}-tipbox">${kicker(`${S}-kk1`, "Bề nổi")}<div id="${S}-tip">${icon(slots.tip.icon, "ti")}<span class="${S}-tl">${esc(slots.tip.label)}</span></div></div>
${hidden.map((h, i) => `  <div class="${S}-pill" id="${S}-h${i + 1}"><div class="${S}-lit" id="${S}-k${i + 1}"></div>
    <span class="${S}-num">${num(i)}</span><span class="${S}-q" id="${S}-q${i + 1}">${ctx.icon("question")}</span>
    <div class="${S}-body" id="${S}-l${i + 1}">${icon(h.icon, "ic")}<span class="${S}-hl">${esc(h.label)}</span></div></div>`).join("\n")}
</div>`;
    m.push({ prim: "reveal", target: `#${S}-deep`, at: w.a, dur: 0.6, from: { opacity: 0 } });
    m.push({ prim: "reveal", target: `#${S}-mass`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0, y: 40 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-ice`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, y: 40 }, ease: ctx.ease });
    const wdur = w.b - 0.08 - w.a;
    m.push({ prim: "slide", target: `#${S}-wave`, at: w.a, dur: wdur, from: { x: 0 }, to: { x: -120 * Math.max(1, Math.round(wdur / 2.5)) }, ease: "none" });
    m.push({ prim: "reveal", target: `#${S}-tipbox`, at: clamp(tT, 0.5), dur: 0.5, from: { opacity: 0, x: 30 }, ease: ctx.ease });
    m.push({ prim: "draw", target: `#${S}-icel`, at: clamp(tT, 0.6), dur: 0.6 });
    hidden.forEach((_, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-h${k}`, at: enter(i), dur: 0.45, from: { opacity: 0, y: 20 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-k${k}`, at: clamp(t[i], 0.4), dur: 0.4, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-q${k}`, at: clamp(t[i], 0.3), dur: 0.3, from: { opacity: 1 }, to: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-l${k}`, at: clamp(t[i] + 0.1, 0.45), dur: 0.45, from: { opacity: 0, x: -24 }, ease: ctx.ease });
    });
  }
  const d = ctx.drift(`#${S}-grp`, clamp(last + 1.0, 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

// dialogue — 2–4 turns between two speakers (speakers[0] cyan, speakers[1] gold); each turn appears on its keyword.
// The speakers and the empty stage of the conversation are on stage from the window start.
// chat-bubbles: a wide chat window (header with both speakers, an input bar whose typing dots keep pulsing); bubbles
//   rise from the speaker's side, speakers[0] left, speakers[1] right.
// two-portraits: two large portraits face each other; the turns stack in the middle, tied to their speaker by a drawn
//   curve, while a glowing ring slides to whoever speaks.
// script-lines: a cast list on the left and a screenplay page on the right (line number, speaker in caps, the line);
//   a gold pointer steps down the gutter and a highlighter sweeps under each line as it is spoken.

import { lines, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => slots.turns.map((_, i) => `turns.${i}`);

const num = (i) => String(i + 1).padStart(2, "0");
const COL = ["var(--cyan)", "var(--gold)"];
const sizeFor = (texts, width, maxLines, steps) => steps.find((fs) => texts.every((t) => lines(t, fs, width * 0.9) <= maxLines)) ?? steps.at(-1);

export function render(ctx) {
  const { S, slots, esc, window: w, theme } = ctx;
  const sp = slots.speakers;
  const turns = slots.turns;
  const n = turns.length;
  const t = turns.map((_, i) => ctx.at(`turns.${i}`));
  const last = Math.max(...t);
  const mono = `"${theme.mono}", monospace`;
  const R = theme.radius ?? 18;
  const clamp = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const icon = (s, i) => ctx.icon(s.icon ?? (i ? "people" : "person"));
  const m = [];
  /** slides of one target to a sequence of positions at the turn times, never overlapping */
  const stepper = (target, prop, pos) => {
    let cur = pos[0], end = w.a;
    pos.forEach((p, i) => {
      if (i === 0 || p === cur) return;
      const at = Math.max(clamp(t[i], 0.12), end + 0.03);
      const next = pos.findIndex((q, j) => j > i && q !== p);
      const dur = Math.min(0.4, w.b - 0.05 - at, next > 0 ? Math.max(0.12, t[next] - at - 0.05) : 0.4);
      if (dur < 0.12) return;
      m.push({ prim: "slide", target, at, dur, from: { [prop]: cur }, to: { [prop]: p }, ease: "power2.inOut" });
      cur = p; end = at + dur;
    });
    return end;
  };
  let css, html;

  if (ctx.variant === "two-portraits") {
    const P = [[230, 290], [1530, 290]], PR = 140;
    const MX = 470, MW = 820, gap = 22;
    const bh = Math.min(170, (780 - (n - 1) * gap) / n);
    const fs = sizeFor(turns.map((x) => x.text), MW - 80, Math.max(1, Math.floor((bh - 60) / 44)), [40, 36, 32, 28, 26]);
    const top = 410 - (n * bh + (n - 1) * gap) / 2;
    const ys = turns.map((_, i) => Math.round(top + i * (bh + gap)));
    const curve = (i) => {
      const who = turns[i].who, y = ys[i] + bh / 2;
      const [px, py] = P[who];
      const sx = who ? px - PR - 6 : px + PR + 6, ex = who ? MX + MW + 4 : MX - 4;
      return `M${sx} ${py} C${(sx + ex) / 2} ${py} ${(sx + ex) / 2} ${y} ${ex} ${y}`;
    };
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-cv { fill: none; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1000; opacity: 0.8; }
.${S}-pt { position: absolute; width: ${2 * PR}px; height: ${2 * PR}px; box-sizing: border-box; border-radius: 50%; background: var(--surface);
  display: flex; align-items: center; justify-content: center; }
.${S}-pt svg { width: 150px; height: 150px; display: block; }
.${S}-nm { position: absolute; width: 420px; text-align: center; font-size: 44px; font-weight: 800; color: var(--ink); }
#${S}-ring { position: absolute; left: ${P[turns[0].who][0] - PR - 16}px; top: ${P[0][1] - PR - 16}px; width: ${2 * PR + 32}px; height: ${2 * PR + 32}px; }
#${S}-glow { position: absolute; inset: 0; box-sizing: border-box; border-radius: 50%; border: 4px solid var(--gold);
  box-shadow: 0 0 30px color-mix(in srgb, var(--gold) 45%, transparent); }
#${S}-dash { position: absolute; inset: -14px; box-sizing: border-box; border-radius: 50%; border: 3px dashed color-mix(in srgb, var(--gold) 45%, transparent); }
.${S}-turn { position: absolute; left: ${MX}px; width: ${MW}px; height: ${bh}px; box-sizing: border-box; border-radius: ${R}px; padding: 14px 34px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-shell { position: absolute; left: ${MX}px; width: ${MW}px; height: ${bh}px; box-sizing: border-box; border-radius: ${R}px;
  border: 2px dashed color-mix(in srgb, var(--ink) 14%, transparent); }
.${S}-bar { position: absolute; top: -2px; bottom: -2px; width: 8px; border-radius: 4px; }
.${S}-who { font-family: ${mono}; font-size: 24px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.${S}-tx { margin-top: 6px; font-size: ${fs}px; font-weight: 700; line-height: 1.2; color: var(--ink); }
${P.map(([x, y], i) => `#${S}-p${i + 1} { left: ${x - PR}px; top: ${y - PR}px; border: 4px solid ${COL[i]}; color: ${COL[i]}; }
#${S}-nm${i + 1} { left: ${x - 210}px; top: ${y + PR + 36}px; }`).join("\n")}
${ys.map((y, i) => `#${S}-t${i + 1}, #${S}-sh${i + 1} { top: ${y}px; }
#${S}-t${i + 1} .${S}-bar { ${turns[i].who ? "right" : "left"}: -2px; background: ${COL[turns[i].who]}; }
#${S}-t${i + 1} { text-align: ${turns[i].who ? "right" : "left"}; }
#${S}-t${i + 1} .${S}-who { color: ${COL[turns[i].who]}; }
#${S}-c${i + 1} { stroke: ${COL[turns[i].who]}; }`).join("\n")}`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-svg" viewBox="0 0 1760 820">
${turns.map((_, i) => `      <path class="${S}-cv" id="${S}-c${i + 1}" pathLength="1000" d="${curve(i)}"/>`).join("\n")}
    </svg>
${ys.map((_, i) => `    <div class="${S}-shell" id="${S}-sh${i + 1}"></div>`).join("\n")}
    <div id="${S}-ring"><div id="${S}-dash"></div><div id="${S}-glow"></div></div>
${sp.map((s, i) => `    <div class="${S}-pt" id="${S}-p${i + 1}">${icon(s, i)}</div>
    <div class="${S}-nm" id="${S}-nm${i + 1}">${esc(s.name)}</div>`).join("\n")}
${turns.map((x, i) => `    <div class="${S}-turn" id="${S}-t${i + 1}"><div class="${S}-bar"></div><div class="${S}-who">${esc(sp[x.who].name)}</div>
      <div class="${S}-tx">${esc(x.text)}</div></div>`).join("\n")}
  </div>
</div>`;
    sp.forEach((_, i) => {
      m.push({ prim: "reveal", target: `#${S}-p${i + 1}`, at: w.a + 0.05 + i * 0.12, dur: 0.55, from: { opacity: 0, scale: 0.7 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-nm${i + 1}`, at: w.a + 0.2 + i * 0.12, dur: 0.45, from: { opacity: 0, y: 16 } });
    });
    const dx = P[1][0] - P[0][0];
    m.push({ prim: "reveal", target: `#${S}-glow`, at: clamp(t[0], 0.4), dur: 0.4, from: { opacity: 0, scale: 0.85 }, ease: "back.out(2)" });
    m.push({ prim: "reveal", target: `#${S}-dash`, at: clamp(t[0] + 0.1, 0.4), dur: 0.4, from: { opacity: 0 } });
    // the ring sits on the first speaker and slides to each later one
    const pos = turns.map((x) => (x.who - turns[0].who) * dx);
    stepper(`#${S}-ring`, "x", pos);
    if (w.b - (w.a + 0.8) > 1) m.push({ prim: "slide", target: `#${S}-dash`, at: w.a + 0.8, dur: w.b - w.a - 0.85, from: { rotation: 0 }, to: { rotation: 150 }, ease: "none" });
    turns.forEach((x, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-sh${k}`, at: w.a + 0.1 + i * 0.08, dur: 0.4, from: { opacity: 0 } });
      m.push({ prim: "draw", target: `#${S}-c${k}`, at: clamp(t[i], 0.5), dur: 0.5 });
      m.push({ prim: "reveal", target: `#${S}-t${k}`, at: clamp(t[i] + 0.15, 0.45), dur: 0.45, from: { opacity: 0, x: x.who ? 40 : -40 }, ease: ctx.ease });
    });
  } else if (ctx.variant === "script-lines") {
    const PX = 520, PW = 1240;
    const rh = Math.min(180, 740 / n), top = Math.round(410 - (n * rh) / 2);
    const fs = sizeFor(turns.map((x) => x.text), 830, Math.max(1, Math.floor((rh - 28) / 46)), [40, 36, 32, 28, 26]);
    const ys = turns.map((_, i) => Math.round(top + i * rh));
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-cast { position: absolute; left: 0; top: 30px; width: 460px; }
#${S}-kick { font-family: ${mono}; font-size: 26px; letter-spacing: 0.18em; color: var(--muted); text-transform: uppercase; }
#${S}-ttl { margin-top: 8px; font-size: 64px; font-weight: 800; color: var(--ink); }
#${S}-rule { margin: 24px 0 40px; height: 4px; width: 140px; border-radius: 2px; background: var(--gold); transform-origin: 0 50%; }
.${S}-mem { display: flex; align-items: center; gap: 22px; margin-bottom: 34px; }
.${S}-av { width: 104px; height: 104px; box-sizing: border-box; border-radius: 50%; background: var(--surface); display: flex; align-items: center;
  justify-content: center; flex: none; }
.${S}-av svg { width: 60px; height: 60px; display: block; }
.${S}-mn { font-size: 40px; font-weight: 800; color: var(--ink); }
.${S}-mr { font-family: ${mono}; font-size: 22px; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; }
#${S}-page { position: absolute; left: ${PX}px; top: 0; width: ${PW}px; height: 820px; box-sizing: border-box; border-radius: ${R}px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-gut { position: absolute; left: ${PX + 110}px; top: 30px; width: 2px; height: 760px; background: color-mix(in srgb, var(--warn) 45%, transparent); transform-origin: 50% 0; }
.${S}-row { position: absolute; left: ${PX}px; width: ${PW}px; height: ${rh}px; box-sizing: border-box; border-bottom: 1px solid color-mix(in srgb, var(--ink) 8%, transparent); }
.${S}-ln { position: absolute; left: 36px; top: 24px; font-family: ${mono}; font-size: 24px; color: var(--muted); }
.${S}-who { position: absolute; left: 136px; top: 24px; width: 236px; font-family: ${mono}; font-size: 24px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.${S}-hi { position: absolute; left: 370px; top: 12px; width: 850px; height: ${rh - 24}px; border-radius: 10px; transform-origin: 0 50%; }
.${S}-tx { position: absolute; left: 390px; top: 16px; width: 830px; font-size: ${fs}px; font-weight: 700; line-height: 1.2; color: var(--ink); }
#${S}-ptr { position: absolute; left: ${PX - 30}px; top: ${ys[0] + 16}px; width: 36px; height: 36px; }
#${S}-ptr path { fill: var(--gold); }
${[0, 1].map((i) => `#${S}-av${i + 1} { border: 4px solid ${COL[i]}; color: ${COL[i]}; }`).join("\n")}
${ys.map((y, i) => `#${S}-r${i + 1} { top: ${y}px; }
#${S}-r${i + 1} .${S}-who { color: ${COL[turns[i].who]}; }
#${S}-h${i + 1} { background: color-mix(in srgb, ${COL[turns[i].who]} 12%, transparent); }`).join("\n")}`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <div id="${S}-cast"><div id="${S}-kick">Kịch bản</div><div id="${S}-ttl">Đối thoại</div><div id="${S}-rule"></div>
${sp.map((s, i) => `      <div class="${S}-mem" id="${S}-mem${i + 1}"><div class="${S}-av" id="${S}-av${i + 1}">${icon(s, i)}</div>
        <div><div class="${S}-mn">${esc(s.name)}</div><div class="${S}-mr">Vai ${num(i)}</div></div></div>`).join("\n")}
    </div>
    <div id="${S}-page"></div>
    <div id="${S}-gut"></div>
${turns.map((x, i) => `    <div class="${S}-row" id="${S}-r${i + 1}"><div class="${S}-hi" id="${S}-h${i + 1}"></div><div class="${S}-ln">${num(i)}</div>
      <div class="${S}-who" id="${S}-w${i + 1}">${esc(sp[x.who].name)}</div><div class="${S}-tx" id="${S}-x${i + 1}">${esc(x.text)}</div></div>`).join("\n")}
    <svg id="${S}-ptr" viewBox="0 0 36 36"><path d="M4 4 L32 18 L4 32 Z"/></svg>
  </div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-cast`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, x: -30 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-rule`, at: w.a + 0.3, dur: 0.5, from: { scaleX: 0 }, ease: "power2.out" });
    m.push({ prim: "reveal", target: `#${S}-page`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, y: 30 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-gut`, at: w.a + 0.2, dur: 0.7, from: { scaleY: 0 }, ease: "power2.out" });
    m.push({ prim: "reveal", target: `#${S}-ptr`, at: clamp(t[0], 0.3), dur: 0.3, from: { opacity: 0 } });
    const pEnd = stepper(`#${S}-ptr`, "y", ys.map((y) => y - ys[0]));
    turns.forEach((x, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-r${k}`, at: w.a + 0.2 + i * 0.08, dur: 0.4, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-w${k}`, at: w.a + 0.3 + i * 0.08, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.35 } });
      m.push({ prim: "reveal", target: `#${S}-w${k}`, at: clamp(Math.max(t[i], w.a + 0.72 + i * 0.08), 0.3), dur: 0.3, from: { opacity: 0.35 }, to: { opacity: 1 } });
      m.push({ prim: "reveal", target: `#${S}-h${k}`, at: clamp(t[i], 0.6), dur: 0.6, from: { scaleX: 0 }, ease: "power2.out" });
      m.push({ prim: "reveal", target: `#${S}-x${k}`, at: clamp(t[i] + 0.1, 0.45), dur: 0.45, from: { opacity: 0, x: -16 }, ease: ctx.ease });
    });
    const pAt = Math.max(pEnd, last) + 0.5;
    if (w.b - pAt > 1.3) m.push({ prim: "pulse", target: `#${S}-ptr`, at: pAt, dur: w.b - pAt - 0.05 });
  } else {
    // chat-bubbles (signature)
    const X0 = 140, W = 1480, BW = 940;
    const avail = 600 - 22 * (n - 1);
    const fs = [40, 36, 32, 28, 26].find((f) => turns.reduce((s, x) => s + lines(x.text, f, (BW - 70) * 0.9) * f * 1.25 + 74, 0) <= avail) ?? 26;
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-win { position: absolute; left: ${X0}px; top: 0; width: ${W}px; height: 820px; box-sizing: border-box; border-radius: 28px;
  background: color-mix(in srgb, var(--surface) 70%, transparent); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); }
#${S}-head { position: absolute; left: ${X0}px; top: 0; width: ${W}px; height: 96px; box-sizing: border-box; padding: 0 36px; display: flex; align-items: center; gap: 18px;
  border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-av { width: 60px; height: 60px; box-sizing: border-box; border-radius: 50%; background: var(--surface); display: flex; align-items: center;
  justify-content: center; flex: none; }
.${S}-av svg { width: 36px; height: 36px; display: block; }
#${S}-hn { font-size: 34px; font-weight: 800; color: var(--ink); white-space: nowrap; }
#${S}-live { margin-left: auto; font-family: ${mono}; font-size: 22px; letter-spacing: 0.14em; color: var(--cyan); display: flex; align-items: center; gap: 10px; }
#${S}-ld { width: 14px; height: 14px; border-radius: 50%; background: var(--cyan); }
#${S}-msgs { position: absolute; left: ${X0 + 36}px; top: 120px; width: ${W - 72}px; display: flex; flex-direction: column; gap: 22px; }
.${S}-b { position: relative; max-width: ${BW}px; box-sizing: border-box; border-radius: 26px; border: 2px dashed color-mix(in srgb, var(--ink) 14%, transparent); }
.${S}-bs { visibility: hidden; padding: 16px 30px 20px; }
.${S}-bf { position: absolute; inset: -2px; box-sizing: border-box; padding: 16px 30px 20px; border-radius: inherit; }
.${S}-b0 { align-self: flex-start; border-bottom-left-radius: 6px; }
.${S}-b1 { align-self: flex-end; border-bottom-right-radius: 6px; }
.${S}-b0 .${S}-bf { background: var(--surface); border: 2px solid color-mix(in srgb, var(--cyan) 45%, transparent); }
.${S}-b1 .${S}-bf { background: color-mix(in srgb, var(--gold) 14%, var(--surface)); border: 2px solid color-mix(in srgb, var(--gold) 60%, transparent); }
.${S}-bn { font-family: ${mono}; font-size: 22px; font-weight: 700; letter-spacing: 0.08em; }
.${S}-b0 .${S}-bn { color: var(--cyan); }
.${S}-b1 .${S}-bn { color: var(--gold); text-align: right; }
.${S}-bt { margin-top: 4px; font-size: ${fs}px; font-weight: 700; line-height: 1.25; color: var(--ink); }
#${S}-bar { position: absolute; left: ${X0 + 36}px; top: 724px; width: ${W - 72}px; height: 72px; box-sizing: border-box; border-radius: 36px; padding: 0 30px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); display: flex; align-items: center; gap: 14px; }
#${S}-ph { font-size: 28px; color: var(--muted); }
.${S}-td { width: 14px; height: 14px; border-radius: 50%; background: var(--gold); }
#${S}-send { margin-left: auto; width: 44px; height: 44px; color: var(--gold); }
#${S}-send svg { width: 44px; height: 44px; display: block; }
${[0, 1].map((i) => `#${S}-av${i + 1} { border: 3px solid ${COL[i]}; color: ${COL[i]}; }`).join("\n")}`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <div id="${S}-win"></div>
    <div id="${S}-head">${sp.map((s, i) => `<div class="${S}-av" id="${S}-av${i + 1}">${icon(s, i)}</div>`).join("")}
      <div id="${S}-hn">${esc(sp[0].name)} và ${esc(sp[1].name)}</div><div id="${S}-live"><div id="${S}-ld"></div>TRỰC TIẾP</div></div>
    <div id="${S}-msgs">
${turns.map((x, i) => {
      const body = `<div class="${S}-bn">${esc(sp[x.who].name)}</div><div class="${S}-bt">${esc(x.text)}</div>`;
      return `      <div class="${S}-b ${S}-b${x.who}" id="${S}-g${i + 1}"><div class="${S}-bs">${body}</div><div class="${S}-bf" id="${S}-b${i + 1}">${body}</div></div>`;
    }).join("\n")}
    </div>
    <div id="${S}-bar"><div id="${S}-ph">Đang nhập</div><div class="${S}-td" id="${S}-d1"></div><div class="${S}-td" id="${S}-d2"></div><div class="${S}-td" id="${S}-d3"></div>
      <div id="${S}-send">${ctx.icon("arrow")}</div></div>
  </div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-win`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, scale: 0.97 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-head`, at: w.a + 0.15, dur: 0.45, from: { opacity: 0, y: -20 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-bar`, at: w.a + 0.2, dur: 0.45, from: { opacity: 0, y: 20 }, ease: ctx.ease });
    const dAt = w.a + 0.7;
    if (w.b - dAt > 1.3) [1, 2, 3].forEach((k) => m.push({ prim: "pulse", target: `#${S}-d${k}`, at: dAt + (k - 1) * 0.2, dur: w.b - dAt - (k - 1) * 0.2 - 0.05 }));
    if (w.b - dAt > 1.3) m.push({ prim: "pulse", target: `#${S}-ld`, at: dAt, dur: w.b - dAt - 0.05 });
    turns.forEach((x, i) => {
      m.push({ prim: "reveal", target: `#${S}-g${i + 1}`, at: w.a + 0.25 + i * 0.08, dur: 0.4, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-b${i + 1}`, at: clamp(t[i], 0.5), dur: 0.5, from: { opacity: 0, y: 30, x: x.who ? 40 : -40, scale: 0.92 }, ease: "back.out(1.6)" });
    });
  }
  const d = ctx.drift(`#${S}-grp`, clamp(last + 0.9, 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

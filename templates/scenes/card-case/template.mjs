// card-case — DNA card "TÌNH HUỐNG" (icon briefcase): a short situation with one striking detail and an optional question.
// story: a 340 px portrait ring (a person) is drawn at the left while placeholder lines wait at the right; the situation
//   rises on its cue, the striking detail lands in a gold callout that a drawn line ties to the portrait, and the
//   question closes in cyan.
// chat: the case plays as a message thread: a typing bubble pulses from the window start, the situation arrives as an
//   incoming bubble, the detail as a gold-edged bubble, and the question as the learner's own bubble at the right.
// polaroid (open, no card box): a pin board spans the stage; dashed outlines wait where 2–3 tilted photos will hang.
//   Each detail (situation, detail, question) drops onto its outline on its cue and settles, a pin lands on it and a
//   red string is drawn from the previous pin; every photo then swings gently on its pin until the shot ends.

import { dnaCard, fit, keepInside, lines, openLabel } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["label", "situation", "detail", ...(slots.question ? ["question"] : [])];

export function render(ctx) {
  if (ctx.variant === "polaroid") return polaroid(ctx);
  const { S, slots, esc, theme, window: w } = ctx;
  const card = dnaCard(ctx, { label: "TÌNH HUỐNG", icon: ctx.icon("briefcase") });
  const tS = ctx.at("situation"), tD = ctx.at("detail");
  const tQ = slots.question ? ctx.at("question") : null;
  const last = tQ ?? tD;
  const r = theme.radius ?? 18;

  if (ctx.variant === "chat") {
    const fs = 38, lh = Math.round(fs * 1.32), bw = 960;
    const h = (text, width) => lines(text, fs, width - 60) * lh + 44;
    const hS = h(slots.situation, bw), hD = h(slots.detail, bw - 50), hQ = slots.question ? h(slots.question, 780 - 50) : 0;
    const gap = 26;
    const total = hS + gap + hD + (slots.question ? gap + hQ : 0);
    const y0 = Math.max(120, Math.round(120 + (540 - total) / 2));
    const yD = y0 + hS + gap, yQ = yD + hD + gap;
    const css = `
#${S}-av { position: absolute; left: 48px; top: ${y0}px; width: 110px; height: 110px; border-radius: 50%; box-sizing: border-box;
  border: 2px solid color-mix(in srgb, var(--gold) 50%, transparent); background: color-mix(in srgb, var(--gold) 10%, transparent);
  color: var(--gold); display: flex; align-items: center; justify-content: center; }
#${S}-av svg { width: 64px; height: 64px; }
.${S}-bub { position: absolute; box-sizing: border-box; padding: 22px 30px; font-size: ${fs}px; font-weight: 600; line-height: ${lh}px;
  color: var(--ink); border-radius: 30px; }
#${S}-typing { left: 190px; top: ${y0}px; width: 150px; height: 84px; border-radius: 6px 30px 30px 30px;
  background: color-mix(in srgb, var(--ink) 9%, transparent); }
.${S}-dot { position: absolute; top: 32px; width: 20px; height: 20px; border-radius: 50%; background: var(--muted); }
#${S}-sit { left: 190px; top: ${y0}px; max-width: ${bw}px; border-radius: 6px 30px 30px 30px; background: color-mix(in srgb, var(--ink) 9%, transparent); }
#${S}-det { left: 190px; top: ${yD}px; max-width: ${bw}px; display: flex; gap: 16px; align-items: flex-start; border-radius: 6px 30px 30px 30px;
  border: 2px solid var(--gold); background: color-mix(in srgb, var(--gold) 10%, transparent); }
#${S}-det svg { flex: none; width: 36px; height: 36px; margin-top: 4px; color: var(--gold); }
#${S}-q { right: 48px; top: ${yQ}px; max-width: 780px; display: flex; gap: 16px; align-items: flex-start; border-radius: 30px 6px 30px 30px;
  background: color-mix(in srgb, var(--cyan) 16%, transparent); }
#${S}-q svg { flex: none; width: 36px; height: 36px; margin-top: 4px; color: var(--cyan); }`;
    const html = `    <div id="${S}-av">${ctx.icon("person")}</div>
    <div class="${S}-bub" id="${S}-typing">${[0, 1, 2].map((k) => `<i class="${S}-dot" id="${S}-d${k + 1}" style="left: ${34 + k * 32}px"></i>`).join("")}</div>
    <div class="${S}-bub" id="${S}-sit">${esc(slots.situation)}</div>
    <div class="${S}-bub" id="${S}-det">${ctx.icon("spark")}<span>${esc(slots.detail)}</span></div>
${slots.question ? `    <div class="${S}-bub" id="${S}-q">${ctx.icon("question")}<span>${esc(slots.question)}</span></div>` : ""}`;
    const typeEnd = Math.max(tS, w.a + 0.45);
    const m = [
      { prim: "reveal", target: `#${S}-av`, at: w.a + 0.05, dur: 0.45, from: { opacity: 0, scale: 0.6 }, ease: "back.out(2)" },
      { prim: "reveal", target: `#${S}-typing`, at: w.a + 0.1, dur: 0.3, from: { opacity: 0, y: 16 } },
      { prim: "reveal", target: `#${S}-typing`, at: typeEnd, dur: 0.2, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.in" },
      { prim: "reveal", target: `#${S}-sit`, at: tS, dur: 0.45, from: { opacity: 0, y: 24, scale: 0.96 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-det`, at: tD, dur: 0.45, from: { opacity: 0, y: 24, scale: 0.96 }, ease: ctx.ease },
    ];
    // the three typing dots bob in turn until the first bubble arrives
    [0, 1, 2].forEach((k) => {
      const at = w.a + 0.2 + k * 0.12, dur = typeEnd - at - 0.02;
      if (dur > 0.3) m.push({ prim: "pulse", target: `#${S}-d${k + 1}`, at, dur });
    });
    if (tQ != null) m.push({ prim: "reveal", target: `#${S}-q`, at: tQ, dur: 0.45, from: { opacity: 0, x: 40 }, ease: ctx.ease });
    if (tD > tS + 0.5 + ctx.gap) m.push({ prim: "dim", targets: [`#${S}-sit`], at: tD, to: 0.7 });
    return card.wrap({ css, html, motions: m, driftFrom: last + 0.6 });
  }

  // story
  const fsS = 42, fsD = 34;
  const hS = lines(slots.situation, fsS, 900) * Math.round(fsS * 1.28);
  const hD = lines(slots.detail, fsD, 760) * Math.round(fsD * 1.3) + 48;
  const hQ = slots.question ? lines(slots.question, fsD, 830) * Math.round(fsD * 1.3) : 0;
  const total = hS + 40 + hD + (slots.question ? 40 + hQ : 0);
  const y0 = Math.max(120, Math.round(390 - total / 2));
  const yD = y0 + hS + 40, yQ = yD + hD + 40;
  const css = `
#${S}-pic { position: absolute; left: 50px; top: 190px; width: 340px; height: 340px; }
#${S}-ring { position: absolute; left: 0; top: 0; width: 340px; height: 340px; overflow: visible; }
#${S}-ring circle { fill: none; stroke-width: 6; stroke-dasharray: 1000; }
#${S}-ring .${S}-trk { stroke: color-mix(in srgb, var(--ink) 14%, transparent); stroke-width: 3; }
#${S}-ring .${S}-arc { stroke: var(--gold); stroke-linecap: round; }
#${S}-who { position: absolute; left: 70px; top: 60px; width: 200px; height: 200px; color: var(--ink); }
#${S}-who svg { width: 200px; height: 200px; display: block; }
#${S}-link { position: absolute; left: 380px; top: ${yD - 10}px; width: 100px; height: 100px; overflow: visible; }
#${S}-link path { fill: none; stroke: var(--gold); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-ph { position: absolute; left: 480px; top: ${y0 + 12}px; width: 820px; }
#${S}-ph i { display: block; height: 18px; border-radius: 9px; margin-bottom: 36px; background: color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-ph i:last-child { width: 60%; }
#${S}-sit { position: absolute; left: 480px; top: ${y0}px; width: 900px; font-size: ${fsS}px; font-weight: 700; line-height: 1.28; color: var(--ink); }
#${S}-det { position: absolute; left: 480px; top: ${yD}px; width: 900px; box-sizing: border-box; padding: 24px 30px 24px 90px; border-radius: ${r}px;
  border-left: 6px solid var(--gold); background: color-mix(in srgb, var(--gold) 10%, transparent); font-size: ${fsD}px; font-weight: 700;
  line-height: 1.3; color: var(--gold); }
#${S}-det svg { position: absolute; left: 30px; top: 26px; width: 40px; height: 40px; }
#${S}-q { position: absolute; left: 480px; top: ${yQ}px; width: 900px; display: flex; gap: 18px; align-items: flex-start;
  font-size: ${fsD}px; font-weight: 600; font-style: italic; line-height: 1.3; color: var(--cyan); }
#${S}-q svg { flex: none; width: 40px; height: 40px; margin-top: 2px; }`;
  const html = `    <div id="${S}-pic">
      <svg id="${S}-ring" viewBox="0 0 340 340"><circle class="${S}-trk" cx="170" cy="170" r="160"/>
        <circle class="${S}-arc" id="${S}-arc" pathLength="1000" cx="170" cy="170" r="160" transform="rotate(-90 170 170)"/></svg>
      <div id="${S}-who">${ctx.icon("person")}</div>
    </div>
    <svg id="${S}-link" viewBox="0 0 100 100"><path id="${S}-linkp" pathLength="1000" d="M4 ${Math.max(4, Math.min(96, 360 - yD + 10))} C50 ${Math.max(4, Math.min(96, 360 - yD + 10))} 50 50 96 50"/></svg>
    <div id="${S}-ph"><i></i><i></i></div>
    <div id="${S}-sit">${esc(slots.situation)}</div>
    <div id="${S}-det">${ctx.icon("spark")}${esc(slots.detail)}</div>
${slots.question ? `    <div id="${S}-q">${ctx.icon("question")}<span>${esc(slots.question)}</span></div>` : ""}`;
  const m = [
    { prim: "reveal", target: `#${S}-pic`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, scale: 0.85 }, ease: ctx.ease },
    { prim: "draw", target: `#${S}-arc`, at: w.a + 0.2, dur: Math.max(0.6, Math.min(1.6, tD - w.a)) },
    { prim: "reveal", target: `#${S}-who`, at: w.a + 0.15, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.3 } },
    { prim: "reveal", target: `#${S}-who`, at: Math.max(tS, w.a + 0.57), dur: 0.4, from: { opacity: 0.3, y: 10 }, to: { opacity: 1, y: 0 } },
    { prim: "reveal", target: `#${S}-ph`, at: w.a + 0.2, dur: 0.4, from: { opacity: 0, x: -20 } },
    { prim: "reveal", target: `#${S}-ph`, at: Math.max(tS, w.a + 0.62), dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 } },
    { prim: "reveal", target: `#${S}-sit`, at: tS, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease },
    { prim: "draw", target: `#${S}-linkp`, at: tD, dur: 0.4 },
    { prim: "reveal", target: `#${S}-det`, at: tD + 0.15, dur: 0.5, from: { opacity: 0, x: -30 }, ease: ctx.ease },
  ];
  if (tQ != null) m.push({ prim: "reveal", target: `#${S}-q`, at: tQ, dur: 0.5, from: { opacity: 0, y: 20 } });
  return card.wrap({ css, html, motions: m, driftFrom: last + 0.65 });
}


function polaroid(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const Z = ctx.zones.triptych;
  const mono = `"${theme.mono}", monospace`;
  const id = openLabel(ctx, { label: "TÌNH HUỐNG", icon: ctx.icon("briefcase"), x: Z.a.x + 20, y: Z.a.y + 8 });
  const items = [
    { key: "situation", text: slots.situation, icon: "person", tag: "BỐI CẢNH", tint: "var(--cyan)", pin: "var(--warn)" },
    { key: "detail", text: slots.detail, icon: "spark", tag: "CHI TIẾT", tint: "var(--gold)", pin: "var(--gold)" },
    ...(slots.question ? [{ key: "question", text: slots.question, icon: "question", tag: "CÂU HỎI", tint: "var(--cyan)", pin: "var(--cyan)" }] : []),
  ];
  const n = items.length;
  const pw = n === 3 ? 480 : 540;
  const cx = n === 3 ? [Z.a, Z.b, Z.c].map((b) => b.x + b.w / 2) : [560, 1200];
  const top = n === 3 ? [128, 176, 118] : [132, 168];
  const tilt = n === 3 ? [-4, 3, -2.5] : [-3.5, 3];
  const phH = n === 3 ? 270 : 300;
  const geo = items.map((it, i) => {
    const fs = fit(it.text, [[40, 40], [65, 36], [90, 33]]);
    const lh = Math.round(fs * 1.28);
    const h = 20 + phH + 22 + lines(it.text, fs, pw - 64) * lh + 36;
    return { fs, lh, h, x: cx[i] - pw / 2, y: top[i], pin: [cx[i], top[i] + 14] };
  });
  const t = items.map((it) => ctx.at(it.key));
  const shade = "color-mix(in srgb, var(--canvas) 60%, transparent)";
  const css = `${id.css}
#${S}-board { position: absolute; left: 20px; top: 64px; width: 1720px; height: ${Math.min(740, Math.max(...geo.map((g) => g.y + g.h)) + 76 - 64)}px; box-sizing: border-box; border-radius: ${theme.radius ?? 18}px;
  background-color: color-mix(in srgb, var(--surface) 75%, transparent);
  background-image: radial-gradient(color-mix(in srgb, var(--ink) 9%, transparent) 2px, transparent 2.5px); background-size: 36px 36px;
  border: 2px solid color-mix(in srgb, var(--ink) 8%, transparent); }
.${S}-w { position: absolute; width: ${pw}px; transform-origin: 50% 14px; }
.${S}-g { position: absolute; left: 0; top: 0; width: ${pw}px; box-sizing: border-box; border-radius: 6px;
  border: 3px dashed color-mix(in srgb, var(--ink) 22%, transparent); }
.${S}-p { position: absolute; left: 0; top: 0; width: ${pw}px; box-sizing: border-box; padding: 20px 20px 0; border-radius: 6px;
  background: var(--ink); transform-origin: 50% 14px; box-shadow: 0 22px 34px ${shade}, 0 4px 8px ${shade}; }
.${S}-ph { position: relative; height: ${phH}px; border-radius: 3px; overflow: hidden; }
.${S}-ic { position: absolute; left: ${(pw - 40) / 2 - 85}px; top: ${phH / 2 - 75}px; width: 170px; height: 170px; }
.${S}-ic svg { width: 170px; height: 170px; display: block; }
.${S}-tag { position: absolute; left: 16px; top: 14px; font-family: ${mono}; font-size: 20px; letter-spacing: 0.14em; }
.${S}-cap { margin-top: 22px; padding: 0 12px; font-weight: 700; color: var(--canvas); }
.${S}-pin { position: absolute; width: 30px; height: 30px; border-radius: 50%; box-shadow: 0 6px 8px ${shade}; }
#${S}-str { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-str path { fill: none; stroke: var(--warn); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1000; opacity: 0.85; }
${items.map((it, i) => {
    const g = geo[i];
    return `#${S}-w${i + 1} { left: ${g.x}px; top: ${g.y}px; height: ${g.h}px; transform: rotate(${tilt[i]}deg); }
#${S}-g${i + 1}, #${S}-p${i + 1} { height: ${g.h}px; }
#${S}-p${i + 1} .${S}-ph { background: linear-gradient(160deg, color-mix(in srgb, ${it.tint} 30%, var(--canvas)), color-mix(in srgb, ${it.tint} 10%, var(--canvas))); }
#${S}-p${i + 1} .${S}-ic, #${S}-p${i + 1} .${S}-tag { color: ${it.tint}; }
#${S}-p${i + 1} .${S}-cap { font-size: ${g.fs}px; line-height: ${g.lh}px; }
#${S}-pin${i + 1} { left: ${g.pin[0] - 15}px; top: ${g.pin[1] - 15}px;
  background: radial-gradient(circle at 36% 34%, var(--ink) 0 14%, ${it.pin} 38%, color-mix(in srgb, ${it.pin} 60%, var(--canvas)) 100%); }`;
  }).join("\n")}`;
  const sag = (a, b) => `M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${Math.max(a[1], b[1]) + 70} ${b[0]} ${b[1]}`;
  const html = `    <div id="${S}-board"></div>
${id.html}
${items.map((it, i) => `    <div class="${S}-w" id="${S}-w${i + 1}"><div class="${S}-g" id="${S}-g${i + 1}"></div>
      <div class="${S}-p" id="${S}-p${i + 1}"><div class="${S}-ph"><div class="${S}-ic">${ctx.icon(it.icon)}</div>
        <div class="${S}-tag">${String(i + 1).padStart(2, "0")} · ${it.tag}</div></div><div class="${S}-cap">${esc(it.text)}</div></div></div>`).join("\n")}
    <svg id="${S}-str" viewBox="0 0 1760 820">${items.slice(1).map((_, i) => `<path id="${S}-s${i + 1}" pathLength="1000" d="${sag(geo[i].pin, geo[i + 1].pin)}"/>`).join("")}</svg>
${items.map((_, i) => `    <div class="${S}-pin" id="${S}-pin${i + 1}"></div>`).join("\n")}`;
  const m = [
    ...id.motions,
    { prim: "reveal", target: `#${S}-board`, at: w.a, dur: 0.5, from: { opacity: 0, scale: 0.98 }, ease: ctx.ease },
  ];
  items.forEach((_, i) => {
    const gIn = w.a + 0.12 + i * 0.1;
    m.push({ prim: "reveal", target: `#${S}-g${i + 1}`, at: gIn, dur: 0.4, from: { opacity: 0 } });
    const gOut = Math.max(t[i] + 0.35, gIn + 0.42);
    if (gOut + 0.25 <= w.b - 0.05) m.push({ prim: "reveal", target: `#${S}-g${i + 1}`, at: gOut, dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 } });
    // the photo drops onto its outline and settles, then its pin lands
    m.push(
      { prim: "reveal", target: `#${S}-p${i + 1}`, at: t[i], dur: 0.6, from: { opacity: 0, y: -70, scale: 1.06, rotation: i % 2 ? 7 : -7 }, ease: "back.out(1.5)" },
      { prim: "reveal", target: `#${S}-pin${i + 1}`, at: t[i] + 0.4, dur: 0.35, from: { opacity: 0, scale: 2.2 }, ease: "back.out(3)" },
    );
    if (i > 0) m.push({ prim: "draw", target: `#${S}-s${i}`, at: t[i] + 0.5, dur: 0.45 });
    // then it swings on its pin until the shot ends
    const sw = t[i] + 0.7;
    if (w.b - 0.05 - sw > 0.6) m.push({ prim: "slide", target: `#${S}-p${i + 1}`, at: sw, dur: w.b - 0.05 - sw, from: { rotation: 0 }, to: { rotation: i % 2 ? -1.6 : 1.6 }, ease: "sine.inOut" });
  });
  return { css, html, motions: keepInside(m, w.b) };
}

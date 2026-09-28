// card-objective — DNA card "MỤC TIÊU CHƯƠNG" (icon target) with 1–3 chapter objectives, each lit on its cue.
// list: a 360 px target is drawn at the left, one gold ring per objective lights from the outside in, and an arrow
//   hits the bullseye with the last objective; the objectives are numbered rows at the right whose check is drawn on cue.
// spotlight: the objectives stand side by side under oversized outline numerals; on its cue a numeral fills gold,
//   the text rises, a soft spotlight slides onto that column and the earlier column dims.

import { dnaCard, fit } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["label", ...slots.items.map((_, i) => `items.${i}`)];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const card = dnaCard(ctx, { label: "MỤC TIÊU CHƯƠNG", icon: ctx.icon("target") });
  const items = slots.items;
  const n = items.length;
  const t = items.map((_, i) => ctx.at(`items.${i}`));
  const last = Math.max(...t);
  const mono = `"${theme.mono}", monospace`;

  if (ctx.variant === "spotlight") {
    const gap = 48;
    const cw = Math.floor((1344 - (n - 1) * gap) / n);
    const cols = items.map((_, i) => 48 + i * (cw + gap));
    const numFs = n === 1 ? 200 : 170;
    const txtFs = n === 1 ? 52 : n === 2 ? 44 : 38;
    const css = `
#${S}-spot { position: absolute; left: ${cols[0] + cw / 2 - 300}px; top: 60px; width: 600px; height: 600px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--gold) 16%, transparent), transparent 66%); }
.${S}-col { position: absolute; top: 130px; width: ${cw}px; height: 520px; }
.${S}-numo, .${S}-numf { position: absolute; left: 0; top: 0; width: ${cw}px; font-family: ${mono}; font-weight: 700;
  font-size: ${numFs}px; line-height: 1; text-align: ${n === 1 ? "center" : "left"}; }
.${S}-numo { color: color-mix(in srgb, var(--ink) 4%, transparent); -webkit-text-stroke: 2px color-mix(in srgb, var(--cyan) 55%, transparent); }
.${S}-numf { color: var(--gold); -webkit-text-stroke: 0; }
.${S}-bar { position: absolute; left: ${n === 1 ? cw / 2 - 90 : 4}px; top: ${numFs + 24}px; width: 180px; height: 6px; border-radius: 3px;
  background: var(--gold); transform-origin: 0 50%; }
.${S}-ghost { position: absolute; left: ${n === 1 ? cw / 2 - 260 : 0}px; top: ${numFs + 70}px; width: ${n === 1 ? 520 : cw - 40}px; }
.${S}-ghost i { display: block; height: 14px; border-radius: 7px; margin-bottom: 22px; background: color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-ghost i:nth-child(2) { width: 72%; }
.${S}-txt { position: absolute; left: 0; top: ${numFs + 64}px; width: ${cw - 20}px; font-size: ${txtFs}px; font-weight: 700;
  line-height: 1.25; color: var(--ink); text-align: ${n === 1 ? "center" : "left"}; }
${cols.map((x, i) => `#${S}-c${i + 1} { left: ${x}px; }`).join("\n")}`;
    const html = `    <div id="${S}-spot"></div>
${items.map((it, i) => `    <div class="${S}-col" id="${S}-c${i + 1}">
      <div class="${S}-numo" id="${S}-no${i + 1}">${String(i + 1).padStart(2, "0")}<div class="${S}-numf" id="${S}-nf${i + 1}">${String(i + 1).padStart(2, "0")}</div></div>
      <div class="${S}-bar" id="${S}-b${i + 1}"></div>
      <div class="${S}-ghost" id="${S}-g${i + 1}"><i></i><i></i></div>
      <div class="${S}-txt" id="${S}-t${i + 1}">${esc(it)}</div>
    </div>`).join("\n")}`;
    const m = [{ prim: "reveal", target: `#${S}-spot`, at: w.a + 0.1, dur: 0.7, from: { opacity: 0 } }];
    items.forEach((_, i) => {
      const enter = Math.min(t[i], w.a + 0.1 + i * 0.1);
      m.push(
        { prim: "reveal", target: `#${S}-c${i + 1}`, at: enter, dur: 0.5, from: { opacity: 0, y: 40 }, ease: ctx.ease },
        { prim: "reveal", target: `#${S}-nf${i + 1}`, at: t[i], dur: 0.45, from: { opacity: 0, scale: 1.2 }, ease: "back.out(1.6)" },
        { prim: "reveal", target: `#${S}-b${i + 1}`, at: t[i] + 0.1, dur: 0.4, from: { scaleX: 0 }, ease: "power2.out" },
        { prim: "reveal", target: `#${S}-g${i + 1}`, at: t[i], dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 } },
        { prim: "reveal", target: `#${S}-t${i + 1}`, at: t[i] + 0.12, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease },
      );
      // the spotlight moves onto the lit column; the previous column steps back
      if (i > 0) {
        const next = i + 1 < n ? t[i + 1] : w.b;
        const dur = Math.min(0.55, next - t[i] - 0.05);
        if (dur > 0.15) m.push({ prim: "slide", target: `#${S}-spot`, at: t[i], dur, from: { x: cols[i - 1] - cols[0] }, to: { x: cols[i] - cols[0] }, ease: "power2.inOut" });
        const prevEnter = Math.min(t[i - 1], w.a + 0.1 + (i - 1) * 0.1);
        if (t[i] > prevEnter + 0.5 + ctx.gap) m.push({ prim: "dim", targets: [`#${S}-c${i}`], at: t[i], to: 0.45 });
      }
    });
    return card.wrap({ css, html, motions: m, driftFrom: last + 0.65 });
  }

  // list
  const rowH = n === 1 ? 200 : n === 2 ? 190 : 160;
  const top0 = 130 + Math.round((520 - n * rowH) / 2);
  const txtFs = fit(items.join(""), [[40, 44], [100, 40], [200, 36]]);
  const R = [160, 112, 64];
  const css = `
#${S}-tgt { position: absolute; left: 70px; top: 170px; width: 360px; height: 360px; overflow: visible; }
#${S}-tgt circle { fill: none; stroke-width: 8; stroke-dasharray: 1000; }
#${S}-tgt .${S}-trk { stroke: color-mix(in srgb, var(--ink) 16%, transparent); stroke-width: 4; }
#${S}-tgt .${S}-ring { stroke: var(--gold); }
#${S}-eye { position: absolute; left: 234px; top: 334px; width: 32px; height: 32px; border-radius: 50%; background: var(--gold); }
#${S}-arrow { position: absolute; left: 70px; top: 170px; width: 360px; height: 360px; overflow: visible; }
#${S}-arrow path { fill: none; stroke: var(--cyan); stroke-width: 8; stroke-linecap: round; stroke-linejoin: round; }
.${S}-row { position: absolute; left: 500px; width: 860px; height: ${rowH}px; }
.${S}-row::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: color-mix(in srgb, var(--ink) 8%, transparent); }
.${S}-num { position: absolute; left: 0; top: ${rowH / 2 - 26}px; font-family: ${mono}; font-size: 40px; font-weight: 700; color: var(--cyan); }
.${S}-box { position: absolute; left: 90px; top: ${rowH / 2 - 30}px; width: 60px; height: 60px; overflow: visible; }
.${S}-box circle { fill: none; stroke: color-mix(in srgb, var(--ink) 30%, transparent); stroke-width: 3; }
.${S}-box path { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-ph { position: absolute; left: 180px; top: ${rowH / 2 - 8}px; width: 520px; height: 16px; border-radius: 8px;
  background: color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-txt { position: absolute; left: 180px; top: 0; width: 680px; height: ${rowH}px; display: flex; align-items: center;
  font-size: ${txtFs}px; font-weight: 700; line-height: 1.22; color: var(--ink); }
${items.map((_, i) => `#${S}-r${i + 1} { top: ${top0 + i * rowH}px; }`).join("\n")}`;
  const html = `    <svg id="${S}-tgt" viewBox="0 0 360 360">
${R.map((r, k) => `      <circle class="${S}-trk" id="${S}-k${k + 1}" pathLength="1000" cx="180" cy="180" r="${r}" transform="rotate(-90 180 180)"/>`).join("\n")}
${items.map((_, i) => `      <circle class="${S}-ring" id="${S}-g${i + 1}" pathLength="1000" cx="180" cy="180" r="${R[i]}" transform="rotate(-90 180 180)"/>`).join("\n")}
    </svg>
    <div id="${S}-eye"></div>
    <svg id="${S}-arrow" viewBox="0 0 360 360"><path d="M186 174 L330 30 M186 174 L226 168 M186 174 L192 134"/></svg>
${items.map((it, i) => `    <div class="${S}-row" id="${S}-r${i + 1}">
      <div class="${S}-num">${String(i + 1).padStart(2, "0")}</div>
      <svg class="${S}-box" viewBox="0 0 60 60"><circle cx="30" cy="30" r="27"/><path id="${S}-ck${i + 1}" pathLength="1000" d="M17 31 L26 40 L44 21"/></svg>
      <div class="${S}-ph" id="${S}-ph${i + 1}"></div>
      <div class="${S}-txt" id="${S}-t${i + 1}">${esc(it)}</div>
    </div>`).join("\n")}`;
  const m = R.map((_, k) => ({ prim: "draw", target: `#${S}-k${k + 1}`, at: w.a + 0.05 + k * 0.12, dur: 0.8 }));
  items.forEach((_, i) => {
    const enter = Math.min(t[i], w.a + 0.15 + i * 0.1);
    m.push(
      { prim: "reveal", target: `#${S}-r${i + 1}`, at: enter, dur: 0.5, from: { opacity: 0, x: 40 }, ease: ctx.ease },
      { prim: "draw", target: `#${S}-g${i + 1}`, at: t[i], dur: 0.6 },
      { prim: "draw", target: `#${S}-ck${i + 1}`, at: t[i], dur: 0.4 },
      { prim: "reveal", target: `#${S}-ph${i + 1}`, at: t[i], dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-t${i + 1}`, at: t[i] + 0.08, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease },
    );
  });
  const hit = Math.min(last + 0.35, w.b - 0.6);
  m.push(
    { prim: "reveal", target: `#${S}-arrow`, at: hit, dur: 0.4, from: { opacity: 0, x: 110, y: -110 }, ease: "power4.out" },
    { prim: "reveal", target: `#${S}-eye`, at: Math.min(hit + 0.3, w.b - 0.35), dur: 0.3, from: { opacity: 0, scale: 0.3 }, ease: "back.out(3)" },
  );
  return card.wrap({ css, html, motions: m, driftFrom: Math.max(last + 0.6, hit + 0.65) });
}

// notify-stack — several notifications arriving one after another, after the HyperFrames registry block
// "notification-cascade" (heygen-com/hyperframes, Apache-2.0). The block restacks glass banners over a photo; here the
// banners are solid theme cards with a generic icon tile (no brand marks) that have their final rows from the start as
// faint empty outlines, so the stage is never blank. On its keyword each notification drops into its outline, its icon
// tile pops and its time stamp lights.
// cascade (signature): one centred column, the optional heading as a strip above it.
// split: the heading and a counter badge in the left column, the stack on the right.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.heading ? ["heading"] : []), ...slots.items.map((_, i) => `items.${i}`)];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const items = slots.items;
  const n = items.length;
  const split = ctx.variant === "split";
  const fit = (x, dur) => Math.max(w.a + 0.2, Math.min(x, w.b - dur - 0.05));
  const at = items.map((_, i) => fit(ctx.at(`items.${i}`), 0.7));

  // column geometry (stage px)
  const head = !!slots.heading && !split;
  const gap = 14;
  const topY = head ? 130 : 40;
  const cardH = Math.min(156, Math.floor((780 - topY - gap * (n - 1)) / n));
  const colX = split ? 760 : 330, colW = split ? 960 : 1100;
  const total = n * cardH + (n - 1) * gap;
  const y0 = split ? Math.round((820 - total) / 2) : topY;
  const ico = cardH >= 140 ? 84 : 72;
  const tf = cardH >= 140 ? 34 : 32, xf = cardH >= 140 ? 28 : 26;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-head { position: absolute; left: ${colX}px; top: 30px; width: ${colW}px; font-size: 48px; font-weight: 800; line-height: 1.15; color: var(--ink); text-align: center; }
#${S}-left { position: absolute; left: 80px; top: 0; width: 620px; height: 820px; display: flex; flex-direction: column; justify-content: center; gap: 30px; }
#${S}-big { font-size: 64px; font-weight: 800; line-height: 1.15; color: var(--ink); }
#${S}-badge { align-self: flex-start; display: flex; align-items: center; padding: 12px; border-radius: 999px;
  background: color-mix(in srgb, var(--gold) 16%, transparent); border: 2px solid color-mix(in srgb, var(--gold) 55%, transparent); }
#${S}-bn { min-width: 64px; height: 64px; border-radius: 32px; background: var(--gold); color: var(--canvas); display: flex; align-items: center; justify-content: center;
  font-size: 40px; font-weight: 800; }
.${S}-ghost { position: absolute; left: ${colX}px; width: ${colW}px; height: ${cardH}px; box-sizing: border-box; border-radius: ${R}px;
  border: 2px dashed color-mix(in srgb, var(--ink) 16%, transparent); background: color-mix(in srgb, var(--ink) 3%, transparent); }
.${S}-card { position: absolute; left: ${colX}px; width: ${colW}px; height: ${cardH}px; box-sizing: border-box; border-radius: ${R}px; background: var(--surface);
  border-top: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); box-shadow: 0 14px 30px color-mix(in srgb, var(--canvas) 70%, transparent); }
.${S}-ico { position: absolute; left: 28px; top: ${Math.round((cardH - ico) / 2)}px; width: ${ico}px; height: ${ico}px; border-radius: ${Math.round(ico * 0.3)}px;
  background: color-mix(in srgb, var(--gold) 18%, transparent); color: var(--gold); display: flex; align-items: center; justify-content: center; }
.${S}-ico svg { width: ${Math.round(ico * 0.56)}px; height: ${Math.round(ico * 0.56)}px; }
.${S}-tx { position: absolute; left: ${28 + ico + 26}px; right: 150px; top: 0; height: ${cardH}px; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
.${S}-ti { font-size: ${tf}px; font-weight: 800; line-height: 1.15; color: var(--ink); white-space: nowrap; }
.${S}-sub { font-size: ${xf}px; font-weight: 500; line-height: 1.25; color: var(--muted); white-space: nowrap; }
.${S}-when { position: absolute; right: 28px; top: 22px; font-size: 24px; font-weight: 700; color: var(--cyan); }`;

  const rowY = (i) => y0 + i * (cardH + gap);
  const ghosts = items.map((_, i) => `<div class="${S}-ghost" id="${S}-g${i}" style="top: ${rowY(i)}px"></div>`).join("\n  ");
  const cards = items.map((it, i) => `<div class="${S}-card" id="${S}-c${i}" style="top: ${rowY(i)}px">
    <div class="${S}-ico" id="${S}-i${i}">${ctx.icon(it.icon)}</div>
    <div class="${S}-tx"><div class="${S}-ti">${esc(it.title)}</div>${it.text ? `<div class="${S}-sub">${esc(it.text)}</div>` : ""}</div>
    ${it.when ? `<div class="${S}-when" id="${S}-w${i}">${esc(it.when)}</div>` : ""}
  </div>`).join("\n  ");
  const left = split ? `<div id="${S}-left">
    ${slots.heading ? `<div id="${S}-big">${esc(slots.heading)}</div>` : ""}
    <div id="${S}-badge"><div id="${S}-bn">0</div></div>
  </div>` : "";
  const html = `<div id="${S}-root">
  ${head ? `<div id="${S}-head">${esc(slots.heading)}</div>` : ""}
  ${left}
  ${ghosts}
  ${cards}
</div>`;

  const m = [];
  items.forEach((it, i) => {
    m.push(
      { prim: "reveal", target: `#${S}-g${i}`, at: w.a + 0.05 + i * 0.06, dur: 0.4, from: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-c${i}`, at: at[i], dur: 0.6, from: { opacity: 0, y: -46 }, ease: "expo.out" },
      { prim: "reveal", target: `#${S}-i${i}`, at: at[i] + 0.2, dur: 0.4, from: { opacity: 0, scale: 0.5 }, ease: "back.out(2)" },
    );
    if (it.when) m.push({ prim: "reveal", target: `#${S}-w${i}`, at: at[i] + 0.25, dur: 0.35, from: { opacity: 0, x: 14 } });
  });
  if (slots.heading) {
    m.push({ prim: "reveal", target: split ? `#${S}-big` : `#${S}-head`, at: fit(ctx.at("heading"), 0.5), dur: 0.5,
      from: split ? { opacity: 0, x: -30 } : { opacity: 0, y: -20 }, ease: ctx.ease });
  }
  if (split) {
    const last = Math.max(...at);
    m.push({ prim: "reveal", target: `#${S}-badge`, at: w.a + 0.1, dur: 0.45, from: { opacity: 0, scale: 0.85 }, ease: "back.out(2)" },
      { prim: "count", target: `#${S}-bn`, at: at[0], dur: Math.max(0.3, Math.min(1.5, last - at[0] + 0.4)), to: n });
  }
  const d = ctx.drift(`#${S}-root`, Math.max(...at) + 0.9 + ctx.gap, 8);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

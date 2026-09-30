// glass-widgets — numbers shown as frosted-glass widgets, after the HyperFrames registry block "liquid-glass-widgets"
// (heygen-com/hyperframes, Apache-2.0). The block refracts a WebGL aurora through a canvas glass library; here the glass
// is plain CSS (translucent gradient, bright rim, inner highlight) over a static aurora of soft radial gradients, with no
// backdrop blur and no canvas. Every widget stands from the window start with its label and a faint "0"; on its keyword
// the rim lights gold, the number counts up and the meter under it fills.
// row: 2–4 tall widgets side by side, the optional heading above.
// board (signature): the first item as one large widget on the left, the others stacked at the right.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.heading ? ["heading"] : []), ...slots.items.map((_, i) => `items.${i}`)];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const items = slots.items;
  const n = items.length;
  const board = ctx.variant === "board";
  const fit = (x, dur) => Math.max(w.a, Math.min(x, w.b - dur - 0.05));
  const lit = items.map((_, i) => Math.max(ctx.at(`items.${i}`), w.a + 0.47 + i * 0.05));
  const cdur = lit.map((t) => Math.max(0.3, Math.min(1.5, w.b - t - 0.1)));
  const at = lit.map((t, i) => fit(t, cdur[i]));

  // boxes in stage px
  let boxes;
  if (board) {
    const top = slots.heading ? 120 : 60, H = 780 - top;
    const gap = 20, rows = n - 1;
    const rh = Math.floor((H - gap * (rows - 1)) / rows);
    boxes = items.map((_, i) => i === 0
      ? { x: 80, y: top, w: 900, h: H, big: true }
      : { x: 1020, y: top + (i - 1) * (rh + gap), w: 660, h: rh, big: false });
  } else {
    const gap = 36, cw = Math.floor((1600 - (n - 1) * gap) / n);
    const h = 460, top = slots.heading ? 220 : 150;
    boxes = items.map((_, i) => ({ x: 80 + i * (cw + gap), y: top, w: cw, h, big: true }));
  }
  const compact = (b) => b.h < 260;
  // number size: the widest of digits + unit must fit the inner width
  const numFs = (it, b) => {
    const inner = b.w - (compact(b) ? 64 : 72);
    const digits = String(it.value).length, ul = [...(it.unit ?? "")].length;
    const cap = board && b.big ? 210 : compact(b) ? Math.max(48, Math.min(84, b.h - 150)) : 132;
    return Math.max(44, Math.min(cap, Math.floor(inner / (digits * 0.65 + ul * 0.26 + 0.1))));
  };

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-aur { position: absolute; inset: 0; overflow: hidden; }
.${S}-blob { position: absolute; border-radius: 50%; }
#${S}-a1 { left: 120px; top: 80px; width: 820px; height: 720px; background: radial-gradient(closest-side, color-mix(in srgb, var(--cyan) 42%, transparent), transparent); }
#${S}-a2 { left: 900px; top: 40px; width: 760px; height: 700px; background: radial-gradient(closest-side, color-mix(in srgb, var(--gold) 36%, transparent), transparent); }
#${S}-a3 { left: 560px; top: 320px; width: 700px; height: 560px; background: radial-gradient(closest-side, color-mix(in srgb, var(--warn) 30%, transparent), transparent); }
#${S}-grp { position: absolute; inset: 0; }
#${S}-head { position: absolute; left: 80px; top: 34px; width: 1600px; text-align: center; font-size: 56px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-w { position: absolute; box-sizing: border-box; border-radius: ${(theme.radius ?? 18) + 12}px; overflow: hidden;
  background: linear-gradient(150deg, color-mix(in srgb, var(--ink) 20%, transparent), color-mix(in srgb, var(--ink) 5%, transparent) 46%, color-mix(in srgb, var(--ink) 12%, transparent)),
    linear-gradient(180deg, color-mix(in srgb, var(--canvas) 45%, transparent), color-mix(in srgb, var(--canvas) 25%, transparent));
  border: 2px solid color-mix(in srgb, var(--ink) 32%, transparent);
  box-shadow: inset 0 2px 0 color-mix(in srgb, var(--ink) 40%, transparent), inset 0 -24px 44px color-mix(in srgb, var(--ink) 7%, transparent), 0 24px 48px color-mix(in srgb, var(--canvas) 55%, transparent); }
.${S}-sheen { position: absolute; left: 0; top: 0; right: 0; height: 46%; background: linear-gradient(180deg, color-mix(in srgb, var(--ink) 14%, transparent), transparent); pointer-events: none; }
.${S}-rim { position: absolute; inset: -2px; border-radius: inherit; border: 3px solid var(--gold); box-shadow: 0 0 26px color-mix(in srgb, var(--gold) 45%, transparent); }
.${S}-in { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-start; }
.${S}-lab { font-weight: 700; line-height: 1.2; color: var(--ink); }
.${S}-val { display: flex; align-items: baseline; gap: 10px; white-space: nowrap; color: var(--gold); font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.${S}-unit { font-weight: 700; color: color-mix(in srgb, var(--gold) 80%, transparent); }
.${S}-note { font-weight: 500; line-height: 1.25; color: var(--muted); }
.${S}-trk { position: absolute; border-radius: 999px; background: color-mix(in srgb, var(--ink) 16%, transparent); overflow: hidden; }
.${S}-fill { width: 100%; height: 100%; border-radius: inherit; transform-origin: 0 50%; background: linear-gradient(90deg, var(--cyan), var(--gold)); }`;

  const widgets = items.map((it, i) => {
    const b = boxes[i], c = compact(b);
    const pad = c ? 22 : b.big && board ? 48 : 36;
    const fs = numFs(it, b);
    const tight = b.h < 230;
    const lf = c ? (tight ? 26 : 28) : board && b.big ? 40 : 34, nf = c ? (tight ? 22 : 24) : board && b.big ? 32 : 28;
    const trackH = c ? 10 : 14;
    const gap = c ? 6 : board && b.big ? 28 : 18;
    return `<div class="${S}-w" id="${S}-w${i}" style="left: ${b.x}px; top: ${b.y}px; width: ${b.w}px; height: ${b.h}px">
    <div class="${S}-sheen"></div>
    <div class="${S}-in" style="padding: ${pad}px ${pad}px ${pad + (it.meter != null ? trackH + 16 : 0)}px; gap: ${gap}px${c ? "" : "; justify-content: center"}">
      <div class="${S}-lab" style="font-size: ${lf}px">${esc(it.label)}</div>
      <div class="${S}-val" id="${S}-n${i}" style="font-size: ${fs}px"><span id="${S}-v${i}">0</span>${it.unit ? `<span class="${S}-unit" style="font-size: ${Math.round(fs * 0.4)}px">${esc(it.unit)}</span>` : ""}</div>
      ${it.note ? `<div class="${S}-note" id="${S}-t${i}" style="font-size: ${nf}px">${esc(it.note)}</div>` : ""}
    </div>
    ${it.meter != null ? `<div class="${S}-trk" style="left: ${pad}px; right: ${pad}px; bottom: ${pad}px; height: ${trackH}px"><div class="${S}-fill" id="${S}-f${i}" style="width: ${Math.max(2, it.meter)}%; height: 100%"></div></div>` : ""}
    <div class="${S}-rim" id="${S}-r${i}"></div>
  </div>`;
  }).join("\n  ");

  const html = `<div id="${S}-root">
  <div id="${S}-aur" aria-hidden="true"><div class="${S}-blob" id="${S}-a1"></div><div class="${S}-blob" id="${S}-a2"></div><div class="${S}-blob" id="${S}-a3"></div></div>
  <div id="${S}-grp">
  ${slots.heading ? `<div id="${S}-head">${esc(slots.heading)}</div>` : ""}
  ${widgets}
  </div>
</div>`;

  const m = [{ prim: "reveal", target: `#${S}-aur`, at: w.a, dur: 0.9, from: { opacity: 0 } }];
  items.forEach((it, i) => {
    m.push(
      { prim: "reveal", target: `#${S}-w${i}`, at: w.a + 0.05 + i * 0.09, dur: 0.55, from: { opacity: 0, y: 60 }, ease: "expo.out" },
      { prim: "reveal", target: `#${S}-n${i}`, at: w.a + 0.05 + i * 0.09, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.3 } },
      { prim: "reveal", target: `#${S}-n${i}`, at: at[i], dur: 0.35, from: { opacity: 0.3 }, to: { opacity: 1 } },
      { prim: "count", target: `#${S}-v${i}`, at: at[i], dur: cdur[i], to: it.value },
      { prim: "reveal", target: `#${S}-r${i}`, at: at[i], dur: 0.4, from: { opacity: 0 } },
    );
    if (it.meter != null) m.push({ prim: "reveal", target: `#${S}-f${i}`, at: at[i], dur: cdur[i], from: { scaleX: 0 }, ease: "power2.out" });
    if (it.note) m.push({ prim: "reveal", target: `#${S}-t${i}`, at: at[i] + 0.15, dur: 0.4, from: { opacity: 0, y: 10 } });
  });
  if (slots.heading) m.push({ prim: "reveal", target: `#${S}-head`, at: fit(ctx.at("heading"), 0.5), dur: 0.5, from: { opacity: 0, y: -20 }, ease: ctx.ease });
  const end = Math.max(...at.map((t, i) => t + cdur[i]));
  const d = ctx.drift(`#${S}-grp`, end + 0.3 + ctx.gap, 8);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

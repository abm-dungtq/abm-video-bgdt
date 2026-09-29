// progress-stat — one number measured against a maximum ("22 of 30"): a big count-up, its label, a gauge that fills to
// value / max on the same beat as the count, and an optional caption. Ported from the HyperFrames registry block
// mk-progress-stat (Apache-2.0, heygen-com/hyperframes) onto the ctx API.
// The number stands at a faint "0" and the empty gauge is drawn from the window start, so the stage is never empty.
// track: centred column — label on top, the number, one long rounded track with "0" and the maximum under its ends,
//   the caption below.
// blocks: the number (with "trên <max>") on the left; on the right the label over ten segments that fill one after
//   another up to value / max (the last one partly), the caption underneath.

export const revealKeys = (slots) => ["value", "label", ...(slots.caption ? ["caption"] : [])];

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const R = ctx.theme.radius ?? 18;
  const frac = Math.max(0, Math.min(1, slots.value / slots.max));
  const suf = slots.suffix ? esc(slots.suffix) : "";
  const digits = String(slots.value).length;
  const fit = (x, dur) => Math.max(w.a, Math.min(x, w.b - dur - 0.05));
  const tV = ctx.at("value"), tL = fit(ctx.at("label"), 0.5);
  const tC = slots.caption ? fit(ctx.at("caption"), 0.5) : null;
  // the number: faint "0" at the start, bright and counting on its keyword, the gauge filling on the same ease
  const lit = Math.max(tV, w.a + 0.47);
  const cdur = Math.max(0.3, Math.min(1.6, w.b - lit - 0.1));
  const tn = fit(lit, cdur);
  // font size so the digits plus the suffix fit the given width (digits ~0.62 em, suffix at 0.4 em ~0.55 em a glyph)
  const fsFor = (width, cap) => Math.min(cap, Math.floor(width / (digits * 0.62 + (slots.suffix ? 0.4 * 0.55 * slots.suffix.length + 0.1 : 0))));
  const m = [
    { prim: "reveal", target: `#${S}-n`, at: w.a + 0.05, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.3 } },
    { prim: "reveal", target: `#${S}-n`, at: fit(lit, 0.35), dur: 0.35, from: { opacity: 0.3 }, to: { opacity: 1 } },
    { prim: "count", target: `#${S}-nv`, at: tn, dur: cdur, to: slots.value, ease: "power2.out" },
    { prim: "reveal", target: `#${S}-lab`, at: tL, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease },
  ];
  if (tC != null) m.push({ prim: "reveal", target: `#${S}-cap`, at: tC, dur: 0.5, from: { opacity: 0, y: 16 } });
  let css, html;

  if (ctx.variant === "blocks") {
    const fs = fsFor(620, 220);
    const SEG = 10, gap = 16, sw = Math.floor((1040 - (SEG - 1) * gap) / SEG);
    const full = Math.floor(frac * SEG + 1e-9), part = frac * SEG - full;
    const segs = Array.from({ length: SEG }, (_, i) => {
      const width = i < full ? 100 : i === full ? Math.round(part * 100) : 0;
      return `<div class="${S}-seg" style="left: ${i * (sw + gap)}px">${width ? `<div class="${S}-sf" id="${S}-f${i + 1}" style="width: ${width}%"></div>` : ""}</div>`;
    }).join("");
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-num { position: absolute; left: 0; top: 190px; width: 680px; text-align: center; }
#${S}-n { font-size: ${fs}px; font-weight: 800; line-height: 1; color: var(--gold); font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-suf { font-size: ${Math.round(fs * 0.4)}px; margin-left: 10px; color: color-mix(in srgb, var(--gold) 75%, transparent); }
#${S}-of { margin-top: 28px; font-size: 44px; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
#${S}-lab { position: absolute; left: 720px; top: 170px; width: 1040px; font-size: 60px; font-weight: 800; line-height: 1.12; color: var(--ink); }
#${S}-segs { position: absolute; left: 720px; top: 380px; width: 1040px; height: 130px; }
.${S}-seg { position: absolute; top: 0; width: ${sw}px; height: 130px; border-radius: ${Math.min(R, 16)}px; overflow: hidden;
  background: color-mix(in srgb, var(--ink) 9%, transparent); border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); box-sizing: border-box; }
.${S}-sf { position: absolute; left: 0; top: 0; height: 100%; background: var(--gold); transform-origin: 0 50%; }
#${S}-ends { position: absolute; left: 720px; top: 530px; width: 1040px; display: flex; justify-content: space-between;
  font-size: 32px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
#${S}-cap { position: absolute; left: 720px; top: 610px; width: 1040px; font-size: 40px; font-weight: 600; line-height: 1.25; color: var(--cyan); }`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <div id="${S}-num"><div id="${S}-n"><span id="${S}-nv">0</span>${suf ? `<span class="${S}-suf">${suf}</span>` : ""}</div><div id="${S}-of">trên ${slots.max}</div></div>
    <div id="${S}-lab">${esc(slots.label)}</div>
    <div id="${S}-segs">${segs}</div>
    <div id="${S}-ends"><span>0</span><span>${slots.max}${suf ? ` ${suf}` : ""}</span></div>
    ${slots.caption ? `<div id="${S}-cap">${esc(slots.caption)}</div>` : ""}
  </div>
</div>`;
    const lit2 = full + (part > 0 ? 1 : 0);
    // segment i starts when the power2.out count passes its share of the value, so segments and digits move together
    const when = (k) => tn + cdur * (1 - Math.sqrt(Math.max(0, 1 - Math.min(1, k / (frac * SEG)))));
    m.push(
      { prim: "reveal", target: `#${S}-segs`, at: w.a, dur: 0.45, from: { opacity: 0, x: 40 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-of`, at: w.a + 0.1, dur: 0.4, from: { opacity: 0, y: 12 } },
      { prim: "reveal", target: `#${S}-ends`, at: w.a + 0.15, dur: 0.4, from: { opacity: 0 } },
      ...Array.from({ length: lit2 }, (_, i) => ({ prim: "reveal", target: `#${S}-f${i + 1}`, at: when(i), dur: Math.max(0.08, when(i + 1) - when(i)), from: { scaleX: 0 }, ease: "none" })),
    );
  } else {
    // track
    const fs = fsFor(1600, 210);
    const TW = 1000;
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-lab { position: absolute; left: 280px; top: 150px; width: 1200px; text-align: center; font-size: 56px; font-weight: 800; line-height: 1.12; color: var(--ink); }
#${S}-n { position: absolute; left: 0; top: ${440 - fs}px; width: 1760px; text-align: center; font-size: ${fs}px; font-weight: 800; line-height: 1;
  color: var(--gold); font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-suf { font-size: ${Math.round(fs * 0.4)}px; margin-left: 12px; color: color-mix(in srgb, var(--gold) 75%, transparent); }
#${S}-trk { position: absolute; left: ${880 - TW / 2}px; top: 480px; width: ${TW}px; height: 26px; border-radius: 13px; overflow: hidden;
  background: color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-fill { position: absolute; left: 0; top: 0; height: 100%; width: ${Math.max(1, Math.round(frac * TW))}px; border-radius: 13px;
  background: var(--gold); transform-origin: 0 50%; }
#${S}-ends { position: absolute; left: ${880 - TW / 2}px; top: 524px; width: ${TW}px; display: flex; justify-content: space-between;
  font-size: 32px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
#${S}-cap { position: absolute; left: 280px; top: 610px; width: 1200px; text-align: center; font-size: 40px; font-weight: 600; line-height: 1.25; color: var(--cyan); }`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <div id="${S}-lab">${esc(slots.label)}</div>
    <div id="${S}-n"><span id="${S}-nv">0</span>${suf ? `<span class="${S}-suf">${suf}</span>` : ""}</div>
    <div id="${S}-trk"><div id="${S}-fill"></div></div>
    <div id="${S}-ends"><span>0</span><span>${slots.max}${suf ? ` ${suf}` : ""}</span></div>
    ${slots.caption ? `<div id="${S}-cap">${esc(slots.caption)}</div>` : ""}
  </div>
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-trk`, at: w.a, dur: 0.45, from: { opacity: 0, scaleX: 0.6 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-ends`, at: w.a + 0.15, dur: 0.4, from: { opacity: 0, y: 10 } },
      { prim: "reveal", target: `#${S}-fill`, at: tn, dur: cdur, from: { scaleX: 0 }, ease: "power2.out" },
    );
  }
  const end = Math.max(tn + cdur, tL + 0.5, tC != null ? tC + 0.5 : 0);
  const d = ctx.drift(`#${S}-grp`, fit(end + 0.3, 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: m };
}

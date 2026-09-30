// notify-single — one prominent notification, after the HyperFrames registry block "macos-notification"
// (heygen-com/hyperframes, Apache-2.0). The block slides a dark blurred OS card in from the right; here it is a generic
// card on a solid theme surface (no backdrop blur, no vendor branding) with an icon tile, an app line, a time stamp,
// a title and a body. Two ghost cards peek out behind it and a dashed outline marks where it will land, so the stage
// is never empty before the keyword. On the title's keyword the card slides in and the icon tile pops; the body
// fades up after it.
// banner: the card centred, a little over half the stage wide, sliding down from above.
// spotlight (signature): a wide card in large type sliding in from the right, ripple rings pulsing round the icon.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["title", ...(slots.body ? ["body"] : [])];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const spot = ctx.variant === "spotlight";
  const fit = (x, dur) => Math.max(w.a + 0.2, Math.min(x, w.b - dur - 0.05));
  const tT = fit(ctx.at("title"), 0.7);
  const tB = slots.body ? Math.min(fit(ctx.at("body"), 0.6), w.b - 0.65) : null;
  const tBody = tB == null ? null : Math.max(tB, tT + 0.35);

  const W = spot ? 1440 : 1040;
  const ico = spot ? 148 : 104;
  const pad = spot ? 48 : 36;
  const fa = spot ? 30 : 24, ft = spot ? 66 : 48, fb = spot ? 42 : 32;

  const css = `
#${S}-root { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
#${S}-stage { position: relative; width: ${W}px; }
.${S}-back { position: absolute; left: 0; right: 0; top: 0; bottom: 0; border-radius: ${R + 4}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-b1 { transform: translateY(-22px) scale(0.94); opacity: 0.6; }
#${S}-b2 { transform: translateY(-42px) scale(0.88); opacity: 0.35; }
#${S}-outline { position: absolute; inset: 0; border-radius: ${R + 4}px; border: 3px dashed color-mix(in srgb, var(--ink) 20%, transparent); }
#${S}-card { position: relative; box-sizing: border-box; width: ${W}px; padding: ${pad}px; border-radius: ${R + 4}px; background: var(--surface);
  border-top: 3px solid var(--gold); box-shadow: 0 30px 60px color-mix(in srgb, var(--canvas) 75%, transparent); display: flex; align-items: flex-start; gap: ${spot ? 40 : 30}px; }
#${S}-ico { position: relative; flex: none; width: ${ico}px; height: ${ico}px; border-radius: ${Math.round(ico * 0.28)}px;
  background: color-mix(in srgb, var(--gold) 18%, transparent); color: var(--gold); display: flex; align-items: center; justify-content: center; }
#${S}-ico svg { width: ${Math.round(ico * 0.56)}px; height: ${Math.round(ico * 0.56)}px; }
.${S}-ring { position: absolute; left: -6px; top: -6px; width: ${ico + 12}px; height: ${ico + 12}px; box-sizing: border-box; border-radius: ${Math.round(ico * 0.34)}px;
  border: 3px solid var(--gold); opacity: 0; }
#${S}-cnt { flex: 1; min-width: 0; }
#${S}-hd { display: flex; justify-content: space-between; align-items: baseline; gap: 20px; margin-bottom: ${spot ? 14 : 8}px; }
#${S}-app { font-size: ${fa}px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
#${S}-when { font-size: ${fa}px; font-weight: 700; color: var(--cyan); white-space: nowrap; }
#${S}-title { font-size: ${ft}px; font-weight: 800; line-height: 1.15; color: var(--ink); }
#${S}-body { margin-top: ${spot ? 18 : 12}px; font-size: ${fb}px; font-weight: 500; line-height: 1.35; color: var(--muted); }`;

  const html = `<div id="${S}-root">
  <div id="${S}-stage">
    <div class="${S}-back" id="${S}-b2"></div>
    <div class="${S}-back" id="${S}-b1"></div>
    <div id="${S}-outline"></div>
    <div id="${S}-card">
      <div id="${S}-ico">${ctx.icon(slots.icon)}<div class="${S}-ring" id="${S}-r1"></div><div class="${S}-ring" id="${S}-r2"></div></div>
      <div id="${S}-cnt">
        ${slots.app || slots.when ? `<div id="${S}-hd"><div id="${S}-app">${esc(slots.app ?? "")}</div>${slots.when ? `<div id="${S}-when">${esc(slots.when)}</div>` : ""}</div>` : ""}
        <div id="${S}-title">${esc(slots.title)}</div>
        ${slots.body ? `<div id="${S}-body">${esc(slots.body)}</div>` : ""}
      </div>
    </div>
  </div>
</div>`;

  const m = [
    { prim: "reveal", target: `#${S}-b2`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0 }, to: { opacity: 0.35 } },
    { prim: "reveal", target: `#${S}-b1`, at: w.a + 0.15, dur: 0.5, from: { opacity: 0 }, to: { opacity: 0.6 } },
    { prim: "reveal", target: `#${S}-outline`, at: w.a + 0.05, dur: 0.4, from: { opacity: 0 } },
    { prim: "reveal", target: `#${S}-card`, at: tT, dur: 0.6, from: spot ? { opacity: 0, x: 220 } : { opacity: 0, y: -160 }, ease: "expo.out" },
    { prim: "reveal", target: `#${S}-ico`, at: tT + 0.2, dur: 0.45, from: { opacity: 0, scale: 0.5 }, ease: "back.out(2)" },
  ];
  if (slots.body) m.push({ prim: "reveal", target: `#${S}-body`, at: tBody, dur: 0.5, from: { opacity: 0, y: 14 }, ease: ctx.ease });
  if (spot) {
    const r0 = tT + 0.55;
    ["r1", "r2"].forEach((r, k) => m.push({ prim: "reveal", target: `#${S}-${r}`, at: r0 + k * 0.35, dur: 0.9,
      from: { opacity: 0.8, scale: 1 }, to: { opacity: 0, scale: 1.7 }, ease: "power2.out" }));
  }
  const d = ctx.drift(`#${S}-stage`, Math.max(tT, tBody ?? 0) + 0.7 + ctx.gap, 8);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

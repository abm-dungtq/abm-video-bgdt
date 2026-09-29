// specs-list — 2–6 features, each a label with an optional value, ticked off one by one. Ported from the HyperFrames
// registry block mk-specs-list (Apache-2.0, heygen-com/hyperframes) onto the ctx API, with a drawn check mark added.
// Every row enters at the window start with an empty check and its label dimmed, so the stage is never empty; on its
// keyword the check fills and draws, the label brightens and the value slides in.
// rows: a spec sheet — one row per feature across the stage: round check, label, value on the right, an accent
//   underline that sweeps under the row when it is ticked.
// checklist: cards in two columns (the first half left, the rest right), a square checkbox that fills gold and draws
//   its tick, the label with the value under it.

export const revealKeys = (slots) => [...(slots.heading ? ["heading"] : []), ...slots.items.map((_, i) => `items.${i}`)];

const CHECK = "M5 12.5 L10 17.5 L19.5 7";

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const R = ctx.theme.radius ?? 18;
  const items = slots.items;
  const n = items.length;
  // a row finishes 0.65 s after its keyword: keep the late ones inside the window
  const t = items.map((_, i) => Math.max(w.a, Math.min(ctx.at(`items.${i}`), w.b - 0.7)));
  const head = slots.heading ? `<div id="${S}-head">${esc(slots.heading)}</div>` : "";
  const list = ctx.variant === "checklist";
  const tick = (i) => `<svg class="${S}-tk" viewBox="0 0 24 24" aria-hidden="true"><path id="${S}-p${i + 1}" pathLength="1000" d="${CHECK}"/></svg>`;
  let css, rows;

  if (list) {
    const per = Math.ceil(n / 2);
    const top = slots.heading ? 130 : 60;
    const gap = 28;
    const h = Math.min(210, Math.floor((800 - top - (per - 1) * gap) / per));
    const box = Math.min(84, h - 56);
    const boxes = items.map((_, i) => {
      const col = i < per ? 0 : 1, row = col ? i - per : i;
      return { x: col ? 900 : 0, y: top + row * (h + gap) };
    });
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-head { position: absolute; left: 0; top: 20px; width: 1760px; text-align: center; font-size: 54px; font-weight: 800; line-height: 1.15; color: var(--ink); }
#${S}-grid { position: absolute; inset: 0; }
.${S}-row { position: absolute; width: 860px; height: ${h}px; box-sizing: border-box; border-radius: ${R}px; background: var(--surface);
  border-left: 4px solid color-mix(in srgb, var(--cyan) 45%, transparent); }
.${S}-box { position: absolute; left: 36px; top: ${Math.round((h - box) / 2)}px; width: ${box}px; height: ${box}px; box-sizing: border-box;
  border-radius: 14px; border: 3px solid color-mix(in srgb, var(--cyan) 70%, transparent); }
.${S}-disc { position: absolute; left: 36px; top: ${Math.round((h - box) / 2)}px; width: ${box}px; height: ${box}px; border-radius: 14px; background: var(--gold); }
.${S}-tk { position: absolute; left: ${36 + Math.round(box * 0.14)}px; top: ${Math.round((h - box) / 2 + box * 0.14)}px; width: ${Math.round(box * 0.72)}px;
  height: ${Math.round(box * 0.72)}px; overflow: visible; }
.${S}-tk path { fill: none; stroke: var(--canvas); stroke-width: 3.4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-txt { position: absolute; left: ${36 + box + 34}px; top: 0; width: ${860 - (36 + box + 34) - 30}px; height: ${h}px;
  display: flex; flex-direction: column; justify-content: center; }
.${S}-lab { font-size: ${h < 150 ? 40 : 44}px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-val { margin-top: 10px; font-size: ${h < 150 ? 28 : 31}px; font-weight: 500; line-height: 1.3; color: var(--muted); }
${boxes.map((b, i) => `#${S}-r${i + 1} { left: ${b.x}px; top: ${b.y}px; }`).join("\n")}`;
    rows = items.map((it, i) => `    <div class="${S}-row" id="${S}-r${i + 1}">
      <div class="${S}-box"></div>
      <div class="${S}-disc" id="${S}-d${i + 1}"></div>
      ${tick(i)}
      <div class="${S}-txt"><div class="${S}-lab" id="${S}-l${i + 1}">${esc(it.label)}</div>${it.value ? `<div class="${S}-val" id="${S}-v${i + 1}">${esc(it.value)}</div>` : ""}</div>
    </div>`);
  } else {
    // rows
    const top = slots.heading ? 150 : 70;
    const pitch = Math.min(130, Math.floor((800 - top) / n));
    const c = 64;
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-head { position: absolute; left: 152px; top: 30px; width: 1456px; font-size: 54px; font-weight: 800; line-height: 1.15; color: var(--ink); }
#${S}-grid { position: absolute; inset: 0; }
.${S}-row { position: absolute; left: 152px; width: 1456px; height: ${pitch}px; }
.${S}-box { position: absolute; left: 0; top: ${Math.round((pitch - c) / 2) - 6}px; width: ${c}px; height: ${c}px; box-sizing: border-box; border-radius: 50%;
  border: 3px solid color-mix(in srgb, var(--cyan) 70%, transparent); }
.${S}-disc { position: absolute; left: 0; top: ${Math.round((pitch - c) / 2) - 6}px; width: ${c}px; height: ${c}px; border-radius: 50%; background: var(--gold); }
.${S}-tk { position: absolute; left: 12px; top: ${Math.round((pitch - c) / 2) + 6}px; width: 40px; height: 40px; overflow: visible; }
.${S}-tk path { fill: none; stroke: var(--canvas); stroke-width: 3.4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-lab { position: absolute; left: 100px; top: 0; width: 640px; height: ${pitch - 12}px; display: flex; align-items: center;
  font-size: 42px; font-weight: 800; line-height: 1.1; color: var(--ink); }
.${S}-val { position: absolute; left: 760px; top: 0; width: 696px; height: ${pitch - 12}px; display: flex; align-items: center; justify-content: flex-end;
  text-align: right; font-size: 34px; font-weight: 600; line-height: 1.2; color: var(--muted); }
.${S}-ul { position: absolute; left: 100px; top: ${pitch - 8}px; width: 1356px; height: 3px; background: color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-uf { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: var(--gold); transform-origin: 0 50%; }
${items.map((_, i) => `#${S}-r${i + 1} { top: ${top + i * pitch}px; }`).join("\n")}`;
    rows = items.map((it, i) => `    <div class="${S}-row" id="${S}-r${i + 1}">
      <div class="${S}-box"></div>
      <div class="${S}-disc" id="${S}-d${i + 1}"></div>
      ${tick(i)}
      <div class="${S}-lab" id="${S}-l${i + 1}">${esc(it.label)}</div>
      ${it.value ? `<div class="${S}-val" id="${S}-v${i + 1}">${esc(it.value)}</div>` : ""}
      <div class="${S}-ul"><div class="${S}-uf" id="${S}-u${i + 1}"></div></div>
    </div>`);
  }

  const html = `<div id="${S}-root">
  ${head}
  <div id="${S}-grid">
${rows.join("\n")}
  </div>
</div>`;
  const m = items.flatMap((it, i) => {
    const enter = Math.min(t[i], w.a + 0.05 + i * 0.08);
    const ghost = t[i] - enter >= 0.7; // time to show the dimmed label before the keyword ticks the row
    return [
      { prim: "reveal", target: `#${S}-r${i + 1}`, at: enter, dur: 0.5, from: { opacity: 0, x: list && i >= Math.ceil(n / 2) ? 36 : -36 }, ease: ctx.ease },
      ...(ghost ? [{ prim: "reveal", target: `#${S}-l${i + 1}`, at: enter + 0.1, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.35 } }] : []),
      { prim: "reveal", target: `#${S}-l${i + 1}`, at: t[i], dur: 0.4, from: { opacity: ghost ? 0.35 : 0 }, to: { opacity: 1 } },
      { prim: "reveal", target: `#${S}-d${i + 1}`, at: t[i], dur: 0.35, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" },
      { prim: "draw", target: `#${S}-p${i + 1}`, at: t[i] + 0.15, dur: 0.35, ease: "power2.out" },
      ...(it.value ? [{ prim: "reveal", target: `#${S}-v${i + 1}`, at: t[i] + 0.1, dur: 0.45, from: { opacity: 0, x: list ? 0 : 30, y: list ? 12 : 0 } }] : []),
      ...(list ? [] : [{ prim: "reveal", target: `#${S}-u${i + 1}`, at: t[i] + 0.05, dur: 0.6, from: { scaleX: 0 }, ease: "power2.inOut" }]),
    ];
  });
  if (slots.heading) m.push({ prim: "reveal", target: `#${S}-head`, at: ctx.at("heading"), dur: 0.5, from: { opacity: 0, y: -20 } });
  const drift = ctx.drift(`#${S}-grid`, Math.max(...t) + 0.7 + ctx.gap);
  if (drift) m.push(drift);
  return { css, html, motions: m };
}

// cards — 2–4 labelled cards. The cards enter at the window start already numbered (01, 02…) with a faint icon, so the
// stage is never a row of empty boxes; on its keyword each card lights: accent bar, icon pops, text rises. grid-3: one row of tall cards, icon on top.
// grid-4: a 2 × 2 grid of wide cards, icon at the left, alternating entry sides. Optional heading above.

export const revealKeys = (slots) => [...(slots.heading ? ["heading"] : []), ...slots.items.map((_, i) => `items.${i}`)];

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const items = slots.items;
  const n = items.length;
  const t = items.map((_, i) => ctx.at(`items.${i}`));
  const last = Math.max(...t);
  const head = slots.heading ? `<div id="${S}-head">${esc(slots.heading)}</div>` : "";
  const wide = ctx.variant === "grid-4";

  let boxes;
  if (wide) {
    const top = slots.heading ? 170 : 110;
    boxes = items.map((_, i) => ({ x: 80 + (i % 2) * 840, y: top + Math.floor(i / 2) * 340, w: 760, h: 300 }));
  } else {
    const cw = Math.floor((1600 - (n - 1) * 40) / n);
    const top = slots.heading ? 200 : 150;
    boxes = items.map((_, i) => ({ x: 80 + i * (cw + 40), y: top, w: cw, h: 470 }));
  }
  const label = wide ? 44 : n === 4 ? 38 : 44;
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-head { position: absolute; left: 80px; top: 40px; width: 1600px; text-align: center; font-size: 56px; font-weight: 800; color: var(--ink); }
#${S}-grid { position: absolute; inset: 0; }
.${S}-card { position: absolute; box-sizing: border-box; background: var(--surface); border-radius: ${ctx.theme.radius ?? 18}px;
  border-top: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); overflow: hidden; padding: ${wide ? "40px 44px 40px 176px" : "48px 40px"}; }
.${S}-ico { ${wide ? "position: absolute; left: 44px; top: 44px;" : "margin-bottom: 34px;"} width: 96px; height: 96px; border-radius: 50%;
  background: color-mix(in srgb, var(--gold) 14%, transparent); color: var(--gold); display: flex; align-items: center; justify-content: center; }
.${S}-ico svg { width: 54px; height: 54px; }
.${S}-num { position: absolute; right: 28px; top: 22px; font-family: "${ctx.theme.mono}", monospace; font-size: 40px; font-weight: 700;
  color: var(--cyan); opacity: 0.85; }
.${S}-lit { position: absolute; left: 0; top: 0; width: 100%; height: 4px; background: var(--gold); transform-origin: 0 50%; }
.${S}-label { font-size: ${label}px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-note { margin-top: 16px; font-size: 30px; font-weight: 500; line-height: 1.35; color: var(--muted); }
${boxes.map((b, i) => `#${S}-c${i + 1} { left: ${b.x}px; top: ${b.y}px; width: ${b.w}px; height: ${b.h}px; }`).join("\n")}`;
  const html = `<div id="${S}-root">
  ${head}
  <div id="${S}-grid">
${items.map((it, i) => `    <div class="${S}-card" id="${S}-c${i + 1}">
      <div class="${S}-lit" id="${S}-l${i + 1}"></div>
      <div class="${S}-num" id="${S}-n${i + 1}">${String(i + 1).padStart(2, "0")}</div>
      <div class="${S}-ico" id="${S}-i${i + 1}">${ctx.icon(it.icon)}</div>
      <div class="${S}-body" id="${S}-b${i + 1}"><div class="${S}-label">${esc(it.label)}</div>${it.note ? `<div class="${S}-note">${esc(it.note)}</div>` : ""}</div>
    </div>`).join("\n")}
  </div>
</div>`;
  const m = items.flatMap((_, i) => {
    const enter = Math.min(t[i], w.a + 0.1 + i * 0.08);
    const ghost = t[i] - enter >= 0.7; // time to show the faint icon before the keyword lights the card
    return [
      { prim: "reveal", target: `#${S}-c${i + 1}`, at: enter, dur: 0.5, from: wide ? { opacity: 0, x: i % 2 ? 60 : -60 } : { opacity: 0, y: 50 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-n${i + 1}`, at: enter + 0.15, dur: 0.4, from: { opacity: 0, x: 12 } },
      ...(ghost ? [{ prim: "reveal", target: `#${S}-i${i + 1}`, at: enter + 0.15, dur: 0.35, from: { opacity: 0, scale: 0.8 }, to: { opacity: 0.3, scale: 0.8 } }] : []),
      { prim: "reveal", target: `#${S}-i${i + 1}`, at: t[i], dur: 0.45, from: ghost ? { opacity: 0.3, scale: 0.8 } : { opacity: 0, scale: 0.5 }, ease: "back.out(2)" },
      { prim: "reveal", target: `#${S}-l${i + 1}`, at: t[i], dur: 0.4, from: { scaleX: 0 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-b${i + 1}`, at: t[i] + 0.1, dur: 0.45, from: { opacity: 0, y: 18 } },
    ];
  });
  if (slots.heading) m.push({ prim: "reveal", target: `#${S}-head`, at: ctx.at("heading"), dur: 0.5, from: { opacity: 0, y: -20 } });
  const drift = ctx.drift(`#${S}-grid`, last + 0.55 + ctx.gap);
  if (drift) m.push(drift);
  return { css, html, motions: m };
}

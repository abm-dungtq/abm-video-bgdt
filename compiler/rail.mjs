// rail.mjs — the frame-level progress rail (e.g. "Tính năng · Vì sao nổi bật · Bạn được gì") across the top of a frame.
// Geometry from the Claude lesson: a row of 340×44 pills at stage x 480–1548, y 4–48, radius 22, 24 px gaps, each with a
// number badge. A pill lights on its cue (an accent overlay fades in; colours are never tweened) and stays lit.
// The frame's shots keep their content at y ≥ 140 so the rail never covers them.

const PILL = { w: 340, h: 44, gap: 24, top: 4 };

/**
 * @param rail   { slots: string[], times: number[] } (times already resolved, frame-relative)
 * @param pfx    frame prefix, e.g. "f44"
 * @param opts   { esc, icon, start }  start = when the rail enters (the frame start)
 */
export function renderRail(rail, pfx, { esc, icon, start = 0 }) {
  const R = `${pfx}-rail`;
  const n = rail.slots.length;
  const width = n * PILL.w + (n - 1) * PILL.gap;
  const left = Math.min(480, 1760 - width); // 480 = the Claude lesson's rail; wider rails shift left to stay on stage
  const css = `
#${R} { position: absolute; left: ${left}px; top: ${PILL.top}px; width: ${width}px; height: ${PILL.h}px; z-index: 5; }
.${R}-pill, .${R}-lit { position: absolute; top: 0; width: ${PILL.w}px; height: ${PILL.h}px; box-sizing: border-box; border-radius: 22px;
  display: flex; align-items: center; padding: 0 16px; font-size: 26px; font-weight: 600; white-space: nowrap; }
.${R}-pill { background: var(--surface); border: 1px solid color-mix(in srgb, var(--ink) 12%, transparent); color: var(--muted); }
.${R}-lit { border: 2px solid var(--gold); color: var(--ink); background: color-mix(in srgb, var(--gold) 10%, var(--surface)); }
.${R}-badge { width: 26px; height: 26px; margin-right: 10px; border-radius: 50%; border: 1.5px solid currentColor; display: flex;
  align-items: center; justify-content: center; font-size: 16px; flex: none; }
.${R}-lit .${R}-badge { color: var(--gold); }
.${R}-lit svg { position: absolute; right: 12px; top: 9px; width: 26px; height: 26px; color: var(--gold); }
${rail.slots.map((_, i) => `#${R}-p${i + 1}, #${R}-l${i + 1} { left: ${i * (PILL.w + PILL.gap)}px; }`).join("\n")}`;
  const html = `<div id="${R}">
${rail.slots.map((s, i) => `  <div class="${R}-pill" id="${R}-p${i + 1}"><span class="${R}-badge">${i + 1}</span>${esc(s)}</div>
  <div class="${R}-lit" id="${R}-l${i + 1}"><span class="${R}-badge">${i + 1}</span>${esc(s)}${icon("spark")}</div>`).join("\n")}
</div>`;
  const motions = [
    ...rail.slots.map((_, i) => ({ prim: "reveal", target: `#${R}-p${i + 1}`, at: start + 0.05 + i * 0.08, dur: 0.4, from: { opacity: 0, y: -12 } })),
    ...rail.times.map((t, i) => ({ prim: "reveal", target: `#${R}-l${i + 1}`, at: Math.max(t, start + 0.5), dur: 0.3, from: { opacity: 0 }, ease: "power2.out" })),
  ];
  return { css, html, motions };
}

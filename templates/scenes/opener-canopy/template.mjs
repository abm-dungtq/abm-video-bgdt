// opener-canopy — a video opener after the HyperFrames registry block "canopy-part-title" (Apache-2.0,
// heygen-com/hyperframes). A canopy of leaves fills the frame and parts to uncover the headline; an optional second pass
// of big, out-of-focus leaves carries the second headline in. A handful of leaves stay on the type and stir in a breeze.
// The registry block renders textured leaves in three.js with a bokeh pass; here each leaf is a small SVG in theme
// greens (cyan mixed into the canvas) with a few gold ones, depth of field is a static blur on the near leaves, and every
// position comes from ctx.rng, so a frame renders the same on every seek.
// part (signature): the leaves sweep in and close over the centre at the window start, then split left and right.
// sweep: a band of leaves crosses the frame left to right and the headline is wiped in behind its front edge.

import { fit, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.kicker ? ["kicker"] : []), "headline", ...(slots.headline2 ? ["headline2"] : [])];

const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;
const LEAF = "M3 30 C 22 4, 70 -2, 117 30 C 70 62, 22 56, 3 30 Z";
const CY = 400; // headline centre line (stage px)

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const sweep = ctx.variant === "sweep";
  const rnd = (a, b) => a + ctx.rng() * (b - a);
  const tHead = ctx.at("headline"), tH2 = slots.headline2 ? ctx.at("headline2") : null, tKick = slots.kicker ? ctx.at("kicker") : null;
  const hfs = fit(slots.headline, [[10, 176], [16, 140], [24, 108]]);
  const h2fs = slots.headline2 ? fit(slots.headline2, [[10, 164], [18, 128], [28, 96]]) : 0;
  const tw = Math.min(1560, [...slots.headline].length * hfs * 0.56);

  const leaves = [];
  /** a leaf at (left, top), `size` px long; near leaves are bigger and blurred */
  const leaf = (size, near) => {
    const id = `${S}-l${leaves.length}`;
    const gold = ctx.rng() < 0.12;
    const mix = Math.round(rnd(22, 70));
    const fill = gold ? `color-mix(in srgb, var(--gold) ${Math.round(rnd(35, 60))}%, var(--canvas))` : `color-mix(in srgb, var(--cyan) ${mix}%, var(--canvas))`;
    const l = { id, size: Math.round(size), near, fill, blur: near ? r1(rnd(3, 7)) : ctx.rng() < 0.3 ? 1.5 : 0 };
    leaves.push(l);
    return l;
  };
  const leafHtml = (l) => `<svg class="${S}-leaf" id="${l.id}" viewBox="0 0 120 60" style="left: ${l.left}px; top: ${l.top}px; width: ${l.size}px; height: ${Math.round(l.size / 2)}px;${l.blur ? ` filter: blur(${l.blur}px);` : ""}" data-layout-allow-overflow data-layout-allow-overlap data-layout-allow-occlusion>`
    + `<path d="${LEAF}" style="fill: ${l.fill}"/><path d="M8 30 Q 60 ${r1(rnd(24, 36))} 112 30" class="${S}-rib"/></svg>`;
  /** keep a leaf box (and its travel in y) inside the stage */
  const place = (l, x0, x1, y0, y1) => { l.left = Math.round(rnd(x0, x1) - l.size / 2); l.top = Math.round(Math.min(760 - l.size / 2, Math.max(20, rnd(y0, y1) - l.size / 4))); };

  const m = [];
  const cover = [], stay = [], pass = [];
  const tIn = w.a + 0.02;
  // leaves that stay on the type: spots around the headline box
  const spots = [[880 - tw / 2 - 30, CY - hfs * 0.55], [880 + tw / 2 + 10, CY - hfs * 0.2], [880 - tw * 0.18, CY + hfs * 0.52],
    [880 + tw * 0.28, CY - hfs * 0.72], [880 - tw / 2 + 40, CY + hfs * 0.45]];

  if (!sweep) {
    for (let k = 0; k < 44; k++) { const l = leaf(rnd(150, 250), k % 7 === 0); place(l, 140, 1620, 150, 650); cover.push(l); }
    const partAt = Math.max(w.a + 0.9, tHead - 0.15);
    cover.forEach((l, k) => {
      const at = r3(tIn + (k % 11) * 0.03), dur = 0.75;
      const r0 = Math.round(rnd(-180, 180)), r1_ = Math.round(r0 + rnd(-40, 40));
      m.push({ prim: "reveal", target: `#${l.id}`, at, dur, from: { x: Math.round(-1500 - rnd(0, 500)), y: Math.round(rnd(-60, 60)), rotation: r0 }, to: { x: 0, y: 0, rotation: r1_ }, ease: "power3.out" });
      const out = l.left + l.size / 2 < 880 ? -1 : 1;
      m.push({ prim: "slide", target: `#${l.id}`, at: r3(Math.max(at + dur + ctx.gap, partAt + rnd(0, 0.25))), dur: r3(rnd(0.8, 1.1)),
        from: { x: 0, y: 0, rotation: r1_ }, to: { x: Math.round(out * rnd(1100, 1500)), y: Math.round(rnd(-50, 50)), rotation: Math.round(r1_ + out * rnd(60, 160)) }, ease: "power2.in" });
    });
    spots.forEach(([sx, sy], k) => {
      const l = leaf(rnd(90, 130), false);
      l.left = Math.round(sx - l.size / 2); l.top = Math.round(sy - l.size / 4);
      stay.push(l);
      m.push({ prim: "reveal", target: `#${l.id}`, at: r3(tIn + 0.1 + k * 0.05), dur: 0.8, from: { x: Math.round(-1400 - k * 60), y: Math.round(rnd(-80, 80)), rotation: -200 }, to: { x: 0, y: 0, rotation: Math.round(rnd(-35, 35)) }, ease: "power3.out" });
    });
  } else {
    // one band crossing left to right; its front edge wipes the headline in
    const bandAt = Math.max(w.a, tHead - 0.9), bandDur = 1.9;
    for (let k = 0; k < 40; k++) { const l = leaf(rnd(150, 260), k % 6 === 0); place(l, 620, 1140, 60, 740); cover.push(l); }
    cover.forEach((l) => {
      const r0 = Math.round(rnd(-180, 180));
      m.push({ prim: "reveal", target: `#${l.id}`, at: r3(bandAt + rnd(0, 0.25)), dur: bandDur, from: { x: -1700, y: Math.round(rnd(-40, 40)), rotation: r0 }, to: { x: 1550, y: Math.round(rnd(-40, 40)), rotation: Math.round(r0 + rnd(90, 220)) }, ease: "sine.inOut" });
    });
    spots.forEach(([sx, sy], k) => {
      const l = leaf(rnd(90, 130), false);
      l.left = Math.round(sx - l.size / 2); l.top = Math.round(sy - l.size / 4);
      stay.push(l);
      m.push({ prim: "reveal", target: `#${l.id}`, at: r3(bandAt + 0.1 + k * 0.08), dur: 1.1, from: { x: Math.round(-1300 - sx), rotation: -220 }, to: { x: 0, rotation: Math.round(rnd(-35, 35)) }, ease: "power2.out" });
    });
  }
  // the stayers stir in a breeze until the shot ends
  stay.forEach((l, k) => {
    let t = (sweep ? w.a + 1.4 : w.a + 1.0) + k * 0.13;
    let dir = 1;
    while (t + 1.0 < w.b - 0.05) {
      m.push({ prim: "slide", target: `#${l.id}`, at: r3(t), dur: 0.95, from: { y: 0 }, to: { y: dir * 5 }, ease: "sine.inOut" });
      m.push({ prim: "slide", target: `#${l.id}`, at: r3(t), dur: 0.95, from: { scale: 1 }, to: { scale: dir > 0 ? 1.06 : 0.97 }, ease: "sine.inOut" });
      t += 1.0; dir = -dir;
      if (t + 1.0 >= w.b - 0.05) break;
      m.push({ prim: "slide", target: `#${l.id}`, at: r3(t), dur: 0.95, from: { y: -dir * 5 }, to: { y: 0 }, ease: "sine.inOut" });
      m.push({ prim: "slide", target: `#${l.id}`, at: r3(t), dur: 0.95, from: { scale: -dir > 0 ? 1.06 : 0.97 }, to: { scale: 1 }, ease: "sine.inOut" });
      t += 1.0;
    }
  });

  // the second headline rides in on a pass of near leaves, right to left
  let h2At = null;
  if (slots.headline2) {
    for (let k = 0; k < 18; k++) { const l = leaf(rnd(260, 380), true); place(l, 500, 1260, 80, 700); pass.push(l); }
    const passAt = Math.max(tHead + 1.0, tH2 - 0.55);
    pass.forEach((l) => {
      const r0 = Math.round(rnd(-180, 180));
      m.push({ prim: "reveal", target: `#${l.id}`, at: r3(passAt + rnd(0, 0.2)), dur: 1.25, from: { x: 1500, rotation: r0 }, to: { x: -1900, rotation: Math.round(r0 - rnd(80, 200)) }, ease: "power1.inOut" });
    });
    h2At = passAt + 0.55;
  }

  const css = `
#${S}-root { position: absolute; inset: 0; }
.${S}-leaf { position: absolute; overflow: visible; }
.${S}-rib { fill: none; stroke: color-mix(in srgb, var(--ink) 22%, transparent); stroke-width: 2; }
#${S}-kick { position: absolute; left: 0; width: 1760px; top: ${Math.round(CY - hfs * 0.6 - 90)}px; text-align: center; font-family: "${theme.mono}", monospace;
  font-size: 32px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold); white-space: nowrap; }
.${S}-hl { position: absolute; left: 80px; width: 1600px; top: ${CY - 200}px; height: 400px; display: flex; align-items: center; justify-content: center;
  text-align: center; font-weight: 800; line-height: 1.06; letter-spacing: -0.015em; color: var(--ink); }
#${S}-h1 { font-size: ${hfs}px; }
#${S}-h2 { font-size: ${h2fs}px; color: var(--gold); }
#${S}-wipe { position: absolute; left: 80px; width: 1600px; top: ${CY - 200}px; height: 400px; overflow: hidden; }
#${S}-wipe .${S}-hl { left: 0; top: 0; }`;

  const h1 = `<div class="${S}-hl" id="${S}-h1" data-layout-allow-overflow>${esc(slots.headline)}</div>`;
  const html = `<div id="${S}-root">
 ${slots.kicker ? `<div id="${S}-kick">${esc(slots.kicker)}</div>` : ""}
 <div id="${S}-hls">
  ${sweep ? `<div id="${S}-wipe" data-layout-allow-overflow>${h1}</div>` : h1}
  ${slots.headline2 ? `<div class="${S}-hl" id="${S}-h2" data-layout-allow-overlap>${esc(slots.headline2)}</div>` : ""}
 </div>
 <div id="${S}-leaves">
${[...cover, ...stay, ...pass].map(leafHtml).join("\n")}
 </div>
</div>`;

  // headline 1: uncovered by the parting (part) or wiped in behind the band's front (sweep)
  if (sweep) {
    const at = Math.max(w.a + 0.5, tHead - 0.25);
    m.push({ prim: "reveal", target: `#${S}-wipe`, at, dur: 1.2, from: { x: -1600 }, to: { x: 0 }, ease: "none" });
    m.push({ prim: "reveal", target: `#${S}-h1`, at, dur: 1.2, from: { x: 1600 }, to: { x: 0 }, ease: "none" });
  } else {
    m.push({ prim: "reveal", target: `#${S}-h1`, at: Math.max(w.a + 0.8, tHead - 0.1), dur: 0.7, from: { opacity: 0, scale: 0.94 }, ease: "power2.out" });
  }
  if (slots.kicker) m.push({ prim: "reveal", target: `#${S}-kick`, at: Math.max(tKick, w.a + 0.9), dur: 0.5, from: { opacity: 0, y: -14 }, ease: ctx.ease });
  if (h2At != null) {
    const outTarget = sweep ? `#${S}-wipe` : `#${S}-h1`;
    m.push({ prim: "reveal", target: outTarget, at: r3(h2At - 0.25), dur: 0.3, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.in" });
    m.push({ prim: "reveal", target: `#${S}-h2`, at: r3(h2At), dur: 0.5, from: { opacity: 0, scale: 0.94 }, ease: "power2.out" });
  }
  return { css, html, motions: keepInside(m, w.b) };
}

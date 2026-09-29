// accent-cuboids — after the HyperFrames registry block "cuboid-carousel" (Apache-2.0, heygen-com/hyperframes).
// A row of products on bevelled cuboids. The registry block draws the cuboids with three.js; here each cuboid is six CSS
// faces in one preserve-3d box, and the stage keeps a single perspective. The emitter tweens 2D transforms only, so a
// turn about the vertical axis is built from a static sandwich: rotateX(90deg) → a tweened 2D `rotation` → rotateX(-90deg)
// (the middle rotation then turns the box about the vertical axis). A product's name and note light on its keyword; on
// the "hero" key the standout cuboid lifts and turns once while the others dim.
// wave (signature): the chain flies in from the right as one group, every cuboid turning into place with a stagger and
// riding a travelling wave, then decelerates to a hold; the heading sits above.
// shelf: the cuboids stand on a drawn shelf in a three-quarter view and drop in one by one on their keywords.

import { fit, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.heading ? ["heading"] : []), ...slots.items.map((_, i) => `items.${i}`), "hero"];

const r1 = (x) => Math.round(x * 10) / 10;

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const items = slots.items, n = items.length;
  const hero = Math.min(n - 1, slots.hero ?? Math.floor((n - 1) / 2));
  const shelf = ctx.variant === "shelf";
  const tItem = items.map((_, i) => ctx.at(`items.${i}`));
  const tHero = ctx.at("hero"), tHead = slots.heading ? ctx.at("heading") : null;

  // geometry: cuboid width × height × depth, spaced so they never touch even mid-turn
  const GAP = shelf ? 56 : 44, D = 44;
  const cw = Math.min(300, Math.floor((1560 - (n - 1) * GAP) / n));
  const ch = Math.min(460, Math.round(cw * 1.45));
  const rowW = n * cw + (n - 1) * GAP;
  const x0 = Math.round((1760 - rowW) / 2) + cw / 2;
  const cy = shelf ? 470 : 480;
  const lfs = fit(items.reduce((a, b) => (a.label.length > b.label.length ? a : b)).label, cw > 240 ? [[10, 38], [14, 34], [18, 30]] : cw > 200 ? [[10, 32], [14, 28], [18, 25]] : [[10, 28], [14, 25], [18, 22]]);
  const nfs = cw > 240 ? 24 : cw > 200 ? 21 : 18;
  const icon = Math.round(Math.min(96, cw * 0.36));

  const face = (cls, extra = "") => `<div class="${S}-face ${S}-${cls}"${extra}></div>`;
  const cuboid = (it, i) => `  <div class="${S}-pos" style="left: ${r1(x0 + i * (cw + GAP))}px; top: ${cy}px" data-layout-allow-overlap data-layout-allow-occlusion data-layout-allow-overflow>
   <div class="${S}-spin" id="${S}-sp${i}">
    <div class="${S}-body">
     <div class="${S}-bob" id="${S}-bob${i}">
      <div class="${S}-face ${S}-front${i === hero ? ` ${S}-herof` : ""}" id="${S}-fr${i}">
       <div class="${S}-in" data-layout-allow-overlap>
        <div class="${S}-ico">${ctx.icon(it.icon)}</div>
        <div class="${S}-tx" id="${S}-tx${i}">
         <div class="${S}-lab">${esc(it.label)}</div>
         ${it.note ? `<div class="${S}-note">${esc(it.note)}</div>` : ""}
        </div>
       </div>
      </div>
      ${face("back")}${face("right")}${face("left")}${face("top")}${face("bottom")}
     </div>
    </div>
   </div>
  </div>`;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-scene { position: absolute; inset: 0; perspective: 1700px; perspective-origin: 880px ${cy - 40}px; transform-style: preserve-3d; }
#${S}-tilt { position: absolute; inset: 0; transform-style: preserve-3d;${shelf ? ` transform: rotateX(-8deg) rotateY(-14deg); transform-origin: 880px ${cy}px;` : ""} }
#${S}-row { position: absolute; inset: 0; transform-style: preserve-3d; }
.${S}-pos { position: absolute; width: 0; height: 0; transform-style: preserve-3d; transform: rotateX(90deg); }
.${S}-spin { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; }
.${S}-body { position: absolute; left: ${-cw / 2}px; top: ${-ch / 2}px; width: ${cw}px; height: ${ch}px; transform-style: preserve-3d; transform: rotateX(-90deg); }
.${S}-bob { position: absolute; inset: 0; transform-style: preserve-3d; }
.${S}-face { position: absolute; box-sizing: border-box; backface-visibility: hidden; }
.${S}-front, .${S}-back { left: 0; top: 0; width: ${cw}px; height: ${ch}px; border-radius: 14px; }
.${S}-front { transform: translateZ(${D / 2}px); background: linear-gradient(160deg, color-mix(in srgb, var(--surface) 80%, var(--ink)) 0%, var(--surface) 55%, color-mix(in srgb, var(--surface) 70%, #000) 100%);
  border: 2px solid color-mix(in srgb, var(--ink) 16%, transparent); }
.${S}-herof { border: 3px solid var(--gold); box-shadow: 0 0 40px color-mix(in srgb, var(--gold) 35%, transparent); }
.${S}-back { transform: rotateY(180deg) translateZ(${D / 2}px); background: color-mix(in srgb, var(--surface) 60%, #000); }
.${S}-right, .${S}-left { left: ${(cw - D) / 2}px; top: 8px; width: ${D}px; height: ${ch - 16}px; background: linear-gradient(90deg, color-mix(in srgb, var(--surface) 55%, #000), color-mix(in srgb, var(--surface) 75%, #000)); }
.${S}-right { transform: rotateY(90deg) translateZ(${cw / 2 - 2}px); }
.${S}-left { transform: rotateY(-90deg) translateZ(${cw / 2 - 2}px); }
.${S}-top, .${S}-bottom { left: 8px; top: ${(ch - D) / 2}px; width: ${cw - 16}px; height: ${D}px; background: color-mix(in srgb, var(--surface) 70%, var(--ink)); }
.${S}-top { transform: rotateX(90deg) translateZ(${ch / 2 - 2}px); }
.${S}-bottom { transform: rotateX(-90deg) translateZ(${ch / 2 - 2}px); background: color-mix(in srgb, var(--surface) 50%, #000); }
.${S}-in { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 22px 16px; text-align: center; }
.${S}-ico { width: ${icon}px; height: ${icon}px; color: var(--gold); }
.${S}-ico svg { width: ${icon}px; height: ${icon}px; display: block; }
.${S}-tx { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.${S}-lab { font-size: ${lfs}px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-note { font-size: ${nfs}px; font-weight: 500; line-height: 1.3; color: var(--muted); }
#${S}-head { position: absolute; left: 80px; width: 1600px; top: 34px; text-align: center; font-size: 54px; font-weight: 800; color: var(--ink); white-space: nowrap; }
#${S}-shelf { position: absolute; left: 0; top: ${cy + ch / 2 + 6}px; width: 1760px; height: 20px; overflow: visible; }
#${S}-shelf path { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 1000; opacity: 0.8; }`;

  const html = `<div id="${S}-root">
 ${slots.heading ? `<div id="${S}-head">${esc(slots.heading)}</div>` : ""}
 <div id="${S}-scene">
  <div id="${S}-tilt">
  ${shelf ? `<svg id="${S}-shelf" viewBox="0 0 1760 20"><path id="${S}-shelfp" pathLength="1000" d="M${x0 - cw / 2 - 60} 8 L${x0 + rowW - cw / 2 + 60} 8"/></svg>` : ""}
  <div id="${S}-row">
${items.map(cuboid).join("\n")}
  </div>
  </div>
 </div>
</div>`;

  const m = [];
  const settle = [];
  if (!shelf) {
    // the whole chain flies in and decelerates; each cuboid turns into place and its wave offset settles
    const fly = Math.min(1.5, Math.max(0.9, (tItem[0] - w.a) + 0.6));
    m.push({ prim: "reveal", target: `#${S}-row`, at: w.a, dur: fly, from: { x: 1500 }, to: { x: 0 }, ease: "power3.out" });
    items.forEach((_, i) => {
      const at = w.a + 0.05 + i * 0.07;
      m.push({ prim: "reveal", target: `#${S}-sp${i}`, at, dur: fly, from: { rotation: -150 - i * 18 }, to: { rotation: 0 }, ease: "power3.out" });
      m.push({ prim: "reveal", target: `#${S}-bob${i}`, at, dur: fly, from: { y: r1(Math.sin(i * 1.1) * 70) }, to: { y: 0 }, ease: "power2.out" });
      settle.push(at + fly);
    });
  } else {
    m.push({ prim: "draw", target: `#${S}-shelfp`, at: w.a, dur: 0.8 });
    items.forEach((_, i) => {
      const at = Math.max(w.a + 0.1 + i * 0.12, tItem[i] - 0.45);
      m.push({ prim: "reveal", target: `#${S}-bob${i}`, at, dur: 0.6, from: { y: -760, opacity: 0 }, to: { y: 0, opacity: 1 }, ease: "bounce.out" });
      m.push({ prim: "reveal", target: `#${S}-sp${i}`, at, dur: 0.7, from: { rotation: 40 - i * 16 }, to: { rotation: 0 }, ease: "power2.out" });
      settle.push(at + 0.7);
    });
  }
  // each product's icon rides in with its cuboid (no blank face); its name and note light on its keyword
  items.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-tx${i}`, at: Math.max(tItem[i], w.a + 0.2), dur: 0.45, from: { opacity: 0, y: 18 }, ease: ctx.ease }));
  if (slots.heading) m.push({ prim: "reveal", target: `#${S}-head`, at: Math.max(tHead, w.a + 0.1), dur: 0.5, from: { opacity: 0, y: -18 }, ease: ctx.ease });

  // the hero: lifts, turns once, the others dim
  const heroAt = Math.max(tHero, settle[hero] + ctx.gap, tItem.at(-1) + 0.45);
  if (heroAt < w.b - 0.4) {
    const turn = Math.min(0.9, w.b - heroAt - 0.1);
    m.push({ prim: "slide", target: `#${S}-sp${hero}`, at: heroAt, dur: turn, from: { rotation: 0 }, to: { rotation: 360 }, ease: "power2.inOut" });
    m.push({ prim: "slide", target: `#${S}-bob${hero}`, at: heroAt, dur: Math.min(0.6, turn), from: { scale: 1, y: 0 }, to: { scale: 1.12, y: -26 }, ease: "back.out(1.6)" });
    const others = items.map((_, i) => i).filter((i) => i !== hero).map((i) => `#${S}-fr${i}`);
    // dimmed with brightness, not opacity: a translucent face would show the cuboid's back through it
    for (const t of others) m.push({ prim: "reveal", target: t, at: heroAt + 0.1, dur: 0.4, from: { filter: "brightness(1)" }, to: { filter: "brightness(0.42)" }, ease: "power2.out" });
  }
  return { css, html, motions: keepInside(m, w.b) };
}

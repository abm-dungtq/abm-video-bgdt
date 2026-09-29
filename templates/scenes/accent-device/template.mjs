// accent-device — an app shown on a phone, after the HyperFrames registry block "vfx-iphone-device" (Apache-2.0,
// heygen-com/hyperframes). The registry block loads a GLTF iPhone into three.js from a CDN; a compiled frame cannot run
// its own script or fetch, so the phone here is a CSS box (bezel, screen, back with a camera bump, four edges) in one
// perspective. The emitter tweens 2D transforms only, so the turntable turn is a static sandwich rotateX(90deg) →
// tweened 2D `rotation` → rotateX(-90deg). The phone spins in, the screen shows the app header, and each item's card
// lands on the screen on its keyword while a glass glare slides across; the phone then breathes.
// turntable (signature): the caption on the left, the phone on the right at a three-quarter angle.
// callouts: the phone faces the camera in the middle, the caption above; each item also gets a callout beside the
// phone, joined to its card on the screen by a drawn leader.

import { fit, keepInside, lines } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["caption", ...slots.items.map((_, i) => `items.${i}`)];

const r1 = (x) => Math.round(x * 10) / 10;
const TINTS = ["gold", "cyan", "warn", "gold"];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const call = ctx.variant === "callouts";
  const items = slots.items, n = items.length;
  const tCap = ctx.at("caption"), tItem = items.map((_, i) => ctx.at(`items.${i}`));

  // phone geometry (stage px): body PW × PH, depth D, screen inset B
  const PH = call ? 660 : 740, PW = Math.round(PH * 0.49), D = 28, B = 14, RAD = Math.round(PW * 0.15);
  const pcx = call ? 880 : 1200, pcy = call ? 450 : 410;
  const px = pcx - PW / 2, py = pcy - PH / 2;
  const SW = PW - 2 * B, SH = PH - 2 * B;
  const k = PH / 740; // type scale inside the screen
  const headH = Math.round(150 * k), cardGap = Math.round(16 * k);
  const cardH = Math.round(Math.min(128 * k, (SH - headH - 40 * k - (n - 1) * cardGap) / n));
  const cardY = (i) => headH + i * (cardH + cardGap); // screen-local
  const yaw0 = call ? 0 : -20; // resting angle

  const card = (it, i) => `<div class="${S}-card" id="${S}-cd${i}" style="top: ${cardY(i)}px">
        <div class="${S}-thumb" style="background: linear-gradient(135deg, color-mix(in srgb, var(--${TINTS[i]}) 75%, var(--canvas)), color-mix(in srgb, var(--${TINTS[i]}) 30%, var(--canvas)))"></div>
        <div class="${S}-ct"><div class="${S}-cl">${esc(it.label)}</div>${it.note ? `<div class="${S}-cn">${esc(it.note)}</div>` : ""}</div>
       </div>`;
  const front = `<div class="${S}-face ${S}-front">
      <div class="${S}-screen" data-layout-allow-overflow>
       <div class="${S}-status"><span>9:41</span><span class="${S}-island"></span><span>5G</span></div>
       <div class="${S}-head"><div class="${S}-appi">${ctx.icon(slots.icon ?? "chat")}</div><div class="${S}-appn">${esc(slots.app)}</div></div>
${items.map(card).join("\n")}
       <div class="${S}-glare" id="${S}-glare"></div>
      </div>
     </div>`;
  const back = `<div class="${S}-face ${S}-back"><div class="${S}-cam"><i></i><i></i><i></i></div><div class="${S}-logo"></div></div>`;
  const edges = `<div class="${S}-face ${S}-er"></div><div class="${S}-face ${S}-el"></div><div class="${S}-face ${S}-et"></div><div class="${S}-face ${S}-eb"></div>`;
  const phone = `<div id="${S}-float" data-layout-allow-overlap data-layout-allow-occlusion>
   <div class="${S}-yp" style="left: ${pcx}px; top: ${pcy}px"><div class="${S}-ys" id="${S}-spin"><div class="${S}-yb">
    <div class="${S}-box">${front}${back}${edges}</div>
   </div></div></div>
  </div>`;

  // caption and callouts
  const capFs = call ? fit(slots.caption, [[24, 56], [32, 50], [40, 44]]) : fit(slots.caption, [[16, 84], [26, 72], [40, 60]]);
  const side = (i) => (i % 2 === 0 ? -1 : 1); // callouts alternate left / right
  const cy = (i) => py + B + cardY(i) + cardH / 2; // stage y of card i's middle
  const callouts = call ? items.map((it, i) => {
    const left = side(i) < 0;
    const x = left ? 80 : pcx + PW / 2 + 110, cw = left ? px - 110 - 80 : 1680 - x;
    const ly = Math.round(cy(i));
    const x0 = left ? x + cw + 12 : px + PW + 6, x1 = left ? px - 6 : x - 12;
    return `<div class="${S}-co" id="${S}-co${i}" style="left: ${x}px; width: ${cw}px; top: ${ly - 50}px; text-align: ${left ? "right" : "left"}">
    <div class="${S}-col">${esc(it.label)}</div>${it.note ? `<div class="${S}-con">${esc(it.note)}</div>` : ""}</div>
   <svg class="${S}-lead" style="left: ${Math.min(x0, x1)}px; top: ${ly - 6}px; width: ${Math.abs(x1 - x0)}px" viewBox="0 0 ${Math.abs(x1 - x0)} 12"><path id="${S}-ld${i}" pathLength="1000" d="M${left ? 0 : Math.abs(x1 - x0)} 6 L${left ? Math.abs(x1 - x0) : 0} 6"/></svg>`;
  }).join("\n") : "";

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-scene { position: absolute; inset: 0; perspective: 1900px; perspective-origin: ${pcx}px ${pcy}px; transform-style: preserve-3d; }
#${S}-float { position: absolute; inset: 0; transform-style: preserve-3d; }
.${S}-yp { position: absolute; width: 0; height: 0; transform-style: preserve-3d; transform: rotateX(90deg); }
.${S}-ys { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; }
.${S}-yb { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; transform: rotateX(-90deg); }
.${S}-box { position: absolute; left: ${-PW / 2}px; top: ${-PH / 2}px; width: ${PW}px; height: ${PH}px; transform-style: preserve-3d; }
.${S}-face { position: absolute; box-sizing: border-box; backface-visibility: hidden; }
.${S}-front, .${S}-back { left: 0; top: 0; width: ${PW}px; height: ${PH}px; border-radius: ${RAD}px; }
.${S}-front { transform: translateZ(${D / 2}px); background: #05070d; border: 3px solid color-mix(in srgb, var(--ink) 38%, #000);
  box-shadow: 0 50px 110px color-mix(in srgb, #000 55%, transparent); }
.${S}-back { transform: rotateY(180deg) translateZ(${D / 2}px); background: linear-gradient(160deg, color-mix(in srgb, var(--surface) 70%, var(--ink)) 0%, var(--surface) 60%);
  border: 3px solid color-mix(in srgb, var(--ink) 38%, #000); }
.${S}-cam { position: absolute; left: ${Math.round(PW * 0.08)}px; top: ${Math.round(PW * 0.08)}px; width: ${Math.round(PW * 0.42)}px; height: ${Math.round(PW * 0.42)}px;
  border-radius: ${Math.round(PW * 0.1)}px; background: color-mix(in srgb, var(--surface) 55%, #000); }
.${S}-cam i { position: absolute; width: 38%; height: 38%; border-radius: 50%; background: #05070d; box-shadow: inset 0 0 0 4px color-mix(in srgb, var(--ink) 30%, #000); }
.${S}-cam i:nth-child(1) { left: 8%; top: 8%; } .${S}-cam i:nth-child(2) { left: 8%; top: 54%; } .${S}-cam i:nth-child(3) { left: 54%; top: 31%; }
.${S}-logo { position: absolute; left: ${PW / 2 - 34}px; top: ${PH / 2 - 34}px; width: 68px; height: 68px; border-radius: 50%; border: 5px solid color-mix(in srgb, var(--gold) 70%, transparent); }
.${S}-er, .${S}-el { left: ${(PW - D) / 2}px; top: ${RAD}px; width: ${D}px; height: ${PH - 2 * RAD}px; background: linear-gradient(90deg, color-mix(in srgb, var(--ink) 30%, #000), color-mix(in srgb, var(--ink) 55%, #000), color-mix(in srgb, var(--ink) 30%, #000)); }
.${S}-er { transform: rotateY(90deg) translateZ(${PW / 2 - 2}px); }
.${S}-el { transform: rotateY(-90deg) translateZ(${PW / 2 - 2}px); }
.${S}-et, .${S}-eb { left: ${RAD}px; top: ${(PH - D) / 2}px; width: ${PW - 2 * RAD}px; height: ${D}px; background: color-mix(in srgb, var(--ink) 40%, #000); }
.${S}-et { transform: rotateX(90deg) translateZ(${PH / 2 - 2}px); }
.${S}-eb { transform: rotateX(-90deg) translateZ(${PH / 2 - 2}px); }
.${S}-screen { position: absolute; left: ${B - 3}px; top: ${B - 3}px; width: ${SW}px; height: ${SH}px; border-radius: ${RAD - B}px; overflow: hidden;
  background: linear-gradient(180deg, color-mix(in srgb, var(--canvas) 80%, var(--surface)) 0%, var(--canvas) 100%); }
.${S}-status { position: absolute; left: ${Math.round(28 * k)}px; right: ${Math.round(28 * k)}px; top: ${Math.round(14 * k)}px; height: ${Math.round(34 * k)}px;
  display: flex; align-items: center; justify-content: space-between; font-size: ${Math.round(20 * k)}px; font-weight: 600; color: var(--ink); }
.${S}-island { width: ${Math.round(96 * k)}px; height: ${Math.round(28 * k)}px; border-radius: 99px; background: #000; }
.${S}-head { position: absolute; left: ${Math.round(22 * k)}px; right: ${Math.round(22 * k)}px; top: ${Math.round(70 * k)}px; height: ${Math.round(60 * k)}px; display: flex; align-items: center; gap: ${Math.round(14 * k)}px; }
.${S}-appi { width: ${Math.round(56 * k)}px; height: ${Math.round(56 * k)}px; flex: none; border-radius: ${Math.round(14 * k)}px; background: var(--gold); color: var(--canvas);
  display: flex; align-items: center; justify-content: center; }
.${S}-appi svg { width: 64%; height: 64%; display: block; }
.${S}-appn { font-size: ${Math.round(fit(slots.app, [[8, 30], [13, 25], [18, 21]]) * k)}px; font-weight: 800; line-height: 1.1; color: var(--ink); }
.${S}-card { position: absolute; left: ${Math.round(18 * k)}px; right: ${Math.round(18 * k)}px; height: ${cardH}px; box-sizing: border-box; border-radius: ${Math.round(18 * k)}px;
  background: color-mix(in srgb, var(--surface) 90%, var(--ink)); border: 1px solid color-mix(in srgb, var(--ink) 10%, transparent);
  display: flex; align-items: center; gap: ${Math.round(14 * k)}px; padding: 0 ${Math.round(14 * k)}px; }
.${S}-thumb { width: ${Math.round(cardH * 0.5)}px; height: ${Math.round(cardH * 0.5)}px; flex: none; border-radius: ${Math.round(12 * k)}px; }
.${S}-ct { min-width: 0; }
.${S}-cl { font-size: ${Math.round(23 * k)}px; font-weight: 800; line-height: 1.18; color: var(--ink); }
.${S}-cn { margin-top: ${Math.round(4 * k)}px; font-size: ${Math.round(18 * k)}px; font-weight: 500; line-height: 1.25; color: var(--muted); }
.${S}-glare { position: absolute; left: ${-SW}px; top: -10%; width: ${Math.round(SW * 0.5)}px; height: 120%; transform-origin: 50% 50%;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, #fff 12%, transparent), transparent); }
#${S}-cap { position: absolute; ${call ? `left: 80px; width: 1600px; top: 22px; text-align: center; white-space: nowrap;` : `left: 80px; width: 720px; top: ${Math.round(410 - lines(slots.caption, capFs, 720) * capFs * 1.12 / 2 - 40)}px;`}
  font-size: ${capFs}px; font-weight: 800; line-height: 1.12; color: var(--ink); }
#${S}-chip { position: absolute; left: 80px; top: ${Math.round(410 + lines(slots.caption, capFs, 720) * capFs * 1.12 / 2 + 10)}px; display: flex; align-items: center; gap: 16px;
  font-family: "${theme.mono}", monospace; font-size: 28px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); }
#${S}-chip svg { width: 40px; height: 40px; display: block; }
.${S}-co { position: absolute; }
.${S}-col { font-size: 40px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-con { margin-top: 6px; font-size: 28px; font-weight: 500; color: var(--muted); }
.${S}-lead { position: absolute; height: 12px; overflow: visible; }
.${S}-lead path { fill: none; stroke: var(--gold); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1000; }`;

  const html = `<div id="${S}-root">
 <div id="${S}-cap">${esc(slots.caption)}</div>
 ${call ? "" : `<div id="${S}-chip">${ctx.icon(slots.icon ?? "chat")}<span>${esc(slots.app)}</span></div>`}
 ${callouts}
 <div id="${S}-scene">
  ${phone}
 </div>
</div>`;

  const m = [];
  // the turntable: the phone spins in past its back and settles at its resting angle, then breathes
  const spinDur = 1.4;
  m.push({ prim: "reveal", target: `#${S}-float`, at: w.a, dur: 0.6, from: { opacity: 0, y: 60 }, ease: "power2.out" });
  m.push({ prim: "reveal", target: `#${S}-spin`, at: w.a, dur: spinDur, from: { rotation: yaw0 - 200 }, to: { rotation: yaw0 }, ease: "power3.out" });
  let t = w.a + spinDur + ctx.gap, dir = 1;
  while (t + 1.6 < w.b - 0.05) {
    m.push({ prim: "slide", target: `#${S}-spin`, at: Math.round(t * 100) / 100, dur: 1.55, from: { rotation: dir > 0 ? yaw0 : yaw0 + 7 }, to: { rotation: dir > 0 ? yaw0 + 7 : yaw0 }, ease: "sine.inOut" });
    t += 1.6; dir = -dir;
  }
  const dr = ctx.drift(`#${S}-float`, w.a + 0.6 + ctx.gap, 14);
  if (dr) m.push(dr);
  // the glass glare crosses the screen once the phone faces us
  if (w.b - (w.a + spinDur) > 1.2) m.push({ prim: "slide", target: `#${S}-glare`, at: w.a + spinDur, dur: Math.min(2.2, w.b - w.a - spinDur - 0.1), from: { x: 0 }, to: { x: Math.round(SW * 2.6) }, ease: "power1.inOut" });

  m.push({ prim: "reveal", target: `#${S}-cap`, at: Math.max(tCap, w.a + 0.2), dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease });
  if (!call) m.push({ prim: "reveal", target: `#${S}-chip`, at: Math.max(tCap, w.a + 0.2) + 0.25, dur: 0.45, from: { opacity: 0, x: -16 }, ease: ctx.ease });
  items.forEach((_, i) => {
    const at = Math.max(tItem[i], w.a + 0.5);
    m.push({ prim: "reveal", target: `#${S}-cd${i}`, at, dur: 0.45, from: { opacity: 0, y: 24, scale: 0.96 }, ease: "back.out(1.6)" });
    if (call) {
      m.push({ prim: "draw", target: `#${S}-ld${i}`, at: at + 0.15, dur: 0.45, ease: "power2.out" });
      m.push({ prim: "reveal", target: `#${S}-co${i}`, at: at + 0.3, dur: 0.45, from: { opacity: 0, x: side(i) * -24 }, ease: ctx.ease });
    }
  });
  return { css, html, motions: keepInside(m, w.b) };
}

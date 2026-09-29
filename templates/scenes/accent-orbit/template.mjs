// accent-orbit — after the HyperFrames registry block "orbit-card" (Apache-2.0, heygen-com/hyperframes).
// One standout feature on a card that orbits a dot sphere. The registry block renders the sphere with three.js and follows a
// Blender camera; here the sphere is a spinning cage of dotted CSS rings and the card a preserve-3d box. The emitter
// tweens 2D transforms only, so every turn about the vertical axis is a static sandwich rotateX(90deg) → tweened 2D
// `rotation` → rotateX(-90deg). Title and description light on their keywords; on the "turn" key the card makes one
// full orbit (skipped when the shot is too short for it).
// orbit (signature): a centred card with a circular cut-out that frames the sphere; the card swings in from the right,
// bobs, then turns once about the sphere's axis.
// side: a large sphere on the left; the card flies around it on a real orbit (behind the sphere, then in front of it)
// and lands on the right, facing the camera the whole way.

import { fit, keepInside, lines } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.tag ? ["tag"] : []), "title", "desc", "turn"];

/** a turn about the vertical axis: `inner` goes inside; `id` names the tweened middle layer */
const yaw = (S, id, x, y, inner) => `<div class="${S}-yp" style="left: ${x}px; top: ${y}px"><div class="${S}-ys" id="${id}"><div class="${S}-yb">${inner}</div></div></div>`;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const side = ctx.variant === "side";
  const tTitle = ctx.at("title"), tDesc = ctx.at("desc"), tTurn = ctx.at("turn"), tTag = slots.tag ? ctx.at("tag") : null;
  const R = side ? 230 : 128; // sphere radius
  const [scx, scy] = side ? [400, 410] : [880, 410 - 340 + 206];
  const CW = side ? 780 : 860;
  const hole = { x: CW / 2, y: 206, r: R + 34 };
  const tfs = fit(slots.title, [[16, 60], [22, 52], [28, 46]]);
  const dfs = fit(slots.desc, [[50, 32], [80, 29], [96, 27]]);
  // the copy stacks under the hole (orbit) or from the card top (side): tag, title, description
  let y = side ? 56 : hole.y + hole.r + 30;
  const tagTop = y;
  if (slots.tag) y += 64;
  const titleTop = y;
  y += lines(slots.title, tfs, CW - 120) * tfs * 1.12 + 22;
  const descTop = Math.round(y);
  // the side card hugs its copy; the orbit card keeps its fixed frame around the hole
  const CH = side ? Math.max(360, Math.round(descTop + lines(slots.desc, dfs, CW - 120) * dfs * 1.38 + 60)) : 680;

  // the sphere: meridians turned about the axis, three latitudes, a gold equator; the whole cage spins
  const rings = [0, 30, 60, 90, 120, 150].map((a) => `<div class="${S}-ring" style="transform: rotateY(${a}deg)"></div>`).join("")
    + [-0.55, 0, 0.55].map((f) => {
      const r = Math.round(R * Math.sqrt(1 - f * f));
      return `<div class="${S}-ring ${f === 0 ? `${S}-eq` : ""}" style="left: ${-r}px; top: ${-r}px; width: ${2 * r}px; height: ${2 * r}px; transform: rotateX(90deg) translateZ(${Math.round(f * R)}px)"></div>`;
    }).join("");
  const sphere = `<div id="${S}-sphz" style="left: ${scx}px; top: ${scy}px" data-layout-allow-overlap data-layout-allow-occlusion>
   <div class="${S}-tilt">${yaw(S, `${S}-ssp`, 0, 0, `<div class="${S}-cage">${rings}</div>`)}</div>
   <div id="${S}-glow"></div>
   ${slots.icon ? `<div id="${S}-ico">${ctx.icon(slots.icon)}</div>` : ""}
  </div>`;

  const cardFaces = `<div class="${S}-bob" id="${S}-bob">
     <div class="${S}-front" data-layout-allow-overlap>
      ${side ? "" : `<div class="${S}-rim"></div>`}
      ${slots.tag ? `<div id="${S}-tagw"><span id="${S}-tag">${esc(slots.tag)}</span></div>` : ""}
      <div id="${S}-title">${esc(slots.title)}</div>
      <div id="${S}-desc">${esc(slots.desc)}</div>
     </div>
     <div class="${S}-back"></div>
    </div>`;
  const card = `<div class="${S}-cbox">${cardFaces}</div>`;
  const cardHtml = side
    ? `<div id="${S}-orb" data-layout-allow-overlap data-layout-allow-occlusion>${yaw(S, `${S}-osp`, scx, scy,
      `<div class="${S}-arm">${yaw(S, `${S}-csp`, 0, 0, card)}</div>`)}</div>`
    : `<div id="${S}-cmove" data-layout-allow-overlap data-layout-allow-occlusion>${yaw(S, `${S}-csp`, 880, 410, card)}</div>`;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-scene { position: absolute; inset: 0; perspective: 1800px; perspective-origin: ${side ? 700 : 880}px 400px; transform-style: preserve-3d; }
.${S}-yp { position: absolute; width: 0; height: 0; transform-style: preserve-3d; transform: rotateX(90deg); }
.${S}-ys { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; }
.${S}-yb { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; transform: rotateX(-90deg); }
#${S}-sphz { position: absolute; width: 0; height: 0; transform-style: preserve-3d; }
.${S}-tilt { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; transform: rotateZ(-16deg) rotateX(-12deg); }
.${S}-cage { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; }
.${S}-ring { position: absolute; left: ${-R}px; top: ${-R}px; width: ${2 * R}px; height: ${2 * R}px; box-sizing: border-box; border-radius: 50%;
  border: ${side ? 4 : 3}px dotted color-mix(in srgb, var(--cyan) 85%, transparent); }
.${S}-eq { border: ${side ? 3 : 2}px solid color-mix(in srgb, var(--gold) 80%, transparent); }
#${S}-glow { position: absolute; left: ${-R}px; top: ${-R}px; width: ${2 * R}px; height: ${2 * R}px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--cyan) 22%, transparent) 0%, transparent 70%); }
#${S}-ico { position: absolute; left: ${-R * 0.32}px; top: ${-R * 0.32}px; width: ${R * 0.64}px; height: ${R * 0.64}px; color: var(--gold);
  filter: drop-shadow(0 0 18px color-mix(in srgb, var(--gold) 60%, transparent)); }
#${S}-ico svg { width: 100%; height: 100%; display: block; }
#${S}-cmove, #${S}-orb { position: absolute; inset: 0; transform-style: preserve-3d; }
.${S}-arm { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; transform: translateX(820px); }
.${S}-cbox { position: absolute; left: ${-CW / 2}px; top: ${-CH / 2}px; width: ${CW}px; height: ${CH}px; transform-style: preserve-3d; }
.${S}-bob { position: absolute; inset: 0; transform-style: preserve-3d; }
.${S}-front, .${S}-back { position: absolute; inset: 0; box-sizing: border-box; border-radius: 28px; backface-visibility: hidden; }
.${S}-front { background: linear-gradient(165deg, color-mix(in srgb, var(--surface) 82%, var(--ink)) 0%, var(--surface) 60%);
  border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); box-shadow: 0 40px 90px color-mix(in srgb, #000 45%, transparent);${side ? "" : `
  -webkit-mask: radial-gradient(circle at ${hole.x}px ${hole.y}px, transparent ${hole.r}px, #000 ${hole.r + 1}px);
  mask: radial-gradient(circle at ${hole.x}px ${hole.y}px, transparent ${hole.r}px, #000 ${hole.r + 1}px);`} }
.${S}-back { transform: rotateY(180deg); background: color-mix(in srgb, var(--surface) 70%, #000); border: 2px solid color-mix(in srgb, var(--cyan) 30%, transparent); }
.${S}-rim { position: absolute; left: ${hole.x - hole.r - 8}px; top: ${hole.y - hole.r - 8}px; width: ${2 * hole.r + 16}px; height: ${2 * hole.r + 16}px;
  box-sizing: border-box; border-radius: 50%; border: 3px solid color-mix(in srgb, var(--gold) 70%, transparent); }
#${S}-tagw { position: absolute; left: 60px; width: ${CW - 120}px; top: ${tagTop}px; display: flex; justify-content: ${side ? "flex-start" : "center"}; }
#${S}-tag { padding: 8px 20px; border-radius: 999px; background: color-mix(in srgb, var(--gold) 16%, transparent);
  font-family: "${theme.mono}", monospace; font-size: 24px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); white-space: nowrap; }
#${S}-title { position: absolute; left: 60px; width: ${CW - 120}px; top: ${titleTop}px; text-align: ${side ? "left" : "center"};
  font-size: ${tfs}px; font-weight: 800; line-height: 1.12; color: var(--ink); }
#${S}-desc { position: absolute; left: 60px; width: ${CW - 120}px; top: ${descTop}px;
  text-align: ${side ? "left" : "center"}; font-size: ${dfs}px; font-weight: 500; line-height: 1.38; color: var(--muted); }`;

  const html = `<div id="${S}-root">
 <div id="${S}-scene">
  ${sphere}
  ${cardHtml}
 </div>
</div>`;

  const m = [];
  const span = w.b - w.a - 0.05;
  m.push({ prim: "reveal", target: `#${S}-sphz`, at: w.a, dur: 0.8, from: { opacity: 0, scale: 0.4 }, ease: "back.out(1.4)" });
  m.push({ prim: "slide", target: `#${S}-ssp`, at: w.a, dur: span, from: { rotation: 0 }, to: { rotation: Math.round(span * 36) }, ease: "none" });
  let settle;
  if (side) {
    // around the sphere: behind it first (negative angles), landing on the right; the inner turn keeps the card facing us
    const fly = 1.6;
    m.push({ prim: "reveal", target: `#${S}-osp`, at: w.a + 0.05, dur: fly, from: { rotation: -200 }, to: { rotation: 0 }, ease: "power2.out" });
    m.push({ prim: "reveal", target: `#${S}-csp`, at: w.a + 0.05, dur: fly, from: { rotation: 200 }, to: { rotation: 0 }, ease: "power2.out" });
    settle = w.a + 0.05 + fly;
  } else {
    const fly = 1.3;
    m.push({ prim: "reveal", target: `#${S}-cmove`, at: w.a + 0.1, dur: fly, from: { x: 1000 }, to: { x: 0 }, ease: "power3.out" });
    m.push({ prim: "reveal", target: `#${S}-csp`, at: w.a + 0.1, dur: fly, from: { rotation: -95 }, to: { rotation: 0 }, ease: "power3.out" });
    settle = w.a + 0.1 + fly;
  }
  if (slots.tag) m.push({ prim: "reveal", target: `#${S}-tag`, at: Math.max(tTag, w.a + 0.3), dur: 0.45, from: { opacity: 0, x: -16 }, ease: ctx.ease });
  m.push({ prim: "reveal", target: `#${S}-title`, at: Math.max(tTitle, w.a + 0.3), dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
  m.push({ prim: "reveal", target: `#${S}-desc`, at: Math.max(tDesc, w.a + 0.45), dur: 0.5, from: { opacity: 0, y: 18 }, ease: ctx.ease });
  // one full orbit about the axis once the copy has been read; the bob keeps the held card alive
  const turnAt = Math.max(tTurn, settle + ctx.gap, tDesc + 0.8);
  if (turnAt + 1.1 <= w.b - 0.1) {
    m.push({ prim: "slide", target: `#${S}-${side ? "osp" : "csp"}`, at: turnAt, dur: 1.1, from: { rotation: 0 }, to: { rotation: 360 }, ease: "power2.inOut" });
    if (side) m.push({ prim: "slide", target: `#${S}-csp`, at: turnAt, dur: 1.1, from: { rotation: 0 }, to: { rotation: -360 }, ease: "power2.inOut" });
  }
  const d = ctx.drift(`#${S}-bob`, settle + ctx.gap, 14);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

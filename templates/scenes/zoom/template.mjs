// zoom — one subject brought into focus, then its detail and the context around it.
// lens: a magnifier lens swoops onto a large subject disc (left); label, detail and context chips stand in a column
//   on the right, tied to the lens by a drawn connector.
// pull-back: the camera starts close on the subject (ghost disc at 1.7×), lights it, then pulls back while an ellipse
//   draws around it; context nodes pop on the ellipse with spokes to the centre; label and detail settle below.
// focus-crop: a 3 × 3 wall of faint tiles; a cyan crop frame closes from the whole wall onto the centre tile (the
//   subject), a connector draws to an enlarged subject card on the right; context labels land on the neighbours (the connector side stays free).

export const revealKeys = (slots) => ["subject", "detail", ...(slots.context ?? []).map((_, i) => `context.${i}`)];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const ctxs = slots.context ?? [];
  const tSub = ctx.at("subject"), tDet = ctx.at("detail");
  const tCtx = ctxs.map((_, i) => ctx.at(`context.${i}`));
  const fit = (t, dur) => Math.max(w.a, Math.min(t, w.b - dur - 0.05));
  const from = ctx.motionFrom();
  const label = esc(slots.subject.label), detail = esc(slots.detail);
  const m = [];

  if (ctx.variant === "pull-back") {
    const C = { x: 880, y: 360 };
    const nodes = [[436, 212], [1324, 212], [300, 360], [1460, 360]];
    const lit = Math.max(tSub, w.a + 0.52);
    const pull = fit(Math.max(tDet, lit + 0.47), 0.9);
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-web { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-web path { fill: none; stroke-dasharray: 1000; stroke-linecap: round; }
#${S}-ell { stroke: color-mix(in srgb, var(--gold) 55%, transparent); stroke-width: 3; }
.${S}-spoke { stroke: color-mix(in srgb, var(--cyan) 60%, transparent); stroke-width: 3; }
.${S}-tick { position: absolute; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; background: var(--cyan); opacity: 0.6; }
#${S}-subj { position: absolute; left: ${C.x - 150}px; top: ${C.y - 150}px; width: 300px; height: 300px; border-radius: 50%;
  background: color-mix(in srgb, var(--gold) 16%, var(--surface)); border: 4px solid var(--gold); color: var(--gold);
  display: flex; align-items: center; justify-content: center; }
#${S}-subj svg { width: 150px; height: 150px; }
.${S}-node { position: absolute; width: 300px; height: 80px; margin: -40px 0 0 -150px; box-sizing: border-box; border-radius: 40px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--cyan) 55%, transparent); display: flex; align-items: center;
  justify-content: center; font-size: 32px; font-weight: 600; color: var(--ink); white-space: nowrap; }
#${S}-label { position: absolute; left: 80px; top: 612px; width: 1600px; text-align: center; font-size: 60px; font-weight: 800; color: var(--ink); }
#${S}-det { position: absolute; left: 80px; top: 706px; width: 1600px; text-align: center; font-size: 38px; font-weight: 600; color: var(--muted); }`;
    const html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-web" viewBox="0 0 1760 820">
      <path id="${S}-ell" pathLength="1000" d="M${C.x} ${C.y - 230} A580 230 0 1 1 ${C.x - 0.1} ${C.y - 230}"/>
      ${ctxs.map((_, i) => `<path class="${S}-spoke" id="${S}-sp${i + 1}" pathLength="1000" d="M${C.x} ${C.y} L${nodes[i][0]} ${nodes[i][1]}"/>`).join("")}
    </svg>
    ${nodes.map(([x, y], i) => `<div class="${S}-tick" id="${S}-t${i + 1}" style="left: ${x}px; top: ${y}px"></div>`).join("")}
    <div id="${S}-subj">${ctx.icon(slots.subject.icon)}</div>
    ${ctxs.map((c, i) => `<div class="${S}-node" id="${S}-n${i + 1}" style="left: ${nodes[i][0]}px; top: ${nodes[i][1]}px">${esc(c)}</div>`).join("")}
    <div id="${S}-label">${label}</div>
    <div id="${S}-det">${detail}</div>
  </div>
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-subj`, at: w.a, dur: 0.5, from: { opacity: 0, scale: 2.1 }, to: { opacity: 0.35, scale: 1.7 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-subj`, at: lit, dur: 0.45, from: { opacity: 0.35, scale: 1.7 }, to: { opacity: 1, scale: 1.7 } },
      { prim: "slide", target: `#${S}-subj`, at: pull, dur: 0.9, from: { scale: 1.7 }, to: { scale: 1 }, ease: "power3.inOut" },
      ...nodes.map((_, i) => ({ prim: "reveal", target: `#${S}-t${i + 1}`, at: w.a + 0.15 + i * 0.08, dur: 0.35, from: { opacity: 0, scale: 0.2 } })),
      { prim: "draw", target: `#${S}-ell`, at: pull, dur: 1.0 },
      { prim: "reveal", target: `#${S}-label`, at: fit(pull + 0.5, 0.5), dur: 0.5, from, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-det`, at: fit(pull + 0.75, 0.5), dur: 0.5, from: { opacity: 0, y: 16 } },
    );
    let prev = pull + 0.2;
    ctxs.forEach((_, i) => {
      const t = fit(Math.max(tCtx[i], prev + 0.25), 0.5);
      prev = t;
      m.push({ prim: "draw", target: `#${S}-sp${i + 1}`, at: t, dur: 0.45 },
        { prim: "reveal", target: `#${S}-n${i + 1}`, at: t + 0.05 > w.b - 0.5 ? t : t + 0.05, dur: 0.45, from: { opacity: 0, scale: 0.6 }, ease: "back.out(1.8)" });
    });
    const d = ctx.drift(`#${S}-grp`, fit(prev + 0.6, 0.7));
    if (d) m.push(d);
    return { css, html, motions: m };
  }

  if (ctx.variant === "focus-crop") {
    const others = ["doc", "folder", "image", "chart", "mail", "calendar", "gear", "globe"];
    const tiles = Array.from({ length: 9 }, (_, k) => ({ x: 50 + (k % 3) * 320, y: 75 + Math.floor(k / 3) * 230 }));
    const ctxTile = [1, 3, 7, 0];
    const lit = Math.max(tSub, w.a + 0.52);
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-panel { position: absolute; left: 20px; top: 45px; width: 1020px; height: 730px; box-sizing: border-box; border-radius: ${R + 6}px;
  border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-tile { position: absolute; width: 300px; height: 210px; box-sizing: border-box; border-radius: ${R}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 8%, transparent); }
.${S}-ti { position: absolute; left: 114px; top: 40px; width: 72px; height: 72px; color: var(--muted); opacity: 0.3; }
.${S}-ti svg { width: 72px; height: 72px; }
#${S}-ci { color: var(--gold); }
.${S}-tl { position: absolute; left: 0; top: 136px; width: 300px; text-align: center; font-size: 30px; font-weight: 600; color: var(--ink); white-space: nowrap; }
#${S}-crop { position: absolute; left: ${tiles[4].x - 14}px; top: ${tiles[4].y - 14}px; width: 328px; height: 238px; transform-origin: 50% 50%; }
#${S}-crop svg { width: 328px; height: 238px; overflow: visible; }
#${S}-crop path { fill: none; stroke: var(--cyan); stroke-width: 6; stroke-linecap: round; }
#${S}-link { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-link path { fill: none; stroke: var(--gold); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-card { position: absolute; left: 1090px; top: 100px; width: 650px; height: 620px; box-sizing: border-box; border-radius: ${R}px;
  background: var(--surface); border-top: 4px solid var(--gold); padding: 50px 40px; text-align: center; }
#${S}-big { width: 200px; height: 200px; margin: 0 auto 36px; border-radius: 50%; color: var(--gold);
  background: color-mix(in srgb, var(--gold) 14%, transparent); display: flex; align-items: center; justify-content: center; }
#${S}-big svg { width: 110px; height: 110px; }
#${S}-label { font-size: 56px; font-weight: 800; line-height: 1.12; color: var(--ink); }
#${S}-det { margin-top: 22px; font-size: 36px; font-weight: 600; line-height: 1.3; color: var(--muted); }`;
    const corner = "M2 60 L2 2 L60 2 M268 2 L326 2 L326 60 M326 178 L326 236 L268 236 M60 236 L2 236 L2 178";
    const html = `<div id="${S}-root">
  <div id="${S}-grp">
    <div id="${S}-panel"></div>
    ${tiles.map((p, k) => {
      const ci = ctxTile.indexOf(k);
      const ico = k === 4 ? `<div class="${S}-ti" id="${S}-ci">${ctx.icon(slots.subject.icon)}</div>` : `<div class="${S}-ti">${ctx.icon(others[k > 4 ? k - 1 : k])}</div>`;
      return `<div class="${S}-tile" id="${S}-tile${k + 1}" style="left: ${p.x}px; top: ${p.y}px">${ico}${ci >= 0 && ci < ctxs.length ? `<div class="${S}-tl" id="${S}-tl${ci + 1}">${esc(ctxs[ci])}</div>` : ""}</div>`;
    }).join("\n    ")}
    <div id="${S}-crop"><svg viewBox="0 0 328 238"><path d="${corner}"/></svg></div>
    <svg id="${S}-link" viewBox="0 0 1760 820"><path id="${S}-linkp" pathLength="1000" d="M${tiles[4].x + 314} ${tiles[4].y + 105} C 880 ${tiles[4].y + 105} 960 ${tiles[4].y + 105} 1090 ${tiles[4].y + 105}"/></svg>
    <div id="${S}-card">
      <div id="${S}-big">${ctx.icon(slots.subject.icon)}</div>
      <div id="${S}-label">${label}</div>
      <div id="${S}-det">${detail}</div>
    </div>
  </div>
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-panel`, at: w.a, dur: 0.45, from: { opacity: 0 } },
      ...tiles.map((_, k) => ({ prim: "reveal", target: `#${S}-tile${k + 1}`, at: w.a + 0.05 + k * 0.04, dur: 0.4, from: { opacity: 0, scale: 0.9 } })),
      { prim: "reveal", target: `#${S}-crop`, at: w.a + 0.2, dur: 0.3, from: { opacity: 0, scale: 3 }, to: { opacity: 1, scale: 3 } },
      { prim: "slide", target: `#${S}-crop`, at: lit, dur: 0.8, from: { scale: 3 }, to: { scale: 1 }, ease: "power3.inOut" },
      { prim: "reveal", target: `#${S}-ci`, at: fit(lit + 0.6, 0.4), dur: 0.4, from: { opacity: 0.3 }, to: { opacity: 1 } },
      { prim: "reveal", target: `#${S}-card`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, x: 40 }, to: { opacity: 0.45, x: 0 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-card`, at: fit(lit + 0.5, 0.4), dur: 0.4, from: { opacity: 0.45 }, to: { opacity: 1 } },
      { prim: "reveal", target: `#${S}-big`, at: fit(lit + 0.5, 0.45), dur: 0.45, from: { opacity: 0, scale: 0.5 }, ease: "back.out(2)" },
      { prim: "reveal", target: `#${S}-label`, at: fit(lit + 0.6, 0.5), dur: 0.5, from, ease: ctx.ease },
    );
    const td = fit(Math.max(tDet, lit + 0.8), 0.6);
    m.push({ prim: "draw", target: `#${S}-linkp`, at: td, dur: 0.6 },
      { prim: "reveal", target: `#${S}-det`, at: fit(td + 0.3, 0.5), dur: 0.5, from: { opacity: 0, y: 16 } });
    let prev = td;
    ctxs.forEach((_, i) => {
      const t = fit(Math.max(tCtx[i], prev + 0.2), 0.4);
      prev = t;
      m.push({ prim: "reveal", target: `#${S}-tl${i + 1}`, at: t, dur: 0.4, from: { opacity: 0, y: 12 } });
    });
    const d = ctx.drift(`#${S}-grp`, fit(Math.max(prev, td + 0.8) + 0.5, 0.7), 10);
    if (d) m.push(d);
    return { css, html, motions: m };
  }

  // lens
  const C = { x: 520, y: 400 };
  const lit = Math.max(tSub, w.a + 0.52);
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-cross { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-cross line { stroke: color-mix(in srgb, var(--ink) 10%, transparent); stroke-width: 2; }
#${S}-cross path { fill: none; stroke: var(--gold); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-disc { position: absolute; left: ${C.x - 200}px; top: ${C.y - 200}px; width: 400px; height: 400px; border-radius: 50%;
  background: color-mix(in srgb, var(--gold) 12%, var(--surface)); color: var(--gold); display: flex; align-items: center; justify-content: center; }
#${S}-disc svg { width: 200px; height: 200px; }
#${S}-lens { position: absolute; left: ${C.x - 270}px; top: ${C.y - 270}px; width: 620px; height: 620px; transform-origin: 270px 270px; }
#${S}-lens svg { width: 620px; height: 620px; overflow: visible; }
#${S}-lens circle { fill: none; stroke: var(--cyan); stroke-width: 8; }
#${S}-lens path { fill: none; stroke: var(--cyan); stroke-width: 22; stroke-linecap: round; }
#${S}-col { position: absolute; left: 1000px; top: 170px; width: 720px; }
#${S}-label { font-size: 68px; font-weight: 800; line-height: 1.1; color: var(--ink); }
#${S}-det { margin-top: 24px; font-size: 40px; font-weight: 600; line-height: 1.3; color: var(--muted); }
#${S}-chips { margin-top: 36px; display: flex; flex-wrap: wrap; gap: 16px; }
.${S}-chip { padding: 10px 26px; border-radius: 34px; border: 2px solid color-mix(in srgb, var(--cyan) 55%, transparent);
  font-size: 30px; font-weight: 600; color: var(--ink); white-space: nowrap; }`;
  const html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-cross" viewBox="0 0 1760 820">
      <line x1="${C.x}" y1="40" x2="${C.x}" y2="780"/><line x1="40" y1="${C.y}" x2="960" y2="${C.y}"/>
      <path id="${S}-link" pathLength="1000" d="M${C.x + 262} ${C.y - 70} C 880 ${C.y - 150} 920 210 990 210"/>
    </svg>
    <div id="${S}-disc">${ctx.icon(slots.subject.icon)}</div>
    <div id="${S}-lens"><svg viewBox="0 0 620 620"><circle cx="270" cy="270" r="250"/><path d="M447 447 L560 560"/></svg></div>
    <div id="${S}-col">
      <div id="${S}-label">${label}</div>
      <div id="${S}-det">${detail}</div>
      ${ctxs.length ? `<div id="${S}-chips">${ctxs.map((c, i) => `<span class="${S}-chip" id="${S}-c${i + 1}">${esc(c)}</span>`).join("")}</div>` : ""}
    </div>
  </div>
</div>`;
  const tLens = Math.max(lit, w.a + 0.52);
  m.push(
    { prim: "reveal", target: `#${S}-disc`, at: w.a, dur: 0.45, from: { opacity: 0, scale: 0.85 }, to: { opacity: 0.3, scale: 0.85 } },
    { prim: "reveal", target: `#${S}-disc`, at: lit, dur: 0.5, from: { opacity: 0.3, scale: 0.85 }, ease: "back.out(1.6)" },
    { prim: "reveal", target: `#${S}-lens`, at: w.a + 0.05, dur: 0.45, from: { opacity: 0, scale: 1.35 }, to: { opacity: 0.5, scale: 1.35 } },
    { prim: "reveal", target: `#${S}-lens`, at: tLens, dur: 0.7, from: { opacity: 0.5, scale: 1.35 }, ease: "power3.inOut" },
    { prim: "draw", target: `#${S}-link`, at: fit(lit + 0.4, 0.6), dur: 0.6 },
    { prim: "reveal", target: `#${S}-label`, at: fit(lit + 0.55, 0.5), dur: 0.5, from, ease: ctx.ease },
  );
  const td = fit(Math.max(tDet, lit + 0.6), 0.5);
  m.push({ prim: "reveal", target: `#${S}-det`, at: td, dur: 0.5, from: { opacity: 0, y: 16 } });
  let prev = td;
  ctxs.forEach((_, i) => {
    const t = fit(Math.max(tCtx[i], prev + 0.2), 0.4);
    prev = t;
    m.push({ prim: "reveal", target: `#${S}-c${i + 1}`, at: t, dur: 0.4, from: { opacity: 0, scale: 0.7 }, ease: "back.out(1.8)" });
  });
  const d = ctx.drift(`#${S}-grp`, fit(prev + 0.6, 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: m };
}

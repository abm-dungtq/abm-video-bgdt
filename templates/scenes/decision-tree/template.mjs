// decision-tree — "if … then use …": one question, 2–3 conditions, each leading to a choice; after the HyperFrames
// registry block "flowchart" (Apache-2.0). The question node, faint connectors and numbered answer shells are on stage
// at the window start. On each branch keyword its connector inks in, the condition pill pops onto it and the answer
// card fills. With `pick`, the recommended route traces in gold, its card gets a gold ring and a check, the others dim.
// tree (signature): the question on top, the branches fan down to a row of answer cards.
// sideways: the question as a tall card on the left, the branches run right to stacked answer rows.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["question", ...slots.branches.map((_, i) => `branches.${i}`), ...(slots.pick != null ? ["pick"] : [])];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const br = slots.branches;
  const n = br.length;
  const pick = slots.pick ?? null;
  if (pick != null && pick >= n) throw new Error(`pick ${pick} is past the last branch (${n} branches, first is 0)`);
  const tQ = ctx.at("question");
  const t = br.map((_, i) => ctx.at(`branches.${i}`));
  const last = Math.max(...t);
  // the pick follows every branch and leaves room for its ring; with no room the others stay undimmed
  const tP = pick != null ? Math.min(Math.max(ctx.at("pick"), last + 0.5), w.b - 1.0) : null;
  const dimOthers = pick != null && tP >= last + 0.45;
  const side = ctx.variant === "sideways";
  const m = [];

  // geometry: question box Q, per branch a pill P, a card C and the connector path d
  let Q, P, C, d, qFs;
  if (side) {
    Q = { x: 0, y: 250, w: 640, h: 320 };
    const rowH = n === 3 ? 190 : 250, gap = n === 3 ? 60 : 90;
    const top = Math.round((820 - (n * rowH + (n - 1) * gap)) / 2);
    const cy = br.map((_, i) => top + i * (rowH + gap) + rowH / 2);
    P = cy.map((y) => ({ x: 800, y: y - 32, w: 330, h: 64 }));
    C = cy.map((y) => ({ x: 1170, y: y - rowH / 2, w: 590, h: rowH }));
    d = cy.map((y) => `M640 410 C720 410 720 ${y} 790 ${y} L1170 ${y}`);
    qFs = [...slots.question].length <= 24 ? 56 : 48;
  } else {
    Q = { x: 280, y: 20, w: 1200, h: 130 };
    const cw = n === 3 ? 520 : 680, gap = n === 3 ? 50 : 120;
    const x0 = Math.round((1760 - (n * cw + (n - 1) * gap)) / 2);
    const cx = br.map((_, i) => x0 + i * (cw + gap) + cw / 2);
    P = cx.map((x) => ({ x: x - 180, y: 290, w: 360, h: 64 }));
    C = cx.map((x) => ({ x: x - cw / 2, y: 430, w: cw, h: 250 }));
    d = cx.map((x) => `M880 150 L880 220 L${x} 220 L${x} 290 M${x} 354 L${x} 430`);
    qFs = [...slots.question].length <= 30 ? 50 : 44;
  }
  const tFs = side ? 38 : n === 3 ? 38 : 42;
  const box = (b) => `left: ${b.x}px; top: ${b.y}px; width: ${b.w}px; height: ${b.h}px;`;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-base { fill: none; stroke: color-mix(in srgb, var(--muted) 35%, transparent); stroke-width: 3; stroke-dasharray: 8 10; }
.${S}-ink { fill: none; stroke: var(--cyan); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-gold { fill: none; stroke: var(--gold); stroke-width: 8; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
#${S}-q { position: absolute; ${box(Q)} box-sizing: border-box; border-radius: ${R}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--gold) 55%, transparent); display: flex; ${side ? "flex-direction: column; justify-content: center; padding: 36px 44px; gap: 22px;" : "align-items: center; justify-content: center; padding: 0 40px; gap: 26px;"} }
#${S}-qi { flex: none; width: ${side ? 84 : 72}px; height: ${side ? 84 : 72}px; border-radius: 50%; background: color-mix(in srgb, var(--gold) 16%, transparent);
  color: var(--gold); display: flex; align-items: center; justify-content: center; }
#${S}-qi svg { width: ${side ? 48 : 42}px; height: ${side ? 48 : 42}px; }
#${S}-qt { font-size: ${qFs}px; font-weight: 800; line-height: 1.15; color: var(--ink); ${side ? "" : "white-space: nowrap;"} }
.${S}-w { position: absolute; box-sizing: border-box; border-radius: 32px; background: var(--canvas); border: 2px solid var(--cyan);
  display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: var(--cyan); white-space: nowrap; }
.${S}-c { position: absolute; box-sizing: border-box; border-radius: ${R}px; background: var(--surface);
  border-top: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); display: flex; align-items: center; gap: 24px; padding: 0 ${side ? 36 : 34}px; }
.${S}-num { position: absolute; right: 22px; top: 14px; font-family: "${theme.mono}", monospace; font-size: 30px; font-weight: 700; color: var(--cyan); opacity: 0.85; }
.${S}-ic { flex: none; width: 80px; height: 80px; border-radius: 50%; background: color-mix(in srgb, var(--cyan) 14%, transparent); color: var(--cyan);
  display: flex; align-items: center; justify-content: center; }
.${S}-ic svg { width: 46px; height: 46px; }
.${S}-t { font-size: ${tFs}px; font-weight: 800; line-height: 1.18; color: var(--ink); padding-right: 36px; }
#${S}-pk { position: absolute; box-sizing: border-box; border-radius: ${R + 4}px; border: 4px solid var(--gold);
  box-shadow: 0 0 34px color-mix(in srgb, var(--gold) 35%, transparent); }
#${S}-ok { position: absolute; width: 60px; height: 60px; border-radius: 50%; background: var(--gold); color: var(--canvas);
  display: flex; align-items: center; justify-content: center; }
#${S}-ok svg { width: 36px; height: 36px; }`;

  const pk = pick != null ? C[pick] : null;
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <svg id="${S}-svg" viewBox="0 0 1760 820">
${d.map((p) => `   <path class="${S}-base" d="${p}"/>`).join("\n")}
${d.map((p, i) => `   <path class="${S}-ink" id="${S}-e${i}" pathLength="1000" d="${p}"/>`).join("\n")}
${pick != null ? `   <path class="${S}-gold" id="${S}-g" pathLength="1000" d="${d[pick]}"/>` : ""}
  </svg>
  <div id="${S}-q"><div id="${S}-qi">${ctx.icon("question")}</div><div id="${S}-qt">${esc(slots.question)}</div></div>
${br.map((b, i) => `  <div class="${S}-c" id="${S}-c${i}" style="${box(C[i])}">
    <div class="${S}-num" id="${S}-n${i}">${String(i + 1).padStart(2, "0")}</div>
    <div class="${S}-ic" id="${S}-i${i}">${ctx.icon(b.icon ?? "arrow")}</div><div class="${S}-t" id="${S}-t${i}">${esc(b.then)}</div>
  </div>
  <div class="${S}-w" id="${S}-w${i}" style="${box(P[i])}">${esc(b.when)}</div>`).join("\n")}
${pk ? `  <div id="${S}-pk" style="left: ${pk.x - 8}px; top: ${pk.y - 8}px; width: ${pk.w + 16}px; height: ${pk.h + 16}px"></div>
  <div id="${S}-ok" style="left: ${pk.x - 22}px; top: ${pk.y - 26}px">${ctx.icon("check")}</div>` : ""}
 </div>
</div>`;

  // structure at the window start: the question box, faint routes, numbered answer shells
  m.push({ prim: "reveal", target: `#${S}-q`, at: w.a + 0.05, dur: 0.5, from: side ? { opacity: 0, x: -40 } : { opacity: 0, y: -30 }, ease: ctx.ease },
    { prim: "reveal", target: `#${S}-svg`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0 } },
    { prim: "reveal", target: `#${S}-qt`, at: Math.max(tQ, w.a + 0.15), dur: 0.45, from: { opacity: 0, y: 14 } },
    { prim: "reveal", target: `#${S}-qi`, at: w.a + 0.2, dur: 0.45, from: { opacity: 0, scale: 0.5 }, ease: "back.out(2)" });
  br.forEach((b, i) => {
    const enter = Math.min(t[i], w.a + 0.15 + i * 0.08);
    const ghost = t[i] + 0.3 - enter >= 0.7; // time to show a faint icon in the shell before the branch fills
    m.push({ prim: "reveal", target: `#${S}-c${i}`, at: enter, dur: 0.5, from: side ? { opacity: 0, x: 50 } : { opacity: 0, y: 40 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-n${i}`, at: enter + 0.15, dur: 0.35, from: { opacity: 0, x: 12 } },
      // on the branch keyword: the route inks, the condition pops on it, the answer fills
      { prim: "draw", target: `#${S}-e${i}`, at: t[i], dur: 0.55, ease: "power2.inOut" },
      { prim: "reveal", target: `#${S}-w${i}`, at: t[i] + 0.15, dur: 0.4, from: { opacity: 0, scale: 0.6 }, ease: "back.out(2)" },
      ...(ghost ? [{ prim: "reveal", target: `#${S}-i${i}`, at: enter + 0.15, dur: 0.35, from: { opacity: 0, scale: 0.8 }, to: { opacity: 0.3, scale: 0.8 } }] : []),
      { prim: "reveal", target: `#${S}-i${i}`, at: t[i] + 0.3, dur: 0.4, from: ghost ? { opacity: 0.3, scale: 0.8 } : { opacity: 0, scale: 0.5 }, ease: "back.out(2)" },
      { prim: "reveal", target: `#${S}-t${i}`, at: t[i] + 0.35, dur: 0.45, from: { opacity: 0, y: 16 } });
  });
  let end = last + 0.8;
  if (pk) {
    const others = br.map((_, i) => i).filter((i) => i !== pick);
    m.push({ prim: "draw", target: `#${S}-g`, at: tP, dur: 0.6, ease: "power2.inOut" },
      { prim: "reveal", target: `#${S}-pk`, at: tP + 0.4, dur: 0.45, from: { opacity: 0, scale: 1.08 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-ok`, at: tP + 0.55, dur: 0.4, from: { opacity: 0, scale: 0.3 }, ease: "back.out(2.5)" },
      ...(dimOthers ? [{ prim: "dim", targets: others.flatMap((i) => [`#${S}-c${i}`, `#${S}-w${i}`]), at: tP + 0.3, to: 0.5 }] : []));
    end = tP + 0.95;
  }
  const dr = ctx.drift(`#${S}-grp`, Math.min(end + ctx.gap, w.b - 0.7), 10);
  if (dr) m.push(dr);
  return { css, html, motions: keepInside(m, w.b) };
}

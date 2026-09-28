// split — two sides compared, the right one always after the left, an optional verdict last.
// Each side is a panel: icon disc + title, then up to three items whose bullets stand faint from the window start and
// light as the items rise.
// compare-50: two equal panels, a drawn divider with a "vs" badge between them, verdict as a band below.
// slide-over: a wide left card; the right card slides over its right edge and the left card dims; verdict under the left.
// before-after: a small muted "TRƯỚC" card, a drawn arrow, a large gold "SAU" card; items after get check marks.

export const revealKeys = (slots) => ["left", "right", ...(slots.verdict ? ["verdict"] : [])];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const tL = ctx.at("left"), tR = ctx.at("right");
  const tV = slots.verdict ? ctx.at("verdict") : null;
  const fit = (x, dur) => Math.max(w.a, Math.min(x, w.b - dur - 0.05));
  const v = ctx.variant;
  const m = [];

  // geometry per variant: panels sized to their content and centred in the room above the verdict
  const nMax = Math.max((slots.left.items ?? []).length, (slots.right.items ?? []).length);
  const H = Math.max(380, 250 + nMax * 96);
  const room = slots.verdict ? 660 : 820;
  const mid = (h) => Math.max(20, Math.round((room - h) / 2));
  const G = {
    "compare-50": { L: { x: 40, y: mid(H), w: 800, h: H }, R: { x: 920, y: mid(H), w: 800, h: H }, fs: 54, is: 40 },
    "slide-over": { L: { x: 40, y: mid(H + 110) , w: 1060, h: H }, R: { x: 880, y: mid(H + 110) + 110, w: 800, h: H }, fs: 58, is: 40 },
    "before-after": { L: { x: 30, y: mid(H), w: 600, h: H }, R: { x: 800, y: mid(H + 60), w: 930, h: H + 60 }, fs: 52, is: 40 },
  }[v];
  const vTop = Math.min(700, Math.max(G.L.y + G.L.h, v === "slide-over" ? 0 : G.R.y + G.R.h) + 34);

  const panel = (k, side, box, tag) => {
    const items = side.items ?? [];
    const ico = side.icon ? `<div class="${S}-ico" id="${S}-${k}i">${ctx.icon(side.icon)}</div>` : "";
    const bullet = (j) => (v === "before-after" && k === "r") ? ctx.icon("check") : `<span>${j + 1}</span>`;
    return `<div class="${S}-panel ${S}-${k}" id="${S}-${k}" style="left: ${box.x}px; top: ${box.y}px; width: ${box.w}px; height: ${box.h}px">
      <div class="${S}-lit" id="${S}-${k}lit"></div>
      ${tag ? `<div class="${S}-tag">${tag}</div>` : ""}
      ${ico}
      <div class="${S}-title" id="${S}-${k}t" style="left: ${side.icon ? 190 : 48}px; width: ${box.w - (side.icon ? 230 : 96)}px">${esc(side.title)}</div>
      ${items.map((it, j) => `<div class="${S}-bul" id="${S}-${k}b${j + 1}" style="top: ${220 + j * 96}px">${bullet(j)}</div>
      <div class="${S}-item" id="${S}-${k}x${j + 1}" style="top: ${214 + j * 96}px; width: ${box.w - 170}px">${esc(it)}</div>`).join("\n      ")}
    </div>`;
  };

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
.${S}-panel { position: absolute; box-sizing: border-box; border-radius: ${R}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); overflow: hidden; }
.${S}-lit { position: absolute; left: 0; top: 0; width: 100%; height: 6px; background: var(--muted); transform-origin: 0 50%; }
#${S}-rlit { background: var(--gold); }
.${S}-tag { position: absolute; right: 36px; top: 34px; font-family: "${theme.mono}", monospace; font-size: 28px; letter-spacing: 0.16em; color: var(--muted); }
#${S}-r .${S}-tag { color: var(--gold); }
.${S}-ico { position: absolute; left: 48px; top: 48px; width: 116px; height: 116px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; color: var(--gold); background: color-mix(in srgb, var(--gold) 14%, transparent); }
#${S}-li { color: var(--muted); background: color-mix(in srgb, var(--muted) 16%, transparent); }
.${S}-ico svg { width: 64px; height: 64px; }
.${S}-title { position: absolute; top: ${v === "before-after" ? 84 : 58}px; font-size: ${G.fs}px; font-weight: 800; line-height: 1.1; color: var(--ink); }
.${S}-bul { position: absolute; left: 48px; width: 52px; height: 52px; box-sizing: border-box; border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--cyan) 70%, transparent); color: var(--cyan); display: flex; align-items: center; justify-content: center;
  font-family: "${theme.mono}", monospace; font-size: 26px; }
.${S}-bul svg { width: 30px; height: 30px; }
.${S}-item { position: absolute; left: 124px; font-size: ${G.is}px; font-weight: 600; line-height: 1.25; color: var(--ink); }
#${S}-l .${S}-item { color: color-mix(in srgb, var(--ink) 85%, transparent); }
#${S}-web { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-web path { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
#${S}-divp { stroke: color-mix(in srgb, var(--ink) 30%, transparent); stroke-width: 3; }
#${S}-arrp { stroke: var(--gold); stroke-width: 8; }
#${S}-vs { position: absolute; left: 830px; top: ${G.L.y + G.L.h / 2 - 50}px; width: 100px; height: 100px; box-sizing: border-box; border-radius: 50%;
  background: var(--surface); border: 3px solid var(--cyan); color: var(--cyan); display: flex; align-items: center; justify-content: center;
  font-family: "${theme.mono}", monospace; font-size: 34px; }
#${S}-verd { position: absolute; box-sizing: border-box; display: flex; align-items: center; gap: 20px; border-radius: ${R}px;
  font-size: 38px; font-weight: 800; line-height: 1.2; color: var(--ink); padding: 0 36px;
  background: color-mix(in srgb, var(--gold) 16%, transparent); border: 2px solid color-mix(in srgb, var(--gold) 60%, transparent); }
#${S}-verd svg { width: 48px; height: 48px; flex: none; color: var(--gold); }`;

  const verdBox = {
    "compare-50": `left: 260px; top: ${vTop}px; width: 1240px; height: 100px; justify-content: center;`,
    "slide-over": `left: 40px; top: ${vTop}px; width: 820px; height: 100px; font-size: 34px;`,
    "before-after": `left: 800px; top: ${vTop}px; width: 930px; height: 100px;`,
  }[v];
  const ay = G.L.y + Math.round(G.L.h / 2);
  const web = v === "compare-50"
    ? `<path id="${S}-divp" pathLength="1000" d="M880 ${G.L.y + 20} L880 ${G.L.y + G.L.h - 20}"/>`
    : v === "before-after"
      ? `<path id="${S}-arrp" pathLength="1000" d="M${G.L.x + G.L.w + 24} ${ay} L${G.R.x - 30} ${ay} M${G.R.x - 58} ${ay - 28} L${G.R.x - 30} ${ay} L${G.R.x - 58} ${ay + 28}"/>`
      : "";
  const html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-web" viewBox="0 0 1760 820">${web}</svg>
    ${panel("l", slots.left, G.L, v === "before-after" ? "TRƯỚC" : "")}
    ${v === "compare-50" ? `<div id="${S}-vs">vs</div>` : ""}
    ${panel("r", slots.right, G.R, v === "before-after" ? "SAU" : "")}
    ${slots.verdict ? `<div id="${S}-verd" style="${verdBox}">${ctx.icon(v === "before-after" ? "spark" : "arrow")}<span>${esc(slots.verdict)}</span></div>` : ""}
  </div>
</div>`;

  // one side: shell at `enter`, faint bullets, then title/icon/items on its time
  const side = (k, s, t, enter, shellFrom, shellTo) => {
    const items = s.items ?? [];
    m.push({ prim: "reveal", target: `#${S}-${k}`, at: enter, dur: 0.5, from: shellFrom, ...(shellTo ? { to: shellTo } : {}), ease: ctx.ease });
    items.forEach((_, j) => m.push({ prim: "reveal", target: `#${S}-${k}b${j + 1}`, at: Math.min(enter + 0.15 + j * 0.06, t), dur: 0.35, from: { opacity: 0, scale: 0.6 }, to: { opacity: 0.35, scale: 1 } }));
    const lit = Math.max(t, enter + 0.52);
    m.push({ prim: "reveal", target: `#${S}-${k}lit`, at: fit(lit, 0.45), dur: 0.45, from: { scaleX: 0 }, ease: "power2.out" });
    if (s.icon) m.push({ prim: "reveal", target: `#${S}-${k}i`, at: fit(t, 0.45), dur: 0.45, from: { opacity: 0, scale: 0.5 }, ease: "back.out(2)" });
    m.push({ prim: "reveal", target: `#${S}-${k}t`, at: fit(t + 0.05, 0.5), dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    let end = t + 0.55;
    items.forEach((_, j) => {
      const at = fit(Math.max(lit, t + 0.3 + j * 0.22), 0.4);
      const bOn = Math.max(at, enter + 0.15 + j * 0.06 + 0.35 + ctx.gap, Math.min(enter + 0.15 + j * 0.06, t) + 0.35 + ctx.gap);
      m.push({ prim: "reveal", target: `#${S}-${k}b${j + 1}`, at: Math.min(bOn, w.b - 0.3), dur: 0.25, from: { opacity: 0.35 }, to: { opacity: 1 } },
        { prim: "reveal", target: `#${S}-${k}x${j + 1}`, at, dur: 0.4, from: { opacity: 0, x: -20 } });
      end = Math.max(end, at + 0.4);
    });
    return end;
  };

  let end;
  if (v === "slide-over") {
    side("l", slots.left, tL, w.a, ctx.motionFrom());
    const enterR = Math.max(tR - 0.1, w.a + 0.1);
    end = side("r", slots.right, Math.max(tR, enterR), enterR, { opacity: 0, x: 70 });
    m.push({ prim: "dim", targets: [`#${S}-l`], at: fit(Math.max(enterR, w.a + 0.55), 0.3), to: 0.4 });
  } else if (v === "before-after") {
    side("l", slots.left, tL, w.a, { opacity: 0, x: -40 });
    // the after card waits as a faint shell, then brightens on its cue
    end = side("r", slots.right, tR, w.a + 0.1, { opacity: 0, x: 40 }, { opacity: 0.4, x: 0 });
    m.push({ prim: "reveal", target: `#${S}-r`, at: fit(Math.max(tR, w.a + 0.62), 0.4), dur: 0.4, from: { opacity: 0.4 }, to: { opacity: 1 } });
    m.push({ prim: "draw", target: `#${S}-arrp`, at: fit(tR - 0.2, 0.5), dur: 0.5 });
  } else {
    side("l", slots.left, tL, w.a, { opacity: 0, x: -40 });
    end = side("r", slots.right, tR, w.a + 0.08, { opacity: 0, x: 40 });
    m.push({ prim: "draw", target: `#${S}-divp`, at: w.a + 0.1, dur: 0.7 },
      { prim: "reveal", target: `#${S}-vs`, at: w.a + 0.3, dur: 0.45, from: { opacity: 0, scale: 0.5 }, ease: "back.out(2)" });
  }
  if (slots.verdict) {
    const at = fit(Math.max(tV, tR + 0.4), 0.5);
    m.push({ prim: "reveal", target: `#${S}-verd`, at, dur: 0.5, from: { opacity: 0, y: 24 }, ease: ctx.ease });
    end = Math.max(end, at + 0.5);
  }
  const d = ctx.drift(`#${S}-grp`, fit(end + 0.4, 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: m };
}

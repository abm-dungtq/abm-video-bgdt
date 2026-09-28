// title — opens a chapter. number-draw: a ring is drawn around the chapter number, then the title rises.
// big-type: an oversized left-aligned title slides in over a faint outline numeral, underlined by a drawn bar.
// split-band: a full-width band sweeps in; a gold block on its left counts the chapter number up, the title sits on the
// band to the right with the kicker above it and a drawn gold rule below.

export const revealKeys = (slots) => [...(slots.kicker ? ["kicker"] : []), "number", "title"];

const size = (t, steps) => steps.find(([n]) => [...t].length <= n)?.[1] ?? steps.at(-1)[1];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const no = String(slots.chapterNo).padStart(2, "0");
  const title = esc(slots.title);
  const tNum = ctx.at("number"), tTitle = ctx.at("title");
  const tKick = slots.kicker ? ctx.at("kicker") : null;
  const settle = Math.min(w.b - 0.05, tTitle + 0.9);

  if (ctx.variant === "big-type") {
    const fs = size(slots.title, [[20, 124], [30, 104], [40, 88]]);
    const label = slots.chapterNo > 0 ? `Chương ${no}` : (slots.kicker ?? "");
    const kicker = slots.chapterNo > 0 && slots.kicker ? slots.kicker : null;
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-ghost { position: absolute; left: 980px; top: 60px; width: 780px; text-align: right; font-family: "${theme.mono}", monospace;
  font-weight: 700; font-size: 520px; line-height: 1; color: transparent; -webkit-text-stroke: 2px color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-label { position: absolute; left: 120px; top: 190px; font-family: "${theme.mono}", monospace; font-size: 32px;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); }
#${S}-title { position: absolute; left: 120px; top: 250px; width: 1480px; font-size: ${fs}px; font-weight: 800;
  line-height: 1.08; letter-spacing: -0.01em; color: var(--ink); }
#${S}-bar { position: absolute; left: 120px; top: 600px; width: 560px; height: 16px; overflow: visible; }
#${S}-bar path { stroke: var(--gold); stroke-width: 8; stroke-linecap: round; fill: none; stroke-dasharray: 1000; }
#${S}-kicker { position: absolute; left: 120px; top: 650px; font-size: 40px; font-weight: 600; color: var(--muted); }`;
    const html = `<div id="${S}-root">
  <div id="${S}-ghost">${slots.chapterNo > 0 ? no : ""}</div>
  ${label ? `<div id="${S}-label">${esc(label)}</div>` : ""}
  <div id="${S}-title">${title}</div>
  <svg id="${S}-bar" viewBox="0 0 560 16"><path id="${S}-barp" pathLength="1000" d="M4 8 L556 8"/></svg>
  ${kicker ? `<div id="${S}-kicker">${esc(kicker)}</div>` : ""}
</div>`;
    const m = [
      { prim: "reveal", target: `#${S}-ghost`, at: w.a, dur: 0.8, from: { opacity: 0 } },
      { prim: "slide", target: `#${S}-ghost`, at: w.a + 0.8, dur: Math.max(0.5, w.b - w.a - 0.85), from: { x: 0 }, to: { x: -60 }, ease: "none" },
      { prim: "reveal", target: `#${S}-title`, at: tTitle, dur: 0.6, from: { opacity: 0, x: -80 } },
      { prim: "draw", target: `#${S}-barp`, at: Math.min(tTitle + 0.35, w.b - 0.7), dur: 0.6 },
    ];
    if (label) m.push({ prim: "reveal", target: `#${S}-label`, at: tKick ?? tNum, dur: 0.5, from: { opacity: 0, y: 16 } });
    if (kicker) m.push({ prim: "reveal", target: `#${S}-kicker`, at: Math.min(settle, w.b - 0.5), dur: 0.45, from: { opacity: 0, y: 16 } });
    return { css, html, motions: m };
  }

  if (ctx.variant === "split-band") {
    const fs = size(slots.title, [[20, 100], [30, 84], [40, 72]]);
    const n = slots.chapterNo;
    const numHtml = n > 0 ? `${n < 10 ? "<span>0</span>" : ""}<span id="${S}-nv">0</span>` : ctx.icon("spark");
    const fit = (t, dur) => Math.max(w.a, Math.min(t, w.b - dur - 0.05));
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-band { position: absolute; left: 0; top: 250px; width: 1760px; height: 320px; box-sizing: border-box; transform-origin: 0 50%;
  background: color-mix(in srgb, var(--surface) 85%, transparent); border-top: 2px solid color-mix(in srgb, var(--gold) 45%, transparent);
  border-bottom: 2px solid color-mix(in srgb, var(--gold) 45%, transparent); }
#${S}-block { position: absolute; left: 0; top: 250px; width: 460px; height: 320px; box-sizing: border-box; background: var(--surface);
  border-left: 12px solid var(--gold); border-right: 3px solid color-mix(in srgb, var(--gold) 60%, transparent); }
#${S}-cap { position: absolute; left: 0; top: 34px; width: 445px; text-align: center; font-family: "${theme.mono}", monospace; font-size: 30px;
  letter-spacing: 0.2em; text-transform: uppercase; color: var(--cyan); }
#${S}-num { position: absolute; left: 0; top: 70px; width: 445px; height: 230px; display: flex; align-items: center; justify-content: center;
  font-family: "${theme.mono}", monospace; font-weight: 700; font-size: 210px; line-height: 1; color: var(--gold); }
#${S}-num svg { width: 150px; height: 150px; }
#${S}-kicker { position: absolute; left: 540px; top: 180px; font-family: "${theme.mono}", monospace; font-size: 30px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--muted); white-space: nowrap; }
#${S}-grp { position: absolute; left: 540px; top: 250px; width: 1160px; height: 320px; display: flex; align-items: center; }
#${S}-title { font-size: ${fs}px; font-weight: 800; line-height: 1.1; letter-spacing: -0.01em; color: var(--ink); }
#${S}-line { position: absolute; left: 540px; top: 604px; width: 1160px; height: 10px; overflow: visible; }
#${S}-line path { stroke: var(--gold); stroke-width: 5; stroke-linecap: round; fill: none; stroke-dasharray: 1000; }`;
    const html = `<div id="${S}-root">
  <div id="${S}-band"></div>
  <div id="${S}-block"><div id="${S}-cap">Chương</div><div id="${S}-num">${numHtml}</div></div>
  ${slots.kicker ? `<div id="${S}-kicker">${esc(slots.kicker)}</div>` : ""}
  <div id="${S}-grp"><div id="${S}-title">${title}</div></div>
  <svg id="${S}-line" viewBox="0 0 1160 10"><path id="${S}-linep" pathLength="1000" d="M3 5 L1157 5"/></svg>
</div>`;
    const m = [
      { prim: "reveal", target: `#${S}-band`, at: w.a, dur: 0.6, from: { scaleX: 0 }, ease: "power3.out" },
      { prim: "reveal", target: `#${S}-block`, at: w.a + 0.15, dur: 0.5, from: { opacity: 0, x: -60 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-num`, at: Math.max(tNum, w.a + 0.3), dur: 0.5, from: { opacity: 0, scale: 0.7 }, ease: "back.out(1.6)" },
      { prim: "reveal", target: `#${S}-title`, at: tTitle, dur: 0.6, from: ctx.motionFrom(), ease: ctx.ease },
      { prim: "draw", target: `#${S}-linep`, at: fit(tTitle + 0.35, 0.7), dur: 0.7 },
    ];
    if (n > 0) m.push({ prim: "count", target: `#${S}-nv`, at: fit(Math.max(tNum, w.a + 0.3), 0.6), dur: 0.6, to: n });
    if (slots.kicker) m.push({ prim: "reveal", target: `#${S}-kicker`, at: tKick, dur: 0.5, from: { opacity: 0, x: -20 } });
    const d = ctx.drift(`#${S}-grp`, fit(tTitle + 0.7, 0.7), 12);
    if (d) m.push(d);
    return { css, html, motions: m };
  }

  // number-draw
  const fs = size(slots.title, [[24, 92], [32, 80], [40, 68]]);
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-kicker { position: absolute; left: 0; top: 60px; width: 1760px; text-align: center; font-family: "${theme.mono}", monospace;
  font-size: 30px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
#${S}-spin { position: absolute; left: 725px; top: 120px; width: 310px; height: 310px; }
#${S}-ring { position: absolute; inset: 0; width: 310px; height: 310px; overflow: visible; }
#${S}-ring .${S}-track { stroke: color-mix(in srgb, var(--ink) 14%, transparent); stroke-width: 2; stroke-dasharray: none; }
#${S}-ring circle { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-ring .${S}-tick { stroke: var(--cyan); stroke-width: 10; }
#${S}-num { position: absolute; left: 725px; top: 120px; width: 310px; height: 310px; display: flex; align-items: center;
  justify-content: center; font-family: "${theme.mono}", monospace; font-weight: 700; font-size: 128px; color: var(--gold); }
#${S}-num svg { width: 132px; height: 132px; }
#${S}-title { position: absolute; left: 80px; top: 480px; width: 1600px; text-align: center; font-size: ${fs}px;
  font-weight: 800; line-height: 1.14; color: var(--ink); }
#${S}-line { position: absolute; left: 680px; top: 730px; width: 400px; height: 10px; overflow: visible; }
#${S}-line path { stroke: var(--gold); stroke-width: 4; stroke-linecap: round; fill: none; stroke-dasharray: 1000; opacity: 0.8; }`;
  const html = `<div id="${S}-root">
  ${slots.kicker ? `<div id="${S}-kicker">${esc(slots.kicker)}</div>` : ""}
  <div id="${S}-spin">
    <svg id="${S}-ring" viewBox="0 0 310 310">
      <circle id="${S}-track" class="${S}-track" cx="155" cy="155" r="140"/>
      <circle id="${S}-circle" pathLength="1000" cx="155" cy="155" r="140" transform="rotate(-90 155 155)"/>
      <circle id="${S}-tick" class="${S}-tick" pathLength="1000" cx="155" cy="155" r="140" transform="rotate(-90 155 155)" style="stroke-dasharray: 18 982"/>
    </svg>
  </div>
  <div id="${S}-num">${slots.chapterNo > 0 ? no : ctx.icon("spark")}</div>
  <div id="${S}-title">${title}</div>
  <svg id="${S}-line" viewBox="0 0 400 10"><path id="${S}-linep" pathLength="1000" d="M2 5 L398 5"/></svg>
</div>`;
  const m = [
    { prim: "reveal", target: `#${S}-track`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0 } },
    { prim: "draw", target: `#${S}-circle`, at: tNum, dur: 0.9 },
    { prim: "reveal", target: `#${S}-tick`, at: tNum + 0.8, dur: 0.3, from: { opacity: 0 } },
    { prim: "slide", target: `#${S}-spin`, at: tNum + 0.9, dur: Math.max(0.5, w.b - tNum - 0.95), from: { rotation: 0 }, to: { rotation: 160 + Math.round(ctx.rng() * 60) }, ease: "none" },
    { prim: "reveal", target: `#${S}-num`, at: tNum + 0.25, dur: 0.55, from: { opacity: 0, scale: 0.6 } },
    { prim: "reveal", target: `#${S}-title`, at: tTitle, dur: 0.6, from: { opacity: 0, y: 30 } },
    { prim: "draw", target: `#${S}-linep`, at: Math.min(tTitle + 0.35, w.b - 0.65), dur: 0.6 },
  ];
  if (slots.kicker) m.push({ prim: "reveal", target: `#${S}-kicker`, at: tKick, dur: 0.5, from: { opacity: 0, y: 14 } });
  return { css, html, motions: m };
}

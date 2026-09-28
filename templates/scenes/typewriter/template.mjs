// typewriter — a sentence types itself out, character by character, over the `text` range.
// line: a wide chat input box (icon, placeholder that clears, send button that lights and pulses when typing ends),
//   a cyan progress line under the box tracks the typing.
// document: a numbered editor window on the right (file name, gutter 01–08, ghost lines below the typed text),
//   a large document disc with the heading on the left.
// quote-card: an oversized gold quote mark, the quote typed beside it, the heading as attribution after a drawn rule.

export const revealKeys = (slots) => [...(slots.heading ? ["heading"] : []), "text"];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const chars = [...slots.text.normalize("NFC")];
  const n = chars.length;
  const typed = chars.map((c) => `<span class="${S}-ch">${esc(c)}</span>`).join("");
  const [t0, t1] = ctx.at("text");
  const tdur = Math.min(Math.max(0.6, Math.min(t1 - t0, n * 0.06)), w.b - t0 - 0.1);
  const done = t0 + tdur;
  const fit = (t, dur) => Math.max(w.a, Math.min(t, w.b - dur - 0.05));
  const tHead = slots.heading ? ctx.at("heading") : null;
  const from = ctx.motionFrom();
  const m = [{ prim: "type", target: `#${S}-text`, chars: `.${S}-ch`, count: n, at: t0, dur: tdur }];
  const drift = (target) => { const d = ctx.drift(target, fit(done + 0.4, 0.7)); if (d) m.push(d); };

  if (ctx.variant === "document") {
    const bars = [0, 1, 2, 3].map(() => 360 + Math.round(ctx.rng() * 420));
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-disc { position: absolute; left: 150px; top: 130px; width: 380px; height: 380px; border-radius: 50%;
  background: color-mix(in srgb, var(--gold) 12%, transparent); border: 3px solid color-mix(in srgb, var(--gold) 45%, transparent);
  display: flex; align-items: center; justify-content: center; color: var(--gold); }
#${S}-disc svg { width: 190px; height: 190px; }
#${S}-head { position: absolute; left: 20px; top: 560px; width: 640px; text-align: center; font-size: 54px; font-weight: 800;
  line-height: 1.15; color: var(--ink); }
#${S}-grp { position: absolute; left: 740px; top: 50px; width: 1000px; height: 710px; }
#${S}-win { position: absolute; inset: 0; box-sizing: border-box; background: var(--surface); border-radius: ${R}px;
  border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); overflow: hidden; }
#${S}-bar { position: absolute; left: 0; top: 0; width: 100%; height: 76px; border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-dot { position: absolute; top: 28px; width: 18px; height: 18px; border-radius: 50%; background: color-mix(in srgb, var(--muted) 55%, transparent); }
#${S}-file { position: absolute; left: 140px; top: 18px; font-family: "${theme.mono}", monospace; font-size: 30px; color: var(--muted); }
#${S}-lit { position: absolute; left: 0; top: 0; width: 100%; height: 5px; background: var(--gold); transform-origin: 0 50%; }
.${S}-ln { position: absolute; left: 26px; width: 60px; font-family: "${theme.mono}", monospace; font-size: 28px; line-height: 64px;
  color: var(--cyan); opacity: 0.7; }
#${S}-text { position: absolute; left: 110px; top: 100px; width: 850px; font-size: 44px; font-weight: 600; line-height: 64px; color: var(--ink); }
.${S}-ghost { position: absolute; left: 110px; height: 18px; border-radius: 9px; background: color-mix(in srgb, var(--muted) 28%, transparent); }`;
    const html = `<div id="${S}-root">
  <div id="${S}-disc">${ctx.icon("doc")}</div>
  ${slots.heading ? `<div id="${S}-head">${esc(slots.heading)}</div>` : ""}
  <div id="${S}-grp">
    <div id="${S}-win">
      <div id="${S}-bar"><div class="${S}-dot" style="left: 30px"></div><div class="${S}-dot" style="left: 60px"></div><div class="${S}-dot" style="left: 90px"></div>
        ${slots.heading ? `<div id="${S}-file">${esc(slots.heading)}</div>` : ""}</div>
      <div id="${S}-lit"></div>
      ${Array.from({ length: 9 }, (_, i) => `<div class="${S}-ln" style="top: ${100 + i * 64}px">${String(i + 1).padStart(2, "0")}</div>`).join("")}
      <div id="${S}-text">${typed}</div>
      ${bars.map((bw, i) => `<div class="${S}-ghost" id="${S}-g${i + 1}" style="top: ${100 + (5 + i) * 64 + 23}px; width: ${bw}px"></div>`).join("")}
    </div>
  </div>
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-win`, at: w.a, dur: 0.55, from, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-disc`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, scale: 0.8 }, ease: "back.out(1.6)" },
      ...bars.map((_, i) => ({ prim: "reveal", target: `#${S}-g${i + 1}`, at: w.a + 0.25 + i * 0.07, dur: 0.4, from: { opacity: 0, scaleX: 0.2 } })),
      { prim: "reveal", target: `#${S}-lit`, at: fit(done, 0.45), dur: 0.45, from: { scaleX: 0 }, ease: "power2.out" },
    );
    if (slots.heading) m.push({ prim: "reveal", target: `#${S}-head`, at: tHead, dur: 0.5, from: { opacity: 0, y: 20 } });
    drift(`#${S}-grp`);
    return { css, html, motions: m };
  }

  if (ctx.variant === "quote-card") {
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-panel { position: absolute; left: 60px; top: 60px; width: 1640px; height: 660px; box-sizing: border-box; border-radius: ${R}px;
  background: color-mix(in srgb, var(--surface) 70%, transparent); border-left: 6px solid color-mix(in srgb, var(--gold) 70%, transparent); }
#${S}-qm { position: absolute; left: 110px; top: 110px; width: 300px; height: 244px; color: var(--gold); }
#${S}-qm svg { width: 300px; height: 244px; overflow: visible; }
#${S}-grp { position: absolute; left: 470px; top: 150px; width: 1160px; height: 560px; }
#${S}-text { position: absolute; left: 0; top: 0; width: 1160px; font-size: ${n <= 70 ? 74 : 62}px; font-weight: 600; line-height: 1.32; color: var(--ink); }
#${S}-rule { position: absolute; left: 0; top: 440px; width: 110px; height: 8px; overflow: visible; }
#${S}-rule path { stroke: var(--gold); stroke-width: 5; stroke-linecap: round; fill: none; stroke-dasharray: 1000; }
#${S}-head { position: absolute; left: 136px; top: 412px; font-size: 44px; font-weight: 800; color: var(--gold); white-space: nowrap; }`;
    const html = `<div id="${S}-root">
  <div id="${S}-panel"></div>
  <div id="${S}-qm"><svg viewBox="0 0 150 122">
    <circle cx="34" cy="86" r="30" fill="currentColor"/><path d="M8 84 C8 44 28 18 60 8" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>
    <circle cx="112" cy="86" r="30" fill="currentColor"/><path d="M86 84 C86 44 106 18 138 8" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>
  </svg></div>
  <div id="${S}-grp">
    <div id="${S}-text">${typed}</div>
    <svg id="${S}-rule" viewBox="0 0 110 8"><path id="${S}-rulep" pathLength="1000" d="M3 4 L107 4"/></svg>
    ${slots.heading ? `<div id="${S}-head">${esc(slots.heading)}</div>` : ""}
  </div>
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-panel`, at: w.a, dur: 0.5, from: { opacity: 0, x: -40 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-qm`, at: w.a + 0.1, dur: 0.55, from: { opacity: 0, scale: 0.5 }, to: { opacity: 0.9, scale: 1 }, ease: "back.out(1.7)" },
      { prim: "draw", target: `#${S}-rulep`, at: w.a + 0.3, dur: 0.6 },
    );
    if (slots.heading) m.push({ prim: "reveal", target: `#${S}-head`, at: Math.max(tHead, fit(done, 0.5)), dur: 0.5, from: { opacity: 0, x: -24 } });
    drift(`#${S}-grp`);
    return { css, html, motions: m };
  }

  // line
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-head { position: absolute; left: 130px; top: 200px; width: 1500px; font-size: 44px; font-weight: 800; color: var(--ink); }
#${S}-grp { position: absolute; left: 130px; top: 290px; width: 1500px; height: 420px; }
#${S}-box { position: absolute; left: 0; top: 0; width: 1500px; height: 310px; box-sizing: border-box; background: var(--surface);
  border-radius: ${R + 10}px; border: 2px solid color-mix(in srgb, var(--gold) 40%, transparent); }
#${S}-ico { position: absolute; left: 36px; top: 36px; width: 96px; height: 96px; border-radius: 50%; color: var(--gold);
  background: color-mix(in srgb, var(--gold) 14%, transparent); display: flex; align-items: center; justify-content: center; }
#${S}-ico svg { width: 54px; height: 54px; }
#${S}-ph { position: absolute; left: 170px; top: 52px; font-size: 52px; font-weight: 500; color: color-mix(in srgb, var(--muted) 70%, transparent); }
#${S}-text { position: absolute; left: 170px; top: 44px; width: 1120px; font-size: 52px; font-weight: 600; line-height: 1.36; color: var(--ink); }
#${S}-caret { display: inline-block; width: 5px; height: 56px; margin-left: 6px; vertical-align: -8px; background: var(--gold); }
#${S}-send { position: absolute; right: 36px; bottom: 36px; width: 112px; height: 112px; border-radius: 50%; color: var(--canvas, var(--surface));
  background: var(--gold); display: flex; align-items: center; justify-content: center; }
#${S}-send svg { width: 60px; height: 60px; }
#${S}-prog { position: absolute; left: 0; top: 344px; width: 1500px; height: 8px; overflow: visible; }
#${S}-prog .${S}-track { stroke: color-mix(in srgb, var(--ink) 12%, transparent); stroke-width: 3; fill: none; }
#${S}-prog path { stroke: var(--cyan); stroke-width: 5; stroke-linecap: round; fill: none; stroke-dasharray: 1000; }`;
  const html = `<div id="${S}-root">
  ${slots.heading ? `<div id="${S}-head">${esc(slots.heading)}</div>` : ""}
  <div id="${S}-grp">
    <div id="${S}-box">
      <div id="${S}-ico">${ctx.icon("chat")}</div>
      <div id="${S}-ph">Nhập yêu cầu...</div>
      <div id="${S}-text">${typed}<span id="${S}-caret"></span></div>
      <div id="${S}-send">${ctx.icon("arrow")}</div>
    </div>
    <svg id="${S}-prog" viewBox="0 0 1500 8"><line class="${S}-track" x1="4" y1="4" x2="1496" y2="4"/><path id="${S}-progp" pathLength="1000" d="M4 4 L1496 4"/></svg>
  </div>
</div>`;
  const lit = fit(done, 0.45);
  m.push(
    { prim: "reveal", target: `#${S}-box`, at: w.a, dur: 0.5, from, ease: ctx.ease },
    { prim: "reveal", target: `#${S}-ph`, at: t0, dur: 0.15, from: { opacity: 1 }, to: { opacity: 0 } },
    { prim: "draw", target: `#${S}-progp`, at: t0, dur: tdur, ease: "none" },
    { prim: "reveal", target: `#${S}-caret`, at: fit(done, 0.2), dur: 0.2, from: { opacity: 0 } },
    { prim: "reveal", target: `#${S}-send`, at: w.a + 0.15, dur: 0.35, from: { opacity: 0, scale: 0.8 }, to: { opacity: 0.3, scale: 0.8 } },
    { prim: "reveal", target: `#${S}-send`, at: Math.max(lit, w.a + 0.52), dur: 0.45, from: { opacity: 0.3, scale: 0.8 }, ease: "back.out(2)" },
  );
  const pulseAt = Math.max(lit, w.a + 0.52) + 0.45 + ctx.gap;
  if (w.b - 0.05 - pulseAt >= 0.6) m.push({ prim: "pulse", target: `#${S}-send`, at: pulseAt, dur: w.b - 0.05 - pulseAt });
  if (slots.heading) m.push({ prim: "reveal", target: `#${S}-head`, at: tHead, dur: 0.5, from: { opacity: 0, y: -20 } });
  drift(`#${S}-grp`);
  return { css, html, motions: m };
}

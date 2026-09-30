// terminal-window — a macOS-style terminal typing real commands, after the HyperFrames registry block
// "code-snippet-apple-terminal-pro" (heygen-com/hyperframes, Apache-2.0). Unlike `terminal`, this is a near-black window
// with coloured traffic lights and a centred "zsh — 80×24" title, a full `user@host dir %` prompt in bold cyan and a
// cyan block caret that really travels with the typing. Each step's command types on its keyword, Enter hides the
// caret while the output prints (ok lines carry a drawn tick, errors a drawn cross), then the next prompt waits.
// classic (signature): one centred window.
// steps: a numbered plan on the left (label or command per step) that lights as each step runs and ticks when its
//   output is in; the window on the right.

import { keepInside } from "../_shared/dna-card.mjs";
import { caretChars, caretCss, caretMotions } from "../_shared/caret.mjs";

export const revealKeys = (slots) => slots.steps.map((_, i) => `steps.${i}`);

const CHAR = 0.6; // JetBrains Mono advance, em
const TICK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 L9.5 18 L20 6.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CROSS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>`;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const mono = `"${theme.mono}", monospace`;
  const steps = slots.steps;
  const n = steps.length;
  const side = ctx.variant === "steps";
  const prompt = (slots.prompt ?? "~ %").normalize("NFC");
  const title = slots.title ?? "zsh — 80×24";
  const fit = (t, dur) => Math.max(w.a, Math.min(t, w.b - dur - 0.05));
  const t = steps.map((_, i) => ctx.at(`steps.${i}`));

  // rows: per step the command, then its output; one fresh prompt at the end
  const rows = steps.reduce((s, st) => s + 1 + (st.output?.length ?? 0), 0) + 1;
  const winW = side ? 1000 : 1400, winX = side ? 740 : 180;
  const BAR = 52, PAD = 26;
  const inlineLabel = (st) => (!side && st.label ? st.label : "");
  const maxChars = Math.max(30, ...steps.flatMap((st) => [[...prompt].length + 1 + [...st.cmd].length + (inlineLabel(st) ? 4 + [...inlineLabel(st)].length : 0),...(st.output ?? []).map((o) => [...o.text].length + 3)]));
  const LH = Math.min(52, Math.floor(660 / rows));
  const fs = Math.max(16, Math.min(Math.round(LH * 0.6), Math.floor((winW - 90) / (maxChars * CHAR))));
  const winH = BAR + 2 * PAD + rows * LH;
  const winY = Math.round((820 - winH) / 2);

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-win { position: absolute; left: ${winX}px; top: ${winY}px; width: ${winW}px; height: ${winH}px; box-sizing: border-box; border-radius: 14px; overflow: hidden;
  background: color-mix(in srgb, var(--canvas) 40%, black); border: 1px solid color-mix(in srgb, var(--ink) 16%, transparent);
  box-shadow: 0 30px 80px color-mix(in srgb, var(--cyan) 10%, transparent), 0 12px 34px color-mix(in srgb, black 80%, transparent); }
#${S}-bar { position: absolute; left: 0; top: 0; right: 0; height: ${BAR}px; display: flex; align-items: center; gap: 10px; padding: 0 20px;
  background: color-mix(in srgb, var(--canvas) 35%, color-mix(in srgb, var(--ink) 12%, black)); border-bottom: 1px solid color-mix(in srgb, var(--ink) 14%, transparent); }
.${S}-tl { width: 17px; height: 17px; border-radius: 50%; flex: none; }
#${S}-ttl { position: absolute; left: 120px; right: 120px; text-align: center; font-size: 24px; font-weight: 600; color: color-mix(in srgb, var(--ink) 70%, transparent);
  white-space: nowrap; overflow: hidden; }
#${S}-feed { position: absolute; left: 34px; right: 30px; top: ${BAR + PAD}px; }
.${S}-row { height: ${LH}px; line-height: ${LH}px; font-family: ${mono}; font-size: ${fs}px; white-space: pre; overflow: hidden; }
.${S}-pr { position: relative; color: var(--cyan); font-weight: 700; }
.${S}-cmd { color: var(--ink); }
.${S}-o { color: color-mix(in srgb, var(--ink) 74%, transparent); display: flex; align-items: center; gap: 0.5em; }
.${S}-o svg { width: 0.9em; height: 0.9em; flex: none; }
.${S}-ok { color: var(--cyan); font-weight: 700; }
.${S}-err { color: var(--warn); font-weight: 700; }
.${S}-dim { color: var(--muted); }
${caretCss(S, { color: "var(--cyan)", w: 0.6 })}
.${S}-cr { right: -0.62em; top: 0.12em; height: 1.1em; border-radius: 1px; }
.${S}-pr > .${S}-cr { right: -1.22em; }
#${S}-plan { position: absolute; left: 20px; top: 0; width: 660px; height: 820px; display: flex; flex-direction: column; justify-content: center; gap: 26px; }
.${S}-it { display: flex; align-items: center; gap: 26px; }
.${S}-num { position: relative; width: 76px; height: 76px; flex: none; border-radius: 50%; border: 3px solid color-mix(in srgb, var(--cyan) 60%, transparent);
  font-family: ${mono}; font-size: 34px; font-weight: 700; color: var(--cyan); display: flex; align-items: center; justify-content: center; }
.${S}-chk { position: absolute; inset: -3px; border-radius: 50%; background: var(--cyan); color: var(--canvas); display: flex; align-items: center;
  justify-content: center; }
.${S}-chk svg { width: 44px; height: 44px; }
.${S}-lab { font-size: ${n > 3 ? 38 : 42}px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-lab.${S}-mono { font-family: ${mono}; font-size: 30px; font-weight: 700; }`;

  // ── html ──────────────────────────────────────────────────────────────────────
  let r = 0;
  const feed = [];
  const promptSpan = (id) => `<span class="${S}-pr">${esc(prompt)}<i class="${S}-cr" id="${id}" data-layout-allow-overlap></i></span>`;
  steps.forEach((st, i) => {
    feed.push(`<div class="${S}-row" id="${S}-p${i}">${promptSpan(`${S}-pc${i}`)} <span class="${S}-cmd">${caretChars(st.cmd, { S, esc, cls: `${S}-k${i}`, idp: `${S}-c${i}-` })}</span>${inlineLabel(st) ? `<span class="${S}-dim" id="${S}-lb${i}">  # ${esc(st.label)}</span>` : ""}</div>`);
    r++;
    (st.output ?? []).forEach((o, j) => {
      const kind = o.kind ?? "text";
      const icon = kind === "ok" ? TICK : kind === "err" ? CROSS : "";
      feed.push(`<div class="${S}-row ${S}-o${kind === "text" ? "" : ` ${S}-${kind}`}" id="${S}-o${i}-${j}">${icon}<span>${esc(o.text) || " "}</span></div>`);
      r++;
    });
  });
  feed.push(`<div class="${S}-row" id="${S}-pend">${promptSpan(`${S}-pce`)}</div>`);
  const plan = side ? `<div id="${S}-plan">
${steps.map((st, i) => `    <div class="${S}-it" id="${S}-it${i}"><div class="${S}-num">${i + 1}<div class="${S}-chk" id="${S}-ck${i}">${TICK}</div></div><div class="${S}-lab${st.label ? "" : ` ${S}-mono`}">${esc(st.label ?? st.cmd)}</div></div>`).join("\n")}
  </div>` : "";
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <div id="${S}-win">
    <div id="${S}-bar"><span class="${S}-tl" style="background: var(--warn)"></span><span class="${S}-tl" style="background: var(--gold)"></span><span class="${S}-tl" style="background: var(--cyan)"></span>
      <div id="${S}-ttl">${esc(title)}</div></div>
    <div id="${S}-feed">
      ${feed.join("\n      ")}
    </div>
  </div>
  ${plan}
 </div>
</div>`;

  // ── motion ────────────────────────────────────────────────────────────────────
  const m = [{ prim: "reveal", target: `#${S}-win`, at: w.a + 0.05, dur: 0.5, from: side ? { opacity: 0, x: 50 } : { opacity: 0, y: 30, scale: 0.97 }, ease: ctx.ease }];
  if (side) {
    m.push({ prim: "reveal", target: `#${S}-plan`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, x: -30 } });
    steps.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-it${i}`, at: w.a + 0.15 + i * 0.08, dur: 0.4, from: { opacity: 0, y: 14 }, to: { opacity: 0.4, y: 0 } }));
  }
  const events = [], sw = [], marks = [];
  let prevEnd = w.a + 0.35;
  steps.forEach((st, i) => {
    const chars = [...st.cmd.normalize("NFC")];
    const nextAt = i + 1 < n ? Math.max(t[i + 1], prevEnd + 0.4) : w.b - 0.35;
    const start = Math.min(i === 0 ? Math.max(w.a + 0.35, t[0]) : Math.max(t[i], prevEnd + 0.12), w.b - 0.6 - (n - 1 - i) * 0.1);
    const outs = st.output ?? [];
    const budget = Math.max(0.3, Math.min(nextAt, w.b - 0.3) - start);
    const step = Math.max(0.012, Math.min(0.055, (budget * 0.55) / chars.length));
    const typed = start + 0.12 + chars.length * step;
    const enter = typed + Math.min(0.15, budget * 0.08);
    const ostep = Math.max(0.03, Math.min(0.09, (budget * 0.3) / Math.max(1, outs.length)));
    // the prompt row (the first one is on stage with the window)
    if (i > 0) sw.push({ prim: "swap", target: `#${S}-p${i}`, at: start, props: { opacity: 1 } });
    events.push({ t: i === 0 ? w.a + 0.4 : start, id: `${S}-pc${i}` });
    chars.forEach((_, k) => {
      const at = start + 0.12 + k * step;
      sw.push({ prim: "swap", target: `#${S}-c${i}-${k}`, at, props: { opacity: 1 } });
      events.push({ t: at, id: `${S}-c${i}-${k}c` });
    });
    events.push({ t: enter, id: null });
    if (inlineLabel(st)) sw.push({ prim: "swap", target: `#${S}-lb${i}`, at: enter, props: { opacity: 1 } });
    outs.forEach((_, j) => sw.push({ prim: "swap", target: `#${S}-o${i}-${j}`, at: enter + 0.05 + j * ostep, props: { opacity: 1 } }));
    prevEnd = enter + 0.05 + outs.length * ostep;
    marks.push([start, prevEnd]);
  });
  // a long plan in a short window: squeeze the whole typing timeline so the last output still lands inside it
  const t0 = w.a + 0.35, room = w.b - 1.1 - t0, used = prevEnd - t0;
  const squeeze = used > room ? (x) => t0 + ((x - t0) * room) / used : (x) => x;
  for (const e of sw) m.push({ ...e, at: squeeze(e.at) });
  for (const e of events) e.t = squeeze(e.t);
  prevEnd = squeeze(prevEnd);
  if (side) marks.forEach(([start, done], i) => m.push(
    { prim: "reveal", target: `#${S}-it${i}`, at: fit(squeeze(start), 0.3), dur: 0.3, from: { opacity: 0.4 }, to: { opacity: 1 } },
    { prim: "reveal", target: `#${S}-ck${i}`, at: fit(squeeze(done), 0.35), dur: 0.35, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" }));
  const endAt = Math.min(prevEnd + 0.1, w.b - 0.2);
  m.push({ prim: "swap", target: `#${S}-pend`, at: endAt, props: { opacity: 1 } });
  events.push({ t: endAt, id: `${S}-pce` });
  m.push(...caretMotions(events, w.b));
  const d = ctx.drift(`#${S}-grp`, Math.min(prevEnd + 0.3, w.b - 0.7), 8);
  if (d) m.push(d);
  // rows after the first prompt start hidden
  const hiddenRows = [...steps.map((_, i) => (i ? `#${S}-p${i}` : null)).filter(Boolean),
    ...steps.flatMap((st, i) => (st.output ?? []).map((_, j) => `#${S}-o${i}-${j}`)), `#${S}-pend`,
    ...steps.map((st, i) => (inlineLabel(st) ? `#${S}-lb${i}` : null)).filter(Boolean)];
  const css2 = `\n${hiddenRows.join(", ")} { opacity: 0; }`;
  return { css: css + css2, html, motions: keepInside(m, w.b) };
}

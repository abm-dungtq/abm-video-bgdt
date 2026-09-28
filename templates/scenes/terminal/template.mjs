// terminal — a terminal window with real captured lines (capture/terminal). The window chrome (surface panel, three
// muted dots, mono title) is on stage at the window start; lines arrive on their reveal times.
// typed (signature): a centred window; prompt lines are typed character by character after a cyan "$", output lines
//   rise in, and a block cursor blinks on a fresh prompt at the end.
// output-scroll: a big title strip over a wide window whose 10-line viewport scrolls as output streams in, with a
//   moving scrollbar thumb and a pulsing status light.

export const revealKeys = (slots) => slots.lines.map((_, i) => `lines.${i}`);

const r2 = (x) => Math.round(x * 100) / 100;

export function render(ctx) {
  const { S, slots, esc, window: w, theme } = ctx;
  const lines = slots.lines;
  const n = lines.length;
  const t = lines.map((_, i) => ctx.at(`lines.${i}`));
  const last = Math.max(...t);
  const mono = `"${theme.mono}", monospace`;
  const fit = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const scroll = ctx.variant === "output-scroll";
  const LH = scroll ? 46 : 44, ROWS = scroll ? 10 : n + 1, BAR = 64, PAD = 26;
  const winH = BAR + 2 * PAD + ROWS * LH;
  const winX = 80, winW = 1600, winY = scroll ? 150 : Math.max(10, Math.round((820 - winH) / 2));
  const m = [];

  // a prompt line: "$ " + one span per character (the first word in gold), typed on with `type`
  const typedText = (s, i) => {
    const first = s.search(/\s/) < 0 ? s.length : s.search(/\s/);
    return [...s].map((c, k) => `<span class="${S}-k${i + 1}${k < first ? ` ${S}-cmd` : ""}">${esc(c)}</span>`).join("");
  };
  const line = (l, i) => l.prompt
    ? `<div class="${S}-ln ${S}-pl" id="${S}-L${i + 1}"><span class="${S}-ps">$</span> ${scroll ? `<span class="${S}-cmdw">${esc(l.text)}</span>` : typedText(l.text, i)}</div>`
    : `<div class="${S}-ln ${S}-out" id="${S}-L${i + 1}">${esc(l.text) || " "}</div>`;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-win { position: absolute; left: ${winX}px; top: ${winY}px; width: ${winW}px; height: ${winH}px; box-sizing: border-box; border-radius: 18px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); overflow: hidden;
  box-shadow: 0 28px 70px color-mix(in srgb, var(--canvas) 70%, transparent); }
#${S}-bar { position: absolute; left: 0; top: 0; right: 0; height: ${BAR}px; display: flex; align-items: center; gap: 14px; padding: 0 26px;
  background: color-mix(in srgb, var(--ink) 5%, var(--surface)); border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-tl { width: 16px; height: 16px; border-radius: 50%; background: color-mix(in srgb, var(--muted) 55%, transparent); }
#${S}-ttl { position: absolute; left: 200px; right: 200px; top: 0; height: ${BAR}px; line-height: ${BAR}px; text-align: center; font-family: ${mono};
  font-size: 28px; color: var(--muted); white-space: nowrap; }
#${S}-view { position: absolute; left: 0; right: 0; top: ${BAR}px; bottom: 0; overflow: hidden; }
#${S}-feed { position: absolute; left: 40px; right: 60px; top: ${PAD}px; }
.${S}-ln { height: ${LH}px; line-height: ${LH}px; font-family: ${mono}; font-size: 28px; white-space: pre; overflow: hidden; }
.${S}-pl { color: var(--ink); }
.${S}-out { color: color-mix(in srgb, var(--ink) 72%, var(--surface)); }
.${S}-ps { color: var(--cyan); font-weight: 700; }
.${S}-cmd, .${S}-cmdw { color: var(--gold); }
#${S}-cur { display: inline-block; width: 16px; height: 32px; vertical-align: middle; background: var(--ink); }`;

  // ── output-scroll ──────────────────────────────────────────────────────────────
  if (scroll) {
    const track = ROWS * LH;
    const thumb = Math.max(60, Math.round((track * ROWS) / Math.max(ROWS, n)));
    const css2 = `
#${S}-head { position: absolute; left: ${winX}px; top: 20px; height: 100px; display: flex; align-items: center; gap: 26px; }
#${S}-hico { width: 84px; height: 84px; border-radius: 20px; background: color-mix(in srgb, var(--gold) 14%, transparent); color: var(--gold);
  display: flex; align-items: center; justify-content: center; }
#${S}-hico svg { width: 52px; height: 52px; }
#${S}-htxt { font-size: 64px; font-weight: 800; color: var(--ink); white-space: nowrap; }
#${S}-led { position: absolute; right: 30px; top: ${BAR / 2 - 9}px; width: 18px; height: 18px; border-radius: 50%; background: var(--cyan);
  box-shadow: 0 0 14px color-mix(in srgb, var(--cyan) 70%, transparent); }
#${S}-trk { position: absolute; right: 18px; top: ${PAD}px; width: 8px; height: ${track}px; border-radius: 4px; background: color-mix(in srgb, var(--ink) 8%, transparent); }
#${S}-thumb { position: absolute; right: 18px; top: ${PAD}px; width: 8px; height: ${thumb}px; border-radius: 4px; background: color-mix(in srgb, var(--cyan) 60%, transparent); }`;
    const html = `<div id="${S}-root">
  <div id="${S}-head"><div id="${S}-hico">${ctx.icon("terminal")}</div><div id="${S}-htxt">${esc(slots.title)}</div></div>
  <div id="${S}-win">
    <div id="${S}-bar"><span class="${S}-tl"></span><span class="${S}-tl"></span><span class="${S}-tl"></span><div id="${S}-ttl">bash</div><div id="${S}-led"></div></div>
    <div id="${S}-view"><div id="${S}-feed">
${lines.map((l, i) => `      ${line(l, i)}`).join("\n")}
    </div><div id="${S}-trk"></div><div id="${S}-thumb"></div></div>
  </div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-win`, at: w.a + 0.05, dur: 0.55, from: { opacity: 0, y: 40 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-head`, at: w.a + 0.15, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    const ledAt = w.a + 0.7;
    if (w.b - 0.05 - ledAt >= 1.2) m.push({ prim: "pulse", target: `#${S}-led`, at: ledAt, dur: w.b - 0.05 - ledAt });
    lines.forEach((l, i) => m.push({ prim: "reveal", target: `#${S}-L${i + 1}`, at: fit(t[i], 0.3), dur: 0.3, from: l.prompt ? { opacity: 0, x: -16 } : { opacity: 0, y: 14 } }));
    // scroll one row per line past the viewport; a scroll that cannot start in time folds into the previous one
    const slides = [];
    let off = 0;
    for (let i = ROWS; i < n; i++) {
      const want = i - ROWS + 1;
      const prevEnd = slides.length ? slides.at(-1).at + slides.at(-1).dur : w.a;
      const at = Math.max(t[i] - 0.05, prevEnd + ctx.gap + 0.01);
      if (at + 0.2 > w.b - 0.05) { if (slides.length) slides.at(-1).rows = want; continue; }
      slides.push({ at, dur: Math.min(0.3, w.b - 0.05 - at), from: off, rows: want });
      off = want;
    }
    const maxOff = Math.max(1, n - ROWS);
    slides.forEach((s, k) => {
      const from = k ? slides[k - 1].rows : 0;
      m.push({ prim: "slide", target: `#${S}-feed`, at: s.at, dur: s.dur, from: { y: -from * LH }, to: { y: -s.rows * LH }, ease: "power2.out" });
      m.push({ prim: "slide", target: `#${S}-thumb`, at: s.at, dur: s.dur, from: { y: r2(((track - thumb) * from) / maxOff) }, to: { y: r2(((track - thumb) * s.rows) / maxOff) }, ease: "power2.out" });
    });
    const endScroll = slides.length ? slides.at(-1).at + slides.at(-1).dur : 0;
    const d = ctx.drift(`#${S}-head`, Math.max(w.a + 0.7, endScroll) + ctx.gap, 10);
    if (d) m.push(d);
    return { css: css + css2, html, motions: m };
  }

  // ── typed ──────────────────────────────────────────────────────────────────────
  const html = `<div id="${S}-root">
  <div id="${S}-win">
    <div id="${S}-bar"><span class="${S}-tl"></span><span class="${S}-tl"></span><span class="${S}-tl"></span><div id="${S}-ttl">${esc(slots.title)}</div></div>
    <div id="${S}-view"><div id="${S}-feed">
${lines.map((l, i) => `      ${line(l, i)}`).join("\n")}
      <div class="${S}-ln ${S}-pl" id="${S}-end"><span class="${S}-ps">$</span> <span id="${S}-cur"></span></div>
    </div></div>
  </div>
</div>`;
  m.push({ prim: "reveal", target: `#${S}-win`, at: w.a + 0.05, dur: 0.55, from: { opacity: 0, scale: 0.96 }, ease: ctx.ease });
  let typedEnd = w.a + 0.6;
  lines.forEach((l, i) => {
    const at = fit(t[i], 0.25);
    m.push({ prim: "reveal", target: `#${S}-L${i + 1}`, at, dur: 0.25, from: l.prompt ? { opacity: 0 } : { opacity: 0, y: 10 } });
    if (l.prompt && l.text.length) {
      const next = i + 1 < n ? t[i + 1] - 0.08 : w.b - 0.05;
      const start = at + 0.1;
      const dur = r2(Math.max(0.1, Math.min(0.045 * [...l.text].length, 1.2, next - start, w.b - 0.05 - start)));
      m.push({ prim: "type", target: `#${S}-L${i + 1}`, chars: `.${S}-k${i + 1}`, count: [...l.text].length, at: start, dur });
      typedEnd = Math.max(typedEnd, start + dur);
    } else typedEnd = Math.max(typedEnd, at + 0.25);
  });
  // a fresh prompt with a blinking block cursor
  const endAt = Math.min(typedEnd + 0.15, w.b - 0.3);
  m.push({ prim: "reveal", target: `#${S}-end`, at: endAt, dur: 0.2, from: { opacity: 0 } });
  for (let k = 1, at = endAt + 0.2 + 0.5; at < w.b - 0.05; k++, at += 0.5) {
    m.push({ prim: "swap", target: `#${S}-cur`, at: r2(at), props: { opacity: k % 2 ? 0 : 1 } });
  }
  const d = ctx.drift(`#${S}-win`, Math.max(last + 0.3, w.a + 0.6) + ctx.gap, 10);
  if (d) m.push(d);
  return { css, html, motions: m };
}

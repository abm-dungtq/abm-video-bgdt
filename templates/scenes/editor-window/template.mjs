// editor-window — a VS Code-like window writing real code, after the HyperFrames registry block
// "code-snippet-dark-modern" (Apache-2.0). The window chrome (title bar, tabs, breadcrumbs, gutter, status bar) is on
// stage at the window start, recoloured from the theme instead of the Dark Modern palette. Over the `code` range the
// lines are typed one after another while the active-line band and the status bar "Dòng n" follow; on `run` the
// command runs and its output appears.
// workbench (signature): the full workbench: activity bar, Explorer tree, editor, and a terminal panel that slides up
//   on `run`.
// zen: a focused editor window with a minimap; the run result pops up as a notification card in its corner.

import { keepInside } from "../_shared/dna-card.mjs";
import { CHAR, tokenize, tokenCss } from "../_shared/code-tokens.mjs";

export const revealKeys = (slots) => ["code", ...(slots.run ? ["run"] : [])];

const r3 = (x) => Math.round(x * 1000) / 1000;
const GAP_LINE = 0.05;

// activity bar glyphs, from the registry block
const ACT = [
  '<path fill="currentColor" d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"/>',
  '<path fill="none" stroke="currentColor" stroke-width="2" d="m21 21-5.2-5.2M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"/>',
  '<path fill="none" stroke="currentColor" stroke-width="2" d="M8 18 3 12l5-6m8 12 5-6-5-6"/>',
  '<path fill="none" stroke="currentColor" stroke-width="2" d="M12 3v18m0-18 6 6m-6-6L6 9m6 12 6-6m-6 6-6-6"/>',
];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  if (slots.output && !slots.run) throw new Error("output needs a run command (slot run)");
  const lines = slots.lines.map((l) => l.normalize("NFC").replace(/\s+$/, ""));
  const n = lines.length;
  const len = lines.map((l) => [...l].length);
  const N = Math.max(1, len.reduce((s, x) => s + x, 0));
  const maxLen = Math.max(16, ...len);
  const zen = ctx.variant === "zen";
  const files = [slots.file, ...(slots.files ?? [])];
  const lang = (slots.file.match(/\.(\w+)$/)?.[1] ?? "txt").toUpperCase();
  const out = slots.output ?? [];
  const m = [];

  // ── geometry (window-local px) ──────────────────────────────────────────────
  const WX = zen ? 110 : 152, WW = zen ? 1540 : 1456;
  const TB = 44, SB = 32, TABS = 46, CRUMB = 34;
  const ACTW = zen ? 0 : 60, SIDEW = zen ? 0 : 380, MINI = zen ? 150 : 0;
  // Explorer text sizes that fit the longest name (Be Vietnam Pro ≈ 0.6 em per character, capitals ≈ 0.75 em)
  const treeFs = Math.min(21, Math.floor((SIDEW - 70) / (Math.max(...files.map((f) => [...f].length)) * 0.6)));
  const headFs = Math.min(18, Math.floor((SIDEW - 50) / ([...slots.project].length * 0.78)));
  const EX = ACTW + SIDEW, EW = WW - EX;
  const GUT = 70, PADX = 20;
  const toastH = 70 + 42 * (1 + out.length);
  // the run area under the code: a terminal panel (workbench) or the strip the notification card sits in (zen)
  const PANEL = slots.run ? (zen ? toastH + 30 : 60 + 42 * (1 + out.length)) : 0;
  const lhMax = Math.floor((800 - TB - TABS - CRUMB - SB - PANEL - 40) / n); // the whole window fits the stage
  const fs = Math.max(16, Math.min(zen ? 28 : 26, Math.floor((EW - GUT - PADX - MINI - 40) / (maxLen * CHAR)), Math.floor(lhMax / 1.55)));
  const LH = Math.round(fs * 1.55);
  const runLen = slots.run ? [...slots.project].length + 3 + [...slots.run].length : 0;
  const toastW = Math.min(EW - MINI - 60, Math.max(560, Math.round(Math.max(runLen, ...out.map((o) => [...o].length)) * 22 * CHAR + 60)));
  const codeH = 16 + n * LH + 20;
  const WH = Math.min(800, TB + TABS + CRUMB + codeH + PANEL + SB);
  const WY = Math.max(10, Math.round((820 - WH) / 2));
  const codeTop = TB + TABS + CRUMB;
  const rowTop = (i) => 16 + i * LH;

  const rowHtml = (l, i) => {
    const chars = tokenize(l).flatMap((t) => [...t.text].map((c) => `<span class="${S}-k${i} ${S}-${t.kind}">${esc(c)}</span>`)).join("");
    return `      <div class="${S}-row" style="top: ${rowTop(i)}px"><span class="${S}-ln">${i + 1}</span><span class="${S}-tx" id="${S}-L${i}">${chars}</span></div>`;
  };
  // minimap: one bar per token run, scaled down
  const mini = zen ? lines.map((l, i) => {
    let col = 0;
    return tokenize(l).map((t) => {
      const wd = [...t.text].length, x = col;
      col += wd;
      return t.kind === "sp" ? "" : `<div class="${S}-mb ${S}-${t.kind}" style="left: ${Math.round(x * 2.2)}px; top: ${i * 9}px; width: ${Math.max(2, Math.round(wd * 2.2))}px"></div>`;
    }).join("");
  }).join("") : "";
  const runChars = slots.run ? [...slots.run.normalize("NFC")] : [];

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-wb { position: absolute; left: ${WX}px; top: ${WY}px; width: ${WW}px; height: ${WH}px; box-sizing: border-box; overflow: hidden; border-radius: ${Math.round(R / 2)}px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); box-shadow: 0 34px 90px color-mix(in srgb, var(--canvas) 75%, transparent); }
#${S}-tb { position: absolute; left: 0; top: 0; width: ${WW}px; height: ${TB}px; background: color-mix(in srgb, var(--surface) 70%, var(--canvas));
  border-bottom: 1px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-tl { position: absolute; top: 15px; width: 14px; height: 14px; border-radius: 50%; }
#${S}-wt { position: absolute; left: 0; top: 0; width: ${WW}px; height: ${TB}px; line-height: ${TB}px; text-align: center; font-size: 20px; color: var(--muted); white-space: nowrap; }
#${S}-srch { position: absolute; right: 18px; top: 9px; width: 220px; height: 26px; box-sizing: border-box; border-radius: 6px; padding-left: 12px;
  border: 1px solid color-mix(in srgb, var(--muted) 35%, transparent); font-size: 17px; line-height: 24px; color: var(--muted); }
#${S}-act { position: absolute; left: 0; top: ${TB}px; width: ${ACTW}px; height: ${WH - TB - SB}px; background: color-mix(in srgb, var(--surface) 70%, var(--canvas));
  border-right: 1px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-ai { position: absolute; left: 14px; width: 32px; height: 32px; color: var(--muted); }
.${S}-ai svg { width: 32px; height: 32px; display: block; }
#${S}-ai0 { color: var(--ink); }
#${S}-aibar { position: absolute; left: 0; top: 16px; width: 3px; height: 40px; background: var(--cyan); }
#${S}-side { position: absolute; left: ${ACTW}px; top: ${TB}px; width: ${SIDEW}px; height: ${WH - TB - SB}px; box-sizing: border-box; padding: 16px 0;
  background: color-mix(in srgb, var(--surface) 70%, var(--canvas)); border-right: 1px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-sh { padding: 0 20px; height: 34px; font-size: ${headFs}px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); white-space: nowrap; overflow: hidden; }
.${S}-tr { height: 38px; line-height: 38px; padding-left: 34px; font-size: ${treeFs}px; color: color-mix(in srgb, var(--ink) 80%, var(--muted)); white-space: nowrap; overflow: hidden; }
.${S}-tr b { display: inline-block; width: 10px; height: 10px; margin-right: 12px; border-radius: 2px; background: color-mix(in srgb, var(--cyan) 60%, transparent); }
#${S}-tr0 { background: color-mix(in srgb, var(--cyan) 16%, transparent); color: var(--ink); }
#${S}-ed { position: absolute; left: ${EX}px; top: ${TB}px; width: ${EW}px; height: ${WH - TB - SB}px; overflow: hidden; }
#${S}-tabs { position: absolute; left: 0; top: 0; width: ${EW}px; height: ${TABS}px; display: flex; background: color-mix(in srgb, var(--surface) 70%, var(--canvas));
  border-bottom: 1px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-tab { height: ${TABS}px; line-height: ${TABS}px; padding: 0 26px; font-size: 20px; color: var(--muted); white-space: nowrap; box-sizing: border-box;
  border-right: 1px solid color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-tab0 { background: var(--surface); color: var(--ink); border-top: 3px solid var(--cyan); line-height: ${TABS - 3}px; }
#${S}-crumb { position: absolute; left: 0; top: ${TABS}px; width: ${EW}px; height: ${CRUMB}px; line-height: ${CRUMB}px; padding-left: 22px; box-sizing: border-box;
  font-size: 18px; color: var(--muted); white-space: nowrap; overflow: hidden; }
#${S}-code { position: absolute; left: 0; top: ${codeTop - TB}px; width: ${EW}px; height: ${codeH}px; }
#${S}-band { position: absolute; left: 0; top: ${rowTop(0)}px; width: ${EW - MINI}px; height: ${LH}px; background: color-mix(in srgb, var(--ink) 5%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--ink) 8%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--ink) 8%, transparent); box-sizing: border-box; }
.${S}-row { position: absolute; left: 0; height: ${LH}px; line-height: ${LH}px; font-family: ${mono}; font-size: ${fs}px; }
.${S}-ln { position: absolute; left: 0; top: 0; width: ${GUT - 16}px; text-align: right; color: color-mix(in srgb, var(--muted) 75%, transparent); }
.${S}-tx { position: absolute; left: ${GUT + PADX}px; top: 0; white-space: pre; }
${tokenCss(S)}
#${S}-mini { position: absolute; right: 0; top: 0; width: ${MINI}px; height: ${codeH}px; border-left: 1px solid color-mix(in srgb, var(--ink) 8%, transparent); }
#${S}-minin { position: absolute; left: 18px; top: 18px; width: ${MINI - 30}px; height: ${n * 9}px; overflow: hidden; }
.${S}-mb { position: absolute; height: 5px; border-radius: 1px; background: currentColor; opacity: 0.8; }
#${S}-minv { position: absolute; left: 8px; top: 12px; width: ${MINI - 16}px; height: ${n * 9 + 12}px; border-radius: 4px; background: color-mix(in srgb, var(--ink) 7%, transparent); }
#${S}-panel { position: absolute; left: 0; top: ${WH - TB - SB - PANEL}px; width: ${EW}px; height: ${PANEL}px; box-sizing: border-box;
  background: color-mix(in srgb, var(--surface) 70%, var(--canvas)); border-top: 1px solid color-mix(in srgb, var(--ink) 14%, transparent); }
#${S}-ptabs { height: 50px; line-height: 50px; padding-left: 22px; font-size: 17px; font-weight: 700; letter-spacing: 0.06em; color: var(--muted); white-space: nowrap; }
#${S}-ptabs span { margin-right: 30px; }
#${S}-ptabs .${S}-on { color: var(--ink); border-bottom: 2px solid var(--cyan); padding-bottom: 6px; }
.${S}-pl { height: 42px; line-height: 42px; padding-left: 22px; font-family: ${mono}; font-size: 24px; color: color-mix(in srgb, var(--ink) 80%, var(--muted)); white-space: pre; overflow: hidden; }
.${S}-pp { color: var(--cyan); font-weight: 700; }
.${S}-ok { color: var(--gold); }
#${S}-sb { position: absolute; left: 0; top: ${WH - SB}px; width: ${WW}px; height: ${SB}px; line-height: ${SB}px; font-size: 17px; color: var(--muted);
  background: color-mix(in srgb, var(--surface) 70%, var(--canvas)); border-top: 1px solid color-mix(in srgb, var(--ink) 10%, transparent); white-space: nowrap; }
#${S}-sbl { position: absolute; left: 0; top: 0; display: flex; gap: 22px; }
#${S}-br { padding: 0 16px; background: color-mix(in srgb, var(--cyan) 70%, var(--surface)); color: var(--canvas); font-weight: 700; }
#${S}-sbr { position: absolute; right: 20px; top: 0; display: flex; gap: 26px; }
#${S}-toast { position: absolute; right: ${MINI + 30}px; top: ${WH - TB - SB - toastH - 16}px; width: ${toastW}px; box-sizing: border-box; padding: 16px 0 14px;
  border-radius: 12px; background: color-mix(in srgb, var(--surface) 60%, var(--canvas)); border: 2px solid color-mix(in srgb, var(--cyan) 50%, transparent);
  box-shadow: 0 18px 50px color-mix(in srgb, var(--canvas) 80%, transparent); }
#${S}-toast .${S}-pl { font-size: 22px; }
#${S}-th b { display: inline-block; width: 12px; height: 12px; margin-right: 12px; border-radius: 50%; background: var(--cyan); }
#${S}-th { padding-left: 22px; height: 40px; font-size: 20px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cyan); }`;

  const dots = ["var(--warn)", "var(--gold)", "var(--cyan)"].map((c, i) => `<span class="${S}-tl" style="left: ${18 + i * 24}px; background: color-mix(in srgb, ${c} 75%, transparent)"></span>`).join("");
  const runLines = slots.run ? `
        <div class="${S}-pl" id="${S}-rl"><span class="${S}-pp">${esc(slots.project)} %</span> <span id="${S}-rc">${runChars.map((c) => `<span class="${S}-rk">${esc(c)}</span>`).join("")}</span></div>
${out.map((o, i) => `        <div class="${S}-pl${i === out.length - 1 ? ` ${S}-ok` : ""}" id="${S}-o${i}">${esc(o) || " "}</div>`).join("\n")}` : "";
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <div id="${S}-wb">
    <div id="${S}-tb">${dots}<div id="${S}-wt">${esc(slots.project)} — Visual Studio Code</div><div id="${S}-srch">Tìm kiếm</div></div>
    ${zen ? "" : `<div id="${S}-act"><div id="${S}-aibar"></div>${ACT.map((p, i) => `<div class="${S}-ai" id="${S}-ai${i}" style="top: ${20 + i * 58}px"><svg viewBox="0 0 24 24">${p}</svg></div>`).join("")}</div>
    <div id="${S}-side"><div class="${S}-sh">Explorer</div><div class="${S}-sh" style="color: var(--ink)">${esc(slots.project)}</div>
${files.map((f, i) => `      <div class="${S}-tr" id="${S}-tr${i}"><b></b>${esc(f)}</div>`).join("\n")}
    </div>`}
    <div id="${S}-ed">
      <div id="${S}-tabs">${files.slice(0, zen ? 3 : 2).map((f, i) => `<div class="${S}-tab" id="${S}-tab${i}">${esc(f)}</div>`).join("")}</div>
      <div id="${S}-crumb">${esc(slots.project)} › ${esc(slots.file)}</div>
      <div id="${S}-code">
        <div id="${S}-band"></div>
${lines.map(rowHtml).join("\n")}
        ${zen ? `<div id="${S}-mini"><div id="${S}-minv"></div><div id="${S}-minin">${mini}</div></div>` : ""}
      </div>
      ${!zen && slots.run ? `<div id="${S}-panel"><div id="${S}-ptabs"><span class="${S}-on">TERMINAL</span><span>PROBLEMS</span><span>OUTPUT</span></div>${runLines}
      </div>` : ""}
      ${zen && slots.run ? `<div id="${S}-toast"><div id="${S}-th"><b></b>Đang chạy</div>${runLines}
      </div>` : ""}
    </div>
    <div id="${S}-sb"><div id="${S}-sbl"><span id="${S}-br">main</span><span>0 lỗi</span></div><div id="${S}-sbr"><span id="${S}-pos">Dòng 1</span><span>UTF-8</span><span>${esc(lang)}</span></div></div>
  </div>
 </div>
</div>`;

  // ── timing ──────────────────────────────────────────────────────────────────
  const [c0, c1] = ctx.at("code");
  const tR0 = slots.run ? ctx.at("run") : null;
  const t0 = Math.max(c0, w.a + 0.5);
  const lim = Math.min(c1, w.b - 0.35, tR0 != null ? Math.max(t0 + 0.5, tR0 - 0.1) : Infinity);
  const room = Math.max(0.3, 0.65 * (lim - t0) - GAP_LINE * (n - 1));
  const d = Math.max(0.006, Math.min(0.035, room / N));
  let t = t0;
  m.push({ prim: "reveal", target: `#${S}-wb`, at: w.a + 0.05, dur: 0.55, from: zen ? { opacity: 0, scale: 0.97 } : { opacity: 0, y: 36 }, ease: ctx.ease });
  lines.forEach((_, i) => {
    const s = r3(t), dur = r3(len[i] * d);
    if (i > 0) m.push({ prim: "swap", target: `#${S}-band`, at: s, props: { y: i * LH } },
      { prim: "swap", target: `#${S}-pos`, at: s, props: { textContent: `Dòng ${i + 1}` } });
    if (len[i]) m.push({ prim: "type", target: `#${S}-L${i}`, chars: `.${S}-k${i}`, count: len[i], at: s, dur });
    t += len[i] * d + GAP_LINE;
  });
  const done = t - GAP_LINE;
  if (zen) m.push({ prim: "reveal", target: `#${S}-minin`, at: t0, dur: Math.max(0.3, done - t0), from: { opacity: 0, y: -8 }, ease: "none" });
  let end = done;
  if (slots.run) {
    const tR = Math.min(Math.max(tR0, done + 0.2), w.b - 0.9);
    const box = zen ? `#${S}-toast` : `#${S}-panel`;
    m.push({ prim: "reveal", target: box, at: tR, dur: 0.45, from: zen ? { opacity: 0, y: 30, scale: 0.96 } : { opacity: 0, y: PANEL }, ease: "power3.out" });
    const ts = tR + 0.35, td = r3(Math.max(0.15, Math.min(runChars.length * 0.03, w.b - ts - 0.5)));
    m.push({ prim: "type", target: `#${S}-rc`, chars: `.${S}-rk`, count: runChars.length, at: r3(ts), dur: td });
    out.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-o${i}`, at: r3(ts + td + 0.15 + i * 0.18), dur: 0.3, from: { opacity: 0, y: 8 } }));
    end = Math.max(end, ts + td + 0.45 + out.length * 0.18);
  }
  const dr = ctx.drift(`#${S}-grp`, Math.min(end + ctx.gap, w.b - 0.7), 6);
  if (dr) m.push(dr);
  return { css, html, motions: keepInside(m, w.b) };
}

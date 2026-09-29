// code-diff — a code change: kept lines (ctx), removed lines (del) and new lines (add), after the HyperFrames registry
// block "code-diff" (Apache-2.0). The editor chrome and the old code are on stage at the window start; new lines wait
// as dashed placeholders. On "del" the removed lines tint red, get a "-" and a strike drawn through them; on "add" the
// new lines slide in tinted cyan with a "+"; the optional note lands under the editor.
// unified: one editor, the lines in diff order, a "-n +m" tally in the title bar.
// split (signature): "Trước" on the left (ctx + del), "Sau" on the right (ctx + add), a gold arrow between them.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [
  ...(slots.lines.some((l) => l.kind === "del") ? ["del"] : []),
  ...(slots.lines.some((l) => l.kind === "add") ? ["add"] : []),
  ...(slots.note ? ["note"] : []),
];

const CHAR = 0.6; // JetBrains Mono advance, em

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const lines = slots.lines;
  const tDel = lines.some((l) => l.kind === "del") ? ctx.at("del") : null;
  const tAdd = lines.some((l) => l.kind === "add") ? ctx.at("add") : null;
  const tNote = slots.note ? ctx.at("note") : null;
  const split = ctx.variant === "split";
  const maxLen = Math.max(8, ...lines.map((l) => [...l.text].length));
  const m = [];

  // panels: [{ id, x, w, title, rows: [{ line, i }] }]
  const panels = split
    ? [
      { id: "pa", x: 0, w: 860, title: "Trước", rows: lines.map((l, i) => ({ l, i })).filter((r) => r.l.kind !== "add") },
      { id: "pb", x: 900, w: 860, title: "Sau", rows: lines.map((l, i) => ({ l, i })).filter((r) => r.l.kind !== "del") },
    ]
    : [{ id: "pa", x: 80, w: 1600, title: null, rows: lines.map((l, i) => ({ l, i })) }];
  const rowsMax = Math.max(...panels.map((p) => p.rows.length));
  const LH = rowsMax > 8 ? 48 : 54, BAR = 64, PAD = 22, GUT = 64, SIGN = 34;
  const textW = panels[0].w - 40 - GUT - SIGN - 30;
  const fs = Math.max(18, Math.min(split ? 26 : 30, Math.floor(textW / (maxLen * CHAR))));
  const winH = BAR + 2 * PAD + rowsMax * LH;
  const noteH = slots.note ? 110 : 0;
  const winY = Math.max(10, Math.round((820 - winH - noteH) / 2));

  const count = (k) => lines.filter((l) => l.kind === k).length;
  const tally = !split && (count("del") || count("add"))
    ? `<div id="${S}-tally">${count("del") ? `<span class="${S}-cd">-${count("del")}</span>` : ""}${count("add") ? `<span class="${S}-ca">+${count("add")}</span>` : ""}</div>` : "";

  const row = (p, r, k) => {
    const id = `${S}-${p.id}r${k}`;
    const kind = r.l.kind;
    const txtW = Math.round(Math.min(textW, [...r.l.text].length * fs * CHAR) + 8);
    return `      <div class="${S}-row ${S}-${kind}" id="${id}" style="top: ${PAD + k * LH}px">
        ${kind === "ctx" ? "" : `<div class="${S}-bg" id="${id}bg"></div>`}${kind === "add" ? `<div class="${S}-ph" id="${id}ph"></div>` : ""}
        <span class="${S}-ln">${k + 1}</span><span class="${S}-sg" id="${id}sg">${kind === "del" ? "-" : kind === "add" ? "+" : ""}</span><span class="${S}-tx" id="${id}tx"${kind === "del" ? " data-layout-allow-occlusion" : ""}>${esc(r.l.text) || " "}</span>
        ${kind === "del" ? `<div class="${S}-st" id="${id}st" data-layout-allow-occlusion style="width: ${txtW}px"></div>` : ""}
      </div>`;
  };
  const panel = (p) => `  <div class="${S}-win" id="${S}-${p.id}" style="left: ${p.x}px; width: ${p.w}px">
    <div class="${S}-bar"><span class="${S}-tl"></span><span class="${S}-tl"></span><span class="${S}-tl"></span>
      ${p.title ? `<span class="${S}-side">${p.title}</span>` : ""}<div class="${S}-ttl">${esc(slots.file)}</div>${p.id === "pa" ? tally : ""}</div>
    <div class="${S}-code">
${p.rows.map((r, k) => row(p, r, k)).join("\n")}
    </div>
  </div>`;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
.${S}-win { position: absolute; top: ${winY}px; height: ${winH}px; box-sizing: border-box; border-radius: ${R}px; overflow: hidden;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent);
  box-shadow: 0 28px 70px color-mix(in srgb, var(--canvas) 70%, transparent); }
.${S}-bar { position: absolute; left: 0; top: 0; right: 0; height: ${BAR}px; display: flex; align-items: center; gap: 14px; padding: 0 26px;
  background: color-mix(in srgb, var(--ink) 5%, var(--surface)); border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-tl { width: 16px; height: 16px; border-radius: 50%; background: color-mix(in srgb, var(--muted) 55%, transparent); flex: none; }
.${S}-ttl { margin-left: 18px; font-family: ${mono}; font-size: 26px; color: var(--muted); white-space: nowrap; overflow: hidden; }
.${S}-side { margin-left: 18px; font-size: 30px; font-weight: 800; color: var(--gold); white-space: nowrap; }
#${S}-tally { margin-left: auto; display: flex; gap: 18px; font-family: ${mono}; font-size: 26px; font-weight: 700; }
.${S}-cd { color: var(--warn); }
.${S}-ca { color: var(--cyan); }
.${S}-code { position: absolute; left: 0; right: 0; top: ${BAR}px; bottom: 0; }
.${S}-row { position: absolute; left: 0; right: 0; height: ${LH}px; line-height: ${LH}px; font-family: ${mono}; font-size: ${fs}px; }
.${S}-bg { position: absolute; inset: 2px 0; transform-origin: 0 50%; }
.${S}-del .${S}-bg { background: color-mix(in srgb, var(--warn) 16%, transparent); border-left: 5px solid var(--warn); }
.${S}-add .${S}-bg { background: color-mix(in srgb, var(--cyan) 16%, transparent); border-left: 5px solid var(--cyan); }
.${S}-ph { position: absolute; left: ${GUT + 20}px; right: 30px; top: 8px; bottom: 8px; border: 2px dashed color-mix(in srgb, var(--cyan) 40%, transparent);
  border-radius: 10px; }
.${S}-ln { position: absolute; top: 0; left: 0; width: ${GUT}px; text-align: right; color: var(--muted); }
.${S}-sg { position: absolute; top: 0; left: ${GUT + 20}px; width: ${SIGN}px; font-weight: 700; }
.${S}-del .${S}-sg { color: var(--warn); }
.${S}-add .${S}-sg { color: var(--cyan); }
.${S}-tx { position: absolute; top: 0; left: ${GUT + 20 + SIGN}px; right: 20px; overflow: hidden; white-space: pre; color: var(--ink); }
.${S}-st { position: absolute; left: ${GUT + 16 + SIGN}px; top: ${Math.round(LH / 2) - 2}px; height: 4px; border-radius: 2px; background: var(--warn); transform-origin: 0 50%; }
#${S}-arrow { position: absolute; left: 852px; top: ${winY + Math.round(winH / 2) - 28}px; width: 56px; height: 56px; border-radius: 50%;
  background: var(--gold); display: flex; align-items: center; justify-content: center; z-index: 2; }
#${S}-arrow svg { width: 30px; height: 30px; }
#${S}-note { position: absolute; left: 80px; top: ${winY + winH + 34}px; width: 1600px; text-align: center; }
#${S}-notei { display: inline-block; padding: 14px 34px; border-radius: 40px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--gold) 55%, transparent); font-size: 36px; font-weight: 700; color: var(--ink); white-space: nowrap; }`;

  const arrow = split ? `  <div id="${S}-arrow"><svg viewBox="0 0 30 30"><path d="M5 15 H24 M16 7 L24 15 L16 23" fill="none" stroke="var(--canvas)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>` : "";
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
${panels.map(panel).join("\n")}
${arrow}
  ${slots.note ? `<div id="${S}-note"><span id="${S}-notei">${esc(slots.note)}</span></div>` : ""}
 </div>
</div>`;

  // window chrome and the old code at the start
  panels.forEach((p, k) => {
    m.push({ prim: "reveal", target: `#${S}-${p.id}`, at: w.a + 0.05 + k * 0.12, dur: 0.5, from: split ? { opacity: 0, x: k ? 40 : -40 } : { opacity: 0, scale: 0.97 }, ease: ctx.ease });
    p.rows.forEach((r, j) => {
      const id = `${S}-${p.id}r${j}`;
      if (r.l.kind === "add") m.push({ prim: "reveal", target: `#${id}ph`, at: w.a + 0.25 + j * 0.04, dur: 0.3, from: { opacity: 0 } });
      else m.push({ prim: "reveal", target: `#${id}tx`, at: w.a + 0.2 + k * 0.12 + j * 0.04, dur: 0.3, from: { opacity: 0, x: -12 } });
    });
  });
  if (split) m.push({ prim: "reveal", target: `#${S}-arrow`, at: w.a + 0.3, dur: 0.45, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" });
  if (tally) m.push({ prim: "reveal", target: `#${S}-tally`, at: w.a + 0.35, dur: 0.4, from: { opacity: 0, x: 20 } });

  let end = w.a + 0.8;
  // removed lines: tint, sign, strike
  if (tDel != null) {
    const p = panels[0];
    p.rows.forEach((r, j) => {
      if (r.l.kind !== "del") return;
      const id = `${S}-${p.id}r${j}`;
      const at = tDel + 0.08 * p.rows.slice(0, j).filter((x) => x.l.kind === "del").length;
      m.push({ prim: "reveal", target: `#${id}bg`, at, dur: 0.35, from: { opacity: 0, scaleX: 0.3 }, ease: "power2.out" },
        { prim: "reveal", target: `#${id}sg`, at: at + 0.05, dur: 0.3, from: { opacity: 0, scale: 0.4 } },
        { prim: "reveal", target: `#${id}st`, at: at + 0.15, dur: 0.4, from: { scaleX: 0 }, ease: "power2.inOut" });
      end = Math.max(end, at + 0.55);
    });
  }
  // new lines: the placeholder gives way, the line slides in tinted
  if (tAdd != null) {
    const p = panels.at(-1);
    let k = 0;
    p.rows.forEach((r, j) => {
      if (r.l.kind !== "add") return;
      const id = `${S}-${p.id}r${j}`;
      const at = tAdd + 0.1 * k++;
      m.push({ prim: "reveal", target: `#${id}ph`, at, dur: 0.2, from: { opacity: 1 }, to: { opacity: 0 } },
        { prim: "reveal", target: `#${id}bg`, at, dur: 0.35, from: { opacity: 0, scaleX: 0.3 }, ease: "power2.out" },
        { prim: "reveal", target: `#${id}sg`, at: at + 0.05, dur: 0.3, from: { opacity: 0, scale: 0.4 } },
        { prim: "reveal", target: `#${id}tx`, at: at + 0.08, dur: 0.4, from: { opacity: 0, x: -40 }, ease: ctx.ease });
      end = Math.max(end, at + 0.5);
    });
  }
  if (tNote != null) {
    m.push({ prim: "reveal", target: `#${S}-note`, at: tNote, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    end = Math.max(end, tNote + 0.5);
  }
  const d = ctx.drift(`#${S}-grp`, Math.min(end + ctx.gap, w.b - 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

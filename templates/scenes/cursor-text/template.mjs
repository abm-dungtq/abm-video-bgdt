// cursor-text — a caret types a sentence, takes a word back and writes the right one, after the HyperFrames registry
// block "vfx-text-cursor" (heygen-com/hyperframes, Apache-2.0). The block's WebGL light sweep becomes a CSS light band
// that passes over the line while the correction is typed; the caret, the typing and the edit are real text.
// The caret blinks at the start of the empty line from the window start; `lead` + `draft` type in, hold, the draft goes
// and `fix` (+ `tail`) types in its place on its keyword; the note follows.
// retype (signature): large type on the open stage; the draft is backspaced letter by letter.
// select: a document card with a small toolbar; the draft is selected (gold highlight) and replaced in one go.

import { keepInside } from "../_shared/dna-card.mjs";
import { caretChars, caretCss, caretMotions } from "../_shared/caret.mjs";

export const revealKeys = (slots) => ["lead", "fix", ...(slots.note ? ["note"] : [])];

const len = (s) => [...s.normalize("NFC")].length;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const sel = ctx.variant === "select";
  const lead = slots.lead.normalize("NFC");
  const draft = slots.draft.normalize("NFC");
  const fix = slots.fix.normalize("NFC");
  const tail = slots.tail ? slots.tail.normalize("NFC") : "";
  // the lead ends where the edit starts: keep one space between them
  const leadText = /\s$/.test(lead) ? lead : `${lead} `;
  const tailText = tail && !/^[\s,.;:!?…]/.test(tail) ? ` ${tail}` : tail;
  const nL = len(leadText), nD = len(draft), nF = len(fix), nT = len(tailText);
  const total = nL + nF + nT;
  const fs = sel ? (total > 70 ? 50 : 60) : total > 70 ? 60 : total > 44 ? 70 : 84;

  // ── timing ────────────────────────────────────────────────────────────────────
  const tS = Math.max(w.a + 0.35, Math.min(ctx.at("lead"), w.b - 3));
  const bstep = 0.035, hold = 0.3;
  const delDur = sel ? 0.6 : nD * bstep;
  const fixWant = ctx.at("fix");
  const room = Math.max(0.3, fixWant - hold - delDur - tS);
  const step = Math.max(0.02, Math.min(0.06, room / (nL + nD)));
  const draftDone = tS + (nL + nD) * step;
  const fstepMin = 0.02;
  let tFix = Math.max(fixWant, draftDone + hold + delDur);
  const noteRoom = slots.note ? 0.8 : 0; // the note needs to be on screen for a second before the shot ends
  tFix = Math.min(tFix, w.b - 0.3 - noteRoom - (nF + nT) * fstepMin);
  const fstep = Math.max(fstepMin, Math.min(0.06, (w.b - 0.5 - noteRoom - tFix) / (nF + nT)));
  const tDel = tFix - delDur;
  const typedEnd = tFix + (nF + nT) * fstep;
  const fitT = (t, dur) => Math.max(w.a, Math.min(t, w.b - dur - 0.05));

  // ── html ──────────────────────────────────────────────────────────────────────
  const chars = (text, cls, idp) => caretChars(text, { S, esc, cls: `${S}-${cls}`, idp: `${S}-${idp}` });
  // the struck draft is one unbreakable run set over the start of the fix: when lead + it would run past the box, the edit starts a new line
  const box = sel ? { x: 120, y: 150, w: 1520, h: 520 } : { x: 180, y: 170, w: 1400, h: 480 };
  const brk = !sel && (nL + Math.max(nD, nF + nT)) * fs * 0.56 > box.w;
  const text = `<div id="${S}-txt"><i class="${S}-cr" id="${S}-c0"></i>${chars(leadText, "l", "l")}<span id="${S}-fx"><span id="${S}-dr">${sel ? `<span id="${S}-sel"></span>` : ""}${chars(draft, "d", "d")}</span>${chars(fix, "f", "f")}${chars(tailText, "t", "t")}</span></div>`;
  const note = slots.note ? `<div id="${S}-note"><span id="${S}-nbar"></span><span>${esc(slots.note)}</span></div>` : "";
  const TOOL = ["B", "I", "U"].map((c, i) => `<span class="${S}-tb" style="${i === 1 ? "font-style: italic;" : i === 2 ? "text-decoration: underline;" : ""}">${c}</span>`).join("");
  // centre the finished text in the open stage (an estimate: 0.56 em per letter of the bold body face)
  const perLine = (c) => Math.ceil((c * fs * 0.56) / box.w);
  const estLines = brk ? Math.max(1, perLine(nL) + perLine(Math.max(nD, nF + nT))) : Math.max(1, perLine(Math.max(nL + nD, total)));
  const txtTop = sel ? 130 : Math.max(20, Math.round((box.h - 60 - estLines * fs * 1.3) / 2));
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-doc { position: absolute; left: ${box.x}px; top: ${box.y}px; width: ${box.w}px; height: ${box.h}px; box-sizing: border-box;${sel ? `
  border-radius: ${R}px; background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent);
  box-shadow: 0 30px 70px color-mix(in srgb, var(--canvas) 70%, transparent);` : ""} }
#${S}-tools { position: absolute; left: 0; right: 0; top: 0; height: 74px; display: flex; align-items: center; gap: 12px; padding: 0 34px;
  border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-tb { width: 46px; height: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800;
  color: var(--muted); background: color-mix(in srgb, var(--ink) 6%, transparent); }
#${S}-dots { margin-left: auto; display: flex; gap: 10px; }
#${S}-dots span { width: 14px; height: 14px; border-radius: 50%; background: color-mix(in srgb, var(--muted) 55%, transparent); }
#${S}-txt { position: absolute; left: ${sel ? 70 : 0}px; right: ${sel ? 70 : 0}px; top: ${txtTop}px; font-size: ${fs}px; font-weight: 800;
  line-height: 1.3; color: var(--ink); }
#${S}-fx { position: relative;${brk ? " display: block;" : ""} }
#${S}-dr { position: absolute; left: 0; top: 0; white-space: nowrap; color: color-mix(in srgb, var(--ink) 88%, var(--warn)); }
#${S}-sel { position: absolute; left: -4px; right: -4px; top: 0.06em; bottom: 0.02em; border-radius: 6px; background: color-mix(in srgb, var(--gold) 34%, transparent);
  transform-origin: 0 50%; }
.${S}-f { color: var(--gold); }
${caretCss(S, { color: "var(--gold)", w: 0.07 })}
#${S}-c0 { position: absolute; left: -0.02em; right: auto; top: 0.16em; opacity: 1; }
#${S}-rule { position: absolute; left: ${sel ? 70 : 0}px; bottom: ${sel ? 56 : 30}px; width: ${sel ? box.w - 140 : box.w}px; height: 4px; border-radius: 2px;
  background: color-mix(in srgb, var(--gold) 45%, transparent); transform-origin: 0 50%; }
#${S}-sweep { position: absolute; left: -260px; top: 0; width: 240px; height: 100%;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--cyan) 22%, transparent), transparent); }
#${S}-clip { position: absolute; inset: 0; overflow: hidden; border-radius: ${sel ? R : 0}px; }
#${S}-note { position: absolute; left: ${box.x + (sel ? 70 : 0)}px; top: ${box.y + box.h + 30}px; width: ${box.w - (sel ? 140 : 0)}px; display: flex; align-items: center; gap: 22px;
  font-size: 40px; font-weight: 600; line-height: 1.2; color: var(--muted); }
#${S}-nbar { width: 10px; height: 52px; border-radius: 5px; background: var(--cyan); flex: none; }`;
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <div id="${S}-doc">
    ${sel ? `<div id="${S}-tools">${TOOL}<div id="${S}-dots"><span></span><span></span><span></span></div></div>` : ""}
    <div id="${S}-clip" data-layout-ignore><div id="${S}-sweep"></div></div>
    ${text}
    <div id="${S}-rule"></div>
  </div>
  ${note}
 </div>
</div>`;

  // ── motion ────────────────────────────────────────────────────────────────────
  const m = [];
  m.push({ prim: "reveal", target: `#${S}-doc`, at: w.a + 0.05, dur: 0.5, from: sel ? { opacity: 0, y: 30 } : { opacity: 0 }, ease: ctx.ease },
    { prim: "reveal", target: `#${S}-rule`, at: w.a + 0.1, dur: 0.7, from: { scaleX: 0 }, ease: "power2.out" });
  const events = [];
  const show = (ids, start, st) => ids.forEach((id, k) => {
    const at = start + k * st;
    m.push({ prim: "swap", target: `#${S}-${id}`, at, props: { opacity: 1 } });
    events.push({ t: at, id: `${S}-${id}c` });
  });
  const ids = (p, n) => Array.from({ length: n }, (_, k) => `${p}${k}`);
  show(ids("l", nL), tS, step);
  show(ids("d", nD), tS + nL * step, step);
  if (sel) {
    events.push({ t: tDel, id: null });
    m.push({ prim: "reveal", target: `#${S}-sel`, at: tDel, dur: 0.35, from: { scaleX: 0 }, ease: "power2.out" },
      { prim: "swap", target: `#${S}-dr`, at: tFix, props: { opacity: 0 } });
    events.push({ t: tFix, id: `${S}-l${nL - 1}c` });
  } else {
    // backspace: each press hides the last letter and puts the caret after the one before it
    for (let j = 0; j < nD; j++) {
      const at = tDel + j * bstep;
      m.push({ prim: "swap", target: `#${S}-d${nD - 1 - j}`, at, props: { opacity: 0 } });
      events.push({ t: at, id: nD - 2 - j >= 0 ? `${S}-d${nD - 2 - j}c` : `${S}-l${nL - 1}c` });
    }
  }
  const fStart = tFix + 0.05;
  show([...ids("f", nF), ...ids("t", nT)], fStart, fstep);
  m.push(...caretMotions(events, w.b, { initial: `${S}-c0` }));
  // the light band passes while the correction types
  const sweepAt = fitT(tFix, 0.9);
  m.push({ prim: "slide", target: `#${S}-sweep`, at: sweepAt, dur: 0.9, from: { x: 0 }, to: { x: box.w + 520 }, ease: "power1.inOut" });
  let end = typedEnd;
  if (slots.note) {
    const at = fitT(Math.max(ctx.at("note"), typedEnd + 0.15), 1);
    m.push({ prim: "reveal", target: `#${S}-note`, at, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    end = Math.max(end, at + 0.5);
  }
  const d = ctx.drift(`#${S}-grp`, Math.min(end + 0.3, w.b - 0.7), 8);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

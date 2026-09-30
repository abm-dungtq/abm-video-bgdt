// chat-exchange — a question and answer with a chatbot, after the HyperFrames registry blocks "chatgpt-exchange" and
// "claude-exchange" (heygen-com/hyperframes, Apache-2.0). Only the chat layout is kept: no logo or brand mark of any
// product, the display name comes from a slot and every colour from the theme.
// The chat window rises in with its header (bot name), an empty thread and a composer bar. While a bot turn is still
// to come, a three-dot "typing" bubble waits in its place; on its keyword the turn appears (the dots give way to it).
// chatgpt: user turns are pills on the right, bot turns are free text on the left beside a round avatar (accent: cyan).
// claude (signature): every turn on the left; user turns sit in a bordered card, bot turns are plain text under a
//   gold spark mark (accent: gold).

import { keepInside, lines } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => slots.turns.map((_, i) => `turns.${i}`);

const r2 = (x) => Math.round(x * 100) / 100;
const key = (x) => String(x).normalize("NFC").trim().toLocaleLowerCase("vi");

// A directed lesson (lint) must say who speaks: the assistant's turns carry the bot name in who, every other label is the
// user's. Without a match the renderer falls back to alternating user, bot, ..., which puts a second user line on the bot side.
export function slotIssues(slots) {
  const bot = slots.turns.filter((x) => key(x.who) === key(slots.name)).length;
  if (bot === 0) return [`turns: no turn has who "${slots.name}" (the name in the header), so the sides are guessed by alternation: give the assistant's turns who "${slots.name}" and the user's turns their own label`];
  if (bot === slots.turns.length) return [`turns: every turn has who "${slots.name}": give the user's turn its own label (any other who is the user's)`];
  return [];
}

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const claude = ctx.variant === "claude";
  const accent = claude ? "var(--gold)" : "var(--cyan)";
  const turns = slots.turns;
  // a turn is the bot's when its speaker label is the bot name; if no label matches, the turns alternate user, bot, …
  const named = turns.some((x) => key(x.who) === key(slots.name));
  const isAi = turns.map((x, i) => (named ? key(x.who) === key(slots.name) : i % 2 === 1));
  const t = turns.map((_, i) => ctx.at(`turns.${i}`));

  // geometry (stage px): the window, its header and composer, and the thread between them
  const WX = 152, WY = 8, WW = 1456, WH = 804, HEAD = 64, FOOT = 90;
  const threadH = WH - HEAD - FOOT - 24;
  const textW = claude ? 1240 : 1160; // bot text column
  const userW = claude ? 1240 : 1000; // widest user bubble
  // the biggest font at which the estimated thread height fits
  const est = (f) => turns.reduce((h, x, i) => {
    const user = !isAi[i];
    const ln = lines(x.text, f, (user ? userW : textW) - (user ? 64 : 0));
    return h + ln * Math.round(f * 1.4) + (user ? 32 : 4) + 30 + 18;
  }, 0);
  const fs = [44, 40, 36, 32, 29, 26].find((f) => est(f) <= threadH) ?? 26;
  const lh = Math.round(fs * 1.4);

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-win { position: absolute; left: ${WX}px; top: ${WY}px; width: ${WW}px; height: ${WH}px; box-sizing: border-box; overflow: hidden;
  border-radius: ${R + 6}px; background: color-mix(in srgb, var(--canvas) 55%, var(--surface));
  border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); box-shadow: 0 30px 70px color-mix(in srgb, black 50%, transparent); }
#${S}-head { position: absolute; left: 0; right: 0; top: 0; height: ${HEAD}px; box-sizing: border-box; padding: 0 32px; display: flex; align-items: center; gap: 16px;
  border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-av { flex: none; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: ${accent}; background: color-mix(in srgb, ${accent} 16%, transparent); }
.${S}-av svg { width: 26px; height: 26px; display: block; }
#${S}-name { font-size: 30px; font-weight: 800; color: var(--ink); white-space: nowrap; }
#${S}-live { margin-left: auto; width: 14px; height: 14px; border-radius: 50%; background: ${accent}; }
#${S}-thread { position: absolute; left: 0; right: 0; top: ${HEAD}px; height: ${WH - HEAD - FOOT}px; box-sizing: border-box; padding: 18px 48px 6px;
  display: flex; flex-direction: column; gap: 18px; overflow: hidden; }
.${S}-row { position: relative; display: flex; align-items: flex-start; gap: 18px; flex: none; }
.${S}-row.user { justify-content: ${claude ? "flex-start" : "flex-end"}; }
.${S}-msg { font-size: ${fs}px; line-height: ${lh}px; font-weight: 500; color: var(--ink); overflow-wrap: anywhere; }
.${S}-col { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.${S}-row.user .${S}-col { align-items: ${claude ? "flex-start" : "flex-end"}; }
.${S}-who { font-size: 22px; line-height: 30px; font-weight: 700; color: var(--muted); white-space: nowrap; }
.${S}-row.ai .${S}-msg { max-width: ${textW}px; padding-top: 0; }
.${S}-row.user .${S}-msg { box-sizing: border-box; max-width: ${userW}px; padding: 12px 32px; ${claude
    ? `border-radius: ${R}px; background: color-mix(in srgb, var(--ink) 7%, var(--surface)); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent);`
    : `border-radius: ${Math.round(R * 1.6)}px; background: color-mix(in srgb, ${accent} 20%, var(--surface));`} }
.${S}-dots { opacity: 0; position: absolute; left: 62px; top: 34px; display: flex; gap: 10px; align-items: center; height: ${lh}px; }
.${S}-dots i { width: 12px; height: 12px; border-radius: 50%; background: color-mix(in srgb, var(--muted) 80%, transparent); }
#${S}-comp { position: absolute; left: 48px; right: 48px; bottom: 18px; height: 60px; border-radius: 30px; box-sizing: border-box; padding: 0 12px 0 28px;
  display: flex; align-items: center; justify-content: space-between; background: color-mix(in srgb, var(--ink) 6%, var(--surface));
  border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); }
#${S}-bar { width: 220px; height: 12px; border-radius: 6px; background: color-mix(in srgb, var(--ink) 14%, transparent); }
#${S}-send { width: 44px; height: 44px; border-radius: 50%; background: ${accent}; color: var(--canvas); display: flex; align-items: center; justify-content: center; }
#${S}-send svg { width: 24px; height: 24px; display: block; }`;

  const rows = turns.map((x, i) => {
    const ai = isAi[i];
    const mark = ai ? `<div class="${S}-av" id="${S}-a${i}">${ctx.icon(claude ? "spark" : "chat")}</div>` : "";
    const dots = ai ? `<div class="${S}-dots" id="${S}-d${i}"><i></i><i></i><i></i></div>` : "";
    return `    <div class="${S}-row ${ai ? "ai" : "user"}" id="${S}-r${i}">${mark}<div class="${S}-col" id="${S}-c${i}"><div class="${S}-who" id="${S}-w${i}">${esc(x.who)}</div><div class="${S}-msg" id="${S}-m${i}">${esc(x.text)}</div></div>${dots}</div>`;
  }).join("\n");

  const html = `<div id="${S}-root">
  <div id="${S}-win">
    <div id="${S}-head"><div class="${S}-av">${ctx.icon(claude ? "spark" : "chat")}</div><div id="${S}-name">${esc(slots.name)}</div><div id="${S}-live"></div></div>
    <div id="${S}-thread">
${rows}
    </div>
    <div id="${S}-comp"><div id="${S}-bar"></div><div id="${S}-send">${ctx.icon("arrow")}</div></div>
  </div>
</div>`;

  const m = [
    { prim: "reveal", target: `#${S}-win`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0, y: 50, scale: 0.96 }, ease: "power3.out" },
    { prim: "reveal", target: `#${S}-name`, at: w.a + 0.3, dur: 0.4, from: { opacity: 0, x: -16 }, ease: ctx.ease },
  ];
  let end = w.a + 0.9;
  turns.forEach((x, i) => {
    const ai = isAi[i];
    const at = r2(t[i]);
    if (ai) {
      // the typing dots wait for this turn from the end of the previous one (or the window start)
      const ds = r2(Math.max(w.a + 0.55, i ? t[i - 1] + 0.4 : 0));
      const dotted = at - ds >= 0.5;
      m.push({ prim: "reveal", target: `#${S}-a${i}`, at: dotted ? ds : at, dur: 0.35, from: { opacity: 0, scale: 0.6 }, ease: "back.out(2)" });
      if (dotted) {
        m.push({ prim: "reveal", target: `#${S}-d${i}`, at: ds, dur: 0.3, from: { opacity: 0, y: 8 } },
          { prim: "reveal", target: `#${S}-d${i}`, at: r2(at - 0.05), dur: 0.2, from: { opacity: 1 }, to: { opacity: 0 } });
      }
    }
    m.push({ prim: "reveal", target: `#${S}-c${i}`, at, dur: 0.5, from: ai ? { opacity: 0, y: 18 } : { opacity: 0, x: claude ? -30 : 40, y: 10 }, ease: ctx.ease });
    end = Math.max(end, at + 0.6);
  });
  const d = ctx.drift(`#${S}-thread`, Math.min(end + 0.1, w.b - 0.7), 6);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

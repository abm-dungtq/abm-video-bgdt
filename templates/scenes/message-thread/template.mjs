// message-thread — a multi-turn exchange between two parties, after the HyperFrames registry block
// "message-thread-reveal" (heygen-com/hyperframes, Apache-2.0). Only the thread layout is kept: no logo or brand mark
// of any messenger; the names come from the slots and every colour from the theme.
// The thread window rises in with the contact's name in its header. Before a message from the contact arrives, a
// three-dot "typing" pill waits in its place; on its keyword the message appears (the dots give way to it) under the
// sender's name.
// bubbles: received messages on the left in a soft bubble beside a round avatar, sent messages on the right in an accent bubble.
// feed (signature): every message on the left as a row of avatar, sender name and text (a team-chat channel); the
//   sender's name takes the accent colour when the message is sent rather than received.

import { keepInside, lines } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => slots.turns.map((_, i) => `turns.${i}`);

const r2 = (x) => Math.round(x * 100) / 100;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const feed = ctx.variant === "feed";
  const turns = slots.turns;
  const t = turns.map((_, i) => ctx.at(`turns.${i}`));
  // a message is received when its sender is the contact; if no sender matches, the turns alternate received, sent, …
  const key = (x) => String(x).normalize("NFC").trim().toLocaleLowerCase("vi");
  const named = turns.some((x) => key(x.who) === key(slots.contact));
  const recv = turns.map((x, i) => (named ? key(x.who) === key(slots.contact) : i % 2 === 0));

  // geometry (stage px)
  const WX = 152, WY = 8, WW = 1456, WH = 804, HEAD = 64;
  const AV = feed ? 60 : 52; // avatar size
  const threadH = WH - HEAD - 34;
  const boxW = feed ? 1220 : 980; // widest text block
  const est = (f) => turns.reduce((h, x, i) => {
    const bubble = !feed;
    return h + lines(x.text, f, boxW - (bubble ? 64 : 0)) * Math.round(f * 1.4) + (bubble ? 28 : 6) + 34 + 18;
  }, 0);
  const fs = [40, 36, 32, 29, 26, 24].find((f) => est(f) <= threadH) ?? 24;
  const lh = Math.round(fs * 1.4);

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-win { position: absolute; left: ${WX}px; top: ${WY}px; width: ${WW}px; height: ${WH}px; box-sizing: border-box; overflow: hidden;
  border-radius: ${R + 6}px; background: color-mix(in srgb, var(--canvas) 55%, var(--surface));
  border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); box-shadow: 0 30px 70px color-mix(in srgb, black 50%, transparent); }
#${S}-head { position: absolute; left: 0; right: 0; top: 0; height: ${HEAD}px; box-sizing: border-box; padding: 0 32px; display: flex; align-items: center; justify-content: center; gap: 14px;
  border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-cname { font-size: 30px; font-weight: 800; color: var(--ink); white-space: nowrap; }
#${S}-cdot { width: 14px; height: 14px; border-radius: 50%; background: var(--cyan); }
#${S}-thread { position: absolute; left: 0; right: 0; top: ${HEAD}px; height: ${WH - HEAD}px; box-sizing: border-box; padding: 20px 56px 14px;
  display: flex; flex-direction: column; gap: 18px; overflow: hidden; }
.${S}-row { position: relative; display: flex; align-items: flex-start; gap: 18px; flex: none; }
.${S}-row.sent { ${feed ? "" : "justify-content: flex-end;"} }
.${S}-av { flex: none; width: ${AV}px; height: ${AV}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: ${feed ? 4 : 34}px;
  font-size: ${feed ? 30 : 26}px; font-weight: 800; color: var(--canvas); background: var(--cyan); }
.${S}-row.sent .${S}-av { background: var(--gold); }
.${S}-col { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.${S}-row.sent .${S}-col { align-items: ${feed ? "flex-start" : "flex-end"}; }
.${S}-who { font-size: ${feed ? 26 : 22}px; line-height: 30px; font-weight: 700; color: ${feed ? "var(--cyan)" : "var(--muted)"}; white-space: nowrap; }
.${S}-row.sent .${S}-who { ${feed ? "color: var(--gold);" : ""} }
.${S}-msg { box-sizing: border-box; font-size: ${fs}px; line-height: ${lh}px; font-weight: 500; overflow-wrap: anywhere; max-width: ${boxW}px; color: var(--ink);
  ${feed ? "" : `padding: 12px 32px; border-radius: ${Math.round(R * 1.6)}px; background: color-mix(in srgb, var(--ink) 10%, var(--surface));`} }
.${S}-row.recv .${S}-msg { ${feed ? "" : "border-bottom-left-radius: 8px;"} }
.${S}-row.sent .${S}-msg { ${feed ? "" : `border-bottom-right-radius: 8px; background: var(--cyan); color: var(--canvas); font-weight: 600;`} }
.${S}-dots { position: absolute; left: ${AV + 18}px; top: 38px; display: flex; gap: 10px; align-items: center; height: ${feed ? lh : 52}px; ${feed ? "" : `padding: 0 26px;
  border-radius: ${Math.round(R * 1.6)}px; border-bottom-left-radius: 8px; background: color-mix(in srgb, var(--ink) 10%, var(--surface));`} }
.${S}-dots i { width: 12px; height: 12px; border-radius: 50%; background: color-mix(in srgb, var(--muted) 85%, transparent); }`;

  const initial = (n) => [...String(n).trim()][0] ?? "";
  const rows = turns.map((x, i) => {
    const r = recv[i];
    const av = (r || feed) ? `<div class="${S}-av" id="${S}-a${i}" aria-hidden="true">${esc(initial(x.who).toLocaleUpperCase("vi"))}</div>` : "";
    const dots = r ? `<div class="${S}-dots" id="${S}-d${i}"><i></i><i></i><i></i></div>` : "";
    return `    <div class="${S}-row ${r ? "recv" : "sent"}" id="${S}-r${i}">${av}<div class="${S}-col" id="${S}-c${i}"><div class="${S}-who" id="${S}-w${i}">${esc(x.who)}</div><div class="${S}-msg" id="${S}-m${i}">${esc(x.text)}</div></div>${dots}</div>`;
  }).join("\n");

  const html = `<div id="${S}-root">
  <div id="${S}-win">
    <div id="${S}-head"><div id="${S}-cdot"></div><div id="${S}-cname">${esc(slots.contact)}</div></div>
    <div id="${S}-thread">
${rows}
    </div>
  </div>
</div>`;

  const m = [
    { prim: "reveal", target: `#${S}-win`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0, y: 50, scale: 0.96 }, ease: "power3.out" },
    { prim: "reveal", target: `#${S}-cname`, at: w.a + 0.3, dur: 0.4, from: { opacity: 0, y: -10 }, ease: ctx.ease },
  ];
  let end = w.a + 0.9;
  turns.forEach((_, i) => {
    const r = recv[i];
    const at = r2(t[i]);
    let avAt = at;
    if (r) {
      // the typing dots wait for this message from the end of the previous one (or the window start)
      const ds = r2(Math.max(w.a + 0.55, i ? t[i - 1] + 0.4 : 0));
      if (at - ds >= 0.5) {
        avAt = ds;
        m.push({ prim: "reveal", target: `#${S}-d${i}`, at: ds, dur: 0.3, from: { opacity: 0, y: 8 } },
          { prim: "reveal", target: `#${S}-d${i}`, at: r2(at - 0.05), dur: 0.2, from: { opacity: 1 }, to: { opacity: 0 } });
      }
    }
    if (r || feed) m.push({ prim: "reveal", target: `#${S}-a${i}`, at: avAt, dur: 0.35, from: { opacity: 0, scale: 0.6 }, ease: "back.out(2)" });
    m.push({ prim: "reveal", target: `#${S}-c${i}`, at, dur: 0.5, from: r ? { opacity: 0, x: -34 } : { opacity: 0, x: feed ? -34 : 44 }, ease: ctx.ease });
    end = Math.max(end, at + 0.6);
  });
  const d = ctx.drift(`#${S}-thread`, Math.min(end + 0.1, w.b - 0.7), 6);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}

---
version: 1
name: Sứ giả — Hermes Agent lesson (frame layer)
description: >
  Dark "messenger" look for a Vietnamese e-learning explainer. Midnight-indigo canvas, one gold
  voltage (the courier trail), cyan for ready/ok, coral only for warnings in chapter 7. Be Vietnam Pro
  for all text, JetBrains Mono for terminal/code and kickers. This file supersedes the code-editorial
  remix (backup: .probe/frame.remix-backup.md).
unit: the frame — 1920×1080
principle: one idea per shot · reveal on the spoken cue · the gold trail connects everything

colors:
  canvas: "#0B1026"
  surface: "#141B3A"
  ink: "#F4F1E8"
  gold: "#FFD23F"
  cyan: "#3EE6D0"
  warn: "#FF6B6B"
  muted: "#8E93B5"

typography:
  display: { fontFamily: "Be Vietnam Pro", px: 96, weight: 800, lineHeight: 1.05, tracking: "-0.02em" }
  headline: { fontFamily: "Be Vietnam Pro", px: 64, weight: 800, lineHeight: 1.1, tracking: "-0.015em" }
  number: { fontFamily: "Be Vietnam Pro", px: 200, weight: 800, lineHeight: 1.0, tracking: "-0.03em" }
  card-title: { fontFamily: "Be Vietnam Pro", px: 40, weight: 600, lineHeight: 1.2 }
  body: { fontFamily: "Be Vietnam Pro", px: 34, weight: 500, lineHeight: 1.4 }
  kicker: { fontFamily: "JetBrains Mono", px: 24, weight: 400, tracking: "0.16em", upper: true }
  code: { fontFamily: "JetBrains Mono", px: 30, weight: 400, lineHeight: 1.55 }
---

# Sứ giả — frame design truth (READ ALL)

## Canvas and layout

- Canvas 1920×1080, ground `canvas #0B1026`. Each frame's ground is its own full-duration
  background clip (not the `#root`). It has a soft radial glow: `radial-gradient(ellipse at 70% 30%,
  hsla(H, 70%, 45%, 0.28), transparent 60%)` over the canvas, where **H = 230 + 12 × chapter**
  (ch0 = 230, ch1 = 242 … ch7 = 314). Frames in the same chapter share H. Nothing else shifts per chapter.
- **Safe area: every element stays inside x 80–1840, y 60–880.** The top 10 px carries the
  progress bar and the top-left 40–520 × 14–50 px the chapter label (overlay layer); the bottom
  162 px (y ≥ 918) is the karaoke band. Never place content there.
- One hero element per shot. Content sits on an asymmetric grid (60/40, or centred for single
  words and numbers). Generous negative space; never more than ~5 text items on screen at once.

## Color roles

- **ink `#F4F1E8`** — all text and line work by default.
- **gold `#FFD23F`** — the single voltage: the courier trail, the hero keyword of the moment,
  progress ticks, active states. At most one gold focus per shot.
- **cyan `#3EE6D0`** — ready/ok/connected states, secondary connectors, terminal prompt `$`.
- **warn `#FF6B6B`** — blocked/danger only, and **only in chapter 7** (frames 58–63).
- **surface `#141B3A`** — cards, panels, terminal windows; border `1px solid rgba(244,241,232,.12)`,
  radius 14–18 px, optional shadow `0 20px 60px rgba(0,0,0,.35)`.
- **muted `#8E93B5`** — secondary labels, captions inside cards, inactive items.
- Glows are allowed on gold elements (`filter: drop-shadow(0 0 12px rgba(255,210,63,.55))`).

## Type

- Be Vietnam Pro only at weights **500 / 600 / 800** (the files shipped); JetBrains Mono 400.
- Display and headlines: sentence case, weight 800, tight tracking. Kickers: JetBrains Mono
  uppercase, 0.16em, muted or gold, prefixed with a small gold `◆`.
- Minimum on-screen text size 28 px. Vietnamese diacritics need line-height ≥ 1.05 on display.
- On-screen words come from the frame's voiceover/keywords, the fact sheet
  (`capture/extracted/visible-text.txt`) or real terminal captures (`capture/terminal/*.txt`).
  Never invent commands, numbers or product claims.

## Signature motifs

- **Courier trail** — a 4–5 px gold SVG stroke that draws on (`stroke-dashoffset`) to connect
  ideas: node to node, step to step, underline under a keyword. A small winged spark (gold dot +
  two ink wing curves) may ride its head. Use it at least once per chapter inside frames.
- **Analyze rail (chapter 6)** — a slim rail of three slots "Tính năng · Vì sao nổi bật · Bạn được gì";
  the active slot turns gold.
- **Terminal window** — surface panel, three dots (muted), title in mono, prompt `$` in cyan,
  text typed on with a steady cursor; only real commands/output.

## Motion

- One paused GSAP timeline per frame, seek-safe. Reveals land on the spoken cue (the frame's `cues`
  bullet gives aligned word times in seconds, frame-relative). Nothing appears before it is said.
- Eases: `power3.out` for entrances (0.4–0.7 s), `power2.inOut` for moves, `none` for draw-ons
  tied to speech. No bounce/elastic. After the last reveal, hold still (a subtle 1–2 % drift at most).
- Every shot change inside a frame must visibly change the composition (new layout, scale or
  subject) — this is what keeps the lesson from feeling static.

## Font loading

Paste this `<style>` inside every frame's `<template>`:

```html
<style>
@font-face{font-family:"Be Vietnam Pro";font-weight:800;font-style:normal;font-display:block;src:url("assets/fonts/BeVietnamPro-ExtraBold.ttf") format("truetype");}
@font-face{font-family:"Be Vietnam Pro";font-weight:500;font-style:normal;font-display:block;src:url("assets/fonts/BeVietnamPro-Medium.ttf") format("truetype");}
@font-face{font-family:"Be Vietnam Pro";font-weight:600;font-style:normal;font-display:block;src:url("assets/fonts/BeVietnamPro-SemiBold.ttf") format("truetype");}
@font-face{font-family:"JetBrains Mono";font-weight:400;font-style:normal;font-display:block;src:url("assets/fonts/JetBrainsMono-Regular.ttf") format("truetype");}
</style>
```

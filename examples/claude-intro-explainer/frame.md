---
version: 1
name: Tia lửa — Claude lesson (frame layer)
description: >
  Warm dark look for a Vietnamese e-learning lesson about Claude, chosen by the user on 2026-09-25
  in place of the Hermes "Sứ giả" look.
  - Palette: a warm charcoal canvas with cream text. Terracotta is the single accent; sage marks
    ok/connected states; red appears only for warnings.
  - Type: Lora 700 (serif) for display and titles, Be Vietnam Pro for everything else, JetBrains
    Mono for terminal and kickers.
  - It matches the dark claude.ai screenshots and uses no logos.
unit: the frame — 1920×1080
principle: one idea per shot · reveal on the spoken cue · a small spark links the ideas

colors:
  canvas: "#1F1E1D"
  surface: "#2A2926"
  ink: "#F0EEE6"
  accent: "#D97757"   # CSS var --gold in the skeleton (legacy name) = terracotta
  sage: "#8FB8A8"     # CSS var --cyan in the skeleton (legacy name)
  warn: "#E5484D"
  muted: "#9A968C"

typography:
  display: { fontFamily: "Lora", px: 96, weight: 700, lineHeight: 1.08, tracking: "-0.01em" }
  headline: { fontFamily: "Lora", px: 64, weight: 700, lineHeight: 1.12 }
  number: { fontFamily: "Lora", px: 200, weight: 700, lineHeight: 1.0, tracking: "-0.02em" }
  card-title: { fontFamily: "Be Vietnam Pro", px: 40, weight: 600, lineHeight: 1.2 }
  body: { fontFamily: "Be Vietnam Pro", px: 34, weight: 500, lineHeight: 1.4 }
  kicker: { fontFamily: "JetBrains Mono", px: 24, weight: 400, tracking: "0.14em", upper: true }
  code: { fontFamily: "JetBrains Mono", px: 30, weight: 400, lineHeight: 1.55 }
---

# Tia lửa — frame design truth (READ ALL)

## Canvas and layout

- **Canvas and ground.** The canvas is 1920×1080 with ground `#1F1E1D`. Each frame's ground is its
  own full-duration clip (the skeleton gives it). The ground carries a faint warm radial glow,
  `hsla(H, 55%, 42%, 0.20)`, where **H = 22 + 3 × chapter**, so the whole lesson stays in the warm
  band. Frames in the same chapter share H.
- **Safe area: every element stays inside x 80–1840, y 60–880.**
  - The top 10 px belong to the progress bar.
  - x 40–520, y 14–50 belongs to the chapter label (overlay layer).
  - y ≥ 918 is the karaoke band.
  - Nothing may enter these areas.
- **Composition.**
  - One hero element per shot, on an asymmetric grid (60/40, or centred for a single word or number).
  - Keep negative space generous, like a calm notebook page.
  - Never show more than about 5 text items at once.

## Color roles

- **Cream `#F0EEE6`:** all text and line work.
- **Terracotta `#D97757` (`--gold`):**
  - the single accent: the spark motif, the hero keyword of the moment, active states, underlines;
  - at most one terracotta focus per shot;
  - a soft glow is allowed: `drop-shadow(0 0 10px rgba(217,119,87,.45))`.
- **Sage `#8FB8A8` (`--cyan`):** ok, connected and ready states, the terminal prompt `$`, secondary connectors.
- **Red `#E5484D` (`--warn`):** danger only, in frame 41 (lệnh ẩn) and chapter 7 (frames 74–79).
- **Surface `#2A2926`:** cards, panels, terminal windows and screenshot viewports.
  - Border `1px solid rgba(240,238,230,.10)`, radius 16 px, shadow `0 18px 50px rgba(0,0,0,.35)`.
- **Muted `#9A968C`:** secondary labels, captions inside cards, inactive items.

## Type

- **Lora 700** for display text, headlines, big numbers and chapter titles.
  - Use sentence case, and a little italic flavour through weight contrast only (Lora italic is not shipped).
- **Be Vietnam Pro** at weights 500, 600 and 800 for labels, card text and body.
- **JetBrains Mono 400** for terminal text and kickers.
  - Kickers are uppercase, 0.14em, muted, and prefixed with a small terracotta ✳.
- **Size and spacing.** Minimum on-screen text is 28 px. Vietnamese diacritics need a display line-height of at least 1.05.
- **Text sources.** On-screen words come from the frame's keywords and voiceover, the fact sheet
  (`capture/extracted/visible-text.txt`), real terminal captures (`capture/terminal/*.txt`) or
  approved screenshots. Never invent commands, numbers or UI.

## Signature motifs

- **The spark ✳.** A small eight-ray terracotta asterisk, drawn as an SVG, about 28–44 px.
  - It marks the idea being spoken: it pops (scale 0 → 1, a 20° twist) next to a keyword on its cue.
  - It can travel along a hand-drawn path to connect two ideas.
  - Use it at least once per chapter. It is a generic asterisk shape, not a logo.
- **The hand-drawn stroke.** A 3–4 px terracotta SVG line with slightly uneven curvature, drawn on
  with `stroke-dashoffset`. Use it for underlines, circles around a word, and arrows between cards.
- **Paper cards.** Content sits on surface cards with a subtle top highlight
  `inset 0 1px 0 rgba(240,238,230,.06)`.
- **Terminal window.**
  - A surface panel with three muted dots and a mono title.
  - The `$` prompt is sage. Text types on with a steady cursor.
  - Show only real commands and output.

## Analyze rail (chapters 5–6)

- **What it is.** Frame 44 builds it. Every later ch5 and ch6 content frame except title, anchor
  and recap frames 56 and 72 keeps it small at the top.
- **Placement.** A single row at y 64–108, starting at x 560 and about 1100 px wide, so it clears
  the chapter label at x 40–520.
- **Slots.**
  - Three pills, each 340×44 with radius 22, on the surface colour with a 1 px border at
    rgba(240,238,230,.12).
  - They are separated by 24 px gaps holding a thin terracotta connector line.
  - Pill text is Be Vietnam Pro 600, 26 px, muted: `Tính năng`, `Vì sao nổi bật`, `Bạn được gì`.
  - Each label is preceded by a round number badge, a 26 px circle with a 1.5 px border holding the digit 1, 2 or 3 in Be Vietnam Pro 600 at 16 px.
  - The shipped fonts have no ①②③ glyphs, so never type those characters.
- **Active state.** The active pill gets a terracotta border and cream text, and its ✳ pops.
  - A frame lights each slot on the cue given in its storyboard `rail:` bullet, for example
    `rail: ①@0.3 · ②@4.8 · ③@9.1`, with a 0.3 s tween.
  - A slot stays lit once reached.
- **Frame 44** builds the rail large (centred, y ~ 400) and then moves it up into its resting place by the end of the frame.
- **Main content** in rail frames starts at y ≥ 140.

## Real screenshots (`screen` shots)

- **Files and viewport.** Approved claude.ai screenshots live in `assets/screens/`, named by frame
  number (for example `13-home-chat.png`). They are 1920×1080 in the dark UI and already
  redacted with solid boxes. Show them in a surface viewport (radius 16 px), 1456×819 by default.
- **Motion.** Animate a wrapper: reveal, then a pan or zoom with **scale ≤ 1.4**, then a terracotta
  callout on the cue, then a crop zoom. The full rules are in `worker-screen-addendum.md`.
- **Pixels.** Never alter pixels inside a screenshot.
- **"Minh họa" mocks** carry a visible `MINH HỌA` kicker (JetBrains Mono 28 px, muted).

## Motion

- **Timeline.** One paused GSAP timeline per frame, seek-safe. Reveals land on the spoken cue (the
  frame's `cues` bullet, frame-relative seconds). Nothing appears before it is said.
- **Eases.** `power3.out` for entrances (0.4–0.7 s), `power2.inOut` for moves, `none` for draw-ons
  tied to speech. No bounce or elastic. After the last reveal, hold still (a 1–2 % drift at most).
- **Shot changes.** Every shot change inside a frame must visibly change the composition: a new
  layout, a new scale or a new subject.
- **Render cost.** No CSS 3D (`perspective`, `rotateX/Y`) and no heavy `filter` chains, because the
  render is about 26 000 frames. Glows are limited to one `drop-shadow` per element.

## Glyph rule

The shipped fonts (Lora, Be Vietnam Pro, JetBrains Mono) have **no** ①②③, ✳, ✕, ✓ or → glyphs. Draw
the spark, crosses, ticks and arrows as inline SVG, and number badges as styled spans with plain
digits. Never type those characters as text, or the render falls back to a system font.

## Font loading

Paste this `<style>` inside every frame's `<template>`. `tools/frame-skeleton.html` already has it.

```html
<style>
@font-face{font-family:"Lora";font-weight:400 700;font-style:normal;font-display:block;src:url("assets/fonts/Lora-Variable.ttf") format("truetype");}
@font-face{font-family:"Be Vietnam Pro";font-weight:800;font-style:normal;font-display:block;src:url("assets/fonts/BeVietnamPro-ExtraBold.ttf") format("truetype");}
@font-face{font-family:"Be Vietnam Pro";font-weight:500;font-style:normal;font-display:block;src:url("assets/fonts/BeVietnamPro-Medium.ttf") format("truetype");}
@font-face{font-family:"Be Vietnam Pro";font-weight:600;font-style:normal;font-display:block;src:url("assets/fonts/BeVietnamPro-SemiBold.ttf") format("truetype");}
@font-face{font-family:"JetBrains Mono";font-weight:400;font-style:normal;font-display:block;src:url("assets/fonts/JetBrainsMono-Regular.ttf") format("truetype");}
</style>
```

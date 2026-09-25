#!/usr/bin/env node
// build-design-kit.mjs — everything the design step and the frame workers read, from video.config.json:
//   capture/extracted/tokens.json   palette (with role hints) + fonts for faceless-explainer build-frame.mjs
//   tools/worker-brief.md           filled from tools/worker-kit/worker-brief.md.tmpl
//   tools/worker-delta-<pin>.md     filled from tools/worker-kit/worker-delta-<pin>.md.tmpl
//   tools/frame-skeleton.html       filled from tools/worker-kit/frame-skeleton.html.tmpl
// Run whenever the title, palette or CLI pin changes, and always before dispatching frame workers.
//
//   node tools/build-design-kit.mjs

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cfg, ROOT } from "./lib/config.mjs";

const d = cfg.design;

// tokens.json: colorStats only tells build-frame which colour plays which role
// (canvas = largest background, surface = panels, ink = text, accents = small highlights).
const role = (hex, areaBg, bgCount, textCount) => ({ hex, areaBg, maxArea: areaBg * 2, bgCount, textCount, interactiveBg: 0, count: bgCount + textCount });
const tokens = {
  title: cfg.title,
  description: cfg.message,
  colors: [d.canvas, d.surface, d.ink, d.accent, d.accent2, d.warn],
  colorStats: [
    role(d.canvas, 1000000, 60, 0),
    role(d.surface, 400000, 40, 0),
    role(d.ink, 0, 0, 200),
    role(d.accent, 2000, 10, 40),
    role(d.accent2, 1000, 5, 20),
    role(d.warn, 0, 0, 3),
  ],
  fonts: cfg.fonts,
};
mkdirSync("capture/extracted", { recursive: true });
writeFileSync("capture/extracted/tokens.json", JSON.stringify(tokens, null, 2) + "\n");

const vars = {
  PROJECT_DIR: ROOT,
  TITLE: cfg.title,
  PIN: cfg.cli.pin,
  GSAP: cfg.gsap,
  CANVAS: d.canvas, SURFACE: d.surface, INK: d.ink, ACCENT: d.accent,
  ACCENT2: d.accent2, WARN: d.warn, MUTED: d.muted,
  HUE_BASE: d.hueBase, HUE_STEP: d.hueStep, HUE_CH1: d.hueBase + d.hueStep,
};
const fill = (s) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (!(k in vars)) throw new Error(`unknown placeholder ${m}`);
  return String(vars[k]);
});

const kit = [
  ["worker-brief.md.tmpl", "worker-brief.md"],
  [`worker-delta-${cfg.cli.pin}.md.tmpl`, `worker-delta-${cfg.cli.pin}.md`],
  ["frame-skeleton.html.tmpl", "frame-skeleton.html"],
];
for (const [tmpl, out] of kit) {
  const src = `tools/worker-kit/${tmpl}`;
  if (!existsSync(src)) {
    console.error(`✗ ${src} missing. A new CLI pin needs its own delta: run tools/fixture-check.mjs, then write the delta from its lint output.`);
    process.exit(1);
  }
  writeFileSync(`tools/${out}`, fill(readFileSync(src, "utf8")));
}
console.log(`design kit: capture/extracted/tokens.json, ${kit.map(([, o]) => `tools/${o}`).join(", ")}`);

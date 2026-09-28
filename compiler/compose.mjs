// compose.mjs — one frame = the shared skeleton (tools/frame-skeleton.html, from build-design-kit) + one
// .PFX-layer per shot. Layer i > 0 fades in at its window start; a layer followed by another fades out 0.3 s
// before its window ends. The emitter writes the whole timeline, so compiled and hand GSAP never mix.

import { emit } from "./emitter-0.7.99.mjs";

/** a shot must move within this many seconds of its window start, or the stage sits empty */
export const MAX_IDLE = 0.5;

const fail = (msg) => { throw new Error(`compose: ${msg}`); };
const FADE = 0.3;

/**
 * @param skeleton  text of tools/frame-skeleton.html
 * @param frame     { id: composition id, no: frame number, duration, hue, pfx }
 * @param shots     [{ css, html, motions, window: { a, b } }]
 * @param opts      { missingGlyphs: string, fadeOutLast: boolean }
 */
export function compose(skeleton, frame, shots, { missingGlyphs = "", fadeOutLast = false } = {}) {
  const { id, duration, hue, pfx: P } = frame;
  const layers = shots.map((s, i) => `      <div class="${P}-layer" id="${P}-L${i + 1}">\n${s.html}\n      </div>`).join("\n");
  const css = [`#${P}-stage .${P}-layer { position: absolute; inset: 0; }`,
    ...shots.slice(1).map((_, i) => `#${P}-L${i + 2} { opacity: 0; }`),
    ...shots.map((s) => s.css)].join("\n");
  shots.forEach((s, i) => {
    const first = Math.min(...s.motions.map((m) => m.at));
    if (!s.motions.length || first - s.window.a > MAX_IDLE) {
      fail(`shot ${i + 1} shows nothing until ${s.motions.length ? first : "its end"} s (window starts at ${s.window.a} s): the template must bring its structure in at the window start`);
    }
  });
  const motions = shots.flatMap((s, i) => {
    const layer = `#${P}-L${i + 1}`;
    const m = [...s.motions];
    if (i > 0) m.push({ prim: "reveal", target: layer, at: s.window.a, dur: FADE, from: { opacity: 0 }, ease: "power1.out" });
    if (i < shots.length - 1 || (fadeOutLast && i === shots.length - 1)) {
      m.push({ prim: "layerOut", target: layer, at: Math.max(s.window.a + FADE, s.window.b - FADE), dur: FADE });
    }
    return m;
  });
  const base = skeleton.replaceAll("FRAME_ID", id).replaceAll("PFX", P).replaceAll("DURATION", String(duration)).replaceAll("HUE", String(hue));
  let html = base
    .replace(/\/\* frame-specific styles below[^*]*\*\//, (c) => `${c}\n${css}`)
    .replace(/<!-- shots go here[^>]*-->/, () => layers);
  if (html === base) fail("skeleton markers not found (rebuild it: node tools/build-design-kit.mjs)");
  const body = html.replace(/<script>[\s\S]*<\/script>/, "");
  const script = emit(motions, { frameId: id, duration, html: body, css });
  html = html.replace(/<script>\s*\(function \(\) \{[\s\S]*?\}\)\(\);\s*<\/script>/, () => `<script>\n${script}\n  </script>`);

  // 0.7.99 content rules the emitter cannot see
  const visible = html.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, v] of visible.matchAll(/\sid="([^"]+)"/g)) if (v !== "root" && !v.startsWith(`${P}-`)) fail(`id "${v}" must start with ${P}-`);
  if (/<br\s*\/?>/i.test(visible)) fail("<br> is not allowed in frame text");
  const bad = [...missingGlyphs].filter((g) => visible.includes(g));
  if (bad.length) fail(`glyphs the fonts lack: ${bad.join(" ")} (draw them as SVG)`);
  return html;
}

// zones.mjs — the 12 layout pieces and the DNA card box, in #PFX-stage coordinates (x 0–1760, y 0–820),
// taken from templates/worker-kit/worker-layouts.md.tmpl. Templates place content inside the zone of their variant.

export const STAGE = { w: 1760, h: 820 };
const box = (x0, x1, y0, y1) => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });

export const ZONES = {
  "hero-center": box(380, 1380, 160, 660),
  "split-50": { a: box(0, 860, 0, 820), b: box(900, 1760, 0, 820) },
  "split-60-40": { a: box(0, 1040, 0, 820), b: box(1080, 1760, 0, 820) },
  "split-40-60": { a: box(0, 680, 0, 820), b: box(720, 1760, 0, 820) },
  triptych: { a: box(0, 560, 0, 820), b: box(600, 1160, 0, 820), c: box(1200, 1760, 0, 820) },
  "strip-top": { strip: box(0, 1760, 0, 220), body: box(0, 1760, 260, 820) },
  ring: { cx: 880, cy: 410, r: 330, ...box(550, 1210, 80, 740) },
  "sidebar-left": { side: box(0, 480, 0, 820), content: box(520, 1760, 0, 820) },
  "screen-focus": box(152, 1608, 0, 819),
  "screen-steps": { screen: box(0, 1180, 78, 742), steps: box(1220, 1760, 78, 742) },
  "lower-third": { main: box(0, 1760, 0, 820), band: box(0, 1200, 600, 780) },
  "full-bleed-quote": box(120, 1640, 180, 640),
};

export const CARD = box(160, 1600, 60, 760);

const isBox = (b) => ["x", "y", "w", "h"].every((k) => typeof b[k] === "number");
/** Every box (and sub-box) lies inside the stage. */
export function inside(b) {
  if (isBox(b) && (b.x < 0 || b.y < 0 || b.x + b.w > STAGE.w || b.y + b.h > STAGE.h)) return false;
  return Object.values(b).every((v) => typeof v !== "object" || inside(v));
}

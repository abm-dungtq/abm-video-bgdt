// emitter-0.7.99.mjs — motion primitives → the GSAP timeline script of one frame, for HyperFrames 0.7.99.
// Templates never write GSAP; they return primitives and this file turns them into code that follows the
// 0.7.99 rules. A rule violation throws at compile time ("emit: …"), so a compiled frame cannot break lint or seeking.
//
// Rules enforced here (contracts C4):
//   only transform / opacity / filter / attr / strokeDashoffset / textContent props are tweened;
//   initial states are gsap.set() before the timeline; every fromTo has immediateRender:false and fresh vars;
//   no two tweens on one target+prop overlap; every tween ends inside the frame; a full-span anchor ends the timeline;
//   every target exists in the html; no tl.set at 0 (initial hides use gsap.set); no CSS transform on an element
//   whose transform is tweened; no Math.random / Date.now / setTimeout / requestAnimationFrame / repeat:-1.

export const ALLOWED = ["x", "y", "xPercent", "yPercent", "scale", "scaleX", "scaleY", "rotation", "opacity", "autoAlpha", "filter",
  "attr", "strokeDashoffset", "textContent"];
const TRANSFORM = ["x", "y", "xPercent", "yPercent", "scale", "scaleX", "scaleY", "rotation"];
const EPS = 1e-6;
/** the gap between two tweens that follow each other on one target+prop (touching counts as overlap in 0.7.99 lint) */
export const GAP = 0.02;
const fail = (msg) => { throw new Error(`emit: ${msg}`); };
const r3 = (x) => Math.round(x * 1000) / 1000;
const js = (v) => JSON.stringify(v);

/** the value a "from" prop lands on when a reveal gives no explicit "to" */
const rest = (k) => (k === "opacity" || k.startsWith("scale") ? 1 : k === "filter" ? "blur(0px)" : 0);

/** Normalize one primitive into tweens: { target, from, to, at, dur, ease, extra, kind } */
function tweens(m) {
  const at = Number(m.at ?? fail(`${m.prim} on ${m.target} has no "at"`));
  switch (m.prim) {
    case "reveal": {
      const from = m.from ?? { opacity: 0, y: 24 };
      const to = m.to ?? Object.fromEntries(Object.keys(from).map((k) => [k, rest(k)]));
      return [{ target: m.target, from, to, at, dur: m.dur ?? 0.5, ease: m.ease ?? "power3.out" }];
    }
    case "slide": {
      const bad = Object.keys({ ...m.from, ...m.to }).filter((k) => !TRANSFORM.includes(k));
      if (bad.length) fail(`slide on ${m.target} may only move transform props, not ${bad.join(", ")}`);
      return [{ target: m.target, from: m.from ?? {}, to: m.to ?? fail(`slide on ${m.target} has no "to"`), at, dur: m.dur ?? 0.6, ease: m.ease ?? "power3.inOut" }];
    }
    case "draw":
      return [{ target: m.target, from: { strokeDashoffset: 1000 }, to: { strokeDashoffset: 0 }, at, dur: m.dur ?? 0.8, ease: m.ease ?? "power2.inOut" }];
    case "count":
      if (!Number.isInteger(m.to)) fail(`count on ${m.target} needs an integer "to"`);
      return [{ target: m.target, from: { textContent: 0 }, to: { textContent: m.to }, extra: { snap: { textContent: 1 } }, at, dur: m.dur ?? 1, ease: m.ease ?? "power1.out" }];
    case "swap":
      return [{ target: m.target, set: true, from: {}, to: m.props ?? fail(`swap on ${m.target} has no "props"`), at, dur: 0 }];
    case "dim":
      return (m.targets ?? fail("dim has no targets")).map((t) => ({ target: t, from: { opacity: 1 }, to: { opacity: m.to ?? 0.35 }, at, dur: 0.3, ease: "power2.out", noInit: true }));
    case "orbit": {
      const pts = m.points ?? fail(`orbit on ${m.target} has no points`);
      if (pts.length < 2) fail(`orbit on ${m.target} needs at least 2 points`);
      const d = (m.dur ?? fail(`orbit on ${m.target} has no "dur"`)) / (pts.length - 1);
      return pts.slice(1).map(([x, y], i) => ({ target: m.target, from: { x: pts[i][0], y: pts[i][1] }, to: { x, y }, at: at + i * d, dur: d - GAP, ease: "none", noInit: i > 0 }));
    }
    case "type": {
      const n = m.count ?? fail(`type on ${m.target} needs "count" (number of character spans)`);
      const d = (m.dur ?? 1) / n;
      const sel = m.chars ?? fail(`type on ${m.target} needs "chars" (the character span class)`);
      return [{ target: sel, from: { opacity: 0 }, to: { opacity: 1 }, at, dur: m.dur ?? 1, typeOf: { n, d } }];
    }
    case "pulse": {
      const dur = m.dur ?? fail(`pulse on ${m.target} has no "dur"`);
      const cycles = Math.max(1, Math.floor(dur / 1.2));
      const half = dur / cycles / 2;
      return Array.from({ length: cycles * 2 }, (_, i) => ({ target: m.target, from: { scale: i % 2 ? 1.04 : 1 }, to: { scale: i % 2 ? 1 : 1.04 },
        at: at + i * half, dur: half - GAP, ease: "sine.inOut", noInit: true }));
    }
    case "layerOut":
      return [{ target: m.target, from: { opacity: 1 }, to: { opacity: 0 }, at, dur: m.dur ?? 0.4, ease: "power2.in", noInit: true }];
    default:
      return fail(`unknown primitive "${m.prim}"`);
  }
}

function targetExists(sel, html) {
  const parts = sel.trim().split(/\s+/);
  for (const p of parts) {
    const m = p.match(/^([#.])([\w-]+)$/) ?? fail(`selector "${sel}" must be #id / .class tokens separated by spaces`);
    const re = m[1] === "#" ? new RegExp(`id="${m[2]}"`) : new RegExp(`class="[^"]*(?<![\\w-])${m[2]}(?![\\w-])[^"]*"`);
    if (!re.test(html)) fail(`target ${p} (in "${sel}") not found in the frame html`);
  }
}

/** last selector token of every CSS rule that sets `transform` */
const cssTransformed = (css) => new Set([...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^}]*)\}/g)]
  .filter(([, , body]) => /(^|[;\s])transform\s*:/.test(body))
  .flatMap(([, sel]) => sel.split(",").map((s) => s.trim().split(/\s+/).at(-1))));

/** opacity → autoAlpha when a tween starts or ends fully transparent (visibility follows, so hidden text is really hidden) */
function hidden(t) {
  if (t.set || !t.from || !t.to || !("opacity" in t.to)) return t;
  if (t.from.opacity !== 0 && t.to.opacity !== 0) return t;
  const swap = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k === "opacity" ? "autoAlpha" : k, v]));
  return { ...t, from: swap(t.from), to: swap(t.to) };
}

export function emit(motions, { frameId, duration, html, css = "" }) {
  const all = motions.flatMap(tweens).map((t) => hidden({ ...t, at: r3(t.at), dur: r3(t.dur) }));
  const transformed = cssTransformed(css);
  for (const t of all) {
    targetExists(t.target, html);
    if (t.set && t.at <= EPS) fail(`swap on ${t.target} at 0: set initial states with the tween's "from" instead (tl.set at 0 does not render)`);
    const last = t.target.trim().split(/\s+/).at(-1);
    if (transformed.has(last) && Object.keys(t.to).some((k) => TRANSFORM.includes(k))) {
      fail(`${t.target} has a CSS transform and a transform tween; move the CSS transform to a wrapper`);
    }
    for (const k of Object.keys({ ...t.from, ...t.to })) if (!ALLOWED.includes(k)) fail(`prop "${k}" on ${t.target} is not allowed (allowed: ${ALLOWED.join(" ")})`);
    if (t.at < -EPS) fail(`${t.target} starts at ${t.at} s, before 0`);
    if (t.at + t.dur > duration + 0.01) fail(`${t.target} ends at ${r3(t.at + t.dur)} s, after the frame (${duration} s)`);
  }
  // no two tweens on one target and prop overlap in time
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (a.target !== b.target) continue;
      const shared = Object.keys(a.to).filter((k) => k in b.to);
      if (!shared.length) continue;
      const overlap = a.dur === 0 || b.dur === 0
        ? (a.dur === 0 ? a.at > b.at + EPS && a.at < b.at + b.dur - EPS : b.at > a.at + EPS && b.at < a.at + a.dur - EPS)
        : a.at < b.at + b.dur + EPS && b.at < a.at + a.dur + EPS;
      if (overlap) fail(`${a.target} ${shared.join("/")} tweens overlap (${a.at}+${a.dur} and ${b.at}+${b.dur})`);
    }
  }
  // initial state = the "from" of each target's earliest tween
  const inits = new Map();
  for (const t of [...all].sort((a, b) => a.at - b.at)) {
    if (t.set || t.noInit || inits.has(t.target)) continue;
    inits.set(t.target, t.from);
  }
  const lines = [];
  for (const [target, from] of inits) if (Object.keys(from).length) lines.push(`gsap.set(${js(target)}, ${js(from)});`);
  lines.push("var tl = gsap.timeline({ paused: true });");
  for (const t of all) {
    if (t.set) lines.push(`tl.set(${js(t.target)}, ${js(t.to)}, ${t.at});`);
    else if (t.typeOf) {
      lines.push(`document.querySelectorAll(${js(t.target)}).forEach(function (c, i) { tl.set(c, { opacity: 1 }, ${t.at} + i * ${r3(t.typeOf.d)}); });`);
    } else {
      lines.push(`tl.fromTo(${js(t.target)}, ${js({ ...t.from })}, ${js({ ...t.to, ...(t.extra ?? {}), duration: t.dur, ease: t.ease, immediateRender: false })}, ${t.at});`);
    }
  }
  lines.push(`tl.to({}, { duration: ${duration} }, 0);`);
  lines.push(`window.__timelines = window.__timelines || {};`);
  lines.push(`window.__timelines[${js(frameId)}] = tl;`);
  const out = `(function () {\n  ${lines.join("\n  ")}\n})();`;
  for (const bad of ["Math.random", "Date.now", "setTimeout", "requestAnimationFrame", "repeat:-1", "repeat: -1", '"repeat":-1']) {
    if (out.includes(bad)) fail(`output contains ${bad}`);
  }
  return out;
}

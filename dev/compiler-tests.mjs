#!/usr/bin/env node
// compiler-tests.mjs — unit tests of the scene compiler: schema subset, cue grammar on a real aligned voice, emitter rules.
//
//   node dev/compiler-tests.mjs [--source <delivered project with script.json + audio_meta.json>]

import { readFileSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import { validate } from "../compiler/schema.mjs";
import { frameCtx, resolve, resolveRange } from "../compiler/cues.mjs";
import { emit } from "../compiler/emitter-0.7.99.mjs";
import { compose } from "../compiler/compose.mjs";
import { numbers } from "../compiler/solver.mjs";
import { isVietnamese, readNumeric } from "../scripts/lib/spoken.mjs";

const argv = process.argv.slice(2);
const SRC = resolvePath(argv.includes("--source") ? argv[argv.indexOf("--source") + 1]
  : process.env.ABM_REGRESS_SOURCE ?? "D:/TQD/Claude-Video/videos/hermes-agent-explainer");
let n = 0, ok = 0;
function test(name, fn) {
  n++;
  try { fn(); ok++; console.log(`pass ${name}`); } catch (e) { console.log(`FAIL ${name}: ${e.message}`); }
}
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg ?? ""} got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); };
const near = (a, b) => { if (Math.abs(a - b) > 0.01) throw new Error(`got ${a}, want ${b} ± 0.01`); };
const throws = (fn, re) => {
  try { fn(); } catch (e) { if (!re.test(e.message)) throw new Error(`threw "${e.message}", want ${re}`); return; }
  throw new Error("did not throw");
};

// schema
test("schema required", () => eq(validate({ type: "object", required: ["a"] }, {}), ["$.a: required"]));
test("schema maxLength", () => eq(validate({ type: "string", maxLength: 3 }, "tiếng"), ["$: longer than 3"]));
test("schema enum", () => eq(validate({ enum: ["x", "y"] }, "z"), ["$: must be one of x, y"]));
test("schema items", () => eq(validate({ type: "array", items: { type: "integer" } }, [1, "2"]), ["$[1]: expected integer, got string"]));
test("schema additionalProperties", () => eq(validate({ type: "object", properties: { a: {} }, additionalProperties: false }, { a: 1, b: 2 }), ["$.b: not allowed"]));
test("schema pattern", () => eq(validate({ type: "string", pattern: "^[a-z]+$" }, "Abc"), ["$: does not match ^[a-z]+$"]));

// cues on Hermes frame 8 (aligned voice)
const read = (f) => JSON.parse(readFileSync(join(SRC, f), "utf8"));
const script = read("script.json"), meta = read("audio_meta.json");
const ctx = frameCtx(8, script, meta, 16.415);
test("cue kw:vòng = 2.06", () => near(resolve("kw:vòng", ctx), 2.06));
test("cue kw:lặp = 2.22", () => near(resolve("kw:lặp", ctx), 2.22));
test("cue kw:suy = 4.21", () => near(resolve("kw:suy", ctx), 4.21));
test("cue sent:1.start", () => near(resolve("sent:1.start", ctx), 0.31));
test("cue prev.end+0.5", () => near(resolve("prev.end+0.5", ctx, 3), 3.5));
test("cue range kw:suy..kw:hành", () => eq(resolveRange("kw:suy..kw:hành", ctx), [4.21, 6.75]));
test("cue unknown keyword throws", () => throws(() => resolve("kw:không-có", ctx), /^cue: kw:không-có/));

// emitter rules
const html = '<div id="f01-s1-a"></div><div id="f01-s1-b" class="f01-s1-x"></div>';
const opts = { frameId: "01-t", duration: 5, html };
test("emit rejects a disallowed prop", () => throws(() => emit([{ prim: "reveal", target: "#f01-s1-a", at: 1, from: { left: 0 } }], opts), /not allowed/));
test("emit rejects a tween past the frame", () => throws(() => emit([{ prim: "reveal", target: "#f01-s1-a", at: 4.8, dur: 0.5 }], opts), /after the frame/));
test("emit rejects overlapping tweens", () => throws(() => emit([
  { prim: "reveal", target: "#f01-s1-a", at: 1, dur: 1 },
  { prim: "slide", target: "#f01-s1-a", at: 1.5, from: { y: 0 }, to: { y: 10 } },
], opts), /overlap/));
test("emit rejects touching tweens (end == start)", () => throws(() => emit([
  { prim: "reveal", target: "#f01-s1-a", at: 1, dur: 1 },
  { prim: "slide", target: "#f01-s1-a", at: 2, from: { y: 0 }, to: { y: 10 } },
], opts), /overlap/));
test("compose rejects a shot that stays empty", () => throws(() => compose(
  '<template><style>/* frame-specific styles below */</style><div id="root"><!-- shots go here --></div><script>(function () { })();</script></template>',
  { id: "01-t", no: 1, duration: 5, hue: 230, pfx: "f01" },
  [{ css: "", html: '<div id="f01-s1-a"></div>', motions: [{ prim: "reveal", target: "#f01-s1-a", at: 2 }], window: { a: 0, b: 5 } }],
), /shows nothing until 2/));
test("emit rejects a missing target", () => throws(() => emit([{ prim: "reveal", target: "#f01-s1-zz", at: 1 }], opts), /not found/));
test("emit rejects tl.set at 0", () => throws(() => emit([{ prim: "swap", target: "#f01-s1-a", at: 0, props: { opacity: 1 } }], opts), /at 0/));
test("emit rejects a CSS transform on a tweened element", () => throws(() => emit([{ prim: "reveal", target: "#f01-s1-a", at: 1 }],
  { ...opts, css: "#f01-s1-a { transform: translateX(10px); }" }), /CSS transform/));
test("emit rejects forbidden APIs", () => throws(() => emit([{ prim: "swap", target: "#f01-s1-a", at: 1, props: { attr: { "data-x": "Math.random" } } }], opts), /Math\.random/));
test("emit valid output", () => {
  const out = emit([
    { prim: "reveal", target: "#f01-s1-a", at: 1 },
    { prim: "count", target: ".f01-s1-x", at: 2, to: 64 },
    { prim: "layerOut", target: "#f01-s1-a", at: 4, dur: 0.4 },
  ], opts);
  for (const s of ["immediateRender\":false", "window.__timelines = window.__timelines || {};", 'window.__timelines["01-t"] = tl;',
    'gsap.set("#f01-s1-a", {"autoAlpha":0,"y":24});', "tl.to({}, { duration: 5 }, 0);"]) {
    if (!out.includes(s)) throw new Error(`missing ${s}`);
  }
  if (/tl\.set\([^)]*, 0\)/.test(out)) throw new Error("tl.set at 0 in output");
});
test("emit type shows each character with autoAlpha (the initial state hides visibility too)", () => {
  const out = emit([{ prim: "type", target: "#f01-s1-a", chars: ".f01-s1-x", count: 1, at: 1, dur: 1 }], opts);
  if (!out.includes('gsap.set(".f01-s1-x", {"autoAlpha":0});')) throw new Error("initial state is not autoAlpha 0");
  if (!out.includes("tl.set(c, { autoAlpha: 1 }")) throw new Error("characters are revealed with opacity only");
});

// spoken forms and the solver's counters
test("digits are spoken in Vietnamese", () => eq(["10", "2026", "64.000", "7.75", "1001", "21"].map(readNumeric),
  ["mười", "hai nghìn không trăm hai mươi sáu", "sáu mươi tư nghìn", "bảy chấm bảy mươi lăm", "một nghìn không trăm linh một", "hai mươi mốt"]));
test("foreign words and acronyms are not Vietnamese", () => eq(["Lark", "Base", "AI", "Kanban", "chương", "nghiêng", "Thanh", "khuya"].map(isVietnamese),
  [false, false, false, false, true, true, true, true]));
const numCtx = (text) => {
  const toks = text.split(" ");
  return { tokens: toks.map((d) => ({ display: d, norm: d.toLowerCase().replace(/[.,!?;:…"“”()'‘’]/g, ""), sent: 1 })),
    times: toks.map((_, i) => ({ start: i * 0.3 })) };
};
test("counters: a version, a date and a year are not counters", () => eq(
  numbers(numCtx("Bản 7.75 tháng 8/2026 năm 2026 có 10 hàm và 64.000 dòng")).map((x) => x.value), [10, 64000]));
test("counters: a spoken year is not a counter", () => eq(
  numbers(numCtx("tháng tám năm hai nghìn không trăm hai mươi sáu có hơn hai mươi nền tảng")).map((x) => `${x.value}${x.suffix}`), ["20+"]));

console.log(ok === n ? `compiler-tests ok (${ok}/${n})` : `compiler-tests FAILED (${ok}/${n})`);
process.exit(ok === n ? 0 : 1);

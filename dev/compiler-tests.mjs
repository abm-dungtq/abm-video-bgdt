#!/usr/bin/env node
// compiler-tests.mjs — unit tests of the scene compiler: schema subset, cue grammar on a real aligned voice, emitter rules.
//
//   node dev/compiler-tests.mjs [--source <delivered project with script.json + audio_meta.json>]

import { readFileSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import { validate } from "../compiler/schema.mjs";
import { chapterOverlap } from "../compiler/scorecard.mjs";
import { frameCtx, resolve, resolveRange } from "../compiler/cues.mjs";
import { emit } from "../compiler/emitter-0.7.99.mjs";
import { compose } from "../compiler/compose.mjs";
import { BUILD, fitOk, numbers, splitShots, withLabels } from "../compiler/solver.mjs";
import { ideaErrors, varietyErrors } from "../compiler/lint.mjs";
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

// builders: spoken sentences are longer than slots, and a comparison may put its right way second of three
const sent = (k, text) => ({ k, text, start: k * 3 });
const kw = (sentK, text) => ({ sent: sentK, text, cue: `kw:${text.split(" ")[0]}`, time: sentK * 3 + 1 });
const shot = (sents, ph) => ({ sents, ph, nums: [], text: sents.map((s) => s.text).join(" "), sentOf: (p) => sents[p.sent - 1]?.text ?? "",
  frame: { title: "Khung thử" } });
test("antipattern: the right side starts at the sentence that says the right way", () => {
  const b = BUILD["card-antipattern"](shot(
    [sent(1, "Cách làm sai là coi AI như một khóa học phần mềm."), sent(2, "Cách làm đúng là tái cấu trúc cách cả công ty làm việc."),
      sent(3, "Công cụ không có lỗi, lỗi nằm ở cách định vị.")],
    [kw(1, "khóa học phần mềm"), kw(2, "tái cấu trúc"), kw(3, "cách định vị")]));
  eq(b.slots, { wrong: { label: "Cách làm sai", items: ["Khóa học phần mềm"] }, right: { label: "Cách làm đúng", items: ["Tái cấu trúc", "Cách định vị"] } });
});
test("antipattern: \"không đúng\" does not start the right side", () => {
  const b = BUILD["card-antipattern"](shot(
    [sent(1, "Hô hào là sai."), sent(2, "Làm vậy là không đúng."), sent(3, "Hãy tự giao việc.")],
    [kw(1, "hô hào"), kw(2, "không đúng"), kw(3, "tự giao việc")]));
  eq(b.slots.right.items, ["Hãy tự giao việc"]);
});
test("case: the detail is the first later sentence that fits", () => {
  const b = BUILD["card-case"](shot(
    [sent(1, "Một tổng giám đốc điều hành 45 nhân sự."), sent(2, "Mỗi ngày ông ấy mất 1,5 tiếng duyệt báo giá và 1 tiếng đôn đốc tiến độ."),
      sent(3, "Mọi quyết định đều chờ ông ấy.")], [kw(2, "duyệt báo giá")]));
  eq([b.slots.detail, b.reveals.detail], ["Mọi quyết định đều chờ ông ấy", "sent:3.start"]);
});
test("split: a side with one keyword phrase is a title without items", () => {
  const b = BUILD.split(shot([sent(1, "Cách nhìn thứ nhất coi AI là phần mềm văn phòng."), sent(2, "Cách nhìn thứ hai coi AI là lực lượng lao động mới.")],
    [kw(1, "phần mềm văn phòng"), kw(2, "lực lượng lao động mới")]));
  eq([b.slots.left.title, b.slots.left.items, b.slots.right.title], ["Phần mềm văn phòng", [], "Lực lượng lao động mới"]);
});

test("quiz: options follow the question at once, the answer is cued where it is spoken", () => {
  const b = BUILD["card-quiz"](shot(
    [sent(1, "Nếu đã mua công cụ mà chưa thấy kết quả, bạn làm gì trước?"), sent(2, "Hãy dừng lại vài giây."),
      sent(3, "Cách đúng là chọn một bài toán nhỏ."), sent(4, "Không phải mua thêm một công cụ mới.")],
    [kw(3, "một bài toán nhỏ"), kw(4, "công cụ mới")]));
  eq(b.reveals, { question: "sent:1.start", "options.0": "sent:1.end+0.4", "options.1": "sent:1.end+0.9", answer: "kw:một" });
});

test("objective: a long sentence becomes its keyword phrase and keeps its own reveal", () => {
  const b = BUILD["card-objective"](shot(
    [sent(1, "Mục tiêu là hiểu lực lượng lao động mới trong doanh nghiệp."), sent(2, "Và biết khi nào AI giúp bạn thật sự.")],
    [kw(1, "lực lượng lao động mới"), kw(2, "giúp bạn thật sự")]));
  eq([b.slots.items, b.reveals], [["Lực lượng lao động mới", "Và biết khi nào AI giúp bạn thật sự"], { "items.0": "sent:1.start", "items.1": "sent:2.start" }]);
});
test("exercise: minutes come only from a number said with \"phút\"", () => {
  const six = BUILD["card-exercise"]({ ...shot([sent(1, "Hãy dừng video và mở công cụ AI."), sent(2, "Viết câu lệnh đủ 6 phần.")], []), nums: [{ value: 6 }] });
  const five = BUILD["card-exercise"]({ ...shot([sent(1, "Bạn hãy tạm dừng video trong 5 phút.")], []), nums: [{ value: 5 }] });
  eq([six.slots.minutes, five.slots.minutes], [undefined, 5]);
});

test("labels override keyword items", () => {
  const c = withLabels(shot([sent(1, "Người đặt mục tiêu, trợ lý soạn thảo."), sent(2, "Người kiểm tra cuối.")],
    [kw(1, "mục tiêu"), kw(1, "soạn thảo")]), ["A", "B", "C"]);
  const b = BUILD.cards(c);
  eq([b.slots.items.map((x) => x.label), b.reveals], [["A", "B", "C"], { "items.0": "kw:mục", "items.1": "kw:soạn", "items.2": "sent:2.start" }]);
});
test("labels become the objectives, one per label", () => {
  const c = withLabels(shot([sent(1, "Mục tiêu là hiểu lực lượng lao động mới trong doanh nghiệp.")], [kw(1, "lực lượng lao động mới")]),
    ["Nhận ra cái bẫy", "Hiểu nguyên nhân gốc"]);
  eq(BUILD["card-objective"](c).slots.items, ["Nhận ra cái bẫy", "Hiểu nguyên nhân gốc"]);
});

const chap = (id, hints) => ({ id, frames: ["title", ...hints].map((scene_hint) => ({ scene_hint })) });
test("chapter overlap: Jaccard on 3+ hints, equality on smaller sets", () => {
  const o = chapterOverlap([chap("ch0", []), chap("ch1", ["kinetic", "stat", "cards"]), chap("ch2", ["kinetic", "stat", "flow"]),
    chap("ch3", ["kinetic", "stat"]), chap("ch4", ["kinetic", "stat"]), chap("ch5", [])]);
  eq(o.pairs.map((p) => `${p.a}-${p.b}:${p.j}`), ["ch1-ch2:0.5", "ch1-ch3:0", "ch1-ch4:0", "ch2-ch3:0", "ch2-ch4:0", "ch3-ch4:1"]);
});
test("splitShots: a frame longer than 3 × maxShot still gets enough shots, not a null split", () => {
  const sents = [{ k: 1, text: "A", start: 0 }, { k: 2, text: "B", start: 8.05 }, { k: 3, text: "C", start: 15.8 }, { k: 4, text: "D", start: 23.55 }];
  eq(splitShots(sents, 0, 31, 10), [2, 3, 4]);
});
test("fit: item counts, a number and a cue decide whether a template suits a shot", () => {
  const two = shot([sent(1, "Người đặt mục tiêu, trợ lý soạn thảo.")], [kw(1, "mục tiêu"), kw(1, "soạn thảo")]);
  eq([fitOk({ minItems: 3 }, two), fitOk({ minItems: 2, maxItems: 4 }, two), fitOk({ needsNumber: true }, two),
    fitOk({ cue: "mục tiêu" }, two), fitOk({ cue: "tảng băng" }, two), fitOk({ minItems: 3 }, { ...two, labelsLeft: 3 })],
  [false, true, false, true, false, true]);
});
// the ten newer templates: enough content gives slots their schema accepts, too little gives null
const schemaOf = (id) => JSON.parse(readFileSync(new URL(`../templates/scenes/${id}/schema.json`, import.meta.url), "utf8"));
const valid = (id, b) => { if (!b) throw new Error(`${id}: null`); const e = validate(schemaOf(id).slots, b.slots); if (e.length) throw new Error(`${id}: ${e.join("; ")}`); };
const three = shot([sent(1, "Nền tảng là dữ liệu sạch."), sent(2, "Tầng giữa là quy trình."), sent(3, "Trên đỉnh là trợ lý AI.")],
  [kw(1, "dữ liệu sạch"), kw(2, "quy trình chuẩn"), kw(3, "trợ lý AI")]);
const one = shot([sent(1, "Một câu thôi.")], [kw(1, "một ý")]);
for (const id of ["pyramid", "funnel", "iceberg", "layers"]) {
  test(`${id}: three phrases build it, one phrase does not`, () => { valid(id, BUILD[id](three)); eq(BUILD[id](one), null); });
}
test("pyramid: a list said from the top is turned over, the base first", () =>
  eq(BUILD.pyramid(three).slots.levels.map((l) => l.label), ["Dữ liệu sạch", "Quy trình chuẩn", "Trợ lý AI"]));
test("matrix: four labels after two axis labels", () => {
  const c = withLabels(shot([sent(1, "Xếp việc theo hai trục.")], []), ["Mức khẩn", "Mức quan trọng", "Làm ngay", "Lên lịch", "Giao việc", "Bỏ qua"]);
  valid("matrix", BUILD.matrix(c)); eq(BUILD.matrix(three), null);
});
test("myth-fact: a belief, then its correction", () => {
  valid("myth-fact", BUILD["myth-fact"](shot([sent(1, "Nhiều người nghĩ AI sẽ thay thế nhân viên."), sent(2, "Thực ra AI thay đổi cách nhân viên làm việc.")], [])));
  eq(BUILD["myth-fact"](three), null);
});
test("dialogue: named turns build it; plain sentences need the dialogue hint", () => {
  valid("dialogue", BUILD.dialogue(shot([sent(1, "Khách: Giá bao nhiêu vậy?"), sent(2, "Trợ lý: Dạ, gói cơ bản là 2 triệu.")], [])));
  eq(BUILD.dialogue(three), null);
  valid("dialogue", BUILD.dialogue({ ...three, frame: { title: "Hỏi đáp", scene_hint: "dialogue" } }));
});
test("table: columns from the title, rows from phrases that name them", () => {
  const c = { ...shot([sent(1, "Tốc độ: AI nhanh, còn người không nhanh bằng."), sent(2, "Độ chính xác: người chắc chắn hơn, AI chưa chắc.")],
    [kw(1, "tốc độ"), kw(2, "độ chính xác")]), frame: { title: "AI và người" } };
  valid("table", BUILD.table(c)); eq(BUILD.table(three), null);
});
test("question-hook: the question sentence; none without a question", () => {
  valid("question-hook", BUILD["question-hook"](shot([sent(1, "Vì sao dự án AI dừng giữa chừng?")], [kw(1, "dừng giữa chừng")])));
  eq(BUILD["question-hook"](three), null);
});
test("balance: two sides from the halves; one sentence is not a balance", () => {
  valid("balance", BUILD.balance(shot([sent(1, "Tự làm tốn thời gian, rủi ro cao."), sent(2, "Dùng AI nhanh hơn, hiệu quả hơn.")],
    [kw(1, "tự làm"), kw(1, "tốn thời gian"), kw(2, "dùng AI"), kw(2, "hiệu quả hơn")])));
  eq(BUILD.balance(one), null);
});
test("fit cues do not match look-alike words", () => {
  const says = (text) => ({ ...shot([sent(1, text)], [kw(1, "a b"), kw(1, "c d"), kw(1, "e f")]), frame: { title: "Khung thử" } });
  const cue = (id, text) => fitOk(schemaOf(id).fit, says(text));
  eq([cue("pyramid", "Nhà cung cấp gửi hàng đúng hẹn."), cue("funnel", "Chuyển đổi số bắt đầu từ con người."),
    cue("layers", "Lớp học bắt đầu lúc tám giờ."), cue("pyramid", "Xây từ nền tảng dữ liệu."), cue("layers", "Bóc tách từng lớp của vấn đề.")],
  [false, false, false, true, true]);
});
test("dialogue: lead-ins and clock times are not speakers", () => {
  eq([BUILD.dialogue(shot([sent(1, "Câu hỏi: vì sao dự án dừng?"), sent(2, "Lưu ý: dữ liệu phải sạch.")], [])),
    BUILD.dialogue(shot([sent(1, "Lúc 10:30 đội họp."), sent(2, "Sau đó mọi người về.")], []))], [null, null]);
});
test("funnel: a stage over 999 999 drops the numbers, not the funnel", () => {
  const c = { ...three, nums: [{ value: 2000000, sent: 1 }, { value: 1000000, sent: 2 }, { value: 500000, sent: 3 }] };
  const b = BUILD.funnel(c); valid("funnel", b); eq(b.slots.stages.some((s) => "value" in s), false);
});

// authoring "claude": ideas and repetition are errors
const AUTH = { authoring: "claude", maxUsesPerTemplate: 2, pairGap: 6, uniqueChapterOpeners: true };
const aShot = (frame, template, variant = "a") => ({ frame, template, variant, family: template });
test("authored frame without idea is an error", () => {
  eq(ideaErrors([{ frame: 1, idea: "a tower with one floor per service" }, { frame: 2 }], AUTH), ['frame 2: needs "idea" (authoring claude, see references/direction.md)']);
  eq(ideaErrors([{ frame: 2 }], {}), []);
});
test("authored: a template over maxUsesPerTemplate is an error", () => {
  const flat = ["stat", "cards", "hub", "flow", "split", "zoom", "stat", "table", "kinetic", "layers", "matrix", "funnel", "stat"].map((t, i) => aShot(i + 1, t));
  eq(varietyErrors(flat, { ...AUTH, pairGap: 0 }).filter((m) => m.includes("maxUses")), ["stat: used 3 times, at most 2 (scenes.maxUsesPerTemplate)"]);
});
test("authored: a template back within pairGap shots is an error", () => {
  const flat = ["stat", "cards", "hub", "stat"].map((t, i) => aShot(i + 1, t));
  eq(varietyErrors(flat, AUTH), ["frame 4: stat comes back within 6 shots (scenes.pairGap)"]);
});
test("authored: two accent shots in one chapter is an error", () => {
  const flat = [{ ...aShot(1, "opener-prism"), accent: true }, aShot(2, "cards"), { ...aShot(3, "accent-orbit"), accent: true }, { ...aShot(4, "accent-cuboids"), accent: true }];
  eq(varietyErrors(flat, AUTH, [[1, 2, 3], [4]]), ["chapter 0: 2 accent shots, at most 1"]);
});
test("authored: two chapters opening alike is an error", () => {
  const flat = [aShot(1, "title", "big-type"), aShot(2, "cards"), aShot(3, "title", "big-type"), aShot(4, "hub")];
  eq(varietyErrors(flat, AUTH, [[1, 2], [3, 4]]), ["chapter 1: opens with title/big-type like chapter 0 (scenes.uniqueChapterOpeners)"]);
  eq(varietyErrors(flat, {}, [[1, 2], [3, 4]]), []);
});

console.log(ok === n ? `compiler-tests ok (${ok}/${n})` : `compiler-tests FAILED (${ok}/${n})`);
process.exit(ok === n ? 0 : 1);

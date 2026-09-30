#!/usr/bin/env node
// lint.mjs — check scenes.json before compiling, and resolve every shot window and reveal time (compile reuses it).
//
//   node tools/compiler/lint.mjs [--estimated]
//
// Errors: scenes.json shape (C2), template/variant, slots against the template schema, cues that do not resolve,
// shots that do not tile [0, duration] (±0.2 s) or break the template's duration range, custom share above
// scenes.customBudget (legacy projects excepted), glyphs the fonts lack, and two consecutive shots (also across
// frames) with the same template+variant or the same family. In a directed lesson (authoring "director", or its older
// name "claude"): every copy reveal is pinned to the voice (a word: or kw: cue), and, with an aligned voice, slot text
// that is never said in the frame or is said more than SYNC_TOL_S away is an error (a warning elsewhere).
// A frame's "transition" must name a registry type (transitionErrors); compile writes it as transition_in.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate } from "./schema.mjs";
import { endsPhrase, frameCtx, norm, resolve, resolveRange } from "./cues.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TEMPLATES = resolvePath(HERE, "../templates/scenes");
// A frame made of one shot of its own scene_hint template may last this long: a comparison, a case, an exercise or a
// quiz needs all of its sentences, and cutting a 12 s frame in two leaves the hint shot with half of them.
export const WHOLE_FRAME_MAX_S = 16;
const TOL = 0.2;
// The transition registry sits next to the compiler in a project (tools/transitions) and under scripts/ in the skill.
const REGISTRY = [resolvePath(HERE, "../transitions/lib/transitions.json"), resolvePath(HERE, "../scripts/transitions/lib/transitions.json")]
  .find((p) => existsSync(p));
export const TRANSITIONS = new Map((REGISTRY ? JSON.parse(readFileSync(REGISTRY, "utf8")).transitions : []).map((t) => [t.name, t]));
/** A directed lesson: the agent making the video writes scenes.json by hand (references/direction.md). */
export const isDirected = (sc) => sc?.authoring === "director" || sc?.authoring === "claude";
const r2 = (x) => Math.round(x * 100) / 100;

// Overlays: timed notes on the overlay layer, above the frames (scripts/build-overlay.mjs draws them).
export const OVERLAY_KINDS = ["lower-third", "callout", "note", "ticker"];
const OVERLAY_SCHEMA = {
  type: "array", minItems: 1, maxItems: 3, items: {
    type: "object", required: ["kind", "text", "at"], additionalProperties: false,
    properties: {
      kind: { type: "string", enum: OVERLAY_KINDS }, text: { type: "string", minLength: 1, maxLength: 60 },
      sub: { type: "string", minLength: 1, maxLength: 48 }, at: { type: "string" }, until: { type: "string" },
      place: { type: "string", enum: ["tl", "tr", "mr"] }, skin: { type: "string", enum: ["kicker", "bar"] },
    },
  },
};

const SCENES_SCHEMA = {
  type: "object", required: ["version", "frames"],
  properties: {
    version: { type: "integer", enum: [1] }, seed: { type: "integer" },
    frames: { type: "array", minItems: 1, items: {
      type: "object", required: ["frame"], additionalProperties: false,
      properties: {
        frame: { type: "integer", minimum: 1 }, custom: { type: "boolean" }, seed: { type: "integer" },
        idea: { type: "string", minLength: 10, maxLength: 400 },
        rail: { type: ["object", "null"], required: ["slots", "at"], additionalProperties: false, properties: {
          slots: { type: "array", minItems: 2, maxItems: 4, items: { type: "string", minLength: 1, maxLength: 18 } },
          at: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } } } },
        role: { type: "string" }, transition: { type: "string", minLength: 1 }, overlays: OVERLAY_SCHEMA,
        shots: { type: "array", minItems: 1, maxItems: 6, items: {
          type: "object", required: ["template", "window", "slots"], additionalProperties: false,
          properties: {
            template: { type: "string", pattern: "^[a-z][a-z0-9-]*$" }, variant: { type: "string" },
            window: { type: "array", minItems: 2, maxItems: 2, items: { type: "string" } },
            slots: { type: "object" }, reveals: { type: "object" }, params: { type: "object" }, hold: { type: "number" },
          },
        } },
      },
    } },
  },
};

/** STORYBOARD.md frames: { no, title, bullets: {key: value} } */
export function readStoryboard(md) {
  return md.split(/(?=^## Frame \d+ )/m).filter((b) => /^## Frame \d+ /.test(b)).map((b) => {
    const [, no, title] = b.match(/^## Frame (\d+) — ?(.*)$/m) ?? b.match(/^## Frame (\d+)\s*(.*)$/m);
    const bullets = Object.fromEntries([...b.matchAll(/^- ([\w_]+): ?(.*)$/gm)].map(([, k, v]) => [k, v.trim()]));
    return { no: Number(no), title: title.trim(), bullets };
  });
}

const templateCache = new Map();
export async function loadTemplate(id) {
  if (!templateCache.has(id)) {
    const dir = join(TEMPLATES, id);
    if (!existsSync(join(dir, "schema.json"))) throw new Error(`unknown template "${id}" (no ${dir}/schema.json)`);
    const schema = JSON.parse(readFileSync(join(dir, "schema.json"), "utf8"));
    const mod = await import(pathToFileURL(join(dir, "template.mjs")).href);
    templateCache.set(id, { schema, mod });
  }
  return templateCache.get(id);
}

const ruleFor = (schema, key) => schema.reveals?.[key] ?? schema.reveals?.[key.replace(/\.\d+$/, ".*")];
const strings = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);

/** frame-relative start times of the keyword phrases of a frame */
export function phraseStarts(ctx) {
  return ctx.tokens.flatMap((t, i) => (t.keyword && !(i > 0 && ctx.tokens[i - 1].keyword && ctx.tokens[i - 1].sent === t.sent
    && !endsPhrase(ctx.tokens[i - 1].display))
    ? [r2(ctx.times[i].start)] : []));
}

/** Reveal times: explicit cue, else the next keyword in the window ("kw"), else spread; always in key order. */
function revealTimes(keys, schema, spec, ctx, a, b) {
  // "kw" defaults land on the start of each keyword phrase (a run of keyword tokens in one sentence), not on every
  // syllable: "*không* *bao* *giờ* *quên*" is one phrase
  const kws = phraseStarts(ctx).filter((s) => s >= a - 0.05 && s < b - 0.3);
  const step = Math.min(0.8, Math.max(0.3, (b - a - 1.2) / Math.max(1, keys.length)));
  const out = {};
  let prev = a, k = 0;
  keys.forEach((key, i) => {
    const rule = ruleFor(schema, key) ?? { default: "spread" };
    let t;
    if (spec.reveals?.[key]) {
      t = rule.range ? resolveRange(spec.reveals[key], ctx, a) : resolve(spec.reveals[key], ctx, a);
      const [from, to] = Array.isArray(t) ? t : [t, t];
      if (from < a - 0.05 || to > b - (Array.isArray(t) ? 0 : 0.3)) {
        throw new Error(`reveal ${key} = ${Array.isArray(t) ? t.join("..") : t} s is outside the shot [${a}, ${b}]`);
      }
    } else if (rule.default === "kw" && k < kws.length) {
      while (k < kws.length && kws[k] < prev) k++;
      t = k < kws.length ? kws[k++] : null;
    }
    if (t == null) t = r2(Math.min(b - 0.6, Math.max(a + 0.25 + i * step, prev + (i ? 0.35 : 0))));
    if (rule.range && !Array.isArray(t)) t = [t, r2(Math.max(t + 0.6, b - 0.4))];
    out[key] = t;
    prev = Array.isArray(t) ? t[0] : t;
  });
  // "after": a key that must not appear before another (e.g. the right way after the wrong way)
  const first = (v) => (Array.isArray(v) ? v[0] : v);
  for (const key of keys) {
    const after = ruleFor(schema, key)?.after;
    if (after && after in out && first(out[key]) < first(out[after])) throw new Error(`reveal ${key} (${first(out[key])} s) must come after ${after} (${first(out[after])} s)`);
  }
  for (const key of Object.keys(spec.reveals ?? {})) if (!keys.includes(key)) throw new Error(`reveal key "${key}" is not used by this shot (keys: ${keys.join(", ")})`);
  return out;
}

// Voice sync: on-screen copy should land on the words that say it. Framing keys (a heading, a kicker) and non-text
// keys are exempt; function words never count as a match.
export const SYNC_TOL_S = 1.2;
const FRAMING_KEYS = new Set(["heading", "title", "kicker", "subtitle", "app", "headline", "file", "number", "chapterNo"]);
const STOP = new Set(("của và cho một là có các những trong với từ để thì mà rồi này đó nó bạn ra lên vào được cũng như khi nếu "
  + "đã sẽ không chỉ còn đều hay hoặc ở trên dưới qua lại mình ai gì nào").split(" "));
const words = (s) => norm(s).replace(/(\d)\.(?=\d)/g, "$1").split(/\s+/).filter((w) => w && !STOP.has(w));
// The copy leaves of a slot value, walking its schema: a value the schema limits to an enum (a region code, a kind), a
// property marked "copy": false (an icon name, an image path) and the icon/kind keys are identifiers, not copy.
function copyLeaves(node, v) {
  if (node?.enum || node?.copy === false) return [];
  if (typeof v === "string") return [v];
  if (typeof v === "number") return [String(v)];
  if (Array.isArray(v)) return v.flatMap((x) => copyLeaves(node?.items, x));
  if (v && typeof v === "object") return Object.entries(v).filter(([k]) => k !== "icon" && k !== "kind").flatMap(([k, x]) => copyLeaves(node?.properties?.[k], x));
  return [];
}
const slotSchema = (schema, key) => key.split(".").reduce((n, k) => (n == null ? n : /^\d+$/.test(k) ? n.items : n.properties?.[k]), schema?.slots);

/**
 * [{ key, text, leaves, at, transient }] for the reveals that show copy: framing keys, indexes, identifiers and empty text
 * are left out. `transient`: the template takes this copy off the stage before the shot ends by design (schema reveals
 * "transient": true: a card flipped away, a milestone passed, a line scrolled out).
 */
export function copyReveals(spec, times, schema = {}) {
  const out = [];
  for (const [key, t] of Object.entries(times)) {
    if (FRAMING_KEYS.has(key.split(".")[0])) continue;
    const slot = key.split(".").reduce((v, k) => (v == null ? v : v[k]), spec.slots);
    if (typeof slot === "number" && key !== "value") continue; // an index (pick, hero, current), not copy
    const leaves = copyLeaves(slotSchema(schema, key), slot);
    const text = leaves.join(" ");
    if (words(text).length) out.push({ key, text, leaves, at: Array.isArray(t) ? t[0] : t, transient: ruleFor(schema, key)?.transient === true });
  }
  return out;
}

/** A reveal cue tied to a spoken word: word:… or kw:… (a range starts with one). */
export const pinnedToVoice = (cue) => typeof cue === "string" && /^(word|kw):/.test(cue);

/**
 * [{ key, text, at, spoken, explicit, code }] for the reveals whose words are never said in the frame or land > SYNC_TOL_S
 * away. `code`: the template marks the key as code content (schema reveals "code": true), which the voice cannot read
 * word for word.
 */
export function voiceSyncIssues(spec, times, ctx, schema = {}) {
  const spokenAt = ctx.tokens.map((t, i) => [norm(t.display).replace(/(\d)\.(?=\d)/g, "$1"), ctx.times[i].start]);
  const out = [];
  for (const { key, text, at } of copyReveals(spec, times, schema)) {
    const want = new Set(words(text));
    const hits = spokenAt.filter(([w]) => want.has(w)).map(([, s]) => s);
    const spoken = hits.length ? hits.reduce((p, s) => (Math.abs(s - at) < Math.abs(p - at) ? s : p)) : null;
    if (spoken == null || Math.abs(at - spoken) > SYNC_TOL_S) out.push({ key, text, at, spoken: spoken == null ? null : r2(spoken), explicit: !!spec.reveals?.[key], code: ruleFor(schema, key)?.code === true });
  }
  return out;
}

/**
 * Resolve every frame. Returns { frames: [{ no, custom, duration, shots: [{ spec, schema, mod, variant, a, b, times }] }],
 * errors, warnings, stats }.
 */
export async function analyze({ P, cfg, estimated = false, legacy = false, variety = true }) {
  const errors = [], warnings = [];
  const read = (f) => JSON.parse(readFileSync(join(P, f), "utf8"));
  const scenes = read("scenes.json");
  const script = read("script.json");
  const hintOf = new Map(script.chapters.flatMap((c) => c.frames.map((f) => [f.id, f.scene_hint])));
  const audioMeta = estimated ? null : read("audio_meta.json");
  const board = readStoryboard(readFileSync(join(P, "STORYBOARD.md"), "utf8"));
  const rate = existsSync(join(P, ".probe/rate.json")) ? read(".probe/rate.json").syllables_per_s : script.meta?.rate ?? 4.3;
  const glyphs = [...(cfg.guard?.missingGlyphs ?? "①②③✳✕✓→")];
  const types = new Set(cfg.scenes?.types ?? []);
  const directed = isDirected(cfg.scenes) && !legacy;

  const scriptFrames = script.chapters.flatMap((c) => c.frames).length;
  if (scriptFrames !== board.length) {
    errors.push(`STORYBOARD.md has ${board.length} frames but script.json has ${scriptFrames}: the outline is out of date with the script`);
  }
  errors.push(...validate(SCENES_SCHEMA, scenes).map((e) => `scenes.json ${e}`));
  if (errors.length) return { frames: [], errors, warnings, stats: {} };
  const byNo = new Map(scenes.frames.map((f) => [f.frame, f]));
  for (const f of board) if (!byNo.has(f.no)) errors.push(`frame ${f.no}: no entry in scenes.json`);
  for (const f of scenes.frames) if (!board.some((b) => b.no === f.frame)) errors.push(`frame ${f.frame}: not in STORYBOARD.md`);
  if (scenes.frames.length !== byNo.size) errors.push("scenes.json: a frame number appears twice");
  errors.push(...ideaErrors(scenes.frames, cfg.scenes));

  const out = [];
  const flat = []; // every compiled shot in order, for the variety warnings
  let prevShot = null;
  for (const bf of board) {
    const spec = byNo.get(bf.no);
    if (!spec) continue;
    const duration = Number(estimated ? bf.bullets.est_duration?.replace("s", "") : (bf.bullets.duration ?? bf.bullets.est_duration)?.replace("s", ""));
    const where = `frame ${bf.no}`;
    if (!(duration > 0)) { errors.push(`${where}: no duration in STORYBOARD.md`); continue; }
    if (spec.custom) {
      if (spec.shots) errors.push(`${where}: a custom frame has no shots (it is hand-built from references/custom-frame.md)`);
      out.push({ no: bf.no, custom: true, duration, board: bf });
      prevShot = null;
      continue;
    }
    if (!spec.shots) { errors.push(`${where}: needs shots, or "custom": true`); continue; }
    let ctx;
    try { ctx = frameCtx(bf.no, script, audioMeta, duration, { estimated, timing: cfg.timing, rate }); } catch (e) { errors.push(`${where}: ${e.message}`); continue; }
    const shots = [];
    let prevEnd = null;
    for (const [i, s] of spec.shots.entries()) {
      const at = `${where} shot ${i + 1} (${s.template})`;
      let tpl;
      try { tpl = await loadTemplate(s.template); } catch (e) { errors.push(`${at}: ${e.message}`); continue; }
      const variant = s.variant ?? tpl.schema.variants[0];
      if (!tpl.schema.variants.includes(variant)) errors.push(`${at}: variant "${variant}" not in ${tpl.schema.variants.join(", ")}`);
      errors.push(...validate(tpl.schema.slots, s.slots, "slots").map((e) => `${at}: ${e}`));
      const bad = glyphs.filter((g) => strings(s.slots).some((x) => x.includes(g)));
      if (bad.length) errors.push(`${at}: slot text uses glyphs the fonts lack: ${bad.join(" ")}`);
      if (types.size && !types.has(tpl.schema.family)) errors.push(`${at}: family "${tpl.schema.family}" is not in video.config.json scenes.types`);
      let a, b;
      try {
        a = resolve(s.window[0], ctx, prevEnd);
        b = resolve(s.window[1], ctx, a);
      } catch (e) { errors.push(`${at}: ${e.message}`); continue; }
      if (i === 0 && Math.abs(a) > TOL) errors.push(`${at}: the first shot must start at 0 (starts at ${a})`);
      if (prevEnd != null && Math.abs(a - prevEnd) > TOL) errors.push(`${at}: gap or overlap: starts at ${a}, previous shot ends at ${prevEnd}`);
      if (b <= a) { errors.push(`${at}: window end ${b} is not after its start ${a}`); continue; }
      const len = r2(b - a), d = tpl.schema.duration ?? {};
      const wholeHint = spec.shots.length === 1 && hintOf.get(bf.no) === tpl.schema.family;
      const max = wholeHint && d.max != null ? Math.max(d.max, WHOLE_FRAME_MAX_S) : d.max;
      if (d.min != null && len < d.min - 0.01) errors.push(`${at}: ${len} s is shorter than the template minimum ${d.min} s`);
      if (max != null && len > max + 0.01) errors.push(`${at}: ${len} s is longer than the template maximum ${max} s`);
      if (!variety) { /* template CI puts variants side by side on purpose */ }
      else if (prevShot && prevShot.template === s.template && prevShot.variant === variant) errors.push(`${at}: same template and variant as the previous shot`);
      else if (prevShot && prevShot.family === tpl.schema.family) errors.push(`${at}: same family "${tpl.schema.family}" as the previous shot`);
      let times = {};
      const valid = !validate(tpl.schema.slots, s.slots).length;
      if (valid) {
        try { times = revealTimes(tpl.mod.revealKeys(s.slots, variant), tpl.schema, s, ctx, a, b); } catch (e) { errors.push(`${at}: ${e.message}`); }
      }
      // a directed lesson shows only what the voice says, when it says it: an unpinned reveal, copy the voice never
      // says and copy said too far from its reveal are errors (warnings in other projects)
      const strict = directed ? errors : warnings;
      if (directed) for (const r of copyReveals(s, times, tpl.schema)) {
        if (!pinnedToVoice(s.reveals?.[r.key])) errors.push(`${at}: reveal ${r.key} "${r.text.slice(0, 40)}" is not pinned: add "reveals": { "${r.key}": "word:<its word>-0.1" }`);
      }
      if (!estimated) for (const v of voiceSyncIssues(s, times, ctx, tpl.schema)) {
        // code the voice only talks about is still pinned and still reported, as a warning
        if (v.spoken == null) (v.code ? warnings : strict).push(`${at}: slot text ${v.key} "${v.text.slice(0, 40)}" is never said in this frame: write only what the voice says`);
        else strict.push(`${at}: reveal ${v.key} "${v.text.slice(0, 40)}" at ${v.at} s is said at ${v.spoken} s: pin it with "reveals": { "${v.key}": "word:<its word>-0.1" }`);
      }
      const firstKey = Math.min(...Object.values(times).map((v) => (Array.isArray(v) ? v[0] : v)));
      if (Number.isFinite(firstKey) && firstKey - a > 2.0) warnings.push(`${at}: the first reveal comes ${r2(firstKey - a)} s after the shot starts: move the window start nearer its first keyword`);
      shots.push({ spec: s, schema: tpl.schema, mod: tpl.mod, variant, a, b, times });
      prevShot = { template: s.template, variant, family: tpl.schema.family };
      flat.push({ frame: bf.no, template: s.template, variant, family: tpl.schema.family, accent: tpl.schema.accent === true, signature: (tpl.schema.signatures ?? []).includes(variant) && s.template !== "title" });
      prevEnd = b;
    }
    if (prevEnd != null && Math.abs(prevEnd - duration) > TOL) errors.push(`${where}: the last shot ends at ${prevEnd}, the frame lasts ${duration}`);
    let rail = null;
    if (spec.rail) {
      if (spec.rail.slots.length !== spec.rail.at.length) errors.push(`${where}: rail has ${spec.rail.slots.length} slots but ${spec.rail.at.length} cues`);
      else {
        try { rail = { slots: spec.rail.slots, times: spec.rail.at.map((c) => resolve(c, ctx, 0)) }; } catch (e) { errors.push(`${where} rail: ${e.message}`); }
      }
    }
    out.push({ no: bf.no, custom: false, duration, board: bf, ctx, shots, rail });
  }
  if (variety) {
    warnings.push(...varietyWarnings({ flat, out, script, byNo }));
    const chapterFrames = script.chapters.map((c) => c.frames.map((f) => f.id));
    (legacy ? warnings : errors).push(...varietyErrors(flat, cfg.scenes, chapterFrames));
    // the first shot of a frame follows the scene_hint the script chose for it; under the director (scenes.director)
    // the hint closes a long frame, so any shot of the frame may carry it
    for (const f of out) {
      const first = flat.find((s) => s.frame === f.no);
      if (cfg.scenes?.director === true) {
        // an exercise or a quiz the script asked for must show: it is the learner's task, not a decoration
        if (!f.custom && first && hintOf.get(f.no) && !flat.some((s) => s.frame === f.no && s.family === hintOf.get(f.no)))
          (["exercise", "quiz"].includes(hintOf.get(f.no)) ? errors : warnings).push(`frame ${f.no}: no shot shows its scene_hint ${hintOf.get(f.no)}`);
      } else if (!f.custom && first && hintOf.get(f.no) && first.family !== hintOf.get(f.no))
        warnings.push(`frame ${f.no}: opens with ${first.template} (${first.family}), not its scene_hint ${hintOf.get(f.no)}`);
    }
  }
  const custom = out.filter((f) => f.custom).length;
  const budget = cfg.scenes?.customBudget ?? 0.15;
  if (out.length && custom / out.length > budget + 1e-9) {
    const msg = `custom frames ${custom}/${out.length} = ${Math.round((100 * custom) / out.length)} % is above scenes.customBudget ${Math.round(budget * 100)} %`;
    (legacy ? warnings : errors).push(msg);
  }
  const withOverlays = [];
  for (const f of out) {
    const spec = byNo.get(f.no);
    if (!spec.overlays) continue;
    try {
      const ctx = f.ctx ?? frameCtx(f.no, script, audioMeta, f.duration, { estimated, timing: cfg.timing, rate });
      withOverlays.push({ no: f.no, chapter: f.board.bullets.chapter, overlays: spec.overlays, ctx });
    } catch (e) { errors.push(`frame ${f.no} overlays: ${e.message}`); }
  }
  errors.push(...overlayErrors(withOverlays, estimated));
  const into = transitionsIn(board, byNo, directed);
  for (const f of out) f.transition = into.get(f.no);
  errors.push(...transitionErrors(board, byNo, into, directed));
  const shots = out.reduce((n, f) => n + (f.shots?.length ?? 0), 0);
  return { frames: out, errors, warnings, stats: { frames: out.length, shots, custom }, scenes };
}

/** Where an overlay sits: a lower third and a ticker share the strip above the karaoke band. */
export const overlayZone = (o) => (o.kind === "lower-third" || o.kind === "ticker" ? "low" : o.kind === "note" ? "mr" : o.place ?? "tr");

/** The overlays of one frame with their frame-relative times a..b (until defaults to the frame's end). Throws on a bad cue. */
export function resolveOverlays(list, ctx) {
  return list.map((o, i) => {
    const where = `overlay ${i + 1} (${o.kind})`;
    let a, b;
    try {
      a = resolve(o.at, ctx, 0);
      b = o.until ? resolve(o.until, ctx, 0) : r2(ctx.duration);
    } catch (e) { throw new Error(`${where}: ${e.message}`); }
    if (b - a < 1) throw new Error(`${where}: shows for ${r2(b - a)} s, at least 1 s`);
    return { ...o, a, b, zone: overlayZone(o) };
  });
}

/**
 * Overlay errors, for [{ no, chapter, overlays, ctx }]: cues that do not resolve, place/skin on the wrong kind, text the
 * voice never says in the frame (or, with an aligned voice, says more than SYNC_TOL_S from `at`; `sub` is exempt), two
 * overlays in one zone at the same time, and more than one ticker in a chapter.
 */
export function overlayErrors(frames, estimated = false) {
  const e = [];
  const tickers = new Map();
  for (const f of frames) {
    const where = `frame ${f.no}`;
    f.overlays.forEach((o, i) => {
      if (o.place && o.kind !== "callout") e.push(`${where} overlay ${i + 1} (${o.kind}): "place" is for a callout only`);
      if (o.skin && o.kind !== "lower-third") e.push(`${where} overlay ${i + 1} (${o.kind}): "skin" is for a lower-third only`);
      if (o.kind === "ticker") tickers.set(f.chapter, [...(tickers.get(f.chapter) ?? []), f.no]);
    });
    let list;
    try { list = resolveOverlays(f.overlays, f.ctx); } catch (err) { e.push(`${where} ${err.message}`); continue; }
    const spokenAt = f.ctx.tokens.map((t, i) => [norm(t.display).replace(/(\d)\.(?=\d)/g, "$1"), f.ctx.times[i].start]);
    list.forEach((o, i) => {
      const at = `${where} overlay ${i + 1} (${o.kind})`;
      const want = new Set(words(o.text));
      const hits = spokenAt.filter(([w]) => want.has(w)).map(([, s]) => s);
      if (!hits.length) e.push(`${at}: "${o.text.slice(0, 40)}" is never said in this frame: an overlay shows what the voice says (put the rest in "sub")`);
      else if (!estimated) {
        const near = hits.reduce((p, s) => (Math.abs(s - o.a) < Math.abs(p - o.a) ? s : p));
        if (Math.abs(near - o.a) > SYNC_TOL_S) e.push(`${at}: shows at ${o.a} s, but its words are said at ${r2(near)} s: pin "at" to "word:<its word>-0.1"`);
      }
      for (const p of list.slice(0, i)) {
        if (p.zone === o.zone && p.a < o.b && o.a < p.b) e.push(`${at}: overlaps overlay ${list.indexOf(p) + 1} (${p.kind}) in the same place (${o.zone}) from ${r2(Math.max(p.a, o.a))} s`);
      }
    });
  }
  for (const [ch, nos] of tickers) if (nos.length > 1) e.push(`chapter ${ch}: ${nos.length} tickers (frames ${nos.join(", ")}), at most 1`);
  return e;
}

/**
 * The transition_in of every frame: the frame's "transition" in scenes.json, else (directed lesson) a cut into frame 1,
 * blur-crossfade into a chapter's first frame and crossfade elsewhere, else (older projects) what STORYBOARD.md has.
 */
export function transitionsIn(board, byNo, directed) {
  const m = new Map();
  board.forEach((bf, i) => {
    const own = byNo.get(bf.no)?.transition;
    const fallback = !directed ? bf.bullets.transition_in
      : i === 0 ? "cut" : bf.bullets.chapter !== board[i - 1].bullets.chapter ? "blur-crossfade" : "crossfade";
    if (own ?? fallback) m.set(bf.no, own ?? fallback);
  });
  return m;
}

/**
 * A frame's "transition" is `<name> [direction] [seconds]` with a name from tools/transitions/lib/transitions.json (or
 * cut). Frame 1 has nothing before it. In a directed lesson three boundaries in a row with the same type, crossfade
 * excepted, are an error: a strong transition marks a turn, and repeated it marks nothing.
 */
export function transitionErrors(board, byNo, into, directed) {
  const e = [];
  for (const [i, bf] of board.entries()) {
    const t = byNo.get(bf.no)?.transition;
    if (t === undefined) continue;
    const [name, ...rest] = t.trim().split(/\s+/);
    const rec = TRANSITIONS.get(name);
    if (i === 0 && name !== "cut") e.push(`frame ${bf.no}: transition "${t}" — the first frame has no frame before it; use cut or leave it out`);
    if (name !== "cut" && !rec) { e.push(`frame ${bf.no}: unknown transition "${name}" (known: cut, ${[...TRANSITIONS.keys()].join(", ")})`); continue; }
    for (const p of rest) {
      if (/^\d+(\.\d+)?s?$/.test(p)) continue;
      if (!rec?.directions?.includes(p.toUpperCase())) e.push(`frame ${bf.no}: transition ${name} has no direction "${p}"${rec?.directions?.length ? ` (${rec.directions.join(", ")})` : ""}`);
    }
  }
  if (!directed) return e;
  const types = board.slice(1).map((bf) => [bf.no, (into.get(bf.no) ?? "cut").split(/\s+/)[0]]);
  for (let i = 2; i < types.length; i++) {
    const [a, b, c] = [types[i - 2], types[i - 1], types[i]];
    if (a[1] !== "crossfade" && a[1] === b[1] && b[1] === c[1] && (i === 2 || types[i - 3][1] !== a[1]))
      e.push(`frames ${a[0]}–${c[0]}: three transitions in a row are ${a[1]} — keep strong transitions for turns (references/direction.md § Transitions)`);
  }
  return e;
}

export function report({ errors, warnings, stats }) {
  for (const w of warnings) console.log(`⚠ ${w}`);
  for (const e of errors) console.log(`✗ ${e}`);
  console.log(`lint: ${stats.frames ?? 0} frames, ${stats.shots ?? 0} shots, ${stats.custom ?? 0} custom, ${errors.length} error(s)`);
}

if (resolvePath(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const P = process.cwd();
  const cfg = JSON.parse(readFileSync(join(P, "video.config.json"), "utf8"));
  const legacy = existsSync(join(P, ".abm/state.json")) && JSON.parse(readFileSync(join(P, ".abm/state.json"), "utf8")).legacy === true;
  const res = await analyze({ P, cfg, estimated: process.argv.includes("--estimated"), legacy });
  report(res);
  process.exit(res.errors.length ? 1 : 0);
}

/** In a directed lesson every frame records its visual idea (references/direction.md). */
export function ideaErrors(frames, sc = {}) {
  if (!isDirected(sc)) return [];
  return frames.filter((f) => !f.idea).map((f) => `frame ${f.frame}: needs "idea" (directed lesson, see references/direction.md)`);
}

/**
 * Variety errors (warnings in legacy projects), for 10 shots or more: E1 one family (title excluded) takes more than
 * 25 % of the shots · E2 the video uses fewer than min(10, shots / 3) templates. A lesson that leans on one or two
 * layouts bores the viewer even when no pair repeats back to back.
 * In a directed lesson (sc = cfg.scenes, isDirected), at any length, title excluded: E3 a template is used more than
 * sc.maxUsesPerTemplate times · E4 a template comes back within sc.pairGap shots · E5 (sc.uniqueChapterOpeners) two
 * chapters open with the same template/variant · E6 a chapter has more than one accent shot (schema "accent": true) ·
 * E7 a frame opens with a family that a shot of one of the two frames before it used (title and accent shots excluded).
 * `chapters` lists each chapter's frame numbers.
 */
export function varietyErrors(flat, sc = {}, chapters = []) {
  const e = [];
  if (isDirected(sc)) e.push(...authoredErrors(flat, sc, chapters));
  const body = flat.filter((s) => s.family !== "title");
  if (body.length < 10) return e;
  const byFamily = new Map();
  for (const s of body) byFamily.set(s.family, (byFamily.get(s.family) ?? 0) + 1);
  for (const [family, n] of byFamily) {
    if (n / body.length > 0.25) e.push(`${family}: ${n}/${body.length} shots (${Math.round((100 * n) / body.length)} %), above 25 % — use other templates (scene-spec.md)`);
  }
  const distinct = new Set(flat.map((s) => s.template)).size;
  const need = Math.min(10, Math.ceil(flat.length / 3));
  if (distinct < need) e.push(`the video uses ${distinct} templates, fewer than ${need} for ${flat.length} shots`);
  return e;
}

function authoredErrors(flat, sc, chapters) {
  const e = [];
  const body = flat.filter((s) => s.family !== "title");
  const max = sc.maxUsesPerTemplate;
  if (max) {
    const uses = new Map();
    for (const s of body) uses.set(s.template, (uses.get(s.template) ?? 0) + 1);
    for (const [t, n] of uses) if (n > max) e.push(`${t}: used ${n} times, at most ${max} (scenes.maxUsesPerTemplate)`);
  }
  const gap = sc.pairGap;
  if (gap) {
    body.forEach((s, i) => {
      const back = body.slice(Math.max(0, i - (gap - 1)), i);
      if (back.some((x) => x.template === s.template)) e.push(`frame ${s.frame}: ${s.template} comes back within ${gap} shots (scenes.pairGap)`);
    });
  }
  const frameNos = [...new Set(flat.map((s) => s.frame))];
  frameNos.forEach((no, i) => {
    const first = flat.find((s) => s.frame === no);
    if (first.family === "title" || first.accent) return;
    const near = frameNos.slice(Math.max(0, i - 2), i);
    const hit = flat.find((s) => near.includes(s.frame) && s.family === first.family && !s.accent);
    if (hit) e.push(`frame ${no}: opens with family "${first.family}", which frame ${hit.frame} just used: change the layout axis (references/direction.md)`);
  });
  chapters.forEach((frames, ci) => {
    const n = flat.filter((s) => s.accent && frames.includes(s.frame)).length;
    if (n > 1) e.push(`chapter ${ci}: ${n} accent shots, at most 1`);
  });
  if (sc.uniqueChapterOpeners) {
    const seen = new Map();
    chapters.forEach((frames, ci) => {
      const first = flat.find((s) => frames.includes(s.frame));
      if (!first) return;
      const key = `${first.template}/${first.variant}`;
      if (seen.has(key)) e.push(`chapter ${ci}: opens with ${key} like chapter ${seen.get(key)} (scenes.uniqueChapterOpeners)`);
      else seen.set(key, ci);
    });
  }
  return e;
}

/**
 * Variety and DNA warnings (never errors):
 *   V1 a (template, variant) pair repeats within 6 shots · V2 a chapter uses fewer than 5 templates (3 when it has ≤ 4
 *   frames) · V3 a chapter has no signature shot (title excluded) or custom frame.
 *   DNA, only when some frame has a role (script.src.txt `### hook|core|case|action`); content chapters = all but the
 *   first and last: D1 roles in hook → core → case → action order, none missing · D2 the chapter's second frame opens
 *   with objective · D3 an antipattern and an exercise shot · D4 quiz only in the last content chapter · D5 an exercise
 *   frame has role action.
 */
function varietyWarnings({ flat, out, script, byNo }) {
  const w = [];
  flat.forEach((s, i) => {
    const j = flat.slice(Math.max(0, i - 5), i).findIndex((x) => x.template === s.template && x.variant === s.variant);
    if (j >= 0) w.push(`frame ${s.frame}: ${s.template}/${s.variant} repeats within 6 shots`);
  });
  const chapters = script.chapters.map((c) => ({ id: c.id, frames: c.frames.map((f) => f.id), roles: c.frames.map((f) => f.role) }));
  for (const c of chapters) {
    const shots = flat.filter((s) => c.frames.includes(s.frame));
    const custom = out.some((f) => f.custom && c.frames.includes(f.no));
    const distinct = new Set(shots.map((s) => s.template)).size + (custom ? 1 : 0);
    const need = c.frames.length <= 4 ? 3 : 5;
    if (distinct < need) w.push(`${c.id}: ${distinct} templates, fewer than ${need}`);
    if (!custom && !shots.some((s) => s.signature)) w.push(`${c.id}: no signature shot`);
  }
  const roleOf = new Map(script.chapters.flatMap((c) => c.frames.map((f) => [f.id, f.role])));
  if (![...roleOf.values()].some(Boolean)) return w; // dna: off
  const ORDER = ["hook", "core", "case", "action"];
  const content = chapters.slice(1, -1);
  content.forEach((c, ci) => {
    const seq = c.roles.filter(Boolean);
    const firstIdx = ORDER.map((r) => seq.indexOf(r));
    if (firstIdx.some((x) => x < 0) || firstIdx.some((x, k) => k && x < firstIdx[k - 1])) w.push(`${c.id}: DNA roles not in hook → core → case → action order (D1)`);
    const second = c.frames[1];
    if (second && flat.find((s) => s.frame === second)?.family !== "objective") w.push(`${c.id}: the second frame does not open with objective (D2)`);
    const fams = new Set(flat.filter((s) => c.frames.includes(s.frame)).map((s) => s.family));
    if (!fams.has("antipattern") || !fams.has("exercise")) w.push(`${c.id}: no antipattern or no exercise shot (D3)`);
    if (fams.has("quiz") && ci !== content.length - 1) w.push(`${c.id}: quiz outside the last content chapter (D4)`);
    for (const s of flat.filter((x) => c.frames.includes(x.frame) && x.family === "exercise")) {
      if (roleOf.get(s.frame) !== "action") w.push(`frame ${s.frame}: exercise frame without role action (D5)`);
    }
  });
  return w;
}

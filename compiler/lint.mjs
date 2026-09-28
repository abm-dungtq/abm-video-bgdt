#!/usr/bin/env node
// lint.mjs — check scenes.json before compiling, and resolve every shot window and reveal time (compile reuses it).
//
//   node tools/compiler/lint.mjs [--estimated]
//
// Errors: scenes.json shape (C2), template/variant, slots against the template schema, cues that do not resolve,
// shots that do not tile [0, duration] (±0.2 s) or break the template's duration range, custom share above
// scenes.customBudget (legacy projects excepted), glyphs the fonts lack, and two consecutive shots (also across
// frames) with the same template+variant or the same family.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate } from "./schema.mjs";
import { frameCtx, resolve, resolveRange } from "./cues.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TEMPLATES = resolvePath(HERE, "../templates/scenes");
const TOL = 0.2;
const r2 = (x) => Math.round(x * 100) / 100;

const SCENES_SCHEMA = {
  type: "object", required: ["version", "frames"],
  properties: {
    version: { type: "integer", enum: [1] }, seed: { type: "integer" },
    frames: { type: "array", minItems: 1, items: {
      type: "object", required: ["frame"], additionalProperties: false,
      properties: {
        frame: { type: "integer", minimum: 1 }, custom: { type: "boolean" }, seed: { type: "integer" },
        rail: { type: ["object", "null"], required: ["slots", "at"], additionalProperties: false, properties: {
          slots: { type: "array", minItems: 2, maxItems: 4, items: { type: "string", minLength: 1, maxLength: 18 } },
          at: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } } } },
        role: { type: "string" },
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

/** Reveal times: explicit cue, else the next keyword in the window ("kw"), else spread; always in key order. */
function revealTimes(keys, schema, spec, ctx, a, b) {
  const kws = ctx.tokens.map((t, i) => [t, ctx.times[i].start]).filter(([t, s]) => t.keyword && s >= a - 0.05 && s < b - 0.3).map(([, s]) => r2(s));
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

/**
 * Resolve every frame. Returns { frames: [{ no, custom, duration, shots: [{ spec, schema, mod, variant, a, b, times }] }],
 * errors, warnings, stats }.
 */
export async function analyze({ P, cfg, estimated = false, legacy = false, variety = true }) {
  const errors = [], warnings = [];
  const read = (f) => JSON.parse(readFileSync(join(P, f), "utf8"));
  const scenes = read("scenes.json");
  const script = read("script.json");
  const audioMeta = estimated ? null : read("audio_meta.json");
  const board = readStoryboard(readFileSync(join(P, "STORYBOARD.md"), "utf8"));
  const rate = existsSync(join(P, ".probe/rate.json")) ? read(".probe/rate.json").syllables_per_s : script.meta?.rate ?? 4.3;
  const glyphs = [...(cfg.guard?.missingGlyphs ?? "①②③✳✕✓→")];
  const types = new Set(cfg.scenes?.types ?? []);

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

  const out = [];
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
      if (d.min != null && len < d.min - 0.01) errors.push(`${at}: ${len} s is shorter than the template minimum ${d.min} s`);
      if (d.max != null && len > d.max + 0.01) errors.push(`${at}: ${len} s is longer than the template maximum ${d.max} s`);
      if (!variety) { /* template CI puts variants side by side on purpose */ }
      else if (prevShot && prevShot.template === s.template && prevShot.variant === variant) errors.push(`${at}: same template and variant as the previous shot`);
      else if (prevShot && prevShot.family === tpl.schema.family) errors.push(`${at}: same family "${tpl.schema.family}" as the previous shot`);
      let times = {};
      const valid = !validate(tpl.schema.slots, s.slots).length;
      if (valid) {
        try { times = revealTimes(tpl.mod.revealKeys(s.slots, variant), tpl.schema, s, ctx, a, b); } catch (e) { errors.push(`${at}: ${e.message}`); }
      }
      const firstKey = Math.min(...Object.values(times).map((v) => (Array.isArray(v) ? v[0] : v)));
      if (Number.isFinite(firstKey) && firstKey - a > 2.0) warnings.push(`${at}: the first reveal comes ${r2(firstKey - a)} s after the shot starts: move the window start nearer its first keyword`);
      shots.push({ spec: s, schema: tpl.schema, mod: tpl.mod, variant, a, b, times });
      prevShot = { template: s.template, variant, family: tpl.schema.family };
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
  const custom = out.filter((f) => f.custom).length;
  const budget = cfg.scenes?.customBudget ?? 0.15;
  if (out.length && custom / out.length > budget + 1e-9) {
    const msg = `custom frames ${custom}/${out.length} = ${Math.round((100 * custom) / out.length)} % is above scenes.customBudget ${Math.round(budget * 100)} %`;
    (legacy ? warnings : errors).push(msg);
  }
  const shots = out.reduce((n, f) => n + (f.shots?.length ?? 0), 0);
  return { frames: out, errors, warnings, stats: { frames: out.length, shots, custom }, scenes };
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

// gate-checks.mjs — gate verifiers for abm-video. `gate <n> --check` runs them all in one pass and records the result in
// .abm/gates/<n>-check.json; an approval runs them again and refuses on any failure.
// In a directed lesson (the agent making the video writes scenes.json, references/direction.md) the agent approves
// gates 2 and 3 itself on these checks, so they also hold the lines it could otherwise move: the storyboard lint,
// the on-screen copy (visible-check) and the thresholds of video.config.json (configGuard).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chapterOverlap } from "../compiler/scorecard.mjs";
import { isDirected } from "../compiler/lint.mjs";
import { SKILL_ROOT as INSTALLED_SKILL } from "./paths.mjs";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function findTool(P, f) {
  const p1 = join(P, "tools", f);
  if (existsSync(p1)) return p1;
  const p2 = join(SKILL_ROOT, "scripts", f);
  if (existsSync(p2)) return p2;
  return null;
}

function findLint(P) {
  const p1 = join(P, "tools/compiler/lint.mjs");
  if (existsSync(p1)) return p1;
  const p2 = join(SKILL_ROOT, "compiler/lint.mjs");
  if (existsSync(p2)) return p2;
  return null;
}

const readCfg = (P) => (existsSync(join(P, "video.config.json")) ? JSON.parse(readFileSync(join(P, "video.config.json"), "utf8")) : {});
const run = (P, file, args = []) => {
  const r = spawnSync(process.execPath, [file, ...args], { cwd: P, encoding: "utf8" });
  return { ok: r.status === 0, detail: ((r.stdout || "") + (r.stderr ? "\n" + r.stderr : "")).trim() };
};
const lintCheck = (P, args = []) => () => {
  const lintPath = findLint(P);
  if (!lintPath) return { ok: false, detail: "compiler/lint.mjs missing" };
  return run(P, lintPath, args);
};
const toolCheck = (P, f, args = []) => () => {
  const tool = findTool(P, f);
  if (!tool) return { ok: false, detail: `${f} missing; run new-project.mjs ${P} --update-tools` };
  return run(P, tool, args);
};

// The thresholds a directed lesson may not loosen, against templates/video.config.json of the installed skill (never
// the project's copy of the tools, which the agent could edit).
// looser(project value, default) → true when the project's value lets more through. A missing key counts as loosened:
// the rule it feeds is off.
const GUARD = {
  2: {
    "depth.factsPerChapter": (v, d) => !(v >= d),
    "depth.examplePerChapter": (v, d) => d === true && v !== true,
    "depth.maxListRun": (v, d) => !(v >= 1 && v <= d),
  },
  3: {
    "scenes.maxUsesPerTemplate": (v, d) => !(v >= 1 && v <= d),
    "scenes.pairGap": (v, d) => !(v >= d),
    "scenes.customBudget": (v, d) => v !== undefined && !(v <= d),
    "scenes.uniqueChapterOpeners": (v, d) => d === true && v !== true,
    "scenes.director": (v, d) => d === true && v !== true,
    "voice.maxWer": (v, d) => !(v <= d),
    "voice.maxHeadDb": (v, d) => !(v <= d),
    "voice.maxTailDb": (v, d) => !(v <= d),
  },
};
const DEFAULTS_EXTRA = { "scenes.customBudget": 0.15 }; // lint's default when the template leaves it out
const at = (o, path) => path.split(".").reduce((v, k) => (v == null ? v : v[k]), o);

/** Loosened thresholds of video.config.json for gate n ("2" or "3"): [] when none. */
export function configGuard(P, n) {
  const cfg = readCfg(P);
  const dflt = JSON.parse(readFileSync(join(INSTALLED_SKILL, "templates/video.config.json"), "utf8"));
  const out = [];
  if (!isDirected(cfg.scenes)) out.push(`scenes.authoring is "${cfg.scenes?.authoring ?? "solver"}": an agent-approved lesson is directed ("director")`);
  for (const [key, looser] of Object.entries(GUARD[n] ?? {})) {
    const d = at(dflt, key) ?? DEFAULTS_EXTRA[key];
    const v = at(cfg, key);
    if (looser(v, d)) out.push(`${key} is ${JSON.stringify(v ?? null)}, looser than the skill's ${JSON.stringify(d)}`);
  }
  return out;
}
const configCheck = (P, n) => () => {
  const bad = configGuard(P, n);
  return bad.length ? { ok: false, detail: bad.join("; ") } : { ok: true, detail: "thresholds at the skill's defaults or stricter" };
};

function asrCheck(P) {
  const reportPath = join(P, "audio/asr-report.json");
  if (!existsSync(reportPath)) {
    return { ok: false, detail: "audio/asr-report.json missing" };
  }
  let list;
  try {
    list = JSON.parse(readFileSync(reportPath, "utf8"));
  } catch (e) {
    return { ok: false, detail: `failed to parse audio/asr-report.json: ${e.message}` };
  }
  const cfgPath = join(P, "video.config.json");
  const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
  const maxWer = cfg.voice?.maxWer ?? 0.2;
  const maxTailDb = cfg.voice?.maxTailDb ?? -40;
  const acceptedPath = join(P, "audio/qa-accepted.txt");
  const acceptedContent = existsSync(acceptedPath) ? readFileSync(acceptedPath, "utf8") : "";
  const acceptedLines = new Set(acceptedContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  const isAccepted = (id) => acceptedLines.has(id) || acceptedContent.includes(id);

  const failed = [];
  for (const r of list) {
    const why = [];
    if (r.missing) why.push(`missing ${r.missing}`);
    if (typeof r.wer !== "number" || r.wer > 2 * maxWer) why.push(`WER ${r.wer ?? "?"}`);
    if (typeof r.tail_db === "number" && r.tail_db > maxTailDb) why.push(`end cut ${r.tail_db} dBFS`);
    if (r.edge) why.push("edge word wrong");
    if (why.length && !isAccepted(r.id)) failed.push(`${r.id}: ${why.join(", ")}`);
  }
  if (failed.length > 0) {
    return { ok: false, detail: failed.join(", ") };
  }
  return { ok: true, detail: `${list.length} clips ok` };
}

export function gateChecks(P, n) {
  const gate = String(n);
  const checks = [];

  if (gate === "1") {
    return [];
  }

  if (gate === "2") {
    // 1. facts: facts-check.mjs --urls exits 0
    checks.push({
      name: "facts",
      run: () => {
        const tool = findTool(P, "facts-check.mjs");
        if (!tool || !existsSync(tool)) {
          return { ok: false, detail: "facts-check.mjs missing" };
        }
        const r = spawnSync(process.execPath, [tool, "--urls"], { cwd: P, encoding: "utf8" });
        const out = ((r.stdout || "") + (r.stderr ? "\n" + r.stderr : "")).trim();
        if (r.status !== 0) {
          return { ok: false, detail: out };
        }
        if (!out.includes("URL(s) checked")) {
          return { ok: false, detail: `facts-check in ${tool} does not check URLs; run new-project.mjs ${P} --update-tools` };
        }
        return { ok: true, detail: out };
      },
    });

    // 2. script: script-to-md.mjs --check script.json exits 0
    checks.push({
      name: "script",
      run: () => {
        const tool = findTool(P, "script-to-md.mjs");
        if (!tool || !existsSync(tool)) {
          return { ok: false, detail: "script-to-md.mjs missing" };
        }
        const r = spawnSync(process.execPath, [tool, "--check", "script.json"], { cwd: P, encoding: "utf8" });
        const out = ((r.stdout || "") + (r.stderr ? "\n" + r.stderr : "")).trim();
        return { ok: r.status === 0, detail: out };
      },
    });

    // 3. hints: read script.json, check (a) and (b)
    checks.push({
      name: "hints",
      run: () => {
        const scriptPath = join(P, "script.json");
        if (!existsSync(scriptPath)) {
          return { ok: false, detail: "script.json missing" };
        }
        let script;
        try {
          script = JSON.parse(readFileSync(scriptPath, "utf8"));
        } catch (e) {
          return { ok: false, detail: `failed to parse script.json: ${e.message}` };
        }

        const problems = [];
        const frames = (script.chapters ?? []).flatMap((c) => c.frames ?? []);
        for (let i = 1; i < frames.length; i++) {
          const prev = frames[i - 1];
          const curr = frames[i];
          if (curr.scene_hint && prev.scene_hint && curr.scene_hint === prev.scene_hint) {
            problems.push(`frame ${curr.id}: repeated scene_hint "${curr.scene_hint}"`);
          }
        }

        const cfgPath = join(P, "video.config.json");
        const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
        const REQUIRED_HINTS = ["objective", "antipattern", "case", "exercise"];
        const dnaWarnings = [];
        const dnaErrors = [];

        if (cfg.dna?.enabled) {
          const chapters = script.chapters ?? [];
          const contentChapters = chapters.slice(1, -1);
          contentChapters.forEach((ch, idx) => {
            const chId = ch.id ?? `ch${idx + 1}`;
            const hints = new Set((ch.frames ?? []).map((f) => f.scene_hint).filter(Boolean));
            for (const req of REQUIRED_HINTS) {
              if (!hints.has(req)) {
                const msg = `${chId}: missing ${req}`;
                if (cfg.dna?.strict === true) {
                  dnaErrors.push(msg);
                } else {
                  dnaWarnings.push(msg);
                }
              }
            }
          });
        }

        // free structure (projects made from 0.8.0 on): at most `maxExercise` exercise frames, and no two content
        // chapters built from mostly the same scene hints
        if (cfg.structure) {
          const maxEx = cfg.structure.maxExercise ?? 1;
          const ex = frames.filter((f) => f.scene_hint === "exercise").length;
          if (ex > maxEx) problems.push(`${ex} exercise frames, max ${maxEx}: keep one at most, or none`);
          const limit = cfg.structure.maxChapterHintOverlap ?? 0.5;
          if (cfg.structure.distinctChapterArcs !== false) {
            for (const p of chapterOverlap(script.chapters ?? []).pairs.filter((x) => x.j > limit)) {
              problems.push(`${p.a} and ${p.b} share scene hints ${p.shared.join(", ")} (overlap ${p.j} > ${limit}): give one of them a different arc from script-authoring.md § Chapter arcs`);
            }
          }
        }

        for (const w of dnaWarnings) {
          console.warn(`⚠ ${w}`);
        }

        const allErrors = [...problems, ...dnaErrors];
        if (allErrors.length > 0) {
          return { ok: false, detail: allErrors.join(", ") };
        }
        return { ok: true, detail: "hints ok" };
      },
    });

    if (isDirected(readCfg(P).scenes)) {
      // the director writes scenes.json before the voice exists: lint it on the estimated durations
      checks.push({
        name: "lint",
        run: () => {
          if (!existsSync(join(P, "scenes.json"))) return { ok: false, detail: "scenes.json missing: write it from references/direction.md before gate 2" };
          if (!existsSync(join(P, "STORYBOARD.md"))) return { ok: false, detail: "STORYBOARD.md missing: rerun the script stage" };
          return lintCheck(P, ["--estimated"])();
        },
      });
      checks.push({ name: "config", run: configCheck(P, "2") });
    }

    return checks;
  }

  if (gate === "2b") {
    const privTool = findTool(P, "privacy-check.mjs");
    if (privTool && existsSync(privTool)) {
      checks.push({
        name: "privacy",
        run: () => {
          const r = spawnSync(process.execPath, [privTool], { cwd: P, encoding: "utf8" });
          const out = ((r.stdout || "") + (r.stderr ? "\n" + r.stderr : "")).trim();
          return { ok: r.status === 0, detail: out };
        },
      });
    }
    return checks;
  }

  if (gate === "3") {
    checks.push({
      name: "asr",
      run: () => asrCheck(P),
    });
    if (isDirected(readCfg(P).scenes)) {
      checks.push({ name: "lint", run: lintCheck(P) });
      checks.push({ name: "visible", run: toolCheck(P, "visible-check.mjs") });
      checks.push({ name: "config", run: configCheck(P, "3") });
    }
    return checks;
  }

  if (gate === "4") {
    checks.push({ name: "lint", run: lintCheck(P) });
    checks.push({
      name: "asr",
      run: () => asrCheck(P),
    });
    // a stretch of bare ground in the draft (a frame whose copy never came in); only projects whose tools have it
    if (findTool(P, "blank-check.mjs") && existsSync(join(P, "renders/draft.mp4"))) {
      checks.push({ name: "blank", run: toolCheck(P, "blank-check.mjs", ["renders/draft.mp4"]) });
    }
    return checks;
  }

  return checks;
}

/** Run every check of gate n, print ✓/✗ per check, record .abm/gates/<n>-check.json; true when all pass. */
export function runGateChecks(P, n) {
  const checks = gateChecks(P, n);
  const results = [];
  for (const c of checks) {
    const res = c.run();
    results.push({ name: c.name, ok: !!res.ok, detail: String(res.detail ?? "").slice(0, 4000) });
    console.log(res.ok ? `✓ ${c.name}` : `✗ ${c.name}: ${res.detail}`);
  }
  const ok = results.every((r) => r.ok);
  mkdirSync(join(P, ".abm/gates"), { recursive: true });
  writeFileSync(join(P, `.abm/gates/${n}-check.json`), JSON.stringify({ gate: String(n), at: new Date().toISOString(), ok, checks: results }, null, 1));
  return ok;
}

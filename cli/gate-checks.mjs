// gate-checks.mjs — gate verifiers for abm-video.
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chapterOverlap } from "../compiler/scorecard.mjs";

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
    return checks;
  }

  if (gate === "4") {
    checks.push({
      name: "lint",
      run: () => {
        const lintPath = findLint(P);
        if (!lintPath || !existsSync(lintPath)) {
          return { ok: false, detail: "compiler/lint.mjs missing" };
        }
        const r = spawnSync(process.execPath, [lintPath], { cwd: P, encoding: "utf8" });
        const out = ((r.stdout || "") + (r.stderr ? "\n" + r.stderr : "")).trim();
        return { ok: r.status === 0, detail: out };
      },
    });
    checks.push({
      name: "asr",
      run: () => asrCheck(P),
    });
    return checks;
  }

  return checks;
}

export function runGateChecks(P, n) {
  const checks = gateChecks(P, n);
  let allOk = true;
  for (const c of checks) {
    const res = c.run();
    if (res.ok) {
      console.log(`✓ ${c.name}`);
    } else {
      console.log(`✗ ${c.name}: ${res.detail}`);
      allOk = false;
    }
  }
  return allOk;
}

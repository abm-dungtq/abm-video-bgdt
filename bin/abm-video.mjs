#!/usr/bin/env node
// abm-video — the lesson-video pipeline as one CLI with recorded state and gates.
//
//   abm-video next                                 the single next action (always start here)
//   abm-video doctor [--fix] [--json]              check this machine; --fix installs the HeyGen skills when missing
//   abm-video init <dir> [--title "…"] [--theme abm-brand] [--minutes 3]
//   abm-video status                               stages and gates of this project
//   abm-video run <stage> [--force] [--apply] [--concurrency N]
//   abm-video gate <n> --request | --approve "<user's words>" | --reject "<changes>"
//   abm-video tts [--concurrency N]                pending narration clips (same as run tts)
//   abm-video tts --text "<text>" --out <wav>      one clip (probes)
//   abm-video migrate                              bring a project made before this CLI under it (all frames custom)
//
// Stages: doctor init probe script [screens] tts voice storyboard compile karaoke assemble draft final clean.
// A stage refuses to run until the stages and gates it needs are done on the current files.
// --force skips those checks and is meant only for test folders.

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { approve, gateOk, gateStatus, GATES, reject, request } from "../cli/gates.mjs";
import { doctorFresh, nextAction, print } from "../cli/next.mjs";
import { findProject, scriptsDir, SKILL_ROOT, TOOLS_ROOT } from "../cli/paths.mjs";
import { activeStages, STAGES } from "../cli/stages.mjs";
import { isStale, load, markStage, save } from "../cli/state.mjs";
import { batch, one } from "../cli/tts.mjs";
import { migrate } from "../cli/migrate.mjs";

const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt);
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

const P = findProject();
const CLI = P && TOOLS_ROOT === `${P}/tools` ? "node tools/bin/abm-video.mjs" : `node ${TOOLS_ROOT}/bin/abm-video.mjs`;
const needProject = () => P ?? die(`no video.config.json here or above (create a project: ${CLI} init <dir> --title "…")`);
const config = () => JSON.parse(readFileSync(join(needProject(), "video.config.json"), "utf8"));

function doctor(extra = []) {
  return spawnSync(process.execPath, [join(SKILL_ROOT, "setup/doctor.mjs"), ...extra], { stdio: "inherit" }).status ?? 1;
}

async function ctx(Pd, cfg) {
  const SC = scriptsDir(Pd);
  // machine discovery (skills dir, VieNeu checkout) is not pinned per project: always the skill's own module
  const machine = await import(pathToFileURL(join(SKILL_ROOT, "scripts/lib/machine.mjs")).href);
  return {
    P: Pd, cfg, SC, args: argv, opt,
    SK: `${machine.findSkillsDir()}/faceless-explainer/scripts`,
    HF: `hyperframes@${cfg.cli.pin}`,
    cache: (process.env.HF_CACHE_DIR ?? join(Pd, ".hf-cache")).replace(/\\/g, "/"),
    venv: () => machine.findVieneuDir(Pd) ?? die("VieNeu-TTS not found: run node setup/setup.mjs or set VIENEU_TTS_DIR"),
  };
}

async function runStage(name) {
  const Pd = needProject();
  const cfg = config();
  const stages = activeStages(cfg);
  const st = stages.find((x) => x.name === name) ?? die(`unknown stage "${name}" (stages: ${stages.map((x) => x.name).join(" ")})`);
  const s = load(Pd);
  if (argv.includes("--force")) {
    console.log("⚠ forced: checks skipped");
  } else if (name !== "doctor") {
    if (!doctorFresh(s)) die(`run: ${CLI} doctor first`);
    for (const n of st.needs.stages) {
      const need = stages.find((x) => x.name === n);
      if (need && isStale(s, Pd, n, need.inputs, need.needs.stages)) die(`${name} needs stage ${n} done on the current inputs (${CLI} next)`);
    }
    for (const g of st.needs.gates) if (!gateOk(s, Pd, g)) die(`${name} needs gate ${g} approved on the current files`);
  }
  let code;
  try {
    code = await st.run(await ctx(Pd, cfg));
  } catch (e) {
    die(`stage ${name} failed: ${e.message}`);
  }
  if (code === 2) {
    console.error(`stage ${name}: waiting for the files above, then rerun`);
    process.exit(1);
  }
  if (code) die(`stage ${name} failed (exit ${code})`);
  const after = load(Pd);
  markStage(after, Pd, name, st.inputs);
  save(Pd, after);
  console.log(`stage ${name} done`);
}

switch (cmd) {
  case "next": {
    if (!P) {
      print({ next: "create the lesson project", run: `${CLI} init <dir> --title "<lesson title>" --minutes <length> [--theme abm-brand]`,
        why: "no video.config.json here or above" });
      break;
    }
    print(await nextAction(P, config(), CLI));
    break;
  }
  case "doctor": {
    const code = doctor(argv.slice(1));
    if (P && code === 0 && !argv.includes("--json")) {
      const s = load(P);
      markStage(s, P, "doctor", []);
      save(P, s);
    }
    process.exit(code);
  }
  case "init": {
    const dir = argv[1] && !argv[1].startsWith("--") ? argv[1] : die('usage: abm-video init <dir> [--title "…"] [--theme <name>] [--minutes <n>]');
    if (doctor() !== 0) die("doctor failed: fix the items above (or run abm-video doctor --fix), then init again");
    const r = spawnSync(process.execPath, [join(SKILL_ROOT, "scripts/new-project.mjs"), ...argv.slice(1)], { stdio: "inherit" });
    if (r.status) process.exit(r.status);
    const Pd = resolve(dir).replace(/\\/g, "/");
    const s = load(Pd);
    markStage(s, Pd, "doctor", []);
    markStage(s, Pd, "init", []);
    save(Pd, s);
    console.log(`\nnext: cd ${Pd} && node tools/bin/abm-video.mjs next`);
    break;
  }
  case "status": {
    const Pd = needProject();
    const cfg = config();
    const s = load(Pd);
    for (const st of activeStages(cfg)) {
      const rec = s.stages[st.name];
      const state = !rec ? "pending" : isStale(s, Pd, st.name, st.inputs, st.needs.stages) ? "stale" : "done";
      console.log(`${st.name.padEnd(11)} ${state.padEnd(8)} ${rec?.at ?? ""}`);
    }
    for (const n of Object.keys(GATES)) {
      if (n === "2b" && cfg.screens !== true) continue;
      console.log(`gate ${n}  ${gateStatus(s, Pd, n)}${s.gates[n]?.note ? `  — ${s.gates[n].note}` : ""}`);
    }
    break;
  }
  case "run": {
    if (!argv[1]) die(`usage: abm-video run <stage> (stages: ${STAGES.map((x) => x.name).join(" ")})`);
    await runStage(argv[1]);
    break;
  }
  case "gate": {
    const Pd = needProject();
    const n = argv[1] ?? die('usage: abm-video gate <n> --request | --approve "<note>" | --reject "<note>"');
    try {
      if (argv.includes("--request")) process.stdout.write(request(Pd, n, CLI));
      else if (argv.includes("--approve")) { approve(Pd, n, opt("--approve", "")); console.log(`gate ${n} approved`); }
      else if (argv.includes("--reject")) { reject(Pd, n, opt("--reject", "")); console.log(`gate ${n} rejected`); }
      else die("gate needs --request, --approve or --reject");
    } catch (e) {
      die(e.message);
    }
    break;
  }
  case "tts": {
    const Pd = needProject();
    if (argv.includes("--text")) {
      const out = opt("--out") ?? die("tts --text needs --out <wav>");
      const d = await one(Pd, opt("--text"), out).catch((e) => die(`tts: ${e.message}`));
      console.log(`tts: ${out} ${d.toFixed(2)} s`);
    } else {
      await runStage("tts");
    }
    break;
  }
  case "migrate": {
    try {
      const r = migrate(needProject());
      console.log(`migrate: ${r.frames} frames marked custom, stages done: ${r.stamped.join(" ")}, gates historic`);
    } catch (e) {
      die(`migrate: ${e.message}`);
    }
    break;
  }
  case undefined:
  case "--help":
  case "-h":
    console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 16).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    console.log("commands: doctor init status next run gate tts migrate");
    break;
  default:
    die(`unknown command "${cmd}" (commands: doctor init status next run gate tts migrate)`);
}

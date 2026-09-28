#!/usr/bin/env node
// cli-tests.mjs — gate and state behaviour of bin/abm-video.mjs on a scratch copy of a delivered project.
//
//   node dev/cli-tests.mjs [--source <delivered project>]
//
// Scratch folder: <workspace>/.regress/cli-test (recreated each run). Needs video.config.json, script.json and
// SCRIPT-REVIEW.md in the source (default: the Hermes lesson beside the skill's workspace, or $ABM_REGRESS_SOURCE).

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isStale, load, markStage, save } from "../cli/state.mjs";
import { activeStages } from "../cli/stages.mjs";

const S = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const SRC = resolve(argv.includes("--source") ? argv[argv.indexOf("--source") + 1]
  : process.env.ABM_REGRESS_SOURCE ?? "D:/TQD/Claude-Video/videos/hermes-agent-explainer");
const R = resolve(process.env.ABM_REGRESS_DIR ?? "D:/TQD/Claude-Video/.regress", "cli-test");

rmSync(R, { recursive: true, force: true });
mkdirSync(R, { recursive: true });
for (const f of ["video.config.json", "script.json", "SCRIPT-REVIEW.md"]) cpSync(join(SRC, f), join(R, f));
const cfg = JSON.parse(readFileSync(join(R, "video.config.json"), "utf8"));
const s = load(R);
for (const name of ["doctor", "init", "probe", "script"]) markStage(s, R, name, activeStages(cfg).find((x) => x.name === name).inputs);
save(R, s);

const cli = (...a) => {
  const r = spawnSync(process.execPath, [join(S, "bin/abm-video.mjs"), ...a], { cwd: R, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
let passed = 0;
const cases = [];
const check = (name, ok, detail) => {
  cases.push(name);
  if (ok) { passed++; console.log(`pass ${name}`); } else console.log(`FAIL ${name}\n${detail}`);
};

let r = cli("gate", "2", "--request");
check("gate 2 --request writes .abm/gates/2.md", r.code === 0 && existsSync(join(R, ".abm/gates/2.md")), r.out + r.err);

r = cli("run", "tts");
check("run tts before approval is refused", r.code === 1 && r.err.includes("needs gate 2"), r.out + r.err);

cli("gate", "2", "--approve", "ok");
const sj = join(R, "script.json");
writeFileSync(sj, readFileSync(sj, "utf8") + " ");
r = cli("run", "tts");
check("run tts after the script changed is refused", r.code === 1 && r.err.includes("needs gate 2"), r.out + r.err);

r = cli("status");
check("status shows the stale gate", r.out.includes("2  approved (stale)"), r.out + r.err);

r = cli("next");
check("next prints one NEXT line", r.code === 0 && r.out.split("\n").filter((l) => l.startsWith("NEXT:")).length === 1, r.out + r.err);

// rerunning doctor (it expires after 7 days) must not make the whole pipeline stale
const s2 = load(R);
const initAt = s2.stages.init.at;
await new Promise((r) => setTimeout(r, 5));
markStage(s2, R, "doctor", []);
save(R, s2);
const init = activeStages(cfg).find((x) => x.name === "init");
check("a fresh doctor run leaves init current", !isStale(load(R), R, "init", init.inputs, init.needs.stages) && load(R).stages.init.at === initAt, "init went stale");

console.log(passed === cases.length ? `cli-tests ok (${passed}/${cases.length})` : `cli-tests FAILED (${passed}/${cases.length})`);
process.exit(passed === cases.length ? 0 : 1);

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
import { hashes, isStale, load, markStage, save } from "../cli/state.mjs";
import { GATES } from "../cli/gates.mjs";
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

// ── next: one scenario per case, each in its own folder ─────────────────────────
const stageOf = (name) => activeStages(cfg).find((x) => x.name === name);
function scenario(name, prepare, env = {}) {
  const D = join(dirname(R), `cli-next-${name}`);
  rmSync(D, { recursive: true, force: true });
  mkdirSync(D, { recursive: true });
  for (const f of ["video.config.json", "script.json", "SCRIPT-REVIEW.md"]) cpSync(join(SRC, f), join(D, f));
  mkdirSync(join(D, ".probe"), { recursive: true }); // gate 1 artifacts (content does not matter here)
  for (const f of ["rate.wav", "pronunciation.md"]) writeFileSync(join(D, ".probe", f), f);
  const st = load(D);
  prepare(D, st);
  save(D, st);
  const r = spawnSync(process.execPath, [join(S, "bin/abm-video.mjs"), "next"], { cwd: D, encoding: "utf8", env: { ...process.env, ...env } });
  return `${r.stdout}${r.stderr}`;
}
const done = (D, st, ...names) => { for (const n of names) markStage(st, D, n, stageOf(n).inputs); };
const approveAll = (D, st, ...gates) => { for (const g of gates) st.gates[g] = { status: "approved", artifacts: hashes(D, GATES[g].artifacts) }; };

let out = scenario("doctor", (D, st) => { done(D, st, "doctor"); st.stages.doctor.at = "2026-01-01T00:00:00.000Z"; });
check("next: an old doctor run asks for doctor", /NEXT: check this machine[\s\S]*RUN: .*doctor/.test(out), out);

out = spawnSync(process.execPath, [join(S, "bin/abm-video.mjs"), "next"], { cwd: dirname(R), encoding: "utf8" }).stdout;
check("next: outside a project asks for init", /NEXT: create the lesson project[\s\S]*RUN: .*init/.test(out), out);

out = scenario("facts", (D, st) => {
  mkdirSync(join(D, "capture/extracted"), { recursive: true });
  cpSync(join(S, "templates/visible-text.txt"), join(D, "capture/extracted/visible-text.txt"));
  done(D, st, "doctor", "init", "probe");
  approveAll(D, st, "1");
});
check("next: a template facts file asks for research", /NEXT: research the sources/.test(out), out);

out = scenario("gate", (D, st) => { done(D, st, "doctor", "init", "probe", "script"); st.gates["1"] = { status: "requested" }; });
check("next: a requested gate asks to show the user", /NEXT: show the user \.abm\/gates\/1\.md/.test(out), out);

out = scenario("api", (D, st) => done(D, st, "doctor", "init"), { VIENEU_API_URL: "http://127.0.0.1:1" });
check("next: the probe without the speech API asks to start it", /NEXT: start the speech API/.test(out), out);

out = scenario("custom", (D, st) => {
  cpSync(join(SRC, "STORYBOARD.md"), join(D, "STORYBOARD.md"));
  const n = [...readFileSync(join(D, "STORYBOARD.md"), "utf8").matchAll(/^## Frame (\d+) /gm)].map((m) => Number(m[1]));
  writeFileSync(join(D, "scenes.json"), JSON.stringify({ version: 1, frames: n.map((f) => ({ frame: f, custom: true })) }));
  done(D, st, "doctor", "init", "probe", "script", "tts", "voice", "storyboard", "compile");
  approveAll(D, st, "1", "2");
  st.legacy = true;
});
check("next: a custom frame without HTML asks to build it", /NEXT: build compositions\/frames\/.*custom-frame\.md/.test(out), out);

out = scenario("stale", (D, st) => {
  done(D, st, "doctor", "init", "probe", "script");
  approveAll(D, st, "1");
  st.stages.script.inputs["script.src.txt"] = "changed";
});
check("next: a changed input reruns its stage", /NEXT: run stage script[\s\S]*WHY: stage script is stale/.test(out), out);

console.log(passed === cases.length ? `cli-tests ok (${passed}/${cases.length})` : `cli-tests FAILED (${passed}/${cases.length})`);
process.exit(passed === cases.length ? 0 : 1);

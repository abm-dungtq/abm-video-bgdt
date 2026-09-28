#!/usr/bin/env node
// cli-tests.mjs — gate and state behaviour of bin/abm-video.mjs on a scratch copy of a delivered project.
//
//   node dev/cli-tests.mjs [--source <delivered project>]
//
// Scratch folder: <workspace>/.regress/cli-test (recreated each run). Needs video.config.json, script.json and
// SCRIPT-REVIEW.md in the source (default: the Hermes lesson beside the skill's workspace, or $ABM_REGRESS_SOURCE).

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
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
const rScript = JSON.parse(readFileSync(join(R, "script.json"), "utf8"));
const rFacts = new Set();
for (const sent of rScript.chapters.flatMap((c) => c.frames.flatMap((f) => f.sentences))) {
  for (const id of sent.facts ?? []) rFacts.add(id);
}
mkdirSync(join(R, "capture/extracted"), { recursive: true });
writeFileSync(join(R, "capture/extracted/visible-text.txt"), [...rFacts].map((id) => `[${id}] fixture fact`).join("\n"));
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

// ── init --minutes sizes the budget ─────────────────────────────────────────────
const M = join(dirname(R), "cli-minutes");
rmSync(M, { recursive: true, force: true });
spawnSync(process.execPath, [join(S, "scripts/new-project.mjs"), M, "--minutes", "3"], { encoding: "utf8" });
const budget = existsSync(join(M, "video.config.json")) ? JSON.parse(readFileSync(join(M, "video.config.json"), "utf8")).budget : null;
check("init --minutes 3 scales the budget", budget?.targetS.join() === "171,189" && budget.frames.join() === "14,20"
  && budget.syllables.total === 615, JSON.stringify(budget));

// ── gate 2 verifiers ──────────────────────────────────────────────────────────
const cliIn = (cwd, ...a) => new Promise((res) => {
  const p = spawn(process.execPath, [join(S, "bin/abm-video.mjs"), ...a], { cwd });
  let out = "", err = "";
  p.stdout.on("data", (d) => { out += d; });
  p.stderr.on("data", (d) => { err += d; });
  p.on("close", (code) => res({ code, out, err }));
});

const srv = createServer((req, res) => {
  if (req.url === "/ok") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  } else if (req.url === "/gone") {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  } else {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const port = srv.address().port;

const D = join(dirname(R), "cli-gate-verifiers");
rmSync(D, { recursive: true, force: true });
mkdirSync(D, { recursive: true });
for (const f of ["video.config.json", "script.json", "SCRIPT-REVIEW.md"]) cpSync(join(SRC, f), join(D, f));

const dScript = JSON.parse(readFileSync(join(D, "script.json"), "utf8"));
delete dScript.meta.approved;
writeFileSync(join(D, "script.json"), JSON.stringify(dScript, null, 1));
save(D, load(D));

const usedFacts = new Set();
for (const s of dScript.chapters.flatMap((c) => c.frames.flatMap((f) => f.sentences))) {
  for (const id of s.facts ?? []) usedFacts.add(id);
}

mkdirSync(join(D, "capture/extracted"), { recursive: true });
const writeFacts = (corruptId = null) => {
  const lines = [...usedFacts].map((id) =>
    `[${id}] fact description http://127.0.0.1:${port}${id === corruptId ? "/gone" : "/ok"}`
  );
  writeFileSync(join(D, "capture/extracted/visible-text.txt"), lines.join("\n"));
};
writeFacts();

// Ca A: dùng bản chép nguyên vẹn của SRC. gate 2 --check thoát 0.
let rGate = await cliIn(D, "gate", "2", "--check");
check("gate 2 --check passes on clean project", rGate.code === 0, rGate.out + rGate.err);

// Ca B: đổi một fact sang /gone. gate 2 --check thoát 1 và output chứa URL 404. Sau đó gate 2 --approve "x" phải thoát khác 0, và cả hai điều sau phải đúng:
// - JSON.parse(readFileSync(join(D, ".abm/state.json"), "utf8")).gates?.["2"]?.status !== "approved";
// - script.json trong D chưa có meta.approved.
const badFact = [...usedFacts][0];
writeFacts(badFact);
rGate = await cliIn(D, "gate", "2", "--check");
check("gate 2 --check fails on 404 URL", rGate.code === 1 && (rGate.out + rGate.err).includes("URL 404"), rGate.out + rGate.err);

const rApprove = await cliIn(D, "gate", "2", "--approve", "x");
const stateB = JSON.parse(readFileSync(join(D, ".abm/state.json"), "utf8"));
const scriptB = JSON.parse(readFileSync(join(D, "script.json"), "utf8"));
const approveB = rApprove.code !== 0
  && stateB.gates?.["2"]?.status !== "approved"
  && !scriptB.meta?.approved;
check("gate 2 --approve refuses when check fails", approveB, rApprove.out + rApprove.err);

// Ca C: đặt scene_hint của hai khung liền nhau giống nhau. gate 2 --check thoát 1 và output chứa frame.
writeFacts();
const scriptC = JSON.parse(readFileSync(join(D, "script.json"), "utf8"));
const allFrames = scriptC.chapters.flatMap((c) => c.frames);
allFrames[1].scene_hint = allFrames[0].scene_hint;
writeFileSync(join(D, "script.json"), JSON.stringify(scriptC, null, 1));
rGate = await cliIn(D, "gate", "2", "--check");
check("gate 2 --check fails on repeated consecutive scene_hint", rGate.code === 1 && (rGate.out + rGate.err).includes("frame"), rGate.out + rGate.err);

// Ca D: tools/facts-check.mjs là stub không kiểm tra URLs. gate 2 --check thoát 1 và output chứa does not check URLs.
const Dstub = join(dirname(R), "cli-gate-verifiers-stub");
rmSync(Dstub, { recursive: true, force: true });
mkdirSync(Dstub, { recursive: true });
for (const f of ["video.config.json", "script.json", "SCRIPT-REVIEW.md"]) cpSync(join(SRC, f), join(Dstub, f));
const stubScript = JSON.parse(readFileSync(join(Dstub, "script.json"), "utf8"));
delete stubScript.meta.approved;
writeFileSync(join(Dstub, "script.json"), JSON.stringify(stubScript, null, 1));
cpSync(join(D, "capture"), join(Dstub, "capture"), { recursive: true });
mkdirSync(join(Dstub, "tools"), { recursive: true });
writeFileSync(join(Dstub, "tools/facts-check.mjs"), 'console.log("facts-check ok");\n');
rGate = await cliIn(Dstub, "gate", "2", "--check");
check("gate 2 --check fails when facts-check lacks --urls", rGate.code === 1 && (rGate.out + rGate.err).includes("does not check URLs"), rGate.out + rGate.err);

srv.close();

console.log(passed === cases.length ? `cli-tests ok (${passed}/${cases.length})` : `cli-tests FAILED (${passed}/${cases.length})`);
process.exit(passed === cases.length ? 0 : 1);

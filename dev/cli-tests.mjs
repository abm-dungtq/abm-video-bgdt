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
import { gateStatus, GATES } from "../cli/gates.mjs";
import { activeStages } from "../cli/stages.mjs";
import { gateChecks } from "../cli/gate-checks.mjs";
import { headDb, tailDb } from "../cli/tts.mjs";

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

mkdirSync(join(R, ".probe"), { recursive: true });
writeFileSync(join(R, ".probe/rate.wav"), "rate-v1");
writeFileSync(join(R, ".probe/pronunciation.md"), "pron-v1");
cli("gate", "1", "--approve", "ok");
rmSync(join(R, ".probe/rate.wav"));
r = cli("status");
check("approved gate whose artifact file is deleted, clean not done: status approved (stale)",
  gateStatus(load(R), R, "1") === "approved (stale)" && r.out.includes("1  approved (stale)"), r.out + r.err);

const sc = load(R);
markStage(sc, R, "clean");
save(R, sc);
r = cli("status");
check("same but with clean marked done: status approved",
  gateStatus(load(R), R, "1") === "approved" && r.out.includes("1  approved") && !r.out.includes("1  approved (stale)"), r.out + r.err);

writeFileSync(join(R, ".probe/rate.wav"), "rate-v2-different");
r = cli("status");
check("clean done but the artifact changed: status approved (stale)",
  gateStatus(load(R), R, "1") === "approved (stale)" && r.out.includes("1  approved (stale)"), r.out + r.err);

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

// ── (a) tailDb ──────────────────────────────────────────────────────────────
function makeTestWav(pcm, sampleRate = 48000, extraChunk = false) {
  const fmt = Buffer.alloc(24);
  fmt.write("fmt ", 0);
  fmt.writeUInt32LE(16, 4);
  fmt.writeUInt16LE(1, 8); // PCM
  fmt.writeUInt16LE(1, 10); // mono
  fmt.writeUInt32LE(sampleRate, 12);
  fmt.writeUInt32LE(sampleRate * 2, 16);
  fmt.writeUInt16LE(2, 20); // block align
  fmt.writeUInt16LE(16, 22); // bits per sample

  const chunks = [fmt];
  if (extraChunk) {
    const junk = Buffer.alloc(20);
    junk.write("JUNK", 0);
    junk.writeUInt32LE(12, 4);
    junk.write("extra-header", 8);
    chunks.push(junk);
  }
  const data = Buffer.alloc(8);
  data.write("data", 0);
  data.writeUInt32LE(pcm.length, 4);
  chunks.push(data, pcm);

  const totalSize = chunks.reduce((a, b) => a + b.length, 0);
  const riff = Buffer.alloc(12);
  riff.write("RIFF", 0);
  riff.writeUInt32LE(4 + totalSize, 4);
  riff.write("WAVE", 8);

  return Buffer.concat([riff, ...chunks]);
}

const pcmSilence = Buffer.alloc(4800 * 2);
for (let i = 0; i < 2880; i++) {
  const s = Math.round(32767 * Math.sin(2 * Math.PI * 1000 * i / 48000));
  pcmSilence.writeInt16LE(s, i * 2);
}
const wavSilencePath = join(R, "test-tail-silence.wav");
writeFileSync(wavSilencePath, makeTestWav(pcmSilence, 48000, true));
const dbSilence = tailDb(wavSilencePath, 40);
check("tailDb on a generated WAV that ends in silence < -60", dbSilence < -60, `dbSilence=${dbSilence}`);

const pcmSine = Buffer.alloc(4800 * 2);
for (let i = 0; i < 4800; i++) {
  const s = Math.round(32767 * Math.sin(2 * Math.PI * 1000 * i / 48000));
  pcmSine.writeInt16LE(s, i * 2);
}
const wavSinePath = join(R, "test-tail-sine.wav");
writeFileSync(wavSinePath, makeTestWav(pcmSine, 48000, true));
const dbSine = tailDb(wavSinePath, 40);
check("tailDb on a generated WAV that ends with a full-scale sine > -20", dbSine > -20, `dbSine=${dbSine}`);

// headDb: the same sine-then-silence clip starts loud; a clip with 50 ms of lead silence starts quiet
const dbHeadSine = headDb(wavSilencePath, 20);
check("headDb on a generated WAV that starts with a full-scale sine > -20", dbHeadSine > -20, `dbHeadSine=${dbHeadSine}`);
const pcmLead = Buffer.alloc(4800 * 2);
for (let i = 2400; i < 4800; i++) pcmLead.writeInt16LE(Math.round(32767 * Math.sin(2 * Math.PI * 1000 * i / 48000)), i * 2);
const wavLeadPath = join(R, "test-head-silence.wav");
writeFileSync(wavLeadPath, makeTestWav(pcmLead, 48000, true));
const dbHeadSilence = headDb(wavLeadPath, 20);
check("headDb on a generated WAV that starts with silence < -60", dbHeadSilence < -60, `dbHeadSilence=${dbHeadSilence}`);

// gate 3 asr verifier: a clip cut at the end or wrong at an edge word fails unless accepted after listening;
// a cut start whose words are heard right passes (the edge rule catches a lost first consonant)
const Adir = join(dirname(R), "cli-gate-asr");
rmSync(Adir, { recursive: true, force: true });
mkdirSync(join(Adir, "audio"), { recursive: true });
writeFileSync(join(Adir, "video.config.json"), JSON.stringify({ voice: { maxWer: 0.2 } }));
const asrGate = (report) => {
  writeFileSync(join(Adir, "audio/asr-report.json"), JSON.stringify(report));
  return gateChecks(Adir, 3).find((x) => x.name === "asr").run();
};
const clean = { id: "s001-1", wer: 0, head_db: -80, tail_db: -70, edge: false };
check("gate 3 asr passes clean clips", asrGate([clean]).ok, JSON.stringify(asrGate([clean])));
let ra = asrGate([clean, { id: "s002-1", wer: 0, head_db: -15, tail_db: -70, edge: false }]);
check("gate 3 asr passes a clip cut at the start whose words are right", ra.ok, ra.detail);
ra = asrGate([clean, { id: "s002-1", wer: 0, head_db: -80, tail_db: -15, edge: false }]);
check("gate 3 asr fails a clip cut at the end", !ra.ok && ra.detail.includes("s002-1") && ra.detail.includes("end cut"), ra.detail);
ra = asrGate([{ id: "s003-1", wer: 0.1, head_db: -80, tail_db: -70, edge: true }]);
check("gate 3 asr fails a clip with a wrong edge word", !ra.ok && ra.detail.includes("edge"), ra.detail);
writeFileSync(join(Adir, "audio/qa-accepted.txt"), "s002-1\n");
ra = asrGate([clean, { id: "s002-1", wer: 0, head_db: -80, tail_db: -15, edge: false }]);
check("gate 3 asr passes an end-cut clip listed in qa-accepted.txt", ra.ok, ra.detail);

// tts-manifest --pending: a clip spoken from an older text is pending again; a clip without a text record is done
const Mdir = join(dirname(R), "cli-tts-pending");
rmSync(Mdir, { recursive: true, force: true });
mkdirSync(Mdir, { recursive: true });
for (const f of ["video.config.json", "script.json"]) cpSync(join(SRC, f), join(Mdir, f));
const manifest = (...a) => spawnSync(process.execPath, [join(S, "scripts/tts-manifest.mjs"), ...a], { cwd: Mdir, encoding: "utf8" });
manifest();
const job0 = JSON.parse(readFileSync(join(Mdir, "audio/tts-jobs.json"), "utf8"))[0];
const pendingIds = () => JSON.parse(manifest("--pending").stdout).jobs.map((j) => j.id);
writeFileSync(job0.output_path, makeTestWav(Buffer.alloc(24000), 48000)); // above the 10 kB minimum clip size
check("tts-manifest: a clip without a text record is done", !pendingIds().includes(job0.id), "");
writeFileSync(`${job0.output_path}.txt`, job0.text);
check("tts-manifest: a clip spoken from the current text is done", !pendingIds().includes(job0.id), "");
writeFileSync(`${job0.output_path}.txt`, "câu cũ trước khi sửa kịch bản");
check("tts-manifest: a clip spoken from an older text is pending", pendingIds().includes(job0.id), "");

// ── (b) asr-check --self-test ───────────────────────────────────────────────
const py = spawnSync("python", [join(S, "scripts/asr-check.py"), "--self-test"], { encoding: "utf8" });
if (py.error && py.error.code === "ENOENT") {
  console.log("skip: python scripts/asr-check.py --self-test (no python on PATH)");
  check("spawn python scripts/asr-check.py --self-test -> exit 0 (skipped: no python)", true, "");
} else {
  check("spawn python scripts/asr-check.py --self-test -> exit 0", py.status === 0, (py.stdout || "") + (py.stderr || ""));
}

// ── (c) karaoke stage inputs ────────────────────────────────────────────────
const Kdir = join(dirname(R), "cli-karaoke-inputs");
rmSync(Kdir, { recursive: true, force: true });
mkdirSync(Kdir, { recursive: true });
for (const f of ["video.config.json", "script.json", "SCRIPT-REVIEW.md"]) cpSync(join(SRC, f), join(Kdir, f));
writeFileSync(join(Kdir, "STORYBOARD.md"), "# Storyboard\n");
writeFileSync(join(Kdir, "audio_meta.json"), "{}\n");
mkdirSync(join(Kdir, "compositions/frames"), { recursive: true });
writeFileSync(join(Kdir, "compositions/frames/01-test.html"), "frame 1\n");

const stK = load(Kdir);
const compileStage = activeStages(cfg).find((x) => x.name === "compile");
const karaokeStage = activeStages(cfg).find((x) => x.name === "karaoke");
markStage(stK, Kdir, "compile", compileStage.inputs);
markStage(stK, Kdir, "karaoke", karaokeStage.inputs);
save(Kdir, stK);

writeFileSync(join(Kdir, "compositions/frames/01-test.html"), "frame 1 modified\n");
const stFrameChanged = load(Kdir);
const karaokeStaleAfterFrame = isStale(stFrameChanged, Kdir, "karaoke", karaokeStage.inputs, karaokeStage.needs.stages);

writeFileSync(join(Kdir, "STORYBOARD.md"), "# Storyboard modified\n");
const stSbChanged = load(Kdir);
const karaokeStaleAfterSb = isStale(stSbChanged, Kdir, "karaoke", karaokeStage.inputs, karaokeStage.needs.stages);

check("karaoke: mark compile+karaoke done, change a file under compositions/frames -> karaoke not stale",
  !karaokeStaleAfterFrame, "karaoke became stale after changing compositions/frames");
check("karaoke: change STORYBOARD.md -> stale",
  karaokeStaleAfterSb, "karaoke did not become stale after changing STORYBOARD.md");

srv.close();

console.log(passed === cases.length ? `cli-tests ok (${passed}/${cases.length})` : `cli-tests FAILED (${passed}/${cases.length})`);
process.exit(passed === cases.length ? 0 : 1);

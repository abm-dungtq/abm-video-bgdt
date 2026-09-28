#!/usr/bin/env node
// compile-fixture.mjs — the compiler end to end on a real voice: frames 1–6 of a delivered lesson are rebuilt from
// dev/fixtures/<name>.scenes.json through the CLI (run storyboard → run compile, which lints, compiles and runs
// wave-check on the changed frames), in a scratch copy. The delivered project is only read.
//
//   node dev/compile-fixture.mjs [--source <delivered project>] [--scenes dev/fixtures/hermes-1-6.scenes.json]
//   node dev/compile-fixture.mjs --auto [--source <delivered project>]
//        the whole lesson, with no scenes.json: the storyboard stage runs the solver (scratch: .regress/<name>-auto)

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const S = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const SRC = resolve(opt("--source", process.env.ABM_REGRESS_SOURCE ?? "D:/TQD/Claude-Video/videos/hermes-agent-explainer"));
const AUTO = argv.includes("--auto");
const SCENES = resolve(opt("--scenes", join(S, "dev/fixtures/hermes-1-6.scenes.json")));
const R = resolve(process.env.ABM_REGRESS_DIR ?? "D:/TQD/Claude-Video/.regress", AUTO ? "hermes-auto" : "compile-fixture");
const keep = AUTO
  ? JSON.parse(readFileSync(join(SRC, "script.json"), "utf8")).chapters.flatMap((c) => c.frames.map((f) => f.id))
  : JSON.parse(readFileSync(SCENES, "utf8")).frames.map((f) => f.frame);
const max = Math.max(...keep);

rmSync(R, { recursive: true, force: true });
mkdirSync(join(R, "compositions/frames"), { recursive: true });
// frame.md and index.html come from hyperframes init; wave-check copies them into its scratch project
for (const f of ["video.config.json", "hyperframes.json", "meta.json", "package.json", "frame.md", "index.html", "assets", "capture/terminal", ".probe/rate.json"]) {
  if (existsSync(join(SRC, f))) cpSync(join(SRC, f), join(R, f), { recursive: true });
}
// cut script, voice and storyboard to the fixture frames
const script = JSON.parse(readFileSync(join(SRC, "script.json"), "utf8"));
script.chapters = script.chapters.map((c) => ({ ...c, frames: c.frames.filter((f) => f.id <= max) })).filter((c) => c.frames.length);
writeFileSync(join(R, "script.json"), JSON.stringify(script, null, 1));
const meta = JSON.parse(readFileSync(join(SRC, "audio_meta.json"), "utf8"));
meta.voices = meta.voices.filter((v) => v.frame <= max);
writeFileSync(join(R, "audio_meta.json"), JSON.stringify(meta, null, 2));
const md = readFileSync(join(SRC, "STORYBOARD.md"), "utf8").split(/(?=^## Frame \d+ )/m);
const kept = md.filter((b) => !/^## Frame (\d+) /.test(b) || Number(b.match(/^## Frame (\d+) /)[1]) <= max);
writeFileSync(join(R, "STORYBOARD.md"), kept.join("").replace(/\n## (?!Frame )[\s\S]*$/, "\n"));
if (!AUTO) cpSync(SCENES, join(R, "scenes.json"));
const missing = ["hyperframes.json", "meta.json", "package.json", "frame.md", "index.html", "video.config.json", "STORYBOARD.md",
  "audio_meta.json", "script.json"].filter((f) => !existsSync(join(R, f)));
if (missing.length) { console.log(`compile-fixture FAILED: the fixture lacks ${missing.join(", ")} (copy them from ${SRC})`); process.exit(1); }

const run = (cmd, args) => {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: R, stdio: "inherit", shell: false });
  if (r.status !== 0) { console.log(`compile-fixture FAILED at: ${cmd} ${args.join(" ")}`); process.exit(1); }
};
run(process.execPath, [join(S, "scripts/new-project.mjs"), R, "--update-tools"]);
run(process.execPath, ["tools/build-design-kit.mjs"]);
run(process.execPath, ["tools/bin/abm-video.mjs", "run", "storyboard", "--force"]);
run(process.execPath, ["tools/bin/abm-video.mjs", "run", "compile", "--force"]);
console.log(`compile-fixture ok: ${keep.length} frames in ${R}`);

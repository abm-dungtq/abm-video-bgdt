// stages.mjs — the pipeline as a table (contracts C5). Commands are the ones run-pipeline.ps1 runs, in Node.
// Each stage: needs (stages done + gates approved on the current files), inputs (hashed: a change makes it stale),
// gate (asked after it) and run(ctx) → exit code.

import { existsSync, readFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { MCP, SKILL_ROOT } from "./paths.mjs";
import { apiUp, batch } from "./tts.mjs";

const q = (a) => (/[\s"&|<>^]/.test(a) ? `"${String(a).replace(/"/g, '\\"')}"` : String(a));

/** Run one command line in the project; returns its exit code. */
export function sh(P, ...parts) {
  const line = parts.map((p) => (Array.isArray(p) ? p.map(q).join(" ") : p)).join(" ");
  console.log(`$ ${line}`);
  return spawnSync(line, { cwd: P, stdio: "inherit", shell: true }).status ?? 1;
}
/** the compiler next to the scripts in use: P/tools/compiler in a project, else the skill's compiler/ */
const compilerDir = (c) => (existsSync(`${c.SC}/compiler/compile.mjs`) ? `${c.SC}/compiler` : `${SKILL_ROOT}/compiler`);
const isLegacy = (P) => existsSync(join(P, ".abm/state.json")) && JSON.parse(readFileSync(join(P, ".abm/state.json"), "utf8")).legacy === true;
const seq = (...steps) => { for (const s of steps) { const c = s(); if (c) return c; } return 0; };

const sha = (p) => (existsSync(p) ? createHash("sha1").update(readFileSync(p)).digest("hex") : null);
/** A file the agent must write still equals the skill's template. */
export const untouched = (P, rel, tmpl) => sha(join(P, rel)) === sha(join(SKILL_ROOT, "templates", tmpl));

function probeHelp() {
  console.log(`probe: record the two probe clips, then rerun this stage.
  1. Pronunciation: list every English/technical term of the topic, comma-separated, and run
       abm-video tts --text "<term1>, <term2>, …" --out .probe/terms-raw.wav
     Write each decision to .probe/pronunciation.md; put overrides in video.config.json "spokenOverrides".
  2. Rate: pick a 45–55-syllable sentence typical of the lesson and run
       abm-video tts --text "<sentence>" --out .probe/rate.wav
       node tools/measure-rate.mjs .probe/rate.wav "<same sentence>"`);
  return 1;
}

export const STAGES = [
  { name: "doctor", needs: { stages: [], gates: [] }, inputs: [],
    run: (c) => sh(c.P, [process.execPath, `${SKILL_ROOT}/setup/doctor.mjs`]) },
  // doctor freshness is checked on its own (7 days); init must not go stale each time doctor reruns
  { name: "init", needs: { stages: [], gates: [] }, inputs: [], run: () => 0 },
  { name: "probe", needs: { stages: ["init"], gates: [] }, inputs: [".probe/rate.json", ".probe/pronunciation.md"], gate: "1",
    run: (c) => seq(
      () => sh(c.P, [process.execPath, `${c.SC}/build-design-kit.mjs`]),
      () => sh(c.P, [process.execPath, `${c.SC}/fixture-check.mjs`]),
      () => ([".probe/rate.wav", ".probe/rate.json", ".probe/pronunciation.md"].every((f) => existsSync(join(c.P, f))) ? 0 : probeHelp()),
    ) },
  { name: "script", needs: { stages: ["probe"], gates: ["1"] }, inputs: ["script.src.txt", "capture/extracted/visible-text.txt"], gate: "2",
    run: (c) => seq(
      () => sh(c.P, [process.execPath, `${c.SC}/src-to-script.mjs`, "script.src.txt", "script.json"]),
      () => sh(c.P, [process.execPath, `${c.SC}/script-to-md.mjs`, "--check", "script.json"]),
      () => sh(c.P, [process.execPath, `${c.SC}/facts-check.mjs`]),
      () => sh(c.P, [process.execPath, `${c.SC}/script-to-md.mjs`, "--review", "script.json"]),
      () => sh(c.P, [process.execPath, `${c.SC}/tts-manifest.mjs`]),
    ) },
  { name: "screens", when: (cfg) => cfg.screens === true, needs: { stages: ["script"], gates: ["2"] },
    inputs: ["capture/screens/INDEX.md"], gate: "2b",
    run: (c) => {
      if (!untouched(c.P, "capture/screens/INDEX.md", "screens-INDEX.md")) return sh(c.P, [process.execPath, `${c.SC}/privacy-check.mjs`]);
      console.log(`screens: capture, redact and list the screenshots as in ${SKILL_ROOT}/references/pipeline-stages.md § Stage 2b, then rerun.`);
      return 1;
    } },
  { name: "tts", needs: { stages: ["script"], gates: ["2", "2b"] }, inputs: ["script.json"],
    run: async (c) => {
      if (!(await apiUp())) {
        console.error(`✗ speech API not reachable. Start it (keep it running): node ${MCP}/start-api.mjs`);
        return 1;
      }
      // the storyboard outline is written once, right after the script is approved (never again later)
      if (!existsSync(join(c.P, "STORYBOARD.md")) && sh(c.P, [process.execPath, `${c.SC}/script-to-md.mjs`, "script.json"])) return 1;
      const r = await batch(c.P, c.SC, Number(c.opt("--concurrency", 4)));
      return r.done === r.total ? 0 : 1;
    } },
  { name: "voice", needs: { stages: ["tts"], gates: [] }, inputs: ["script.json"],
    run: (c) => {
      const venv = c.venv();
      const py = (script, ...a) => () => sh(c.P, ["uv", "run", "--directory", venv, "python", `${c.SC}/${script}`, ...a]);
      return seq(
        py("build-voice.py", "--qa"), py("build-voice.py"), py("build-voice.py", "--verify"),
        py("align-words.py", "--jobs", `${c.P}/audio/tts-jobs.json`, "--clip-dir", `${c.P}/audio/trimmed`, "--out-dir", `${c.P}/audio/align`),
        py("build-audio-meta.py"),
        () => sh(c.P, [process.execPath, `${c.SK}/audio.mjs`, "sync-durations", "--audio-meta", "./audio_meta.json", "--storyboard", "./STORYBOARD.md"]),
      );
    } },
  { name: "storyboard", needs: { stages: ["voice"], gates: [] }, inputs: ["audio_meta.json", "scenes.json"],
    // scenes.json is written once by the solver and then only linted (never overwritten; --regenerate keeps a .bak);
    // retime-and-cue only serves hand-built storyboards of legacy projects
    run: (c) => {
      const scenes = join(c.P, "scenes.json");
      if (isLegacy(c.P)) {
        return seq(
          () => sh(c.P, [process.execPath, `${c.SC}/retime-and-cue.mjs`]),
          () => sh(c.P, [process.execPath, `${c.SC}/retime-and-cue.mjs`, "--check"]),
          () => sh(c.P, [process.execPath, `${c.SC}/variety-lint.mjs`, "STORYBOARD.md"]),
        );
      }
      if (existsSync(scenes) && !c.args.includes("--regenerate")) return sh(c.P, [process.execPath, `${compilerDir(c)}/lint.mjs`]);
      if (existsSync(scenes)) {
        const bak = `scenes.json.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
        renameSync(scenes, join(c.P, bak));
        console.log(`kept the previous scenes.json as ${bak}`);
      }
      return sh(c.P, [process.execPath, `${compilerDir(c)}/solver.mjs`, "--auto"]);
    } },
  { name: "compile", needs: { stages: ["storyboard"], gates: [] }, inputs: ["scenes.json", "audio_meta.json"],
    run: async (c) => {
      if (!existsSync(join(c.P, "scenes.json"))) { console.log("compile: legacy project, frames are hand-built"); return 0; }
      const { compile } = await import(pathToFileURL(`${compilerDir(c)}/compile.mjs`).href);
      const r = await compile({ P: c.P, cfg: c.cfg, legacy: isLegacy(c.P) });
      if (!r.ok) return 1;
      // lint + snapshot only the frames whose html changed (wave-check mounts them in a scratch project)
      return r.changed.length ? sh(c.P, [process.execPath, `${c.SC}/wave-check.mjs`, ...r.changed.map(String)]) : 0;
    } },
  { name: "karaoke", needs: { stages: ["compile"], gates: [] }, inputs: ["audio_meta.json", "compositions/frames"], gate: "3",
    run: (c) => seq(
      () => sh(c.P, [process.execPath, `${c.SC}/build-karaoke.mjs`]),
      () => sh(c.P, [process.execPath, `${c.SC}/build-karaoke.mjs`, "--check"]),
      () => sh(c.P, [process.execPath, `${c.SC}/build-overlay.mjs`]),
      () => sh(c.P, [process.execPath, `${c.SC}/wave-check.mjs`, "1", "2", "3", "--render", "renders/karaoke-preview.mp4"]),
    ) },
  { name: "assemble", needs: { stages: ["karaoke"], gates: ["3"] },
    inputs: ["STORYBOARD.md", "compositions/frames", "compositions/captions.html", "compositions/overlay.html"],
    run: (c) => seq(
      () => sh(c.P, [process.execPath, `${c.SK}/assemble-index.mjs`, "--storyboard", "./STORYBOARD.md", "--hyperframes", "."]),
      () => sh(c.P, [process.execPath, `${c.SK}/transitions.mjs`, "inject", "--storyboard", "./STORYBOARD.md", "--hyperframes", "."]),
      () => sh(c.P, [process.execPath, `${c.SC}/inject-overlay.mjs`]),
      () => sh(c.P, [process.execPath, `${c.SK}/transitions.mjs`, "verify", "--storyboard", "./STORYBOARD.md", "--index", "./index.html"]),
      () => sh(c.P, ["npx", "-y", c.HF, "lint"]),
      () => sh(c.P, [process.execPath, `${c.SC}/privacy-check.mjs`]),
      () => sh(c.P, ["npx", "-y", c.HF, "check", "--timeout", String(c.cfg.cli.checkTimeoutMs ?? 240000)]),
    ) },
  { name: "draft", needs: { stages: ["assemble"], gates: [] }, inputs: ["index.html"], gate: "4",
    run: (c) => seq(
      () => sh(c.P, ["npx", "-y", c.HF, "render", "--quality", "draft", "--fps", "25", "--frames-cache-dir", c.cache, "--output", "renders/draft.mp4"]),
      () => sh(c.P, [process.execPath, `${c.SC}/sync-report.mjs`, "renders/draft.mp4"]),
      () => sh(c.P, [process.execPath, `${c.SC}/sync-report.mjs`, "--max"]),
      () => sh(c.P, ["ffmpeg", "-y", "-v", "error", "-i", "renders/draft.mp4", "-vf", "scale=1280:-2", "-c:v", "libx264", "-crf", "28",
        "-c:a", "aac", "renders/draft-720p-preview.mp4"]),
    ) },
  { name: "final", needs: { stages: ["draft"], gates: ["4"] }, inputs: ["index.html"],
    run: (c) => seq(
      () => sh(c.P, ["npx", "-y", c.HF, "render", "--quality", c.cfg.render.quality, "--fps", String(c.cfg.render.fps),
        "--frames-cache-dir", c.cache, "--output", "renders/master-raw.mp4"]),
      () => sh(c.P, [process.execPath, `${c.SC}/sync-report.mjs`, "renders/master-raw.mp4"]),
      () => sh(c.P, [process.execPath, `${c.SC}/sync-report.mjs`, "--max"]),
      () => sh(c.P, [process.execPath, `${c.SC}/postprocess.mjs`]),
      () => sh(c.P, [process.execPath, `${c.SC}/blank-check.mjs`]),
    ) },
  { name: "clean", needs: { stages: ["final"], gates: [] }, inputs: [],
    run: (c) => sh(c.P, [process.execPath, `${c.SC}/clean-project.mjs`, ...(c.args.includes("--apply") ? ["--apply"] : [])]) },
];

/** The stages that apply to this project, and the gates each one really needs (2b only when screens are on). */
export function activeStages(cfg) {
  const screens = cfg.screens === true;
  return STAGES.filter((s) => !s.when || s.when(cfg))
    .map((s) => ({ ...s, needs: { ...s.needs, gates: s.needs.gates.filter((g) => g !== "2b" || screens),
      stages: s.name === "tts" && screens ? ["screens"] : s.needs.stages } }));
}

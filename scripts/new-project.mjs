#!/usr/bin/env node
// new-project.mjs — scaffold a lesson-video project from the abm-video-bgdt skill.
//
//   node <skill>/scripts/new-project.mjs <project-dir> [--title "Tiêu đề bài giảng"] [--theme abm-brand]
//   node <skill>/scripts/new-project.mjs <project-dir> --update-tools
//
// New project: HyperFrames init (pinned CLI, skills left untouched), then the skill's scripts are
// copied into <project>/tools/ (the project keeps its own copy, like the CLI pin) together with
// tools/worker-kit/ templates, video.config.json, BRIEF.md, script.src.txt and the capture folders.
// --update-tools refreshes only <project>/tools/ from the skill (never the config or content).
// --theme <name> merges templates/themes/<name>.json (design, fonts, karaoke) into the new config; optional.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dir = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--title" && args[i - 1] !== "--theme");
const title = args.includes("--title") ? args[args.indexOf("--title") + 1] : null;
const theme = args.includes("--theme") ? args[args.indexOf("--theme") + 1] : null;
if (!dir) {
  console.error('usage: new-project.mjs <project-dir> [--title "…"] [--theme abm-brand] [--update-tools]');
  process.exit(1);
}
const P = resolve(dir);
const name = basename(P);

function copyTools() {
  mkdirSync(join(P, "tools"), { recursive: true });
  for (const f of readdirSync(join(SKILL, "scripts"))) {
    if (f === "new-project.mjs") continue;
    cpSync(join(SKILL, "scripts", f), join(P, "tools", f), { recursive: true });
  }
  cpSync(join(SKILL, "templates/worker-kit"), join(P, "tools/worker-kit"), { recursive: true });
  // the abm-video CLI runs from the project copy; setup/ stays in the skill, found through skill-root.txt
  for (const d of ["bin", "cli", "compiler", "templates/scenes"]) cpSync(join(SKILL, d), join(P, "tools", d), { recursive: true });
  writeFileSync(join(P, "tools/skill-root.txt"), SKILL.replace(/\\/g, "/") + "\n");
}

if (args.includes("--update-tools")) {
  if (!existsSync(join(P, "video.config.json"))) throw new Error(`${P} is not an abm-video-bgdt project`);
  copyTools();
  console.log(`tools refreshed from ${SKILL}`);
  process.exit(0);
}
if (existsSync(join(P, "video.config.json"))) {
  console.error(`✗ ${P} already has video.config.json (use --update-tools to refresh tools only)`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(join(SKILL, "templates/video.config.json"), "utf8"));
config.name = name;
if (title) config.title = title;
if (theme) {
  const themePath = join(SKILL, "templates/themes", `${theme}.json`);
  if (!existsSync(themePath)) {
    console.error(`✗ theme "${theme}" not found in templates/themes`);
    process.exit(1);
  }
  const t = JSON.parse(readFileSync(themePath, "utf8"));
  Object.assign(config.design, t.design);
  if (t.fonts) config.fonts = t.fonts;
  if (t.karaoke) Object.assign(config.karaoke, t.karaoke);
  config.theme = theme;
}

execSync(
  `npx -y hyperframes@${config.cli.pin} init "${P}" --non-interactive --example=blank --skill=faceless-explainer --resolution landscape`,
  { stdio: "inherit", env: { ...process.env, HYPERFRAMES_SKIP_SKILLS: "1" } },
);
copyTools();
writeFileSync(join(P, "video.config.json"), JSON.stringify(config, null, 2) + "\n");
writeFileSync(join(P, "BRIEF.md"), readFileSync(join(SKILL, "templates/BRIEF.md.tmpl"), "utf8")
  .replaceAll("{{TITLE}}", config.title).replaceAll("{{VOICE}}", config.voice.id).replaceAll("{{MESSAGE}}", config.message));
cpSync(join(SKILL, "templates/script.src.txt"), join(P, "script.src.txt"));
for (const d of [".probe", "audio/clips", "capture/extracted", "capture/terminal", "capture/screens/raw",
  "capture/screens/redacted", "capture/assets/fonts", "assets/fonts", "renders"]) {
  mkdirSync(join(P, d), { recursive: true });
}
cpSync(join(SKILL, "templates/visible-text.txt"), join(P, "capture/extracted/visible-text.txt"));
cpSync(join(SKILL, "templates/COVERAGE.md"), join(P, "capture/COVERAGE.md"));
cpSync(join(SKILL, "templates/screens-INDEX.md"), join(P, "capture/screens/INDEX.md"));
for (const d of ["capture/assets/fonts", "assets/fonts"]) cpSync(join(SKILL, "templates/fonts"), join(P, d), { recursive: true });

// The init-generated agent notes tell agents to upgrade the pin and to route through /faceless-explainer's own audio
// and captions; this project overrides both. The same block goes to every agent's project notes: Claude Code (CLAUDE.md),
// Codex and others (AGENTS.md), Gemini CLI (GEMINI.md) and Cursor (.cursor/rules/abm-video.mdc).
const notes = readFileSync(join(SKILL, "templates/agent-notes.md.tmpl"), "utf8").replaceAll("{{PIN}}", config.cli.pin);
for (const f of ["CLAUDE.md", "AGENTS.md", "GEMINI.md"]) {
  const p = join(P, f);
  writeFileSync(p, (existsSync(p) ? `${readFileSync(p, "utf8").trimEnd()}\n\n` : "") + notes);
}
mkdirSync(join(P, ".cursor/rules"), { recursive: true });
writeFileSync(join(P, ".cursor/rules/abm-video.mdc"),
  `---\ndescription: abm-video-bgdt lesson project\nalwaysApply: true\n---\n\n${notes}`);
console.log(`\nproject ready: ${P}
next: edit video.config.json (title, message, audience, arc, palette), then run node tools/bin/abm-video.mjs next`);

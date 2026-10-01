# Agent runbook: set up abm-video-bgdt on this machine

Follow this when a user asks you (any coding agent: Claude Code, Antigravity, Codex, Gemini CLI, Cursor, Copilot,
OpenCode, Windsurf/Devin…) to install, repair or use abm-video-bgdt on a machine. It works on Windows, macOS and Linux,
needs no machine-specific path, and never changes anything before the user agrees.

## Hard rule: the whole environment first, then the video

Do not start a lesson (`abm-video init`, `next`, writing a script) until `node <SKILL_DIR>/setup/doctor.mjs` prints
`doctor ok`. The pipeline enforces it: `abm-video init` refuses to create a project while doctor fails, and in a project
`abm-video next` asks for `doctor` again when its last pass is older than 7 days; the stage only passes when every
required item is `✓`. A
partial setup fails later and costs more: without viet-pro gate 2 cannot pass, without the HyperFrames skills nothing
compiles, without VieNeu-TTS there is no voice.

## What must be installed

| Part | What it does in the pipeline | Where it comes from | doctor line that proves it |
|---|---|---|---|
| **abm-video-bgdt** (this skill) | the CLI, stages, gates, scene templates and lint | `https://github.com/abm-dungtq/abm-video-bgdt` | (doctor runs from it) |
| **viet-pro** | you load its `SKILL.md` to write the narration and audit it into `script.viet-pro.md`; gate 2 runs its lint | `https://github.com/abm-dungtq/viet-pro-codex` (folder `skills/viet-pro`) | `✓ viet-pro skill  <path> (<version>)` |
| **HyperFrames skills** (HeyGen) | storyboard reader, frame assembly, transitions, render | `npx -y hyperframes@0.7.99 skills` | `✓ hyperframes skills` and four `✓ upstream …` |
| **VieNeu-TTS** + its venv | Vietnamese voice, word alignment (torch/torchaudio 2.8, uroman) | `https://github.com/pnnbao97/VieNeu-TTS` | `✓ VieNeu-TTS`, `✓ alignment env` |
| Base tools | Node.js ≥ 20, git, ffmpeg + ffprobe, uv, npx (PowerShell 7 optional) | the OS installer (`setup/install.ps1` / `install.sh`) | one `✓` each |

viet-pro must sit **next to** abm-video-bgdt (`<skills folder>/viet-pro`, the folder that holds `abm-video-bgdt`), or
`VIET_PRO_DIR` must point to it. It must also be in your own agent's skill folder, so you can load it by name.

## Rules

- Ask the user before any step that installs software, clones repositories or edits agent config files. Show them the
  plan from step 2 first. Run installers with `--yes` / `-Yes` **only after** they said yes.
- Never paste secrets anywhere. The setup needs none.
- If a step fails, stop and show the exact command and output. Do not improvise workarounds that change the system.
- Long steps (the VieNeu model install can take 5–15 min; the first alignment downloads about 1.2 GB) should run in the
  background when your tools allow it.

## Steps

1. **Find or fetch the skill.**
   - If this runbook is already on disk, `<SKILL_DIR>` is its parent's parent.
   - Otherwise ask the user where to put it (default `~/.agents/skills/abm-video-bgdt`) and clone
     `https://github.com/abm-dungtq/abm-video-bgdt.git` there. If `git` is missing, go to step 3; the installer clones it for you.

2. **Diagnose.** If Node ≥ 20 exists, run `node <SKILL_DIR>/setup/doctor.mjs --json`. Read `checks[]` (each has
   `level` ok/warn/fail and a `fix`) and `hardware.profile`:
   - `cuda`: NVIDIA GPU with a CUDA 12.8+ driver.
   - `mps`: Apple Silicon.
   - `cpu`: everything else. It is slower, but the result is the same.
   - `unsupported`: VieNeu-TTS supports Windows x64, Linux x64 and macOS arm64 only. Tell the user and stop.

   Then run `node <SKILL_DIR>/setup/setup.mjs --dry-run` and show the user its plan: the steps, the skill links (this
   skill and viet-pro), the VieNeu-TTS folder, the hardware profile and the agents whose MCP config will change. Ask:
   - whether to proceed;
   - whether an existing VieNeu-TTS checkout should be reused (`--vieneu-dir <path>`);
   - whether the hardware profile is right (`--profile cpu` if they prefer not to use the GPU).

3. **Install.** With the user's yes, run the installer for the OS. It installs only the missing base tools (git, Node.js
   LTS, ffmpeg, uv, PowerShell 7), then runs `setup.mjs`:
   - Windows: `powershell -ExecutionPolicy Bypass -File <SKILL_DIR>\setup\install.ps1 -Yes [-SetupArgs "--vieneu-dir D:\VieNeu-TTS"]`
   - macOS/Linux: `bash <SKILL_DIR>/setup/install.sh --yes [-- --vieneu-dir ~/VieNeu-TTS]`
   - When the base tools already exist, `node <SKILL_DIR>/setup/setup.mjs --yes [...]` does the same thing.
   - To repeat a single step: `--only link|hyperframes|vietpro|vieneu|mcp`.

   `setup.mjs` does the following:
   1. `link`: links this skill into the skill folders of Claude Code, Codex, Gemini CLI, Antigravity CLI
      (`~/.gemini/antigravity/skills`) and `~/.agents/skills`;
   2. `hyperframes`: installs the full HyperFrames skill set (`npx -y hyperframes@0.7.99 skills`);
   3. `vietpro`: when viet-pro is not installed, clones `viet-pro-codex` to `~/.agents/viet-pro-codex` and links
      `skills/viet-pro` next to this skill; then links viet-pro into the same agent skill folders;
   4. `vieneu`: clones VieNeu-TTS if needed and installs the variant for the hardware profile (plus torchaudio 2.8 and
      uroman for word alignment), then writes the machine profile `~/.config/abm-video-bgdt/machine.json`;
   5. `mcp`: registers the `vieneu-tts` MCP server with every agent found (backing up each edited file to `.bak`);
   6. runs `doctor`.

4. **Cover your own agent.** `setup.mjs` links both skills for the agents above and registers MCP for Claude Code, Codex,
   Cursor, Gemini CLI, VS Code (Copilot), Copilot CLI, OpenCode and Windsurf/Devin. If your agent reads skills from
   another folder (SETUP.md § 3), link `abm-video-bgdt` **and** `viet-pro` there too. If it does not support skills, add
   one line to its instructions file: `For e-learning lesson videos, read and follow <SKILL_DIR>/SKILL.md; write the
   narration with <VIET_PRO_DIR>/SKILL.md.` For MCP, add the server by hand as in SETUP.md § 7.

5. **Start the speech API** and keep it running, in the background if you can: `node <SKILL_DIR>/mcp/vieneu-tts/start-api.mjs`.
   It reads the VieNeu-TTS folder and the backend/dtype from the machine profile. Wait until `http://127.0.0.1:8000/health`
   answers `"status":"ok"`.

6. **Tell the user to restart the agent**, so it loads the skills. After the restart, verify every item; all must hold
   before the first lesson:
   1. `node <SKILL_DIR>/setup/doctor.mjs` prints `doctor ok`, with `✓ viet-pro skill`, `✓ hyperframes skills`, the four
      `✓ upstream …`, `✓ VieNeu-TTS` and `✓ alignment env`;
   2. `✓ speech API` (a warning only means the API from step 5 is not running yet);
   3. your agent lists both `abm-video-bgdt` and `viet-pro` among its skills;
   4. `node <SKILL_DIR>/bin/abm-video.mjs next` outside a project says `create the lesson project`;
   5. optionally, the MCP tool `server_status` answers `"status":"ok"`. The pipeline speaks through the HTTP API, so the
      MCP server is only for trying voices.

7. **Report** what was installed, the versions doctor printed (skill, viet-pro), the hardware profile, the VieNeu-TTS
   folder, the agents that were registered, and anything left for the user (for example: update the NVIDIA driver to use
   the GPU, or restart the agent). Only then start a lesson, following `<SKILL_DIR>/references/autonomous-run.md`.

## Updating

- Skill: `git -C <SKILL_DIR> pull`. Existing lesson projects keep their copied tools; refresh one with
  `node <SKILL_DIR>/scripts/new-project.mjs <project> --update-tools`.
- viet-pro: `git -C <viet-pro-codex checkout> pull` (the folder doctor shows resolves to it).
- HyperFrames: stay on the pinned `hyperframes@0.7.99`; a newer CLI needs the skill's own upgrade first.

## Common fixes

| doctor says | do |
|---|---|
| `viet-pro skill … not found at <path>` | `node setup/setup.mjs --only vietpro --yes` (after asking), or set `VIET_PRO_DIR` to an existing `skills/viet-pro` |
| `hyperframes skills … faceless-explainer not found` | `node setup/setup.mjs --only hyperframes --yes` (after asking) |
| `VieNeu-TTS … no checkout found` | `node setup/setup.mjs --only vieneu --yes [--vieneu-dir <path>]` |
| `alignment env … torchaudio must be 2.8.x` | `node setup/setup.mjs --only vieneu --yes` (reinstalls the pinned versions) |
| `gpu use … torch cannot use CUDA` | `node setup/setup.mjs --only vieneu --profile cuda --yes`; if it persists, update the NVIDIA driver |
| `speech API … not reachable` | start it (step 5); a warning, not an error |
| `mcp <agent> … would add` | `node setup/register-mcp.mjs --agents <agent>` (after asking) |
| gate 2 says `viet-pro not found at …` | the project runs from another skill copy: run doctor from that copy, or set `VIET_PRO_DIR` |

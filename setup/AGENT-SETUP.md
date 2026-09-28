# Agent runbook: set up abm-video-bgdt on this machine

Follow this when a user asks you (any coding agent) to install or repair abm-video-bgdt. It works on Windows, macOS and
Linux, needs no machine-specific path, and never changes anything before the user agrees.

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

   Then run `node <SKILL_DIR>/setup/setup.mjs --dry-run` and show the user its plan: the steps, the VieNeu-TTS folder, the
   hardware profile and the agents whose MCP config will change. Ask:
   - whether to proceed;
   - whether an existing VieNeu-TTS checkout should be reused (`--vieneu-dir <path>`);
   - whether the hardware profile is right (`--profile cpu` if they prefer not to use the GPU).

3. **Install.** With the user's yes, run the installer for the OS. It installs only the missing base tools (git, Node.js
   LTS, ffmpeg, uv, PowerShell 7), then runs `setup.mjs`:
   - Windows: `powershell -ExecutionPolicy Bypass -File <SKILL_DIR>\setup\install.ps1 -Yes [-SetupArgs "--vieneu-dir D:\VieNeu-TTS"]`
   - macOS/Linux: `bash <SKILL_DIR>/setup/install.sh --yes [-- --vieneu-dir ~/VieNeu-TTS]`
   - When the base tools already exist, `node <SKILL_DIR>/setup/setup.mjs --yes [...]` does the same thing.
   - To repeat a single step: `--only link|hyperframes|vieneu|mcp`.

   `setup.mjs` does the following:
   1. links the skill into the skill folders of Claude Code, Codex, Gemini CLI, Antigravity CLI (`~/.gemini/antigravity/skills`) and `~/.agents/skills`;
   2. installs the full HyperFrames skill set (`npx -y hyperframes@0.7.99 skills`);
   3. clones VieNeu-TTS if needed and installs the variant for the hardware profile (plus torchaudio 2.8 and uroman for word alignment);
   4. writes the machine profile `~/.config/abm-video-bgdt/machine.json`;
   5. registers the `vieneu-tts` MCP server with every agent found (backing up each edited file to `.bak`);
   6. runs `doctor`.

4. **Register yourself if needed.** `setup.mjs` handles Claude Code, Codex, Cursor, Gemini CLI, VS Code (Copilot), Copilot
   CLI, OpenCode and Windsurf/Devin automatically. If you are another agent, add the server by hand as in SETUP.md § 7:
   command `uv`, args `run --directory <SKILL_DIR>/mcp/vieneu-tts python server.py`, env `VIENEU_API_URL=http://127.0.0.1:8000`
   and `PYTHONIOENCODING=utf-8`.

5. **Start the speech API** and keep it running, in the background if you can: `node <SKILL_DIR>/mcp/vieneu-tts/start-api.mjs`.
   It reads the VieNeu-TTS folder and the backend/dtype from the machine profile. Wait until `http://127.0.0.1:8000/health`
   answers `"status":"ok"`.

6. **Tell the user to restart the agent**, so it loads the skill. After the restart, verify:
   1. run `node <SKILL_DIR>/bin/abm-video.mjs doctor`; it must print `doctor ok`;
   2. run `node <SKILL_DIR>/bin/abm-video.mjs next`; outside a project it must say `create the lesson project`;
   3. optionally, call the MCP tool `server_status` (`"status":"ok"`). The pipeline speaks through the HTTP API, so the MCP
      server is only for trying voices.

7. **Report** what was installed, the hardware profile, the VieNeu-TTS folder, the agents that were registered, and anything
   left for the user (for example: update the NVIDIA driver to use the GPU, or restart the agent).

## Common fixes

| doctor says | do |
|---|---|
| `hyperframes skills … faceless-explainer not found` | `node setup/setup.mjs --only hyperframes --yes` (after asking) |
| `VieNeu-TTS … no checkout found` | `node setup/setup.mjs --only vieneu --yes [--vieneu-dir <path>]` |
| `alignment env … torchaudio must be 2.8.x` | `node setup/setup.mjs --only vieneu --yes` (reinstalls the pinned versions) |
| `gpu use … torch cannot use CUDA` | `node setup/setup.mjs --only vieneu --profile cuda --yes`; if it persists, update the NVIDIA driver |
| `speech API … not reachable` | start it (step 5); a warning, not an error |
| `mcp <agent> … would add` | `node setup/register-mcp.mjs --agents <agent>` (after asking) |

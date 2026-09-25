# run-pipeline.ps1 — re-run the lesson video pipeline from any stage (parameters: video.config.json).
#
#   pwsh tools/run-pipeline.ps1 -From voice -To assemble
#
# Stages (in order): script, tts, voice, align, meta, cues, karaoke, assemble, check, render, post
# `tts` cannot run here: narration must be synthesized through the vieneu-tts MCP by the agent.
# Machine paths come from env vars (defaults match tools/lib/config.mjs): HF_SKILLS_DIR, VIENEU_VENV, HF_CACHE_DIR.
param(
  [ValidateSet("script","tts","voice","align","meta","cues","karaoke","assemble","check","render","post")]
  [string]$From = "voice",
  [ValidateSet("script","tts","voice","align","meta","cues","karaoke","assemble","check","render","post")]
  [string]$To = "check"
)
$ErrorActionPreference = "Stop"
$P = Split-Path -Parent $PSScriptRoot
$CFG = Get-Content -Raw -Encoding utf8 "$P/video.config.json" | ConvertFrom-Json
$VENV = $env:VIENEU_VENV ?? "D:/TQD/Claude-Video/VieNeu-TTS"
$SK = "$($env:HF_SKILLS_DIR ?? "$HOME/.agents/skills")/faceless-explainer/scripts"
$HF = "hyperframes@$($CFG.cli.pin)"
$CACHE = $env:HF_CACHE_DIR ?? (Join-Path $P "../../.hf-cache")
$stages = "script","tts","voice","align","meta","cues","karaoke","assemble","check","render","post"
$run = $stages[$stages.IndexOf($From)..$stages.IndexOf($To)]
Set-Location $P

function Step([string]$name, [scriptblock]$body) {
  if ($run -contains $name) {
    Write-Host "== $name" -ForegroundColor Cyan
    & $body
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "stage $name failed ($LASTEXITCODE)" }
  }
}

Step script {
  node tools/src-to-script.mjs script.src.txt script.json
  node tools/script-to-md.mjs --check script.json
  node tools/script-to-md.mjs --review script.json
  node tools/tts-manifest.mjs
}
Step tts {
  node tools/tts-manifest.mjs --pending | Out-Null
  throw "Run the pending TTS jobs via the vieneu-tts MCP (tools/tts-manifest.mjs --pending), then rerun with -From voice"
}
Step voice {
  uv run --directory $VENV python "$P/tools/build-voice.py" --qa
  uv run --directory $VENV python "$P/tools/build-voice.py"
  uv run --directory $VENV python "$P/tools/build-voice.py" --verify
}
Step align {
  uv run --directory $VENV python "$P/tools/align-words.py" --jobs "$P/audio/tts-jobs.json" --clip-dir "$P/audio/trimmed" --out-dir "$P/audio/align"
}
Step meta {
  uv run --directory $VENV python "$P/tools/build-audio-meta.py"
}
Step cues {
  node "$SK/audio.mjs" sync-durations --audio-meta ./audio_meta.json --storyboard ./STORYBOARD.md
  node tools/retime-and-cue.mjs
  node tools/retime-and-cue.mjs --check
  node tools/variety-lint.mjs STORYBOARD.md
}
Step karaoke {
  node tools/build-karaoke.mjs
  node tools/build-karaoke.mjs --check
  node tools/build-overlay.mjs
}
Step assemble {
  node "$SK/assemble-index.mjs" --storyboard ./STORYBOARD.md --hyperframes .
  node "$SK/transitions.mjs" inject --storyboard ./STORYBOARD.md --hyperframes .
  node tools/inject-overlay.mjs
  node "$SK/transitions.mjs" verify --storyboard ./STORYBOARD.md --index ./index.html
}
Step check {
  npx -y $HF lint
  npx -y $HF check --timeout 60000
}
Step render {
  npx -y $HF render --quality $CFG.render.quality --fps $CFG.render.fps --frames-cache-dir $CACHE --output renders/master-raw.mp4
}
Step post {
  node tools/postprocess.mjs
}
Write-Host "pipeline ok: $From -> $To" -ForegroundColor Green

# Start the VieNeu-TTS speech API that the MCP server talks to (http://127.0.0.1:8000).
# GPU (CUDA torch installed) is used automatically, in fp32 by default (see run-api.py).
# Extra env such as VIENEU_BACKEND=onnx|pytorch, VIENEU_DTYPE or VIENEU_API_KEY is passed through.
# The VieNeu-TTS checkout comes from -Repo, else $env:VIENEU_REPO, else a sibling folder ..\VieNeu-TTS.
param(
    [string]$HostName = "127.0.0.1",
    [int]$Port = 8000,
    [string]$Repo = ($env:VIENEU_REPO ?? (Join-Path $PSScriptRoot "..\VieNeu-TTS"))
)
$ErrorActionPreference = "Stop"
$env:HOST = $HostName
$env:PORT = "$Port"
$env:PYTHONIOENCODING = "utf-8"
Push-Location $Repo
try {
    uv run python (Join-Path $PSScriptRoot "run-api.py")
} finally {
    Pop-Location
}

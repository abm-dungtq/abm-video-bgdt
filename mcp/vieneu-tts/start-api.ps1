# Start the VieNeu-TTS speech API (http://127.0.0.1:8000). Thin wrapper around start-api.mjs, which works on every OS
# and reads the VieNeu-TTS folder and backend settings from the machine profile written by setup/setup.mjs.
#
#   pwsh mcp/vieneu-tts/start-api.ps1 [-Repo <VieNeu-TTS dir>] [-HostName 127.0.0.1] [-Port 8000]
param(
    [string]$HostName = "127.0.0.1",
    [int]$Port = 8000,
    [string]$Repo = ""
)
$ErrorActionPreference = "Stop"
$argsList = @("$PSScriptRoot/start-api.mjs", "--host", $HostName, "--port", "$Port")
if ($Repo) { $argsList += @("--repo", $Repo) }
node @argsList
exit $LASTEXITCODE

# install.ps1 — one-command setup of abm-video-bgdt on Windows (works in Windows PowerShell 5.1 and PowerShell 7).
#
# From anywhere (downloads the skill to ~/.agents/skills/abm-video-bgdt):
#   powershell -ExecutionPolicy Bypass -c "& ([scriptblock]::Create((irm https://raw.githubusercontent.com/abm-dungtq/abm-video-bgdt/main/setup/install.ps1)))"
# From a clone:
#   powershell -ExecutionPolicy Bypass -File setup\install.ps1 [-Yes] [-DryRun] [-SkillDir <path>] [-SetupArgs "--profile cpu"]
#
# 1. installs the missing base tools with winget: Git, Node.js LTS, FFmpeg, uv, PowerShell 7
# 2. clones the skill when this script does not run from a clone
# 3. runs setup/setup.mjs (HyperFrames skills, VieNeu-TTS for this hardware, MCP registration, doctor)
param(
    [switch]$Yes,
    [switch]$DryRun,
    [string]$SkillDir = "",
    [string]$SetupArgs = ""
)
$ErrorActionPreference = "Stop"
$Repo = "https://github.com/abm-dungtq/abm-video-bgdt.git"

function Test-Command($name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function Update-SessionPath {
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}

# ── 1. base tools ──────────────────────────────────────────────────────────────
$tools = @(
    @{ Bin = "git";    Id = "Git.Git" },
    @{ Bin = "node";   Id = "OpenJS.NodeJS.LTS" },
    @{ Bin = "ffmpeg"; Id = "Gyan.FFmpeg" },
    @{ Bin = "uv";     Id = "astral-sh.uv" },
    @{ Bin = "pwsh";   Id = "Microsoft.PowerShell" }
)
$missing = @($tools | Where-Object { -not (Test-Command $_.Bin) })
if ($missing.Count -gt 0) {
    $names = ($missing | ForEach-Object { $_.Bin }) -join ", "
    Write-Host "Missing base tools: $names"
    if (-not (Test-Command "winget")) {
        throw "winget not found. Install 'App Installer' from the Microsoft Store, or install $names by hand, then rerun."
    }
    if (-not $DryRun -and -not $Yes) {
        $answer = Read-Host "Install them with winget now? [y/N]"
        if ($answer -notmatch "^(y|yes)$") { throw "Cancelled." }
    }
    foreach ($t in $missing) {
        Write-Host "  winget install --id $($t.Id) -e"
        if (-not $DryRun) {
            winget install --id $t.Id -e --silent --accept-source-agreements --accept-package-agreements
            if ($LASTEXITCODE -ne 0) { throw "winget could not install $($t.Id)" }
        }
    }
    if (-not $DryRun) { Update-SessionPath }
}
if (-not $DryRun) {
    $nodeMajor = [int]((node --version).TrimStart("v").Split(".")[0])
    if ($nodeMajor -lt 20) { throw "Node.js $nodeMajor found; version 20 or newer is required (winget upgrade OpenJS.NodeJS.LTS)." }
}

# ── 2. the skill itself ────────────────────────────────────────────────────────
if (-not $SkillDir) {
    if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "..\SKILL.md"))) {
        $SkillDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    } else {
        $SkillDir = Join-Path $HOME ".agents\skills\abm-video-bgdt"
    }
}
if (-not (Test-Path (Join-Path $SkillDir "SKILL.md"))) {
    Write-Host "  git clone $Repo $SkillDir"
    if (-not $DryRun) {
        git clone $Repo $SkillDir
        if ($LASTEXITCODE -ne 0) { throw "git clone failed" }
    }
}

# ── 3. everything else ─────────────────────────────────────────────────────────
$setup = Join-Path $SkillDir "setup\setup.mjs"
$setupArgsList = @($setup)
if ($Yes) { $setupArgsList += "--yes" }
if ($DryRun) { $setupArgsList += "--dry-run" }
if ($SetupArgs) { $setupArgsList += ($SetupArgs -split "\s+" | Where-Object { $_ }) }
if ($DryRun -and -not (Test-Path $setup)) {
    Write-Host "  node $($setupArgsList -join ' ')"
    exit 0
}
node @setupArgsList
exit $LASTEXITCODE

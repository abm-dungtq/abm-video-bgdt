#!/usr/bin/env bash
# install.sh — one-command setup of abm-video-bgdt on macOS and Linux.
#
# From anywhere (downloads the skill to ~/.agents/skills/abm-video-bgdt):
#   curl -fsSL https://raw.githubusercontent.com/abm-dungtq/abm-video-bgdt/main/setup/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/abm-dungtq/abm-video-bgdt/main/setup/install.sh | bash -s -- --yes
# From a clone:
#   bash setup/install.sh [--yes] [--dry-run] [--skill-dir <path>] [-- <extra setup.mjs args, e.g. --profile cpu>]
#
# 1. installs the missing base tools: git, Node.js >= 20 (nvm), ffmpeg, uv, PowerShell 7
#    (macOS: Homebrew; Linux: apt, dnf or pacman, plus snap for PowerShell when available)
# 2. clones the skill when this script does not run from a clone
# 3. runs setup/setup.mjs (HyperFrames skills, VieNeu-TTS for this hardware, MCP registration, doctor)
set -euo pipefail

REPO="https://github.com/abm-dungtq/abm-video-bgdt.git"
YES=0; DRY=0; SKILL_DIR=""; EXTRA=()
while [ $# -gt 0 ]; do
  case "$1" in
    --yes) YES=1 ;;
    --dry-run) DRY=1 ;;
    --skill-dir) SKILL_DIR="$2"; shift ;;
    --) shift; EXTRA=("$@"); break ;;
    *) EXTRA+=("$1") ;;
  esac
  shift
done

has() { command -v "$1" >/dev/null 2>&1; }
say() { printf '%s\n' "$*"; }
do_run() { say "  \$ $*"; [ "$DRY" = 1 ] || "$@"; }
SUDO=""; [ "$(id -u)" -ne 0 ] && has sudo && SUDO="sudo"

case "$(uname -s)" in
  Darwin) OS=mac ;;
  Linux) OS=linux ;;
  *) say "This installer is for macOS and Linux. On Windows use setup/install.ps1."; exit 1 ;;
esac

pkg_install() { # install OS packages by name
  if [ "$OS" = mac ]; then
    has brew || { say "Homebrew is required: https://brew.sh"; exit 1; }
    do_run brew install "$@"
  elif has apt-get; then do_run $SUDO apt-get update -y; do_run $SUDO apt-get install -y "$@"
  elif has dnf; then do_run $SUDO dnf install -y "$@"
  elif has pacman; then do_run $SUDO pacman -S --noconfirm "$@"
  else say "No supported package manager (apt, dnf, pacman). Install $* by hand."; exit 1
  fi
}

# ── 1. base tools ──────────────────────────────────────────────────────────────
node_ok() { has node && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; }
MISSING=()
has git || MISSING+=(git)
node_ok || MISSING+=(node)
has ffmpeg || MISSING+=(ffmpeg)
has uv || MISSING+=(uv)
has pwsh || MISSING+=(pwsh)
if [ ${#MISSING[@]} -gt 0 ]; then
  say "Missing base tools: ${MISSING[*]}"
  if [ "$DRY" = 0 ] && [ "$YES" = 0 ]; then
    if [ -t 0 ] || [ -e /dev/tty ]; then
      read -r -p "Install them now? [y/N] " ans </dev/tty || ans=""
      case "$ans" in y|Y|yes) ;; *) say "Cancelled."; exit 1 ;; esac
    else
      say "Not interactive: rerun with --yes after the user agreed."; exit 1
    fi
  fi
  for t in "${MISSING[@]}"; do
    case "$t" in
      git|ffmpeg) pkg_install "$t" ;;
      node)
        say "  installing Node.js LTS with nvm (https://github.com/nvm-sh/nvm)"
        if [ "$DRY" = 0 ]; then
          curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
          export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm install --lts
        fi ;;
      uv)
        do_run sh -c "curl -LsSf https://astral.sh/uv/install.sh | sh"
        export PATH="$HOME/.local/bin:$PATH" ;;
      pwsh)
        if [ "$OS" = mac ]; then do_run brew install powershell/tap/powershell
        elif has snap; then do_run $SUDO snap install powershell --classic
        else say "  PowerShell 7: follow https://learn.microsoft.com/powershell/scripting/install/install-powershell-on-linux (needed for tools/run-pipeline.ps1)"
        fi ;;
    esac
  done
fi

# ── 2. the skill itself ────────────────────────────────────────────────────────
if [ -z "$SKILL_DIR" ]; then
  HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
  if [ -n "$HERE" ] && [ -f "$HERE/../SKILL.md" ]; then SKILL_DIR="$(cd "$HERE/.." && pwd)"
  else SKILL_DIR="$HOME/.agents/skills/abm-video-bgdt"
  fi
fi
[ -f "$SKILL_DIR/SKILL.md" ] || do_run git clone "$REPO" "$SKILL_DIR"

# ── 3. everything else ─────────────────────────────────────────────────────────
ARGS=("$SKILL_DIR/setup/setup.mjs")
[ "$YES" = 1 ] && ARGS+=(--yes)
[ "$DRY" = 1 ] && ARGS+=(--dry-run)
ARGS+=("${EXTRA[@]+"${EXTRA[@]}"}")
if [ "$DRY" = 1 ] && [ ! -f "$SKILL_DIR/setup/setup.mjs" ]; then say "  \$ node ${ARGS[*]}"; exit 0; fi
# piped through `curl | bash`, stdin is the script itself: give setup.mjs the terminal so it can ask
if [ ! -t 0 ] && { : </dev/tty; } 2>/dev/null; then exec node "${ARGS[@]}" </dev/tty; fi
exec node "${ARGS[@]}"

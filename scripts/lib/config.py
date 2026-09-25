"""Project parameters from video.config.json (project root = HF_PROJECT or the parent of tools/)."""
import json
import os
from pathlib import Path

ROOT = Path(os.environ.get("HF_PROJECT", Path(__file__).resolve().parent.parent.parent))
CFG = json.loads((ROOT / "video.config.json").read_text(encoding="utf-8"))

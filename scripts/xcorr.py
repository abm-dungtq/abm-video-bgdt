"""Audio drift between the rendered video and the source narration.

For each timestamp, cross-correlate 2 s of the render's audio against the same window of the
concatenated per-frame voice track, and report the offset (seconds; + means the render is late).

  xcorr.py --render renders/draft.mp4 --reference audio/voice-concat.wav --at 30,120.5,300 --out renders/sync.json
"""
import argparse
import json
import subprocess

import numpy as np

SR = 16000
WIN = 2.0
MAX_LAG = 0.5


def load(path, start, dur):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", f"{max(0.0, start):.3f}", "-t", f"{dur:.3f}", "-i", path,
         "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32)


def offset(render, reference, t):
    ref = load(reference, t, WIN)
    rnd = load(render, t - MAX_LAG, WIN + 2 * MAX_LAG)
    if ref.size == 0 or rnd.size < ref.size or np.abs(ref).max() < 50:
        return None, 0.0
    corr = np.correlate(rnd, ref, mode="valid")
    k = int(np.argmax(corr))
    norm = np.linalg.norm(ref) * np.linalg.norm(rnd[k:k + ref.size]) + 1e-9
    return round(k / SR - MAX_LAG, 4), round(float(corr[k] / norm), 3)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--render", required=True)
    ap.add_argument("--reference", required=True)
    ap.add_argument("--at", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    rows = []
    for t in [float(x) for x in a.at.split(",")]:
        off, score = offset(a.render, a.reference, t)
        rows.append({"t": t, "offset_s": off, "score": score})
        print(f"t={t:8.2f}  offset={off}  score={score}")
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=1)


if __name__ == "__main__":
    main()

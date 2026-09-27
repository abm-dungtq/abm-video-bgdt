"""Per-frame narration wavs from per-sentence VieNeu clips.

  build-voice.py --qa        flag clips whose length is implausible for their syllable count
  build-voice.py             trim clips -> audio/trimmed/, lay out frames -> assets/voice/NN.wav,
                             write audio/offsets.json
  build-voice.py --verify    check offsets against the frame wavs

Run from the project root with the VieNeu venv:
  uv run --directory <VieNeu-TTS dir> python <project>/tools/build-voice.py
"""
import argparse
import json
import os
import subprocess
import sys
import wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.config import CFG, ROOT  # noqa: E402

SR = CFG["voice"]["sampleRate"]
_t = CFG["timing"]  # shared with tools/script-to-md.mjs
LEAD_S, TITLE_LEAD_S, GAP_S, TAIL_S, PAD_S = _t["lead"], _t["titleLead"], _t["gap"], _t["tail"], _t["pad"]
# Leading-silence trim only; applied forward and on the reversed signal to trim both ends
# without touching pauses inside the sentence.
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB"


def wav_duration(path):
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def read_pcm(path):
    with wave.open(str(path)) as w:
        assert w.getframerate() == SR and w.getnchannels() == 1 and w.getsampwidth() == 2, path
        return w.readframes(w.getnframes())


def silence(seconds):
    return b"\x00\x00" * int(round(seconds * SR))


def load():
    script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
    rate = script["meta"]["rate"]
    frames = [f for c in script["chapters"] for f in c["frames"]]
    return frames, rate


def syllables(sentence):
    return sum(len([w for w in t["spoken"].split() if any(ch.isalnum() for ch in w)]) for t in sentence["tokens"])


def qa(frames, rate):
    flagged = []
    for f in frames:
        for s in f["sentences"]:
            clip = ROOT / "audio/clips" / f"{s['id']}.wav"
            d = wav_duration(clip)
            expected = syllables(s) / rate
            if d < 0.6 * expected or d > 1.6 * expected:
                flagged.append({"id": s["id"], "duration": round(d, 2), "expected": round(expected, 2)})
    (ROOT / "audio/qa-flagged.json").write_text(json.dumps(flagged, ensure_ascii=False, indent=1), encoding="utf-8")
    accepted = ROOT / "audio/qa-accepted.txt"
    remaining = [x for x in flagged if not (accepted.exists() and x["id"] in accepted.read_text(encoding="utf-8"))]
    for x in remaining:
        print(f"flag {x['id']}: {x['duration']}s vs expected {x['expected']}s")
    print(f"flagged={len(remaining)}")
    return 0 if not remaining else 1


def trim(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    af = f"{TRIM},areverse,{TRIM},areverse,adelay={int(PAD_S * 1000)},apad=pad_dur={PAD_S}"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", af, "-ar", str(SR), "-ac", "1",
         "-sample_fmt", "s16", str(dst)],
        check=True,
    )


def build(frames):
    offsets = {}
    out_dir = ROOT / "assets/voice"
    out_dir.mkdir(parents=True, exist_ok=True)
    for f in frames:
        lead = TITLE_LEAD_S if f["scene_hint"] == "title" else LEAD_S
        pcm, t = silence(lead), lead
        for i, s in enumerate(f["sentences"]):
            if i:
                pcm += silence(GAP_S)
                t += GAP_S
            trimmed = ROOT / "audio/trimmed" / f"{s['id']}.wav"
            trim(ROOT / "audio/clips" / f"{s['id']}.wav", trimmed)
            data = read_pcm(trimmed)
            d = len(data) / 2 / SR
            offsets[s["id"]] = {"frame": f["id"], "offset_s": round(t, 4), "duration_s": round(d, 4)}
            pcm += data
            t += d
        pcm += silence(TAIL_S)
        with wave.open(str(out_dir / f"{f['id']:02d}.wav"), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm)
    (ROOT / "audio/offsets.json").write_text(json.dumps(offsets, indent=1), encoding="utf-8")
    print(f"frames={len(frames)} sentences={len(offsets)}")


def verify(frames):
    offsets = json.loads((ROOT / "audio/offsets.json").read_text(encoding="utf-8"))
    bad = []
    for f in frames:
        total = wav_duration(ROOT / "assets/voice" / f"{f['id']:02d}.wav")
        for s in f["sentences"]:
            o = offsets.get(s["id"])
            if not o or o["frame"] != f["id"] or o["offset_s"] + o["duration_s"] > total + 1e-3:
                bad.append(s["id"])
    print(f"verify: bad={len(bad)} {bad[:5]}")
    return 0 if not bad else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--qa", action="store_true")
    ap.add_argument("--verify", action="store_true")
    a = ap.parse_args()
    frames, rate = load()
    if a.qa:
        sys.exit(qa(frames, rate))
    if a.verify:
        sys.exit(verify(frames))
    build(frames)


if __name__ == "__main__":
    main()

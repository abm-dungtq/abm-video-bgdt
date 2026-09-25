"""Word-level timing for Vietnamese TTS clips whose text is already known.

Forced alignment with torchaudio MMS_FA on uroman-romanized tokens; falls back to
syllable interpolation over the voiced span when the alignment fails a sanity gate.

  align-words.py --wav clip.wav --text "spoken text" --out words.json
  align-words.py --jobs audio/tts-jobs.json --clip-dir audio/trimmed --out-dir audio/align
"""
import argparse
import json
import re
import statistics
import subprocess
from pathlib import Path

import torch
import torchaudio
import uroman as ur

SR = 16000
MAX_WORD_S = 1.2
MAX_MEDIAN_GAP_S = 0.15

_bundle = torchaudio.pipelines.MMS_FA
_model = None
_tokenizer = None
_aligner = None
_dict = None
_roman = ur.Uroman()
_device = "cuda" if torch.cuda.is_available() else "cpu"


def _load():
    global _model, _tokenizer, _aligner, _dict
    if _model is None:
        _model = _bundle.get_model(with_star=False).to(_device).eval()
        _tokenizer = _bundle.get_tokenizer()
        _aligner = _bundle.get_aligner()
        _dict = _bundle.get_dict(star=None)


def load_wav(path):
    wav, sr = torchaudio.load(str(path))
    wav = wav.mean(0, keepdim=True)
    if sr != SR:
        wav = torchaudio.functional.resample(wav, sr, SR)
    return wav


def romanize(token):
    text = _roman.romanize_string(token).lower()
    text = "".join(c for c in text if c in _dict)
    return text or "a"


def voiced_span(path, duration):
    """First and last non-silent instants via ffmpeg silencedetect (-30 dB)."""
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "silencedetect=n=-30dB:d=0.08", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    first = ends[0] if starts and starts[0] <= 0.01 and ends else 0.0
    last = starts[-1] if starts and (len(starts) > len(ends) or starts[-1] > (ends[-1] if ends else 0)) else duration
    if last <= first:
        first, last = 0.0, duration
    return first, last


def syllable_fallback(path, tokens, duration):
    first, last = voiced_span(path, duration)
    weights = [max(len(t), 1) for t in tokens]
    total = sum(weights)
    words, t = [], first
    for tok, w in zip(tokens, weights):
        span = (last - first) * w / total
        words.append({"text": tok, "start": round(t, 3), "end": round(t + span, 3)})
        t += span
    return words


def mms_align(wav, tokens):
    _load()
    roman = [romanize(t) for t in tokens]
    with torch.inference_mode():
        emission, _ = _model(wav.to(_device))
        spans = _aligner(emission[0], _tokenizer(roman))
    ratio = wav.size(1) / emission.size(1) / SR
    return [
        {"text": tok, "start": round(s[0].start * ratio, 3), "end": round(s[-1].end * ratio, 3)}
        for tok, s in zip(tokens, spans)
    ]


def sane(words, duration):
    if not words:
        return False
    for i, w in enumerate(words):
        if w["end"] <= w["start"] or w["end"] > duration + 0.05:
            return False
        if i and w["start"] < words[i - 1]["start"]:
            return False
        if i < len(words) - 1 and w["end"] - w["start"] > MAX_WORD_S:
            return False
    gaps = [max(0.0, words[i]["start"] - words[i - 1]["end"]) for i in range(1, len(words))]
    return not gaps or statistics.median(gaps) < MAX_MEDIAN_GAP_S


def align(path, text):
    tokens = text.split()
    wav = load_wav(path)
    duration = wav.size(1) / SR
    try:
        words = mms_align(wav, tokens)
        if sane(words, duration):
            return {"method": "mms_fa", "duration": round(duration, 3), "words": words}
    except Exception as exc:  # alignment failure falls through to the fallback
        print(f"mms_fa failed on {path}: {exc}")
    return {"method": "syllable", "duration": round(duration, 3), "words": syllable_fallback(path, tokens, duration)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wav")
    ap.add_argument("--text")
    ap.add_argument("--out")
    ap.add_argument("--jobs")
    ap.add_argument("--clip-dir")
    ap.add_argument("--out-dir")
    a = ap.parse_args()
    if a.jobs:
        jobs = json.loads(Path(a.jobs).read_text(encoding="utf-8"))
        out_dir = Path(a.out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        for job in jobs:
            res = align(Path(a.clip_dir) / f"{job['id']}.wav", job["text"])
            (out_dir / f"{job['id']}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
            print(job["id"], res["method"])
    else:
        res = align(a.wav, a.text)
        Path(a.out).write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
        print(res["method"], len(res["words"]))


if __name__ == "__main__":
    main()

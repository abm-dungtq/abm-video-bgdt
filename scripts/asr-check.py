"""Check that each TTS clip says its text: Vietnamese speech recognition (PhoWhisper) + word error rate.

Forced alignment always "succeeds" on the text it is given, so a clip where the voice skipped, repeated or garbled
words still aligns and the karaoke shows words that were never said. This transcribes each clip and compares.

  asr-check.py --jobs audio/tts-jobs.json [--ids s001-1,s004-2] [--out audio/asr-report.json] [--max-wer 0.2]
  asr-check.py --frames script.json --voice-dir assets/voice            (per-frame voice files of a built project)

Prints one line per flagged clip and `asr: <n> clip(s), <f> flagged, mean WER <x>`; exit 0 (the caller decides).
Model: ABM_ASR_MODEL (default vinai/PhoWhisper-small), cached by Hugging Face on first use (~1 GB).
"""
import argparse
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

import torch
import torchaudio

MODEL = os.environ.get("ABM_ASR_MODEL", "vinai/PhoWhisper-small")
SR = 16000
_pipe = None

DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]


def read_int(n: int) -> str:
    """Vietnamese words for 0 ≤ n < 10^12 (ASR may write digits where the script spelled a number out)."""
    if n < 10:
        return DIGITS[n]
    if n < 100:
        t, u = divmod(n, 10)
        head = "mười" if t == 1 else f"{DIGITS[t]} mươi"
        if u == 0:
            return head
        tail = "mốt" if u == 1 and t > 1 else "lăm" if u == 5 else "tư" if u == 4 and t > 1 else DIGITS[u]
        return f"{head} {tail}"
    if n < 1000:
        h, r = divmod(n, 100)
        return f"{DIGITS[h]} trăm" + ("" if r == 0 else f" linh {DIGITS[r]}" if r < 10 else f" {read_int(r)}")
    for scale, word in ((10**9, "tỷ"), (10**6, "triệu"), (10**3, "nghìn")):
        if n >= scale:
            q, r = divmod(n, scale)
            rest = "" if r == 0 else f" không trăm linh {DIGITS[r]}" if r < 10 else f" không trăm {read_int(r)}" if r < 100 else f" {read_int(r)}"
            return f"{read_int(q)} {word}{rest}"
    return str(n)


SYLLABLE = re.compile(r"^(ngh|ng|nh|ch|gh|gi|kh|ph|qu|th|tr|b|c|d|đ|g|h|k|l|m|n|p|r|s|t|v|x)?(uyê|uya|uyu|oeo|oao|oai|oay|uây|uôi|ươi|ươu|iêu|yêu|oa|oe|oă|uâ|uê|uy|uô|ươ|iê|yê|ai|ao|au|ay|âu|ây|eo|êu|ia|iu|oi|ôi|ơi|ua|ui|ưa|ưi|ưu|a|ă|â|e|ê|i|o|ô|ơ|u|ư|y)(ch|ng|nh|c|m|n|p|t)?$")
TONES = dict.fromkeys(map(ord, "\u0300\u0301\u0303\u0309\u0323"))


def vietnamese(word: str) -> bool:
    """Same rule as scripts/lib/spoken.mjs isVietnamese, on one lower-case word."""
    plain = unicodedata.normalize("NFC", unicodedata.normalize("NFD", word).translate(TONES))
    return bool(SYLLABLE.match(plain)) or word.isdigit()


def words(text: str, wildcard: bool = False) -> list:
    """Lower-case words; with wildcard, a foreign word (the voice may say it any way) becomes "*"."""
    return ["*" if wildcard and not vietnamese(w) else w for w in _words(text)]


def _words(text: str) -> list:
    text = unicodedata.normalize("NFC", text.lower())
    text = re.sub(r"(\d+)[.,](\d+)", lambda m: f"{m.group(1)} chấm {m.group(2)}", text)
    text = re.sub(r"\d+", lambda m: f" {read_int(int(m.group()))} ", text)
    return re.findall(r"[\w]+", text)


def wer(ref: list, hyp: list) -> float:
    """Word error rate; a "*" in ref matches zero to two heard words for free (a foreign word read the voice's way)."""
    n = len(hyp)
    prev = list(range(n + 1))
    for r in ref:
        cur = [0] * (n + 1)
        if r == "*":
            for j in range(n + 1):
                cur[j] = min(prev[j - k] for k in range(0, min(2, j) + 1))
        else:
            cur[0] = prev[0] + 1
            for j in range(1, n + 1):
                cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != hyp[j - 1]))
        prev = cur
    return prev[n] / max(1, sum(w != "*" for w in ref))


def transcribe(path: Path) -> str:
    global _pipe
    if _pipe is None:
        from transformers import pipeline
        _pipe = pipeline("automatic-speech-recognition", model=MODEL, device=0 if torch.cuda.is_available() else -1)
    wav, sr = torchaudio.load(str(path))
    wav = torchaudio.functional.resample(wav.mean(0), sr, SR).numpy()
    out = _pipe({"raw": wav, "sampling_rate": SR}, generate_kwargs={"language": "vi", "task": "transcribe"},
                chunk_length_s=30)
    return out["text"].strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs")
    ap.add_argument("--ids")
    ap.add_argument("--frames")
    ap.add_argument("--voice-dir", default="assets/voice")
    ap.add_argument("--out", default="audio/asr-report.json")
    ap.add_argument("--max-wer", type=float, default=0.2)
    a = ap.parse_args()

    items = []
    if a.jobs:
        want = set(a.ids.split(",")) if a.ids else None
        for j in json.loads(Path(a.jobs).read_text(encoding="utf-8")):
            if want is None or j["id"] in want:
                items.append((j["id"], Path(j["output_path"]), j["text"]))
    elif a.frames:
        script = json.loads(Path(a.frames).read_text(encoding="utf-8"))
        for ch in script["chapters"]:
            for fr in ch["frames"]:
                text = " ".join(t["spoken"] for s in fr["sentences"] for t in s["tokens"])
                items.append((f"frame {fr['id']}", Path(a.voice_dir) / f"{fr['id']:02d}.wav", text))
    else:
        ap.error("--jobs or --frames is required")

    report, flagged = [], 0
    for id_, path, text in items:
        if not path.exists():
            report.append({"id": id_, "missing": str(path)})
            print(f"asr {id_}: missing {path}")
            flagged += 1
            continue
        heard = transcribe(path)
        w = round(wer(words(text, wildcard=True), words(heard)), 3)
        bad = w > a.max_wer
        flagged += bad
        report.append({"id": id_, "wer": w, "flagged": bad, "expected": text, "heard": heard})
        if bad:
            print(f"asr {id_}: WER {w}\n  expected: {text}\n  heard:    {heard}")
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    scored = [r["wer"] for r in report if "wer" in r]
    mean = sum(scored) / len(scored) if scored else 0
    print(f"asr: {len(report)} clip(s), {flagged} flagged, mean WER {mean:.3f}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()

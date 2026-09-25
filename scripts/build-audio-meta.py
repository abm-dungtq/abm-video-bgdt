"""offsets.json + audio/align/*.json + script.json -> audio_meta.json (faceless-explainer shape).

Word times are frame-relative: sentence offset inside the frame wav + aligned time inside
the trimmed clip. Each display token takes the span of the spoken words it produced.
Also writes audio/align-report.json and audio/total.txt.
"""
import json
import os
import sys
import wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.config import ROOT  # noqa: E402


def wav_duration(path):
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def main():
    script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
    offsets = json.loads((ROOT / "audio/offsets.json").read_text(encoding="utf-8"))
    voices, report = [], {"sentences": 0, "mms_fa": 0, "syllable": 0, "failed": []}
    for chapter in script["chapters"]:
        for f in chapter["frames"]:
            words = []
            for s in f["sentences"]:
                report["sentences"] += 1
                align_path = ROOT / "audio/align" / f"{s['id']}.json"
                if not align_path.exists():
                    report["failed"].append(s["id"])
                    continue
                al = json.loads(align_path.read_text(encoding="utf-8"))
                report[al["method"]] += 1
                spoken = al["words"]
                base = offsets[s["id"]]["offset_s"]
                k = 0
                for tok in s["tokens"]:
                    n = max(1, len(tok["spoken"].split()))
                    span = spoken[k:k + n]
                    k += n
                    if not span:
                        report["failed"].append(s["id"])
                        break
                    words.append({
                        "id": f"w{f['id']:02d}-{len(words) + 1:03d}",
                        "text": tok["display"],
                        "start": round(base + span[0]["start"], 3),
                        "end": round(base + span[-1]["end"], 3),
                    })
                if k != len(spoken) and s["id"] not in report["failed"]:
                    report["failed"].append(s["id"])
            path = f"assets/voice/{f['id']:02d}.wav"
            voices.append({
                "frame": f["id"],
                "path": path,
                "duration_s": round(wav_duration(ROOT / path), 3),
                "words": words,
            })
    meta = {"bgm": None, "bgm_pending": False, "voices": voices, "sfx": []}
    (ROOT / "audio_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    (ROOT / "audio/align-report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    total = round(sum(v["duration_s"] for v in voices), 3)
    (ROOT / "audio/total.txt").write_text(str(total), encoding="utf-8")
    print(f"voices={len(voices)} total={total}s report={report['mms_fa']} mms_fa / {report['syllable']} syllable / {len(report['failed'])} failed")


if __name__ == "__main__":
    main()

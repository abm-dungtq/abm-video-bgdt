"""Start the upstream VieNeu speech API with a configurable torch dtype.

The upstream server (VieNeu-TTS/apps/openai_speech.py) always loads the model with
dtype="auto", which picks bf16 on CUDA. Pascal GPUs such as the GTX 1080 have no
fast bf16/fp16 path, and fp32 measured ~1.7x faster in batched generation there,
so this launcher defaults to fp32. Run it from the VieNeu-TTS directory (start-api.ps1
does that). VIENEU_DTYPE=auto|float32|bfloat16|float16; the ONNX/CPU backend ignores it.
"""
import functools
import os

import apps.openai_speech as api
from vieneu import Vieneu

api.Vieneu = functools.partial(Vieneu, dtype=os.environ.get("VIENEU_DTYPE", "float32"))

if __name__ == "__main__":
    api.main()

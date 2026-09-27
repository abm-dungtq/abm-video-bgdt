"""MCP server that lets agents synthesize Vietnamese speech through VieNeu-TTS.

It is a thin client of the VieNeu-TTS OpenAI-compatible API
(``VieNeu-TTS/apps/openai_speech.py``), so the model is loaded once by the API
process and shared by every agent session.

Environment:
    VIENEU_API_URL     base URL of the speech API (default http://127.0.0.1:8000)
    VIENEU_API_KEY     Bearer key, only if the API was started with one
    VIENEU_OUTPUT_DIR  where generated .wav files go (default ./outputs next to this file)
"""
from __future__ import annotations

import logging
import os
import re
import time
import unicodedata
import uuid
import wave
from pathlib import Path
from typing import Any

import httpx
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError

API_URL = os.environ.get("VIENEU_API_URL", "http://127.0.0.1:8000").rstrip("/")
API_KEY = os.environ.get("VIENEU_API_KEY")
OUTPUT_DIR = Path(os.environ.get("VIENEU_OUTPUT_DIR") or Path(__file__).parent / "outputs")
SAMPLE_RATES = (48_000, 24_000, 16_000, 8_000)
# Long texts on CPU run at ~0.5x real time, so allow generous read time.
TIMEOUT = httpx.Timeout(connect=5.0, read=900.0, write=60.0, pool=5.0)
CONNECT_HINT = (
    "Cannot reach the VieNeu API at {url}. Start it with start-api.ps1 next to this server "
    "(or `uv run python -m apps.openai_speech` inside VieNeu-TTS)."
)

logging.getLogger("httpx").setLevel(logging.WARNING)

mcp = MCPServer(
    "vieneu-tts",
    instructions=(
        "Vietnamese (and bilingual Vi-En) text-to-speech with VieNeu-TTS v3 Turbo. "
        "Call list_voices to pick a voice, then text_to_speech to write a .wav file. "
        "Inline emotion tags [cười], [thở dài], [hắng giọng] are supported in the text. "
        "clone_voice enrolls a 3-8 s reference clip as a new voice name."
    ),
)


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {API_KEY}"} if API_KEY else {}


def _raise_for_api(r: httpx.Response) -> None:
    if r.is_success:
        return
    try:
        msg = r.json()["error"]["message"]
    except Exception:  # noqa: BLE001
        msg = r.text[:500]
    raise ToolError(f"VieNeu API {r.status_code}: {msg}")


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=API_URL, headers=_headers(), timeout=TIMEOUT)


async def _request(method: str, path: str, **kw: Any) -> httpx.Response:
    try:
        async with _client() as c:
            r = await c.request(method, path, **kw)
    except httpx.ConnectError as e:
        raise ToolError(CONNECT_HINT.format(url=API_URL)) from e
    _raise_for_api(r)
    return r


def _default_output_path(text: str) -> Path:
    # ASCII-only names keep the files friendly to ffmpeg and other video tooling.
    ascii_text = unicodedata.normalize("NFKD", text.replace("đ", "d").replace("Đ", "D"))
    ascii_text = ascii_text.encode("ascii", "ignore").decode().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")[:40].strip("-") or "speech"
    # The random suffix keeps parallel calls with the same text from overwriting each other.
    return OUTPUT_DIR / f"{time.strftime('%Y%m%d-%H%M%S')}-{slug}-{uuid.uuid4().hex[:6]}.wav"


@mcp.tool()
async def list_voices() -> list[dict[str, Any]]:
    """List the voices the API can speak with: built-in presets plus voices added with clone_voice.

    Each entry has ``id`` (pass it as ``voice``), ``description``, ``gender`` and
    ``featured`` (editors' pick rank, lower is better; null if not featured).
    """
    r = await _request("GET", "/v1/voices")
    return [
        {k: v.get(k) for k in ("id", "description", "gender", "featured")}
        for v in r.json()["data"]
    ]


@mcp.tool()
async def text_to_speech(
    text: str,
    voice: str | None = None,
    output_path: str | None = None,
    sample_rate: int = 48_000,
    temperature: float = 0.8,
    top_k: int = 25,
    top_p: float = 0.95,
    repetition_penalty: float = 1.2,
) -> dict[str, Any]:
    """Synthesize speech from text and save it as a mono 16-bit .wav file.

    Args:
        text: Text to speak (Vietnamese or mixed Vi-En, up to 20,000 chars). Emotion tags
            [cười], [thở dài], [hắng giọng] may appear inline.
        voice: Voice id from list_voices. Omit to use the default voice.
        output_path: Where to write the .wav. Omit to auto-name it under the output folder.
        sample_rate: 48000 (native), 24000, 16000 or 8000.
        temperature, top_k, top_p, repetition_penalty: sampling controls; defaults are tuned.

    Returns the absolute file path, duration in seconds, sample rate, voice and generation time.
    """
    if not text.strip():
        raise ToolError("text is empty")
    if sample_rate not in SAMPLE_RATES:
        raise ToolError(f"sample_rate must be one of {SAMPLE_RATES}")
    out = Path(output_path).expanduser() if output_path else _default_output_path(text)
    if out.suffix.lower() != ".wav":
        out = out.with_suffix(".wav")
    out = out.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    body = {
        "input": text, "voice": voice, "response_format": "pcm", "sample_rate": sample_rate,
        "temperature": temperature, "top_k": top_k, "top_p": top_p,
        "repetition_penalty": repetition_penalty,
    }
    t0 = time.perf_counter()
    # Raw s16le PCM is streamed and written with a correct WAV header (the API's
    # streaming "wav" format uses an unknown-length header that some tools reject).
    try:
        async with _client() as c, c.stream("POST", "/v1/audio/speech", json=body) as r:
            if not r.is_success:
                await r.aread()
                _raise_for_api(r)
            with wave.open(str(out), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(sample_rate)
                async for chunk in r.aiter_bytes(65536):
                    w.writeframes(chunk)
    except httpx.ConnectError as e:
        raise ToolError(CONNECT_HINT.format(url=API_URL)) from e

    with wave.open(str(out), "rb") as w:
        duration = w.getnframes() / w.getframerate()
    return {
        "path": str(out),
        "duration_seconds": round(duration, 3),
        "sample_rate": sample_rate,
        "voice": voice or "(default)",
        "generation_seconds": round(time.perf_counter() - t0, 2),
    }


@mcp.tool()
async def clone_voice(
    name: str, audio_path: str, denoise: bool = True, description: str = ""
) -> dict[str, Any]:
    """Enroll a new voice from a 3-8 second reference clip (wav/mp3/flac/ogg/m4a, max 20 MB).

    After this, pass ``voice=name`` to text_to_speech. The voice lives in the API
    process memory and is lost when the API restarts.

    Args:
        name: New voice id: 1-64 letters, digits, spaces, '.', '-' or '_'.
        audio_path: Local path to the reference clip.
        denoise: Remove background noise first (keep True unless the clip is studio-clean).
        description: Optional short label (same character rules as name).
    """
    p = Path(audio_path).expanduser()
    if not p.is_file():
        raise ToolError(f"reference clip not found: {p}")
    data = {"name": name, "denoise": str(denoise).lower()}
    if description:
        data["description"] = description
    with p.open("rb") as f:
        r = await _request("POST", "/v1/voices", data=data, files={"file": (p.name, f)})
    return r.json()


@mcp.tool()
async def server_status() -> dict[str, Any]:
    """Report whether the VieNeu API is up, its backend (onnx/pytorch) and current load."""
    r = await _request("GET", "/health")
    return {"api_url": API_URL, "output_dir": str(OUTPUT_DIR.resolve()), **r.json()}


def main() -> None:
    mcp.run("stdio")


if __name__ == "__main__":
    main()

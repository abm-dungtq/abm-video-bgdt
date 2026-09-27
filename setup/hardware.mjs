// hardware.mjs — pick the VieNeu-TTS install profile that fits this machine.
//
//   cuda  NVIDIA GPU whose driver supports CUDA ≥ 12.8 (VieNeu's `--extra cuda` pins torch 2.8.0+cu128).
//         Compute capability < 8.0 (Pascal, Volta, Turing) has no fast bf16 path, so the API runs fp32;
//         Ampere and newer keep dtype "auto" (bf16).
//   mps   Apple Silicon: the ONNX engine speaks; torch from PyPI (with MPS) runs the word alignment.
//   cpu   everything else: the ONNX engine speaks; CPU torch runs the word alignment. Slower, same result.
//
// VieNeu-TTS only publishes environments for Windows x64, Linux x64 and macOS arm64; other platforms are unsupported.
//
//   node setup/hardware.mjs          prints the chosen profile as JSON

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TORCH = "2.8.0"; // torchaudio 2.9 drops forced_align (MMS_FA); keep torch and torchaudio on 2.8.0

function nvidia() {
  const q = spawnSync("nvidia-smi", ["--query-gpu=name,driver_version,memory.total,compute_cap", "--format=csv,noheader,nounits"], { encoding: "utf8" });
  if (q.status !== 0 || !q.stdout.trim()) return null;
  const [name, driver, memMiB, cap] = q.stdout.trim().split(/\r?\n/)[0].split(",").map((s) => s.trim());
  const head = spawnSync("nvidia-smi", [], { encoding: "utf8" }).stdout ?? "";
  const cuda = Number(head.match(/CUDA Version:\s*([\d.]+)/)?.[1] ?? 0);
  return { name, driver, vramGiB: Math.round(Number(memMiB) / 102.4) / 10, computeCap: Number(cap), maxCuda: cuda };
}

/** uv commands (run inside the VieNeu-TTS checkout) and API settings for a profile. */
export function recipe(profile, gpu) {
  switch (profile) {
    case "cuda":
      return {
        sync: ["sync", "--extra", "cuda"], pip: ["pip", "install", "uroman"],
        env: { VIENEU_BACKEND: "auto", VIENEU_DTYPE: gpu?.computeCap >= 8 ? "auto" : "float32" },
      };
    case "mps":
      return { sync: ["sync"], pip: ["pip", "install", `torch==${TORCH}`, `torchaudio==${TORCH}`, "uroman"], env: { VIENEU_BACKEND: "onnx" } };
    case "cpu":
      return {
        sync: ["sync"], pip: ["pip", "install", `torch==${TORCH}`, `torchaudio==${TORCH}`, "uroman", "--torch-backend", "cpu"],
        env: { VIENEU_BACKEND: "onnx" },
      };
    default:
      throw new Error(`unknown profile ${profile} (cuda | cpu | mps)`);
  }
}

export function detect() {
  const platform = process.platform, arch = process.arch;
  const supported = (platform === "win32" && arch === "x64") || (platform === "linux" && arch === "x64") || (platform === "darwin" && arch === "arm64");
  if (!supported) return { profile: "unsupported", platform, arch, reason: "VieNeu-TTS supports Windows x64, Linux x64 and macOS arm64 only" };
  if (platform === "darwin") return { profile: "mps", platform, arch, gpu: { name: "Apple Silicon" }, ...recipe("mps") };
  const gpu = nvidia();
  if (gpu && gpu.maxCuda >= 12.8) return { profile: "cuda", platform, arch, gpu, ...recipe("cuda", gpu) };
  return {
    profile: "cpu", platform, arch, gpu: gpu ?? null,
    note: gpu ? `NVIDIA driver supports CUDA ${gpu.maxCuda}; update the driver to one supporting CUDA 12.8+ to use the GPU` : undefined,
    ...recipe("cpu"),
  };
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) console.log(JSON.stringify(detect(), null, 2));

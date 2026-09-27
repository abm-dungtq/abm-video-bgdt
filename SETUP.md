# Cài đặt abm-video-bgdt cho mọi agent và hệ điều hành

Tài liệu này hướng dẫn cài skill trên máy của bạn, với agent bạn đang dùng. Không có đường dẫn nào gắn cứng với một máy:
những chỗ cần đường dẫn đều dùng biến môi trường hoặc tự dò (mục 6).

- Ký hiệu `<SKILL_DIR>` là thư mục bạn clone repo này về.
- Ký hiệu `<VIENEU_DIR>` là thư mục bạn clone VieNeu-TTS về.

## Cài nhanh

**Cách 1: một lệnh.** Trình cài làm lần lượt:
1. cài các công cụ nền còn thiếu;
2. clone skill vào `~/.agents/skills/abm-video-bgdt`;
3. cài **toàn bộ** skill HyperFrames;
4. dò phần cứng và cài VieNeu-TTS đúng cấu hình máy (GPU NVIDIA → CUDA, Mac Apple Silicon → MPS, còn lại → CPU);
5. đăng ký MCP cho mọi agent tìm thấy;
6. kiểm tra lại toàn bộ.

Trước khi thay đổi gì, trình cài đều in kế hoạch và hỏi xác nhận.

```powershell
# Windows (PowerShell 5.1 hoặc 7)
powershell -ExecutionPolicy Bypass -c "& ([scriptblock]::Create((irm https://raw.githubusercontent.com/abm-dungtq/abm-video-bgdt/main/setup/install.ps1)))"
```

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/abm-dungtq/abm-video-bgdt/main/setup/install.sh | bash
```

Tùy chọn hay dùng (thêm vào sau `setup.mjs`, sau `-SetupArgs "…"` trên Windows, hoặc sau `-- …` trên macOS/Linux):

| Tùy chọn | Tác dụng |
|---|---|
| `--vieneu-dir <đường-dẫn>` | dùng bản VieNeu-TTS có sẵn, hoặc clone vào chỗ bạn chọn (mặc định `~/VieNeu-TTS`) |
| `--profile cpu\|cuda\|mps` | ép cấu hình thay vì để tự dò |
| `--agents claude,codex` | chỉ đăng ký MCP cho các agent này |
| `--only link\|hyperframes\|vieneu\|mcp` | chỉ chạy một bước |
| `--dry-run` | chỉ in kế hoạch, không thay đổi gì |

**Cách 2: để agent tự cài.** Nói với agent của bạn:

> Đọc https://github.com/abm-dungtq/abm-video-bgdt/blob/main/setup/AGENT-SETUP.md và cài abm-video-bgdt cho máy này.

Agent sẽ làm theo [setup/AGENT-SETUP.md](setup/AGENT-SETUP.md):
1. chạy `doctor` và dry-run;
2. cho bạn xem kế hoạch và hỏi xác nhận;
3. chạy trình cài;
4. khởi động API giọng đọc;
5. hướng dẫn bạn khởi động lại agent và kiểm tra.

**Kiểm tra bất cứ lúc nào:** `node ~/.agents/skills/abm-video-bgdt/setup/doctor.mjs`. Mỗi mục thiếu đều kèm lệnh sửa.

**Mỗi lần làm video**, bật API giọng đọc trước:

```bash
node ~/.agents/skills/abm-video-bgdt/mcp/vieneu-tts/start-api.mjs
```

Các mục dưới đây là cách **cài thủ công**, và giải thích trình cài làm gì ở từng bước.

## 1. Skill gồm những phần nào

| Phần | Vai trò | Cài ở mục |
|---|---|---|
| Thư mục skill (`SKILL.md`, `scripts/`, `references/`, `templates/`) | agent đọc để biết quy trình; mỗi dự án nhận một bản sao `scripts/` | 3 |
| Skill HyperFrames của HeyGen (`faceless-explainer` và các skill lõi) | trình đọc storyboard, ghép khung, chuyển cảnh | 4 |
| VieNeu-TTS + API giọng đọc | model tiếng Việt; venv của nó chạy các bước căn thời gian | 5 |
| MCP server `vieneu-tts` (`<SKILL_DIR>/mcp/vieneu-tts`) | agent gọi `text_to_speech` qua MCP | 5, 7 |
| Node, ffmpeg, uv, PowerShell 7 | chạy script và render | 2 |

## 2. Công cụ nền theo hệ điều hành

| Công cụ | Windows (PowerShell) | macOS | Linux (Debian/Ubuntu) |
|---|---|---|---|
| Node.js ≥ 20 | `winget install OpenJS.NodeJS.LTS` | `brew install node` | [nvm](https://github.com/nvm-sh/nvm): `nvm install --lts` |
| ffmpeg + ffprobe | `winget install Gyan.FFmpeg` | `brew install ffmpeg` | `sudo apt install ffmpeg` |
| uv (kèm Python) | `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 \| iex"` | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | như macOS |
| PowerShell 7 (`pwsh`) | `winget install --id Microsoft.PowerShell --source winget` | `brew install powershell/tap/powershell` | thêm kho Microsoft rồi `sudo apt install powershell` ([hướng dẫn](https://learn.microsoft.com/powershell/scripting/install/install-powershell-on-linux)) |
| git | `winget install Git.Git` | có sẵn / `brew install git` | `sudo apt install git` |

Nguồn: [uv](https://docs.astral.sh/uv/getting-started/installation/), [PowerShell](https://learn.microsoft.com/powershell/scripting/install/).

PowerShell 7 cần cho `tools/run-pipeline.ps1` và `start-api.ps1` trên mọi hệ điều hành. Các script `.mjs` chỉ cần Node.

## 3. Đặt skill vào nơi agent đọc

Cách gọn nhất là clone **một lần** vào thư mục chung `~/.agents/skills`, rồi tạo liên kết cho các agent chỉ đọc thư mục riêng
của mình. Thư mục chung này được Cursor, Gemini CLI và OpenCode đọc trực tiếp.

```bash
git clone https://github.com/abm-dungtq/abm-video-bgdt.git ~/.agents/skills/abm-video-bgdt
```

| Agent | Thư mục skill (cá nhân · dự án) | Cần làm thêm |
|---|---|---|
| Claude Code (CLI và desktop) | `~/.claude/skills/` · `.claude/skills/` | liên kết từ `~/.claude/skills/abm-video-bgdt` |
| OpenAI Codex CLI | `~/.codex/skills/` · `.codex/skills/` | liên kết từ `~/.codex/skills/abm-video-bgdt` |
| Cursor | `~/.cursor/skills/`, `~/.agents/skills/` · `.cursor/skills/`, `.agents/skills/` | không |
| Gemini CLI | `~/.gemini/skills/`, `~/.agents/skills/` · `.gemini/skills/`, `.agents/skills/` | không |
| OpenCode | `~/.config/opencode/skills/`, `~/.agents/skills/`, `~/.claude/skills/` · `.opencode/skills/`, `.agents/skills/` | không |
| GitHub Copilot (VS Code agent mode, Copilot CLI) | hỗ trợ Agent Skills; hãy kiểm tra thư mục trong [tài liệu VS Code](https://code.visualstudio.com/docs/agent-customization/agent-skills) | liên kết vào thư mục đó |
| Windsurf / Devin Desktop | `.devin/skills/` (hoặc `.windsurf/skills/` cũ) · cá nhân `~/.config/devin/skills/` | liên kết vào thư mục đó |

Nguồn: [Claude Code](https://code.claude.com/docs/en/skills), [Codex](https://github.com/openai/codex/blob/main/docs/skills.md),
[Cursor](https://cursor.com/docs/skills), [Gemini CLI](https://geminicli.com/docs/cli/skills/), [OpenCode](https://opencode.ai/docs/skills/),
[Copilot](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills), [Devin Desktop](https://docs.devin.ai/desktop/cascade/skills).

Tạo liên kết, ví dụ cho Claude Code:

```bash
# macOS / Linux
mkdir -p ~/.claude/skills && ln -s ~/.agents/skills/abm-video-bgdt ~/.claude/skills/abm-video-bgdt
```

```powershell
# Windows: junction không cần quyền admin
New-Item -ItemType Junction -Path "$HOME\.claude\skills\abm-video-bgdt" -Target "$HOME\.agents\skills\abm-video-bgdt"
```

**Agent chưa hỗ trợ skill?** Thêm một dòng vào file hướng dẫn chung của agent (`AGENTS.md`, rules, custom instructions):
`Khi làm video bài giảng điện tử, đọc và làm theo <SKILL_DIR>/SKILL.md.`

## 4. Skill HyperFrames của HeyGen

```bash
npx -y hyperframes@0.7.99 skills          # toàn bộ skill HyperFrames đã phát hành
npx -y hyperframes@0.7.99 skills check    # kiểm tra đã đủ và mới chưa
```

Lệnh `skills` (không kèm tham số) cài toàn bộ skill HyperFrames vào thư mục skill của những agent nó tìm thấy. Không
dùng được CLI thì chạy `npx skills add heygen-com/hyperframes --all`. Script của skill này
tự tìm `faceless-explainer` lần lượt trong `~/.agents/skills`, `~/.claude/skills`, `~/.codex/skills`, `~/.cursor/skills`,
`~/.gemini/skills` và `~/.config/opencode/skills`. Nếu bạn cài ở chỗ khác, đặt `HF_SKILLS_DIR` trỏ tới thư mục chứa
`faceless-explainer/`.

## 5. VieNeu-TTS, API giọng đọc và MCP server

**Cài model:**

```bash
git clone https://github.com/pnnbao97/VieNeu-TTS.git
cd VieNeu-TTS
# GPU NVIDIA có driver hỗ trợ CUDA 12.8+ (xem dòng "CUDA Version" của nvidia-smi):
uv sync --extra cuda && uv pip install uroman
# Mac Apple Silicon:
uv sync && uv pip install torch==2.8.0 torchaudio==2.8.0 uroman
# CPU (không có GPU phù hợp):
uv sync && uv pip install torch==2.8.0 torchaudio==2.8.0 uroman --torch-backend cpu
```

`node setup/hardware.mjs` in ra cấu hình phù hợp với máy bạn. torch và torchaudio giữ ở 2.8.0, vì torchaudio 2.9 bỏ hàm
`forced_align` mà bước căn thời gian cần.

- Không có GPU vẫn chạy được, nhưng tạo giọng chậm.
- Nếu `uv sync` trên Windows/Linux cài nhầm bản torch CPU, xem [uv + PyTorch](https://docs.astral.sh/uv/guides/integration/pytorch/).
- Lần căn thời gian đầu tiên sẽ tải model MMS_FA, khoảng 1,2 GB.

**Cho skill biết VieNeu-TTS ở đâu.** Trình cài ghi đường dẫn này vào hồ sơ máy `~/.config/abm-video-bgdt/machine.json`, cùng
backend và dtype phù hợp phần cứng. Nếu cài thủ công, chọn một trong hai cách:
- đặt biến `VIENEU_TTS_DIR=<VIENEU_DIR>` (mục 6);
- hoặc đặt thư mục `VieNeu-TTS/` cạnh thư mục làm việc. Script tự dò ngược từ dự án lên các thư mục cha, nên cấu trúc
  `workspace/VieNeu-TTS` + `workspace/videos/<bài>` không cần đặt biến.

**Chạy API giọng đọc** và để nó chạy suốt thời gian làm video. Lần đầu mất khoảng 40 s để nạp model.

```bash
node <SKILL_DIR>/mcp/vieneu-tts/start-api.mjs [--repo <VIENEU_DIR>] [--port 8000]
```

Lệnh này chạy được trên mọi hệ điều hành. Nó đọc thư mục VieNeu-TTS và backend/dtype từ hồ sơ máy; `start-api.ps1` chỉ là
bản bọc của nó.

API nghe ở `http://127.0.0.1:8000`. Mặc định nó chạy fp32 (nhanh hơn trên GPU đời cũ). Đổi bằng `VIENEU_DTYPE=auto|bfloat16|float16`.

## 6. Biến môi trường

| Biến | Bắt buộc? | Mặc định khi không đặt |
|---|---|---|
| `VIENEU_TTS_DIR` | không (trình cài ghi vào hồ sơ máy) | `vieneuDir` trong `~/.config/abm-video-bgdt/machine.json`, rồi thư mục `VieNeu-TTS/` gần nhất khi dò ngược từ dự án |
| `ABM_VIDEO_PROFILE` | không | đường dẫn khác cho file hồ sơ máy |
| `HF_SKILLS_DIR` | khi skill HeyGen nằm ngoài các thư mục ở mục 4 | thư mục đầu tiên có `faceless-explainer/` |
| `HF_CACHE_DIR` | không | `<dự án>/.hf-cache` (bước dọn dẹp sẽ xóa) |
| `VIENEU_API_URL` | không | `http://127.0.0.1:8000` (dùng trong cấu hình MCP) |

Đặt vĩnh viễn:
- **Windows:** `[Environment]::SetEnvironmentVariable("VIENEU_TTS_DIR", "<VIENEU_DIR>", "User")`, rồi mở lại terminal và agent.
- **macOS/Linux:** thêm `export VIENEU_TTS_DIR=<VIENEU_DIR>` vào `~/.zshrc` hoặc `~/.bashrc`.

## 7. Đăng ký MCP server với agent

Mọi agent đều chạy cùng một lệnh: `uv run --directory <SKILL_DIR>/mcp/vieneu-tts python server.py`, với hai biến
`VIENEU_API_URL=http://127.0.0.1:8000` và `PYTHONIOENCODING=utf-8`. Chỉ cách khai báo là khác nhau.

**Claude Code (CLI; bản desktop dùng chung cấu hình).** Chạy lệnh:

```bash
claude mcp add --transport stdio --scope user vieneu-tts \
  --env VIENEU_API_URL=http://127.0.0.1:8000 --env PYTHONIOENCODING=utf-8 \
  -- uv run --directory <SKILL_DIR>/mcp/vieneu-tts python server.py
```

Dùng `--scope project` nếu muốn ghi vào `.mcp.json` của dự án. ([tài liệu](https://code.claude.com/docs/en/mcp))

**OpenAI Codex CLI.** Chạy lệnh:

```bash
codex mcp add vieneu-tts --env VIENEU_API_URL=http://127.0.0.1:8000 --env PYTHONIOENCODING=utf-8 \
  -- uv run --directory <SKILL_DIR>/mcp/vieneu-tts python server.py
```

Lệnh này ghi vào `~/.codex/config.toml`, dưới mục `[mcp_servers.vieneu-tts]`. ([tài liệu](https://developers.openai.com/codex/config-reference))

**Cursor, Gemini CLI, Windsurf/Devin, Copilot CLI** dùng cùng một dạng JSON với khóa `mcpServers`:

```json
{
  "mcpServers": {
    "vieneu-tts": {
      "command": "uv",
      "args": ["run", "--directory", "<SKILL_DIR>/mcp/vieneu-tts", "python", "server.py"],
      "env": { "VIENEU_API_URL": "http://127.0.0.1:8000", "PYTHONIOENCODING": "utf-8" }
    }
  }
}
```

| Agent | File cấu hình |
|---|---|
| Cursor | `~/.cursor/mcp.json` hoặc `.cursor/mcp.json` ([tài liệu](https://cursor.com/docs/mcp)) |
| Gemini CLI | `~/.gemini/settings.json` hoặc `.gemini/settings.json` ([tài liệu](https://geminicli.com/docs/tools/mcp-server/)) |
| Copilot CLI | `~/.copilot/mcp-config.json` hoặc `.mcp.json`; cũng thêm được bằng `/mcp add` ([tài liệu](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)) |
| Windsurf / Devin Desktop | `~/.codeium/windsurf/mcp_config.json`. Đường dẫn này lấy từ nguồn phụ vì sản phẩm đang đổi tên, hãy kiểm tra lại trong mục MCP của app |

**GitHub Copilot trong VS Code** dùng `.vscode/mcp.json` với khóa **`servers`** (không phải `mcpServers`), bên trong giữ nguyên
`command`, `args`, `env`. ([tài liệu](https://code.visualstudio.com/docs/agents/reference/mcp-configuration))

**OpenCode** khai báo trong `opencode.json` (`~/.config/opencode/opencode.json` hoặc ở gốc dự án). Lệnh được viết thành mảng:

```json
{
  "mcp": {
    "vieneu-tts": {
      "type": "local",
      "command": ["uv", "run", "--directory", "<SKILL_DIR>/mcp/vieneu-tts", "python", "server.py"],
      "environment": { "VIENEU_API_URL": "http://127.0.0.1:8000", "PYTHONIOENCODING": "utf-8" },
      "enabled": true
    }
  }
}
```

([tài liệu](https://opencode.ai/docs/mcp-servers))

Khởi động lại agent sau khi khai báo. MCP có 4 công cụ: `list_voices`, `text_to_speech`, `clone_voice`, `server_status`.

## 8. Kiểm tra

1. Hỏi agent: *"gọi `server_status` của vieneu-tts"*. Kết quả phải có `"status":"ok"`.
2. Dựng một dự án thử và kiểm tra bản HyperFrames đang ghim:

   ```bash
   node <SKILL_DIR>/scripts/new-project.mjs videos/thu-nghiem --title "Bài thử"
   cd videos/thu-nghiem
   node tools/build-design-kit.mjs
   node tools/fixture-check.mjs          # in: fixture-check ok
   node tools/lib/config.mjs --vieneu-dir   # in đường dẫn VieNeu-TTS đã tìm thấy
   node tools/lib/config.mjs --skills-dir   # in thư mục skill HeyGen đã tìm thấy
   ```

## 9. Khác biệt giữa các agent khi chạy quy trình

| Khả năng skill cần | Vì sao | Agent hỗ trợ (theo tài liệu) |
|---|---|---|
| Gọi subagent song song | mỗi khung hình do một worker dựng; khoảng 60–80 khung mỗi video | Claude Code, Codex CLI, Gemini CLI (≥ 0.36), OpenCode, Copilot (VS Code multi-agent, Copilot CLI `/fleet`), Devin Desktop. Cursor có subagent, nhưng tài liệu chưa nói rõ có chạy song song không |
| Hỏi người dùng giữa chừng | 4 cổng duyệt | mọi agent có hội thoại tương tác |
| Chạy lệnh shell dài | render 17–25 phút | chạy nền nếu agent cho phép, hoặc để người dùng tự chạy lệnh render |

Agent không gọi được subagent vẫn làm được. Khi đó agent dựng lần lượt từng khung, đúng theo `tools/worker-brief.md`, và chạy
`tools/wave-check.mjs` sau mỗi vài khung. Cách này chậm hơn nhưng kết quả như nhau.

## 10. Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách sửa |
|---|---|---|
| `VieNeu-TTS not found` | chưa cài, hoặc hồ sơ máy chưa ghi đường dẫn | `node setup/setup.mjs --only vieneu [--vieneu-dir <path>]` |
| `Cannot reach the VieNeu API` | API chưa chạy | `node mcp/vieneu-tts/start-api.mjs` (mục 5) |
| `faceless-explainer … not found` hoặc lỗi import `storyboard.mjs` | chưa cài skill HeyGen hoặc cài ở chỗ lạ | chạy mục 4, hoặc đặt `HF_SKILLS_DIR` |
| `fixture-check` lỗi ở bước lint/check | bản HyperFrames khác 0.7.99, hoặc skill HeyGen mới đổi | giữ đúng `npx -y hyperframes@0.7.99`; xem `references/gotchas.md` |
| Chữ tiếng Việt lỗi dấu trong log MCP | console không dùng UTF-8 | giữ `PYTHONIOENCODING=utf-8` trong cấu hình MCP |
| Render báo thiếu GSAP | máy không có mạng khi render | bật mạng, hoặc tải GSAP về `assets/` rồi sửa `gsap` trong `video.config.json` |

Điểm chưa kiểm chứng: thư mục skill của GitHub Copilot, và đường dẫn file MCP của Windsurf/Devin Desktop, vì tài liệu hai
sản phẩm này đang thay đổi. Skill được kiểm chứng đầy đủ trên Windows 11 với Claude Code.

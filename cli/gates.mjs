// gates.mjs — the four user gates (+2b) as files and commands. An approval records the hashes of the gate's
// artifacts, so any later change to them makes the gate stale and blocks the stages that need it.
//
//   abm-video gate <n> --request            write .abm/gates/<n>.md (question + files) and print it
//   abm-video gate <n> --approve "<note>"   record the user's approval on the current files
//   abm-video gate <n> --reject "<note>"    record the changes the user asked for

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashes, load, save } from "./state.mjs";

export const GATES = {
  1: { artifacts: [".probe/rate.wav", ".probe/pronunciation.md"], extra: [".probe/terms-raw.wav", ".probe/terms-candidates.wav"],
    question: "Nghe hai file: phát âm thuật ngữ và nhịp đọc. Có đạt không? Nếu nhanh/chậm, nói rõ." },
  2: { artifacts: ["SCRIPT-REVIEW.md", "script.json"],
    question: "Đọc SCRIPT-REVIEW.md. Duyệt kịch bản hay liệt kê chỗ cần sửa?" },
  "2b": { artifacts: ["capture/screens/INDEX.md"],
    question: "Xem các ảnh chụp đã che trong INDEX.md. Duyệt hay chỉ ra ảnh cần che thêm?" },
  3: { artifacts: ["renders/karaoke-preview.mp4"],
    question: "Xem clip karaoke-preview.mp4. Kiểu karaoke đúng ý chưa?" },
  4: { artifacts: ["renders/draft.mp4", "index.html"], extra: ["renders/draft-720p-preview.mp4"],
    question: "Xem bản nháp draft.mp4. Duyệt để render bản cuối, hay liệt kê số khung cần sửa?" },
};

const known = (n) => {
  if (!GATES[n]) throw new Error(`unknown gate ${n} (gates: ${Object.keys(GATES).join(", ")})`);
  return GATES[n];
};

/** approved, and every artifact still has the hash it had at approval (null === null only for legacy projects) */
export function gateOk(s, P, n) {
  const g = s.gates[n];
  if (!g || g.status !== "approved") return false;
  const now = hashes(P, known(n).artifacts);
  return Object.entries(now).every(([k, v]) => g.artifacts?.[k] === v && (v !== null || s.legacy));
}

/** "approved", "approved (stale)", "requested", "rejected" or "pending" */
export function gateStatus(s, P, n) {
  const g = s.gates[n];
  if (!g) return "pending";
  if (g.status === "approved") return gateOk(s, P, n) ? "approved" : "approved (stale)";
  return g.status;
}

const missing = (P, list) => list.filter((a) => !existsSync(join(P, a)));

export function request(P, n, cli = "node tools/bin/abm-video.mjs") {
  const g = known(n);
  const miss = missing(P, g.artifacts);
  if (miss.length) throw new Error(`gate ${n}: missing ${miss.join(", ")} (run the stage before it first)`);
  const files = [...g.artifacts, ...(g.extra ?? []).filter((f) => existsSync(join(P, f)))];
  const md = `# Cổng duyệt ${n}

${g.question}

Các file cần xem:
${files.map((f) => `- ${join(P, f).replace(/\\/g, "/")}`).join("\n")}

Ghi câu trả lời của người dùng:
- Duyệt:   ${cli} gate ${n} --approve "<nguyên văn lời người dùng>"
- Cần sửa: ${cli} gate ${n} --reject "<các thay đổi người dùng yêu cầu>"
`;
  mkdirSync(join(P, ".abm/gates"), { recursive: true });
  writeFileSync(join(P, `.abm/gates/${n}.md`), md);
  const s = load(P);
  s.gates[n] = { ...(s.gates[n] ?? {}), status: "requested", requestedAt: new Date().toISOString() };
  save(P, s);
  return md;
}

export function approve(P, n, note) {
  const g = known(n);
  const s = load(P);
  const miss = missing(P, g.artifacts);
  if (miss.length && !s.legacy) throw new Error(`gate ${n}: missing ${miss.join(", ")}; nothing to approve`);
  if (String(n) === "2" && existsSync(join(P, "script.json"))) {
    // src-to-script keeps meta.approved on later runs, so recording it here does not change the script again
    const script = JSON.parse(readFileSync(join(P, "script.json"), "utf8"));
    // keep an earlier approval date, so approving the same script again leaves script.json (and tts) untouched
    script.meta.approved ??= `${new Date().toISOString().slice(0, 10)} by user`;
    writeFileSync(join(P, "script.json"), JSON.stringify(script, null, 1));
  }
  s.gates[n] = { ...(s.gates[n] ?? {}), status: "approved", approvedAt: new Date().toISOString(), note,
    artifacts: hashes(P, g.artifacts) };
  save(P, s);
}

export function reject(P, n, note) {
  known(n);
  const s = load(P);
  s.gates[n] = { ...(s.gates[n] ?? {}), status: "rejected", rejectedAt: new Date().toISOString(), note };
  save(P, s);
}

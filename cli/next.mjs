// next.mjs — the single next action for this project, printed as three lines: NEXT, RUN, WHY.
// Walks the stage table in order: the first stage that never ran or is stale, or the first gate that is
// not approved on the current files, wins. Agent-authored inputs (facts, script) are checked before their stage.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { agentApproves, gateOk, gateStatus } from "./gates.mjs";
import { MCP } from "./paths.mjs";
import { activeStages, untouched } from "./stages.mjs";
import { isStale, load } from "./state.mjs";
import { readStoryboard } from "../compiler/lint.mjs";
import { apiUp } from "./tts.mjs";

export const DOCTOR_MAX_AGE_MS = 7 * 24 * 3600e3;
export const doctorFresh = (s) => s.stages.doctor?.status === "done" && Date.now() - Date.parse(s.stages.doctor.at) < DOCTOR_MAX_AGE_MS;

function gateAction(s, P, n, stage, cli) {
  const st = gateStatus(s, P, n);
  // a directed lesson: the agent checks gates 2 and 3 itself and approves only when every check passes
  if (agentApproves(P, n) && st !== "rejected") {
    return { next: `check gate ${n} yourself; when a check fails, fix its cause (never a threshold in video.config.json) and check again`,
      run: `${cli} gate ${n} --check   then   ${cli} gate ${n} --approve --by agent "<what the checks showed>"`,
      why: st === "approved (stale)" ? `gate ${n} files changed after approval` : `stage ${stage} is done; gate ${n} is approved on its checks in a directed lesson` };
  }
  if (st === "requested") {
    return { next: `show the user .abm/gates/${n}.md, then record their answer`,
      run: `${cli} gate ${n} --approve "<user's words>"   |   ${cli} gate ${n} --reject "<changes>"`,
      why: `gate ${n} is waiting for the user` };
  }
  if (st === "rejected") {
    return { next: `apply the changes the user asked for at gate ${n}: ${s.gates[n].note}`,
      run: `${cli} run ${stage}   then   ${cli} gate ${n} --request`,
      why: `gate ${n} was rejected` };
  }
  return { next: `ask the user to review gate ${n}`, run: `${cli} gate ${n} --request`,
    why: st === "approved (stale)" ? `gate ${n} files changed after approval` : `stage ${stage} is done; gate ${n} comes next` };
}

export async function nextAction(P, cfg, cli = "node tools/bin/abm-video.mjs") {
  const s = load(P);
  if (!doctorFresh(s)) return { next: "check this machine", run: `${cli} doctor`, why: "doctor has not passed in the last 7 days" };
  const stages = activeStages(cfg);
  for (const st of stages) {
    if (st.name === "doctor") continue;
    if (st.name === "script") {
      if (untouched(P, "capture/extracted/visible-text.txt", "visible-text.txt")) {
        return { next: "research the sources and write capture/extracted/visible-text.txt ([F-NN] fact — source)",
          run: "(edit the file)", why: "the facts file is still the template" };
      }
      if (untouched(P, "script.src.txt", "script.src.txt")) {
        return { next: "write script.src.txt following references/script-authoring.md", run: "(edit the file)",
          why: "the script is still the template" };
      }
    }
    for (const g of st.needs.gates) {
      if (!gateOk(s, P, g)) {
        const owner = stages.find((x) => x.gate === g)?.name ?? st.name;
        return gateAction(s, P, g, owner, cli);
      }
    }
    if (["karaoke", "assemble"].includes(st.name)) {
      const missing = customWithoutHtml(P);
      if (missing.length) {
        const [f] = missing;
        return { next: `build compositions/frames/${f.src.split("/").pop()} by hand (frame ${f.no} is custom), following references/custom-frame.md`,
          run: `node tools/wave-check.mjs ${f.no}`,
          why: `scenes.json marks frame${missing.length > 1 ? `s ${missing.map((x) => x.no).join(", ")}` : ` ${f.no}`} custom and its HTML does not exist yet` };
      }
    }
    if (isStale(s, P, st.name, st.inputs, st.needs.stages)) {
      if ((st.name === "tts" || st.name === "probe") && !(await apiUp())) {
        return { next: "start the speech API and keep it running", run: `node ${MCP}/start-api.mjs`,
          why: `${st.name === "probe" ? "the probe clips" : "tts"} need the VieNeu API` };
      }
      if (st.name === "clean") {
        return { next: "remove the regenerable files (renders are kept)", run: `${cli} run clean --apply`, why: "the final video is done" };
      }
      if (st.name === "storyboard" && cfg.scenes?.authoring === "claude" && !existsSync(join(P, "scenes.json"))) {
        return { next: "the coordinator (Claude) writes scenes.json from references/direction.md", run: `(Claude writes scenes.json, then) ${cli} run storyboard`,
          why: "authoring is claude: a worker never picks the visuals" };
      }
      if (st.name === "compile" && existsSync(join(P, "scenes.json")) && !s.stages.compile) {
        return { next: "review scenes.json (optional edits, see references/scene-spec.md), then compile", run: `${cli} run compile`,
          why: "the solver wrote scenes.json; templates, slots and custom frames can be adjusted before the first compile" };
      }
      return { next: `run stage ${st.name}`, run: `${cli} run ${st.name}`,
        why: s.stages[st.name] ? `stage ${st.name} is stale (its inputs changed)` : `stage ${st.name} has not run yet` };
    }
    if (st.gate && !gateOk(s, P, st.gate)) return gateAction(s, P, st.gate, st.name, cli);
  }
  const out = `renders/${cfg.name}.mp4`;
  return { next: `deliver ${existsSync(join(P, out)) ? out : "the video in renders/"}, renders/chapters.txt and renders/qa-report.md to the user`,
    run: "(nothing left to run)",
    why: "every stage and gate is done" };
}

/** custom frames in scenes.json whose storyboard `src` has no HTML yet */
export function customWithoutHtml(P) {
  if (!existsSync(join(P, "scenes.json")) || !existsSync(join(P, "STORYBOARD.md"))) return [];
  const custom = JSON.parse(readFileSync(join(P, "scenes.json"), "utf8")).frames.filter((f) => f.custom).map((f) => f.frame);
  if (!custom.length) return [];
  return readStoryboard(readFileSync(join(P, "STORYBOARD.md"), "utf8"))
    .filter((f) => custom.includes(f.no) && f.bullets.src && !existsSync(join(P, f.bullets.src)))
    .map((f) => ({ no: f.no, src: f.bullets.src }));
}

export const print = (a) => console.log(`NEXT: ${a.next}\nRUN: ${a.run}\nWHY: ${a.why}`);

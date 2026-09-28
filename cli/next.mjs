// next.mjs — the single next action for this project, printed as three lines: NEXT, RUN, WHY.
// Walks the stage table in order: the first stage that never ran or is stale, or the first gate that is
// not approved on the current files, wins. Agent-authored inputs (facts, script) are checked before their stage.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { gateOk, gateStatus } from "./gates.mjs";
import { MCP } from "./paths.mjs";
import { activeStages, untouched } from "./stages.mjs";
import { isStale, load } from "./state.mjs";
import { apiUp } from "./tts.mjs";

export const DOCTOR_MAX_AGE_MS = 7 * 24 * 3600e3;
export const doctorFresh = (s) => s.stages.doctor?.status === "done" && Date.now() - Date.parse(s.stages.doctor.at) < DOCTOR_MAX_AGE_MS;

function gateAction(s, P, n, stage, cli) {
  const st = gateStatus(s, P, n);
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
    if (isStale(s, P, st.name, st.inputs, st.needs.stages)) {
      if (st.name === "tts" && !(await apiUp())) {
        return { next: "start the speech API and keep it running", run: `node ${MCP}/start-api.mjs`, why: "tts needs the VieNeu API" };
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
  return { next: `deliver ${existsSync(join(P, out)) ? out : "renders/"}, renders/chapters.txt and the QA report`,
    run: `${cli} run clean --apply`,
    why: "every stage and gate is done" };
}

export const print = (a) => console.log(`NEXT: ${a.next}\nRUN: ${a.run}\nWHY: ${a.why}`);

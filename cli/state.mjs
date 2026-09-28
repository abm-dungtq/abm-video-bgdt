// state.mjs — P/.abm/state.json: which stages ran on which inputs, and which gates were approved on which files.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const file = (P) => join(P, ".abm/state.json");

export function load(P) {
  if (!existsSync(file(P))) return { version: 1, stages: {}, gates: {}, legacy: false };
  return JSON.parse(readFileSync(file(P), "utf8"));
}

export function save(P, s) {
  mkdirSync(join(P, ".abm"), { recursive: true });
  writeFileSync(file(P), JSON.stringify(s, null, 2) + "\n");
}

/** SHA-1 of a file, or of a folder's sorted file names and contents; null when the path does not exist. */
export function hashFile(path) {
  if (!existsSync(path)) return null;
  const h = createHash("sha1");
  const walk = (p, rel) => {
    if (statSync(p).isDirectory()) {
      for (const f of readdirSync(p).sort()) walk(join(p, f), `${rel}/${f}`);
    } else {
      h.update(rel).update("\0").update(readFileSync(p)).update("\0");
    }
  };
  if (statSync(path).isDirectory()) walk(path, "");
  else h.update(readFileSync(path));
  return h.digest("hex");
}

/** { relPath: hash } for project-relative paths. */
export const hashes = (P, paths) => Object.fromEntries(paths.map((p) => [p, hashFile(join(P, p))]));

export function markStage(s, P, name, inputs = []) {
  s.stages[name] = { status: "done", at: new Date().toISOString(), inputs: hashes(P, inputs) };
}

/** A stage is stale when it never ran, when an input changed since, or when a stage it needs ran after it. */
export function isStale(s, P, name, inputs = [], needs = []) {
  const st = s.stages[name];
  if (!st || st.status !== "done") return true;
  const now = hashes(P, inputs);
  if (Object.entries(now).some(([k, v]) => st.inputs?.[k] !== v)) return true;
  return needs.some((n) => s.stages[n]?.at && s.stages[n].at > st.at);
}

#!/usr/bin/env node
// fetch-registry-refs.mjs — copy HyperFrames registry blocks into .hyperframes/registry-ref/ as
// read-only idea sources for the frame workers. `add` runs in a throwaway project next to this one,
// so the real project never mounts or lints those blocks.
//
//   node tools/fetch-registry-refs.mjs code-terminal-run count-up constellation-hub
//
// Find names first: npx -y hyperframes@<pin> catalog --json > .probe/catalog.json, then search it
// locally (0.7.99 has no `catalog --query`).

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { cfg, HF, ROOT } from "./lib/config.mjs";

const names = process.argv.slice(2);
if (!names.length) {
  console.error("usage: fetch-registry-refs.mjs <block-name…>");
  process.exit(1);
}
const W = resolve(ROOT, `../.registry-${cfg.name}-${process.pid}`);
const env = { ...process.env, HYPERFRAMES_SKIP_SKILLS: "1" };
rmSync(W, { recursive: true, force: true });
execSync(`npx -y ${HF} init "${W}" --non-interactive --example=blank --resolution landscape`, { stdio: "pipe", env });
const failed = [];
for (const n of names) {
  try {
    execSync(`npx -y ${HF} add ${n} --json`, { cwd: W, stdio: "pipe", env });
  } catch {
    failed.push(n);
  }
}
const out = join(ROOT, ".hyperframes/registry-ref");
mkdirSync(out, { recursive: true });
const copied = [];
for (const sub of ["compositions/components", "compositions"]) {
  const d = join(W, sub);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d).filter((x) => x.endsWith(".html"))) {
    cpSync(join(d, f), join(out, f));
    copied.push(f);
  }
}
// some blocks install as a folder (compositions/<name>/index.html plus assets): copy the whole folder
const comp = join(W, "compositions");
if (existsSync(comp)) {
  for (const e of readdirSync(comp, { withFileTypes: true }).filter((x) => x.isDirectory() && x.name !== "components")) {
    cpSync(join(comp, e.name), join(out, e.name), { recursive: true });
    copied.push(`${e.name}/`);
  }
}
rmSync(W, { recursive: true, force: true });
console.log(`registry-ref: ${copied.length} file(s) in .hyperframes/registry-ref${failed.length ? `; not found: ${failed.join(", ")}` : ""}`);
process.exit(failed.length || !copied.length ? 1 : 0);

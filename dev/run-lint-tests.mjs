#!/usr/bin/env node
// run-lint-tests.mjs — run scripts/variety-lint.mjs on the fixtures in dev/lint-fixtures and check its verdicts.
//   ok/   a DNA-shaped storyboard with layouts: must pass with no warning
//   bad/  the same storyboard with four defects: must fail and name each one
//   free-ok/   no DNA, `structure` on, distinct chapter arcs, one exercise: must pass with no warning
//   free-bad/  two exercises (S1 error) and two chapters on the same arc (S2 warning)
//
//   node dev/run-lint-tests.mjs

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEV = dirname(fileURLToPath(import.meta.url));
const LINT = resolve(DEV, "../scripts/variety-lint.mjs");

const cases = [
  {
    name: "ok",
    check: ({ status, stdout, stderr }) => [
      status === 0 || `exit ${status}`,
      stdout.includes("layouts=18") || "no layouts=18",
      stdout.includes("dna=ok") || "no dna=ok",
      stdout.trimEnd().endsWith(" ok") || "summary does not end with ok",
      !/[⚠✗]/.test(stderr) || `unexpected stderr: ${stderr.trim()}`,
    ],
  },
  {
    name: "bad",
    check: ({ status, stderr }) => [
      status === 1 || `exit ${status}`,
      ...[
        "frame 1: layout has 1 token(s) for 2 shot(s)",
        'frame 5: layout "grid-9" is not in layouts.catalog',
        "frame 6: case shot must use layout card-case",
        "frame 7: exercise frame should have role action",
        "ch1: role core (frame 7) comes after case",
      ].map((s) => stderr.includes(s) || `missing: ${s}`),
    ],
  },
  {
    name: "free-ok",
    check: ({ status, stdout, stderr }) => [
      status === 0 || `exit ${status}`,
      stdout.includes("dna=off") || "no dna=off",
      !/[⚠✗]/.test(stderr) || `unexpected stderr: ${stderr.trim()}`,
    ],
  },
  {
    name: "free-bad",
    check: ({ status, stderr }) => [
      status === 1 || `exit ${status}`,
      ...["2 exercise shots in the video (max 1) (S1)", "ch1 and ch2 run the same scene sequence (S2)"]
        .map((s) => stderr.includes(s) || `missing: ${s}`),
    ],
  },
];

let passed = 0;
for (const c of cases) {
  const r = spawnSync("node", [LINT, "STORYBOARD.md"], { cwd: join(DEV, "lint-fixtures", c.name), encoding: "utf8" });
  const fails = c.check(r).filter((x) => x !== true);
  if (fails.length) console.log(`FAIL ${c.name}: ${fails.join("; ")}`);
  else {
    console.log(`pass ${c.name}`);
    passed++;
  }
}
console.log(passed === cases.length ? `lint-tests ok (${passed}/${cases.length})` : `lint-tests FAIL (${passed}/${cases.length})`);
process.exit(passed === cases.length ? 0 : 1);

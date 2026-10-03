#!/usr/bin/env node
// gallery-refs.mjs — motion ideas from the awesome-opus5-5-videos gallery (videos people made by asking Claude Opus 5.5
// to write the animation as code, each with its prompt) for custom frames and accent choices. The gallery holds prompts
// only, no code: an adopted entry is a read-only idea, never a spec. Apply it through references/motion-craft.md.
//
//   node tools/gallery-refs.mjs fetch                                fetch the pinned gallery into the cache
//   node tools/gallery-refs.mjs search [words…] [--category explainer,motion] [--tech svg,gsap] [--all] [--limit 10] [--json]
//   node tools/gallery-refs.mjs adopt <slug…>                        copy prompts to .hyperframes/gallery-ref/ (run in the project)
//
// search keeps, by default, explainer and motion entries with a full prompt and no 3D/shader/playable tech: they fit
// a deterministic lesson frame. --all lifts those filters. Without network and cache the tool says so and exits 0, so
// a lesson never waits on the gallery. Cache: ABM_GALLERY_DIR, else ~/.cache/abm-video-bgdt/awesome-opus5-5-videos.
// The prompts belong to their authors (credited in each copy); poster images are never fetched.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const REPO = "https://github.com/yihui-dev/awesome-opus5-5-videos.git";
const PIN = "3d54892e2ae5b0e8d337171e6508bba4cec01ab8";
const DIR = resolve(process.env.ABM_GALLERY_DIR ?? join(homedir(), ".cache/abm-video-bgdt/awesome-opus5-5-videos"));
const DATA = join(DIR, "data/videos.json");
const LESSON_CATEGORIES = ["explainer", "motion"];
const HEAVY_TECH = ["threejs", "shader", "webgl", "playable"];

const [verb, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a === "--all" || a === "--json"));
const opt = (n) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : undefined);
const valued = new Set(["--category", "--tech", "--limit"]);
const words = rest.filter((a, i) => !a.startsWith("--") && !valued.has(rest[i - 1]));
const list = (s) => (s ? s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) : null);

const unavailable = (why) => {
  console.log(`gallery unavailable: ${why}; continue without gallery refs`);
  process.exit(0);
};
const git = (args, cwd) => spawnSync("git", args, { cwd, encoding: "utf8" });

function fetchGallery() {
  if (process.env.ABM_GALLERY_OFFLINE === "1") return false;
  if (!existsSync(join(DIR, ".git"))) {
    mkdirSync(resolve(DIR, ".."), { recursive: true });
    const r = git(["clone", "--quiet", REPO, DIR]);
    if (r.status !== 0) return false;
  }
  if (git(["cat-file", "-e", `${PIN}^{commit}`], DIR).status !== 0 && git(["fetch", "--quiet", "origin"], DIR).status !== 0) return false;
  return git(["checkout", "--quiet", "--detach", PIN], DIR).status === 0;
}

function load() {
  if (!existsSync(DATA) && !fetchGallery()) unavailable(`no cache at ${DIR} and the fetch failed`);
  if (!existsSync(DATA)) unavailable(`${DATA} missing`);
  return JSON.parse(readFileSync(DATA, "utf8"));
}

if (verb === "fetch") {
  if (!fetchGallery()) unavailable(`could not fetch ${REPO} into ${DIR}`);
  console.log(`gallery ready: ${DIR} @ ${PIN.slice(0, 7)} (${load().length} entries)`);
} else if (verb === "search") {
  const all = flags.has("--all");
  const cats = list(opt("--category")) ?? (all ? null : LESSON_CATEGORIES);
  const tech = list(opt("--tech"));
  const keys = words.map((w) => w.toLowerCase());
  const hits = load()
    .filter((v) => !cats || cats.includes(v.category))
    .filter((v) => all || (!v.prompt_partial && !v.tech_tags.some((t) => HEAVY_TECH.includes(t))))
    .filter((v) => !tech || tech.some((t) => v.tech_tags.includes(t)))
    .filter((v) => keys.every((k) => (v.prompt ?? "").toLowerCase().includes(k)))
    .sort((a, b) => (b.category === "explainer") - (a.category === "explainer") || (b.prompt ?? "").length - (a.prompt ?? "").length)
    .slice(0, Number(opt("--limit") ?? 10));
  if (flags.has("--json")) console.log(JSON.stringify(hits.map(({ slug, category, tech_tags, author, post_url }) => ({ slug, category, tech_tags, author, post_url })), null, 2));
  else {
    for (const v of hits) console.log(`${v.slug.padEnd(30)} ${v.category.padEnd(10)} ${v.tech_tags.join(",").padEnd(22)} ${(v.prompt ?? "").replace(/\s+/g, " ").slice(0, 100)}`);
    console.log(hits.length ? `${hits.length} idea(s): adopt with node tools/gallery-refs.mjs adopt <slug>` : "no match: fewer words, or --all");
  }
} else if (verb === "adopt") {
  if (!words.length) { console.error("usage: gallery-refs.mjs adopt <slug…>"); process.exit(1); }
  if (!existsSync(resolve("video.config.json"))) { console.error("run adopt in the lesson project (no video.config.json here)"); process.exit(1); }
  const bySlug = new Map(load().map((v) => [v.slug, v]));
  const unknown = words.filter((s) => !bySlug.has(s));
  if (unknown.length) { console.error(`unknown slug: ${unknown.join(", ")} (search first)`); process.exit(1); }
  const out = resolve(".hyperframes/gallery-ref");
  mkdirSync(out, { recursive: true });
  for (const s of words) {
    const v = bySlug.get(s);
    writeFileSync(join(out, `${s}.md`), `<!-- gallery-ref (read-only idea, not a spec) · @${v.author} · ${v.post_url} · awesome-opus5-5-videos@${PIN.slice(0, 7)} -->
# ${s} (${v.category}; ${v.tech_tags.join(", ")})

Apply through references/motion-craft.md: deterministic GSAP on the frame timeline, timed to the voice cues.

## Prompt

${v.prompt}
`);
    console.log(`adopted ${s} → .hyperframes/gallery-ref/${s}.md`);
  }
} else {
  console.error("usage: gallery-refs.mjs fetch | search [words…] [--category a,b] [--tech a,b] [--all] [--limit n] [--json] | adopt <slug…>");
  process.exit(1);
}

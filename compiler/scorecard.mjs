// scorecard.mjs — variety metrics of a solved lesson: how many shots each frame gets, how evenly the templates and
// their variants are spread, whether chapters repeat one scene sequence, and whether list slots came out empty or
// ragged. Used by the solver's director mode (reseed until the thresholds hold) and by dev/variety-report.mjs.

const r2 = (x) => Math.round(x * 100) / 100;

/** coefficient of variation of the lengths of a list of strings */
function cv(items) {
  const n = items.map((s) => [...s].length);
  const mean = n.reduce((a, b) => a + b, 0) / n.length;
  if (!mean) return 0;
  const sd = Math.sqrt(n.reduce((a, b) => a + (b - mean) ** 2, 0) / n.length);
  return sd / mean;
}

/** walk a slots object: count empty arrays/strings and collect every list of 2+ strings */
function walk(v, acc) {
  if (Array.isArray(v)) {
    if (!v.length) acc.empty++;
    if (v.length >= 2 && v.every((x) => typeof x === "string")) acc.lists.push(v);
    v.forEach((x) => walk(x, acc));
  } else if (v && typeof v === "object") Object.values(v).forEach((x) => walk(x, acc));
  else if (typeof v === "string" && !v.trim()) acc.empty++;
}

/**
 * How much the content chapters (all but the first and the last, which are the intro and the outro) repeat each other:
 * Jaccard of their scene_hint sets (title excluded), per pair; with fewer than 3 hints on either side, 1 when the
 * sets are equal, else 0. Returns {max, mean, pairs: [{a, b, j, shared}]}.
 */
export function chapterOverlap(chapters) {
  const content = chapters.slice(1, -1).map((c) => ({ id: c.id, set: new Set((c.frames ?? []).map((f) => f.scene_hint).filter((h) => h && h !== "title")) }));
  const pairs = [];
  content.forEach((a, i) => content.slice(i + 1).forEach((b) => {
    const shared = [...a.set].filter((h) => b.set.has(h));
    const union = new Set([...a.set, ...b.set]).size;
    // Jaccard is too coarse on tiny sets ({kinetic, stat} ⊂ {kinetic, stat, cards} = 0.67): a short chapter only
    // counts as a repeat when its set is the same as the other one
    const small = a.set.size < 3 || b.set.size < 3;
    const j = small ? (shared.length === union && union > 0 ? 1 : 0) : union ? r2(shared.length / union) : 0;
    pairs.push({ a: a.id, b: b.id, j, shared });
  }));
  const js = pairs.map((p) => p.j);
  return { max: js.length ? Math.max(...js) : 0, mean: js.length ? r2(js.reduce((x, y) => x + y, 0) / js.length) : 0, pairs };
}

/**
 * @param scenes    scenes.json ({frames: [{frame, shots} | {frame, custom: true}]})
 * @param script    script.json ({chapters: [{frames: [{id, scene_hint}]}]}) or null
 * @param durations Map frame id → seconds, or null when the voice is not built yet
 */
export function score({ scenes, script = null, durations = null, longS = 12 }) {
  const frames = scenes.frames;
  const shots = frames.flatMap((f) => (f.shots ?? [{ template: "custom", variant: "-", slots: {} }]).map((s) => ({ ...s, frame: f.frame })));
  const perTemplate = new Map(), perPair = new Map();
  for (const s of shots) {
    if (s.template !== "title") perTemplate.set(s.template, (perTemplate.get(s.template) ?? 0) + 1);
    const k = `${s.template}/${s.variant}`;
    perPair.set(k, (perPair.get(k) ?? 0) + 1);
  }
  const [maxTemplate, maxCount] = [...perTemplate].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const acc = { empty: 0, lists: [] };
  shots.forEach((s) => walk(s.slots ?? {}, acc));
  let longSingleShot = null;
  if (durations) {
    longSingleShot = frames.filter((f) => (f.shots?.length ?? 1) === 1 && (durations.get(f.frame) ?? 0) > longS).length;
  }
  const overlap = script?.chapters ? chapterOverlap(script.chapters) : null;
  let identicalChapterSeqPairs = null;
  if (script?.chapters) {
    const seqs = script.chapters.slice(1, -1).map((c) => (c.frames ?? []).map((f) => f.scene_hint).join(">"));
    identicalChapterSeqPairs = 0;
    for (let i = 0; i < seqs.length; i++) for (let j = i + 1; j < seqs.length; j++) if (seqs[i] && seqs[i] === seqs[j]) identicalChapterSeqPairs++;
  }
  return {
    frames: frames.length,
    shots: shots.length,
    shotsPerFrame: r2(shots.length / Math.max(1, frames.length)),
    longSingleShot,
    maxTemplate,
    maxTemplateShare: r2(maxCount / Math.max(1, shots.length)),
    maxPairReuse: Math.max(0, ...perPair.values()),
    distinctPairRatio: r2(perPair.size / Math.max(1, shots.length)),
    templatesUsed: perTemplate.size + (shots.some((s) => s.template === "title") ? 1 : 0),
    chapterHintOverlap: overlap?.max ?? null,
    chapterHintOverlapMean: overlap?.mean ?? null,
    identicalChapterSeqPairs,
    exerciseShots: shots.filter((s) => s.template === "card-exercise").length,
    emptyRequiredSlots: acc.empty,
    labelLengthCV: r2(Math.max(0, ...acc.lists.map(cv))),
  };
}

/** threshold violations of a score: [{key, value, limit}] */
export function violations(m, t) {
  const v = [];
  const over = (key, limit) => m[key] != null && limit != null && m[key] > limit && v.push({ key, value: m[key], limit: `≤ ${limit}`, bound: limit });
  const under = (key, limit) => m[key] != null && limit != null && m[key] < limit && v.push({ key, value: m[key], limit: `≥ ${limit}`, bound: limit });
  over("maxTemplateShare", t.maxTemplateShare);
  over("maxPairReuse", t.maxPairReuse);
  under("distinctPairRatio", t.minDistinctPairRatio);
  over("longSingleShot", t.maxLongSingleShot ?? 0);
  over("chapterHintOverlap", t.maxChapterHintOverlap);
  over("emptyRequiredSlots", t.maxEmptySlots ?? 0);
  return v;
}

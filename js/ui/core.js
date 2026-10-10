// Shared UI helpers: line icons, catalog lookups and labels, search, filters and sorting, the
// exercise card. Loaded after js/ui/store.js and before the page modules and js/app.js.

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
const mk = (cls, html, tag) => { const d = document.createElement(tag || "div"); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; };

// ---------- Icons (24-unit grid, 1.6 stroke) ----------
const svgIcon = (d, extra) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"${extra || ""}><path d="${d}"/></svg>`;
const ICON = {
  check: svgIcon("M5 12.5l4.2 4.2L19 7"),
  cross: svgIcon("M6.5 6.5l11 11M17.5 6.5l-11 11"),
  warn: svgIcon("M12 4l9 16H3zM12 10v4.5M12 17.2v.3"),
  info: svgIcon("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.3"),
  motion: svgIcon("M4 17c3-9 7-12 16-12M16 3l4 2-2 4"),
  posture: svgIcon("M12 3v18M8 7c2 1.5 6 1.5 8 0M8 12h8M8 17c2-1.5 6-1.5 8 0"),
  alignment: svgIcon("M6 4l6 8-6 8M18 4v16"),
  range: svgIcon("M4 19a8 8 0 0 1 16 0M12 19l5-6"),
  tempo: svgIcon("M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 13l4-3M10 2h4"),
  activation: svgIcon("M4 12h3l2-5 3 10 2-5h6"),
  fiber: svgIcon("M4 20C8 14 10 8 20 4M4 14c3-3 6-6 12-9M9 20c3-4 6-8 11-11"),
  heart: svgIcon("M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"),
  search: svgIcon("M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5"),
  arrow: svgIcon("M5 12h14M13 6l6 6-6 6"),
  back: svgIcon("M19 12H5M11 6l-6 6 6 6"),
  chevron: svgIcon("M9 6l6 6-6 6"),
  dumbbell: svgIcon("M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"),
  layers: svgIcon("M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4"),
  body: svgIcon("M12 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 9l6 1 6-1M12 10v5M12 15l-3 6M12 15l3 6"),
  clock: svgIcon("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2"),
  target: svgIcon("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01"),
  sliders: svgIcon("M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4"),
  close: svgIcon("M6 6l12 12M18 6L6 18"),
  rotate: svgIcon("M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"),
  compare: svgIcon("M9 4v16M15 4v16M4 8h5M15 16h5M4 16h5M15 8h5"),
  play: `<svg class="icon icon-fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>`,
  pause: `<svg class="icon icon-fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>`,
  restart: svgIcon("M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5"),
  stepBack: svgIcon("M17 6l-7 6 7 6M7 6v12"),
  stepFwd: svgIcon("M7 6l7 6-7 6M17 6v12"),
  toStart: svgIcon("M18 6l-8 6 8 6M6 5v14"),
  toEnd: svgIcon("M6 6l8 6-8 6M18 5v14"),
  plus: svgIcon("M12 5v14M5 12h14"),
  minus: svgIcon("M5 12h14"),
  cube: svgIcon("M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5")
};
const ERROR_TYPES = { posture: "Posture", alignment: "Joint alignment", range: "Range of motion", tempo: "Tempo", activation: "Muscle engagement" };

// ---------- Catalog ----------
const BY_NAME = {}, BY_SLUG = {};
const slugOf = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
(function indexExercises() {
  (typeof EXERCISES !== "undefined" ? EXERCISES : []).forEach((ex) => {
    if (!ex || !ex.name || BY_NAME[ex.name]) return;
    ex.primary = ex.primary || []; ex.secondary = ex.secondary || [];
    BY_NAME[ex.name] = ex;
    ex.slug = ex.slug || slugOf(ex.name);
    BY_SLUG[ex.slug] = ex;
    if (ex.id && !BY_SLUG[ex.id]) BY_SLUG[ex.id] = ex;
  });
})();
// Exercises marked demo:"hidden" keep their own page (a direct link still works) but stay out of
// the library, search, lists and pickers until their demonstration is ready.
const isListed = (ex) => ex && ex.demo !== "hidden";
const ALL_EXERCISES = () => Object.values(BY_NAME).filter(isListed);
const HIDDEN_COUNT = () => Object.values(BY_NAME).filter((e) => !isListed(e)).length;
const exByAny = (k) => BY_SLUG[k] || BY_NAME[k] || null;

// Browse categories: the data's list, plus calves / full body when exercises use them.
const CATS = (() => {
  const list = (typeof CATEGORIES !== "undefined" ? CATEGORIES : []).slice();
  const used = new Set(ALL_EXERCISES().flatMap((e) => [e.group, ...(e.categories || [])]));
  [["calves", "Calves"], ["fullbody", "Full body"]].forEach(([id, name]) => { if (used.has(id) && !list.some((c) => c.id === id)) list.push({ id, name }); });
  return list;
})();
const CAT_NAME = Object.fromEntries(CATS.map((c) => [c.id, c.name]));
const EQUIP_LIST = typeof EQUIPMENT_TYPES !== "undefined" ? EQUIPMENT_TYPES : [];
const EQUIP_NAME = Object.fromEntries(EQUIP_LIST.map((c) => [c.id, c.name]));
const DIFF_LIST = typeof DIFFICULTIES !== "undefined" ? DIFFICULTIES : [{ id: "beginner", name: "Beginner" }, { id: "intermediate", name: "Intermediate" }, { id: "advanced", name: "Advanced" }];
const DIFF_NAME = Object.fromEntries(DIFF_LIST.map((c) => [c.id, c.name]));
const DIFF_RANK = { beginner: 1, intermediate: 2, advanced: 3 };
const catsOf = (ex) => [...new Set([ex.group, ...(ex.categories || [])])].filter((c) => CAT_NAME[c]);

// Library categories. The data groups arms and legs as a whole; the library splits them by the
// exercise's primary muscles. Old links (?cat=arms, ?cat=legs) still work as the whole group.
const LIB_CATS = [
  { id: "chest", name: "Chest" }, { id: "back", name: "Back" }, { id: "shoulders", name: "Shoulders" },
  { id: "biceps", name: "Biceps" }, { id: "triceps", name: "Triceps" }, { id: "forearms", name: "Forearms" },
  { id: "quads", name: "Quadriceps" }, { id: "hamstrings", name: "Hamstrings" }, { id: "glutes", name: "Glutes" },
  { id: "calves", name: "Calves" }, { id: "core", name: "Core" }, { id: "fullbody", name: "Full Body" }
];
const LEGACY_CATS = { arms: "Arms (all)", legs: "Legs (all)" };
const LIB_CAT_NAME = Object.fromEntries(LIB_CATS.map((c) => [c.id, c.name]));
const SPLIT_BY_MUSCLE = { biceps: "arms", triceps: "arms", forearms: "arms", quads: "legs", hamstrings: "legs", glutes: "legs", calves: "legs" };
function libCatsOf(ex) {
  if (ex._libCats) return ex._libCats;
  const own = catsOf(ex), prim = ex.primary.map((m) => parentMuscle(m)), out = [];
  const add = (c) => { if (!out.includes(c)) out.push(c); };
  own.forEach((c) => { if (LIB_CAT_NAME[c]) add(c); });
  // Arms and legs exercises go to the categories of their primary muscles.
  if (own.includes("arms") || own.includes("legs")) {
    prim.forEach((m) => { if (SPLIT_BY_MUSCLE[m] && own.includes(SPLIT_BY_MUSCLE[m])) add(m); });
    if (!out.some((c) => SPLIT_BY_MUSCLE[c])) add(own.includes("arms") ? "biceps" : "quads");
  }
  // Glutes and calves exercises also show up there when those are a primary mover.
  ["glutes", "calves"].forEach((m) => { if (prim.includes(m)) add(m); });
  ex._libCats = out.sort((a, b) => LIB_CATS.findIndex((c) => c.id === a) - LIB_CATS.findIndex((c) => c.id === b));
  return ex._libCats;
}
function inLibCat(ex, cat) {
  if (!cat) return true;
  if (LEGACY_CATS[cat]) return catsOf(ex).includes(cat);
  return libCatsOf(ex).includes(cat);
}

// Equipment filter: the data's types plus resistance bands (matched on the equipment text).
const LIB_EQUIP = [
  { id: "barbell", name: "Barbell" }, { id: "dumbbell", name: "Dumbbell" }, { id: "cable", name: "Cable" },
  { id: "machine", name: "Machine" }, { id: "band", name: "Resistance band" }, { id: "kettlebell", name: "Kettlebell" },
  { id: "bodyweight", name: "Bodyweight" }, { id: "other", name: "Other (sled, ropes, box)" }
];
const usesEquip = (ex, id) => (id === "band" ? ex.equip === "band" || /\bband/i.test((ex.equipment || "") + " " + (ex.setup || "")) : ex.equip === id);

// Movement pattern: the data's own, else inferred from the name.
const PATTERN_LIST = [
  { id: "push", name: "Push" }, { id: "pull", name: "Pull" }, { id: "squat", name: "Squat" }, { id: "hinge", name: "Hinge" },
  { id: "lunge", name: "Lunge" }, { id: "carry", name: "Carry" }, { id: "rotation", name: "Rotation" },
  { id: "anti-rotation", name: "Anti-rotation" }, { id: "isolation", name: "Isolation" }, { id: "plyometric", name: "Plyometric" },
  { id: "conditioning", name: "Conditioning" }
];
const PATTERN_NAME = Object.fromEntries(PATTERN_LIST.map((p) => [p.id, p.name]));
function patternOf(ex) {
  if (ex.pattern && PATTERN_NAME[ex.pattern]) return ex.pattern;
  const n = ex.name.toLowerCase();
  if (/plank|pallof|dead bug|bird dog|hollow/.test(n)) return "anti-rotation";
  if (/carry|walk/.test(n)) return "carry";
  if (/squat|leg press|hack|wall sit/.test(n)) return "squat";
  if (/lunge|split|step-up/.test(n)) return "lunge";
  if (/deadlift|good morning|hip thrust|bridge|swing|hyperextension|back extension/.test(n)) return "hinge";
  if (/twist|woodchop|rotation/.test(n)) return "rotation";
  if (ex.movementType === "isolation") return "isolation";
  if (/row|pull|chin|face/.test(n)) return "pull";
  if (/press|push|dip/.test(n)) return "push";
  return "isolation";
}
const TYPES = [{ id: "compound", name: "Compound" }, { id: "isolation", name: "Isolation" }];

// ---------- Muscles ----------
const muscleName = (m) => (MUSCLES[m] || (typeof MUSCLE_INFO !== "undefined" && MUSCLE_INFO[m] && MUSCLE_INFO[m].name) || cap(String(m).replace(/-/g, " ")));
const anatName = (m) => ((typeof MUSCLE_INFO !== "undefined" && MUSCLE_INFO[m] && MUSCLE_INFO[m].name) || muscleName(m));
// A finer muscle id (if the data adds them) maps up to one of the 16 base ids.
const parentMuscle = (m) => {
  const info = typeof MUSCLE_INFO !== "undefined" && MUSCLE_INFO[m];
  if (info && info.parent) return info.parent;
  if (typeof ANATOMY !== "undefined" && ANATOMY && ANATOMY[m] && ANATOMY[m].parent) return ANATOMY[m].parent;
  return m;
};
// ---------- Muscle catalog (base ids + finer ids from data/anatomy.js) ----------
const ALL_MUSCLE_IDS = () => [...new Set([...Object.keys(MUSCLES), ...(typeof MUSCLE_INFO !== "undefined" ? Object.keys(MUSCLE_INFO) : [])])];
const childrenOf = (m) => ALL_MUSCLE_IDS().filter((x) => x !== m && parentMuscle(x) === m);
let USED_MUSCLES = null;
const usedMuscles = () => USED_MUSCLES || (USED_MUSCLES = new Set(Object.values(BY_NAME).flatMap((e) => [...(e.primary || []), ...(e.secondary || []), ...(e.stabilizers || [])])));
// The ids that count as training muscle m: m and its finer parts; a finer muscle no exercise names
// directly falls back to its group (data that says "shoulders" trains the front delts).
function muscleKeys(m) {
  const own = [m, ...childrenOf(m)];
  if (own.some((x) => usedMuscles().has(x))) return own;
  const p = parentMuscle(m);
  return p !== m ? [...own, p] : own;
}
// Groups for the explorer, the 3D anatomy list and the muscle filter: each map region with its
// base muscles followed by their finer parts. Finer muscles without a parent join a nearby region.
const ORPHAN_REGION = { adductors: "quads", tibialis: "calves", serratus: "chest", "serratus-anterior": "chest", "hip-flexors": "abs", "glute-med": "glutes", brachialis: "biceps", neck: "back" };
const MUSCLE_GROUPS = (() => {
  const regions = typeof MUSCLE_REGIONS !== "undefined" ? MUSCLE_REGIONS : [];
  const groups = regions.map((r) => ({ id: r.id, name: r.name, side: r.side, muscles: r.muscles.flatMap((m) => [m, ...childrenOf(m)]) }));
  const placed = new Set(groups.flatMap((g) => g.muscles));
  const rest = ALL_MUSCLE_IDS().filter((m) => !placed.has(m));
  rest.forEach((m) => {
    const g = groups.find((x) => x.id === ORPHAN_REGION[m]) || groups.find((x) => x.muscles.includes(parentMuscle(m)));
    if (g) g.muscles.push(m); else {
      let other = groups.find((x) => x.id === "other");
      if (!other) { other = { id: "other", name: "Other", side: "front", muscles: [] }; groups.push(other); }
      other.muscles.push(m);
    }
  });
  return groups;
})();
const GROUP_OF_MUSCLE = {};
MUSCLE_GROUPS.forEach((g) => g.muscles.forEach((m) => { if (!GROUP_OF_MUSCLE[m]) GROUP_OF_MUSCLE[m] = g.id; }));
const groupOfMuscle = (m) => GROUP_OF_MUSCLE[m] || GROUP_OF_MUSCLE[parentMuscle(m)] || null;
const isFinerMuscle = (m) => parentMuscle(m) !== m || !MUSCLES[m] || !(typeof REGION_OF !== "undefined" && REGION_OF[m]);
// Muscles that most often assist m: the secondary movers of the exercises where m is a main mover.
function synergistsOf(m, n = 3) {
  const keys = muscleKeys(m), tally = {};
  ALL_EXERCISES().forEach((ex) => {
    if (!ex.primary.some((x) => keys.includes(x))) return;
    ex.secondary.forEach((s) => { if (!keys.includes(s)) tally[s] = (tally[s] || 0) + 1; });
  });
  return Object.keys(tally).sort((a, b) => tally[b] - tally[a]).slice(0, n);
}

const stabilizersOf = (ex) => (Array.isArray(ex.stabilizers) ? ex.stabilizers : []).filter((m) => !ex.primary.includes(m) && !ex.secondary.includes(m));
// Muscle names in the words the chosen guide level uses (plain for beginners, anatomical otherwise).
function namesOf(ex, role) {
  if (Store.level() === "beginner") return (ex[role] || []).map(muscleName);
  if (ex.anatomy && ex.anatomy[role] && ex.anatomy[role].length) return ex.anatomy[role];
  return (ex[role] || []).map(anatName);
}
function involvement(ex, m, fallback) {
  const v = ex.activation && ex.activation[m];
  return Math.round(typeof v === "number" ? v : fallback);
}

// Alternatives: the exercise's own list, else exercises sharing a primary muscle with other equipment.
function alternativesOf(ex, n = 4) {
  const own = (ex.alternatives || []).map(exByAny).filter((e) => e && e !== ex);
  if (own.length) return own.slice(0, n);
  const score = (e) => e.primary.filter((m) => ex.primary.includes(m)).length * 2 + e.secondary.filter((m) => ex.secondary.includes(m)).length * 0.5;
  const pool = ALL_EXERCISES().filter((e) => e !== ex && e.primary.some((m) => ex.primary.includes(m)));
  const diff = pool.filter((e) => e.equip !== ex.equip).sort((a, b) => score(b) - score(a));
  const same = pool.filter((e) => e.equip === ex.equip).sort((a, b) => score(b) - score(a));
  return [...diff, ...same].slice(0, n);
}

// ---------- Search, filters, sorting ----------
const SYNONYMS = {
  shoulders: "shoulder delts deltoid front delt side delt", "rear-delts": "shoulder shoulders rear delt deltoid posterior",
  chest: "pecs pec pectorals", lats: "back lat wing", "upper-back": "back rhomboids", "lower-back": "back erector spine lumbar",
  traps: "back trapezius neck", abs: "core abdominals six pack stomach", obliques: "core waist side", glutes: "glute butt hips",
  quads: "legs thigh quadriceps", hamstrings: "legs hamstring hams", calves: "legs calf", biceps: "arms bicep", triceps: "arms tricep",
  forearms: "arms grip forearm"
};
function haystack(ex) {
  if (ex._hay) return ex._hay;
  // Primary movers only: "shoulder" should find presses and raises, not every bench variation.
  const muscles = ex.primary;
  const parts = [ex.name, ...(ex.aliases || []), ex.equipment, ex.equip, EQUIP_NAME[ex.equip], ex.setup, ex.movementType, ex.difficulty, PATTERN_NAME[patternOf(ex)],
    ...catsOf(ex).map((c) => CAT_NAME[c]), ...muscles, ...muscles.map(muscleName), ...muscles.map((m) => SYNONYMS[m] || ""),
    ...muscles.map(anatName), ...((ex.anatomy && ex.anatomy.primary) || [])];
  ex._hay = parts.join(" ").toLowerCase().replace(/[-–]/g, " ");
  return ex._hay;
}
function matchesQuery(ex, q) {
  if (!q) return true;
  // Every query word must start a word of the exercise's text (so "lat" finds lats, not "flat").
  const words = haystack(ex).split(/[^a-z0-9]+/);
  return q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).every((w) => {
    const stem = w.length > 4 ? w.replace(/(es|s)$/, "") : w;
    return words.some((h) => h.startsWith(w) || h.startsWith(stem));
  });
}
const trains = (ex, m, role) => (role ? ex[role] || [] : [...ex.primary, ...ex.secondary]).some((x) => muscleKeys(m).includes(x));
function matches(ex, f) {
  if (f.cat && !inLibCat(ex, f.cat)) return false;
  if (f.eq && !usesEquip(ex, f.eq)) return false;
  if (f.lvl && ex.difficulty !== f.lvl) return false;
  if (f.pat && patternOf(ex) !== f.pat) return false;
  if (f.type && ex.movementType !== f.type) return false;
  if (f.muscle && !trains(ex, f.muscle)) return false;
  return matchesQuery(ex, f.q);
}
const SORTS = [{ id: "az", name: "A–Z" }, { id: "difficulty", name: "Difficulty" }, { id: "category", name: "Category" }];
function sortList(list, by) {
  const name = (a, b) => a.name.localeCompare(b.name);
  const catIx = (e) => { const i = LIB_CATS.findIndex((c) => c.id === libCatsOf(e)[0]); return i < 0 ? 99 : i; };
  if (by === "difficulty") return list.slice().sort((a, b) => (DIFF_RANK[a.difficulty] || 2) - (DIFF_RANK[b.difficulty] || 2) || name(a, b));
  if (by === "category") return list.slice().sort((a, b) => catIx(a) - catIx(b) || name(a, b));
  return list.slice().sort(name);
}

// ---------- 2D figure thumbnail (never a broken image: falls back to an icon) ----------
function figureNode(ex, mode, opts) {
  try { if (ex.figure && typeof createFigure === "function") return createFigure(ex, mode || "good", opts || {}); } catch (e) {}
  const span = document.createElement("span");
  span.className = "fig-fallback";
  span.innerHTML = ICON.body;
  return span;
}

// Rendered thumbnail (assets/thumbs/<id>.webp) when assets/thumbs/manifest.js lists the exercise,
// shown over the 2D figure only once it has loaded; on any error the figure stays.
function thumbNode(ex) {
  const fig = figureNode(ex, "good");
  const list = typeof THUMBS !== "undefined" && Array.isArray(THUMBS) ? THUMBS : [];
  const id = ex.id || ex.slug;
  if (!ex.thumb && !list.includes(id)) return fig;
  const box = document.createElement("span");
  box.className = "thumb-box";
  box.appendChild(fig);
  const img = new Image();
  img.alt = ""; img.decoding = "async"; img.loading = "lazy"; img.className = "thumb-img";
  img.onload = () => { box.classList.add("has-img"); };
  img.onerror = () => { img.remove(); };
  img.src = ex.thumb || "assets/thumbs/" + encodeURIComponent(id) + ".webp";
  box.appendChild(img);
  return box;
}

// ---------- Exercise card ----------
function difficultyMeter(level) {
  const n = DIFF_RANK[level] || 1;
  return `<span class="lvl" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;
}
function favButton(name, extra) {
  const on = Store.isFav(name);
  return `<button type="button" class="fav${extra ? " " + extra : ""}" data-fav="${esc(name)}" aria-pressed="${on}" aria-label="${on ? "Remove" : "Save"} ${esc(name)} ${on ? "from" : "to"} favorites" title="${on ? "Saved to favorites" : "Save to favorites"}">${ICON.heart}</button>`;
}
function exerciseCard(ex) {
  const card = document.createElement("article");
  card.className = "xcard";
  const prim = ex.primary.map(muscleName);
  card.innerHTML = `
    <a class="xcard-link" href="#/exercise/${ex.slug}">
      <span class="xcard-fig"></span>
      <span class="xcard-body">
        <span class="xcard-cat">${esc(libCatsOf(ex).slice(0, 2).map((c) => LIB_CAT_NAME[c]).join(" · "))}</span>
        <span class="xcard-name">${esc(ex.name)}</span>
        <span class="xcard-muscles">${prim.map((m) => `<b class="mchip">${esc(m)}</b>`).join("")}</span>
        <span class="xcard-meta">
          <span>${ICON.dumbbell}${esc(EQUIP_NAME[ex.equip] || ex.equipment || "—")}</span>
          <span class="xcard-lvl lvl-${esc(ex.difficulty)}">${difficultyMeter(ex.difficulty)}${esc(DIFF_NAME[ex.difficulty] || "")}</span>
        </span>
      </span>
    </a>
    ${favButton(ex.name)}`;
  card.querySelector(".xcard-fig").appendChild(thumbNode(ex));
  return card;
}
function cardGrid(list, emptyHtml) {
  const grid = document.createElement("div");
  grid.className = "xgrid";
  if (!list.length) { grid.className = "empty"; grid.innerHTML = emptyHtml || ""; return grid; }
  list.forEach((ex) => grid.appendChild(exerciseCard(ex)));
  return grid;
}
// Compact link row (used in lists: alternatives, explorer, home).
function exRow(ex, extra) {
  const a = document.createElement("a");
  a.className = "ex-mini";
  a.href = "#/exercise/" + ex.slug;
  a.innerHTML = `<span class="ex-mini-fig"></span><span class="ex-mini-text"><b>${esc(ex.name)}</b><span>${esc(EQUIP_NAME[ex.equip] || ex.equipment || "")} · ${esc(DIFF_NAME[ex.difficulty] || "")}</span></span>${extra || ""}${ICON.chevron}`;
  a.querySelector(".ex-mini-fig").appendChild(thumbNode(ex));
  return a;
}

function formatRest(sec) {
  if (!sec) return "—";
  if (sec < 60) return sec + " s";
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? m + ":" + String(s).padStart(2, "0") + " min" : m + " min";
}

// Shared UI helpers: line icons, saved state (favorites, recent, athlete), catalog lookups,
// search and filters, and the exercise card. Loaded before the page modules and js/app.js.

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);

// ---------- Icons (24-unit grid, 1.6 stroke) ----------
const svgIcon = (d, extra) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"${extra || ""}><path d="${d}"/></svg>`;
const ICON = {
  check: svgIcon("M5 12.5l4.2 4.2L19 7"),
  cross: svgIcon("M6.5 6.5l11 11M17.5 6.5l-11 11"),
  warn: svgIcon("M12 4l9 16H3zM12 10v4.5M12 17.2v.3"),
  motion: svgIcon("M4 17c3-9 7-12 16-12M16 3l4 2-2 4"),
  posture: svgIcon("M12 3v18M8 7c2 1.5 6 1.5 8 0M8 12h8M8 17c2-1.5 6-1.5 8 0"),
  alignment: svgIcon("M6 4l6 8-6 8M18 4v16"),
  range: svgIcon("M4 19a8 8 0 0 1 16 0M12 19l5-6"),
  tempo: svgIcon("M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 13l4-3M10 2h4"),
  activation: svgIcon("M4 12h3l2-5 3 10 2-5h6"),
  ghost: svgIcon("M6 20V10a6 6 0 0 1 12 0v10l-3-2-3 2-3-2zM10 10v.5M14 10v.5"),
  fiber: svgIcon("M4 20C8 14 10 8 20 4M4 14c3-3 6-6 12-9M9 20c3-4 6-8 11-11"),
  heart: svgIcon("M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"),
  search: svgIcon("M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5"),
  arrow: svgIcon("M5 12h14M13 6l6 6-6 6"),
  back: svgIcon("M19 12H5M11 6l-6 6 6 6"),
  chevron: svgIcon("M9 6l6 6-6 6"),
  dumbbell: svgIcon("M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"),
  level: svgIcon("M5 19v-4M10 19v-8M15 19V7M20 19V4"),
  layers: svgIcon("M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4"),
  body: svgIcon("M12 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 9l6 1 6-1M12 10v5M12 15l-3 6M12 15l3 6"),
  grid: svgIcon("M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"),
  home: svgIcon("M4 11l8-7 8 7M6 9.5V20h12V9.5"),
  calendar: svgIcon("M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"),
  clock: svgIcon("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2"),
  target: svgIcon("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01"),
  sliders: svgIcon("M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4"),
  close: svgIcon("M6 6l12 12M18 6L6 18"),
  rotate: svgIcon("M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5")
};
const ERROR_TYPES = { posture: "Posture", alignment: "Joint alignment", range: "Range of motion", tempo: "Tempo", activation: "Muscle activation" };

// ---------- Saved state (every access wrapped: storage can be blocked) ----------
const Store = {
  get(key, fallback) {
    try { const v = localStorage.getItem("repsheet." + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) { try { localStorage.setItem("repsheet." + key, JSON.stringify(value)); } catch (e) {} },
  raw(key) { try { return localStorage.getItem("repsheet." + key); } catch (e) { return null; } },
  setRaw(key, value) { try { localStorage.setItem("repsheet." + key, value); } catch (e) {} },
  favorites() { const f = Store.get("favorites", []); return Array.isArray(f) ? f.filter((n) => BY_NAME[n]) : []; },
  isFav(name) { return Store.favorites().includes(name); },
  toggleFav(name) {
    const f = Store.favorites(), i = f.indexOf(name);
    if (i >= 0) f.splice(i, 1); else f.unshift(name);
    Store.set("favorites", f);
    return i < 0;
  },
  recent() { const r = Store.get("recent", []); return Array.isArray(r) ? r.filter((n) => BY_NAME[n]) : []; },
  pushRecent(name) { Store.set("recent", [name, ...Store.recent().filter((n) => n !== name)].slice(0, 8)); },
  athlete() { const a = Store.raw("athlete"); return a === "male" || a === "female" ? a : null; },
  setAthlete(a) { Store.setRaw("athlete", a); }
};

// ---------- Catalog ----------
const BY_NAME = {}, BY_SLUG = {};
const slugOf = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function indexExercises() {
  EXERCISES.forEach((ex) => {
    if (!ex || !ex.name || BY_NAME[ex.name]) return;
    BY_NAME[ex.name] = ex;
    ex.slug = slugOf(ex.name);
    BY_SLUG[ex.slug] = ex;
  });
}
indexExercises();
const ALL_EXERCISES = () => Object.values(BY_NAME);
const CAT_NAME = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));
const EQUIP_NAME = Object.fromEntries(EQUIPMENT_TYPES.map((c) => [c.id, c.name]));
const DIFF_NAME = Object.fromEntries(DIFFICULTIES.map((c) => [c.id, c.name]));
const catsOf = (ex) => [...new Set([ex.group, ...(ex.categories || [])])].filter((c) => CAT_NAME[c]);
const muscleName = (m) => (MUSCLES[m] || m);
const anatomyOf = (ex, role) => (ex.anatomy && ex.anatomy[role]) || ex[role].map(muscleName);

// Words a search can match: name, categories, equipment, muscle ids, plain and anatomical names.
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
  const parts = [ex.name, ex.equipment, ex.equip, EQUIP_NAME[ex.equip], ex.setup, ex.movementType, ex.difficulty,
    ...catsOf(ex).map((c) => CAT_NAME[c]), ...muscles, ...muscles.map(muscleName), ...muscles.map((m) => SYNONYMS[m] || ""),
    ...muscles.map((m) => (MUSCLE_INFO[m] && MUSCLE_INFO[m].name) || ""), ...((ex.anatomy && ex.anatomy.primary) || [])];
  ex._hay = parts.join(" ").toLowerCase().replace(/[-–]/g, " ");
  return ex._hay;
}
function matches(ex, f) {
  if (f.cat && !catsOf(ex).includes(f.cat)) return false;
  if (f.eq && ex.equip !== f.eq) return false;
  if (f.lvl && ex.difficulty !== f.lvl) return false;
  if (f.q) {
    // Every query word must start a word of the exercise's text (so "lat" finds lats, not "flat").
    const words = haystack(ex).split(/[^a-z0-9]+/);
    return f.q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).every((w) => {
      const stem = w.length > 4 ? w.replace(/(es|s)$/, "") : w;
      return words.some((h) => h.startsWith(w) || h.startsWith(stem));
    });
  }
  return true;
}

// ---------- 2D figure thumbnail ----------
function figureNode(ex, mode, opts) {
  try { if (ex.figure && typeof createFigure === "function") return createFigure(ex, mode || "good", opts || {}); } catch (e) {}
  const span = document.createElement("span");
  span.className = "fig-fallback";
  span.innerHTML = ICON.body;
  return span;
}

// ---------- Exercise card ----------
function difficultyMeter(level) {
  const n = { beginner: 1, intermediate: 2, advanced: 3 }[level] || 1;
  return `<span class="lvl" aria-label="${DIFF_NAME[level] || ""}">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;
}
function favButton(name, extra) {
  const on = Store.isFav(name);
  return `<button type="button" class="fav${extra ? " " + extra : ""}" data-fav="${esc(name)}" aria-pressed="${on}" aria-label="${on ? "Remove from" : "Save to"} favorites" title="${on ? "Saved" : "Save"}">${ICON.heart}</button>`;
}
function exerciseCard(ex) {
  const card = document.createElement("article");
  card.className = "xcard";
  const prim = ex.primary.map(muscleName), sec = ex.secondary.map(muscleName);
  card.innerHTML = `
    <a class="xcard-link" href="#/exercise/${ex.slug}" aria-label="${esc(ex.name)}">
      <span class="xcard-fig"><span class="athlete-tag">${ex.athlete === "female" ? "Female" : "Male"} athlete</span></span>
      <span class="xcard-body">
        <span class="xcard-cat">${catsOf(ex).map((c) => CAT_NAME[c]).join(" · ")}</span>
        <span class="xcard-name">${esc(ex.name)}</span>
        <span class="xcard-muscles">
          <span class="mrow"><em>Primary</em><span>${prim.map((m) => `<b class="mchip">${esc(m)}</b>`).join("")}</span></span>
          ${sec.length ? `<span class="mrow is-sec"><em>Secondary</em><span>${esc(sec.join(", "))}</span></span>` : ""}
        </span>
        <span class="xcard-meta">
          <span>${ICON.dumbbell}${esc(EQUIP_NAME[ex.equip] || ex.equipment)}</span>
          <span>${difficultyMeter(ex.difficulty)}${esc(DIFF_NAME[ex.difficulty] || "")}</span>
          <span>${ICON.layers}${esc(cap(ex.movementType))}</span>
        </span>
      </span>
    </a>
    ${favButton(ex.name)}`;
  card.querySelector(".xcard-fig").prepend(figureNode(ex, "good"));
  return card;
}
function cardGrid(list, emptyHtml) {
  const grid = document.createElement("div");
  grid.className = "xgrid";
  if (!list.length) { grid.className = "empty"; grid.innerHTML = emptyHtml || ""; return grid; }
  list.forEach((ex) => grid.appendChild(exerciseCard(ex)));
  return grid;
}

// Small stable variation per exercise, so optimal scores look measured rather than fixed.
function jitter(name, salt, span) {
  let h = 0;
  for (const ch of name + salt) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % span;
}

function formatRest(sec) {
  if (sec < 60) return sec + " s";
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? m + ":" + String(s).padStart(2, "0") + " min" : m + " min";
}

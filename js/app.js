// Page shell: hash router, top navigation, and the pages (dashboard, library, exercise detail,
// muscles, my exercises, plans). Every 3D viewer is created by the page that shows it and
// disposed when the route changes.

const state = { plan: "ppl", style: "lab" };

// ---------- Viewer lifecycle ----------
const MAX_VIEWERS = 3;
const live = { viewers: [], cleanups: [] };
function makeViewer(container, mode, opts) {
  if (!window.THREE || typeof createViewer3D !== "function") return null;
  while (live.viewers.length >= MAX_VIEWERS) { const old = live.viewers.shift(); try { old.dispose(); } catch (e) {} }
  let v = null;
  try { v = createViewer3D(container, mode, opts || {}); } catch (e) { console.error(e); v = null; }
  if (v) live.viewers.push(v);
  return v;
}
function teardown() {
  live.cleanups.splice(0).forEach((fn) => { try { fn(); } catch (e) {} });
  live.viewers.splice(0).forEach((v) => { try { v.dispose(); } catch (e) {} });
}
const ctx = {
  makeViewer,
  onCleanup: (fn) => live.cleanups.push(fn),
  // Update the address without re-rendering the page (filters, selections).
  setHash(h) { try { history.replaceState(null, "", h); } catch (e) { location.hash = h; } highlightNav(); }
};

// ---------- Router ----------
function parseHash() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "");
  const [path, query] = raw.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  return { page: parts[0] || "", params: parts.slice(1), query: new URLSearchParams(query || "") };
}
const PAGES = {
  "": renderDashboard, library: renderLibrary, exercise: renderExercise, muscles: (r) => renderMuscles(r.params, ctx),
  my: renderMy, plans: renderPlans
};
const NAV_OF = { "": "", library: "library", exercise: "library", muscles: "muscles", my: "my", plans: "plans" };
function highlightNav() {
  const { page } = parseHash();
  $$(".nav a").forEach((a) => a.setAttribute("aria-current", a.dataset.nav === NAV_OF[page] ? "page" : "false"));
}
let lastPage = null;
function route() {
  teardown();
  const r = parseHash();
  const render = PAGES[r.page] || renderDashboard;
  const app = $("#app");
  app.innerHTML = "";
  document.title = "Rep Sheet";
  let node;
  try { node = render(r); } catch (e) { console.error(e); node = notFound(); }
  app.appendChild(node);
  app.dataset.page = r.page || "home";
  highlightNav();
  closeMenu();
  const key = r.page + "/" + r.params.join("/");
  if (key !== lastPage) window.scrollTo(0, 0);
  lastPage = key;
}
function notFound() {
  const d = document.createElement("div");
  d.className = "empty";
  d.innerHTML = `<h2>Not found</h2><p>That page doesn't exist.</p><a class="btn" href="#/library">Browse exercises</a>`;
  return d;
}
const mk = (cls, html, tag) => { const d = document.createElement(tag || "div"); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; };

// ---------- Dashboard ----------
const POPULAR = ["Back squat", "Barbell bench press", "Deadlift", "Pull-up", "Romanian deadlift", "Overhead press", "Lat pulldown", "Dumbbell lateral raise"];
const CAT_ICON = {
  chest: "M4 8c3-2 5-2 8 0 3-2 5-2 8 0v5c-2 3-5 3-8 1-3 2-6 2-8-1z",
  back: "M12 3v18M7 6l5 3 5-3M6 11l6 4 6-4M8 17l4 2 4-2",
  shoulders: "M4 14a8 6 0 0 1 16 0M8 10a4 4 0 0 1 8 0M12 4v3",
  arms: "M6 18c0-6 3-9 7-10 2-.5 4 1 4 3s-2 3-4 3M6 18h8",
  legs: "M9 3v8l-2 10M15 3v8l2 10M9 11h6",
  glutes: "M4 9c0 6 3 10 8 10s8-4 8-10M12 9v10M4 9h16",
  core: "M8 4h8v16H8zM8 9h8M8 14h8M12 4v16"
};
function renderDashboard() {
  const page = mk("dash");
  const popular = POPULAR.map((n) => BY_NAME[n]).filter(Boolean);
  const total = ALL_EXERCISES().length;
  page.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <p class="eyebrow">Biomechanics lab</p>
        <h1>Train smarter.<br>Move better.</h1>
        <p class="lede">${total} exercises analyzed on a 3D anatomical model: optimal form, the exact correction for the most common mistake, and every muscle at work along its fibers.</p>
        <div class="hero-cta">
          <a class="btn" href="#/library">Browse exercises ${ICON.arrow}</a>
          <a class="btn btn-ghost" href="#/muscles">Muscle explorer</a>
        </div>
        <dl class="hero-stats">
          <div><dt>Exercises</dt><dd>${total}</dd></div>
          <div><dt>Muscles mapped</dt><dd>${Object.keys(MUSCLES).length}</dd></div>
          <div><dt>Form checks</dt><dd>${ALL_EXERCISES().reduce((t, e) => t + (e.formChecks || []).length, 0)}</dd></div>
        </dl>
      </div>
      <div class="hero-visual">
        <div class="fig-slot hero-3d"></div>
        <div class="hero-tag"><span class="dot"></span><b>Romanian deadlift</b><span>Optimal form · live</span></div>
        <a class="hero-open" href="#/exercise/romanian-deadlift">Analyze ${ICON.arrow}</a>
      </div>
    </section>

    <section class="block">
      <header class="block-head"><h2>Quick start</h2><a href="#/library" class="more">All exercises ${ICON.arrow}</a></header>
      <div class="cat-tiles">${CATEGORIES.map((c) => {
        const n = ALL_EXERCISES().filter((e) => catsOf(e).includes(c.id)).length;
        return `<a class="cat-tile" href="#/library?cat=${c.id}"><span class="cat-ico">${svgIcon(CAT_ICON[c.id] || CAT_ICON.core)}</span><b>${c.name}</b><span>${n} exercises</span>${ICON.arrow}</a>`;
      }).join("")}</div>
    </section>

    <section class="block">
      <header class="block-head"><h2>Popular exercises</h2><a href="#/library" class="more">See all ${ICON.arrow}</a></header>
      <div class="popular"></div>
    </section>

    <section class="block">
      <header class="block-head"><h2>Muscle map</h2><a href="#/muscles" class="more">Open 3D explorer ${ICON.arrow}</a></header>
      <div class="dash-map">
        <div class="map-figure panel"></div>
        <div class="map-info panel"></div>
      </div>
    </section>

    <section class="block cta-block">
      <div class="cta">
        <div>
          <p class="eyebrow">Form analysis</p>
          <h2>See your mistake next to the optimal rep.</h2>
          <p class="lede">Side-by-side 3D comparison, a form score, the measured joint difference and the one correction that fixes it.</p>
        </div>
        <a class="btn" href="#/exercise/barbell-bench-press">Analyze an exercise ${ICON.arrow}</a>
      </div>
    </section>`;
  page.querySelector(".popular").appendChild(cardGrid(popular));
  mountMuscleMap(page.querySelector(".dash-map"), { region: "chest", muscle: "chest", compact: true });
  const squat = BY_NAME["Romanian deadlift"] || BY_NAME["Back squat"];
  const slot = page.querySelector(".hero-3d");
  if (squat && window.THREE) {
    slot.classList.add("fig-3d");
    const v = makeViewer(slot, "good", { athlete: Store.athlete() || squat.athlete });
    if (v) v.setExercise(squat);
  } else if (squat) slot.appendChild(figureNode(squat, "good", { animate: true }));
  return page;
}

// ---------- Library ----------
function renderLibrary(r) {
  const q = r.query;
  const f = { cat: CAT_NAME[q.get("cat")] ? q.get("cat") : "", eq: EQUIP_NAME[q.get("eq")] ? q.get("eq") : "", lvl: DIFF_NAME[q.get("lvl")] ? q.get("lvl") : "", q: q.get("q") || "" };
  const page = mk("library");
  const seg = (key, items, label) => `<div class="filter" role="group" aria-label="${label}"><span class="filter-label">${label}</span><div class="pills">
      <button type="button" class="pill-btn" data-k="${key}" data-v="" aria-pressed="${!f[key]}">All</button>
      ${items.map((i) => `<button type="button" class="pill-btn" data-k="${key}" data-v="${i.id}" aria-pressed="${f[key] === i.id}">${i.name}</button>`).join("")}</div></div>`;
  page.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Library</p>
      <h1>Exercises</h1>
      <p class="lede">Every exercise with its muscles, setup and 3D form analysis.</p>
    </header>
    <div class="lib-tools">
      <label class="search">${ICON.search}<input type="search" placeholder="Search exercises..." value="${esc(f.q)}" aria-label="Search exercises" autocomplete="off"><button type="button" class="search-clear" aria-label="Clear search" ${f.q ? "" : "hidden"}>${ICON.close}</button></label>
      <div class="cat-tabs" role="tablist" aria-label="Category">
        <button type="button" class="cat-tab" data-k="cat" data-v="" aria-pressed="${!f.cat}">All exercises</button>
        ${CATEGORIES.map((c) => `<button type="button" class="cat-tab" data-k="cat" data-v="${c.id}" aria-pressed="${f.cat === c.id}">${c.name}</button>`).join("")}
      </div>
      <div class="filters">${seg("eq", EQUIPMENT_TYPES, "Equipment")}${seg("lvl", DIFFICULTIES, "Difficulty")}</div>
    </div>
    <div class="lib-status"><p class="count"></p><button type="button" class="reset" hidden>Reset filters</button></div>
    <div class="lib-results"></div>`;
  const results = page.querySelector(".lib-results"), count = page.querySelector(".count"), reset = page.querySelector(".reset");
  const sync = () => {
    const p = new URLSearchParams();
    ["cat", "eq", "lvl", "q"].forEach((k) => { if (f[k]) p.set(k, f[k]); });
    const s = p.toString();
    ctx.setHash("#/library" + (s ? "?" + s : ""));
  };
  const draw = () => {
    const list = ALL_EXERCISES().filter((ex) => matches(ex, f));
    count.innerHTML = `<b>${list.length}</b> ${list.length === 1 ? "exercise" : "exercises"}${f.cat ? ` in ${CAT_NAME[f.cat]}` : ""}`;
    reset.hidden = !(f.cat || f.eq || f.lvl || f.q);
    results.innerHTML = "";
    results.appendChild(cardGrid(list, `<span class="empty-ico">${ICON.search}</span><h3>No exercises match</h3><p>Try another muscle, category or equipment, or reset the filters.</p><button type="button" class="btn btn-ghost reset-2">Reset filters</button>`));
  };
  page.addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (b) {
      f[b.dataset.k] = b.dataset.v;
      page.querySelectorAll(`[data-k="${b.dataset.k}"]`).forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === f[b.dataset.k])));
      sync(); draw(); return;
    }
    if (e.target.closest(".reset, .reset-2")) {
      f.cat = f.eq = f.lvl = f.q = "";
      page.querySelector(".search input").value = "";
      page.querySelector(".search-clear").hidden = true;
      page.querySelectorAll("[data-k]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === "")));
      sync(); draw(); return;
    }
    if (e.target.closest(".search-clear")) {
      const inp = page.querySelector(".search input");
      inp.value = ""; f.q = ""; e.target.closest(".search-clear").hidden = true; inp.focus(); sync(); draw();
    }
  });
  let t = 0;
  page.querySelector(".search input").addEventListener("input", (e) => {
    f.q = e.target.value.trim();
    page.querySelector(".search-clear").hidden = !e.target.value;
    clearTimeout(t);
    t = setTimeout(() => { sync(); draw(); }, 120);
  });
  draw();
  requestAnimationFrame(() => {
    const on = page.querySelector('.cat-tab[aria-pressed="true"]'), bar = page.querySelector(".cat-tabs");
    if (!on || !bar) return;
    const a = on.getBoundingClientRect(), b = bar.getBoundingClientRect();
    if (a.right > b.right) bar.scrollLeft += a.left - b.left - 16;
  });
  return page;
}

// ---------- Exercise detail ----------
function renderExercise(r) {
  const ex = BY_SLUG[r.params[0]] || BY_NAME[r.params[0]];
  if (!ex) return notFound();
  Store.pushRecent(ex.name);
  document.title = ex.name + " · Rep Sheet";
  return renderDetail(ex, ctx);
}

// ---------- My exercises ----------
function renderMy() {
  const page = mk("my");
  const favs = Store.favorites().map((n) => BY_NAME[n]), recent = Store.recent().map((n) => BY_NAME[n]);
  page.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Personal</p>
      <h1>My exercises</h1>
      <p class="lede">Saved exercises and the ones you opened recently, kept on this device.</p>
    </header>
    <section class="block">
      <header class="block-head"><h2>${ICON.heart}Saved <span class="n">${favs.length}</span></h2></header>
      <div class="saved"></div>
    </section>
    <section class="block">
      <header class="block-head"><h2>${ICON.clock}Recent exercises <span class="n">${recent.length}</span></h2>${recent.length ? `<button type="button" class="more clear-recent">Clear</button>` : ""}</header>
      <div class="recent"></div>
    </section>`;
  page.querySelector(".saved").appendChild(cardGrid(favs, `<span class="empty-ico">${ICON.heart}</span><h3>No saved exercises yet</h3><p>Tap the heart on any exercise to keep it here.</p><a class="btn btn-ghost" href="#/library">Browse exercises</a>`));
  page.querySelector(".recent").appendChild(cardGrid(recent, `<span class="empty-ico">${ICON.clock}</span><h3>Nothing opened yet</h3><p>The last 8 exercises you open show up here.</p>`));
  page.addEventListener("click", (e) => { if (e.target.closest(".clear-recent")) { Store.set("recent", []); route(); } });
  return page;
}

// ---------- Plans ----------
function estimateMinutes(list) {
  const sec = list.reduce((t, ex) => t + ex.sets * (40 + ex.rest), 0);
  return Math.round(sec / 60 / 5) * 5 + 10;
}
function renderPlans() {
  const page = mk("plans");
  page.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Programs</p>
      <h1>Workout plans</h1>
      <p class="lede">Sets × reps are starting points. Pick a weight you can finish every set with one or two reps left in the tank.</p>
    </header>
    <div class="plan-picker"></div>
    <div class="days"></div>`;
  const draw = () => {
    page.querySelector(".plan-picker").innerHTML = PLANS.map((p) => `
      <button type="button" class="plan-option" data-plan="${p.id}" aria-pressed="${p.id === state.plan}">
        <span class="plan-name">${p.name}</span>
        <span class="plan-meta">${p.perWeek} days / week</span>
        <span class="plan-who">${p.who}</span>
      </button>`).join("");
    const plan = PLANS.find((p) => p.id === state.plan) || PLANS[0];
    const days = page.querySelector(".days");
    days.innerHTML = "";
    plan.days.forEach((day) => {
      const list = day.exercises.map((n) => BY_NAME[n]).filter(Boolean);
      const totalSets = list.reduce((t, ex) => t + ex.sets, 0);
      const primary = [...new Set(list.flatMap((ex) => ex.primary))];
      const secondary = [...new Set(list.flatMap((ex) => ex.secondary))].filter((m) => !primary.includes(m));
      const card = mk("day", `
        <header class="day-head">
          <div><h3>${day.name}</h3><span class="day-meta">${list.length} exercises · ${totalSets} sets · ~${estimateMinutes(list)} min</span></div>
          <div class="day-map">${bodyMap({ primary, secondary })}</div>
        </header>
        <ol class="ex-list"></ol>`, "article");
      const ol = card.querySelector(".ex-list");
      list.forEach((ex, i) => {
        const li = mk("ex-row", `
          <input type="checkbox" aria-label="Done: ${esc(ex.name)}">
          <a class="ex-open" href="#/exercise/${ex.slug}">
            <span class="thumb"></span>
            <span class="ex-text"><span class="ex-name">${esc(ex.name)}</span>
              <span class="pills">${ex.primary.slice(0, 2).map((m) => `<span class="pill">${esc(muscleName(m))}</span>`).join("")}</span></span>
            <span class="ex-dose"><span class="prescription">${ex.sets} × ${esc(ex.reps)}</span><span class="rest">rest ${formatRest(ex.rest)}</span></span>
          </a>`, "li");
        li.querySelector(".thumb").appendChild(figureNode(ex, "good"));
        ol.appendChild(li);
      });
      days.appendChild(card);
    });
  };
  page.addEventListener("click", (e) => {
    const b = e.target.closest("[data-plan]");
    if (b) { state.plan = b.dataset.plan; Store.setRaw("plan", state.plan); draw(); }
  });
  draw();
  return page;
}

// ---------- Shell ----------
function renderStyleSwitch() {
  const sw = $("#style-switch");
  if (!sw) return;
  sw.innerHTML = STYLES.map((s) => `<option value="${s.id}"${s.id === state.style ? " selected" : ""}>${s.name}</option>`).join("");
}
function closeMenu() { document.body.classList.remove("menu-open"); const m = $(".menu-btn"); if (m) m.setAttribute("aria-expanded", "false"); }

document.addEventListener("click", (e) => {
  const fav = e.target.closest("[data-fav]");
  if (fav) {
    e.preventDefault(); e.stopPropagation();
    const on = Store.toggleFav(fav.dataset.fav);
    $$(`[data-fav="${CSS.escape(fav.dataset.fav)}"]`).forEach((b) => {
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", (on ? "Remove from" : "Save to") + " favorites");
      b.title = on ? "Saved" : "Save";
      b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
    });
    return;
  }
  if (e.target.closest(".menu-btn")) {
    const open = !document.body.classList.contains("menu-open");
    document.body.classList.toggle("menu-open", open);
    e.target.closest(".menu-btn").setAttribute("aria-expanded", String(open));
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "style-switch") {
    state.style = e.target.value; Store.setRaw("theme", state.style); document.body.dataset.style = state.style;
  }
});
window.addEventListener("hashchange", route);

state.style = STYLES.some((s) => s.id === Store.raw("theme")) ? Store.raw("theme") : state.style;
state.plan = PLANS.some((p) => p.id === Store.raw("plan")) ? Store.raw("plan") : state.plan;
document.body.dataset.style = state.style;
renderStyleSwitch();
route();

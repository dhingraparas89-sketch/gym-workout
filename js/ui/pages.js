// Pages: Home, Exercise Library, Form & Technique, Favorites (with recently viewed), Recently
// Viewed, Exercise Comparison and the sample plans. Each render function returns a node;
// js/app.js mounts it and owns the viewers (one shared component: mountStageViewer).

const POPULAR = ["Back squat", "Barbell bench press", "Deadlift", "Pull-up", "Romanian deadlift", "Overhead press", "Lat pulldown", "Dumbbell lateral raise"];
const CAT_ICON = {
  chest: "M4 8c3-2 5-2 8 0 3-2 5-2 8 0v5c-2 3-5 3-8 1-3 2-6 2-8-1z",
  back: "M12 3v18M7 6l5 3 5-3M6 11l6 4 6-4M8 17l4 2 4-2",
  shoulders: "M4 14a8 6 0 0 1 16 0M8 10a4 4 0 0 1 8 0M12 4v3",
  biceps: "M6 18c0-6 3-9 7-10 2-.5 4 1 4 3s-2 3-4 3M6 18h8",
  triceps: "M18 18c0-6-3-9-7-10-2-.5-4 1-4 3s2 3 4 3M18 18h-8",
  forearms: "M5 19l9-9M14 10l2-5 3 3-5 2M7 21l-3-3",
  quads: "M9 3v8l-2 10M15 3v8l2 10M9 11h6",
  hamstrings: "M8 3c-1 6 0 11 2 18M16 3c1 6 0 11-2 18M10 9h4",
  glutes: "M4 9c0 6 3 10 8 10s8-4 8-10M12 9v10M4 9h16",
  calves: "M10 3c-1 5 0 9 2 12l-1 6M14 3c1 4 1 8-1 12",
  core: "M8 4h8v16H8zM8 9h8M8 14h8M12 4v16",
  fullbody: "M12 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 9l7 1 7-1M12 10v5M12 15l-4 6M12 15l4 6"
};
const libCatCount = (id) => ALL_EXERCISES().filter((e) => inLibCat(e, id)).length;
function exerciseOptions(selected, withBlank) {
  const all = ALL_EXERCISES();
  const groups = LIB_CATS.map((c) => {
    const list = sortList(all.filter((e) => libCatsOf(e)[0] === c.id), "az");
    return list.length ? `<optgroup label="${esc(c.name)}">${list.map((e) => `<option value="${e.slug}"${e.slug === selected ? " selected" : ""}>${esc(e.name)}</option>`).join("")}</optgroup>` : "";
  }).join("");
  const rest = all.filter((e) => !libCatsOf(e).length);
  return (withBlank ? `<option value="">Choose an exercise…</option>` : "") + groups + rest.map((e) => `<option value="${e.slug}"${e.slug === selected ? " selected" : ""}>${esc(e.name)}</option>`).join("");
}
// Start a 3D viewer only once its slot scrolls near the screen.
function lazyViewer(ctx, slot, start) {
  if (!("IntersectionObserver" in window)) { start(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
  }, { rootMargin: "200px" });
  io.observe(slot);
  ctx.onCleanup(() => io.disconnect());
}
function segKeys(root) {
  // Arrow keys move between the options of a segmented control.
  root.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const b = e.target.closest(".seg button");
    if (!b) return;
    const items = [...b.parentElement.querySelectorAll("button:not([hidden])")];
    const n = items[(items.indexOf(b) + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
    if (n) { e.preventDefault(); n.focus(); n.click(); }
  });
}

// ---------- Home ----------
const FEATURED_GROUPS = ["chest", "back", "shoulders", "glutes", "quads"];
function renderHome(r, ctx) {
  const page = mk("home");
  const popular = POPULAR.map((n) => BY_NAME[n]).filter(isListed);
  const recent = Store.recent().map((n) => BY_NAME[n]).filter(isListed);
  const feats = FEATURED_GROUPS.filter((g) => REGION_BY_ID[g]);
  let feat = feats[0];
  page.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <h1>Train Smarter. Understand Every Movement.</h1>
        <p class="lede">Explore human anatomy, discover exercises, and understand how muscles work through interactive 3D visualization.</p>
        <form class="hero-search search" role="search" action="#/library">
          ${ICON.search}<input type="search" name="q" placeholder="Search ${ALL_EXERCISES().length} exercises, muscles or equipment" aria-label="Search exercises" autocomplete="off">
          <button type="submit" class="btn btn-sm">Search</button>
        </form>
        <div class="hero-cta">
          <a class="btn" href="#/library">${ICON.layers}Exercise Library</a>
          <a class="btn btn-ghost" href="#/anatomy">${ICON.body}3D Anatomy</a>
          <a class="btn btn-ghost" href="#/form">${ICON.target}Form &amp; Technique</a>
        </div>
      </div>
      <div class="hero-visual">
        <div class="stage hero-stage"><div class="fig-slot hero-3d"></div></div>
        <div class="hero-caption">
          <div class="seg seg-feat" role="radiogroup" aria-label="Featured muscle group">
            ${feats.map((g) => `<button type="button" role="radio" data-feat="${g}" aria-checked="${g === feat}">${esc(REGION_BY_ID[g].name)}</button>`).join("")}
          </div>
          <span class="hero-links"><a href="#/anatomy/${feat}" class="feat-open">Open in 3D Anatomy ${ICON.arrow}</a></span>
        </div>
      </div>
    </section>

    <section class="block">
      <header class="block-head"><h2>Muscle groups</h2><a href="#/muscles" class="more">Muscle Explorer ${ICON.arrow}</a></header>
      <div class="cat-tiles">${LIB_CATS.map((c) => `<a class="cat-tile" href="#/library?cat=${c.id}"><span class="cat-ico">${svgIcon(CAT_ICON[c.id] || CAT_ICON.core)}</span><b>${esc(c.name)}</b><span>${libCatCount(c.id)} exercises</span></a>`).join("")}</div>
    </section>

    <section class="block">
      <header class="block-head"><h2>Popular exercises</h2><a href="#/library" class="more">All exercises ${ICON.arrow}</a></header>
      <div class="popular"></div>
    </section>

    ${recent.length ? `<section class="block">
      <header class="block-head"><h2>Recently viewed</h2><a href="#/favorites" class="more">Favorites and history ${ICON.arrow}</a></header>
      <div class="mini-grid recent-mini"></div>
    </section>` : ""}

    <section class="block quick">
      <a class="quick-card panel" href="#/library"><span class="cat-ico">${ICON.layers}</span><span><b>Exercise Library</b><span>${ALL_EXERCISES().length} exercises by muscle, equipment, difficulty and movement pattern.</span></span>${ICON.arrow}</a>
      <a class="quick-card panel" href="#/form"><span class="cat-ico">${ICON.target}</span><span><b>Form &amp; Technique</b><span>Correct technique next to a common mistake, with the fix. Instructional examples.</span></span>${ICON.arrow}</a>
      <a class="quick-card panel" href="#/compare"><span class="cat-ico">${ICON.compare}</span><span><b>Compare exercises</b><span>Muscles, equipment, pattern and cues side by side.</span></span>${ICON.arrow}</a>
    </section>`;
  page.querySelector(".popular").appendChild(cardGrid(popular));
  const rm = page.querySelector(".recent-mini");
  if (rm) recent.slice(0, 6).forEach((ex) => rm.appendChild(exRow(ex)));
  page.querySelector(".hero-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    location.hash = "#/library" + (q ? "?q=" + encodeURIComponent(q) : "");
  });
  // Featured anatomical model: a standing body with one muscle group lit.
  const slot = page.querySelector(".hero-3d");
  const featEx = standingExercise([]);
  let viewer = null;
  const light = (turn) => {
    const g = REGION_BY_ID[feat];
    page.querySelectorAll("[data-feat]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.feat === feat)));
    page.querySelector(".feat-open").setAttribute("href", "#/anatomy/" + feat);
    if (!viewer) return;
    featEx.primary = [...new Set(g.muscles.map(parentMuscle))];
    featEx.secondary = [...new Set(featEx.primary.flatMap((m) => synergistsOf(m, 2)))].filter((m) => !featEx.primary.includes(m)).slice(0, 3);
    viewer.focusMuscle(null);
    if (turn) viewer.setView(g.side === "back" ? "back" : "threeQuarter");
  };
  lazyViewer(ctx, slot, () => {
    viewer = mountStageViewer(ctx, slot, "good", featEx, Store.athlete() || "male");
    if (viewer) { applyDisplayMode(viewer, "map"); light(true); }
  });
  page.addEventListener("click", (e) => {
    const b = e.target.closest("[data-feat]");
    if (b) { feat = b.dataset.feat; light(true); }
  });
  segKeys(page);
  return page;
}

// ---------- Exercise Library ----------
function renderLibrary(r, ctx) {
  const q = r.query;
  const okMuscle = (m) => m && groupOfMuscle(m);
  const okCat = (c) => LIB_CAT_NAME[c] || LEGACY_CATS[c];
  const f = {
    q: q.get("q") || "", cat: okCat(q.get("cat")) ? q.get("cat") : "", eq: LIB_EQUIP.some((x) => x.id === q.get("eq")) ? q.get("eq") : "",
    lvl: DIFF_NAME[q.get("lvl")] ? q.get("lvl") : "", pat: PATTERN_NAME[q.get("pat")] ? q.get("pat") : "",
    type: ["compound", "isolation"].includes(q.get("type")) ? q.get("type") : "", muscle: okMuscle(q.get("muscle")) ? q.get("muscle") : "",
    sort: SORTS.some((s) => s.id === q.get("sort")) ? q.get("sort") : "az"
  };
  const all = ALL_EXERCISES(), hidden = HIDDEN_COUNT();
  const usedPatterns = new Set(all.map(patternOf));
  const eqCount = (id) => all.filter((e) => usesEquip(e, id)).length;
  const opt = (key, i, label, disabled) => `<option value="${esc(i.id)}"${f[key] === i.id ? " selected" : ""}${disabled ? " disabled" : ""}>${esc(label || i.name)}</option>`;
  const sel = (key, label, items, render) => `<label class="fsel"><span>${label}</span><select data-f="${key}"><option value="">All</option>${render ? render() : items.map((i) => opt(key, i)).join("")}</select></label>`;
  const muscleOpts = () => MUSCLE_GROUPS.map((g) => `<optgroup label="${esc(g.name)}">${g.muscles.map((m) => `<option value="${esc(m)}"${f.muscle === m ? " selected" : ""}>${parentMuscle(m) !== m ? " " : ""}${esc(muscleName(m))}</option>`).join("")}</optgroup>`).join("");
  const page = mk("library");
  page.innerHTML = `
    <header class="page-head">
      <h1>Exercise Library</h1>
      <p class="lede">Search and filter every exercise by muscle group, equipment, difficulty, movement type and target muscle.</p>
    </header>
    <div class="lib-tools">
      <div class="lib-row">
        <label class="search">${ICON.search}<input type="search" placeholder="Search by name, muscle or equipment" value="${esc(f.q)}" aria-label="Search exercises" autocomplete="off"><button type="button" class="search-clear" aria-label="Clear search" ${f.q ? "" : "hidden"}>${ICON.close}</button></label>
        <label class="fsel fsel-sort"><span>Sort</span><select data-f="sort">${SORTS.map((s) => `<option value="${s.id}"${f.sort === s.id ? " selected" : ""}>${s.name}</option>`).join("")}</select></label>
      </div>
      <div class="cat-tabs" role="group" aria-label="Muscle group">
        <button type="button" class="cat-tab" data-k="cat" data-v="" aria-pressed="${!f.cat}">All</button>
        ${LIB_CATS.map((c) => `<button type="button" class="cat-tab" data-k="cat" data-v="${c.id}" aria-pressed="${f.cat === c.id}">${esc(c.name)}</button>`).join("")}
        ${LEGACY_CATS[f.cat] ? `<button type="button" class="cat-tab" data-k="cat" data-v="${f.cat}" aria-pressed="true">${esc(LEGACY_CATS[f.cat])}</button>` : ""}
      </div>
      <div class="fsels">
        ${sel("eq", "Equipment", LIB_EQUIP, () => LIB_EQUIP.map((i) => { const n = eqCount(i.id); return opt("eq", i, `${i.name} (${n})`, !n && f.eq !== i.id); }).join(""))}
        ${sel("lvl", "Difficulty", DIFF_LIST)}
        ${sel("pat", "Movement pattern", PATTERN_LIST.filter((p) => usedPatterns.has(p.id)))}
        ${sel("type", "Movement type", TYPES)}
        ${sel("muscle", "Target muscle", [], muscleOpts)}
      </div>
    </div>
    <div class="lib-status"><p class="count" aria-live="polite"></p><span class="active-chips"></span><button type="button" class="reset" hidden>Reset filters</button></div>
    <div class="lib-results"></div>
    ${hidden ? `<p class="lib-hidden">${ICON.info}${hidden} more ${hidden === 1 ? "exercise is" : "exercises are"} in progress and will appear here when their demonstrations are ready.</p>` : ""}`;
  const results = page.querySelector(".lib-results"), count = page.querySelector(".count"), reset = page.querySelector(".reset"), chips = page.querySelector(".active-chips");
  const anyFilter = () => !!(f.cat || f.eq || f.lvl || f.pat || f.type || f.q || f.muscle);
  const sync = () => {
    const p = new URLSearchParams();
    ["q", "cat", "muscle", "eq", "lvl", "pat", "type"].forEach((k) => { if (f[k]) p.set(k, f[k]); });
    if (f.sort !== "az") p.set("sort", f.sort);
    const s = p.toString();
    ctx.setHash("#/library" + (s ? "?" + s : ""));
  };
  const draw = () => {
    const list = sortList(all.filter((ex) => matches(ex, f)), f.sort);
    count.innerHTML = `<b>${list.length}</b> ${list.length === 1 ? "exercise" : "exercises"}`;
    chips.innerHTML = f.muscle ? `<button type="button" class="chip is-on" data-clear="muscle" aria-label="Remove muscle filter ${esc(muscleName(f.muscle))}">Trains: ${esc(muscleName(f.muscle))} ${ICON.close}</button>` : "";
    reset.hidden = !anyFilter();
    results.innerHTML = "";
    results.appendChild(cardGrid(list, `<span class="empty-ico">${ICON.search}</span><h3>No exercises match</h3><p>Nothing fits ${f.q ? `“${esc(f.q)}” with ` : ""}these filters. Try a broader muscle group, other equipment, or reset.</p><button type="button" class="btn btn-ghost reset-2">Reset filters</button>`));
  };
  const resetAll = () => {
    Object.assign(f, { q: "", cat: "", eq: "", lvl: "", pat: "", type: "", muscle: "" });
    page.querySelector(".search input").value = "";
    page.querySelector(".search-clear").hidden = true;
    page.querySelectorAll("select[data-f]").forEach((s) => { if (s.dataset.f !== "sort") s.value = ""; });
    page.querySelectorAll("[data-k]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === "")));
  };
  page.addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (b) {
      f[b.dataset.k] = b.dataset.v;
      page.querySelectorAll(`[data-k="${b.dataset.k}"]`).forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === f[b.dataset.k])));
      sync(); draw(); return;
    }
    if (e.target.closest("[data-clear]")) { f.muscle = ""; const s = page.querySelector('select[data-f="muscle"]'); if (s) s.value = ""; sync(); draw(); return; }
    if (e.target.closest(".reset, .reset-2")) { resetAll(); sync(); draw(); return; }
    if (e.target.closest(".search-clear")) {
      const inp = page.querySelector(".search input");
      inp.value = ""; f.q = ""; e.target.closest(".search-clear").hidden = true; inp.focus(); sync(); draw();
    }
  });
  page.addEventListener("change", (e) => {
    const s = e.target.closest("select[data-f]");
    if (s) { f[s.dataset.f] = s.value || (s.dataset.f === "sort" ? "az" : ""); sync(); draw(); }
  });
  let t = 0;
  page.querySelector(".search input").addEventListener("input", (e) => {
    f.q = e.target.value.trim();
    page.querySelector(".search-clear").hidden = !e.target.value;
    clearTimeout(t);
    t = setTimeout(() => { sync(); draw(); }, 120);
  });
  ctx.onCleanup(() => clearTimeout(t));
  draw();
  requestAnimationFrame(() => {
    const on = page.querySelector('.cat-tab[aria-pressed="true"]'), bar = page.querySelector(".cat-tabs");
    if (!on || !bar) return;
    const a = on.getBoundingClientRect(), b = bar.getBoundingClientRect();
    if (a.right > b.right) bar.scrollLeft += a.left - b.left - 16;
  });
  return page;
}

// ---------- Form & Technique ----------
// Correct technique and an instructional example of a common mistake, side by side (or one at a
// time on narrow screens), played in step, with the feedback item for the mistake.
function renderForm(r, ctx) {
  const ex = exByAny(r.params[0] || "") || BY_NAME["Barbell bench press"] || ALL_EXERCISES().find((e) => formOf(e));
  const page = mk("analysis form-page");
  if (!ex) { page.appendChild(notFound()); return page; }
  Store.pushRecent(ex.name);
  document.title = ex.name + " · Form & Technique · Rep Sheet";
  const f = formOf(ex), level = Store.level();
  const narrow = window.matchMedia("(max-width: 760px)");
  const st = { athlete: Store.athlete() || ex.athlete || "male", display: level === "advanced" ? "fiber" : "map", layout: narrow.matches ? "seq" : (Store.raw("formLayout") === "seq" ? "seq" : "side"), show: "good" };
  page.innerHTML = `
    <header class="page-head an-head">
      <div>
        <h1>Form &amp; Technique</h1>
        <p class="lede">Correct technique next to an instructional example of a common mistake, played in step, with what to change.</p>
      </div>
      <label class="fsel an-pick"><span>Exercise</span><select class="ex-select" aria-label="Exercise">${exerciseOptions(ex.slug)}</select></label>
    </header>
    <p class="notice">${ICON.info}<span><b>Instructional examples, not live analysis.</b> Both figures are 3D demonstrations of ${esc(ex.name.toLowerCase())}. Nothing on this page watches or measures your own lifting.</span></p>
    <div class="an-bar">
      <div class="seg seg-athlete" role="radiogroup" aria-label="Model">
        <span class="seg-label">Model</span>
        <button type="button" role="radio" data-athlete="male" aria-checked="${st.athlete === "male"}">Male</button>
        <button type="button" role="radio" data-athlete="female" aria-checked="${st.athlete === "female"}">Female</button>
      </div>
      <div class="seg seg-display" role="radiogroup" aria-label="Display mode">
        ${DISPLAY_MODES.map(([id, name]) => `<button type="button" role="radio" data-display="${id}" aria-checked="${st.display === id}">${name}</button>`).join("")}
      </div>
      ${f ? `<div class="seg seg-layout" role="radiogroup" aria-label="Layout">
        <button type="button" role="radio" data-layout="side" aria-checked="${st.layout === "side"}">Side by side</button>
        <button type="button" role="radio" data-layout="seq" aria-checked="${st.layout === "seq"}">One at a time</button>
      </div>` : ""}
      <a class="more" href="#/exercise/${ex.slug}">Exercise Studio ${ICON.arrow}</a>
    </div>
    <div class="an-view">
      ${f ? `<div class="seg seg-tabs seg-show" role="tablist" aria-label="Example">
        <button type="button" role="tab" data-show="good" aria-selected="true">${ICON.check}Correct technique</button>
        <button type="button" role="tab" data-show="bad" aria-selected="false">${ICON.warn}Common mistake</button>
      </div>` : ""}
      <div class="an-stages${f ? "" : " is-single"}" data-layout="${st.layout}" data-show="good">
        <figure class="an-stage is-good">
          <figcaption class="an-cap is-good">${ICON.check}<b>Correct technique</b><span>Reference movement</span></figcaption>
          <div class="stage"><div class="fig-slot"></div></div>
        </figure>
        ${f ? `<figure class="an-stage is-bad">
          <figcaption class="an-cap is-bad">${ICON.warn}<b>Common mistake</b><span>${esc(f.error.title)} · instructional example</span></figcaption>
          <div class="stage"><div class="fig-slot"></div></div>
        </figure>` : ""}
      </div>
      <div class="player-host"></div>
      ${f ? `<p class="an-legend"><span><i class="ln ln-bad"></i>Common mistake path</span><span><i class="ln ln-good"></i>Recommended path</span><span><i class="ln ln-ghost"></i>Recommended form outline (on the mistake)</span>${ex.demo === "beta" ? `<span class="beta-note">${ICON.info}Preview animation</span>` : ""}</p>` : ""}
    </div>
    <div class="an-info">
      ${formFeedback(ex, { paths: false, demo: f ? "Show the mistake example" : "", more: true, intro: false })}
      ${f ? biomechPanel() : ""}
    </div>`;
  const stages = page.querySelector(".an-stages");
  const slots = page.querySelectorAll(".fig-slot");
  const good = mountStageViewer(ctx, slots[0], "good", ex, st.athlete);
  const bad = f ? mountStageViewer(ctx, slots[1], "bad", ex, st.athlete) : null;
  const vs = [good, bad].filter(Boolean);
  vs.forEach((v) => { applyDisplayMode(v, st.display); if (level === "beginner") v.setSpeed(0.5); });
  if (vs.length && typeof vs[0].setDisplayMode !== "function") { const sb = page.querySelector('[data-display="surface"]'); if (sb) sb.hidden = true; }
  if (!vs.length) page.querySelectorAll(".an-bar .seg").forEach((n) => n.hidden = true);
  const player = mountPlayer(page.querySelector(".player-host"), vs, { keys: page });
  ctx.onCleanup(() => player.destroy());
  if (bad) fillFeedbackMetric(page, bad, ctx.onCleanup);
  bindBiomech(page.querySelector(".biomech"), () => good, () => bad, ctx.onCleanup);

  const setLayout = (l) => {
    st.layout = l;
    stages.dataset.layout = l;
    page.querySelector(".an-view").dataset.layout = l;
    page.querySelectorAll("[data-layout]").forEach((b) => { if (b.tagName === "BUTTON") b.setAttribute("aria-checked", String(b.dataset.layout === l)); });
  };
  const setShow = (s) => {
    st.show = s;
    stages.dataset.show = s;
    page.querySelectorAll("[data-show]").forEach((b) => { if (b.tagName === "BUTTON") b.setAttribute("aria-selected", String(b.dataset.show === s)); });
  };
  setLayout(st.layout);
  const onNarrow = () => setLayout(narrow.matches ? "seq" : (Store.raw("formLayout") === "seq" ? "seq" : "side"));
  narrow.addEventListener("change", onNarrow);
  ctx.onCleanup(() => narrow.removeEventListener("change", onNarrow));

  page.querySelector(".ex-select").addEventListener("change", (e) => { location.hash = "#/form/" + e.target.value; });
  page.addEventListener("click", (e) => {
    const ab = e.target.closest("[data-athlete]");
    if (ab) {
      st.athlete = ab.dataset.athlete; Store.setAthlete(st.athlete);
      page.querySelectorAll("[data-athlete]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.athlete === st.athlete)));
      vs.forEach((v) => v.setAthlete(st.athlete));
      return;
    }
    const db = e.target.closest("[data-display]");
    if (db) {
      st.display = db.dataset.display;
      page.querySelectorAll("[data-display]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.display === st.display)));
      vs.forEach((v) => applyDisplayMode(v, st.display));
      return;
    }
    const lb = e.target.closest("button[data-layout]");
    if (lb) { Store.setRaw("formLayout", lb.dataset.layout); setLayout(lb.dataset.layout); return; }
    const sb = e.target.closest("button[data-show]");
    if (sb) { setShow(sb.dataset.show); return; }
    if (e.target.closest("[data-demo]")) {
      setShow("bad");
      page.querySelector(".an-view").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  segKeys(page);
  return page;
}

// ---------- Favorites / Recently viewed ----------
function renderFavorites(r, ctx) {
  const page = mk("favorites");
  const favs = Store.favorites().map((n) => BY_NAME[n]).filter(Boolean);
  const recent = Store.recent().map((n) => BY_NAME[n]).filter(Boolean);
  page.innerHTML = `
    <header class="page-head"><h1>Favorites</h1><p class="lede">Exercises you saved and the ones you opened recently, kept on this device.</p></header>
    <div class="list-tools">${favs.length >= 2 ? `<a class="btn btn-ghost btn-sm" href="#/compare?a=${favs[0].slug}&b=${favs[1].slug}">${ICON.compare}Compare two favorites</a>` : ""}</div>
    <div class="fav-list"></div>
    <section class="block">
      <header class="block-head"><h2>Recently viewed</h2>${recent.length ? `<button type="button" class="more clear-recent">Clear history</button>` : ""}</header>
      <div class="mini-grid recent-mini"></div>
    </section>`;
  page.querySelector(".fav-list").appendChild(cardGrid(favs, `<span class="empty-ico">${ICON.heart}</span><h3>No favorites yet</h3><p>Use the heart on any exercise to keep it here.</p><a class="btn btn-ghost" href="#/library">Browse the library</a>`));
  const rm = page.querySelector(".recent-mini");
  if (recent.length) recent.forEach((ex) => rm.appendChild(exRow(ex)));
  else { rm.className = "muted recent-empty"; rm.textContent = "Exercises you open show up here."; }
  page.addEventListener("click", (e) => { if (e.target.closest(".clear-recent")) { Store.clearRecent(); ctx.rerender(); } });
  return page;
}
function renderRecent(r, ctx) {
  const page = mk("recent");
  const recent = Store.recent().map((n) => BY_NAME[n]).filter(Boolean);
  page.innerHTML = `
    <header class="page-head"><h1>Recently Viewed</h1><p class="lede">The last ${recent.length > 1 ? recent.length + " " : ""}exercises you opened, newest first, on this device.</p></header>
    <div class="list-tools">${recent.length ? `<button type="button" class="btn btn-ghost btn-sm clear-recent">Clear history</button>` : ""}</div>
    <div class="recent-list"></div>`;
  page.querySelector(".recent-list").appendChild(cardGrid(recent, `<span class="empty-ico">${ICON.clock}</span><h3>Nothing viewed yet</h3><p>Exercises you open show up here.</p><a class="btn btn-ghost" href="#/library">Browse the library</a>`));
  page.addEventListener("click", (e) => { if (e.target.closest(".clear-recent")) { Store.clearRecent(); ctx.rerender(); } });
  return page;
}

// ---------- Exercise Comparison ----------
function renderCompare(r, ctx) {
  const all = ALL_EXERCISES();
  let a = exByAny(r.query.get("a") || "") || BY_NAME["Barbell bench press"] || all[0];
  let b = exByAny(r.query.get("b") || "") || alternativesOf(a)[0] || all[1];
  const page = mk("compare");
  page.innerHTML = `
    <header class="page-head"><h1>Exercise Comparison</h1><p class="lede">Target muscles, equipment, movement pattern, difficulty and technique cues side by side.</p></header>
    <div class="cmp-pick">
      <label class="fsel"><span>Exercise A</span><select data-side="a">${exerciseOptions(a.slug)}</select></label>
      <label class="fsel"><span>Exercise B</span><select data-side="b">${exerciseOptions(b.slug)}</select></label>
    </div>
    <div class="cmp"></div>`;
  const draw = () => {
    const shared = a.primary.filter((m) => b.primary.includes(m));
    const chips = (ex, role, cls) => (ex[role] || []).length ? ex[role].map((m) => `<span class="mchip ${cls || ""}${shared.includes(m) ? " is-shared" : ""}">${esc(muscleName(m))}</span>`).join("") : `<span class="muted">—</span>`;
    const cues = (ex) => (ex.cues || []).slice(0, 3);
    const fe = (ex) => formOf(ex) && formOf(ex).error;
    const col = (ex) => `
      <article class="cmp-col panel">
        <a class="cmp-fig" href="#/exercise/${ex.slug}" aria-label="Open ${esc(ex.name)}"></a>
        <h2><a href="#/exercise/${ex.slug}">${esc(ex.name)}</a></h2>
        <div class="cmp-map">${bodyMap({ primary: ex.primary.map(parentMuscle), secondary: ex.secondary.map(parentMuscle) })}</div>
        <dl class="cmp-rows">
          <div><dt>Target muscles</dt><dd>${chips(ex, "primary", "is-prim")}</dd></div>
          <div><dt>Also works</dt><dd>${chips(ex, "secondary")}</dd></div>
          ${stabilizersOf(ex).length ? `<div><dt>Stabilizers</dt><dd>${stabilizersOf(ex).map((m) => `<span class="mchip is-stab">${esc(muscleName(m))}</span>`).join("")}</dd></div>` : ""}
          <div><dt>Equipment</dt><dd>${esc(ex.setup || ex.equipment || "—")}</dd></div>
          <div><dt>Movement pattern</dt><dd>${esc(PATTERN_NAME[patternOf(ex)])}${ex.movementType ? " · " + esc(cap(ex.movementType)) : ""}</dd></div>
          <div><dt>Difficulty</dt><dd>${difficultyMeter(ex.difficulty)}${esc(DIFF_NAME[ex.difficulty] || "—")}</dd></div>
          ${ex.sets ? `<div><dt>Typical dose</dt><dd>${ex.sets} × ${esc(ex.reps)} · rest ${formatRest(ex.rest)}</dd></div>` : ""}
          <div><dt>Technique cues</dt><dd>${cues(ex).length ? `<ul class="cmp-cues">${cues(ex).map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : `<span class="muted">—</span>`}</dd></div>
          ${fe(ex) ? `<div><dt>Common mistake</dt><dd class="cmp-mistake">${esc(fe(ex).title)}</dd></div>` : ""}
        </dl>
        <p class="cmp-actions"><a class="btn btn-ghost btn-sm" href="#/exercise/${ex.slug}">Exercise Studio</a>${formOf(ex) ? `<a class="btn btn-ghost btn-sm" href="#/form/${ex.slug}">Form &amp; Technique</a>` : ""}</p>
      </article>`;
    const box = page.querySelector(".cmp");
    const samePat = patternOf(a) === patternOf(b);
    box.innerHTML = `
      <p class="cmp-summary">${shared.length ? `Both work the <b>${esc(shared.map(muscleName).join(", "))}</b> as main movers.` : "These two exercises have no main muscle in common."}
        ${a.equip !== b.equip ? ` Different equipment (${esc(EQUIP_NAME[a.equip] || a.equipment)} vs ${esc(EQUIP_NAME[b.equip] || b.equipment)}).` : ` Same equipment type.`}
        ${samePat ? ` Same movement pattern (${esc(PATTERN_NAME[patternOf(a)].toLowerCase())}).` : ` Different movement patterns.`}</p>
      <div class="cmp-grid">${col(a)}${col(b)}</div>`;
    box.querySelectorAll(".cmp-fig").forEach((n, i) => n.appendChild(thumbNode(i ? b : a)));
  };
  page.addEventListener("change", (e) => {
    const s = e.target.closest("select[data-side]");
    const ex = s && exByAny(s.value);
    if (!ex) return;
    if (s.dataset.side === "a") a = ex; else b = ex;
    ctx.setHash(`#/compare?a=${a.slug}&b=${b.slug}`);
    draw();
  });
  draw();
  return page;
}

// ---------- Sample plans ----------
function estimateMinutes(list) {
  const sec = list.reduce((t, ex) => t + (ex.sets || 3) * (40 + (ex.rest || 60)), 0);
  return Math.round(sec / 60 / 5) * 5 + 10;
}
function renderPlans() {
  const page = mk("plans");
  let planId = PLANS.some((p) => p.id === Store.raw("plan")) ? Store.raw("plan") : (PLANS[0] && PLANS[0].id);
  page.innerHTML = `
    <header class="page-head">
      <h1>Sample plans</h1>
      <p class="lede">Starting points, not prescriptions. Pick a weight you can finish every set with one or two reps left.</p>
    </header>
    <div class="plan-picker"></div>
    <div class="days"></div>`;
  const draw = () => {
    page.querySelector(".plan-picker").innerHTML = PLANS.map((p) => `
      <button type="button" class="plan-option" data-plan="${p.id}" aria-pressed="${p.id === planId}">
        <span class="plan-name">${esc(p.name)}</span>
        <span class="plan-meta">${p.perWeek} days / week</span>
        <span class="plan-who">${esc(p.who)}</span>
      </button>`).join("");
    const plan = PLANS.find((p) => p.id === planId) || PLANS[0];
    const days = page.querySelector(".days");
    days.innerHTML = "";
    plan.days.forEach((day) => {
      const list = day.exercises.map((n) => BY_NAME[n]).filter(Boolean);
      const totalSets = list.reduce((t, ex) => t + (ex.sets || 0), 0);
      const primary = [...new Set(list.flatMap((ex) => ex.primary))];
      const secondary = [...new Set(list.flatMap((ex) => ex.secondary))].filter((m) => !primary.includes(m));
      const card = mk("day", `
        <header class="day-head">
          <div><h3>${esc(day.name)}</h3><span class="day-meta">${list.length} exercises · ${totalSets} sets · ~${estimateMinutes(list)} min</span></div>
          <div class="day-map">${bodyMap({ primary, secondary })}</div>
        </header>
        <ol class="ex-list"></ol>`, "article");
      const ol = card.querySelector(".ex-list");
      list.forEach((ex) => {
        const li = mk("ex-row", `
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
    if (b) { planId = b.dataset.plan; Store.setRaw("plan", planId); draw(); }
  });
  draw();
  return page;
}

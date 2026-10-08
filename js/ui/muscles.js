// Muscle explorer: the 2D front/back map, region info (anatomy, function, fibers, mistakes,
// exercises) and, on the muscles page, one 3D body that lights up the selected muscle.

const REGION_BY_ID = Object.fromEntries(MUSCLE_REGIONS.map((r) => [r.id, r]));

function exercisesFor(muscles, role) {
  return ALL_EXERCISES().filter((ex) => (ex[role] || []).some((m) => muscles.includes(m)))
    .sort((a, b) => Math.max(...muscles.map((m) => (b.activation || {})[m] || 0)) - Math.max(...muscles.map((m) => (a.activation || {})[m] || 0)));
}

function regionPanel(regionId, muscleId, opts = {}) {
  const r = REGION_BY_ID[regionId] || MUSCLE_REGIONS[0];
  const mid = r.muscles.includes(muscleId) ? muscleId : r.muscles[0];
  const info = MUSCLE_INFO[mid] || {};
  const main = exercisesFor([mid], "primary"), helps = exercisesFor([mid], "secondary").filter((e) => !main.includes(e));
  const limit = opts.compact ? 5 : 12;
  const link = (ex) => `<li><a href="#/exercise/${ex.slug}"><span>${esc(ex.name)}</span><em>${(ex.activation || {})[mid] ? ex.activation[mid] + "%" : ""}</em>${ICON.chevron}</a></li>`;
  return `
    <div class="region-panel">
      <p class="eyebrow">${r.side === "back" ? "Posterior chain" : "Anterior"} · ${esc(r.name)}</p>
      <h2>${esc(muscleName(mid))}</h2>
      <p class="anat">${esc(info.name || "")}</p>
      ${r.muscles.length > 1 ? `<div class="sub-chips" role="group" aria-label="${esc(r.name)} muscles">${r.muscles.map((m) =>
        `<button type="button" class="chip" data-mid="${m}" aria-pressed="${m === mid}">${esc(muscleName(m))}</button>`).join("")}</div>` : ""}
      <dl class="rp-facts">
        <div><dt>${ICON.activation}Function</dt><dd>${esc(info.function || info.action || "")}</dd></div>
        <div><dt>${ICON.fiber}Fiber direction</dt><dd>${esc(info.fibers || "")}</dd></div>
        ${opts.compact ? "" : `<div><dt>${ICON.warn}Common mistakes</dt><dd><ul class="rp-mistakes">${(info.mistakes || []).map((m) => `<li>${esc(m)}</li>`).join("")}</ul></dd></div>`}
      </dl>
      <div class="rp-ex">
        <p class="bm-label">Primary exercises <span>${main.length}</span></p>
        ${main.length ? `<ul class="rp-links">${main.slice(0, limit).map(link).join("")}</ul>` : `<p class="muted">No exercise targets it as a main mover yet.</p>`}
        ${!opts.compact && helps.length ? `<p class="bm-label">Also trained by <span>${helps.length}</span></p><p class="rp-also">${helps.slice(0, 10).map((ex) => `<a href="#/exercise/${ex.slug}">${esc(ex.name)}</a>`).join("")}</p>` : ""}
      </div>
      ${opts.compact ? `<a class="btn btn-ghost" href="#/muscles/${r.id}">Explore in 3D ${ICON.arrow}</a>` : ""}
    </div>`;
}

function regionChips(selected) {
  return `<div class="region-chips" role="tablist" aria-label="Muscle groups">${MUSCLE_REGIONS.map((r) =>
    `<button type="button" class="chip" data-region="${r.id}" aria-pressed="${r.id === selected}">${esc(r.name)}</button>`).join("")}</div>`;
}

// A plain standing body for the 3D muscle map.
function standingExercise(id) {
  return { name: "Muscle map", group: "core", equipment: "", primary: [id], secondary: [], good: {}, bad: {},
    figure: { a: STAND, b: STAND, hand: "relaxed" }, figure3d: { kit: "none", abd: -12, grip: "neutral", path: false } };
}

// The interactive map widget (dashboard and muscles page). onSelect(regionId, muscleId).
function mountMuscleMap(root, state, onSelect) {
  const draw = () => {
    const r = REGION_BY_ID[state.region];
    root.querySelector(".map-figure").innerHTML = bodyMap({ interactive: true, region: state.region, primary: r ? r.muscles : [] });
    root.querySelector(".map-info").innerHTML = regionPanel(state.region, state.muscle, { compact: state.compact });
    root.querySelectorAll(".region-chips [data-region]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.region === state.region)));
    root.querySelectorAll(".map-figure .m").forEach((g) => g.classList.toggle("is-focus", g.dataset.mid === state.muscle));
  };
  const pick = (region, mid) => {
    if (!REGION_BY_ID[region]) return;
    state.region = region;
    state.muscle = REGION_BY_ID[region].muscles.includes(mid) ? mid : REGION_BY_ID[region].muscles[0];
    draw();
    if (onSelect) onSelect(state.region, state.muscle);
  };
  root.addEventListener("click", (e) => {
    const g = e.target.closest("[data-region]");
    if (g) { pick(g.dataset.region, g.dataset.mid); return; }
    const sub = e.target.closest(".sub-chips [data-mid]");
    if (sub) pick(state.region, sub.dataset.mid);
  });
  root.addEventListener("keydown", (e) => {
    const g = e.target.closest && e.target.closest("[data-region]");
    if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(g.dataset.region, g.dataset.mid); }
  });
  draw();
  return { pick, draw };
}

// ctx: { makeViewer, onCleanup, setHash(path) }
function renderMuscles(params, ctx) {
  const state = { region: REGION_BY_ID[params[0]] ? params[0] : "chest", muscle: null, compact: false };
  state.muscle = REGION_BY_ID[state.region].muscles.includes(params[1]) ? params[1] : REGION_BY_ID[state.region].muscles[0];
  const wrap = document.createElement("div");
  wrap.className = "muscles-page";
  wrap.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Anatomy</p>
      <h1>Muscle explorer</h1>
      <p class="lede">Pick a muscle on the body, the map or the list. See what it does, how its fibers run, the mistakes that take it out of the lift, and the exercises that train it best.</p>
    </header>
    <div class="mx">
      ${regionChips(state.region)}
      <div class="mx-grid">
        <section class="mx-3d">
          <div class="fig-slot fig-3d-wrap"></div>
          <p class="stage-hint">${ICON.rotate}Drag to rotate · tap a muscle on the body</p>
        </section>
        <aside class="mx-side">
          <div class="map-figure panel"></div>
          <div class="map-info panel"></div>
        </aside>
      </div>
    </div>`;
  const slot = wrap.querySelector(".fig-3d-wrap");
  let viewer = null;
  const BACK = ["triceps", "back", "glutes", "hamstrings", "calves"];
  const show3d = (region, mid) => {
    if (!viewer) return;
    try {
      viewer.setExercise(standingExercise(mid));
      viewer.focusMuscle(mid);
      if (typeof viewer.setView === "function") viewer.setView(BACK.includes(region) ? Math.PI + 1.25 : 1.25, 0.08);
    } catch (e) {}
  };
  const map = mountMuscleMap(wrap.querySelector(".mx"), state, (region, mid) => {
    ctx.setHash(`#/muscles/${region}/${mid}`);
    show3d(region, mid);
    // On a phone the body sits above the map: bring it back into view.
    const box = slot.getBoundingClientRect();
    if (window.matchMedia("(max-width: 980px)").matches && (box.bottom < 120 || box.top > window.innerHeight)) {
      slot.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  if (window.THREE && typeof createViewer3D === "function") {
    slot.classList.add("fig-3d");
    viewer = ctx.makeViewer(slot, "good", { athlete: Store.athlete() || "male" });
    show3d(state.region, state.muscle);
    wrap.addEventListener("muscle-pick", (e) => {
      const id = e.detail && e.detail.id;
      if (!id || !REGION_OF[id]) return;
      state.region = REGION_OF[id]; state.muscle = id;
      map.draw();
      ctx.setHash(`#/muscles/${state.region}/${id}`);
      viewer.focusMuscle(id);
    });
  } else {
    slot.innerHTML = `<div class="no3d">${bodyMap({ primary: REGION_BY_ID[state.region].muscles })}</div>`;
  }
  return wrap;
}

// Muscle Explorer: pick a muscle on the 2D map, the grouped list or the 3D body; see where it is,
// what it does, its joint actions, fiber direction, origin and insertion (advanced anatomy), the
// exercises that train it, the muscles that assist it and the mistakes that take it out of the lift.
// Muscle groups come from js/ui/core.js MUSCLE_GROUPS (map regions plus the finer muscles that
// data/anatomy.js adds with a `parent`).

const REGION_BY_ID = Object.fromEntries(MUSCLE_GROUPS.map((r) => [r.id, r]));

// Fallbacks when the anatomy data does not say (plain-language, for orientation only).
const MUSCLE_LOCATION = {
  chest: "Front of the upper torso, from the collarbone and breastbone to the upper arm",
  shoulders: "Cap of the shoulder, front and side",
  "rear-delts": "Back of the shoulder",
  traps: "Upper back and back of the neck, from the skull down to the mid-back",
  "upper-back": "Between the shoulder blades",
  lats: "Sides of the back, from the lower spine and pelvis up into the armpit",
  "lower-back": "Along both sides of the lower spine",
  biceps: "Front of the upper arm",
  triceps: "Back of the upper arm",
  forearms: "Between the elbow and the wrist",
  abs: "Front of the abdomen, from the lower ribs to the pubic bone",
  obliques: "Sides of the waist",
  glutes: "Buttocks, behind the hip joint",
  quads: "Front of the thigh",
  hamstrings: "Back of the thigh",
  calves: "Back of the lower leg"
};
const JOINT_ACTIONS = {
  chest: ["Shoulder horizontal adduction", "Shoulder flexion (upper fibers)", "Internal rotation"],
  shoulders: ["Shoulder flexion", "Shoulder abduction"],
  "rear-delts": ["Shoulder horizontal abduction", "External rotation", "Shoulder extension"],
  traps: ["Scapular elevation", "Scapular retraction", "Scapular depression (lower fibers)"],
  "upper-back": ["Scapular retraction", "Scapular downward rotation"],
  lats: ["Shoulder extension", "Shoulder adduction", "Internal rotation"],
  "lower-back": ["Spinal extension", "Holding a neutral spine"],
  biceps: ["Elbow flexion", "Forearm supination", "Shoulder flexion (long head)"],
  triceps: ["Elbow extension", "Shoulder extension (long head)"],
  forearms: ["Wrist flexion", "Grip", "Elbow flexion (brachioradialis)"],
  abs: ["Spinal flexion", "Resisting spinal extension"],
  obliques: ["Trunk rotation", "Side bending", "Resisting rotation"],
  glutes: ["Hip extension", "Hip external rotation", "Hip abduction (upper fibers)"],
  quads: ["Knee extension", "Hip flexion (rectus femoris)"],
  hamstrings: ["Knee flexion", "Hip extension"],
  calves: ["Ankle plantar flexion", "Knee flexion (gastrocnemius)"]
};
// Anatomy facts for a muscle id: data/anatomy.js (ANATOMY / MUSCLE_INFO), then the fallbacks.
function anatomyFacts(id) {
  const info = (typeof MUSCLE_INFO !== "undefined" && MUSCLE_INFO[id]) || {};
  const extra = (typeof ANATOMY !== "undefined" && ANATOMY && ANATOMY[id]) || {};
  const pick = (...keys) => { for (const k of keys) { const v = extra[k] != null ? extra[k] : info[k]; if (v != null && v !== "") return v; } return null; };
  const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const par = parentMuscle(id);
  return {
    name: muscleName(id), anat: pick("name", "anatomical") || anatName(id),
    location: pick("location") || MUSCLE_LOCATION[id] || MUSCLE_LOCATION[par] || "",
    fn: pick("function", "action") || "",
    actions: list(pick("jointActions", "actions")).length ? list(pick("jointActions", "actions")) : (JOINT_ACTIONS[id] || JOINT_ACTIONS[par] || []),
    origin: pick("origin"), insertion: pick("insertion"),
    fibers: pick("fibers", "fiberDirection") || "",
    mistakes: list(pick("mistakes")).length ? list(pick("mistakes")) : list(par !== id && MUSCLE_INFO[par] ? MUSCLE_INFO[par].mistakes : null),
    parent: par !== id ? par : null
  };
}

// Exercises where any of the muscles (or their finer parts) has the given role, strongest first.
function exercisesFor(muscles, role) {
  const keys = [...new Set(muscles.flatMap(muscleKeys))];
  const act = (ex) => Math.max(0, ...keys.map((m) => (ex.activation || {})[m] || 0));
  return ALL_EXERCISES().filter((ex) => (ex[role] || []).some((m) => keys.includes(m))).sort((a, b) => act(b) - act(a) || a.name.localeCompare(b.name));
}

function regionPanel(regionId, muscleId, opts = {}) {
  const r = REGION_BY_ID[regionId] || MUSCLE_GROUPS[0];
  const mid = r.muscles.includes(muscleId) ? muscleId : r.muscles[0];
  const a = anatomyFacts(mid), level = Store.level();
  const main = exercisesFor([mid], "primary"), helps = exercisesFor([mid], "secondary").filter((e) => !main.includes(e));
  const syn = synergistsOf(mid, 4);
  const limit = opts.compact ? 4 : 8;
  const keys = muscleKeys(mid);
  const pct = (ex) => Math.max(0, ...keys.map((m) => (ex.activation || {})[m] || 0));
  const link = (ex) => `<li><a href="#/exercise/${ex.slug}"><span>${esc(ex.name)}</span><em>${pct(ex) ? pct(ex) + "%" : ""}</em>${ICON.chevron}</a></li>`;
  const showAttach = level === "advanced";
  const usesParent = !keys.some((k) => usedMuscles().has(k) && k !== parentMuscle(mid)) && parentMuscle(mid) !== mid;
  return `
    <div class="region-panel">
      <p class="eyebrow">${r.side === "back" ? "Back of the body" : "Front of the body"} · ${esc(r.name)}</p>
      <h2>${esc(a.name)}</h2>
      ${a.anat && a.anat !== a.name ? `<p class="anat">${esc(a.anat)}</p>` : ""}
      ${r.muscles.length > 1 ? `<div class="sub-chips" role="group" aria-label="${esc(r.name)} muscles">${r.muscles.map((m) =>
        `<button type="button" class="chip${parentMuscle(m) !== m ? " is-part" : ""}" data-mid="${esc(m)}" aria-pressed="${m === mid}">${esc(muscleName(m))}</button>`).join("")}</div>` : ""}
      <dl class="rp-facts">
        ${a.location ? `<div><dt>Location</dt><dd>${esc(a.location)}</dd></div>` : ""}
        ${a.fn ? `<div><dt>Function</dt><dd>${esc(a.fn)}</dd></div>` : ""}
        ${a.actions.length ? `<div><dt>Joint actions</dt><dd><ul class="rp-actions">${a.actions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></dd></div>` : ""}
        ${a.fibers ? `<div><dt>Fiber direction</dt><dd>${esc(a.fibers)}</dd></div>` : ""}
        ${!opts.compact && showAttach && a.origin ? `<div><dt>Origin</dt><dd>${esc(a.origin)}</dd></div>` : ""}
        ${!opts.compact && showAttach && a.insertion ? `<div><dt>Insertion</dt><dd>${esc(a.insertion)}</dd></div>` : ""}
        ${syn.length ? `<div><dt>Assisting muscles</dt><dd class="rp-syn">${syn.map((m) => `<a class="mchip" href="#/muscles/${groupOfMuscle(m) || ""}/${encodeURIComponent(m)}">${esc(muscleName(m))}</a>`).join("")}</dd></div>` : ""}
        ${!opts.compact && a.mistakes.length ? `<div><dt>Common training mistakes</dt><dd><ul class="rp-mistakes">${a.mistakes.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></dd></div>` : ""}
      </dl>
      ${!opts.compact && !showAttach && (a.origin || a.insertion) ? `<p class="card-hint">Set the guide to Advanced anatomy to see origin and insertion.</p>` : ""}
      <div class="rp-ex">
        <p class="bm-label">Primary exercises <span>${main.length}</span></p>
        ${usesParent && main.length ? `<p class="card-hint">Exercise data lists the ${esc(muscleName(parentMuscle(mid)).toLowerCase())} as a whole; these train this part with it.</p>` : ""}
        ${main.length ? `<ul class="rp-links">${main.slice(0, limit).map(link).join("")}</ul>` : `<p class="muted">No exercise targets it as a main mover yet.</p>`}
        ${!opts.compact && helps.length ? `<p class="bm-label">Assisting in <span>${helps.length}</span></p><p class="rp-also">${helps.slice(0, 10).map((ex) => `<a href="#/exercise/${ex.slug}">${esc(ex.name)}</a>`).join("")}</p>` : ""}
      </div>
      <div class="rp-actions-row">
        <a class="btn" href="#/library?muscle=${encodeURIComponent(mid)}">Show exercises ${ICON.arrow}</a>
        ${opts.compact ? `<a class="btn btn-ghost" href="#/muscles/${r.id}/${encodeURIComponent(mid)}">Open in Muscle Explorer</a>` : `<a class="btn btn-ghost" href="#/anatomy/${encodeURIComponent(mid)}">${ICON.cube}View in 3D Anatomy</a>`}
      </div>
    </div>`;
}

function regionChips(selected) {
  return `<div class="region-chips" role="group" aria-label="Muscle groups">${MUSCLE_GROUPS.map((r) =>
    `<button type="button" class="chip" data-region="${r.id}" aria-pressed="${r.id === selected}">${esc(r.name)}</button>`).join("")}</div>`;
}

// A plain standing body for the 3D muscle views (no equipment). primary / secondary muscle ids.
function standingExercise(primary, secondary) {
  const p = Array.isArray(primary) ? primary : primary ? [primary] : [];
  return { name: "Muscle map", group: "core", equipment: "", primary: p, secondary: secondary || [], good: {}, bad: {},
    figure: { a: STAND, b: STAND, hand: "relaxed" }, figure3d: { kit: "none", abd: -12, grip: "neutral", path: false }, camera: { view: "front" } };
}
// The id to light on the 3D body: the muscle itself when the body draws it, else its group.
function drawnMuscle(viewer, id) {
  const ids = viewer && viewer.muscleIds;
  if (!id || !ids || !ids.length || ids.includes(id)) return id;
  return ids.includes(parentMuscle(id)) ? parentMuscle(id) : id;
}

// The interactive map widget. onSelect(regionId, muscleId).
function mountMuscleMap(root, state, onSelect) {
  const draw = () => {
    const r = REGION_BY_ID[state.region];
    root.querySelector(".map-figure").innerHTML = bodyMap({ interactive: true, region: state.region, primary: r ? [...new Set(r.muscles.map(parentMuscle))] : [] });
    root.querySelector(".map-info").innerHTML = regionPanel(state.region, state.muscle, { compact: state.compact });
    root.querySelectorAll(".region-chips [data-region]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.region === state.region)));
    root.querySelectorAll(".map-figure .m").forEach((g) => g.classList.toggle("is-focus", g.dataset.mid === parentMuscle(state.muscle)));
  };
  const pick = (region, mid) => {
    if (!REGION_BY_ID[region]) return;
    state.region = region;
    state.muscle = REGION_BY_ID[region].muscles.includes(mid) ? mid : REGION_BY_ID[region].muscles[0];
    draw();
    if (onSelect) onSelect(state.region, state.muscle);
  };
  root.addEventListener("click", (e) => {
    const sub = e.target.closest(".sub-chips [data-mid]");
    if (sub) { pick(state.region, sub.dataset.mid); return; }
    const g = e.target.closest("[data-region]");
    if (g) pick(g.dataset.region, g.dataset.mid);
  });
  root.addEventListener("keydown", (e) => {
    const g = e.target.closest && e.target.closest("[data-region]");
    if (g && g.tagName !== "BUTTON" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(g.dataset.region, g.dataset.mid); }
  });
  draw();
  return { pick, draw };
}

// ctx: { makeViewer, onCleanup, setHash(path) }
function renderMuscles(params, ctx) {
  // #/muscles/<group>/<muscle>; an unknown group with a known muscle still finds its group.
  let region = REGION_BY_ID[params[0]] ? params[0] : (params[1] && groupOfMuscle(params[1])) || "chest";
  const state = { region, muscle: null, compact: false };
  state.muscle = REGION_BY_ID[region].muscles.includes(params[1]) ? params[1] : REGION_BY_ID[region].muscles[0];
  const level = Store.level();
  const wrap = mk("muscles-page");
  wrap.innerHTML = `
    <header class="page-head">
      <h1>Muscle Explorer</h1>
      <p class="lede">Select a muscle on the body map, the list or the 3D model to see where it sits, what it does, which muscles assist it and which exercises train it.</p>
    </header>
    <div class="mx">
      ${regionChips(state.region)}
      <div class="mx-grid">
        <section class="mx-3d" aria-label="3D model">
          <div class="stage-top">
            <div class="seg seg-display" role="radiogroup" aria-label="Display mode">
              <button type="button" role="radio" data-display="map" aria-checked="${level !== "advanced"}">Muscle Map</button>
              <button type="button" role="radio" data-display="fiber" aria-checked="${level === "advanced"}">Fiber Detail</button>
            </div>
            <a class="more" href="#/anatomy">Full 3D Anatomy ${ICON.arrow}</a>
          </div>
          <div class="stage"><div class="fig-slot"></div></div>
          <p class="stage-caption mx-caption"></p>
          <div class="player-host"></div>
        </section>
        <aside class="mx-side">
          <div class="map-figure panel"></div>
          <div class="map-info panel"></div>
        </aside>
      </div>
    </div>`;
  const slot = wrap.querySelector(".fig-slot"), caption = wrap.querySelector(".mx-caption");
  let viewer = null, display = level === "advanced" ? "fiber" : "map";
  const setCaption = () => {
    caption.innerHTML = `<span class="cap-kind is-good">${ICON.target}${esc(muscleName(state.muscle))}</span><span>${display === "fiber" ? "Illustrative fiber-direction overlay." : "Highlighted on the model."} Drag to rotate, tap a muscle to select it.</span>`;
  };
  const show3d = (region, mid) => {
    setCaption();
    if (!viewer) return;
    try {
      const id = drawnMuscle(viewer, mid);
      viewer.setExercise(standingExercise(id));
      viewer.focusMuscle(id);
      applyDisplayMode(viewer, display);
      viewer.setView(REGION_BY_ID[region].side === "back" ? "back" : "front");
    } catch (e) {}
  };
  const map = mountMuscleMap(wrap.querySelector(".mx"), state, (region, mid) => {
    ctx.setHash(`#/muscles/${region}/${encodeURIComponent(mid)}`);
    show3d(region, mid);
    // On a phone the body sits above the map: bring it back into view.
    const box = slot.getBoundingClientRect();
    if (window.matchMedia("(max-width: 980px)").matches && (box.bottom < 120 || box.top > window.innerHeight)) {
      slot.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  const start = () => {
    viewer = mountStageViewer(ctx, slot, "good", standingExercise(state.muscle), Store.athlete() || "male");
    const player = mountPlayer(wrap.querySelector(".player-host"), [viewer], { playback: false, camera: ["front", "back", "right", "threeQuarter"] });
    ctx.onCleanup(() => player.destroy());
    if (viewer) {
      show3d(state.region, state.muscle);
      wrap.addEventListener("muscle-pick", (e) => {
        const id = e.detail && e.detail.id;
        const g = id && groupOfMuscle(id);
        if (!g) return;
        state.region = g; state.muscle = REGION_BY_ID[g].muscles.includes(id) ? id : parentMuscle(id);
        map.draw();
        setCaption();
        ctx.setHash(`#/muscles/${state.region}/${encodeURIComponent(state.muscle)}`);
        viewer.focusMuscle(id);
      });
    } else {
      wrap.querySelector(".seg-display").hidden = true;
      setCaption();
    }
  };
  lazyViewer(ctx, slot, start);
  setCaption();
  wrap.addEventListener("click", (e) => {
    const db = e.target.closest("[data-display]");
    if (!db) return;
    display = db.dataset.display;
    wrap.querySelectorAll("[data-display]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.display === display)));
    applyDisplayMode(viewer, display);
    setCaption();
  });
  return wrap;
}

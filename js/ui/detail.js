// Exercise page: the 3D model is the centerpiece (with its own toolbar above and the playback
// bar below, so nothing sits on top of the body), the info panel beside it, and the form
// guidance (correct technique and an example of a common mistake) underneath.

const DISPLAY_MODES = [["surface", "Surface"], ["map", "Muscle Map"], ["fiber", "Fiber Detail"]];

// The steps of the exercise: its own numbered instructions, else its movement phases.
function instructionsOf(ex) {
  if (Array.isArray(ex.instructions) && ex.instructions.length) return ex.instructions.map((s) => String(s).replace(/^\s*\d+[.)]\s*/, ""));
  return (ex.phases || []).map((t) => { const m = String(t).match(/^([^:]{2,22}):\s*(.*)$/); return m ? cap(m[2]) : t; });
}

function muscleRows(ex) {
  const level = Store.level();
  const row = (m, role, p, cls) => `<li><button type="button" class="m-row ${cls}" data-focus="${esc(m)}" aria-pressed="false">
      <span class="m-name">${esc(level === "advanced" ? anatName(m) : muscleName(m))}<em>${role}</em></span>
      <span class="m-pct">${p}%</span>
      <i class="bar"><i class="bar-fill" style="--w:${p}%"></i></i>
    </button></li>`;
  const stab = level === "beginner" ? [] : stabilizersOf(ex);
  return `
    <ul class="m-rows">
      ${ex.primary.map((m) => row(m, "Primary", involvement(ex, m, 88), "is-main")).join("")}
      ${ex.secondary.map((m) => row(m, "Secondary", involvement(ex, m, 50), "is-help")).join("")}
      ${stab.map((m) => row(m, "Stabilizer", involvement(ex, m, 30), "is-stab")).join("")}
    </ul>`;
}

// Mount a 3D viewer (or the 2D figure when 3D is unavailable) with a small loading state.
function mountStageViewer(ctx, slot, mode, ex, athlete) {
  slot.querySelectorAll(".figure, .fig-fallback, .v3-loading, .v3-failed").forEach((n) => n.remove());
  let v = null;
  if (window.THREE && typeof createViewer3D === "function") {
    slot.classList.add("fig-3d");
    v = ctx.makeViewer(slot, mode, { athlete });
    if (v) { try { v.setExercise(ex); } catch (e) { console.error(e); ctx.dropViewer(v); v = null; } }
  }
  if (!v) {
    slot.classList.remove("fig-3d");
    slot.appendChild(figureNode(ex, mode, { animate: true }));
    slot.appendChild(mk("v3-failed", `${ICON.info}3D view unavailable on this device, showing the 2D figure.`));
    return null;
  }
  const load = mk("v3-loading", `<span class="spin" aria-hidden="true"></span><span>Loading 3D model…</span>`);
  load.setAttribute("role", "status");
  slot.appendChild(load);
  const off = v.onFrame((f) => { if (f.ready) { load.classList.add("is-done"); setTimeout(() => load.remove(), 400); off(); } });
  ctx.onCleanup(off);
  return v;
}

function applyDisplayMode(v, mode) {
  if (!v) return;
  if (typeof v.setDisplayMode === "function") { try { v.setDisplayMode(mode); } catch (e) {} return; }
  if (typeof v.setFibers === "function") v.setFibers(mode === "fiber");
}

// ctx: { makeViewer, dropViewer, onCleanup, setHash }
function renderDetail(ex, ctx) {
  const level = Store.level();
  const f = formOf(ex);
  const st = { athlete: Store.athlete() || ex.athlete || "male", mode: "good", display: level === "advanced" ? "fiber" : "map", focus: null };
  const wrap = mk("detail");
  const cat = catsOf(ex)[0];
  const pat = patternOf(ex);
  const steps = instructionsOf(ex);
  const alts = alternativesOf(ex);
  const stab = stabilizersOf(ex);
  const secondary = namesOf(ex, "secondary");
  wrap.innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/library">${ICON.back}Exercise Library</a>${cat ? `<span>/</span><a href="#/library?cat=${cat}">${esc(CAT_NAME[cat])}</a>` : ""}</nav>
    <div class="dx">
      <section class="dx-stage" aria-label="3D model">
        <div class="stage-top">
          <div class="seg seg-tabs" role="tablist" aria-label="Demonstration">
            <button type="button" role="tab" data-tab="good" aria-selected="true">${ICON.check}Correct technique</button>
            ${f ? `<button type="button" role="tab" data-tab="bad" aria-selected="false">${ICON.warn}Common mistake</button>` : ""}
          </div>
          <div class="stage-opts">
            <div class="seg seg-athlete" role="radiogroup" aria-label="Model">
              <span class="seg-label">Model</span>
              <button type="button" role="radio" data-athlete="male" aria-checked="${st.athlete === "male"}">Male</button>
              <button type="button" role="radio" data-athlete="female" aria-checked="${st.athlete === "female"}">Female</button>
            </div>
            <div class="seg seg-display" role="radiogroup" aria-label="Display mode">
              ${DISPLAY_MODES.map(([id, name]) => `<button type="button" role="radio" data-display="${id}" aria-checked="${st.display === id}">${name}</button>`).join("")}
            </div>
          </div>
        </div>
        <figure class="stage">
          <div class="fig-slot"></div>
        </figure>
        <div class="stage-caption" aria-live="polite"></div>
        <div class="player-host"></div>
      </section>

      <section class="dx-info">
        <header class="dx-head">
          <p class="eyebrow">${esc(catsOf(ex).map((c) => CAT_NAME[c]).join(" · "))}</p>
          <div class="dx-title"><h1>${esc(ex.name)}</h1>${favButton(ex.name, "fav-lg")}</div>
          <p class="dx-dose">
            ${ex.sets ? `<span>${ex.sets} × ${esc(ex.reps)}</span>` : ""}${ex.rest ? `<span>Rest ${formatRest(ex.rest)}</span>` : ""}
            <span>${esc(PATTERN_NAME[pat])}</span>${ex.movementType ? `<span>${esc(cap(ex.movementType))}</span>` : ""}
          </p>
          ${ex.good && ex.good.cue ? `<p class="dx-lede">${esc(ex.good.cue)}</p>` : ""}
        </header>
        <dl class="specs">
          <div class="spec spec-wide"><dt>Primary muscles</dt><dd>${namesOf(ex, "primary").map((m) => `<span class="mchip is-prim">${esc(m)}</span>`).join("")}</dd></div>
          <div class="spec spec-wide"><dt>Secondary muscles</dt><dd>${secondary.length ? secondary.map((m) => `<span class="mchip">${esc(m)}</span>`).join("") : "<span class='muted'>None</span>"}</dd></div>
          ${level !== "beginner" ? `<div class="spec spec-wide"><dt>Stabilizers</dt><dd>${stab.length ? stab.map((m) => `<span class="mchip is-stab">${esc(level === "advanced" ? anatName(m) : muscleName(m))}</span>`).join("") : "<span class='muted'>Not listed for this exercise</span>"}</dd></div>` : ""}
          <div class="spec"><dt>Equipment</dt><dd>${esc(ex.setup || ex.equipment || "—")}</dd></div>
          <div class="spec"><dt>Difficulty</dt><dd>${difficultyMeter(ex.difficulty)}${esc(DIFF_NAME[ex.difficulty] || "—")}</dd></div>
          <div class="spec"><dt>Pattern</dt><dd>${esc(PATTERN_NAME[pat])}</dd></div>
        </dl>

        ${steps.length ? `<section class="panel"><header class="panel-head"><h2>${ICON.layers}Instructions</h2></header><ol class="steps">${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></section>` : ""}

        <section class="panel muscle-panel">
          <header class="panel-head"><h2>${ICON.activation}Muscles</h2><span class="panel-sub">Estimated involvement</span></header>
          <div class="muscle-top">${bodyMap({ primary: ex.primary, secondary: ex.secondary })}${muscleRows(ex)}</div>
          <p class="card-hint">Select a muscle to isolate it on the model. Percentages are estimates for comparison, not measurements.</p>
        </section>

        <div class="two-col">
          ${(ex.cues || []).length ? `<section class="panel"><header class="panel-head"><h2>${ICON.check}Corrective cues</h2></header><ul class="cues-list">${ex.cues.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>` : ""}
          ${(ex.mistakes || []).length ? `<section class="panel"><header class="panel-head"><h2>${ICON.warn}Common mistakes</h2></header><ul class="mistakes-list">${ex.mistakes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>` : ""}
        </div>

        ${alts.length ? `<section class="panel"><header class="panel-head"><h2>${ICON.compare}Alternatives</h2><span class="panel-sub">${ex.alternatives && ex.alternatives.length ? "" : "Same main muscles"}</span></header><div class="alt-list"></div></section>` : ""}

        <div class="dx-links">
          <a class="btn btn-ghost" href="#/analysis/${ex.slug}">${ICON.target}Exercise Analysis</a>
          <a class="btn btn-ghost" href="#/compare?a=${ex.slug}${alts[0] ? "&b=" + alts[0].slug : ""}">${ICON.compare}Compare</a>
        </div>
      </section>
    </div>
    <section class="block dx-form">
      <header class="block-head"><h2>Form guidance</h2><a class="more" href="#/analysis/${ex.slug}">Compare correct and mistake side by side ${ICON.arrow}</a></header>
      ${formFeedback(ex, { compact: false, paths: false })}
    </section>`;

  const altBox = wrap.querySelector(".alt-list");
  if (altBox) alts.forEach((a) => altBox.appendChild(exRow(a, `<span class="ex-mini-tag">${esc(EQUIP_NAME[a.equip] || a.equipment || "")}</span>`)));

  const slot = wrap.querySelector(".fig-slot"), caption = wrap.querySelector(".stage-caption");
  const setCaption = () => {
    const beta = ex.demo === "beta" ? `<span class="beta-note">${ICON.info}Preview animation: the demonstration is still approximate.</span>` : "";
    if (st.mode === "bad" && f) {
      caption.innerHTML = `<span class="cap-kind is-bad">${ICON.warn}Common mistake</span><span>${esc(f.error.title)}. Instructional example, with the recommended form as a faint outline.</span>
        <span class="cap-legend"><span><i class="ln ln-bad"></i>Common mistake path</span><span><i class="ln ln-good"></i>Recommended path</span></span>${beta}`;
    } else {
      caption.innerHTML = `<span class="cap-kind is-good">${ICON.check}Correct technique</span><span>Reference movement.${st.display === "fiber" ? " Illustrative fiber-direction overlay." : ""}</span>${beta}`;
    }
  };

  let viewer = mountStageViewer(ctx, slot, "good", ex, st.athlete);
  const player = mountPlayer(wrap.querySelector(".player-host"), [viewer], { keys: wrap.querySelector(".dx-stage") });
  ctx.onCleanup(() => player.destroy());
  const surfaceBtn = wrap.querySelector('[data-display="surface"]');
  const prepare = (v) => {
    if (!v) { wrap.querySelectorAll(".seg-display, .seg-athlete").forEach((n) => n.hidden = true); return; }
    if (typeof v.setDisplayMode !== "function" && surfaceBtn) {
      surfaceBtn.hidden = true;
      if (st.display === "surface") st.display = "map";
    }
    applyDisplayMode(v, st.display);
    if (st.focus) v.focusMuscle(st.focus);
  };
  prepare(viewer);
  if (viewer && level === "beginner") viewer.setSpeed(0.5);
  player.setViewers([viewer]);
  setCaption();

  // Correct technique <-> common mistake: a new viewer in the other mode that keeps the time,
  // playback state, speed, camera and athlete.
  const setTab = (mode) => {
    if (mode === st.mode) return;
    const keep = player.state();
    st.mode = mode;
    wrap.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === mode)));
    if (viewer) ctx.dropViewer(viewer);
    viewer = mountStageViewer(ctx, slot, mode, ex, st.athlete);
    prepare(viewer);
    restoreViewer(viewer, keep);
    player.setViewers([viewer]);
    setCaption();
  };

  const focus = (id) => {
    st.focus = id;
    if (viewer) viewer.focusMuscle(id);
    wrap.querySelectorAll("[data-focus]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.focus === id)));
  };
  wrap.addEventListener("muscle-pick", (e) => focus(e.detail && e.detail.id));
  wrap.addEventListener("click", (e) => {
    const tb = e.target.closest("button[data-tab]");
    if (tb) { setTab(tb.dataset.tab); return; }
    const ab = e.target.closest("[data-athlete]");
    if (ab) {
      st.athlete = ab.dataset.athlete;
      Store.setAthlete(st.athlete);
      wrap.querySelectorAll("[data-athlete]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.athlete === st.athlete)));
      if (viewer) viewer.setAthlete(st.athlete);
      return;
    }
    const db = e.target.closest("[data-display]");
    if (db) {
      st.display = db.dataset.display;
      wrap.querySelectorAll("[data-display]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.display === st.display)));
      applyDisplayMode(viewer, st.display);
      setCaption();
      return;
    }
    const fb = e.target.closest("[data-focus]");
    if (fb) focus(fb.getAttribute("aria-pressed") === "true" ? null : fb.dataset.focus);
  });
  // Arrow keys move between the options of a segmented control.
  wrap.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const b = e.target.closest(".seg button");
    if (!b) return;
    const items = [...b.parentElement.querySelectorAll("button:not([hidden])")];
    const n = items[(items.indexOf(b) + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
    if (n) { e.preventDefault(); n.focus(); n.click(); }
  });
  return wrap;
}

// Exercise Studio (the exercise page): the 3D model is the centerpiece (with its own toolbar above and the playback
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
// An exercise whose demonstration is hidden (ex.demo === "hidden") or whose 3D data fails shows a
// clear message (and the 2D figure when there is one) instead of a broken scene.
function mountStageViewer(ctx, slot, mode, ex, athlete) {
  slot.querySelectorAll(".figure, .fig-fallback, .v3-loading, .v3-failed, .v3-unavailable").forEach((n) => n.remove());
  if (ex.demo === "hidden") {
    slot.classList.remove("fig-3d");
    const n = mk("v3-unavailable", `${ICON.info}<b>Demonstration not available yet</b><p>The animation for ${esc(ex.name.toLowerCase())} is still being checked, so it is not shown. The instructions, cues and muscles on this page still apply.</p>`);
    n.setAttribute("role", "status");
    slot.appendChild(n);
    return null;
  }
  let v = null, why = "3D view unavailable on this device";
  if (window.THREE && typeof createViewer3D === "function") {
    slot.classList.add("fig-3d");
    v = ctx.makeViewer(slot, mode, { athlete });
    if (v) { try { v.setExercise(ex); } catch (e) { console.error(e); ctx.dropViewer(v); v = null; why = "The 3D demonstration could not be loaded"; } }
  }
  if (!v) {
    slot.classList.remove("fig-3d");
    slot.removeAttribute("tabindex"); slot.removeAttribute("role"); slot.removeAttribute("aria-label"); slot.removeAttribute("aria-roledescription");
    let fig = null;
    try { if (ex.figure) fig = figureNode(ex, mode, { animate: true }); } catch (e) { fig = null; }
    if (fig) {
      slot.appendChild(fig);
      slot.appendChild(mk("v3-failed", `${ICON.info}${why}, showing the 2D figure.`));
    } else {
      const n = mk("v3-unavailable", `${ICON.info}<b>Demonstration not available</b><p>${why}. The instructions and cues on this page still apply.</p>`);
      n.setAttribute("role", "status");
      slot.appendChild(n);
    }
    return null;
  }
  const load = mk("v3-loading", `<span class="spin" aria-hidden="true"></span><span>Loading 3D model…</span>`);
  load.setAttribute("role", "status");
  slot.appendChild(load);
  // Slow devices: say it is still loading; if the model never arrives, say so and offer a retry.
  let slowT = setTimeout(() => { const s = load.querySelector("span:last-child"); if (s) s.textContent = "Still loading the 3D model… this can take a while on slower devices."; }, 15000);
  let failT = setTimeout(() => stageError(ctx, slot, "The 3D model did not finish loading."), 60000);
  const off = v.onFrame((f) => { if (f.ready) { clearTimeout(slowT); clearTimeout(failT); load.classList.add("is-done"); setTimeout(() => load.remove(), 400); off(); fitStage(slot, v); } });
  // The graphics context can be lost (GPU reset, too many 3D views in other tabs).
  const canvas = slot.querySelector("canvas");
  const lost = (e) => { if (canvas && canvas.isConnected) { e.preventDefault(); stageError(ctx, slot, "The 3D view stopped because the graphics context was lost."); } };
  if (canvas) canvas.addEventListener("webglcontextlost", lost);
  ctx.onCleanup(() => { off(); clearTimeout(slowT); clearTimeout(failT); if (canvas) canvas.removeEventListener("webglcontextlost", lost); });
  return v;
}

// An error over the 3D stage with a retry (re-renders the page, which builds a fresh viewer).
function stageError(ctx, slot, msg) {
  if (!slot.isConnected || slot.querySelector(".v3-error")) return;
  slot.querySelectorAll(".v3-loading").forEach((n) => n.remove());
  const n = mk("v3-unavailable v3-error", `${ICON.warn}<b>3D demonstration unavailable</b><p>${esc(msg)} The instructions, cues and muscles on this page still apply.</p><button type="button" class="btn btn-ghost btn-sm">${ICON.restart}Try again</button>`);
  n.setAttribute("role", "alert");
  n.querySelector("button").addEventListener("click", () => ctx.rerender());
  slot.appendChild(n);
}

// Legend for the muscle highlighting on the 3D model. Colors come from the viewer's palette (VIEW3D):
// primary movers in the full activation color, secondary movers in the softer mix the shader
// draws (about 42%), and in the mistake example the muscles that take over in amber. A viewer that
// offers legend() ([{ label, color, muscles?, soft? }]) is used instead.
function stageLegend(ex, v, mode, f, focus) {
  const P = typeof VIEW3D !== "undefined" ? VIEW3D : {};
  const base = P.skin || "#53575e", act = (mode === "bad" ? P.activeBad : P.active) || "#3cc9ad";
  let items = null;
  if (v && typeof v.legend === "function") {
    try { const L = v.legend(); if (Array.isArray(L) && L.length) items = L.map((x) => ({ label: x.label || x.name || "", color: x.color || act, soft: !!x.soft, names: (x.muscles || []).map((m) => muscleName(m)) })); } catch (e) { items = null; }
  }
  if (!items) {
    const names = (ids) => (ids || []).map((m) => muscleName(m));
    items = [{ label: "Primary", color: act, names: names(ex.primary) }];
    if ((ex.secondary || []).length) items.push({ label: "Secondary", color: `color-mix(in srgb, ${act} 42%, ${base})`, names: names(ex.secondary) });
    const comp = mode === "bad" && f && f.error && f.error.compensate;
    if (comp && comp.length) items.push({ label: "Taking over in this mistake", color: P.compensate || "#e0913f", names: names(comp) });
  }
  const sw = (c, soft) => `<i class="lg-sw${soft ? " is-soft" : ""}" style="background:${esc(c)}"></i>`;
  return items.map((i) => `<span class="lg-item">${sw(i.color, i.soft)}<b>${esc(i.label)}</b>${i.names.length ? `<span>${esc(i.names.join(", "))}</span>` : ""}</span>`).join("")
    + (focus ? `<span class="lg-focus">Showing ${esc(muscleName(focus))} only</span>` : "")
    + `<span class="lg-note">Estimated involvement, not measured</span>`;
}

// On a phone, a wide scene (a bench, a rower) in a tall stage leaves empty space above and below
// the athlete: size exercise stages to what the camera frames.
function fitStage(slot, v) {
  if (!slot.closest(".dx-stage, .an-stage") || !window.matchMedia("(max-width: 600px)").matches) return;
  setTimeout(() => {
    const a = v.framedAspect, w = slot.clientWidth;
    if (!a || !w || !slot.isConnected) return;
    const h = Math.round(Math.min(Math.max(w / a * 1.12, 300), window.innerHeight * 0.62, 520));
    slot.style.height = h + "px"; slot.style.minHeight = "0";
  }, 60);
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
  const cat = libCatsOf(ex)[0];
  const pat = patternOf(ex);
  const steps = instructionsOf(ex);
  const alts = alternativesOf(ex);
  const stab = stabilizersOf(ex);
  const secondary = namesOf(ex, "secondary");
  const guide = guidanceOf(ex), mistakes = mistakeGuides(ex);
  const equipTips = (typeof V7_EQUIP_TIPS !== "undefined" && V7_EQUIP_TIPS[ex.equip]) || [];
  wrap.innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/library">${ICON.back}Exercise Library</a>${cat ? `<span>/</span><a href="#/library?cat=${cat}">${esc(LIB_CAT_NAME[cat])}</a>` : ""}<span>/</span><span class="crumb-here">Exercise Studio</span></nav>
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
        <div class="stage-legend" role="group" aria-label="Muscle highlight legend"></div>
        <div class="stage-caption" aria-live="polite"></div>
        <div class="player-host"></div>
      </section>

      <section class="dx-info">
        <header class="dx-head">
          <p class="eyebrow">Exercise Studio · ${esc(libCatsOf(ex).map((c) => LIB_CAT_NAME[c]).join(" · "))}</p>
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

        ${(ex.cues || []).length ? `<section class="panel"><header class="panel-head"><h2>${ICON.check}Key cues</h2></header><ul class="cue-checks">${ex.cues.map((c) => `<li>${ICON.check}<span>${esc(c)}</span></li>`).join("")}</ul></section>` : ""}
        ${mistakes.length ? `<section class="panel mistakes-panel"><header class="panel-head"><h2>${ICON.warn}Common mistakes</h2></header>
          <ol class="mk-list">${mistakes.map((m) => `<li class="mk"><p class="mk-title">${esc(m.title)}</p>${m.why ? `<p class="mk-why"><b>Why it matters</b>${esc(m.why)}</p>` : ""}${m.fix ? `<p class="mk-fix"><b>${ICON.check}How to fix it</b>${esc(m.fix)}</p>` : ""}</li>`).join("")}</ol></section>` : ""}

        <div class="two-col">
          <section class="panel safety-panel"><header class="panel-head"><h2>${ICON.shield}Safety</h2></header>
            ${guide && guide.s && guide.s.length ? `<ul class="safe-list">${guide.s.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
            <p class="safe-general">${esc(typeof V7_SAFETY_GENERAL !== "undefined" ? V7_SAFETY_GENERAL : "General guidance, not medical advice. Stop if you feel sharp or sudden pain.")}</p>
          </section>
          <section class="panel equip-panel"><header class="panel-head"><h2>${ICON.dumbbell}Equipment</h2></header>
            <p class="equip-name">${esc(ex.setup || ex.equipment || "—")}</p>
            ${equipTips.length ? `<ul class="safe-list">${equipTips.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
          </section>
        </div>

        ${alts.length ? `<section class="panel"><header class="panel-head"><h2>${ICON.compare}Alternatives</h2><span class="panel-sub">${ex.alternatives && ex.alternatives.length ? "" : "Same main muscles"}</span></header><div class="alt-list"></div></section>` : ""}

        <div class="dx-links">
          <a class="btn btn-ghost" href="#/form/${ex.slug}">${ICON.target}Form &amp; Technique</a>
          <a class="btn btn-ghost" href="#/compare?a=${ex.slug}${alts[0] ? "&b=" + alts[0].slug : ""}">${ICON.compare}Compare</a>
        </div>
      </section>
    </div>
    <section class="block dx-form">
      <header class="block-head"><h2>Correct vs common mistake</h2><a class="more" href="#/form/${ex.slug}">Both played side by side ${ICON.arrow}</a></header>
      ${f ? `<div class="cmp-tiles" role="group" aria-label="Show on the 3D model">
        <button type="button" class="cmp-tile is-good" data-show="good" aria-pressed="true"><span class="cmp-fig"></span><span class="cmp-lab">${ICON.check}Correct technique</span></button>
        <button type="button" class="cmp-tile is-bad" data-show="bad" aria-pressed="false"><span class="cmp-fig"></span><span class="cmp-lab">${ICON.cross}Common mistake<small>Instructional example of a common mistake: ${esc(f.error.title.toLowerCase())}</small></span></button>
      </div>` : ""}
      ${formFeedback(ex, { compact: false, paths: false, demo: "Show this mistake on the model" })}
    </section>`;

  const altBox = wrap.querySelector(".alt-list");
  if (altBox) alts.forEach((a) => altBox.appendChild(exRow(a, `<span class="ex-mini-tag">${esc(EQUIP_NAME[a.equip] || a.equipment || "")}</span>`)));

  wrap.querySelectorAll(".cmp-tile").forEach((b) => { const n = b.querySelector(".cmp-fig"); if (n) n.appendChild(figureNode(ex, b.dataset.show)); });

  const slot = wrap.querySelector(".fig-slot"), caption = wrap.querySelector(".stage-caption"), legendEl = wrap.querySelector(".stage-legend");
  // Muscle highlight legend for this exercise, in the colors the 3D model uses for the current
  // demonstration (viewer.legend() when the viewer provides one).
  const setLegend = () => {
    if (!legendEl) return;
    legendEl.hidden = !viewer || st.display === "surface";
    if (legendEl.hidden) return;
    legendEl.innerHTML = stageLegend(ex, viewer, st.mode, f, st.focus);
  };
  const setCaption = () => {
    const beta = ex.demo === "beta" ? `<span class="beta-note">${ICON.info}Preview animation: the demonstration is still approximate.${ex.demoNote ? " " + esc(ex.demoNote) : ""}</span>` : "";
    if (st.mode === "bad" && f) {
      caption.innerHTML = `<span class="cap-kind is-bad">${ICON.warn}Common mistake</span><span>${esc(f.error.title)}. Instructional example of a common mistake, with the recommended form as a faint outline.</span>
        <span class="cap-legend"><span><i class="ln ln-bad"></i>Common mistake path</span><span><i class="ln ln-good"></i>Recommended path</span></span>${beta}`;
    } else {
      caption.innerHTML = `<span class="cap-kind is-good">${ICON.check}Correct technique</span><span>Reference movement.${st.display === "fiber" ? " Illustrative fiber-direction overlay." : ""}</span>${beta}`;
    }
    setLegend();
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
    wrap.querySelectorAll("[data-show]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.show === mode)));
    if (viewer) ctx.dropViewer(viewer);
    viewer = mountStageViewer(ctx, slot, mode, ex, st.athlete);
    prepare(viewer);
    restoreViewer(viewer, keep);
    player.setViewers([viewer], keep && keep.rep);
    if (mode === "bad") fillFeedbackMetric(wrap, viewer, ctx.onCleanup);
    setCaption();
  };

  const focus = (id) => {
    st.focus = id;
    setLegend();
    if (viewer) viewer.focusMuscle(id);
    wrap.querySelectorAll("[data-focus]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.focus === id)));
  };
  wrap.addEventListener("muscle-pick", (e) => focus(e.detail && e.detail.id));
  wrap.addEventListener("click", (e) => {
    const tb = e.target.closest("button[data-tab]");
    if (tb) { setTab(tb.dataset.tab); return; }
    const sh = e.target.closest("[data-show]");
    if (sh) {
      setTab(sh.dataset.show);
      wrap.querySelector(".dx-stage").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (e.target.closest("[data-demo]")) {
      setTab("bad");
      wrap.querySelector(".dx-stage").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
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

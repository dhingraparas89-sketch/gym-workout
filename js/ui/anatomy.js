// Interactive 3D Anatomy (#/anatomy/<muscle id>): a large standing model without equipment.
// Male / female, front / back / side / three-quarter, rotate / zoom / pan, Surface / Muscle Map /
// Fiber Detail. Select a muscle on the body or in the grouped list: it lights as primary and the
// muscles that usually assist it light as secondary; the side panel gives its function and the
// exercises that train it. Uses the same viewer component (mountStageViewer) as every other page.

function renderAnatomy(r, ctx) {
  const level = Store.level();
  const known = (id) => id && groupOfMuscle(id);
  const st = {
    athlete: Store.athlete() || "male",
    display: level === "advanced" ? "fiber" : "map",
    muscle: known(r.params[0]) ? r.params[0] : null,
    group: r.params[0] && REGION_BY_ID[r.params[0]] ? r.params[0] : null,
    clothing: "on"
  };
  if (st.group) st.muscle = null;
  const page = mk("anatomy-page");
  page.innerHTML = `
    <header class="page-head">
      <h1>Interactive 3D Anatomy</h1>
      <p class="lede">Rotate, zoom and pan the body. Select a muscle on the model or in the list to see what it does and which exercises train it.</p>
    </header>
    <div class="ax">
      <section class="ax-stage" aria-label="3D anatomy model">
        <div class="stage-top">
          <div class="seg seg-athlete" role="radiogroup" aria-label="Model">
            <span class="seg-label">Model</span>
            <button type="button" role="radio" data-athlete="male" aria-checked="${st.athlete === "male"}">Male</button>
            <button type="button" role="radio" data-athlete="female" aria-checked="${st.athlete === "female"}">Female</button>
          </div>
          <div class="seg seg-display" role="radiogroup" aria-label="Display mode">
            ${DISPLAY_MODES.map(([id, name]) => `<button type="button" role="radio" data-display="${id}" aria-checked="${st.display === id}">${name}</button>`).join("")}
          </div>
          <div class="seg seg-cloth" role="radiogroup" aria-label="Clothing" hidden>
            <span class="seg-label">Clothing</span>
            <button type="button" role="radio" data-cloth="on" aria-checked="true">On</button>
            <button type="button" role="radio" data-cloth="off" aria-checked="false">Off</button>
          </div>
        </div>
        <div class="stage"><div class="fig-slot"></div></div>
        <p class="stage-caption ax-caption" aria-live="polite"></p>
        <div class="player-host"></div>
      </section>
      <aside class="ax-side">
        <div class="panel ax-info"></div>
        <div class="panel ax-list">
          <header class="panel-head"><h2>${ICON.layers}Muscles</h2><button type="button" class="ax-clear" hidden>Clear selection</button></header>
          <div class="ax-groups">${MUSCLE_GROUPS.map((g) => `
            <div class="ax-group">
              <button type="button" class="ax-gname" data-group="${g.id}" aria-pressed="false">${esc(g.name)}<span>${g.side === "back" ? "Back" : "Front"}</span></button>
              <div class="ax-ms">${g.muscles.map((m) => `<button type="button" class="chip${parentMuscle(m) !== m ? " is-part" : ""}" data-m="${esc(m)}" aria-pressed="false">${esc(muscleName(m))}</button>`).join("")}</div>
            </div>`).join("")}</div>
        </div>
      </aside>
    </div>`;

  const slot = page.querySelector(".fig-slot"), caption = page.querySelector(".ax-caption"), info = page.querySelector(".ax-info");
  let viewer = null;
  const anatEx = standingExercise([]);

  const selection = () => {
    if (st.muscle) return { primary: [st.muscle], secondary: synergistsOf(st.muscle, 3) };
    if (st.group) {
      const base = [...new Set(REGION_BY_ID[st.group].muscles.map(parentMuscle))];
      const sec = [...new Set(base.flatMap((m) => synergistsOf(m, 2)))].filter((m) => !base.includes(m)).slice(0, 4);
      return { primary: base, secondary: sec };
    }
    return { primary: [], secondary: [] };
  };
  const drawInfo = () => {
    const sel = selection();
    if (!sel.primary.length) {
      info.innerHTML = `<p class="eyebrow">Nothing selected</p><h2 class="ax-title">Select a muscle</h2>
        <p class="ax-text">Tap a muscle on the body, or pick one from the list. It lights as the primary muscle; the muscles that usually assist it light as secondary.</p>
        <p class="ax-text muted">${MUSCLE_GROUPS.reduce((n, g) => n + g.muscles.length, 0)} muscles in ${MUSCLE_GROUPS.length} groups.</p>`;
      return;
    }
    const id = st.muscle || sel.primary[0];
    const a = anatomyFacts(id), main = exercisesFor(sel.primary, "primary");
    const g = REGION_BY_ID[st.group || groupOfMuscle(id)];
    const title = st.muscle ? a.name : g.name;
    info.innerHTML = `
      <p class="eyebrow">${esc(g ? g.name : "")}${st.muscle ? "" : " · whole group"}</p>
      <h2 class="ax-title">${esc(title)}</h2>
      ${st.muscle && a.anat && a.anat !== a.name ? `<p class="anat">${esc(a.anat)}</p>` : ""}
      <p class="ax-legend"><span><i class="sw sw-p"></i>Primary: ${esc(sel.primary.map(muscleName).join(", "))}</span>${sel.secondary.length ? `<span><i class="sw sw-s"></i>Assisting: ${esc(sel.secondary.map(muscleName).join(", "))}</span>` : ""}</p>
      <dl class="rp-facts">
        ${a.fn ? `<div><dt>Function</dt><dd>${esc(a.fn)}</dd></div>` : ""}
        ${a.location ? `<div><dt>Location</dt><dd>${esc(a.location)}</dd></div>` : ""}
        ${a.actions.length ? `<div><dt>Joint actions</dt><dd><ul class="rp-actions">${a.actions.slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></dd></div>` : ""}
      </dl>
      <div class="rp-ex">
        <p class="bm-label">Relevant exercises <span>${main.length}</span></p>
        ${main.length ? `<ul class="rp-links">${main.slice(0, 5).map((ex) => `<li><a href="#/exercise/${ex.slug}"><span>${esc(ex.name)}</span><em>${esc(EQUIP_NAME[ex.equip] || "")}</em>${ICON.chevron}</a></li>`).join("")}</ul>` : `<p class="muted">No exercise targets it as a main mover yet.</p>`}
      </div>
      <div class="rp-actions-row">
        <a class="btn btn-sm" href="#/library?muscle=${encodeURIComponent(id)}">Show exercises ${ICON.arrow}</a>
        <a class="btn btn-ghost btn-sm" href="#/muscles/${g ? g.id : ""}/${encodeURIComponent(id)}">Muscle Explorer</a>
      </div>`;
  };
  const drawCaption = () => {
    const sel = selection();
    const what = st.display === "surface" ? "Surface view: muscles are not highlighted. Switch to Muscle Map to see the selection."
      : st.display === "fiber" ? "Illustrative fiber-direction overlay." : sel.primary.length ? "Primary in bright teal, assisting muscles in dark teal." : "Drag to rotate, right-drag or two fingers to pan, scroll or pinch to zoom.";
    caption.innerHTML = `${sel.primary.length ? `<span class="cap-kind is-good">${ICON.target}${esc(st.muscle ? muscleName(st.muscle) : REGION_BY_ID[st.group].name)}</span>` : ""}<span>${what}</span>`;
  };
  const drawList = () => {
    page.querySelectorAll("[data-m]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.m === st.muscle)));
    page.querySelectorAll("[data-group]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.group === st.group && !st.muscle)));
    page.querySelector(".ax-clear").hidden = !(st.muscle || st.group);
  };
  const show3d = (turn) => {
    if (!viewer) return;
    const sel = selection();
    try {
      // Relight the same standing body (no setExercise, so the camera stays where the person put it).
      anatEx.primary = sel.primary.map((m) => drawnMuscle(viewer, m));
      anatEx.secondary = sel.secondary.map((m) => drawnMuscle(viewer, m)).filter((m) => !anatEx.primary.includes(m));
      viewer.focusMuscle(null);
      if (turn) {
        const g = REGION_BY_ID[st.group || groupOfMuscle(sel.primary[0])];
        viewer.setView(g && g.side === "back" ? "back" : "front");
      }
    } catch (e) { console.error(e); }
  };
  const update = (turn) => {
    const h = st.muscle ? "#/anatomy/" + encodeURIComponent(st.muscle) : st.group ? "#/anatomy/" + st.group : "#/anatomy";
    ctx.setHash(h);
    drawInfo(); drawCaption(); drawList(); show3d(turn);
  };

  lazyViewer(ctx, slot, () => {
    viewer = mountStageViewer(ctx, slot, "good", anatEx, st.athlete);
    if (viewer) applyDisplayMode(viewer, st.display);
    const player = mountPlayer(page.querySelector(".player-host"), [viewer], { playback: false, camera: ["front", "back", "right", "threeQuarter"] });
    ctx.onCleanup(() => player.destroy());
    if (!viewer) { page.querySelectorAll(".seg-display, .seg-athlete").forEach((n) => n.hidden = true); return; }
    if (typeof viewer.setDisplayMode !== "function") page.querySelector('[data-display="surface"]').hidden = true;
    // Clothing toggle only when the viewer supports it.
    if (typeof viewer.setClothing === "function") page.querySelector(".seg-cloth").hidden = false;
    show3d(true);
    viewer.setView(st.muscle || st.group ? (REGION_BY_ID[st.group || groupOfMuscle(st.muscle)].side === "back" ? "back" : "front") : "threeQuarter");
  });
  drawInfo(); drawCaption(); drawList();

  // A tap on the body selects that muscle (tapping it again clears it).
  page.addEventListener("muscle-pick", (e) => {
    const id = e.detail && e.detail.id;
    if (id && !groupOfMuscle(id)) return;
    st.muscle = id || null; st.group = null;
    update(false);
    const b = id && page.querySelector(`[data-m="${CSS.escape(id)}"]`);
    if (b && b.scrollIntoView && window.matchMedia("(min-width: 981px)").matches) b.scrollIntoView({ block: "nearest" });
  });
  page.addEventListener("click", (e) => {
    const m = e.target.closest("[data-m]");
    if (m) { st.muscle = m.getAttribute("aria-pressed") === "true" ? null : m.dataset.m; st.group = null; update(true); return; }
    const g = e.target.closest("[data-group]");
    if (g) { st.group = g.dataset.group; st.muscle = null; update(true); return; }
    if (e.target.closest(".ax-clear")) { st.muscle = null; st.group = null; update(false); return; }
    const ab = e.target.closest("[data-athlete]");
    if (ab) {
      st.athlete = ab.dataset.athlete; Store.setAthlete(st.athlete);
      page.querySelectorAll("[data-athlete]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.athlete === st.athlete)));
      if (viewer) viewer.setAthlete(st.athlete);
      return;
    }
    const db = e.target.closest("[data-display]");
    if (db) {
      st.display = db.dataset.display;
      page.querySelectorAll("[data-display]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.display === st.display)));
      applyDisplayMode(viewer, st.display);
      drawCaption();
      return;
    }
    const cb = e.target.closest("[data-cloth]");
    if (cb && viewer && typeof viewer.setClothing === "function") {
      st.clothing = cb.dataset.cloth;
      page.querySelectorAll("[data-cloth]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.cloth === st.clothing)));
      try { viewer.setClothing(st.clothing); } catch (err) {}
    }
  });
  return page;
}

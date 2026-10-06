// Page logic: plan view, muscle library, and the exercise detail window.

const $ = (sel) => document.querySelector(sel);

const BY_NAME = {};
EXERCISES.forEach((ex) => { BY_NAME[ex.name] = ex; });
const GROUP_NAME = Object.fromEntries(GROUPS.map((g) => [g.id, g.name]));

const state = { view: "plan", plan: "ppl", muscle: "chest", style: "plate" };

function remember(key, value) { try { localStorage.setItem("repsheet." + key, value); } catch (e) {} }
function recall(key) { try { return localStorage.getItem("repsheet." + key); } catch (e) { return null; } }

function formatRest(sec) {
  if (sec < 60) return sec + " s";
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? m + ":" + String(s).padStart(2, "0") + " min" : m + " min";
}

// Rough session length: ~40 s per working set plus the rest after it, plus a 10 min warm-up.
function estimateMinutes(list) {
  const sec = list.reduce((t, ex) => t + ex.sets * (40 + ex.rest), 0);
  return Math.round(sec / 60 / 5) * 5 + 10;
}

function musclePills(ex, max = 3) {
  return ex.primary.slice(0, max).map((m) => `<span class="pill">${MUSCLES[m]}</span>`).join("");
}

// ---------- Detail (used in the spotlight and the pop-up window) ----------
// Muscle -> fiber direction -> activation level, for the detail view.
function muscleItem(m, kind, level) {
  const info = MUSCLE_INFO[m];
  return `<li><i class="sw sw-${kind}"></i><span>${MUSCLES[m]} <em>${level}</em>${info ? `<small>${info.fibers}</small>` : ""}</span></li>`;
}
function detailNode(ex, opts = {}) {
  const wrap = document.createElement("div");
  wrap.className = "detail" + (opts.compact ? " is-compact" : "");
  wrap.innerHTML = `
    <header class="detail-head">
      <p class="eyebrow">${GROUP_NAME[ex.group]} · ${ex.equipment}</p>
      <h2 id="${opts.compact ? "" : "detail-title"}">${ex.name}</h2>
      <p class="dose"><span class="prescription">${ex.sets} × ${ex.reps}</span><span class="rest">rest ${formatRest(ex.rest)}</span></p>
    </header>
    <div class="detail-grid">
      <div class="posture posture-good">
        <p class="verdict"><span class="mark">✓</span>Correct form</p>
        <div class="fig-slot"></div>
        <p class="cue">${ex.good.cue}</p>
      </div>
      <div class="posture posture-bad">
        <p class="verdict"><span class="mark">✕</span>Common mistake</p>
        <div class="fig-slot"></div>
        <p class="cue">${ex.bad.cue}</p>
      </div>
      <div class="muscles-panel">
        <p class="verdict">Muscles worked</p>
        ${bodyMap({ primary: ex.primary, secondary: ex.secondary })}
        ${ex.movement ? `<p class="movement"><span>Movement</span>${ex.movement}</p>` : ""}
        <ul class="muscle-list">
          ${ex.primary.map((m) => muscleItem(m, "primary", "strong")).join("")}
          ${ex.secondary.map((m) => muscleItem(m, "secondary", "moderate")).join("")}
        </ul>
      </div>
    </div>`;
  const slots = wrap.querySelectorAll(".fig-slot");
  // 3D character when three.js loaded; the 2D figure otherwise.
  const v3 = window.THREE && [["good", slots[0]], ["bad", slots[1]]].map(([mode, slot]) => {
    slot.classList.add("fig-3d");
    const v = createViewer3D(slot, mode);
    v.setExercise(ex);
    return v;
  });
  if (v3) {
    const key = opts.compact ? "spotlight" : "detail";
    (viewers3d[key] || []).forEach((v) => v.dispose());
    viewers3d[key] = v3;
  } else {
    slots[0].appendChild(createFigure(ex, "good", { animate: true }));
    slots[1].appendChild(createFigure(ex, "bad", { animate: true }));
  }
  return wrap;
}
const viewers3d = {};

let lastFocus = null;
function openDetail(name) {
  const ex = BY_NAME[name];
  if (!ex) return;
  lastFocus = document.activeElement;
  const body = $("#modal-body");
  body.innerHTML = "";
  body.appendChild(detailNode(ex));
  $("#modal").hidden = false;
  document.body.classList.add("modal-open");
  $(".modal-close").focus();
}
function closeDetail() {
  $("#modal").hidden = true;
  (viewers3d.detail || []).forEach((v) => v.dispose());
  viewers3d.detail = [];
  $("#modal-body").innerHTML = "";
  document.body.classList.remove("modal-open");
  if (lastFocus) lastFocus.focus();
}

// ---------- Plan view ----------
function renderPlanPicker() {
  $("#plan-picker").innerHTML = PLANS.map((p) => `
    <button type="button" class="plan-option" data-plan="${p.id}" aria-pressed="${p.id === state.plan}">
      <span class="plan-name">${p.name}</span>
      <span class="plan-meta">${p.perWeek} days / week</span>
      <span class="plan-who">${p.who}</span>
    </button>`).join("");
}

function renderDays() {
  const plan = PLANS.find((p) => p.id === state.plan);
  const days = $("#days");
  days.innerHTML = "";
  plan.days.forEach((day, d) => {
    const list = day.exercises.map((n) => BY_NAME[n]).filter(Boolean);
    const totalSets = list.reduce((t, ex) => t + ex.sets, 0);
    const primary = [...new Set(list.flatMap((ex) => ex.primary))];
    const secondary = [...new Set(list.flatMap((ex) => ex.secondary))].filter((m) => !primary.includes(m));
    const card = document.createElement("article");
    card.className = "day";
    card.innerHTML = `
      <header class="day-head">
        <div>
          <h3>${day.name}</h3>
          <span class="day-meta">${list.length} exercises · ${totalSets} sets · ~${estimateMinutes(list)} min</span>
        </div>
        <div class="day-map">${bodyMap({ primary, secondary })}</div>
      </header>
      <ol class="ex-list"></ol>`;
    const ol = card.querySelector(".ex-list");
    list.forEach((ex, i) => {
      const id = `ex-${plan.id}-${d}-${i}`;
      const li = document.createElement("li");
      li.className = "ex-row";
      li.innerHTML = `
        <input type="checkbox" id="${id}" aria-label="Done: ${ex.name}">
        <button type="button" class="ex-open" data-open="${ex.name}">
          <span class="thumb"></span>
          <span class="ex-text">
            <span class="ex-name">${ex.name}</span>
            <span class="pills">${musclePills(ex, 2)}</span>
          </span>
          <span class="ex-dose">
            <span class="prescription">${ex.sets} × ${ex.reps}</span>
            <span class="rest">rest ${formatRest(ex.rest)}</span>
          </span>
        </button>`;
      li.querySelector(".thumb").appendChild(createFigure(ex, "good"));
      ol.appendChild(li);
    });
    days.appendChild(card);
  });
}

// ---------- Library view ----------
function renderLibrary() {
  $("#muscle-map").innerHTML = bodyMap({ interactive: true, selected: state.muscle, primary: [state.muscle] });
  $("#muscle-chips").innerHTML = Object.entries(MUSCLES).map(([id, name]) =>
    `<button type="button" class="chip" data-muscle="${id}" aria-pressed="${id === state.muscle}">${name}</button>`).join("");

  const main = EXERCISES.filter((ex) => ex.primary.includes(state.muscle));
  const helps = EXERCISES.filter((ex) => ex.secondary.includes(state.muscle));
  $("#library-title").textContent = `${MUSCLES[state.muscle]}: ${main.length} main exercise${main.length === 1 ? "" : "s"}`;
  const list = $("#exercise-list");
  list.innerHTML = "";
  [...main.map((ex) => [ex, true]), ...helps.map((ex) => [ex, false])].forEach(([ex, isMain]) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "ex-card";
    card.dataset.open = ex.name;
    card.innerHTML = `
      <span class="card-fig"></span>
      <span class="card-body">
        <span class="card-tag ${isMain ? "is-main" : ""}">${isMain ? "Main target" : "Also works it"}</span>
        <span class="card-name">${ex.name}</span>
        <span class="card-dose"><span class="prescription">${ex.sets} × ${ex.reps}</span> · ${ex.equipment}</span>
        <span class="card-cue">${ex.good.cue}</span>
      </span>`;
    card.querySelector(".card-fig").appendChild(createFigure(ex, "good", { animate: true }));
    list.appendChild(card);
  });
}

// ---------- Shared ----------
function renderStyleSwitch() {
  $("#style-switch").innerHTML = STYLES.map((s) =>
    `<button type="button" data-style="${s.id}" aria-pressed="${s.id === state.style}">${s.name}</button>`).join("");
}

function renderSpotlight() {
  const spot = $("#spotlight");
  spot.innerHTML = "";
  const node = detailNode(BY_NAME["Back squat"], { compact: true });
  const open = document.createElement("button");
  open.type = "button";
  open.className = "spot-open";
  open.dataset.open = "Back squat";
  open.textContent = "Open the back squat";
  node.querySelector(".detail-head").appendChild(open);
  spot.appendChild(node);
}

function render() {
  document.body.dataset.style = state.style;
  $("#view-plan").hidden = state.view !== "plan";
  $("#view-library").hidden = state.view !== "library";
  document.querySelectorAll(".view-tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.view === state.view));
  renderStyleSwitch();
  if (state.view === "plan") { renderPlanPicker(); renderDays(); } else { renderLibrary(); }
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) { closeDetail(); return; }
  const muscle = e.target.closest("[data-muscle]");
  if (muscle) { state.muscle = muscle.dataset.muscle; renderLibrary(); return; }
  const opener = e.target.closest("[data-open]");
  if (opener) { openDetail(opener.dataset.open); return; }
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.style) { state.style = btn.dataset.style; remember("style", state.style); document.body.dataset.style = state.style; renderStyleSwitch(); return; }
  if (btn.dataset.view) { state.view = btn.dataset.view; }
  else if (btn.dataset.plan) { state.plan = btn.dataset.plan; remember("plan", state.plan); }
  else return;
  render();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#modal").hidden) closeDetail();
  const muscle = e.target.closest && e.target.closest("[data-muscle]");
  if (muscle && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); state.muscle = muscle.dataset.muscle; renderLibrary(); }
});

state.style = STYLES.some((s) => s.id === recall("style")) ? recall("style") : state.style;
state.plan = PLANS.some((p) => p.id === recall("plan")) ? recall("plan") : state.plan;
renderSpotlight();
render();

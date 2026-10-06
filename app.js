// Renders the plan view and the muscle-group view from data.js.

const $ = (sel) => document.querySelector(sel);

// Look up any exercise by name, along with its muscle group.
const LIBRARY = {};
MUSCLE_GROUPS.forEach((g) => g.exercises.forEach((ex) => { LIBRARY[ex.name] = { ...ex, group: g }; }));

const state = { view: "plan", plan: "ppl", muscle: "all", style: "plate" };

function remember(key, value) { try { localStorage.setItem("repsheet." + key, value); } catch (e) {} }
function recall(key) { try { return localStorage.getItem("repsheet." + key); } catch (e) { return null; } }

function formatRest(sec) {
  if (sec < 60) return sec + " s";
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? m + ":" + String(s).padStart(2, "0") + " min" : m + " min";
}

// Rough session length: ~40 s per working set plus the rest after it, plus a 10 min warm-up.
function estimateMinutes(exercises) {
  const sec = exercises.reduce((t, ex) => t + ex.sets * (40 + ex.rest), 0);
  return Math.round(sec / 60 / 5) * 5 + 10;
}

function tag(group) {
  return `<span class="tag"><span class="dot" style="--dot: var(--c-${group.id})"></span>${group.name}</span>`;
}

function renderStyleSwitch() {
  $("#style-switch").innerHTML = STYLES.map((s) =>
    `<button type="button" data-style="${s.id}" aria-pressed="${s.id === state.style}">${s.name}</button>`).join("");
}

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
  $("#days").innerHTML = plan.days.map((day, d) => {
    const list = day.exercises.map((n) => LIBRARY[n]).filter(Boolean);
    const totalSets = list.reduce((t, ex) => t + ex.sets, 0);
    const rows = list.map((ex, i) => {
      const id = `ex-${plan.id}-${d}-${i}`;
      return `<li class="ex-row">
        <input type="checkbox" id="${id}">
        <label for="${id}">
          <span class="ex-name">${ex.name}</span>
          ${tag(ex.group)}
        </label>
        <span class="prescription">${ex.sets} × ${ex.reps}</span>
        <span class="rest">rest ${formatRest(ex.rest)}</span>
      </li>`;
    }).join("");
    return `<article class="day">
      <header class="day-head">
        <h3>${day.name}</h3>
        <span class="day-meta">${list.length} exercises · ${totalSets} sets · ~${estimateMinutes(list)} min</span>
      </header>
      <ol class="ex-list">${rows}</ol>
    </article>`;
  }).join("");
}

function renderMuscleChips() {
  const chips = [{ id: "all", name: "All" }, ...MUSCLE_GROUPS];
  $("#muscle-chips").innerHTML = chips.map((g) =>
    `<button type="button" class="chip" data-muscle="${g.id}" aria-pressed="${g.id === state.muscle}">
      ${g.id === "all" ? "" : `<span class="dot" style="--dot: var(--c-${g.id})"></span>`}${g.name}
    </button>`).join("");
}

function renderExercises() {
  const groups = state.muscle === "all" ? MUSCLE_GROUPS : MUSCLE_GROUPS.filter((g) => g.id === state.muscle);
  $("#exercise-groups").innerHTML = groups.map((g) => `
    <section class="group">
      <h3 class="group-title"><span class="dot" style="--dot: var(--c-${g.id})"></span>${g.name}</h3>
      <div class="ex-grid">
        ${g.exercises.map((ex) => `
          <article class="ex-card">
            <h4>${ex.name}</h4>
            <p class="ex-equip">${ex.equipment}</p>
            <p class="ex-dose"><span class="prescription">${ex.sets} × ${ex.reps}</span><span class="rest">rest ${formatRest(ex.rest)}</span></p>
            <p class="ex-tip">${ex.tip}</p>
          </article>`).join("")}
      </div>
    </section>`).join("");
}

function render() {
  document.body.dataset.style = state.style;
  $("#view-plan").hidden = state.view !== "plan";
  $("#view-muscles").hidden = state.view !== "muscles";
  document.querySelectorAll(".view-tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.view === state.view));
  renderStyleSwitch();
  renderPlanPicker();
  renderDays();
  renderMuscleChips();
  renderExercises();
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.style) { state.style = btn.dataset.style; remember("style", state.style); }
  else if (btn.dataset.view) { state.view = btn.dataset.view; }
  else if (btn.dataset.plan) { state.plan = btn.dataset.plan; remember("plan", state.plan); }
  else if (btn.dataset.muscle) { state.muscle = btn.dataset.muscle; }
  else return;
  render();
});

state.style = STYLES.some((s) => s.id === recall("style")) ? recall("style") : state.style;
state.plan = PLANS.some((p) => p.id === recall("plan")) ? recall("plan") : state.plan;
render();

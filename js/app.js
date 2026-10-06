// Page logic: plan view, muscle library, and the exercise detail window.

const $ = (sel) => document.querySelector(sel);

const BY_NAME = {};
EXERCISES.forEach((ex) => { BY_NAME[ex.name] = ex; });
const GROUP_NAME = Object.fromEntries(GROUPS.map((g) => [g.id, g.name]));

const state = { view: "plan", plan: "ppl", muscle: "chest", style: "lab" };

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
// Line icons, drawn on a 24-unit grid with a 1.7 stroke.
const svgIcon = (d) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  check: svgIcon("M5 12.5l4.2 4.2L19 7"),
  warn: svgIcon("M12 4l9 16H3zM12 10v4.5M12 17.2v.3"),
  motion: svgIcon("M4 17c3-9 7-12 16-12M16 3l4 2-2 4"),
  posture: svgIcon("M12 3v18M8 7c2 1.5 6 1.5 8 0M8 12h8M8 17c2-1.5 6-1.5 8 0"),
  alignment: svgIcon("M6 4l6 8-6 8M18 4v16"),
  range: svgIcon("M4 19a8 8 0 0 1 16 0M12 19l5-6"),
  tempo: svgIcon("M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 13l4-3M10 2h4"),
  activation: svgIcon("M4 12h3l2-5 3 10 2-5h6"),
  ghost: svgIcon("M6 20V10a6 6 0 0 1 12 0v10l-3-2-3 2-3-2zM10 10v.5M14 10v.5")
};
const ERROR_TYPES = {
  posture: "Posture", alignment: "Joint alignment", range: "Range of motion", tempo: "Tempo", activation: "Muscle activation"
};
const SCORE_PARTS = [["posture", "Posture"], ["alignment", "Alignment"], ["range", "Range of motion"], ["tempo", "Tempo"], ["stability", "Stability"], ["activation", "Muscle activation"]];

// Small stable variation per exercise, so optimal scores look measured rather than fixed.
function jitter(name, salt, span) {
  let h = 0;
  for (const ch of name + salt) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % span;
}
function scoreOf(scores) {
  const vals = SCORE_PARTS.map(([k]) => scores[k]);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
function optimalScores(ex) {
  return Object.fromEntries(SCORE_PARTS.map(([k]) => [k, 94 + jitter(ex.name, k, 6)]));
}

function scoreCard(ex, f) {
  const yours = f.scores, best = optimalScores(ex), total = scoreOf(yours), bestTotal = scoreOf(best);
  const C = 2 * Math.PI * 52;
  return `
    <article class="card score-card">
      <p class="card-label">Form score</p>
      <div class="score-main">
        <svg class="score-ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="ring-track" cx="60" cy="60" r="52"/>
          <circle class="ring-best" cx="60" cy="60" r="52" stroke-dasharray="${C}" style="--to:${C * (1 - bestTotal / 100)}"/>
          <circle class="ring-value" cx="60" cy="60" r="52" stroke-dasharray="${C}" style="--to:${C * (1 - total / 100)}" stroke-dashoffset="${C}"/>
        </svg>
        <div class="score-num"><b data-count="${total}">0</b><span>/ 100</span></div>
        <p class="score-note">Your form<br><span>Optimal ${bestTotal}</span></p>
      </div>
      <ul class="score-parts">
        ${SCORE_PARTS.map(([k, label], i) => `
          <li class="${k === f.error.type ? "is-weak" : ""}" style="--i:${i}">
            <span>${label}</span><b>${yours[k]}</b>
            <i class="bar"><i class="bar-best" style="--w:${best[k]}%"></i><i class="bar-fill" style="--w:${yours[k]}%"></i></i>
          </li>`).join("")}
      </ul>
    </article>`;
}

function fixCard(f) {
  const e = f.error;
  return `
    <article class="card fix-card">
      <p class="card-label is-bad">${ICON.warn}Form correction</p>
      <p class="fix-type">${ICON[e.type] || ""}${ERROR_TYPES[e.type] || "Form"}</p>
      <h3>${e.title}</h3>
      <p class="fix-detail">${e.detail}</p>
      <div class="fix-cue"><span>Recommended</span>${e.fix}</div>
      <div class="fix-metric" hidden>
        <div><span>Your form</span><b class="m-your"></b></div>
        <div><span>Optimal</span><b class="m-best"></b></div>
        <p class="m-label"></p>
      </div>
    </article>`;
}

function muscleCard(ex, f) {
  const comp = (f && f.error.compensate) || [];
  const row = (m, role, pct, cls) => {
    const info = MUSCLE_INFO[m];
    return `<li><button type="button" class="m-row ${cls}" data-focus="${m}" aria-pressed="false">
      <span class="m-name">${MUSCLES[m]}<em>${role}</em></span>
      <span class="m-pct">${pct}%</span>
      <i class="bar"><i class="bar-fill" style="--w:${pct}%"></i></i>
      ${info ? `<small>${info.fibers}</small>` : ""}
    </button></li>`;
  };
  const strong = (m) => 88 + jitter(ex.name, m, 9), soft = (m) => 42 + jitter(ex.name, m, 14);
  return `
    <article class="card muscle-card">
      <p class="card-label">Muscle activation</p>
      <div class="muscle-top">
        ${bodyMap({ primary: ex.primary, secondary: ex.secondary })}
        ${ex.movement ? `<p class="movement"><span>${ICON.motion}Movement</span>${ex.movement}</p>` : ""}
      </div>
      <ul class="m-rows">
        ${ex.primary.map((m) => row(m, "Main · strong", strong(m), "is-main")).join("")}
        ${ex.secondary.filter((m) => !comp.includes(m)).map((m) => row(m, "Helper · moderate", soft(m), "is-help")).join("")}
        ${comp.filter((m) => !ex.primary.includes(m)).map((m) => row(m, "Takes over in the mistake", 55 + jitter(ex.name, m, 25), "is-comp")).join("")}
      </ul>
      <p class="card-hint">Tap a muscle here or on the body to see it on its own.</p>
    </article>`;
}

// Count numbers up and grow bars once the panel is on screen.
function animateIn(wrap) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    wrap.classList.add("is-in");
    wrap.querySelectorAll("[data-count]").forEach((n) => {
      const to = +n.dataset.count, start = performance.now(), dur = 1100;
      const step = (now) => {
        const k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
        n.textContent = Math.round(to * e);
        if (k < 1 && n.isConnected) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }));
}

function detailNode(ex, opts = {}) {
  const f = FORM[ex.name];
  const wrap = document.createElement("div");
  wrap.className = "detail" + (opts.compact ? " is-compact" : "");
  const avg = Math.round(ex.primary.reduce((t, m) => t + 88 + jitter(ex.name, m, 9), 0) / ex.primary.length);
  wrap.innerHTML = `
    <header class="detail-head">
      <p class="eyebrow">${GROUP_NAME[ex.group]} · ${ex.equipment}</p>
      <h2 id="${opts.compact ? "" : "detail-title"}">${ex.name}</h2>
      <p class="dose"><span class="prescription">${ex.sets} × ${ex.reps}</span><span class="rest">rest ${formatRest(ex.rest)}</span></p>
    </header>
    <div class="compare">
      <section class="stage stage-good">
        <header class="stage-top">
          <span class="stage-name">Optimal form <small>Reference movement</small></span>
        </header>
        <div class="fig-slot">
          <div class="stage-badge is-good"><b>${ICON.check}Form optimal</b><span>Great movement pattern</span></div>
        </div>
        <footer class="stage-foot">
          <ul class="checks">${(f ? f.checks : []).map((c, i) => `<li style="--i:${i}">${ICON.check}${c}</li>`).join("")}</ul>
          <div class="act-meter"><span>Target muscle activation</span><b>${avg}%</b><i class="bar"><i class="bar-fill" style="--w:${avg}%"></i></i></div>
          <p class="cue">${ex.good.cue}</p>
        </footer>
      </section>
      <section class="stage stage-bad">
        <header class="stage-top">
          <span class="stage-name">Your form <small>Example: the common mistake</small></span>
        </header>
        <div class="fig-slot">
          <div class="stage-badge is-bad"><b>${ICON.warn}Form correction</b><span>${f ? f.error.title : ex.bad.cue}</span></div>
        </div>
        <footer class="stage-foot">
          <div class="guide-legend">
            <span><i class="ln ln-bad"></i>Your form</span><span><i class="ln ln-good"></i>Optimal</span>
            <button type="button" class="ghost-toggle" aria-pressed="true">${ICON.ghost}Optimal overlay</button>
          </div>
          <p class="cue"><b>Fix:</b> ${f ? f.error.fix : ex.bad.cue}</p>
        </footer>
      </section>
    </div>
    ${f && !opts.compact ? `<div class="insights">${scoreCard(ex, f)}${fixCard(f)}${muscleCard(ex, f)}</div>` : ""}`;

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
    // Biggest measured difference, e.g. "Elbow angle: 118° vs 76°".
    const a = v3[1].analysis, metric = wrap.querySelector(".fix-metric");
    if (a && metric) {
      metric.hidden = false;
      metric.querySelector(".m-your").textContent = a.your;
      metric.querySelector(".m-best").textContent = a.optimal;
      metric.querySelector(".m-label").textContent = a.label;
    }
    // Picking a muscle (on either body or in the list) shows it on its own in both views.
    const focus = (id) => {
      v3.forEach((v) => v.focusMuscle(id));
      wrap.querySelectorAll("[data-focus]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.focus === id)));
    };
    wrap.addEventListener("muscle-pick", (e) => focus(e.detail.id));
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("[data-focus]");
      if (b) focus(b.getAttribute("aria-pressed") === "true" ? null : b.dataset.focus);
      const g = e.target.closest(".ghost-toggle");
      if (g) { const on = g.getAttribute("aria-pressed") !== "true"; g.setAttribute("aria-pressed", String(on)); v3[1].setGhost(on); }
    });
  } else {
    slots[0].appendChild(createFigure(ex, "good", { animate: true }));
    slots[1].appendChild(createFigure(ex, "bad", { animate: true }));
    wrap.querySelectorAll(".ghost-toggle").forEach((b) => b.remove());
  }
  animateIn(wrap);
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
  if (btn.dataset.style) { state.style = btn.dataset.style; remember("theme", state.style); document.body.dataset.style = state.style; renderStyleSwitch(); return; }
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

state.style = STYLES.some((s) => s.id === recall("theme")) ? recall("theme") : state.style;
state.plan = PLANS.some((p) => p.id === recall("plan")) ? recall("plan") : state.plan;
renderSpotlight();
render();

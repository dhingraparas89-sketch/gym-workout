// Exercise detail page: the 3D Optimal form / Your form pair on the left, everything about the
// exercise on the right (muscles, setup, form analysis, correction, biomechanics, phases, cues),
// then the score and muscle activation cards.

const SCORE_PARTS = [["posture", "Posture"], ["alignment", "Alignment"], ["range", "Range of motion"], ["tempo", "Tempo"], ["stability", "Stability"], ["activation", "Muscle activation"]];
function scoreOf(scores) {
  const vals = SCORE_PARTS.map(([k]) => scores[k] || 0);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
function optimalScores(ex) { return Object.fromEntries(SCORE_PARTS.map(([k]) => [k, 94 + jitter(ex.name, k, 6)])); }

// Which form check the common mistake breaks: the exercise's own `faultCheck`, else the best
// keyword match against the error's type, joint and title.
const FAULT_WORDS = {
  range: ["depth", "range", "stretch", "full", "lockout", "height", "hang", "peak", "curl", "extension", "lift", "reach"],
  posture: ["spine", "back", "torso", "posture", "line", "hinge", "upright", "ribs", "hip", "chest up", "tall"],
  alignment: ["align", "knee", "elbow", "path", "track", "tuck", "fixed", "pinned", "still", "square", "shoulder"],
  tempo: ["tempo", "slow", "control", "lowering", "pause", "swing", "still"],
  activation: ["activation", "squeeze", "shoulders down", "glute", "brace", "fixed", "still", "pelvic"]
};
function faultIndex(ex, f) {
  const checks = ex.formChecks || [];
  if (!f || !f.error || !checks.length) return -1;
  if (ex.faultCheck && checks.includes(ex.faultCheck)) return checks.indexOf(ex.faultCheck);
  const e = f.error, words = FAULT_WORDS[e.type] || [], title = String(e.title || "").toLowerCase();
  let best = -1, bestScore = 0;
  checks.forEach((c, i) => {
    const t = c.toLowerCase();
    let s = 0;
    if (e.joint && t.includes(String(e.joint).toLowerCase())) s += 3;
    words.forEach((w) => { if (t.includes(w)) s += 2; });
    t.split(/\s+/).forEach((w) => { if (w.length > 3 && title.includes(w)) s += 2; });
    if (s > bestScore) { bestScore = s; best = i; }
  });
  if (best < 0) { const fallback = { tempo: "Tempo", activation: "Stability" }[e.type]; best = checks.indexOf(fallback); }
  return best >= 0 ? best : 0;
}

function scoreCard(ex, f) {
  const yours = f.scores, best = optimalScores(ex), total = scoreOf(yours), bestTotal = scoreOf(best);
  const C = 2 * Math.PI * 52;
  return `
    <article class="card score-card">
      <p class="card-label">${ICON.target}Form score</p>
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
      <h3>${esc(e.title)}</h3>
      <p class="fix-detail">${esc(e.detail)}</p>
      <div class="fix-metric" hidden>
        <div><span>Your form</span><b class="m-your"></b></div>
        <div><span>Optimal</span><b class="m-best"></b></div>
        <p class="m-label"></p>
      </div>
      <div class="fix-cue"><span>Recommended</span>${esc(e.fix)}</div>
    </article>`;
}

function muscleCard(ex, f) {
  const comp = (f && f.error && f.error.compensate) || [];
  const pct = (m, fb) => Math.round((ex.activation && ex.activation[m]) || fb);
  const row = (m, role, p, cls) => {
    const info = MUSCLE_INFO[m];
    return `<li><button type="button" class="m-row ${cls}" data-focus="${m}" aria-pressed="false">
      <span class="m-name">${esc(muscleName(m))}<em>${role}</em></span>
      <span class="m-pct">${p}%</span>
      <i class="bar"><i class="bar-fill" style="--w:${p}%"></i></i>
      ${info ? `<small>${esc(info.name ? info.name + " · " : "")}${esc(info.fibers)}</small>` : ""}
    </button></li>`;
  };
  return `
    <article class="card muscle-card">
      <p class="card-label">${ICON.activation}Muscle activation</p>
      <div class="muscle-top">
        ${bodyMap({ primary: ex.primary, secondary: ex.secondary })}
        ${ex.movement ? `<p class="movement"><span>${ICON.motion}Movement</span>${esc(ex.movement)}</p>` : ""}
      </div>
      <ul class="m-rows">
        ${ex.primary.map((m) => row(m, "Primary", pct(m, 90), "is-main")).join("")}
        ${ex.secondary.filter((m) => !comp.includes(m)).map((m) => row(m, "Secondary", pct(m, 50), "is-help")).join("")}
        ${comp.filter((m) => !ex.primary.includes(m)).map((m) => row(m, "Takes over in the mistake", 55 + jitter(ex.name, m, 25), "is-comp")).join("")}
      </ul>
      <p class="card-hint">Tap a muscle here or on the 3D body to isolate it.</p>
    </article>`;
}

function formAnalysis(ex, f) {
  const bad = faultIndex(ex, f);
  return `
    <section class="panel form-analysis">
      <header class="panel-head"><h3>${ICON.check}Form analysis</h3><span class="panel-sub">Optimal · Yours</span></header>
      <ul class="fa-list">
        ${(ex.formChecks || []).map((c, i) => `
          <li class="${i === bad ? "is-bad" : ""}" style="--i:${i}">
            <span class="fa-name">${esc(c)}${i === bad && f ? `<small>${esc(f.error.title)}</small>` : ""}</span>
            <span class="fa-st is-ok" title="Optimal form">${ICON.check}</span>
            <span class="fa-st ${i === bad ? "is-x" : "is-ok"}" title="Your form">${i === bad ? ICON.cross : ICON.check}</span>
          </li>`).join("")}
      </ul>
    </section>`;
}

function biomechPanel() {
  const row = (k, label) => `<div class="bm-row" data-bm="${k}"><span>${label}</span><b>—</b><i class="bm-arc"><i style="--w:0%"></i></i></div>`;
  return `
    <details class="panel biomech">
      <summary><span>${ICON.activation}Biomechanics</span><span class="bm-src">Live · <em>Optimal form</em></span>${ICON.chevron}</summary>
      <div class="bm-body">
        <p class="bm-label">Joint angles</p>
        <div class="bm-grid">${row("knee", "Knee")}${row("hip", "Hip")}${row("elbow", "Elbow")}
          <div class="bm-row" data-bm="spine"><span>Spine</span><b>—</b><i class="bm-pill"></i></div></div>
        <div class="bm-split">
          <div class="bm-range"><p class="bm-label">Movement range</p><b data-bm-range>—</b><i class="bar"><i class="bar-fill" style="--w:0%"></i></i></div>
          <div class="bm-stab"><p class="bm-label">Stability</p><b data-bm-stab>—</b><span class="bm-dots"><i></i><i></i><i></i></span></div>
        </div>
      </div>
    </details>`;
}

function listBlock(title, items, cls, icon) {
  if (!items || !items.length) return "";
  return `<section class="panel ${cls}"><header class="panel-head"><h3>${icon || ""}${title}</h3></header>
    <ol class="${cls}-list">${items.map((t) => {
      const m = String(t).match(/^([^:]{2,22}):\s*(.*)$/);
      return `<li>${m ? `<b>${esc(m[1])}</b><span>${esc(cap(m[2]))}</span>` : `<span>${esc(t)}</span>`}</li>`;
    }).join("")}</ol></section>`;
}

// Count numbers up and grow bars once the page is on screen.
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

// ctx: { makeViewer(container, mode, opts), onCleanup(fn) }
function renderDetail(ex, ctx) {
  const f = (typeof FORM !== "undefined" && FORM[ex.name]) || null;
  const athlete = Store.athlete() || ex.athlete || "male";
  const mobile = window.matchMedia("(max-width: 1180px)").matches;
  const wrap = document.createElement("div");
  wrap.className = "detail";
  wrap.dataset.tab = mobile ? "good" : "both";
  const cat = catsOf(ex)[0];
  const avg = Math.round(ex.primary.reduce((t, m) => t + ((ex.activation || {})[m] || 88), 0) / Math.max(1, ex.primary.length));
  wrap.innerHTML = `
    <nav class="crumbs"><a href="#/library">${ICON.back}Exercises</a>${cat ? `<span>/</span><a href="#/library?cat=${cat}">${CAT_NAME[cat]}</a>` : ""}</nav>
    <div class="dx">
      <section class="dx-stage">
        <div class="stage-bar">
          <div class="seg seg-tabs" role="tablist" aria-label="Form view">
            <button type="button" role="tab" data-tab="good">Optimal form</button>
            <button type="button" role="tab" data-tab="bad">Your form</button>
            <button type="button" role="tab" data-tab="both" class="tab-both">Compare</button>
          </div>
          <div class="seg seg-athlete" role="radiogroup" aria-label="Athlete">
            <span class="seg-label">Athlete</span>
            <button type="button" role="radio" data-athlete="male" aria-checked="${athlete === "male"}"><i class="radio"></i>Male</button>
            <button type="button" role="radio" data-athlete="female" aria-checked="${athlete === "female"}"><i class="radio"></i>Female</button>
          </div>
        </div>
        <div class="stages">
          <figure class="stage stage-good">
            <div class="fig-slot">
              <div class="stage-badge is-good"><b>${ICON.check}Optimal form</b><span>Reference movement</span></div>
            </div>
          </figure>
          <figure class="stage stage-bad">
            <div class="fig-slot">
              <div class="stage-badge is-bad"><b>${ICON.warn}Your form</b><span>${esc(f ? f.error.title : ex.bad.cue)}</span></div>
            </div>
          </figure>
        </div>
        <div class="stage-tools">
          <button type="button" class="tool fiber-toggle" aria-pressed="false" title="Show the fiber direction of the working muscles">${ICON.fiber}Fiber detail</button>
          <button type="button" class="tool ghost-toggle" aria-pressed="true" title="Show the optimal form over your form">${ICON.ghost}Optimal overlay</button>
          <span class="stage-legend"><span><i class="ln ln-good"></i>Optimal</span><span><i class="ln ln-bad"></i>Correction</span><span><i class="ln ln-prim"></i>Primary</span></span>
          <span class="stage-hint">${ICON.rotate}Drag to rotate · tap a muscle</span>
        </div>
      </section>

      <section class="dx-info">
        <header class="dx-head">
          <p class="eyebrow">${catsOf(ex).map((c) => CAT_NAME[c]).join(" · ")}</p>
          <div class="dx-title"><h1>${esc(ex.name)}</h1>${favButton(ex.name, "fav-lg")}</div>
          <p class="dx-dose"><span>${ex.sets} × ${esc(ex.reps)}</span><span>Rest ${formatRest(ex.rest)}</span><span>${ICON.activation}Target activation ${avg}%</span></p>
          ${ex.good && ex.good.cue ? `<p class="dx-lede">${esc(ex.good.cue)}</p>` : ""}
        </header>
        <dl class="specs">
          <div class="spec spec-wide"><dt>Primary muscles</dt><dd>${anatomyOf(ex, "primary").map((m) => `<span class="mchip is-prim">${esc(m)}</span>`).join("")}</dd></div>
          <div class="spec spec-wide"><dt>Secondary muscles</dt><dd>${anatomyOf(ex, "secondary").length ? anatomyOf(ex, "secondary").map((m) => `<span class="mchip">${esc(m)}</span>`).join("") : "<span class='muted'>None</span>"}</dd></div>
          <div class="spec"><dt>Equipment</dt><dd>${esc(ex.setup || ex.equipment)}</dd></div>
          <div class="spec"><dt>Difficulty</dt><dd>${difficultyMeter(ex.difficulty)}${esc(DIFF_NAME[ex.difficulty] || "")}</dd></div>
          <div class="spec"><dt>Movement</dt><dd>${esc(cap(ex.movementType))}</dd></div>
        </dl>
        ${formAnalysis(ex, f)}
        ${f ? fixCard(f) : ""}
        ${biomechPanel()}
        ${listBlock("Movement phases", ex.phases, "phases", ICON.motion)}
        <div class="two-col">
          ${listBlock("Cues", ex.cues, "cues", ICON.check)}
          ${listBlock("Common mistakes", ex.mistakes, "mistakes", ICON.warn)}
        </div>
      </section>
    </div>
    ${f ? `<div class="insights">${scoreCard(ex, f)}${muscleCard(ex, f)}</div>` : `<div class="insights">${muscleCard(ex, null)}</div>`}`;

  const slots = wrap.querySelectorAll(".fig-slot");
  const setTab = (t) => {
    wrap.dataset.tab = t;
    wrap.querySelectorAll("[data-tab]").forEach((b) => { if (b.tagName === "BUTTON") b.setAttribute("aria-selected", String(b.dataset.tab === t)); });
    const src = wrap.querySelector(".bm-src em");
    if (src) src.textContent = t === "bad" ? "Your form" : "Optimal form";
  };
  setTab(wrap.dataset.tab);

  let v3 = null;
  if (window.THREE && typeof createViewer3D === "function") {
    v3 = [["good", slots[0]], ["bad", slots[1]]].map(([mode, slot]) => {
      slot.classList.add("fig-3d");
      const v = ctx.makeViewer(slot, mode, { athlete });
      if (v) v.setExercise(ex);
      return v;
    });
    if (!v3[0] || !v3[1]) v3 = null;
  }
  if (v3) {
    // Biggest measured difference, e.g. "Elbow angle: 118° vs 76°" (ready once the body is built).
    const metric = wrap.querySelector(".fix-metric");
    const fillMetric = () => {
      const a = v3[1].analysis;
      if (!a || !metric) return false;
      metric.hidden = false;
      metric.querySelector(".m-your").textContent = a.your;
      metric.querySelector(".m-best").textContent = a.optimal;
      metric.querySelector(".m-label").textContent = a.label;
      return true;
    };
    if (!fillMetric() && metric) {
      const t = setInterval(() => { if (fillMetric()) clearInterval(t); }, 500);
      ctx.onCleanup(() => clearInterval(t));
    }
    const focus = (id) => {
      v3.forEach((v) => v.focusMuscle(id));
      wrap.querySelectorAll("[data-focus]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.focus === id)));
    };
    wrap.addEventListener("muscle-pick", (e) => focus(e.detail && e.detail.id));
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("[data-focus]");
      if (b) focus(b.getAttribute("aria-pressed") === "true" ? null : b.dataset.focus);
      const fb = e.target.closest(".fiber-toggle");
      if (fb) { const on = fb.getAttribute("aria-pressed") !== "true"; fb.setAttribute("aria-pressed", String(on)); v3.forEach((v) => v.setFibers(on)); }
      const g = e.target.closest(".ghost-toggle");
      if (g) { const on = g.getAttribute("aria-pressed") !== "true"; g.setAttribute("aria-pressed", String(on)); v3[1].setGhost(on); }
    });
  } else {
    slots[0].appendChild(figureNode(ex, "good", { animate: true }));
    slots[1].appendChild(figureNode(ex, "bad", { animate: true }));
    wrap.querySelectorAll(".ghost-toggle, .fiber-toggle").forEach((b) => b.remove());
  }

  wrap.addEventListener("click", (e) => {
    const tb = e.target.closest("button[data-tab]");
    if (tb) { setTab(tb.dataset.tab); return; }
    const ab = e.target.closest("[data-athlete]");
    if (ab) {
      const a = ab.dataset.athlete;
      Store.setAthlete(a);
      wrap.querySelectorAll("[data-athlete]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.athlete === a)));
      (v3 || []).forEach((v) => { if (v && typeof v.setAthlete === "function") v.setAthlete(a); });
    }
  });

  // Biomechanics: live joint angles from the shown viewer, 4 times a second while open.
  const bm = wrap.querySelector(".biomech");
  let bmTimer = 0;
  const readBiomech = () => {
    const v = v3 ? v3[wrap.dataset.tab === "bad" ? 1 : 0] : null;
    let m = null;
    try { m = v && typeof v.metrics === "function" ? v.metrics() : null; } catch (err) { m = null; }
    m = m || {};
    ["knee", "hip", "elbow"].forEach((k) => {
      const r = bm.querySelector(`[data-bm="${k}"]`), val = m[k];
      const ok = typeof val === "number" && isFinite(val);
      r.querySelector("b").textContent = ok ? Math.round(val) + "°" : "—";
      r.classList.toggle("is-na", !ok);
      r.querySelector(".bm-arc i").style.setProperty("--w", ok ? Math.min(100, (val / 180) * 100) + "%" : "0%");
    });
    const sp = bm.querySelector('[data-bm="spine"]');
    sp.querySelector("b").textContent = m.spine || "—";
    sp.dataset.state = m.spine ? String(m.spine).toLowerCase() : "";
    const rg = typeof m.range === "number" ? Math.round(m.range) : null;
    bm.querySelector("[data-bm-range]").textContent = rg == null ? "—" : rg + "%";
    bm.querySelector(".bm-range .bar-fill").style.setProperty("--w", (rg || 0) + "%");
    bm.querySelector("[data-bm-stab]").textContent = m.stability || "—";
    bm.querySelector(".bm-stab").dataset.level = { Excellent: 3, Good: 2, Fair: 1 }[m.stability] || 0;
  };
  bm.addEventListener("toggle", () => {
    clearInterval(bmTimer);
    if (bm.open) { readBiomech(); bmTimer = setInterval(readBiomech, 250); }
  });
  ctx.onCleanup(() => clearInterval(bmTimer));

  animateIn(wrap);
  return wrap;
}

// Form feedback: instructional guidance built from the exercise's data. "Correct technique"
// says what a good rep gets right; "Technique correction" shows an example of a common mistake
// (never an analysis of the viewer's own lifting), where it shows up on the body, the path it
// takes against the recommended path, and the cue that fixes it.

const BODY_REGION = {
  elbow: "Elbows and arms", spine: "Spine and trunk", hip: "Hips", knee: "Knees", shoulder: "Shoulders",
  ankle: "Ankles and feet", head: "Head and neck", hand: "Hands and bar path"
};
// Data text written as "your bar stops..." describes the example, so read it as "the bar stops...".
function exampleText(s) {
  return String(s || "").replace(/\byour\b/g, "the").replace(/\bYour\b/g, "The").replace(/\byou're\b/gi, "the lifter is").replace(/\byou\b/g, "the lifter").replace(/\bYou\b/g, "The lifter");
}
function formOf(ex) { return (typeof FORM !== "undefined" && FORM[ex.name]) || null; }

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

function phaseItems(ex) {
  return (ex.phases || []).map((t) => {
    const m = String(t).match(/^([^:]{2,22}):\s*(.*)$/);
    return m ? `<li><b>${esc(m[1])}</b><span>${esc(cap(m[2]))}</span></li>` : `<li><span>${esc(t)}</span></li>`;
  }).join("");
}

// opts.compact: shorter version (exercise page); opts.paths: show the path legend (a mistake viewer is on screen).
function formFeedback(ex, opts = {}) {
  const f = formOf(ex), beginner = Store.level() === "beginner";
  const checks = (f && f.checks) || (ex.formChecks || []).slice(0, 4);
  const bad = faultIndex(ex, f);
  const e = f && f.error;
  const why = ex.movement || (ex.good && ex.good.cue) || "";
  const good = `
    <article class="ff-card ff-good" aria-labelledby="ff-good-${ex.slug}">
      <header class="ff-head"><span class="ff-badge is-good">${ICON.check}Correct technique</span></header>
      <h3 id="ff-good-${ex.slug}">${esc((ex.good && ex.good.cue) || "Controlled, full-range reps")}</h3>
      ${why && why !== (ex.good && ex.good.cue) && !beginner ? `<p class="ff-why">${esc(why)}</p>` : ""}
      <div class="ff-sec"><p class="ff-label">What's right</p>
        <ul class="ff-checks">${checks.map((c) => `<li>${ICON.check}<span>${esc(c)}</span></li>`).join("")}</ul></div>
      ${!opts.compact && ex.phases && ex.phases.length ? `<div class="ff-sec"><p class="ff-label">Movement sequence</p><ol class="ff-seq">${phaseItems(ex)}</ol></div>` : ""}
      ${(ex.formChecks || []).length ? `<div class="ff-sec"><p class="ff-label">Joint alignment checkpoints</p>
        <p class="ff-chips">${ex.formChecks.map((c, i) => `<span class="ff-chip${i === bad ? " is-fault" : ""}">${esc(c)}</span>`).join("")}</p></div>` : ""}
      <div class="ff-sec"><p class="ff-label">Target muscles</p>
        <p class="ff-chips">${namesOf(ex, "primary").map((m) => `<span class="mchip">${esc(m)}</span>`).join("")}</p></div>
    </article>`;
  if (!e) {
    return `<section class="ff" aria-label="Form guidance">${ffIntro(false)}<div class="ff-grid ff-single">${good}</div></section>`;
  }
  const comp = (e.compensate || []).map(muscleName);
  const fix = `
    <article class="ff-card ff-bad" aria-labelledby="ff-bad-${ex.slug}">
      <header class="ff-head"><span class="ff-badge is-bad">${ICON.warn}Technique correction</span><span class="ff-tag">Instructional example</span></header>
      <h3 id="ff-bad-${ex.slug}">${esc(e.title)}</h3>
      <dl class="ff-facts">
        <div><dt>Body region</dt><dd>${esc(BODY_REGION[e.joint] || cap(e.joint || "Whole body"))}</dd></div>
        <div><dt>Issue type</dt><dd>${esc(ERROR_TYPES[e.type] || "Form")}</dd></div>
      </dl>
      <p class="ff-detail">${esc(exampleText(e.detail))}</p>
      ${opts.paths ? `<div class="ff-paths">
        <span><i class="ln ln-bad"></i>Common mistake path</span>
        <span><i class="ln ln-good"></i>Recommended path</span>
      </div>` : ""}
      <div class="ff-metric" hidden><span class="ff-label">In this example</span><p></p></div>
      <div class="ff-fix"><p class="ff-label">${ICON.check}Corrective instruction</p><p>${esc(e.fix)}</p></div>
      ${comp.length ? `<p class="ff-comp"><span class="ff-label">Muscles that take over</span>${comp.map((m) => `<span class="mchip is-comp">${esc(m)}</span>`).join("")}</p>` : ""}
    </article>`;
  return `<section class="ff" aria-label="Form guidance">${ffIntro(true)}<div class="ff-grid">${good}${fix}</div></section>`;
}
function ffIntro(hasMistake) {
  return `<p class="ff-intro">${ICON.info}<span><b>Instructional guidance.</b> ${hasMistake ? "The correction shows an example of a common mistake, demonstrated on the model. It is not an analysis of your own lifting." : "How a well-executed rep looks, demonstrated on the model."}</span></p>`;
}
// Once a mistake viewer has measured its example, show the biggest joint difference.
function fillFeedbackMetric(root, viewer, onCleanup) {
  const box = root.querySelector(".ff-metric");
  if (!box || !viewer) return;
  const fill = () => {
    const a = viewer.analysis;
    if (!a) return false;
    box.hidden = false;
    box.querySelector("p").innerHTML = `${esc(cap(a.label))}: <b class="is-bad">${esc(a.your)}</b> in the mistake vs <b class="is-good">${esc(a.optimal)}</b> recommended.`;
    return true;
  };
  if (!fill()) { const t = setInterval(() => { if (fill()) clearInterval(t); }, 500); if (onCleanup) onCleanup(() => clearInterval(t)); }
}

// Live joint angles from a viewer, four times a second while open.
function biomechPanel(open) {
  const row = (k, label) => `<div class="bm-row" data-bm="${k}"><span>${label}</span><b>—</b><i class="bm-arc"><i style="--w:0%"></i></i></div>`;
  return `
    <details class="panel biomech"${open ? " open" : ""}>
      <summary><span>${ICON.activation}Biomechanics</span><span class="bm-src">Live from the <em>correct technique</em> model</span>${ICON.chevron}</summary>
      <div class="bm-body">
        <p class="bm-label">Joint angles at this moment</p>
        <div class="bm-grid">${row("knee", "Knee")}${row("hip", "Hip")}${row("elbow", "Elbow")}
          <div class="bm-row" data-bm="spine"><span>Spine</span><b>—</b><i class="bm-pill"></i></div></div>
        <div class="bm-split">
          <div class="bm-range"><p class="bm-label">Range of motion vs reference</p><b data-bm-range>—</b><i class="bar"><i class="bar-fill" style="--w:0%"></i></i></div>
          <div class="bm-stab"><p class="bm-label">Stability</p><b data-bm-stab>—</b><span class="bm-dots"><i></i><i></i><i></i></span></div>
        </div>
        <p class="bm-note">Angles are measured on the illustrative model, not on a person.</p>
      </div>
    </details>`;
}
function bindBiomech(bm, getViewer, onCleanup) {
  if (!bm) return;
  let timer = 0;
  const read = () => {
    const v = getViewer();
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
  const sync = () => { clearInterval(timer); if (bm.open) { read(); timer = setInterval(read, 250); } };
  bm.addEventListener("toggle", sync);
  sync();
  if (onCleanup) onCleanup(() => clearInterval(timer));
  return { read };
}

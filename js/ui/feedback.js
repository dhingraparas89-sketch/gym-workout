// Form feedback: instructional guidance built from the exercise's data. "Correct technique" says
// what a good rep gets right; each correction is one feedback item: a short title, what is
// happening, why it matters, what to change and, where a 3D example exists, a button that shows it.
// These are instructional examples demonstrated on a model, never an analysis of the viewer's own
// lifting. Numbers only appear when they are measured on the demonstration model, and say so.

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

// Why the mistake matters: the data's own `why`, else the explanation in the mistake's cue (the
// sentences after its title), else what the muscles that take over say about it.
function whyOf(ex, e) {
  if (!e) return "";
  if (e.why) return exampleText(e.why);
  const cue = String((ex.bad && ex.bad.cue) || "");
  const sentences = cue.split(/(?<=[.!?])\s+/).filter(Boolean);
  const norm = (x) => String(x || "").toLowerCase().replace(/[^a-z ]/g, "").trim();
  if (sentences.length > 1 && norm(sentences[0]).slice(0, 12) === norm(e.title).slice(0, 12)) return exampleText(sentences.slice(1).join(" "));
  const comp = (e.compensate || []).map(muscleName);
  const target = ex.primary.map(muscleName).join(" and ").toLowerCase();
  if (comp.length) return `The ${comp.join(" and ").toLowerCase()} take over, so the ${target} do less of the work the exercise is meant for.`;
  const byType = {
    range: `A shorter range gives the ${target} less work through the part of the movement they are trained in.`,
    posture: "Load moves onto passive structures instead of the muscles meant to hold the position.",
    alignment: "The joint is loaded off its line, which shifts stress onto tissue that is not built for it.",
    tempo: "Momentum does part of the work, so the target muscles spend less time under control.",
    activation: `The ${target} are not doing the work the exercise is meant for.`
  };
  return byType[e.type] || "";
}

function phaseItems(ex) {
  return (ex.phases || []).map((t) => {
    const m = String(t).match(/^([^:]{2,22}):\s*(.*)$/);
    return m ? `<li><b>${esc(m[1])}</b><span>${esc(cap(m[2]))}</span></li>` : `<li><span>${esc(t)}</span></li>`;
  }).join("");
}

// opts.compact: shorter version; opts.paths: show the path legend (a mistake viewer is on screen);
// opts.demo: label of the "show it in 3D" button (it carries data-demo="mistake" for the page);
// opts.more: list the exercise's other common mistakes as short items.
function formFeedback(ex, opts = {}) {
  const f = formOf(ex), beginner = Store.level() === "beginner";
  const checks = (f && f.checks) || (ex.formChecks || []).slice(0, 4);
  const bad = faultIndex(ex, f);
  const e = f && f.error;
  const why = ex.movement || "";
  const good = `
    <article class="ff-card ff-good" aria-labelledby="ff-good-${ex.slug}">
      <header class="ff-head"><span class="ff-badge is-good">${ICON.check}Correct technique</span></header>
      <h3 id="ff-good-${ex.slug}">${esc((ex.good && ex.good.cue) || "Controlled, full-range reps")}</h3>
      ${why && !beginner ? `<p class="ff-why">${esc(why)}</p>` : ""}
      <div class="ff-sec"><p class="ff-label">What a good rep gets right</p>
        <ul class="ff-checks">${checks.map((c) => `<li>${ICON.check}<span>${esc(c)}</span></li>`).join("")}</ul></div>
      ${!opts.compact && ex.phases && ex.phases.length ? `<div class="ff-sec"><p class="ff-label">Movement sequence</p><ol class="ff-seq">${phaseItems(ex)}</ol></div>` : ""}
      ${(ex.formChecks || []).length ? `<div class="ff-sec"><p class="ff-label">Joint alignment checkpoints</p>
        <p class="ff-chips">${ex.formChecks.map((c, i) => `<span class="ff-chip${i === bad && e ? " is-fault" : ""}">${esc(c)}</span>`).join("")}</p></div>` : ""}
    </article>`;
  const more = opts.more ? (ex.mistakes || []).filter((m) => !e || m.toLowerCase() !== String(e.title).toLowerCase()).slice(0, 4) : [];
  const moreHtml = more.length ? `<article class="ff-card ff-more"><header class="ff-head"><span class="ff-badge is-muted">${ICON.info}Also watch for</span></header>
      <ul class="ff-more-list">${more.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></article>` : "";
  if (!e) {
    return `<section class="ff" aria-label="Form guidance">${ffIntro(false)}<div class="ff-grid ff-single">${good}${moreHtml}</div></section>`;
  }
  const comp = (e.compensate || []).map(muscleName);
  const whyText = whyOf(ex, e);
  const fix = `
    <article class="ff-card ff-bad" aria-labelledby="ff-bad-${ex.slug}">
      <header class="ff-head"><span class="ff-badge is-bad">${ICON.warn}Technique correction</span><span class="ff-tag">Instructional example</span></header>
      <h3 id="ff-bad-${ex.slug}">${esc(e.title)}</h3>
      <p class="ff-where"><span class="ff-region">${ICON.target}${esc(BODY_REGION[e.joint] || cap(e.joint || "Whole body"))}</span><span class="ff-type">${esc(ERROR_TYPES[e.type] || "Form")}</span></p>
      <div class="ff-item"><p class="ff-label">What is happening</p><p>${esc(exampleText(e.detail))}</p></div>
      ${whyText ? `<div class="ff-item"><p class="ff-label">Why it matters</p><p>${esc(whyText)}</p></div>` : ""}
      <div class="ff-fix"><p class="ff-label">${ICON.check}What to change</p><p>${esc(exampleText(e.fix))}</p></div>
      ${comp.length ? `<p class="ff-comp"><span class="ff-label">Muscles that take over</span>${comp.map((m) => `<span class="mchip is-comp">${esc(m)}</span>`).join("")}</p>` : ""}
      ${opts.paths ? `<div class="ff-paths"><span><i class="ln ln-bad"></i>Common mistake path</span><span><i class="ln ln-good"></i>Recommended path</span></div>` : ""}
      <div class="ff-metric" hidden><span class="ff-label">Measured on the demonstration model</span><p></p></div>
      ${opts.demo ? `<button type="button" class="btn btn-ghost btn-sm ff-demo" data-demo="mistake">${ICON.cube}${esc(opts.demo)}</button>` : ""}
    </article>`;
  return `<section class="ff" aria-label="Form guidance">${ffIntro(true)}<div class="ff-grid">${good}${fix}${moreHtml}</div></section>`;
}
function ffIntro(hasMistake) {
  return `<p class="ff-intro">${ICON.info}<span><b>Instructional examples, not live analysis.</b> ${hasMistake ? "The correction is a common mistake demonstrated on a 3D model. Nothing here measures or analyzes your own lifting." : "How a well-executed rep looks, demonstrated on a 3D model."}</span></p>`;
}
// Once a mistake viewer has measured its example, show the biggest joint difference, labelled as
// measured on the demonstration model.
function fillFeedbackMetric(root, viewer, onCleanup) {
  const box = root.querySelector(".ff-metric");
  if (!box || !viewer) return;
  const fill = () => {
    const a = viewer.analysis;
    if (!a) return false;
    box.hidden = false;
    box.querySelector("p").innerHTML = `${esc(cap(a.label))}: <b class="is-bad">${esc(a.your)}</b> in the mistake example vs <b class="is-good">${esc(a.optimal)}</b> in the correct one.`;
    return true;
  };
  if (!fill()) { const t = setInterval(() => { if (fill()) clearInterval(t); }, 500); if (onCleanup) onCleanup(() => clearInterval(t)); }
}

// Joint angles of the two demonstration models at the same moment of the rep, side by side.
function biomechPanel() {
  return `
    <details class="panel biomech">
      <summary><span>${ICON.range}Joint angles</span><span class="bm-src">Measured on the demonstration models</span>${ICON.chevron}</summary>
      <div class="bm-body">
        <table class="bm-table">
          <thead><tr><th scope="col">Joint</th><th scope="col" class="is-good">Correct</th><th scope="col" class="is-bad">Mistake</th></tr></thead>
          <tbody></tbody>
        </table>
        <p class="bm-note">Angles at the current moment of the rep, read from the 3D demonstration models (not from a person). Pause or step to compare a position.</p>
      </div>
    </details>`;
}
function bindBiomech(bm, getGood, getBad, onCleanup) {
  if (!bm) return;
  let timer = 0;
  const JOINTS = [["knee", "Knee"], ["hip", "Hip"], ["elbow", "Elbow"], ["shoulder", "Shoulder"]];
  const get = (fn) => { try { const v = fn(); return v && typeof v.metrics === "function" ? v.metrics() || {} : {}; } catch (e) { return {}; } };
  const num = (v) => (typeof v === "number" && isFinite(v) ? Math.round(v) + "°" : null);
  const read = () => {
    const g = get(getGood), b = get(getBad);
    const rows = JOINTS.filter(([k]) => num(g[k]) || num(b[k])).map(([k, label]) => {
      const gv = num(g[k]), bv = num(b[k]);
      const off = gv && bv && Math.abs(g[k] - b[k]) >= 12;
      return `<tr${off ? ' class="is-off"' : ""}><th scope="row">${label}</th><td>${gv || "—"}</td><td>${bv || "—"}</td></tr>`;
    });
    if (g.spine || b.spine) rows.push(`<tr${g.spine && b.spine && g.spine !== b.spine ? ' class="is-off"' : ""}><th scope="row">Spine</th><td>${esc(g.spine || "—")}</td><td>${esc(b.spine || "—")}</td></tr>`);
    bm.querySelector("tbody").innerHTML = rows.length ? rows.join("") : `<tr><td colspan="3" class="muted">Loading the models…</td></tr>`;
  };
  const sync = () => { clearInterval(timer); if (bm.open) { read(); timer = setInterval(read, 300); } };
  bm.addEventListener("toggle", sync);
  sync();
  if (onCleanup) onCleanup(() => clearInterval(timer));
  return { read };
}

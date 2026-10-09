// Playback bar and camera controls for one or more 3D viewers kept in step (the first viewer
// drives the display; actions go to all). Used by the exercise page, Exercise Analysis, the
// muscle explorer and the home preview.
//
// mountPlayer(host, viewers, opts) -> { setViewers(list), state(), destroy() }
//   opts.camera: list of camera presets to show (default front, back, side, threeQuarter)
//   opts.playback: false to show only the camera bar
//   opts.keys: element that takes keyboard shortcuts while focus is inside it

const CAMERA_PRESETS = {
  front: "Front", back: "Back", right: "Side", left: "Left", threeQuarter: "3/4"
};
const SPEEDS = [0.5, 1, 1.5];

function playerMarkup(opts) {
  const cams = opts.camera || ["front", "back", "right", "threeQuarter"];
  const playback = opts.playback === false ? "" : `
    <div class="pb" role="group" aria-label="Playback">
      <div class="pb-main">
        <button type="button" class="pb-btn pb-play" data-pb="toggle" aria-label="Pause">${ICON.pause}</button>
        <div class="pb-steps">
          <button type="button" class="pb-btn" data-pb="start" aria-label="Jump to start position" title="Start position">${ICON.toStart}</button>
          <button type="button" class="pb-btn" data-pb="back" aria-label="Step back" title="Step back">${ICON.stepBack}</button>
          <button type="button" class="pb-btn" data-pb="fwd" aria-label="Step forward" title="Step forward">${ICON.stepFwd}</button>
          <button type="button" class="pb-btn" data-pb="end" aria-label="Jump to end position" title="End position">${ICON.toEnd}</button>
          <button type="button" class="pb-btn" data-pb="restart" aria-label="Restart" title="Restart">${ICON.restart}</button>
        </div>
        <div class="pb-time">
          <div class="pb-track">
            <div class="pb-phases" aria-hidden="true"></div>
            <input type="range" class="pb-scrub" min="0" max="1000" step="1" value="0" aria-label="Position in the rep">
          </div>
          <div class="pb-read"><span class="pb-phase" aria-live="off">—</span><span class="pb-rep">Rep <b>1</b></span></div>
        </div>
        <div class="seg pb-speed" role="radiogroup" aria-label="Playback speed">
          ${SPEEDS.map((s) => `<button type="button" role="radio" data-speed="${s}" aria-checked="false">${s}×</button>`).join("")}
        </div>
      </div>
    </div>`;
  return `${playback}
    <div class="cam" role="group" aria-label="Camera">
      <span class="cam-label">View</span>
      ${cams.map((c) => `<button type="button" class="cam-btn" data-cam="${c}">${CAMERA_PRESETS[c] || c}</button>`).join("")}
      <button type="button" class="cam-btn" data-cam="reset" title="The exercise's default view">Reset</button>
      <span class="cam-zoom">
        <button type="button" class="cam-btn cam-ico" data-zoom="0.85" aria-label="Zoom out">${ICON.minus}</button>
        <button type="button" class="cam-btn cam-ico" data-zoom="1.18" aria-label="Zoom in">${ICON.plus}</button>
      </span>
      <span class="cam-hint">${ICON.rotate}<span>Drag to rotate · right-drag or two fingers to pan · scroll to zoom</span></span>
    </div>`;
}

function mountPlayer(host, viewers, opts = {}) {
  host.classList.add("player");
  host.innerHTML = playerMarkup(opts);
  let list = (viewers || []).filter(Boolean), off = null, lastPhases = "", lastPhase = -2, lastRep = -1, scrubbing = false, wasPlaying = false;
  const lead = () => list[0];
  const all = (fn) => list.forEach((v) => { try { fn(v); } catch (e) {} });
  const scrub = host.querySelector(".pb-scrub"), phasesEl = host.querySelector(".pb-phases");
  const playBtn = host.querySelector(".pb-play");
  const phaseEl = host.querySelector(".pb-phase"), repEl = host.querySelector(".pb-rep b");

  function drawPhases(v) {
    if (!phasesEl || !v || !v.phases) return;
    const ph = v.phases, key = JSON.stringify(ph);
    if (key === lastPhases) return;
    lastPhases = key; lastPhase = -2;
    phasesEl.innerHTML = ph.map((p, i) => `<span data-ph="${i}" style="left:${(p.t0 * 100).toFixed(2)}%;width:${((p.t1 - p.t0) * 100).toFixed(2)}%"><em>${esc(p.label)}</em></span>`).join("");
  }
  function setPlayIcon(on) {
    if (!playBtn) return;
    playBtn.innerHTML = on ? ICON.pause : ICON.play;
    playBtn.setAttribute("aria-label", on ? "Pause" : "Play");
    playBtn.classList.toggle("is-paused", !on);
  }
  function setSpeedUI(s) { host.querySelectorAll("[data-speed]").forEach((b) => b.setAttribute("aria-checked", String(+b.dataset.speed === s))); }

  function bind() {
    if (off) off();
    off = null;
    const v = lead();
    host.classList.toggle("is-off", !v);
    if (!v || typeof v.onFrame !== "function") return;
    drawPhases(v);
    setPlayIcon(v.isPlaying);
    setSpeedUI(v.speed);
    off = v.onFrame((f) => {
      drawPhases(v);
      if (scrub && !scrubbing) scrub.value = Math.round(f.t * 1000);
      if (f.phaseIndex !== lastPhase && phasesEl) {
        lastPhase = f.phaseIndex;
        phaseEl.textContent = f.phase || "—";
        phasesEl.querySelectorAll("[data-ph]").forEach((s) => s.classList.toggle("is-on", +s.dataset.ph === f.phaseIndex));
      }
      if (f.rep !== lastRep && repEl) { lastRep = f.rep; repEl.textContent = f.rep + 1; }
      if (playBtn && playBtn.classList.contains("is-paused") === f.playing) setPlayIcon(f.playing);
    });
  }

  const act = {
    toggle: () => { const on = !lead().isPlaying; all((v) => (on ? v.play() : v.pause())); setPlayIcon(on); },
    start: () => all((v) => v.jumpTo("start")),
    end: () => all((v) => v.jumpTo("end")),
    back: () => all((v) => v.step(-1)),
    fwd: () => all((v) => v.step(1)),
    restart: () => { all((v) => { v.restart(); v.play(); }); setPlayIcon(true); }
  };
  host.addEventListener("click", (e) => {
    if (!lead()) return;
    const b = e.target.closest("[data-pb]");
    if (b && act[b.dataset.pb]) { act[b.dataset.pb](); return; }
    const s = e.target.closest("[data-speed]");
    if (s) { const x = +s.dataset.speed; all((v) => v.setSpeed(x)); setSpeedUI(x); return; }
    const c = e.target.closest("[data-cam]");
    if (c) { all((v) => v.setView(c.dataset.cam)); return; }
    const z = e.target.closest("[data-zoom]");
    if (z) all((v) => v.zoomBy && v.zoomBy(+z.dataset.zoom));
  });
  if (scrub) {
    const begin = () => { if (scrubbing || !lead()) return; scrubbing = true; wasPlaying = lead().isPlaying; all((v) => v.pause()); };
    const finish = () => { if (!scrubbing) return; scrubbing = false; if (wasPlaying) all((v) => v.play()); };
    scrub.addEventListener("pointerdown", begin);
    scrub.addEventListener("input", () => { if (!scrubbing) { all((v) => v.pause()); setPlayIcon(false); } all((v) => v.seek(+scrub.value / 1000)); });
    scrub.addEventListener("pointerup", finish);
    scrub.addEventListener("change", finish);
  }
  // Keyboard: space / k play-pause, , and . step, Home / End jump (only while focus is inside).
  const keyRoot = opts.keys || host;
  const onKey = (e) => {
    if (!lead() || opts.playback === false) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" && e.target !== scrub) return;
    if (tag === "select" || tag === "textarea") return;
    const k = e.key;
    if ((k === " " || k === "k") && !e.target.closest("button, a")) { e.preventDefault(); act.toggle(); }
    else if (k === "," ) { e.preventDefault(); act.back(); }
    else if (k === ".") { e.preventDefault(); act.fwd(); }
    else if (k === "Home" && e.target !== scrub) { e.preventDefault(); act.start(); }
    else if (k === "End" && e.target !== scrub) { e.preventDefault(); act.end(); }
  };
  keyRoot.addEventListener("keydown", onKey);

  bind();
  return {
    setViewers(next) { list = (next || []).filter(Boolean); lastPhases = ""; lastRep = -1; lastPhase = -2; bind(); },
    // Playback + camera snapshot of the lead viewer, to carry over to a replacement viewer.
    state() {
      const v = lead();
      if (!v) return null;
      return { t: v.time, playing: v.isPlaying, speed: v.speed, camera: v.getCamera ? v.getCamera() : null };
    },
    destroy() { if (off) off(); keyRoot.removeEventListener("keydown", onKey); }
  };
}

// Apply a saved playback/camera state to a fresh viewer (after setExercise).
function restoreViewer(v, st) {
  if (!v || !st) return;
  try {
    v.setSpeed(st.speed);
    v.seek(st.t);
    if (st.playing) v.play(); else v.pause();
    if (st.camera && v.setCamera) v.setCamera(st.camera);
  } catch (e) {}
}

// Posture figures.
// Draws a side-view figure from joint angles and animates it between two poses.
//
// Angles are in degrees: 0 points straight up, 90 points right (the way the
// figure faces), 180 points down, -90 points left. Each angle is the direction
// of one bone:
//   shin   ankle -> knee        thigh  knee -> hip       torso  hip -> shoulder
//   neck   shoulder -> head     ua     shoulder -> elbow fa     elbow -> hand
//   foot   ankle -> toe (default 90, flat on the floor)
//   t2/s2  optional far leg: hip -> knee and knee -> ankle
//   bend   curve of the spine: positive rounds the back, negative arches it
// anchor   which joint sits at (x, y): ankle (default), toe, knee, hip, shoulder or hand
//
// Front-view figures (view: "front") use ua/fa for the arms, mirrored on both
// sides, plus tl (torso length, 1 = standing upright) and hy (hip height).

const BONES = { shin: 42, thigh: 42, torso: 52, neck: 7, head: 9, upperArm: 30, forearm: 28, foot: 13 };
const SVG_NS = "http://www.w3.org/2000/svg";

function vec(angle, len) {
  const r = (angle * Math.PI) / 180;
  return [Math.sin(r) * len, -Math.cos(r) * len];
}
function add(p, v) { return [p[0] + v[0], p[1] + v[1]]; }

function solveSide(p) {
  const j = {};
  j.ankle = [0, 0];
  j.toe = add(j.ankle, vec(p.foot ?? 90, BONES.foot));
  j.knee = add(j.ankle, vec(p.shin, BONES.shin));
  j.hip = add(j.knee, vec(p.thigh, BONES.thigh));
  j.shoulder = add(j.hip, vec(p.torso, BONES.torso));
  const neck = p.neck ?? p.torso;
  j.neck = add(j.shoulder, vec(neck, BONES.neck));
  j.head = add(j.neck, vec(neck, BONES.head));
  j.elbow = add(j.shoulder, vec(p.ua, BONES.upperArm));
  j.hand = add(j.elbow, vec(p.fa, BONES.forearm));
  if (p.t2 != null) {
    j.knee2 = add(j.hip, vec(p.t2, BONES.thigh));
    j.ankle2 = add(j.knee2, vec(p.s2, BONES.shin));
    j.toe2 = add(j.ankle2, vec(p.f2 ?? 90, BONES.foot));
  }
  const a = j[p.anchor || "ankle"];
  const dx = p.x - a[0], dy = p.y - a[1];
  Object.keys(j).forEach((k) => { j[k] = [j[k][0] + dx, j[k][1] + dy]; });
  // Control point for the curved spine: push the midpoint sideways by "bend".
  const mx = (j.hip[0] + j.shoulder[0]) / 2, my = (j.hip[1] + j.shoulder[1]) / 2;
  const tx = j.shoulder[0] - j.hip[0], ty = j.shoulder[1] - j.hip[1];
  const len = Math.hypot(tx, ty) || 1;
  const b = (p.bend || 0) * 2;
  j.spineCtrl = [mx - (ty / len) * b, my + (tx / len) * b];
  j.spineMid = [(j.hip[0] + 2 * j.spineCtrl[0] + j.shoulder[0]) / 4, (j.hip[1] + 2 * j.spineCtrl[1] + j.shoulder[1]) / 4];
  return j;
}

function solveFront(p) {
  const cx = 100, ground = p.y ?? 186, tl = p.tl ?? 1;
  const hipY = p.hy ?? ground - 84;
  const j = {};
  j.pelvis = [cx, hipY];
  j.neckBase = [cx, hipY - 48 * tl];
  j.head = [cx, j.neckBase[1] - 15];
  j.shoulder = [cx + 17, j.neckBase[1] + 4];
  j.shoulderL = [cx - 17, j.neckBase[1] + 4];
  j.elbow = add(j.shoulder, vec(p.ua, BONES.upperArm));
  j.hand = add(j.elbow, vec(p.fa, BONES.forearm));
  j.elbowL = add(j.shoulderL, vec(-p.ua, BONES.upperArm));
  j.handL = add(j.elbowL, vec(-p.fa, BONES.forearm));
  j.hip = [cx + 9, hipY]; j.hipL = [cx - 9, hipY];
  const kneeY = hipY + (ground - hipY) / 2;
  const kneeOut = p.knees ?? 0;
  j.knee = [cx + 13 + kneeOut, kneeY]; j.kneeL = [cx - 13 - kneeOut, kneeY];
  j.ankle = [cx + 15, ground]; j.ankleL = [cx - 15, ground];
  return j;
}

function lerpPose(a, b, t) {
  const out = { ...b };
  Object.keys(a).forEach((k) => {
    if (typeof a[k] === "number" && typeof b[k] === "number") out[k] = a[k] + (b[k] - a[k]) * t;
  });
  return out;
}

// Which bones each highlight key colors.
const HIGHLIGHT_SEGMENTS = {
  spine: [["hip", "spineCtrl", "shoulder"]], neck: [["shoulder", "head"]],
  upperArm: [["shoulder", "elbow"]], forearm: [["elbow", "hand"]],
  arm: [["shoulder", "elbow"], ["elbow", "hand"]],
  thigh: [["knee", "hip"]], shin: [["ankle", "knee"]], foot: [["ankle", "toe"]],
  leg: [["ankle", "knee"], ["knee", "hip"]]
};
const HIGHLIGHT_JOINTS = ["knee", "hip", "elbow", "shoulder", "ankle", "hand", "spineMid", "head"];

function el(name, attrs, parent) {
  const n = document.createElementNS(SVG_NS, name);
  Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
  if (parent) parent.appendChild(n);
  return n;
}
function pts(...ps) { return ps.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)); }
function linePath(a, b) { return `M${pts(a)} L${pts(b)}`; }
function segPath(j, seg) {
  if (seg.length === 3) return `M${pts(j[seg[0]])} Q${pts(j[seg[1]])} ${pts(j[seg[2]])}`;
  return linePath(j[seg[0]], j[seg[1]]);
}

// Builds an SVG for one exercise. mode: "good" or "bad". animate: true/false.
function createFigure(ex, mode, opts = {}) {
  const fig = ex.figure;
  const fault = mode === "bad" ? ex.bad : null;
  const poseA = { ...fig.a, ...(fault && fault.a) };
  const poseB = { ...fig.b, ...(fault && fault.b) };
  const highlight = (mode === "bad" ? ex.bad.highlight : ex.good.highlight) || [];
  const color = mode === "bad" ? "var(--bad)" : "var(--good)";
  const front = fig.view === "front";

  const svg = el("svg", { viewBox: "0 0 200 200", class: "figure figure-" + mode, role: "img",
    "aria-label": `${ex.name}: ${mode === "bad" ? "common mistake" : "correct form"}` });
  if (!fig.noFloor) el("line", { x1: 4, y1: 189, x2: 196, y2: 189, class: "fig-floor" }, svg);
  (fig.props || []).forEach((pr) => {
    if (pr.line) el("line", { x1: pr.line[0], y1: pr.line[1], x2: pr.line[2], y2: pr.line[3], class: "fig-equip", "stroke-width": pr.w || 6 }, svg);
    if (pr.rect) el("rect", { x: pr.rect[0], y: pr.rect[1], width: pr.rect[2], height: pr.rect[3], rx: 2, class: "fig-equip-fill" }, svg);
    if (pr.dot) el("circle", { cx: pr.dot[0], cy: pr.dot[1], r: pr.dot[2] || 4, class: "fig-equip-fill" }, svg);
  });

  // Plates sit behind the body so the posture stays readable.
  const load = el("g", { class: "fig-load" }, svg);
  const glow = el("g", { class: "fig-glow", stroke: color }, svg);
  const far = el("g", { class: "fig-far" }, svg);
  const body = el("g", { class: "fig-body" }, svg);
  const marks = el("g", { class: "fig-marks", stroke: color }, svg);

  const parts = {};
  if (front) {
    ["torso", "shoulders", "hips", "uaR", "faR", "uaL", "faL", "thR", "shR", "thL", "shL"].forEach((k) => { parts[k] = el("path", {}, body); });
  } else {
    ["leg2a", "leg2b", "foot2"].forEach((k) => { parts[k] = el("path", {}, far); });
    ["shin", "thigh", "foot", "spine", "neck", "ua", "fa"].forEach((k) => { parts[k] = el("path", {}, body); });
  }
  parts.head = el("circle", { r: BONES.head, class: "fig-head" }, body);

  const glows = highlight.filter((h) => HIGHLIGHT_SEGMENTS[h]).flatMap((h) => HIGHLIGHT_SEGMENTS[h]).map((seg) => ({ seg, glow: el("path", {}, glow), line: el("path", { class: "fig-hl" }, marks) }));
  const rings = highlight.filter((h) => HIGHLIGHT_JOINTS.includes(h) || h === "back").map((h) => ({ joint: h === "back" ? "spineMid" : h, glow: el("circle", { r: 13, class: "fig-ring-glow", fill: color }, glow), ring: el("circle", { r: 9, class: "fig-ring" }, marks) }));
  if (front && highlight.includes("shoulder")) {
    rings.push({ joint: "shoulderL", glow: el("circle", { r: 13, class: "fig-ring-glow", fill: color }, glow), ring: el("circle", { r: 9, class: "fig-ring" }, marks) });
  }

  const loadType = fig.load && fig.load.type;
  const loadEls = {};
  if (loadType) {
    if (loadType === "cable" || loadType === "cable-both") loadEls.cable = el("path", { class: "fig-cable" }, load);
    if (loadType === "dumbbell" || (front && loadType === "dumbbell")) { loadEls.dbBar = el("path", { class: "fig-equip", "stroke-width": 4 }, load); loadEls.plate = el("circle", { r: 6, class: "fig-plate" }, load); if (front) { loadEls.dbBarL = el("path", { class: "fig-equip", "stroke-width": 4 }, load); loadEls.plateL = el("circle", { r: 6, class: "fig-plate" }, load); } }
    else if (loadType === "footplate") loadEls.foot = el("path", { class: "fig-equip", "stroke-width": 7 }, load);
    else if (loadType === "roller") loadEls.plate = el("circle", { r: 7, class: "fig-plate" }, load);
    else if (loadType !== "cable" && loadType !== "cable-both" && loadType !== "none") loadEls.plate = el("circle", { r: fig.load.r || 13, class: "fig-plate" }, load);
    if (loadType === "cable" || loadType === "cable-both") loadEls.handle = el("circle", { r: 3.5, class: "fig-equip-fill" }, load);
  }

  function draw(pose) {
    const j = front ? solveFront(pose) : solveSide(pose);
    if (front) {
      parts.torso.setAttribute("d", linePath(j.neckBase, j.pelvis)); parts.torso.setAttribute("class", "fig-torso-front");
      parts.shoulders.setAttribute("d", linePath(j.shoulderL, j.shoulder));
      parts.hips.setAttribute("d", linePath(j.hipL, j.hip));
      parts.uaR.setAttribute("d", linePath(j.shoulder, j.elbow)); parts.faR.setAttribute("d", linePath(j.elbow, j.hand));
      parts.uaL.setAttribute("d", linePath(j.shoulderL, j.elbowL)); parts.faL.setAttribute("d", linePath(j.elbowL, j.handL));
      parts.thR.setAttribute("d", linePath(j.hip, j.knee)); parts.shR.setAttribute("d", linePath(j.knee, j.ankle));
      parts.thL.setAttribute("d", linePath(j.hipL, j.kneeL)); parts.shL.setAttribute("d", linePath(j.kneeL, j.ankleL));
      j.spineCtrl = [(j.neckBase[0] + j.pelvis[0]) / 2, (j.neckBase[1] + j.pelvis[1]) / 2];
      j.spineMid = j.spineCtrl; j.hipC = j.pelvis;
    } else {
      parts.shin.setAttribute("d", linePath(j.ankle, j.knee));
      parts.thigh.setAttribute("d", linePath(j.knee, j.hip));
      parts.foot.setAttribute("d", linePath(j.ankle, j.toe));
      parts.spine.setAttribute("d", segPath(j, ["hip", "spineCtrl", "shoulder"]));
      parts.spine.setAttribute("class", "fig-torso");
      parts.neck.setAttribute("d", linePath(j.shoulder, j.neck));
      parts.ua.setAttribute("d", linePath(j.shoulder, j.elbow));
      parts.fa.setAttribute("d", linePath(j.elbow, j.hand));
      if (j.knee2) {
        parts.leg2a.setAttribute("d", linePath(j.hip, j.knee2));
        parts.leg2b.setAttribute("d", linePath(j.knee2, j.ankle2));
        parts.foot2.setAttribute("d", linePath(j.ankle2, j.toe2));
      }
    }
    parts.head.setAttribute("cx", j.head[0]); parts.head.setAttribute("cy", j.head[1]);

    glows.forEach((g) => {
      const segs = front ? frontSegs(g.seg) : [g.seg];
      const d = segs.map((s) => segPath(j, s)).join(" ");
      g.glow.setAttribute("d", d); g.line.setAttribute("d", d);
    });
    rings.forEach((r) => {
      const p = j[r.joint]; if (!p) return;
      r.glow.setAttribute("cx", p[0]); r.glow.setAttribute("cy", p[1]);
      r.ring.setAttribute("cx", p[0]); r.ring.setAttribute("cy", p[1]);
    });

    if (loadType) {
      const L = fig.load;
      const at = L.at ? j[L.at] : j.hand;
      const off = L.offset || [0, 0];
      const c = [at[0] + off[0], at[1] + off[1]];
      if (loadEls.cable) {
        const from = L.from;
        loadEls.cable.setAttribute("d", linePath(from, j.hand) + (front ? " " + linePath(L.fromL || from, j.handL) : ""));
        loadEls.handle.setAttribute("cx", j.hand[0]); loadEls.handle.setAttribute("cy", j.hand[1]);
      }
      if (loadEls.plate) { loadEls.plate.setAttribute("cx", c[0]); loadEls.plate.setAttribute("cy", c[1]); }
      if (loadEls.dbBar) {
        loadEls.dbBar.setAttribute("d", linePath([c[0] - 7, c[1]], [c[0] + 7, c[1]]));
        if (front) {
          loadEls.plate.setAttribute("cx", j.hand[0]); loadEls.plate.setAttribute("cy", j.hand[1] + 4);
          loadEls.plateL.setAttribute("cx", j.handL[0]); loadEls.plateL.setAttribute("cy", j.handL[1] + 4);
          loadEls.dbBar.setAttribute("d", "");
          loadEls.dbBarL.setAttribute("d", "");
        }
      }
      if (loadEls.foot) {
        // Foot plate: parallel to the sole, just beyond it.
        const fx = j.toe[0] - j.ankle[0], fy = j.toe[1] - j.ankle[1], fl = Math.hypot(fx, fy) || 1;
        const ux = fx / fl, uy = fy / fl;
        let px = -uy, py = ux;
        if (px * (j.knee[0] - j.ankle[0]) + py * (j.knee[1] - j.ankle[1]) > 0) { px = -px; py = -py; }
        const o = 6;
        loadEls.foot.setAttribute("d", linePath([j.ankle[0] - ux * 8 + px * o, j.ankle[1] - uy * 8 + py * o], [j.toe[0] + ux * 6 + px * o, j.toe[1] + uy * 6 + py * o]));
      }
    }
  }

  function frontSegs(seg) {
    const key = seg.join("-");
    if (key === "shoulder-elbow") return [["shoulder", "elbow"], ["shoulderL", "elbowL"]];
    if (key === "elbow-hand") return [["elbow", "hand"], ["elbowL", "handL"]];
    if (key === "hip-spineCtrl-shoulder") return [["neckBase", "pelvis"]];
    if (key === "shoulder-head") return [["shoulderL", "neckBase"], ["neckBase", "shoulder"]];
    if (key === "knee-hip") return [["hip", "knee"], ["hipL", "kneeL"]];
    if (key === "ankle-knee") return [["knee", "ankle"], ["kneeL", "ankleL"]];
    return [seg];
  }

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  draw(opts.animate && !reduce ? poseA : poseB);
  if (opts.animate && !reduce) Animator.add(svg, (t) => draw(lerpPose(poseA, poseB, t)), fig.hold);
  return svg;
}

// One shared animation loop for every figure on the page.
const Animator = {
  items: [], running: false, paused: false, start: performance.now(),
  add(svg, fn, hold) {
    this.items.push({ svg, fn, hold: hold || 0 });
    if (!this.running) { this.running = true; requestAnimationFrame((t) => this.tick(t)); }
  },
  tick(now) {
    // Drop figures that were on the page and have since been removed.
    this.items = this.items.filter((it) => it.svg.isConnected || !it.seen);
    const period = 2800;
    const raw = ((now - this.start) % period) / period;
    // Ease in and out, with a short pause at each end of the rep.
    const t = this.paused ? 1 : Math.min(1, Math.max(0, (0.5 - 0.5 * Math.cos(raw * 2 * Math.PI)) * 1.25 - 0.125));
    this.items.forEach((it) => { if (it.svg.isConnected) { it.seen = true; it.fn(t); } });
    requestAnimationFrame((t2) => this.tick(t2));
  }
};

// Exercise character.
// Draws a muscular side-view figure from joint angles and animates it
// between two poses. Joints are limited to natural human ranges, and the
// animation moves each joint (knee, hip, shoulder, elbow...) rather than
// spinning whole limbs, so arms and legs bend the way real ones do.
//
// Poses are written as bone directions in degrees: 0 points straight up,
// 90 points right (the way the figure faces), 180 points down, -90 left.
//   shin   ankle -> knee        thigh  knee -> hip       torso  hip -> shoulder
//   neck   shoulder -> head     ua     shoulder -> elbow fa     elbow -> hand
//   foot   ankle -> toe (default 90, flat on the floor)
//   t2/s2  optional far leg: hip -> knee and knee -> ankle (f2 = its foot)
//   bend   curve of the spine: positive rounds the back, negative arches it
// anchor   which joint sits at (x, y): ankle (default), toe, knee, hip, shoulder or hand
//
// A figure lying on its back must have its head on the left (torso -90);
// with the head on the right it would be lying face down.
//
// Front-view figures (view: "front") use ua/fa for both arms (mirrored),
// tl (torso length, 1 = upright) and hy (hip height).

const BONES = { shin: 42, thigh: 42, torso: 52, neck: 8, upperArm: 30, forearm: 28, foot: 14 };
const SVG_NS = "http://www.w3.org/2000/svg";

// Natural joint ranges in degrees, measured as flexion from standing straight.
const JOINTS = {
  knee: { lo: -20, min: -5, max: 160 },     // straight to fully bent
  hip: { lo: -90, min: -35, max: 155 },     // a little extension to deep flexion
  shoulder: { lo: -90, min: -40, max: 250 },// arm overhead (0) ... by the side (180) ... reaching back
  elbow: { lo: -60, min: -8, max: 155 },    // straight to fully bent, never backwards
  neck: { lo: -180, min: -60, max: 70 },
  ankle: { lo: -90, min: 35, max: 165 }     // relative to the shin: 90 = foot flat
};

function wrap(x, lo) { return ((((x - lo) % 360) + 360) % 360) + lo; }

// Absolute bone directions -> joint angles.
function toJoints(p) {
  const neck = p.neck ?? p.torso;
  const q = {
    shin: p.shin,
    knee: wrap(p.shin - p.thigh, JOINTS.knee.lo),
    hip: wrap(p.torso - p.thigh, JOINTS.hip.lo),
    shoulder: wrap(p.ua - p.torso, JOINTS.shoulder.lo),
    elbow: wrap(p.ua - p.fa, JOINTS.elbow.lo),
    neck: wrap(neck - p.torso, JOINTS.neck.lo),
    ankle: wrap((p.foot ?? 90) - p.shin, JOINTS.ankle.lo)
  };
  if (p.t2 != null) {
    q.hip2 = wrap(p.torso - (p.t2 - 180), JOINTS.hip.lo);
    q.knee2 = wrap(p.s2 - p.t2, JOINTS.knee.lo);
    q.ankle2 = wrap((p.f2 ?? 90) - (p.s2 - 180), JOINTS.ankle.lo);
  }
  return q;
}

// Joint angles -> absolute bone directions.
function fromJoints(q, base) {
  const p = { ...base };
  p.shin = q.shin;
  p.thigh = q.shin - q.knee;
  p.torso = p.thigh + q.hip;
  p.ua = p.torso + q.shoulder;
  p.fa = p.ua - q.elbow;
  p.neck = p.torso + q.neck;
  p.foot = p.shin + q.ankle;
  if (q.hip2 != null) {
    p.t2 = p.torso - q.hip2 + 180;
    p.s2 = p.t2 + q.knee2;
    p.f2 = p.s2 - 180 + q.ankle2;
  }
  return p;
}

// Wide-grip and bar-on-the-back holds turn the upper arm out to the side,
// so in a side view the elbow can look bent further than it really is.
const ARMS_OUT = { shoulder: { min: -40, max: 268 }, elbow: { min: -8, max: 250 } };

// Returns a list of problems, e.g. ["elbow 220° (allowed -8..155)"]. Used by tools/check-poses.js.
function checkPose(p, armsOut) {
  if (p.view === "front") return [];
  const q = toJoints(p), out = [];
  [["knee", "knee"], ["hip", "hip"], ["shoulder", "shoulder"], ["elbow", "elbow"], ["neck", "neck"], ["ankle", "ankle"],
   ["hip2", "hip"], ["knee2", "knee"], ["ankle2", "ankle"]].forEach(([k, lim]) => {
    if (q[k] == null) return;
    const L = (armsOut && ARMS_OUT[lim]) || JOINTS[lim];
    if (q[k] < L.min || q[k] > L.max) out.push(`${k} ${Math.round(q[k])}° (allowed ${L.min}..${L.max})`);
  });
  return out;
}

function lerpPose(a, b, t) {
  const mix = (x, y) => x + (y - x) * t;
  if (a.view === "front") {
    const out = { ...b };
    Object.keys(a).forEach((k) => { if (typeof a[k] === "number" && typeof b[k] === "number") out[k] = mix(a[k], b[k]); });
    return out;
  }
  const qa = toJoints(a), qb = toJoints(b), q = {};
  Object.keys(qb).forEach((k) => {
    if (k === "shin") { q.shin = qa.shin + wrap(qb.shin - qa.shin, -180) * t; return; }
    q[k] = qa[k] == null ? qb[k] : mix(qa[k], qb[k]);
  });
  const base = { ...b, x: mix(a.x, b.x), y: mix(a.y, b.y), bend: mix(a.bend || 0, b.bend || 0), abd: mix(a.abd || 0, b.abd || 0) };
  if (a.gz != null && b.gz != null) base.gz = mix(a.gz, b.gz);
  // 3D-only leg spread (degrees) and knees-out turn, when the poses give them.
  ["legAbd", "kneeOut"].forEach((k) => { if (a[k] != null || b[k] != null) base[k] = mix(a[k] ?? 0, b[k] ?? 0); });
  return fromJoints(q, base);
}

// ---------- Geometry ----------
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
  j.neckAngle = p.neck ?? p.torso;
  j.neck = add(j.shoulder, vec(j.neckAngle, BONES.neck));
  j.head = add(j.neck, vec(j.neckAngle, 8));
  j.elbow = add(j.shoulder, vec(p.ua, BONES.upperArm * (p.armsOut ? 0.8 : 1)));
  j.hand = add(j.elbow, vec(p.fa, BONES.forearm));
  j.handTip = add(j.hand, vec(p.fa, 6));
  if (p.t2 != null) {
    j.knee2 = add(j.hip, vec(p.t2, BONES.thigh));
    j.ankle2 = add(j.knee2, vec(p.s2, BONES.shin));
    j.toe2 = add(j.ankle2, vec(p.f2 ?? 90, BONES.foot));
  }
  const a = j[p.anchor || "ankle"];
  const dx = p.x - a[0], dy = p.y - a[1];
  Object.keys(j).forEach((k) => { if (Array.isArray(j[k])) j[k] = [j[k][0] + dx, j[k][1] + dy]; });
  // Spine curve: push the middle of hip->shoulder sideways by "bend".
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
  j.neckBase = [cx, hipY - 50 * tl];
  j.head = [cx, j.neckBase[1] - 14];
  j.shoulder = [cx + 15, j.neckBase[1] + 5];
  j.shoulderL = [cx - 15, j.neckBase[1] + 5];
  j.elbow = add(j.shoulder, vec(p.ua, BONES.upperArm));
  j.hand = add(j.elbow, vec(p.fa, BONES.forearm));
  j.elbowL = add(j.shoulderL, vec(-p.ua, BONES.upperArm));
  j.handL = add(j.elbowL, vec(-p.fa, BONES.forearm));
  j.hip = [cx + 8, hipY]; j.hipL = [cx - 8, hipY];
  const kneeY = hipY + (ground - hipY) / 2, kneeOut = p.knees ?? 0;
  j.knee = [cx + 11 + kneeOut, kneeY]; j.kneeL = [cx - 11 - kneeOut, kneeY];
  j.ankle = [cx + 12, ground - 4]; j.ankleL = [cx - 12, ground - 4];
  return j;
}

// ---------- Body shapes ----------
// Half-widths along each bone, from the near joint (t = 0) to the far one (t = 1).
// "a" is the front of the body, "p" the back.
const PROFILES = {
  upperArm: { t: [0, 0.18, 0.45, 0.75, 1], a: [8, 7.2, 7.6, 5.8, 4.4], p: [7.6, 7.4, 7.4, 5.8, 4.6] },
  forearm: { t: [0, 0.22, 0.6, 1], a: [4.8, 5.8, 4.2, 3], p: [4.6, 5.3, 3.8, 3] },
  thigh: { t: [0, 0.2, 0.5, 0.82, 1], a: [9.5, 9.8, 9.2, 7, 5.6], p: [10.5, 9.8, 8.4, 6.4, 5.2] },
  shin: { t: [0, 0.18, 0.42, 0.8, 1], a: [5.4, 4.8, 4.4, 3.4, 3], p: [5.2, 7, 7.2, 3.8, 3] },
  torso: { t: [0, 0.14, 0.4, 0.68, 0.88, 1], a: [9.5, 9.2, 8.6, 11, 10.4, 6.5], p: [11.5, 9.5, 8, 10.4, 10.2, 7.5] },
  neck: { t: [0, 1], a: [5, 4], p: [6.5, 4] },
  foot: { t: [0, 0.35, 1], a: [3.6, 3, 1.6], p: [3, 2.4, 1.6] }
};

// Muscle bellies drawn on the body: [bone, side, t0, t1, inner, outer].
// side "a" = front, "p" = back; inner/outer are fractions of the half-width.
const MUSCLE_SHAPES = {
  chest: [["torso", "a", 0.62, 0.93, 0.15, 1]],
  abs: [["torso", "a", 0.18, 0.62, 0.2, 0.95]],
  obliques: [["torso", "a", 0.2, 0.58, -0.45, 0.25]],
  glutes: [["torso", "p", -0.02, 0.24, 0.25, 1.05], ["thigh", "p", 0, 0.14, 0.3, 1]],
  "lower-back": [["torso", "p", 0.18, 0.5, 0.35, 0.95]],
  lats: [["torso", "p", 0.42, 0.8, 0.1, 0.95]],
  "upper-back": [["torso", "p", 0.7, 0.97, 0.3, 0.95]],
  traps: [["neck", "p", -0.2, 1, 0.1, 1]],
  shoulders: [["upperArm", "a", -0.06, 0.4, -0.2, 1.02]],
  "rear-delts": [["upperArm", "p", -0.06, 0.38, -0.2, 1.02]],
  biceps: [["upperArm", "a", 0.32, 0.9, 0.05, 1]],
  triceps: [["upperArm", "p", 0.28, 0.9, 0.05, 1]],
  forearms: [["forearm", "a", 0.04, 0.72, -0.3, 1], ["forearm", "p", 0.04, 0.72, 0, 1]],
  quads: [["thigh", "a", 0.12, 0.92, 0.05, 1]],
  hamstrings: [["thigh", "p", 0.18, 0.88, 0.05, 1]],
  calves: [["shin", "p", 0.08, 0.62, 0.05, 1]]
};
// Muscles always outlined faintly so the body reads as muscular.
const DEFINITION = ["chest", "abs", "glutes", "shoulders", "biceps", "triceps", "forearms", "quads", "hamstrings", "calves", "lats"];

function widthAt(prof, side, t) {
  const ts = prof.t, ws = prof[side];
  if (t <= ts[0]) return ws[0];
  for (let i = 1; i < ts.length; i++) {
    if (t <= ts[i]) {
      const u = (t - ts[i - 1]) / (ts[i] - ts[i - 1]);
      const s = u * u * (3 - 2 * u);
      return ws[i - 1] + (ws[i] - ws[i - 1]) * s;
    }
  }
  return ws[ws.length - 1];
}

// A bone: start, end, optional curve control point, and which way is "front".
function bone(p0, p1, ctrl, frontSign) {
  return {
    at(t) {
      if (!ctrl) return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
      const u = 1 - t;
      return [u * u * p0[0] + 2 * u * t * ctrl[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * ctrl[1] + t * t * p1[1]];
    },
    front(t) {
      let dx, dy;
      if (!ctrl) { dx = p1[0] - p0[0]; dy = p1[1] - p0[1]; }
      else { const u = 1 - t; dx = 2 * u * (ctrl[0] - p0[0]) + 2 * t * (p1[0] - ctrl[0]); dy = 2 * u * (ctrl[1] - p0[1]) + 2 * t * (p1[1] - ctrl[1]); }
      const l = Math.hypot(dx, dy) || 1;
      return [(dy / l) * frontSign, (-dx / l) * frontSign];
    }
  };
}

function closedPath(pts) {
  // Smooth closed curve through the points (Catmull-Rom as cubic Béziers).
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

function limbPath(b, prof, samples = 9) {
  const front = [], back = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples, c = b.at(t), n = b.front(t);
    const wa = widthAt(prof, "a", t), wp = widthAt(prof, "p", t);
    front.push([c[0] + n[0] * wa, c[1] + n[1] * wa]);
    back.push([c[0] - n[0] * wp, c[1] - n[1] * wp]);
  }
  // Round the ends by adding a point just past each joint.
  const cap = (t, back, w) => {
    const c = b.at(t), c2 = b.at(t + (back ? -0.02 : 0.02));
    const dx = c[0] - c2[0], dy = c[1] - c2[1], l = Math.hypot(dx, dy) || 1;
    return [c[0] + (dx / l) * w * 0.6, c[1] + (dy / l) * w * 0.6];
  };
  const w0 = (widthAt(prof, "a", 0) + widthAt(prof, "p", 0)) / 2, w1 = (widthAt(prof, "a", 1) + widthAt(prof, "p", 1)) / 2;
  return closedPath([cap(0, false, w0), ...front, cap(1, true, w1), ...back.reverse()]);
}

function musclePath(b, prof, side, t0, t1, f0, f1) {
  const outer = [], inner = [], N = 7, s = side === "a" ? 1 : -1;
  for (let i = 0; i <= N; i++) {
    const u = i / N, t = t0 + (t1 - t0) * u, c = b.at(Math.min(1, Math.max(0, t))), n = b.front(Math.min(1, Math.max(0, t)));
    const w = widthAt(prof, side, t);
    const bulge = Math.pow(Math.sin(Math.PI * u), 0.55);
    const fo = f0 + (f1 - f0) * bulge, fi = f0 + (f1 - f0) * 0.12 * bulge;
    outer.push([c[0] + n[0] * s * w * fo, c[1] + n[1] * s * w * fo]);
    if (i > 0 && i < N) inner.push([c[0] + n[0] * s * w * fi, c[1] + n[1] * s * w * fi]);
  }
  return closedPath([...outer, ...inner.reverse()]);
}

// ---------- SVG helpers ----------
function el(name, attrs, parent) {
  const n = document.createElementNS(SVG_NS, name);
  Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
  if (parent) parent.appendChild(n);
  return n;
}
function linePath(a, b) { return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`; }

// Which bones each posture highlight outlines.
const HIGHLIGHT_BONES = {
  spine: ["torso"], neck: ["neck"], upperArm: ["upperArm"], forearm: ["forearm"], arm: ["upperArm", "forearm"],
  thigh: ["thigh"], shin: ["shin"], foot: ["foot"], leg: ["thigh", "shin"]
};
const HIGHLIGHT_JOINTS = ["knee", "hip", "elbow", "shoulder", "ankle", "hand", "spineMid", "head"];

// Builds the bones (with shapes) for the current joint positions.
function sideBones(j) {
  const B = {
    torso: bone(j.hip, j.shoulder, j.spineCtrl, -1),
    neck: bone(j.shoulder, j.neck, null, -1),
    thigh: bone(j.hip, j.knee, null, 1),
    shin: bone(j.knee, j.ankle, null, 1),
    foot: bone(j.ankle, j.toe, null, 1),
    upperArm: bone(j.shoulder, j.elbow, null, 1),
    forearm: bone(j.elbow, j.hand, null, 1)
  };
  if (j.knee2) {
    B.thigh2 = bone(j.hip, j.knee2, null, 1);
    B.shin2 = bone(j.knee2, j.ankle2, null, 1);
    B.foot2 = bone(j.ankle2, j.toe2, null, 1);
  }
  return B;
}

function shift(j, dx, dy) {
  const o = {};
  Object.keys(j).forEach((k) => { o[k] = Array.isArray(j[k]) ? [j[k][0] + dx, j[k][1] + dy] : j[k]; });
  return o;
}

// Square view box that fits the whole rep (both poses, equipment and floor) with a margin,
// so the character fills its frame.
function fitView(fig, poseA, poseB) {
  const pts = [];
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const p = lerpPose(poseA, poseB, t);
    const j = fig.view === "front" ? solveFront(p) : solveSide(p);
    Object.values(j).forEach((v) => { if (Array.isArray(v)) pts.push(v); });
  });
  (fig.props || []).forEach((pr) => {
    if (pr.line) pts.push([pr.line[0], pr.line[1]], [pr.line[2], pr.line[3]]);
    if (pr.rect) pts.push([pr.rect[0], pr.rect[1]], [pr.rect[0] + pr.rect[2], pr.rect[1] + pr.rect[3]]);
  });
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  let x0 = Math.min(...xs) - 16, x1 = Math.max(...xs) + 16, y0 = Math.min(...ys) - 16, y1 = Math.max(...ys) + 12;
  if (!fig.noFloor) y1 = Math.max(y1, 194);
  const size = Math.max(x1 - x0, y1 - y0, 110);
  const cx = (x0 + x1) / 2;
  // Keep the floor at the bottom edge; centre horizontally.
  const top = fig.noFloor ? (y0 + y1) / 2 - size / 2 : y1 - size;
  return `${(cx - size / 2).toFixed(1)} ${top.toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`;
}

// Builds an SVG for one exercise. mode: "good" or "bad". opts.animate: true/false.
function createFigure(ex, mode, opts = {}) {
  const fig = ex.figure;
  const fault = mode === "bad" ? ex.bad : null;
  const poseA = { ...fig.a, view: fig.view, armsOut: fig.armsOut, ...(fault && fault.a) };
  const poseB = { ...fig.b, view: fig.view, armsOut: fig.armsOut, ...(fault && fault.b) };
  const highlight = (mode === "bad" ? ex.bad.highlight : ex.good.highlight) || [];
  const color = mode === "bad" ? "var(--bad)" : "var(--good)";
  const front = fig.view === "front";
  const primary = ex.primary || [], secondary = ex.secondary || [];

  const svg = el("svg", { viewBox: fitView(fig, poseA, poseB), class: "figure figure-" + mode, role: "img",
    "aria-label": `${ex.name}: ${mode === "bad" ? "common mistake" : "correct form"}` });
  if (!fig.noFloor) el("line", { x1: -200, y1: 189, x2: 400, y2: 189, class: "fig-floor" }, svg);
  (fig.props || []).forEach((pr) => {
    if (pr.line) el("line", { x1: pr.line[0], y1: pr.line[1], x2: pr.line[2], y2: pr.line[3], class: "fig-equip", "stroke-width": pr.w || 6 }, svg);
    if (pr.rect) el("rect", { x: pr.rect[0], y: pr.rect[1], width: pr.rect[2], height: pr.rect[3], rx: 2, class: "fig-equip-fill" }, svg);
  });

  const loadBack = el("g", { class: "fig-load" }, svg);
  const glowG = el("g", { class: "fig-glow", stroke: color }, svg);
  const farG = el("g", { class: "fig-far" }, svg);
  const outlineG = el("g", { class: "fig-outline" }, svg);
  const skinG = el("g", { class: "fig-skin" }, svg);
  const defG = el("g", { class: "fig-def" }, svg);
  const shortsG = el("g", { class: "fig-shorts" }, svg);
  const workG = el("g", { class: "fig-work" }, svg);
  const headG = el("g", { class: "fig-headg" }, svg);
  const handG = el("g", {}, svg);
  const loadFront = el("g", { class: "fig-load" }, svg);
  const marks = el("g", { class: "fig-marks", stroke: color }, svg);

  // Head drawn in its own coordinates: up is -y, the face points +x (side view) or at you (front view).
  const head = el("g", {}, headG);
  if (front) {
    el("ellipse", { cx: -8.6, cy: 1, rx: 1.8, ry: 2.6, class: "fig-head-outline" }, head);
    el("ellipse", { cx: 8.6, cy: 1, rx: 1.8, ry: 2.6, class: "fig-head-outline" }, head);
    el("ellipse", { cx: 0, cy: 0, rx: 8.4, ry: 9.8, class: "fig-head-outline" }, head);
    el("ellipse", { cx: -8.6, cy: 1, rx: 1.5, ry: 2.3, class: "fig-skin-fill" }, head);
    el("ellipse", { cx: 8.6, cy: 1, rx: 1.5, ry: 2.3, class: "fig-skin-fill" }, head);
    el("ellipse", { cx: 0, cy: 0, rx: 8.2, ry: 9.6, class: "fig-skin-fill" }, head);
    el("path", { d: "M-8.4 -0.5 C-9.2 -9 -4 -11.6 0 -11.6 C4 -11.6 9.2 -9 8.4 -0.5 C7 -5.4 3.5 -6.6 0 -6.4 C-3.5 -6.6 -7 -5.4 -8.4 -0.5 Z", class: "fig-hair" }, head);
    el("circle", { cx: -3.1, cy: -0.6, r: 0.9, class: "fig-eye" }, head);
    el("circle", { cx: 3.1, cy: -0.6, r: 0.9, class: "fig-eye" }, head);
    el("path", { d: "M-2 5.2 Q0 6.4 2 5.2", class: "fig-mouth" }, head);
  } else {
    el("ellipse", { cx: 0, cy: 0, rx: 8.4, ry: 9.8, class: "fig-head-outline" }, head);
    el("path", { d: "M7.4 -1.5 L10.2 2.6 L7.6 3.6 Z M5.5 5.5 Q7.5 9.5 3 10.2 L0 9 Z", class: "fig-skin-fill" }, head);
    el("ellipse", { cx: 0, cy: 0, rx: 8.2, ry: 9.6, class: "fig-skin-fill" }, head);
    el("path", { d: "M-8.4 2 C-9.6 -7 -4 -11.2 1.5 -10.6 C6 -10.2 8.6 -7 8.4 -3.4 C6 -6.2 1.5 -6.6 -1.5 -5 C-3.5 -3.6 -4 -0.5 -4.6 2.5 C-6 3.5 -7.6 3.4 -8.4 2 Z", class: "fig-hair" }, head);
    el("ellipse", { cx: -1.6, cy: 0.8, rx: 1.6, ry: 2.4, class: "fig-def-fill" }, head);
    el("circle", { cx: 4.6, cy: -1.4, r: 0.9, class: "fig-eye" }, head);
  }

  const pool = {};
  function path(group, key, cls) {
    const id = group.getAttribute("class") + key;
    if (!pool[id]) pool[id] = el("path", cls ? { class: cls } : {}, group);
    return pool[id];
  }
  function circle(group, key, cls, r) {
    const id = group.getAttribute("class") + key;
    if (!pool[id]) pool[id] = el("circle", { class: cls, r }, group);
    return pool[id];
  }

  const loadType = fig.load && fig.load.type;
  const loadEls = {};
  if (loadType === "cable") { loadEls.cable = el("path", { class: "fig-cable" }, loadFront); loadEls.handle = el("circle", { r: 3.2, class: "fig-equip-fill" }, loadFront); }
  if (loadType === "barbell") loadEls.plate = el("circle", { r: fig.load.r || 13, class: "fig-plate" }, loadBack);
  if (loadType === "roller") loadEls.plate = el("circle", { r: 7, class: "fig-plate" }, loadFront);
  if (loadType === "footplate") loadEls.foot = el("path", { class: "fig-equip", "stroke-width": 7 }, loadFront);
  if (loadType === "dumbbell") {
    loadEls.db = el("g", {}, loadFront);
    loadEls.dbBar = el("path", { class: "fig-equip", "stroke-width": 3.5 }, loadEls.db);
    loadEls.dbA = el("rect", { width: 5, height: 11, rx: 1.5, class: "fig-plate" }, loadEls.db);
    loadEls.dbB = el("rect", { width: 5, height: 11, rx: 1.5, class: "fig-plate" }, loadEls.db);
    if (front) {
      loadEls.dbL = el("g", {}, loadFront);
      loadEls.dbLBar = el("path", { class: "fig-equip", "stroke-width": 3.5 }, loadEls.dbL);
      loadEls.dbLA = el("rect", { width: 5, height: 11, rx: 1.5, class: "fig-plate" }, loadEls.dbL);
      loadEls.dbLB = el("rect", { width: 5, height: 11, rx: 1.5, class: "fig-plate" }, loadEls.dbL);
    }
  }

  function drawDumbbell(g, bar, A, Bp, at, angle) {
    g.setAttribute("transform", `translate(${at[0].toFixed(1)} ${at[1].toFixed(1)}) rotate(${angle.toFixed(1)})`);
    bar.setAttribute("d", "M-8 0 L8 0");
    A.setAttribute("x", -10); A.setAttribute("y", -5.5);
    Bp.setAttribute("x", 5); Bp.setAttribute("y", -5.5);
  }

  function drawSide(pose) {
    const j = solveSide(pose);
    const B = sideBones(j);
    // Far arm and leg sit slightly behind the body.
    const jf = shift(j, -2.5, -1.5);
    const F = sideBones(jf);
    const farParts = [["upperArm", F.upperArm], ["forearm", F.forearm]];
    if (!j.knee2) farParts.push(["thigh", F.thigh], ["shin", F.shin], ["foot", F.foot]);
    else farParts.push(["thigh", B.thigh2], ["shin", B.shin2], ["foot", B.foot2]);
    farParts.forEach(([k, b], i) => { path(farG, "o" + i, "fig-far-outline").setAttribute("d", limbPath(b, PROFILES[k])); });
    farParts.forEach(([k, b], i) => { path(farG, "s" + i, "fig-far-skin").setAttribute("d", limbPath(b, PROFILES[k])); });
    const farHand = j.knee2 ? jf.hand : jf.hand;
    circle(farG, "hand", "fig-far-skin", 3.6).setAttribute("cx", farHand[0].toFixed(1));
    pool[farG.getAttribute("class") + "hand"].setAttribute("cy", farHand[1].toFixed(1));

    const order = ["thigh", "shin", "foot", "torso", "neck", "upperArm", "forearm"];
    order.forEach((k) => {
      const d = limbPath(B[k], PROFILES[k]);
      path(outlineG, k, "fig-outline-path").setAttribute("d", d);
      path(skinG, k, "fig-skin-fill").setAttribute("d", d);
    });
    // Shoulder cap (deltoid) so the arm joins the torso smoothly.
    const delt = circle(skinG, "delt", "fig-skin-fill", 7.6);
    delt.setAttribute("cx", j.shoulder[0].toFixed(1)); delt.setAttribute("cy", j.shoulder[1].toFixed(1));
    const deltO = circle(outlineG, "delt", "fig-outline-path", 7.6);
    deltO.setAttribute("cx", j.shoulder[0].toFixed(1)); deltO.setAttribute("cy", j.shoulder[1].toFixed(1));

    // Muscle definition, shorts, and the worked muscles.
    DEFINITION.forEach((m) => {
      (MUSCLE_SHAPES[m] || []).forEach((s, i) => {
        path(defG, m + i, "fig-def-path").setAttribute("d", musclePath(B[s[0]], PROFILES[s[0]], s[1], s[2], s[3], s[4], s[5]));
      });
    });
    const shorts = musclePathBoth(B.torso, PROFILES.torso, -0.04, 0.2) + " " + musclePathBoth(B.thigh, PROFILES.thigh, -0.02, 0.38);
    path(shortsG, "s", "fig-shorts-path").setAttribute("d", shorts);
    [...primary.map((m) => [m, "fig-work-primary"]), ...secondary.map((m) => [m, "fig-work-secondary"])].forEach(([m, cls]) => {
      (MUSCLE_SHAPES[m] || []).forEach((s, i) => {
        path(workG, m + i, cls).setAttribute("d", musclePath(B[s[0]], PROFILES[s[0]], s[1], s[2], s[3], s[4], s[5]));
      });
    });

    head.setAttribute("transform", `translate(${j.head[0].toFixed(1)} ${j.head[1].toFixed(1)}) rotate(${(j.neckAngle).toFixed(1)})`);
    const hand = path(handG, "hand", "fig-hand");
    hand.setAttribute("d", limbPath(bone(j.hand, j.handTip, null, 1), { t: [0, 1], a: [3.4, 2.6], p: [3.4, 2.8] }, 3));

    drawHighlights(j, B);
    drawLoad(j, pose);
  }

  function musclePathBoth(b, prof, t0, t1) {
    const fr = [], bk = [], N = 5;
    for (let i = 0; i <= N; i++) {
      const t = Math.min(1, Math.max(0, t0 + (t1 - t0) * (i / N))), c = b.at(t), n = b.front(t);
      const wa = widthAt(prof, "a", t) * 1.06, wp = widthAt(prof, "p", t) * 1.06;
      fr.push([c[0] + n[0] * wa, c[1] + n[1] * wa]); bk.push([c[0] - n[0] * wp, c[1] - n[1] * wp]);
    }
    return closedPath([...fr, ...bk.reverse()]);
  }

  function drawFront(pose) {
    const j = solveFront(pose);
    const tl = pose.tl ?? 1;
    // Torso: shoulders wide, waist narrow, hips medium.
    const sY = j.neckBase[1] + 4, wY = j.pelvis[1] - 18 * tl, hY = j.pelvis[1] + 6;
    const torso = closedPath([[100, sY - 3], [119, sY], [124, sY + 8], [118, sY + 26 * tl], [111, wY], [113, hY], [100, hY + 4], [87, hY], [89, wY], [82, sY + 26 * tl], [76, sY + 8], [81, sY]]);
    const limbs = [
      ["upperArm", bone(j.shoulder, j.elbow, null, 1)], ["forearm", bone(j.elbow, j.hand, null, 1)],
      ["upperArm", bone(j.shoulderL, j.elbowL, null, 1)], ["forearm", bone(j.elbowL, j.handL, null, 1)],
      ["thigh", bone(j.hip, j.knee, null, 1)], ["shin", bone(j.knee, j.ankle, null, 1)],
      ["thigh", bone(j.hipL, j.kneeL, null, 1)], ["shin", bone(j.kneeL, j.ankleL, null, 1)]
    ];
    const sym = (prof) => ({ t: prof.t, a: prof.a.map((w, i) => (w + prof.p[i]) / 2 * 0.92), p: prof.a.map((w, i) => (w + prof.p[i]) / 2 * 0.92) });
    const all = [["torso", null, torso], ...limbs.map(([k, b], i) => [k + i, b, limbPath(b, sym(PROFILES[k]))])];
    const neck = `M95 ${j.neckBase[1] + 2} L95 ${j.head[1] + 6} L105 ${j.head[1] + 6} L105 ${j.neckBase[1] + 2} Z`;
    all.push(["neck", null, neck]);
    ["ankle", "ankleL"].forEach((k, i) => all.push(["foot" + i, null, closedPath([[j[k][0] - 4, j[k][1] - 3], [j[k][0] + 4, j[k][1] - 3], [j[k][0] + 5 * (i ? -1 : 1), j[k][1] + 4], [j[k][0] - 3, j[k][1] + 4]])]));
    all.forEach(([k, , d]) => { path(outlineG, k, "fig-outline-path").setAttribute("d", d); });
    all.forEach(([k, , d]) => { path(skinG, k, "fig-skin-fill").setAttribute("d", d); });
    ["shoulder", "shoulderL"].forEach((k) => {
      const c = circle(skinG, k, "fig-skin-fill", 7); c.setAttribute("cx", j[k][0]); c.setAttribute("cy", j[k][1] + 1);
    });
    // Muscles seen from the front (or the back when bent over).
    const isBack = tl < 0.8;
    const bodyMuscles = {
      chest: isBack ? "" : `M100 ${sY + 2} C110 ${sY} 118 ${sY + 4} 117 ${sY + 12 * tl} C112 ${sY + 18 * tl} 104 ${sY + 18 * tl} 100 ${sY + 15 * tl} Z M100 ${sY + 2} C90 ${sY} 82 ${sY + 4} 83 ${sY + 12 * tl} C88 ${sY + 18 * tl} 96 ${sY + 18 * tl} 100 ${sY + 15 * tl} Z`,
      abs: isBack ? "" : `M95 ${sY + 18 * tl} L105 ${sY + 18 * tl} L104 ${hY - 2} L96 ${hY - 2} Z`,
      "upper-back": isBack ? `M88 ${sY + 2} L112 ${sY + 2} L108 ${sY + 18 * tl} L92 ${sY + 18 * tl} Z` : "",
      lats: isBack ? `M84 ${sY + 6} L92 ${sY + 18 * tl} L96 ${wY} L88 ${wY} Z M116 ${sY + 6} L108 ${sY + 18 * tl} L104 ${wY} L112 ${wY} Z` : "",
      traps: `M100 ${sY - 4} L112 ${sY} L100 ${sY + (isBack ? 10 : 2)} L88 ${sY} Z`,
      shoulders: "", "rear-delts": ""
    };
    const deltPath = (cx, cy) => `M${cx - 7} ${cy} a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z`;
    bodyMuscles.shoulders = deltPath(j.shoulder[0], j.shoulder[1] + 1) + deltPath(j.shoulderL[0], j.shoulderL[1] + 1);
    bodyMuscles["rear-delts"] = isBack ? bodyMuscles.shoulders : "";
    if (isBack) bodyMuscles.shoulders = "";
    Object.entries(bodyMuscles).forEach(([m, d]) => { path(defG, m, "fig-def-path").setAttribute("d", d); });
    path(shortsG, "s", "fig-shorts-path").setAttribute("d", closedPath([[88, hY - 6], [112, hY - 6], [116, hY + 16], [102, hY + 16], [100, hY + 8], [98, hY + 16], [84, hY + 16]]));
    [...primary.map((m) => [m, "fig-work-primary"]), ...secondary.map((m) => [m, "fig-work-secondary"])].forEach(([m, cls]) => {
      if (bodyMuscles[m]) path(workG, m, cls).setAttribute("d", bodyMuscles[m]);
    });
    head.setAttribute("transform", `translate(100 ${j.head[1].toFixed(1)})`);
    ["hand", "handL"].forEach((k) => { const c = circle(handG, k, "fig-skin-fill fig-hand-c", 3.6); c.setAttribute("cx", j[k][0]); c.setAttribute("cy", j[k][1]); });
    const Bf = { upperArm: [limbs[0][1], limbs[2][1]], forearm: [limbs[1][1], limbs[3][1]], torso: [], neck: [], thigh: [limbs[4][1], limbs[6][1]], shin: [limbs[5][1], limbs[7][1]] };
    drawHighlights(j, Bf, { torso, neck });
    drawLoad(j, pose);
  }

  function drawHighlights(j, B, frontPaths) {
    const segs = [...new Set(highlight.flatMap((h) => HIGHLIGHT_BONES[h] || []))];
    segs.forEach((k) => {
      let d;
      if (frontPaths && (k === "torso" || k === "neck")) d = frontPaths[k];
      else if (Array.isArray(B[k])) d = B[k].map((b) => limbPath(b, PROFILES[k])).join(" ");
      else if (B[k]) d = limbPath(B[k], PROFILES[k]);
      if (!d) return;
      path(glowG, k, "fig-glow-path").setAttribute("d", d);
      path(marks, k, "fig-hl").setAttribute("d", d);
    });
    highlight.filter((h) => HIGHLIGHT_JOINTS.includes(h) || h === "back").forEach((h) => {
      const keys = h === "back" ? ["spineMid"] : (frontPaths && h === "shoulder" ? ["shoulder", "shoulderL"] : [h]);
      keys.forEach((key) => {
        const p = j[key]; if (!p) return;
        const g = circle(glowG, "r" + key, "fig-ring-glow", 12); g.setAttribute("cx", p[0]); g.setAttribute("cy", p[1]); g.setAttribute("fill", color);
        const r = circle(marks, "r" + key, "fig-ring", 9); r.setAttribute("cx", p[0]); r.setAttribute("cy", p[1]);
      });
    });
  }

  function drawLoad(j, pose) {
    if (!loadType || loadType === "none") return;
    const L = fig.load, at = L.at ? j[L.at] : j.hand, off = L.offset || [0, 0];
    const c = [at[0] + off[0], at[1] + off[1]];
    if (loadEls.cable) {
      loadEls.cable.setAttribute("d", linePath(L.from, j.hand));
      loadEls.handle.setAttribute("cx", j.hand[0]); loadEls.handle.setAttribute("cy", j.hand[1]);
    }
    if (loadEls.plate) { loadEls.plate.setAttribute("cx", c[0]); loadEls.plate.setAttribute("cy", c[1]); }
    if (loadEls.db) {
      if (front) {
        drawDumbbell(loadEls.db, loadEls.dbBar, loadEls.dbA, loadEls.dbB, j.hand, 0);
        drawDumbbell(loadEls.dbL, loadEls.dbLBar, loadEls.dbLA, loadEls.dbLB, j.handL, 0);
      } else {
        drawDumbbell(loadEls.db, loadEls.dbBar, loadEls.dbA, loadEls.dbB, j.hand, (pose.fa || 0) - 90);
      }
    }
    if (loadEls.foot) {
      const fx = j.toe[0] - j.ankle[0], fy = j.toe[1] - j.ankle[1], fl = Math.hypot(fx, fy) || 1;
      const ux = fx / fl, uy = fy / fl;
      let px = -uy, py = ux;
      if (px * (j.knee[0] - j.ankle[0]) + py * (j.knee[1] - j.ankle[1]) > 0) { px = -px; py = -py; }
      const o = 7;
      loadEls.foot.setAttribute("d", linePath([j.ankle[0] - ux * 8 + px * o, j.ankle[1] - uy * 8 + py * o], [j.toe[0] + ux * 6 + px * o, j.toe[1] + uy * 6 + py * o]));
    }
  }

  const draw = front ? drawFront : drawSide;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  draw(opts.animate && !reduce ? poseA : poseB);
  if (opts.animate && !reduce) Animator.add(svg, (t) => draw(lerpPose(poseA, poseB, t)));
  return svg;
}

// One shared animation loop for every figure on the page.
const Animator = {
  items: [], running: false, start: performance.now(),
  add(svg, fn) {
    this.items.push({ svg, fn });
    if (!this.running) { this.running = true; requestAnimationFrame((t) => this.tick(t)); }
  },
  tick(now) {
    // Drop figures that were on the page and have since been removed.
    this.items = this.items.filter((it) => it.svg.isConnected || !it.seen);
    const period = 3200;
    const raw = ((now - this.start) % period) / period;
    // Ease in and out, with a short pause at each end of the rep.
    const t = Math.min(1, Math.max(0, (0.5 - 0.5 * Math.cos(raw * 2 * Math.PI)) * 1.3 - 0.15));
    this.items.forEach((it) => { if (it.svg.isConnected) { it.seen = true; it.fn(t); } });
    requestAnimationFrame((t2) => this.tick(t2));
  }
};

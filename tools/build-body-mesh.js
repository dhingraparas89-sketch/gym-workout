#!/usr/bin/env node
// Builds assets/body-mesh.js (the athletes' base meshes) from the MakeHuman 1.1 base mesh and
// macro targets, which the MakeHuman project released under CC0 1.0 (see assets/LICENSE-body-mesh.txt).
// Dev tool only: the site loads the generated asset and never runs this.
//
//   node tools/build-body-mesh.js <makehuman-data-dir> [out.js]
//
// <makehuman-data-dir> holds files fetched from github.com/makehumancommunity/makehuman
// (makehuman/data/...): base.obj and the targets named in BODIES / LOCAL below, flattened with "_"
// for "/" after "targets/" (e.g. macrodetails_caucasian-male-young.target).
//
// What it does:
//   1. MakeHuman base mesh + targets: a young adult male (more muscle, low fat) and female, plus
//      local muscle and fat modifiers (chest, lats, shoulders, arms, legs, belly, glutes).
//   2. A featureless head: MakeHuman's head is cut off at the upper neck and a new, clean quad head
//      is grown from the cut onto a smooth sculpted form (skull, brow, jaw, chin, blended into the
//      neck): no eyes, nose, mouth or ears.
//   3. Skin weights for this site's skeleton (js/figure3d.js skinDefs), from MakeHuman's joint helpers.
//   4. Moves the mesh from MakeHuman's A-pose and proportions onto the site's rest skeleton.
//   5. Packs topology, both bodies and the weights into one small script (quantized, base64).
"use strict";
const fs = require("fs"), path = require("path");
const DIR = process.argv[2], OUT = process.argv[3] || path.join(__dirname, "..", "assets", "body-mesh.js");
if (!DIR) { console.error("usage: node tools/build-body-mesh.js <makehuman-data-dir> [out.js]"); process.exit(1); }

// ---------- small vector helpers ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]), norm = (a) => mul(a, 1 / (len(a) || 1));
const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
// 3x3 matrices as arrays of 3 column vectors (the frame's x, y, z axes).
const mv = (M, v) => add(add(mul(M[0], v[0]), mul(M[1], v[1])), mul(M[2], v[2]));
const mtv = (M, v) => [dot(M[0], v), dot(M[1], v), dot(M[2], v)]; // transpose times v
const mm = (A, B) => [mv(A, B[0]), mv(A, B[1]), mv(A, B[2])];
const mT = (M) => [[M[0][0], M[1][0], M[2][0]], [M[0][1], M[1][1], M[2][1]], [M[0][2], M[1][2], M[2][2]]];
const Rx = (a) => [[1, 0, 0], [0, Math.cos(a), Math.sin(a)], [0, -Math.sin(a), Math.cos(a)]];
const Rz = (a) => [[Math.cos(a), Math.sin(a), 0], [-Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
// Frame from a y axis and a hint for z (made perpendicular); x = y cross z.
const frameYZ = (y, zh) => { y = norm(y); const z = norm(sub(zh, mul(y, dot(zh, y)))); return [cross(y, z), y, z]; };
const axisAngle = (ax, a) => { // rotation matrix (columns)
  const [x, y, z] = norm(ax), c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  return [[t * x * x + c, t * x * y + s * z, t * x * z - s * y], [t * x * y - s * z, t * y * y + c, t * y * z + s * x], [t * x * z + s * y, t * y * z - s * x, t * z * z + c]];
};
const quatOf = (M) => { // rotation matrix (columns) -> [x, y, z, w]
  const m00 = M[0][0], m11 = M[1][1], m22 = M[2][2], m01 = M[1][0], m10 = M[0][1], m02 = M[2][0], m20 = M[0][2], m12 = M[2][1], m21 = M[1][2];
  const tr = m00 + m11 + m22;
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s]; }
  if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11); return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
};

// ---------- 1. MakeHuman mesh and targets ----------
const V0 = [], faces = [], groupOfFace = [];
{
  let g = null;
  for (const line of fs.readFileSync(path.join(DIR, "base.obj"), "utf8").split("\n")) {
    if (line.startsWith("v ")) V0.push(line.split(/\s+/).slice(1, 4).map(Number));
    else if (line.startsWith("g ")) g = line.slice(2).trim();
    else if (line.startsWith("f ")) { faces.push(line.trim().split(/\s+/).slice(1).map((t) => parseInt(t, 10) - 1)); groupOfFace.push(g); }
  }
}
function applyTarget(V, name, w) {
  if (!w) return;
  const file = path.join(DIR, name.replace(/\//g, "_"));
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line || line[0] === "#") continue;
    const a = line.trim().split(/\s+/); if (a.length < 4) continue;
    const v = V[+a[0]]; v[0] += w * +a[1]; v[1] += w * +a[2]; v[2] += w * +a[3];
  }
}
// muscle and weight are MakeHuman's macro sliders (0..1, 0.5 = average); height likewise.
const LOCAL = (o) => ({
  "torso/torso-muscle-pectoral-incr.target": o.pec, "torso/torso-muscle-dorsi-incr.target": o.lat, "torso/torso-vshape-incr.target": o.vshape,
  "armslegs/{s}-upperarm-shoulder-muscle-incr.target": o.delt, "armslegs/{s}-upperarm-muscle-incr.target": o.arm, "armslegs/{s}-lowerarm-muscle-incr.target": o.fore,
  "armslegs/{s}-upperleg-muscle-incr.target": o.thigh, "armslegs/{s}-lowerleg-muscle-incr.target": o.calf,
  "armslegs/{s}-upperarm-fat-decr.target": o.lean, "armslegs/{s}-lowerarm-fat-decr.target": o.lean, "armslegs/{s}-upperleg-fat-decr.target": o.lean, "armslegs/{s}-lowerleg-fat-decr.target": o.lean,
  "stomach/stomach-pregnant-decr.target": o.belly, "buttocks/buttocks-volume-incr.target": o.glute || 0
});
const BODIES = {
  male: { sex: "male", muscle: 1.3, weight: 0.1, height: 0.5, prop: 0.5,
    local: LOCAL({ pec: 0.55, lat: 0.6, vshape: 0.25, delt: 0.6, arm: 0.5, fore: 0.45, thigh: 0.4, calf: 0.45, lean: 0.6, belly: 0.5 }) },
  female: { sex: "female", muscle: 0.95, weight: 0.3, height: 0.5, prop: 0.5,
    local: LOCAL({ pec: 0.15, lat: 0.35, vshape: 0.1, delt: 0.3, arm: 0.3, fore: 0.2, thigh: 0.45, calf: 0.4, lean: 0.55, belly: 0.45, glute: 0.35 }) }
};
if (process.env.NOLOCAL) Object.values(BODIES).forEach((b) => { b.local = {}; });
function makeBody(b) {
  const V = V0.map((v) => v.slice()), s = b.sex;
  ["caucasian", "african", "asian"].forEach((e) => applyTarget(V, `macrodetails/${e}-${s}-young.target`, 1 / 3));
  const m = Math.max(0, (b.muscle - 0.5) * 2), w = Math.max(0, (0.5 - b.weight) * 2);
  applyTarget(V, `universal-${s}-young-maxmuscle-averageweight.target`, m * (1 - w));
  applyTarget(V, `universal-${s}-young-maxmuscle-minweight.target`, m * w);
  applyTarget(V, `universal-${s}-young-averagemuscle-minweight.target`, (1 - m) * w);
  // Height and proportions targets are defined against the average-muscle body.
  const h = Math.max(0, (b.height - 0.5) * 2);
  applyTarget(V, `macrodetails/height/${s}-young-averagemuscle-averageweight-maxheight.target`, h);
  applyTarget(V, `macrodetails/proportions/${s}-young-averagemuscle-averageweight-idealproportions.target`, b.prop);
  // Local muscle and fat modifiers (MakeHuman 1.1 "modeling" targets, CC0): fuller chest, lats,
  // shoulders, arms and legs, less fat over the limbs and a flatter belly, so the muscles carry
  // the shape (each kept moderate: an athlete, not a bodybuilder).
  Object.entries(b.local || {}).forEach(([t, w]) => {
    if (t.includes("{s}")) ["r", "l"].forEach((sd) => applyTarget(V, t.replace("{s}", sd), w));
    else applyTarget(V, t, w);
  });
  // Joint centres: the mean of each joint helper's vertices.
  const J = {};
  faces.forEach((f, i) => { const g = groupOfFace[i]; if (g && g.startsWith("joint-")) (J[g.slice(6)] = J[g.slice(6)] || new Set()); if (g && g.startsWith("joint-")) f.forEach((v) => J[g.slice(6)].add(v)); });
  Object.keys(J).forEach((k) => { const ids = [...J[k]]; J[k] = mul(ids.reduce((a, i) => add(a, V[i]), [0, 0, 0]), 1 / ids.length); });
  return { V, J };
}

// Body faces only (no helper geometry), re-indexed.
const bodyFaces = faces.filter((f, i) => groupOfFace[i] === "body");
const used = [...new Set(bodyFaces.flat())].sort((a, b) => a - b), remap = new Map(used.map((v, i) => [v, i]));
let F = bodyFaces.map((f) => f.map((v) => remap.get(v)));
const bodies = {};
Object.keys(BODIES).forEach((k) => { const { V, J } = makeBody(BODIES[k]); bodies[k] = { P: used.map((i) => V[i].slice()), J }; });
let NV = used.length;

// ---------- 2. Faceless head ----------
// MakeHuman's head (face, eye and mouth pockets, ears) is cut off at the upper neck and replaced
// by a new, clean head: a quad mesh grown from the neck's cut edge and laid onto a smooth sculpted
// form (cranium, brow, cheek planes, jaw and chin, all blended into the neck), so the head has a
// human silhouette and no features at all, and joins the neck in one surface.
// The form is a signed distance field in the head's own frame (decimetres, about the head joint;
// x across, y up, z forward), scaled for the female's smaller head.
function headField(J, f) {
  const o = J.head;
  const ell = (c, r) => (p) => {
    const x = (p[0] - c[0]) / r[0], y = (p[1] - c[1]) / r[1], z = (p[2] - c[2]) / r[2];
    const k0 = Math.hypot(x, y, z), k1 = Math.hypot(x / r[0], y / r[1], z / r[2]);
    return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(...r);
  };
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const smax = (a, b, k) => -smin(-a, -b, k);
  const H = (process.env.HEADP || "").split(",").filter(Boolean).map(Number);
  const P = (i, d) => (H[i] != null && !isNaN(H[i]) ? H[i] : d);
  // Jaw line in (y, z): through the chin's underside, rising backwards to the angle of the jaw.
  const JA = [P(42, -0.86), P(43, 0.8)], JB = [P(44, -0.5), P(45, -0.1)];
  const JN = (() => { const dy = JB[0] - JA[0], dz = JB[1] - JA[1], l = Math.hypot(dy, dz); let n = [dz / l, -dy / l]; if (n[0] > 0) n = [-n[0], -n[1]]; return n; })();
  const parts = [
    // cranium: a long egg, widest above the ears
    [ell([0, P(0, 0.5), P(1, 0.0)], [P(2, 0.74), P(3, 1.0), P(4, 1.0)]), 0],
    // forehead
    [ell([0, P(5, 0.72), P(6, 0.42)], [P(7, 0.6), P(8, 0.55), P(9, 0.56)]), P(10, 0.25)],
    // face mass: brow to upper jaw
    [ell([0, P(11, -0.08), P(12, 0.42)], [P(13, 0.53), P(14, 0.72), P(15, 0.6)]), P(16, 0.34)],
    // jaw: tapers to the chin
    [ell([0, P(17, -0.5), P(18, 0.35)], [P(19, 0.52), P(20, 0.36), P(21, 0.6)]), P(22, 0.2)],
    // chin
    [ell([0, P(23, -0.72), P(24, 0.76)], [P(25, 0.24), P(26, 0.2), P(27, 0.21)]), P(28, 0.18)],
    // cheek planes (broad and low, no sockets)
    [ell([P(29, 0.32), P(30, -0.02), P(31, 0.48)], [P(32, 0.3), P(33, 0.38), P(34, 0.4)]), P(35, 0.35)],
    [ell([-P(29, 0.32), P(30, -0.02), P(31, 0.48)], [P(32, 0.3), P(33, 0.38), P(34, 0.4)]), P(35, 0.35)]
  ];
  // The neck (fitted to the cut by the caller): an elliptic column leaning forward a little.
  let neck = null;
  const field = (q) => {
    const p = [(q[0] - o[0]) / f, (q[1] - o[1]) / f, (q[2] - o[2]) / f];
    // The face (forehead down to the chin), its underside cut along the jaw line, which rises from
    // the chin to the angle of the jaw; then joined to the cranium.
    let fc = parts[1][0](p);
    for (let i = 2; i < parts.length; i++) fc = smin(fc, parts[i][0](p), parts[i][1]);
    const jl = (p[1] - JA[0]) * JN[0] + (p[2] - JA[1]) * JN[1];
    fc = smax(fc, jl, +(process.env.JAWK || 0.12));
    let d = smin(parts[0][0](p), fc, P(10, 0.25));
    d *= f;
    if (neck) {
      const { c, ax, rx, rz, top } = neck, r = sub(q, c), h = dot(r, ax), w = sub(r, mul(ax, h));
      const nd = Math.hypot(w[0] / rx, w[2] / rz) * Math.min(rx, rz) - Math.min(rx, rz);
      d = smin(d, Math.max(nd, h - top), +(process.env.NECKK || 0.5) * f);
    }
    return d;
  };
  field.setNeck = (n) => { neck = n; };
  field.grad = (q) => { const e = 0.004, g = [0, 0, 0]; for (let k = 0; k < 3; k++) { const a = q.slice(), b = q.slice(); a[k] += e; b[k] -= e; g[k] = (field(a) - field(b)) / (2 * e); } return g; };
  field.project = (q, n = 4) => { for (let i = 0; i < n; i++) { const g = field.grad(q), d = field(q), gg = dot(g, g) || 1; q = sub(q, mul(g, d / gg)); } return q; };
  return field;
}
{
  // Cut: every face touching a vertex above a plane through the upper neck (under the chin in
  // front, under the skull at the back), decided on the male; both bodies share the topology.
  const cutSide = (p, J) => {
    const jaw = J.jaw, hd = J.head, off = +(process.env.NECKCUT || 0.3);
    const yAt = jaw[1] - 0.1 + (hd[1] - 0.05 - (jaw[1] - 0.1)) * (jaw[2] - p[2]) / (jaw[2] - (hd[2] - 0.9));
    return p[1] - (yAt - off);
  };
  const Jm = bodies.male.J;
  let keep = F.filter((fc) => !fc.some((v) => cutSide(bodies.male.P[v], Jm) > 0));
  {
    const par = Array.from({ length: NV }, (_, i) => i), find = (x) => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
    keep.forEach((fc) => fc.forEach((v) => { par[find(v)] = find(fc[0]); }));
    const size = new Map(); keep.forEach((fc) => { const r = find(fc[0]); size.set(r, (size.get(r) || 0) + 1); });
    const main = [...size].sort((a, b) => b[1] - a[1])[0][0];
    keep = keep.filter((fc) => find(fc[0]) === main);
  }
  const E = new Map();
  keep.forEach((fc) => fc.forEach((a, i) => { const b = fc[(i + 1) % fc.length]; E.set(a + "," + b, [a, b]); }));
  const nxt = new Map(); E.forEach(([a, b]) => { if (!E.has(b + "," + a)) nxt.set(b, a); });
  // The neck's edge (the only hole: the hands and feet are closed).
  const loops = []; const seen = new Set();
  nxt.forEach((_, s0) => { if (seen.has(s0)) return; const lp = [s0]; seen.add(s0); let v = nxt.get(s0); while (v !== s0 && v != null && !seen.has(v)) { lp.push(v); seen.add(v); v = nxt.get(v); } loops.push(lp); });
  loops.sort((a, b) => b.length - a.length);
  const loop = loops[0], n = loop.length;
  console.log("neck cut: loop", n, "other holes", loops.slice(1).map((l) => l.length).join(",") || "none");
  F = keep;
  // New head topology: R rings of m vertices up to the crown (m = the cut edge's count when it is
  // even, so the first ring joins it with plain quads), then an A x B grid over the crown (no pole).
  const m = n % 2 === 0 && !process.env.HEADM ? n : +(process.env.HEADM || n + 1), R = +(process.env.HEADR || 26), CAP = +(process.env.HEADCAP || 0.8);
  const GA = Math.floor(m / 4), GB = m / 2 - GA;
  const ringIds = []; for (let r = 0; r < R; r++) { const ids = []; for (let j = 0; j < m; j++) ids.push(NV++); ringIds.push(ids); }
  const grid = []; for (let i = 0; i <= GA; i++) { grid.push([]); for (let j = 0; j <= GB; j++) grid[i].push(null); }
  // Grid boundary = the last ring, walked round the rectangle.
  const last = ringIds[R - 1];
  { let q = 0; for (let s = 0; s < GB; s++) grid[0][s] = last[q++]; for (let s = 0; s < GA; s++) grid[s][GB] = last[q++]; for (let s = 0; s < GB; s++) grid[GA][GB - s] = last[q++]; for (let s = 0; s < GA; s++) grid[GA - s][0] = last[q++]; }
  for (let i = 1; i < GA; i++) for (let j = 1; j < GB; j++) grid[i][j] = NV++;
  // Strip between the cut edge (n, walked against the winding) and ring 1 (m): by arc parameter.
  const lpar = (P) => { const L = [0]; for (let i = 1; i <= n; i++) L.push(L[i - 1] + len(sub(P[loop[i % n]], P[loop[i - 1]]))); return L.map((x) => x / L[n]); };
  const LP = lpar(bodies.male.P);
  if (m === n) { const r1 = ringIds[0]; for (let i = 0; i < n; i++) F.push([loop[i], loop[(i + 1) % n], r1[(i + 1) % n], r1[i]]); }
  else {
    let i = 0, j = 0; const r1 = ringIds[0];
    while (i < n || j < m) {
      const ti = i < n ? LP[i + 1] : 2, tj = j < m ? (j + 1) / m : 2;
      if (ti <= tj) { F.push([loop[i % n], loop[(i + 1) % n], r1[j % m]]); i++; }
      else { F.push([loop[i % n], r1[(j + 1) % m], r1[j % m]]); j++; }
    }
  }
  for (let r = 0; r + 1 < R; r++) { const A = ringIds[r], B = ringIds[r + 1]; for (let j = 0; j < m; j++) F.push([A[j], A[(j + 1) % m], B[(j + 1) % m], B[j]]); }
  // Grid faces, wound to match the rings (checked against the ring's winding below).
  const gf = []; for (let i = 0; i < GA; i++) for (let j = 0; j < GB; j++) gf.push([grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]]);
  {
    // The ring's faces use edge last[s] -> last[s+1] reversed (B[j+1] -> B[j]); the grid must use it forward.
    const a = last[0], b = last[1]; const g0 = gf.find((fc) => fc.includes(a) && fc.includes(b));
    const ia = g0.indexOf(a), forward = g0[(ia + 1) % 4] === b;
    gf.forEach((fc) => F.push(forward ? fc : fc.slice().reverse()));
  }
  // Positions per body.
  Object.entries(bodies).forEach(([sex, b]) => {
    const { P, J } = b, f = (sex === "female" ? (J["head-2"][1] - J.head[1]) / 1.56 : 1) * +(process.env.HEADSCALE || 1.05);
    const field = headField(J, f);
    // Neck column fitted to the cut edge: centre, lean (towards a point under the skull) and radii.
    const c = mul(loop.reduce((a, v) => add(a, P[v]), [0, 0, 0]), 1 / n);
    const ax = norm(sub(add(J.head, [0, 0, +(process.env.NECKLEAN || 0.0) * f]), c));
    let rx = 0, rz = 0; loop.forEach((v) => { const w = sub(P[v], c); rx += Math.abs(w[0]); rz += Math.abs(w[2]); });
    rx = (rx / n) * (Math.PI / 2); rz = (rz / n) * (Math.PI / 2); // (the mean |offset| of an ellipse is 2/pi of its radius)
    rx = +(process.env.NECKRX || 0) * f || rx; rz = +(process.env.NECKRZ || 0) * f || rz;
    field.setNeck({ c: sub(c, mul(ax, 0.6)), ax, rx, rz, top: len(sub(J.head, c)) + 0.6 });
    // Directions from the cranium's centre: ring 1 below the cut edge's points, then along
    // great circles towards the crown.
    const C = add(J.head, mul((process.env.HEADC || "0,0.4,0.05").split(",").map(Number), f)), pole = norm([0, 1, -(+(process.env.POLEB || 0))]);
    const LPb = lpar(P);
    const at = (t) => { // point on the cut edge at arc parameter t
      let i = 0; while (i < n - 1 && LPb[i + 1] < t) i++;
      const u = (t - LPb[i]) / ((LPb[i + 1] - LPb[i]) || 1); return lerp(P[loop[i]], P[loop[(i + 1) % n]], u);
    };
    const ray = (d) => { // first exit of the field along C + s d
      let lo = 0, hi = 0.1; while (field(add(C, mul(d, hi))) < 0 && hi < 4) { lo = hi; hi += 0.1; }
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (field(add(C, mul(d, mid))) < 0) lo = mid; else hi = mid; }
      return add(C, mul(d, (lo + hi) / 2));
    };
    const T0 = +(process.env.HEADT0 || 0.06);
    // Spherical coordinates about the crown axis: each column keeps its azimuth (front, side, back)
    // and climbs from the cut edge's polar angle to the crown.
    const ex = norm(cross(pole, [0, 0, 1])), ez = cross(ex, pole); // ex across, ez forward
    for (let j = 0; j < m; j++) {
      const d0 = norm(sub(m === n ? P[loop[j]] : at(j / m), C)), th0 = Math.acos(Math.max(-1, Math.min(1, dot(d0, pole)))), ph = Math.atan2(dot(d0, ex), dot(d0, ez));
      for (let r = 0; r < R; r++) {
        const t = T0 + (CAP - T0) * (r / (R - 1)), th = th0 * (1 - t);
        P[ringIds[r][j]] = ray(add(add(mul(ex, Math.sin(th) * Math.sin(ph)), mul(pole, Math.cos(th))), mul(ez, Math.sin(th) * Math.cos(ph))));
      }
    }
    // Crown grid: Coons patch of the boundary directions, normalised, then onto the form.
    const D = (i, j) => norm(sub(P[grid[i][j]], C));
    for (let i = 1; i < GA; i++) for (let j = 1; j < GB; j++) {
      const u = j / GB, v = i / GA;
      const cp = add(add(mul(D(0, j), 1 - v), mul(D(GA, j), v)), add(mul(D(i, 0), 1 - u), mul(D(i, GB), u)));
      const bl = add(add(mul(D(0, 0), (1 - u) * (1 - v)), mul(D(0, GB), u * (1 - v))), add(mul(D(GA, 0), (1 - u) * v), mul(D(GA, GB), u * v)));
      P[grid[i][j]] = ray(norm(sub(cp, bl)));
    }
    b.headVerts = [...ringIds.flat(), ...grid.flat()].filter((v, i, a) => a.indexOf(v) === i);
    b.headField = field;
  });
  // Even out the new head (relax along the surface, then back onto the form); the first rings
  // blend into the neck below the cut.
  const nbh = new Map(); F.forEach((fc) => fc.forEach((a, i) => { const bb = fc[(i + 1) % fc.length]; if (!nbh.has(a)) nbh.set(a, new Set()); if (!nbh.has(bb)) nbh.set(bb, new Set()); nbh.get(a).add(bb); nbh.get(bb).add(a); }));
  Object.values(bodies).forEach((b) => {
    const { P } = b, HV = b.headVerts, field = b.headField;
    for (let it = 0; it < +(process.env.HEADRELAX || 120); it++) {
      const Np = HV.map((v) => { let c = [0, 0, 0]; const s = nbh.get(v); s.forEach((u) => { c = add(c, P[u]); }); return lerp(P[v], mul(c, 1 / s.size), 0.5); });
      HV.forEach((v, i) => { P[v] = field.project(Np[i], 2); });
    }
    // Seam: a few smoothing passes over the cut edge and the rings next to it (both sides).
    const band = new Set(loop); for (let r = 0; r < +(process.env.SEAMR || 4); r++) [...band].forEach((v) => nbh.get(v).forEach((u) => band.add(u)));
    const B = [...band];
    for (let it = 0; it < +(process.env.SEAMIT || 14); it++) for (const k of [0.5, -0.53]) {
      const Np = B.map((v) => { let c = [0, 0, 0]; const s = nbh.get(v); s.forEach((u) => { c = add(c, P[u]); }); return add(P[v], mul(sub(mul(c, 1 / s.size), P[v]), k)); });
      B.forEach((v, i) => { P[v] = Np[i]; });
    }
    delete b.headField;
  });
}
// Vertex neighbours.
let NB;
function buildNB() {
  const s = Array.from({ length: NV }, () => new Set());
  F.forEach((f) => f.forEach((a, i) => { const b = f[(i + 1) % f.length]; s[a].add(b); s[b].add(a); }));
  NB = s.map((x) => [...x]);
}
buildNB();
// Remove vertices no face uses any more (inner pocket vertices).
{
  const live = new Uint8Array(NV); F.forEach((f) => f.forEach((v) => { live[v] = 1; }));
  const map = new Int32Array(NV).fill(-1); let n = 0;
  for (let v = 0; v < NV; v++) if (live[v]) map[v] = n++;
  F = F.map((f) => f.map((v) => map[v]));
  Object.values(bodies).forEach((b) => { b.P = b.P.filter((_, v) => live[v]); });
  NV = n; buildNB();
  const EC = new Map(); F.forEach((f) => f.forEach((a, i) => { const b = f[(i + 1) % f.length], k = Math.min(a, b) + "," + Math.max(a, b); EC.set(k, (EC.get(k) || 0) + 1); }));
  const bad = [...EC].filter(([, c]) => c !== 2);
  if (process.env.DEBUG) console.log("edges not shared by exactly two faces:", bad.length, bad.slice(0, 12).map(([k, c]) => k + ":" + c + "@" + bodies.male.P[+k.split(",")[0]].map((x) => x.toFixed(2))).join(" "));
}
if (process.env.DUMP) { fs.writeFileSync(process.env.DUMP, JSON.stringify({ F, NV, bodies: Object.fromEntries(Object.entries(bodies).map(([k, b]) => [k, { P: b.P, J: b.J }])) })); console.log("dumped"); }
// Taubin smoothing (no shrinking) weighted by a mask.
function taubin(P, mask, iters, lam = 0.5, mu = -0.53) {
  const T = P.map((p) => p.slice());
  for (let it = 0; it < iters; it++) for (const k of [lam, mu]) {
    for (let v = 0; v < NV; v++) {
      if (!mask[v]) continue;
      const n = NB[v]; let c = [0, 0, 0]; n.forEach((u) => { c = add(c, P[u]); });
      c = mul(c, 1 / n.length);
      T[v] = add(P[v], mul(sub(c, P[v]), k * mask[v]));
    }
    for (let v = 0; v < NV; v++) if (mask[v]) P[v] = T[v];
  }
}
// Fairing: the surface of least bending (bi-Laplacian, solved with conjugate gradients) over the
// masked vertices, the rest held fixed; then blended with the original by the mask, so features
// inside melt into a smooth surface that meets the untouched surface without a crease.
function fair(P, mask, iters = 4000) {
  const free = new Int32Array(NV).fill(-1), act = [];
  for (let v = 0; v < NV; v++) if (mask[v] > 0.35) { free[v] = act.length; act.push(v); }
  const band = new Set(act); act.forEach((v) => NB[v].forEach((u) => band.add(u)));
  const B = [...band];
  // y = L x on the band (x given per vertex), z = L^T y on the free vertices.
  const LtL = (get) => {
    const y = new Map();
    B.forEach((v) => { const n = NB[v]; let c = 0; n.forEach((u) => { c += get(u); }); y.set(v, c / n.length - get(v)); });
    return act.map((v) => { let z = -(y.get(v) || 0); NB[v].forEach((u) => { if (y.has(u)) z += y.get(u) / NB[u].length; }); return z; });
  };
  const sol = act.map((v) => P[v].slice());
  for (let k = 0; k < 3; k++) {
    // A x = b with A = LtL on the free set, b = -LtL(fixed part).
    const fixedOnly = (u) => (free[u] >= 0 ? 0 : P[u][k]);
    const b = LtL(fixedOnly).map((x) => -x);
    let x = act.map((v) => P[v][k]);
    const Ax = (vec) => LtL((u) => (free[u] >= 0 ? vec[free[u]] : 0));
    let r = Ax(x).map((q, i) => b[i] - q), p = r.slice(), rr = r.reduce((s, q) => s + q * q, 0);
    for (let it = 0; it < iters && rr > 1e-14; it++) {
      const Ap = Ax(p), a = rr / p.reduce((s, q, i) => s + q * Ap[i], 0);
      x = x.map((q, i) => q + a * p[i]); r = r.map((q, i) => q - a * Ap[i]);
      const rr2 = r.reduce((s, q) => s + q * q, 0); p = r.map((q, i) => q + (rr2 / rr) * p[i]); rr = rr2;
    }
    if (process.env.DEBUG) console.log("cg", k, rr.toExponential(2), act.length);
    act.forEach((v, i) => { sol[i][k] = x[i]; });
  }
  act.forEach((v, i) => { P[v] = sol[i]; });
}
Object.entries(bodies).forEach(([sex, b]) => {
  const { P, J } = b;
  // Nipples: the most forward point of each side of the chest, smoothed away in a small disc
  // (the breast's shape stays; the female wears a sports bra over it).
  const sh = J["r-shoulder"][1];
  [1, -1].forEach((sd) => {
    let best = -1;
    // The breast's apex: the centre of the most forward points on that side of the chest.
    const cand = P.filter((p) => p[1] > sh - 2.1 && p[1] < sh - 0.6 && p[0] * sd > 0.3 && p[0] * sd < 1.3);
    const zmax = Math.max(...cand.map((p) => p[2])), top = cand.filter((p) => p[2] > zmax - 0.04);
    const apex = mul(top.reduce((q, p) => add(q, p), [0, 0, 0]), 1 / top.length);
    P.forEach((p, v) => { if (best < 0 || len(sub(p, apex)) < len(sub(P[best], apex))) best = v; });
    const c = P[best], r = sex === "female" ? 0.55 : 0.3;
    if (process.env.DEBUG) console.log(sex, "nipple", c.map((x) => x.toFixed(2)), P.filter((p) => len(sub(p, c)) < r).length);
    const bef = P.map((p) => p.slice());
    fair(P, P.map((p) => (len(sub(p, c)) < r ? 1 : 0)));
    // The female's breast as a rounded form (MakeHuman's is a little conical): the apex is
    // eased back and the area around it evened out.
    if (sex === "female") {
      const RB = +(process.env.BR || 0.42), DB = +(process.env.BD || 0.09);
      P.forEach((p, v) => { const q = Math.hypot(p[0] - c[0], p[1] - c[1]); if (q < 3 * RB && p[2] > c[2] - 0.8) P[v] = [p[0], p[1], p[2] - DB * Math.exp(-((q / RB) ** 2))]; });
      taubin(P, P.map((p) => { const q = Math.hypot(p[0] - c[0], p[1] - c[1]); return p[2] > c[2] - 0.8 ? 0.6 * (1 - smooth(0.4, 0.8, q)) : 0; }), 4);
    }
    if (process.env.DEBUG) { let mi = 0; P.forEach((p, v) => { if (len(sub(p, bef[v])) > len(sub(P[mi], bef[mi]))) mi = v; }); console.log("moved", len(sub(P[mi], bef[mi])).toFixed(3), bef[mi].map((x) => x.toFixed(2))); }
  });
  // Groin: a smooth mannequin form (it is always under the shorts).
  const pv = J.pelvis, gr = P.map((p) => (1 - smooth(pv[1] - 0.75, pv[1] - 0.45, p[1])) * smooth(pv[1] - 1.9, pv[1] - 1.6, p[1]) * (1 - smooth(0.42, 0.6, Math.abs(p[0]))) * smooth(pv[2] + 0.05, pv[2] + 0.35, p[2]));
  fair(P, gr);
});

// ---------- 3. Site skeleton (rest pose, js/figure3d.js skinDefs) ----------
const SKEL = { male: { SH: 17, HH: 8.5 }, female: { SH: 15.6, HH: 8.5 } };
function siteRest(sex) {
  const { SH, HH } = SKEL[sex], R = {}, I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  R.lowerTorso = { o: [0, 0, 0], M: I }; R.upperTorso = { o: [0, 26, 0], M: I }; R.neck = { o: [0, 51, 0], M: I }; R.head = { o: [0, 66.5, 0], M: I };
  [1, -1].forEach((side) => {
    const s = side > 0 ? "R" : "L", armQ = mm(Rx(-side * 0.35), Rz(Math.PI)), legQ = mm(Rx(-side * 0.16), Rz(Math.PI));
    const sh = [0, 49, side * SH], el = add(sh, mv(armQ, [0, 30, 0])), wr = add(el, mv(armQ, [0, 27, 0]));
    R["upperArm" + s] = { o: sh, M: armQ }; R["forearm" + s] = { o: el, M: armQ }; R["hand" + s] = { o: wr, M: armQ };
    const hip = [0, 0, side * HH], kn = add(hip, mv(legQ, [0, 42, 0])), an = add(kn, mv(legQ, [0, 42, 0]));
    R["thigh" + s] = { o: hip, M: legQ }; R["shin" + s] = { o: kn, M: legQ }; R["foot" + s] = { o: an, M: mm(Rx(-side * 0.16), Rz(-Math.PI / 2)) };
  });
  return R;
}
// Bones of the skinned mesh: the site's segments, then each hand's finger and thumb bones.
const BONES = ["lowerTorso", "upperTorso", "neck", "head"];
["R", "L"].forEach((s) => BONES.push("upperArm" + s, "forearm" + s, "hand" + s, "thigh" + s, "shin" + s, "foot" + s));
const FINGERS = [2, 3, 4, 5]; // MakeHuman finger numbers for index, middle, ring, little (site order)
["R", "L"].forEach((s) => { FINGERS.forEach((_, f) => [0, 1, 2].forEach((i) => BONES.push(`f${s}${f}${i}`))); BONES.push(`t${s}0`, `t${s}1`); });
const BI = Object.fromEntries(BONES.map((b, i) => [b, i]));

// ---------- 4. Skin weights and retarget (per body) ----------
// MakeHuman: x = the body's left, y up, z forward (decimetres). Site: x forward, y up, z = right side (cm).
const out = {};
Object.entries(bodies).forEach(([sex, b]) => {
  const { P, J } = b, R = siteRest(sex), { SH, HH } = SKEL[sex];
  const side = { R: 1, L: -1 }, mhSide = { R: "r", L: "l" };
  // Trunk: a smooth vertical remap (hips -> 0, shoulder joints -> 49) and a scale across; the
  // centre line runs from the hip joints' depth to the shoulders' depth.
  const hipY = (J["r-upper-leg"][1] + J["l-upper-leg"][1]) / 2, shY = (J["r-shoulder"][1] + J["l-shoulder"][1]) / 2;
  const zHip = (J["r-upper-leg"][2] + J["l-upper-leg"][2]) / 2, zSh = (J["r-shoulder"][2] + J["l-shoulder"][2]) / 2;
  const kT = 49 / (shY - hipY), kH = 10, kL = kT * 0.97, kD = kT * 0.97;
  if (process.env.STATS) console.log(sex, JSON.stringify({ torso: shY - hipY, shHalf: J["r-shoulder"][0], hipHalf: J["r-upper-leg"][0], leg: J["r-upper-leg"][1] - J["r-ankle"][1],
    ua: len(sub(J["r-elbow"], J["r-shoulder"])), fa: len(sub(J["r-hand"], J["r-elbow"])), top: Math.max(...P.map((p) => p[1])) - shY, kT }));
  const zc = (y) => zHip + (zSh - zHip) * Math.min(1, Math.max(0, (y - hipY) / (shY - hipY)));
  // Above the shoulders the head and neck keep MakeHuman's own scale (kH); the slope changes smoothly.
  const yMap = (y) => {
    const c = 0.75, w = 0.45, d = y - shY - c, Y0 = 49 + (c - w) * kT;
    if (d < -w) return 49 + (y - shY) * kT;
    const t = Math.min(1, (d + w) / (2 * w)), Y = Y0 + 2 * w * (kT * t + ((kH - kT) * t * t) / 2);
    return d > w ? Y + (d - w) * kH : Y;
  };
  const trunk = (p) => [(p[2] - zc(p[1])) * kD, yMap(p[1]), -p[0] * kL];
  // Limb chains in MakeHuman space, with the pivot points the trunk maps onto the site's joints.
  const pivotArm = (s) => [-side[s] * SH / kL, shY, zSh], pivotLeg = (s) => [-side[s] * HH / kL, hipY, zHip];
  const T = {}; // bone -> function(p, t) -> site position (rest)
  const chain = {};
  ["R", "L"].forEach((s) => {
    const m = mhSide[s], sd = side[s];
    const S0 = pivotArm(s), E0 = J[m + "-elbow"], W0 = J[m + "-hand"];
    const u = norm(sub(E0, S0)), f = norm(sub(W0, E0));
    let ax = norm(cross(u, f)); // elbow flexion axis: site local +z (for both sides the site frames are mirrored by armQ)
    // Site arm frames: local z points laterally for the right arm (side +1) and medially...
    // armQ maps local z to world +z for both sides, so the flexion axis must map to world +z too:
    // in MakeHuman space world +z (site) is -x; flip the axis to agree.
    if (dot(ax, [-1, 0, 0]) < 0) ax = mul(ax, -1);
    const Fu = frameYZ(u, ax), Ff0 = frameYZ(f, ax);
    // Palm: fingers along y, thumb side along side*z, the palm facing -x.
    const K = (n) => J[`${m}-finger-${n}-1`];
    const yh = norm(sub(K(3), W0)), th = mul(norm(sub(K(2), K(5))), sd);
    // The palm's z (thumb side) must map to site z for the right hand; site z = MakeHuman -x.
    const Fh = frameYZ(yh, th);
    // Forearm twist: from the elbow's frame to the hand's roll about the forearm.
    const Ff1 = frameYZ(f, Fh[2]);
    const tw = Math.atan2(dot(cross(Ff0[2], Ff1[2]), f), dot(Ff0[2], Ff1[2]));
    const lu = len(sub(E0, S0)), lf = len(sub(W0, E0));
    const A = R["upperArm" + s], B = R["forearm" + s], H = R["hand" + s];
    // Site frames as matrices; MakeHuman frames transposed. D scales along the bone and across.
    const map = (Fs, os, Fm, om, along, across) => (p) => {
      const l = mtv(Fm, sub(p, om));
      return add(os, mv(Fs.M, [l[0] * across, l[1] * along, l[2] * across]));
    };
    // Site frames for the limbs are armQ; their x/z are matched to the MakeHuman frames above via
    // the shared convention: y along the bone, z = flexion axis (pointing to site world +z), x = y cross z.
    T["upperArm" + s] = map(A, A.o, Fu, S0, 30 / lu, 10);
    T["forearm" + s] = (p) => {
      const t = smooth(0.1, 0.95, dot(sub(p, E0), f) / lf), Fm = frameYZ(f, mv(axisAngle(f, tw * t), Ff0[2]));
      return map(B, B.o, Fm, E0, 27 / lf, 10)(p);
    };
    // Hand: our knuckle line sits about 9.5 from the wrist.
    const lk = len(sub(K(3), W0));
    const hAlong = 9.4 / lk, hAcross = 9.6;
    T["hand" + s] = map(H, H.o, Fh, W0, hAlong, hAcross);
    // Fingers and thumb: every phalanx keeps its own direction relative to the palm (that is the
    // bind pose), mapped by the hand's transform so the knuckles line up exactly.
    const handMap = T["hand" + s];
    const fingerBones = [];
    FINGERS.forEach((n, fi) => {
      const pts = [1, 2, 3, 4].map((k) => J[`${m}-finger-${n}-${k}`]);
      [0, 1, 2].forEach((i) => fingerBones.push({ name: `f${s}${fi}${i}`, a: pts[i], b: pts[i + 1], parent: i ? `f${s}${fi}${i - 1}` : "hand" + s }));
    });
    const tp = [1, 2, 3, 4].map((k) => J[`${m}-finger-1-${k}`]);
    fingerBones.push({ name: `t${s}0`, a: tp[0], b: tp[1], parent: "hand" + s }, { name: `t${s}1`, a: tp[1], b: tp[3], parent: `t${s}0` });
    // Each phalanx: a rigid map with the hand's scale, about its base joint; the site gets its
    // bind frame (in hand space) and its base position, so the runtime skeleton matches.
    const fb = {};
    fingerBones.forEach((bn) => {
      const dir = norm(sub(bn.b, bn.a)), Fm = frameYZ(dir, Fh[2]);
      const os = handMap(bn.a);
      // Site frame: the hand's site frame times the phalanx's frame relative to the palm.
      const rel = mm(mT(Fh), Fm); // phalanx axes in palm coordinates
      const Ms = mm(H.M, rel);
      T[bn.name] = map({ M: Ms }, os, Fm, bn.a, hAlong, hAcross);
      fb[bn.name] = { base: os, M: Ms, len: len(sub(bn.b, bn.a)) * hAlong, parent: bn.parent, a: bn.a, b: bn.b };
    });
    chain[s] = { fingerBones: fb, Fh, W0 };
    // Legs.
    const H0 = pivotLeg(s), K0 = J[m + "-knee"], A0 = J[m + "-ankle"];
    const lat = [-1, 0, 0]; // the site's limb frames all map local z to world +z (MakeHuman -x)
    const Ft = frameYZ(sub(K0, H0), lat), Fs = frameYZ(sub(A0, K0), lat);
    T["thigh" + s] = map(R["thigh" + s], R["thigh" + s].o, Ft, H0, 42 / len(sub(K0, H0)), 10);
    T["shin" + s] = map(R["shin" + s], R["shin" + s].o, Fs, K0, 42 / len(sub(A0, K0)), 10);
    // Foot: x down, y forward (MakeHuman +z), z the site's z.
    const fwd = norm([J[m + "-foot-2"][0] - A0[0], 0, J[m + "-foot-2"][2] - A0[2]]);
    const Ffo = frameYZ(fwd, [-1, 0, 0]);
    T["foot" + s] = map(R["foot" + s], R["foot" + s].o, Ffo, A0, 10, 10);
  });
  ["lowerTorso", "upperTorso", "neck", "head"].forEach((n) => { T[n] = trunk; });

  // --- weights (MakeHuman space) ---
  const segs = [];
  const midY = (hipY + shY) / 2, neckY = shY + 0.25;
  segs.push({ g: "trunk", a: [0, hipY - 0.6, zHip], b: [0, shY, zSh], r: 13 });
  segs.push({ g: "trunk", a: [0, shY, zSh], b: J.head, r: 6 });
  segs.push({ g: "trunk", a: J.head, b: J["head-2"], r: 8.5 });
  ["R", "L"].forEach((s) => {
    const m = mhSide[s];
    segs.push({ g: "upperArm" + s, a: pivotArm(s), b: J[m + "-elbow"], r: 4.6 });
    segs.push({ g: "forearm" + s, a: J[m + "-elbow"], b: J[m + "-hand"], r: 3.6 });
    const K3 = J[`${m}-finger-3-1`];
    segs.push({ g: "hand" + s, a: J[m + "-hand"], b: lerp(J[m + "-hand"], K3, 0.85), r: 2.6 });
    Object.entries(chain[s].fingerBones).forEach(([n, fb]) => segs.push({ g: n, a: fb.a, b: fb.b, r: n[0] === "t" ? 1.1 : 0.85 }));
    segs.push({ g: "thigh" + s, a: pivotLeg(s), b: J[m + "-knee"], r: 8.2 });
    segs.push({ g: "shin" + s, a: J[m + "-knee"], b: J[m + "-ankle"], r: 5.2 });
    segs.push({ g: "foot" + s, a: J[m + "-ankle"], b: J[m + "-foot-2"], r: 4.2 });
  });
  const groups = [...new Set(segs.map((q) => q.g))], GI = Object.fromEntries(groups.map((g, i) => [g, i]));
  const G = groups.length;
  let W = new Float32Array(NV * G);
  const segDist = (p, a, b) => { const ab = sub(b, a), t = Math.min(1, Math.max(0, dot(sub(p, a), ab) / dot(ab, ab))); return len(sub(p, add(a, mul(ab, t)))); };
  for (let v = 0; v < NV; v++) {
    const p = P[v]; let sum = 0;
    segs.forEach((q) => { const d = (segDist(p, q.a, q.b) * 10) / q.r, w = Math.pow(Math.max(d, 0.05), -8); W[v * G + GI[q.g]] += w; });
    for (let g = 0; g < G; g++) sum += W[v * G + g];
    for (let g = 0; g < G; g++) W[v * G + g] /= sum;
  }
  // Soften over the surface (a joint bends in a band, not along one edge loop).
  const W2 = new Float32Array(W.length);
  for (let it = 0; it < 6; it++) {
    for (let v = 0; v < NV; v++) {
      const n = NB[v];
      for (let g = 0; g < G; g++) { let a = 0; n.forEach((u) => { a += W[u * G + g]; }); W2[v * G + g] = W[v * G + g] * 0.5 + (a / n.length) * 0.5; }
    }
    W.set(W2);
  }
  // Split the trunk: pelvis and belly / ribcage and chest / neck / head (head = above a plane
  // under the jaw and the base of the skull).
  const jaw = J.jaw, hd = J.head;
  const headSide = (p) => { // signed height above the jaw-to-skull-base plane
    const yAt = jaw[1] - 0.1 + (hd[1] - 0.05 - (jaw[1] - 0.1)) * (jaw[2] - p[2]) / (jaw[2] - (hd[2] - 0.9));
    return p[1] - yAt;
  };
  const bw = new Float32Array(NV * BONES.length);
  for (let v = 0; v < NV; v++) {
    const p = P[v], tr = W[v * G + GI.trunk];
    const up = smooth(midY - 0.45, midY + 0.45, p[1]);
    // The neck bone carries the neck column only: the tops of the shoulders and the outer
    // trapezius stay with the chest (and the arms), so nodding never drags the shoulders and a
    // raised arm never leaves the top of the shoulder behind with the neck.
    const nk = smooth(neckY - 0.25, neckY + 0.25, p[1] + 0.25 * Math.max(0, Math.abs(p[0]) - 0.5)) * (1 - smooth(0.62, 0.95, Math.abs(p[0])));
    // The head turns on the neck in a band about 4 cm wide (under the jaw, at the skull base),
    // so a nod stretches the skin there instead of creasing it along one edge loop.
    const hh = smooth(-(+(process.env.HB || 0.5)), +(process.env.HB || 0.5), headSide(p) + (+(process.env.HOFF || 0)));
    const parts = { lowerTorso: (1 - up) * (1 - nk), upperTorso: up * (1 - nk), neck: nk * (1 - hh), head: nk * hh };
    Object.entries(parts).forEach(([n, w]) => { bw[v * BONES.length + BI[n]] = tr * w; });
    groups.forEach((g, gi) => { if (g !== "trunk") bw[v * BONES.length + BI[g]] = W[v * G + gi]; });
  }
  // Even the trunk's splits out over the surface a little (they are planes cut through the body).
  {
    const TB = ["lowerTorso", "upperTorso", "neck", "head"].map((n) => BI[n]), NBn = BONES.length, tmp = new Float32Array(NV * 4);
    for (let it = 0; it < 4; it++) {
      for (let v = 0; v < NV; v++) {
        const tot = TB.reduce((a, k) => a + bw[v * NBn + k], 0);
        if (tot < 1e-4) { TB.forEach((k, j) => { tmp[v * 4 + j] = 0; }); continue; }
        const acc = [0, 0, 0, 0]; let c = 0;
        NB[v].forEach((u) => { const tu = TB.reduce((a, k) => a + bw[u * NBn + k], 0); if (tu < 1e-4) return; TB.forEach((k, j) => { acc[j] += bw[u * NBn + k] / tu; }); c++; });
        TB.forEach((k, j) => { tmp[v * 4 + j] = tot * (c ? 0.5 * (bw[v * NBn + k] / tot) + 0.5 * (acc[j] / c) : bw[v * NBn + k] / tot); });
      }
      for (let v = 0; v < NV; v++) TB.forEach((k, j) => { bw[v * NBn + k] = tmp[v * 4 + j]; });
    }
  }
  // Retarget every vertex: blend the bones' maps by weight (the same weights the skin uses).
  const NB_ = BONES.length, Q = new Float32Array(NV * 3);
  for (let v = 0; v < NV; v++) {
    let acc = [0, 0, 0], ws = 0;
    for (let k = 0; k < NB_; k++) { const w = bw[v * NB_ + k]; if (w < 1e-4) continue; acc = add(acc, mul(T[BONES[k]](P[v]), w)); ws += w; }
    acc = mul(acc, 1 / ws);
    Q[v * 3] = acc[0]; Q[v * 3 + 1] = acc[1]; Q[v * 3 + 2] = acc[2];
  }
  // Top four bones per vertex.
  const si = new Uint8Array(NV * 4), sw = new Uint8Array(NV * 4);
  for (let v = 0; v < NV; v++) {
    const order = [...Array(NB_).keys()].sort((a, c) => bw[v * NB_ + c] - bw[v * NB_ + a]).slice(0, 4);
    const tot = order.reduce((t, k) => t + bw[v * NB_ + k], 0);
    let left = 255;
    order.forEach((k, i) => { const q = i === 3 ? left : Math.round((bw[v * NB_ + k] / tot) * 255); si[v * 4 + i] = k; sw[v * 4 + i] = Math.max(0, Math.min(left, q)); left -= sw[v * 4 + i]; });
  }
  // Finger and thumb bind frames, relative to the parent bone (rotation) and the base position
  // in the parent's frame (unscaled), for the runtime skeleton.
  const fingers = {};
  ["R", "L"].forEach((s) => {
    const H = R["hand" + s];
    Object.entries(chain[s].fingerBones).forEach(([n, fb]) => {
      const par = fb.parent.startsWith("hand") ? { base: H.o, M: H.M } : chain[s].fingerBones[fb.parent];
      const relM = mm(mT(par.M), fb.M), relP = mtv(par.M, sub(fb.base, par.base));
      fingers[n] = { q: quatOf(relM).map((x) => +x.toFixed(5)), p: relP.map((x) => +x.toFixed(3)), len: +fb.len.toFixed(3) };
    });
  });
  out[sex] = { Q, si, sw, fingers };
  if (process.env.DUMPQ) { const o = fs.existsSync(process.env.DUMPQ) ? JSON.parse(fs.readFileSync(process.env.DUMPQ)) : { F, bodies: {} }; o.F = F; o.bodies[sex] = { P: Array.from({ length: NV }, (_, v) => [Q[v * 3 + 2], Q[v * 3 + 1], Q[v * 3]].map((x) => x / 10)), J: {} }; fs.writeFileSync(process.env.DUMPQ, JSON.stringify(o)); }
  const ys = []; for (let v = 0; v < NV; v++) ys.push(Q[v * 3 + 1]);
  console.log(sex, "verts", NV, "y range", Math.min(...ys).toFixed(1), Math.max(...ys).toFixed(1));
});

// ---------- 5. Pack ----------
// Faces as quads (a triangle repeats its last index); positions quantized to 16 bits in the box.
const quads = new Uint16Array(F.length * 4);
F.forEach((f, i) => { const g = f.length === 4 ? f : [f[0], f[1], f[2], f[2]]; if (f.length > 4) throw new Error("n-gon"); quads.set(g, i * 4); });
const b64 = (arr) => Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString("base64");
const pack = (Q) => {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < NV; v++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], Q[v * 3 + k]); hi[k] = Math.max(hi[k], Q[v * 3 + k]); }
  const q = new Uint16Array(NV * 3);
  for (let v = 0; v < NV; v++) for (let k = 0; k < 3; k++) q[v * 3 + k] = Math.round(((Q[v * 3 + k] - lo[k]) / (hi[k] - lo[k])) * 65535);
  return { lo: lo.map((x) => +x.toFixed(4)), hi: hi.map((x) => +x.toFixed(4)), pos: b64(q) };
};
const data = { version: 1, bones: BONES, nv: NV, quads: b64(quads), skel: SKEL, bodies: {} };
Object.entries(out).forEach(([sex, o]) => { data.bodies[sex] = { ...pack(o.Q), si: b64(o.si), sw: b64(o.sw), fingers: o.fingers }; });
const header = `// Generated by tools/build-body-mesh.js from the MakeHuman 1.1 base mesh and macro targets
// (CC0 1.0, MakeHuman project; see assets/LICENSE-body-mesh.txt) with a new faceless head,
// retargeted to the site's skeleton. Do not edit by hand.
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + "window.BODY_MESH = " + JSON.stringify(data) + ";\n");
console.log("wrote", OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + " KB");

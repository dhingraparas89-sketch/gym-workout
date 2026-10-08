// 3D exercise character (needs three.js loaded as the global THREE).
//
// The body is built from shaded muscle shapes and driven by the same poses
// and joint limits as the 2D figure (see js/figure.js): the side-view angles
// move the body in its own plane, and "abd" swings the arms out to the side.
//
//   const viewer = createViewer3D(container, "good");   // or "bad"
//   viewer.setExercise(exercise);
//   viewer.dispose();
//
// Drag to turn the character; double-click to reset the view.

const VIEW3D = {
  near: 1,        // the near side of the body faces the camera (+z)
  shoulderHalf: 17,
  hipHalf: 8.5,
  yaw: 0.62,      // default camera angle around the figure (radians from a pure side view)
  pitch: 0.12,
  skin: "#45484d",       // matte charcoal mannequin
  active: "#3cc9ad",     // muscle activation on the optimal form (main movers full, helpers softer)
  activeBad: "#5a9bd0",  // muscle activation on the mistake
  compensate: "#e0913f", // muscles taking over the work in a mistake
  good: "#2be0a8",       // optimal form: teal-green
  bad: "#ff5a3c"         // corrections: red-orange
};

function css(name, fallback) {
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}

// ---------- Body ----------
// The body is ONE continuous skin, like an anatomical figure: each segment (pelvis, ribcage, neck,
// head, arms, palms, legs, feet) is a base shape with its muscles lying on it, and all of them are
// melted together into a single smooth surface, so muscles swell out of the body and flow into
// each other instead of sitting on top of it. The skin is bound to the segment groups, which
// act as bones. Every vertex remembers how much each muscle shapes it (to light worked muscles)
// and which way that muscle's fibers run.

// ---------- Skin builder ----------
// The math that turns the body's shapes into one continuous skin mesh (see makeBody3D).
function skinLatheR(L, y) {
  const u = ((y - L.y0) / (L.y1 - L.y0)) * L.N;
  if (u <= 0 || u >= L.N) return 0;
  const i = Math.floor(u), t = u - i;
  return L.tab[i] + (L.tab[i + 1] - L.tab[i]) * t;
}
// Cross-section shape at height y: depth (front-back half-axis over the width) and how far the
// section's centre sits toward local +x, so a profile can curve (lumbar curve, calf, chest).
function skinLatheShape(L, y) {
  const u = Math.min(L.N, Math.max(0, ((y - L.y0) / (L.y1 - L.y0)) * L.N));
  const i = Math.min(L.N - 1, Math.floor(u)), t = u - i;
  return [L.dtab[i] + (L.dtab[i + 1] - L.dtab[i]) * t, L.xtab[i] + (L.xtab[i + 1] - L.xtab[i]) * t];
}
// Approximate signed distance to an ellipsoid (negative inside).
function skinEllDist(f, x, y, z) {
  const dx = x - f.cx, dy = y - f.cy, dz = z - f.cz, m = f.m;
  const ax = (m[0] * dx + m[1] * dy + m[2] * dz) / f.rx, ay = (m[3] * dx + m[4] * dy + m[5] * dz) / f.ry, az = (m[6] * dx + m[7] * dy + m[8] * dz) / f.rz;
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const bx = ax / f.rx, by = ay / f.ry, bz = az / f.rz, k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(f.rx, f.ry, f.rz);
}
function skinLatheDist(L, x, y, z) {
  const r = skinLatheR(L, y), sh = skinLatheShape(L, y);
  x -= sh[1];
  if (r < 0.3) {
    const ey = y < L.y0 ? L.y0 - y : y > L.y1 ? y - L.y1 : 0;
    return Math.sqrt(x * x + z * z + ey * ey) - r;
  }
  const A = r * sh[0], ax = x / A, az = z / r, k0 = Math.sqrt(ax * ax + az * az);
  const bx = ax / A, bz = az / r, k1 = Math.sqrt(bx * bx + bz * bz);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -A;
}
function skinSmin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function skinSmooth(e0, e1, x) { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
// Field of one segment at a point in its own space; fd (optional) receives each muscle's distance.
function skinSegDist(seg, x, y, z, fd) {
  let d = seg.lathe ? skinLatheDist(seg.lathe, x, y, z) : skinEllDist(seg.ell, x, y, z);
  for (let i = 0; i < seg.feats.length; i++) {
    const f = seg.feats[i];
    // A muscle too far away to change the blend is skipped (unless every distance is wanted).
    if (!fd) { const dx = x - f.cx, dy = y - f.cy, dz = z - f.cz; if (Math.sqrt(dx * dx + dy * dy + dz * dz) - f.br > d + f.k + 1) continue; }
    const e = skinEllDist(f, x, y, z);
    if (fd) fd[i] = e;
    d = skinSmin(d, e, f.k);
  }
  return d;
}
// Fiber coordinates of a point (in its segment's space): u = distance from the attachment, v = which fiber.
function skinFiberUV(sp, x, y, z) {
  const qx = x - sp.O[0], qy = y - sp.O[1], qz = z - sp.O[2], N = sp.N;
  if (sp.t === "lin") return [Math.abs(qx * N[0] + qy * N[1] + qz * N[2]), (x * sp.C[0] + y * sp.C[1] + z * sp.C[2]) * sp.d];
  const along = qx * N[0] + qy * N[1] + qz * N[2];
  const ang = Math.atan2(qx * sp.B[0] + qy * sp.B[1] + qz * sp.B[2], qx * sp.R[0] + qy * sp.R[1] + qz * sp.R[2]); // 0 points into the muscle
  return [sp.t === "fan" ? Math.sqrt(qx * qx + qy * qy + qz * qz) : Math.abs(along), ang * sp.d];
}
// Build the skin from the prepared segments (see prepSegment in makeBody3D). Pure math, no
// three.js and no outside state, so it can also run in a background worker.
function buildSkinData(segs) {
  const S = segs.length, BIG = 1e3;
  const local = (g, x, y, z, out) => {
    const e = g.inv;
    out[0] = e[0] * x + e[4] * y + e[8] * z + e[12]; out[1] = e[1] * x + e[5] * y + e[9] * z + e[13]; out[2] = e[2] * x + e[6] * y + e[10] * z + e[14];
  };
  const P = [0, 0, 0], Q = [0, 0, 0];
  // Shorts: matte training shorts from just below the navel to mid-thigh. Returns how much a
  // rest-pose point is covered (0..1) and in out[1] how much extra fabric stands off the skin
  // there (the waistband and hems are a little thicker).
  const segIx = (n) => segs.findIndex((g) => g.name === n);
  const TORSO = segIx("lowerTorso"), CHEST = segIx("upperTorso"), THIGHS = [segIx("thighR"), segIx("thighL")], ARMS = [segIx("upperArmR"), segIx("upperArmL")];
  const CFG = (TORSO >= 0 && segs[TORSO].cloth) || { waist: 7.3, off: 0.55, hem: 21 };
  const clothOut = [0, 0];
  // Clothing: how much a rest-pose point is covered (0..1), and in out[1] how far the fabric stands
  // off the skin there (the waistband and hems a little thicker). Shorts from the waist to
  // mid-thigh; with CFG.top, a fitted sports top from under the chest up to the armpits, with straps.
  function cloth(x, y, z, out) {
    out[0] = 0; out[1] = 0;
    if (TORSO < 0) return 0;
    local(segs[TORSO], x, y, z, Q);
    const W = CFG.waist, hem = CFG.hem;
    let r = Math.hypot(Q[0], Q[2]), m = (1 - skinSmooth(W - 0.3, W + 0.3, Q[1])) * skinSmooth(-16, -14, Q[1]) * (1 - skinSmooth(17, 19, r)), lip = m * Math.exp(-(((Q[1] - (W - 0.7)) / 0.7) ** 2)), off = CFG.off;
    for (let i = 0; i < 2; i++) {
      const g = segs[THIGHS[i]];
      if (!g) continue;
      local(g, x, y, z, Q);
      r = Math.hypot(Q[0], Q[2]);
      const mt = (1 - skinSmooth(hem - 0.7, hem + 0.3, Q[1])) * skinSmooth(-14, -12, Q[1]) * (1 - skinSmooth(11, 13, r));
      if (mt > m) { m = mt; lip = mt * Math.exp(-(((Q[1] - (hem - 0.8)) / 0.8) ** 2)); }
    }
    const T = CFG.top;
    if (T && CHEST >= 0) {
      local(segs[CHEST], x, y, z, Q);
      const front = Q[0] > 0, az0 = Math.abs(Q[2]);
      // Scoop neckline in front, a racerback dipping between the shoulder blades behind.
      const top = (front ? T.y1 : T.back) - (az0 < 9 ? (front ? 4 : 2) * Math.cos((az0 / 9) * Math.PI / 2) : 0);
      let mt = skinSmooth(T.y0 - 0.3, T.y0 + 0.3, Q[1]) * (1 - skinSmooth(top - 0.3, top + 0.3, Q[1])) * (1 - skinSmooth(19, 21, Math.hypot(Q[0], Q[2])));
      // Straps over the shoulders, from the top's edge to the back: they start wide where they
      // leave the neckline and narrow as they climb outward over the shoulder.
      const az = Math.abs(Q[2]), sy = Q[1] - T.y1, sc = T.strap[0] + 0.3 * sy, sw = Math.max(1.2, T.strap[1] - 0.1 * sy);
      const strap = (1 - skinSmooth(sw - 0.35, sw + 0.35, Math.abs(az - sc))) * skinSmooth(top - 1.5, top, Q[1]) * (1 - skinSmooth(T.strapTop - 0.4, T.strapTop + 0.4, Q[1]));
      mt = Math.max(mt, strap);
      // Not on the arms: wherever the upper arm is nearer than the chest, the top stops.
      if (mt > 0 && az > 11) {
        const dc = skinLatheDist(segs[CHEST].lathe, Q[0] - 0, Q[1], Q[2]);
        for (let i = 0; i < 2; i++) {
          const g = segs[ARMS[i]]; if (!g) continue;
          local(g, x, y, z, Q);
          const da = skinLatheDist(g.lathe, Q[0], Q[1], Q[2]);
          mt *= skinSmooth(-0.6, 0.6, da - dc);
        }
      }
      if (mt > m) { m = mt; lip = 0; off = T.off; }
    }
    out[0] = m; out[1] = m * off + lip * 0.2;
    return m;
  }
  function field(x, y, z) {
    let F = BIG;
    for (let s = 0; s < S; s++) {
      const g = segs[s], b = g.box;
      if (x < b[0] || y < b[1] || z < b[2] || x > b[3] || y > b[4] || z > b[5]) continue;
      local(g, x, y, z, P);
      const d = skinSegDist(g, P[0], P[1], P[2]);
      F = F === BIG ? d : skinSmin(F, d, g.k || 3);
    }
    // Creases (gluteal fold, the cleft between the glutes, the lines across the abdomen) are
    // carved after every segment has been joined, so a neighbouring segment's blend can't fill
    // them back in. Fabric bridges the creases it covers and stands a little off the skin.
    const cm = cloth(x, y, z, clothOut), off = clothOut[1];
    const F0 = F;
    for (let s = 0; s < S; s++) {
      const g = segs[s];
      if (!g.cuts.length) continue;
      local(g, x, y, z, P);
      for (let i = 0; i < g.cuts.length; i++) { const c = g.cuts[i]; F = -skinSmin(-F, skinEllDist(c, P[0], P[1], P[2]), c.k); }
    }
    return F + (F0 - F) * cm - off;
  }

  // Sample the field on a grid: a coarse pass first, then fine samples only near the surface.
  const all = { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
  segs.forEach(({ box: b }) => {
    all.min.x = Math.min(all.min.x, b[0]); all.min.y = Math.min(all.min.y, b[1]); all.min.z = Math.min(all.min.z, b[2]);
    all.max.x = Math.max(all.max.x, b[3]); all.max.y = Math.max(all.max.y, b[4]); all.max.z = Math.max(all.max.z, b[5]);
  });
  const h = 0.85, C = 4, H = h * C;
  const nx = Math.ceil((all.max.x - all.min.x) / H) * C + 1, ny = Math.ceil((all.max.y - all.min.y) / H) * C + 1, nz = Math.ceil((all.max.z - all.min.z) / H) * C + 1;
  const ox = all.min.x, oy = all.min.y, oz = all.min.z;
  const cx = (nx - 1) / C + 1, cy = (ny - 1) / C + 1, cz = (nz - 1) / C + 1;
  const coarse = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) coarse[(k * cy + j) * cx + i] = field(ox + i * H, oy + j * H, oz + k * H);
  // Fine points start with their coarse cell's average (right sign far from the surface);
  // coarse cells the surface may pass through are then sampled exactly.
  const grid = new Float32Array(nx * ny * nz), done = new Uint8Array(nx * ny * nz), T = H * 1.4;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const ci = Math.min(cx - 2, Math.floor(i / C)), cj = Math.min(cy - 2, Math.floor(j / C)), ck = Math.min(cz - 2, Math.floor(k / C));
    let sum = 0;
    for (let c = 0; c < 8; c++) sum += coarse[((ck + (c >> 2)) * cy + cj + ((c >> 1) & 1)) * cx + ci + (c & 1)];
    grid[(k * ny + j) * nx + i] = sum / 8;
  }
  for (let ck = 0; ck < cz - 1; ck++) for (let cj = 0; cj < cy - 1; cj++) for (let ci = 0; ci < cx - 1; ci++) {
    let lo = Infinity, neg = 0;
    for (let c = 0; c < 8; c++) { const v = coarse[((ck + (c >> 2)) * cy + cj + ((c >> 1) & 1)) * cx + ci + (c & 1)]; lo = Math.min(lo, Math.abs(v)); if (v < 0) neg++; }
    if (lo > T && neg % 8 === 0) continue;
    for (let k = ck * C; k <= ck * C + C; k++) for (let j = cj * C; j <= cj * C + C; j++) for (let i = ci * C; i <= ci * C + C; i++) {
      const g = (k * ny + j) * nx + i;
      if (!done[g]) { done[g] = 1; grid[g] = field(ox + i * h, oy + j * h, oz + k * h); }
    }
  }

  // Surface nets: one vertex per cell the surface passes through, one quad per crossing edge.
  const gi = (i, j, k) => (k * ny + j) * nx + i;
  const cellV = new Int32Array((nx - 1) * (ny - 1) * nz).fill(-1);
  const ci3 = (i, j, k) => (k * (ny - 1) + j) * (nx - 1) + i;
  const verts = [];
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let inside = 0;
    for (let c = 0; c < 8; c++) { val[c] = grid[gi(i + corner[c][0], j + corner[c][1], k + corner[c][2])]; if (val[c] < 0) inside++; }
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    edges.forEach(([a, b]) => {
      if ((val[a] < 0) === (val[b] < 0)) return;
      const t = val[a] / (val[a] - val[b]);
      sx += corner[a][0] + (corner[b][0] - corner[a][0]) * t; sy += corner[a][1] + (corner[b][1] - corner[a][1]) * t; sz += corner[a][2] + (corner[b][2] - corner[a][2]) * t; n++;
    });
    cellV[ci3(i, j, k)] = verts.length / 3;
    verts.push(ox + (i + sx / n) * h, oy + (j + sy / n) * h, oz + (k + sz / n) * h);
  }
  const quads = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; quads.push(flip ? [a, d, c, b] : [a, b, c, d]); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = grid[gi(i, j, k)] < 0;
    if (v0 !== (grid[gi(i + 1, j, k)] < 0) && i < nx - 1)
      quad(cellV[ci3(i, j - 1, k - 1)], cellV[ci3(i, j, k - 1)], cellV[ci3(i, j, k)], cellV[ci3(i, j - 1, k)], !v0);
    if (v0 !== (grid[gi(i, j + 1, k)] < 0))
      quad(cellV[ci3(i - 1, j, k - 1)], cellV[ci3(i - 1, j, k)], cellV[ci3(i, j, k)], cellV[ci3(i, j, k - 1)], !v0);
    if (v0 !== (grid[gi(i, j, k + 1)] < 0))
      quad(cellV[ci3(i - 1, j - 1, k)], cellV[ci3(i, j - 1, k)], cellV[ci3(i, j, k)], cellV[ci3(i - 1, j, k)], !v0);
  }
  const nv = verts.length / 3, pos = new Float32Array(verts);
  const nbr = Array.from({ length: nv }, () => new Set());
  quads.forEach((q) => q.forEach((a, i) => { nbr[a].add(q[(i + 1) % 4]); nbr[a].add(q[(i + 3) % 4]); }));
  const nb = nbr.map((s) => [...s]);
  // Relax the mesh a little, then settle every vertex exactly onto the surface.
  const tmp = new Float32Array(pos.length);
  for (let it = 0; it < 2; it++) {
    for (let v = 0; v < nv; v++) {
      let x = 0, y = 0, z = 0; nb[v].forEach((u) => { x += pos[u * 3]; y += pos[u * 3 + 1]; z += pos[u * 3 + 2]; });
      const c = nb[v].length || 1;
      tmp[v * 3] = pos[v * 3] * 0.5 + (x / c) * 0.5; tmp[v * 3 + 1] = pos[v * 3 + 1] * 0.5 + (y / c) * 0.5; tmp[v * 3 + 2] = pos[v * 3 + 2] * 0.5 + (z / c) * 0.5;
    }
    pos.set(tmp);
  }
  const e = 0.15, nor = new Float32Array(pos.length);
  for (let v = 0; v < nv; v++) {
    let x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], gx = 0, gy = 0, gz = 0;
    for (let it = 0; it < 3; it++) {
      const f = field(x, y, z);
      gx = (field(x + e, y, z) - f) / e; gy = (field(x, y + e, z) - f) / e; gz = (field(x, y, z + e) - f) / e;
      const l2 = gx * gx + gy * gy + gz * gz;
      if (l2 < 1e-8) break;
      const st = Math.max(-h, Math.min(h, f / l2));
      x -= gx * st; y -= gy * st; z -= gz * st;
      if (Math.abs(f) < 0.02) break;
    }
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    const l = Math.hypot(gx, gy, gz) || 1;
    nor[v * 3] = gx / l; nor[v * 3 + 1] = gy / l; nor[v * 3 + 2] = gz / l;
  }
  // Even out the normals a little, so creases where several shapes meet shade smoothly.
  for (let it = 0; it < 2; it++) {
    tmp.set(nor);
    for (let v = 0; v < nv; v++) {
      let x = tmp[v * 3] * 2, y = tmp[v * 3 + 1] * 2, z = tmp[v * 3 + 2] * 2;
      nb[v].forEach((u) => { x += tmp[u * 3]; y += tmp[u * 3 + 1]; z += tmp[u * 3 + 2]; });
      const l = Math.hypot(x, y, z) || 1;
      nor[v * 3] = x / l; nor[v * 3 + 1] = y / l; nor[v * 3 + 2] = z / l;
    }
  }
  const index = [];
  quads.forEach(([a, b, c, d]) => {
    const d1 = (pos[a * 3] - pos[c * 3]) ** 2 + (pos[a * 3 + 1] - pos[c * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[c * 3 + 2]) ** 2;
    const d2 = (pos[b * 3] - pos[d * 3]) ** 2 + (pos[b * 3 + 1] - pos[d * 3 + 1]) ** 2 + (pos[b * 3 + 2] - pos[d * 3 + 2]) ** 2;
    if (d1 < d2) index.push(a, b, c, a, c, d); else index.push(a, b, d, b, c, d);
  });

  // Per vertex: which muscles shape it (for activation), its fiber coordinates, and how much
  // each segment moves it (skin weights: one segment away from the joints, a blend near them).
  const weights = {}, fib = new Float32Array(nv * 4), bw = new Float32Array(nv * S), clothV = new Float32Array(nv);
  segs.forEach((g) => g.feats.forEach((f) => { if (f.id && !weights[f.id]) weights[f.id] = new Float32Array(nv); }));
  const fds = segs.map((g) => new Float32Array(g.feats.length)), ds = new Float32Array(S), L = [0, 0, 0];
  for (let v = 0; v < nv; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let dmin = BIG, top = null, t1 = BIG, t2 = BIG, topSeg = 0;
    for (let s = 0; s < S; s++) {
      const g = segs[s], b = g.box;
      if (x < b[0] || y < b[1] || z < b[2] || x > b[3] || y > b[4] || z > b[5]) { ds[s] = BIG; continue; }
      local(g, x, y, z, L);
      ds[s] = skinSegDist(g, L[0], L[1], L[2], fds[s]);
      dmin = Math.min(dmin, ds[s]);
      g.feats.forEach((f, i) => {
        if (!f.id) return;
        const e = fds[s][i];
        weights[f.id][v] = Math.max(weights[f.id][v], 1 - skinSmooth(0.4, 3.2, e));
        if (!top || e < t1) { if (top && f.group !== top.group) t2 = Math.min(t2, t1); top = f; t1 = e; topSeg = s; }
        else if (f.group !== top.group) t2 = Math.min(t2, e);
      });
    }
    let sum = 0;
    for (let s = 0; s < S; s++) { const w = ds[s] >= BIG ? 0 : 1 - skinSmooth(0, segs[s].tau, ds[s] - dmin); bw[v * S + s] = w; sum += w; }
    for (let s = 0; s < S; s++) bw[v * S + s] /= sum || 1;
    // Two different muscles meeting near the surface: a faint groove between them.
    clothV[v] = cloth(x, y, z, clothOut);
    const sep = (t2 < BIG ? (1 - skinSmooth(0, 1.4, t2 - t1)) * (1 - skinSmooth(0.8, 2.6, t2)) : 0) * (1 - clothV[v]);
    fib[v * 4 + 3] = sep;
    if (top && top.spec) {
      local(segs[topSeg], x, y, z, L);
      const [u, w] = skinFiberUV(top.spec, L[0], L[1], L[2]);
      fib[v * 4] = u; fib[v * 4 + 1] = w; fib[v * 4 + 2] = 1 - skinSmooth(0.3, 2.8, t1);
    }
    pos[v * 3] -= nor[v * 3] * 0.3 * sep; pos[v * 3 + 1] -= nor[v * 3 + 1] * 0.3 * sep; pos[v * 3 + 2] -= nor[v * 3 + 2] * 0.3 * sep;
  }
  // Smooth the skin weights over the surface so joints bend in a soft band, then keep the top four.
  const bw2 = new Float32Array(bw.length);
  for (let it = 0; it < 4; it++) {
    for (let v = 0; v < nv; v++) {
      const n = nb[v], c = n.length;
      for (let s = 0; s < S; s++) {
        let acc = 0; for (let q = 0; q < c; q++) acc += bw[n[q] * S + s];
        bw2[v * S + s] = c ? bw[v * S + s] * 0.4 + (acc / c) * 0.6 : bw[v * S + s];
      }
    }
    bw.set(bw2);
  }
  // Forearm and palm: the hand's turn (palm up, palm down) is spread along the forearm by two
  // twist bones (after the segments: S + 0/1 for the right arm, S + 2/3 for the left), the way the
  // forearm bones roll over each other, so the wrist never twists like a candy wrapper.
  const B = S + 4, wb = new Float32Array(nv * B), names = segs.map((g) => g.name);
  for (let v = 0; v < nv; v++) for (let s = 0; s < S; s++) wb[v * B + s] = bw[v * S + s];
  ["R", "L"].forEach((side, n) => {
    const fa = names.indexOf("forearm" + side), hd = names.indexOf("hand" + side), chain = [fa, S + n * 2, S + n * 2 + 1, hd], at = [3, 12, 20, 28.5];
    for (let v = 0; v < nv; v++) {
      const w = wb[v * B + fa] + wb[v * B + hd];
      if (w <= 0) continue;
      local(segs[fa], pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], L);
      const y = Math.min(at[3], Math.max(at[0], L[1]));
      let i = 0; while (i < 2 && y > at[i + 1]) i++;
      const t = (y - at[i]) / (at[i + 1] - at[i]);
      chain.forEach((b) => { wb[v * B + b] = 0; });
      wb[v * B + chain[i]] += w * (1 - t); wb[v * B + chain[i + 1]] += w * t;
    }
  });
  const skinIndex = new Uint16Array(nv * 4), skinWeight = new Float32Array(nv * 4);
  for (let v = 0; v < nv; v++) {
    const order = [...Array(B).keys()].sort((a, b) => wb[v * B + b] - wb[v * B + a]).slice(0, 4);
    const tot = order.reduce((t, s) => t + wb[v * B + s], 0) || 1;
    order.forEach((s, i) => { skinIndex[v * 4 + i] = s; skinWeight[v * 4 + i] = wb[v * B + s] / tot; });
  }
  return { pos, nor, index: new Uint32Array(index), fib, cloth: clothV, weights, skinIndex, skinWeight };
}

// Built once per page and shared by every viewer: in a background worker when the browser allows
// it, so the page stays responsive while the body is made, otherwise right here.
const SKIN = { data: null, waiting: [], started: false };
// One skin per athlete, each built once and shared (SKIN is the male one).
const SKINS = { male: SKIN, female: { data: null, waiting: [], started: false } };
const SKIN_HELPERS = [skinLatheR, skinLatheShape, skinEllDist, skinLatheDist, skinSmin, skinSmooth, skinSegDist, skinFiberUV, buildSkinData];
function requestSkin(segs, done, athlete) {
  const SKIN = SKINS[athlete] || SKINS.male;
  if (SKIN.data) { Promise.resolve().then(() => done(SKIN.data)); return; }
  SKIN.waiting.push(done);
  if (SKIN.started) return;
  SKIN.started = true;
  const finish = (data) => { if (SKIN.data) return; SKIN.data = data; SKIN.waiting.splice(0).forEach((cb) => cb(data)); };
  const here = () => setTimeout(() => finish(buildSkinData(segs)), 0);
  let worker = null;
  try {
    const src = SKIN_HELPERS.map(String).join("\n") + "\nonmessage = (e) => { const d = buildSkinData(e.data); postMessage(d, [d.pos.buffer, d.nor.buffer, d.index.buffer, d.fib.buffer, d.cloth.buffer, d.skinIndex.buffer, d.skinWeight.buffer, ...Object.values(d.weights).map((w) => w.buffer)]); };";
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  } catch (err) { worker = null; }
  if (!worker) { here(); return; }
  const fallback = setTimeout(() => { worker.terminate(); here(); }, 20000);
  worker.onmessage = (e) => { clearTimeout(fallback); worker.terminate(); finish(e.data); };
  worker.onerror = (e) => { if (e.preventDefault) e.preventDefault(); clearTimeout(fallback); worker.terminate(); here(); };
  worker.postMessage(segs);
}

function makeBody3D(THREE, mats, athlete) {
  athlete = athlete === "female" ? "female" : "male";
  const parts = {};      // segment name -> THREE.Group
  const skinMeshes = {}; // highlight key -> skin meshes in that body part
  const skinList = [];   // every skin mesh (vertex-colored)

  // Muscle fibers: each muscle's fiber spec says which way the muscle's fibers run (all in the segment's own space):
  //   { t: "fan",  o, n, r }  fibers converge on the attachment point o, spreading around axis n
  //                           (chest, delts, quads...); r points from o into the muscle.
  //   { t: "long", o, n, r }  fibers run parallel to axis n through o (biceps, triceps, forearms).
  //   { t: "lin",  o, n, c }  straight fibers along n, stacked across c (abs, erectors, obliques).
  // o is the attachment the fibers pull toward; activation pulses travel along the fibers to it.
  // g separates left and right copies of the same muscle so a groove forms between them.
  const FIBER_SPACING = 1.25;
  const v3 = (a) => new THREE.Vector3(...a);
  function prepFiber(spec, center, radius) {
    if (!spec || spec.ready) return spec;
    spec.ready = true;
    spec.O = v3(spec.o); spec.N = v3(spec.n).normalize();
    if (spec.t === "lin") { spec.C = v3(spec.c).normalize(); spec.d = 1 / FIBER_SPACING; return spec; }
    const R = spec.r ? v3(spec.r) : center.clone().sub(spec.O); R.sub(spec.N.clone().multiplyScalar(R.dot(spec.N))).normalize();
    spec.R = R; spec.B = new THREE.Vector3().crossVectors(spec.N, R);
    // Stripes per radian, so neighbouring fibers sit about FIBER_SPACING apart on the muscle.
    const rel = center.clone().sub(spec.O), along = rel.dot(spec.N);
    const dist = spec.t === "fan" ? rel.length() : Math.sqrt(Math.max(0, rel.lengthSq() - along * along)) + radius;
    spec.d = Math.max(dist, 2) / FIBER_SPACING;
    if (spec.t === "long") spec.d = Math.round(spec.d * 2 * Math.PI) / (2 * Math.PI); // seamless all the way round
    return spec;
  }
  // Per-vertex data the skin shader reads: tone (color), fibers and activation (act).
  function skinAttrs(geo) {
    const n = geo.attributes.position.count;
    if (!geo.attributes.color) geo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    if (!geo.attributes.fib) geo.setAttribute("fib", new THREE.Float32BufferAttribute(new Float32Array(n * 4), 4));
    if (!geo.attributes.cloth) geo.setAttribute("cloth", new THREE.Float32BufferAttribute(new Float32Array(n), 1));
    if (!geo.attributes.act) geo.setAttribute("act", new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  }
  function seg(name) { const g = new THREE.Group(); parts[name] = g; return g; }
  function addSkin(group, key, geo) {
    skinAttrs(geo);
    const m = new THREE.Mesh(geo, mats.skin);
    m.castShadow = true; m.userData.weights = {}; m.userData.tone = 1;
    group.add(m); skinList.push(m); (skinMeshes[key] = skinMeshes[key] || []).push(m);
    return m;
  }
  // Hand: four three-jointed fingers and a two-jointed thumb on the palm (which is part of the skin).
  // The palm faces local -x (the a side); fingers curl toward it around local z.
  const hands = {};
  function capsule(r, len) { const geo = new THREE.CapsuleGeometry(r, len, 4, 12); geo.translate(0, len / 2, 0); return geo; }
  // The hand hangs from a wrist pivot so it can turn (overhand, underhand, neutral) or bend flat.
  // Hand frame: palm faces -x, fingers point +y, thumb on the +side z edge (a right hand for side +1).
  function makeHand(fa, side, a) {
    // The palm is part of the body's skin (see skinDefs); the fingers hang from this pivot.
    const pivot = new THREE.Group(); pivot.position.y = 27; pivot.scale.setScalar(1.1); fa.add(pivot);
    const fingers = [];
    // [z offset (index first, on the thumb side), y of knuckle, phalanx lengths, radius]
    [[2.75, 8.2, [4.0, 2.5, 1.9], 0.92], [0.9, 8.6, [4.4, 2.8, 2.0], 0.95], [-0.95, 8.3, [4.1, 2.6, 1.9], 0.9], [-2.7, 7.6, [3.3, 2.0, 1.7], 0.8]]
      .forEach(([z, y, lens, r]) => {
        let parent = new THREE.Group(); parent.position.set(0, y, side * z); pivot.add(parent);
        const joints = [];
        lens.forEach((len, i) => {
          const j = i === 0 ? parent : new THREE.Group();
          if (i > 0) { j.position.y = lens[i - 1]; parent.add(j); }
          addSkin(j, "forearm", capsule(r * 1.06 * (1 - i * 0.1), len));
          joints.push(j); parent = j;
        });
        fingers.push(joints);
      });
    const thumbBase = new THREE.Group(); thumbBase.position.set(a * 0.9, 2.2, side * 3.0); pivot.add(thumbBase);
    const t2 = new THREE.Group(); t2.position.y = 3.2; thumbBase.add(t2);
    addSkin(thumbBase, "forearm", capsule(1.15, 3.2)); addSkin(t2, "forearm", capsule(1.0, 2.6));
    return { pivot, fingers, thumb: [thumbBase, t2], side };
  }
  // grip (true): fingers wrapped around a bar or handle; false: open hand pressing on the floor;
  // "relaxed": the loose natural curl of a hand hanging at rest, each finger a little more than the last.
  function setHand(h, grip) {
    const relaxed = grip === "relaxed";
    h.fingers.forEach((joints, f) => {
      const curl = relaxed ? [16 + f * 5, 26 + f * 5, 14 + f * 3] : grip ? [78, 88, 48] : [6, 6, 4];
      joints.forEach((j, i) => { j.rotation.set(0, 0, (curl[i] * Math.PI) / 180); });
    });
    h.thumb[0].rotation.set(-h.side * (relaxed ? 0.1 : grip ? 0.55 : -0.6), 0, relaxed ? 0.45 : grip ? 0.95 : 0.2);
    h.thumb[1].rotation.set(0, 0, relaxed ? 0.25 : grip ? 0.55 : 0.1);
  }

  // ----- One continuous skin -----
  // The trunk, neck, head, arms and legs are ONE surface. Each segment is described by a base
  // shape (a lathe profile, or an ellipsoid for the head and feet) and the muscles lying on it;
  // all of them are combined into a single smooth field (a smooth union, so the shoulder flows
  // into the arm and the hip into the thigh), turned into a mesh once, and bound to the segment
  // groups as bones, so the skin bends at the joints instead of showing separate pieces.
  //
  // Segments are built pointing up their local +y; on the trunk local +x is the front.
  // Muscles are placed ON the base surface: [muscleId|null, y, th, h, [rn, ry, rt], spin?, k?, fiber?]
  //   y   height on the segment, th  angle around it in degrees (0 = local +x, 90 = local +z),
  //   h   how far the muscle rises above the base surface, [rn, ry, rt] its radii across the
  //       surface (depth), along the segment and around it, spin turns it on the surface (radians),
  //   k   how softly it blends into the surface around it.
  // Absolute ellipsoids (for bones and landmarks) use the older form: { abs: [id, x, y, z, rx, ry, rz, rot?, k?, fiber?] }.
  const SKIN_DEFS = skinDefs("male");
  const defsFor = (sex) => (sex === "female" ? (makeBody3D.femaleDefs = makeBody3D.femaleDefs || skinDefs("female")) : SKIN_DEFS);
  function skinDefs(sex) {
    const SH = VIEW3D.shoulderHalf, HH = VIEW3D.hipHalf;
    const M = (pos, q) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), q || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    const Q = (x, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, 0, z, "XYZ"));
    const armOut = 0.35, legOut = 0.16; // rest pose: arms and legs held a little away from the body
    const defs = [];
    const add = (name, base, feats, rest, k, tau) => defs.push({ name, base, feats, rest, k, tau });

    // Pelvis, belly and lower back (hip -> middle of the spine, 26 units).
    // Rows are [y, half-width, depth/width, front offset]: the waist narrows above the iliac crest,
    // the lumbar curve brings the waist forward, and the pelvis tapers down into the crotch so the
    // hips' width comes from the tops of the thighs, not from a wide bowl.
    add("lowerTorso", { lathe: [[-12, 2], [-10, 6.2, 0.9, -0.6], [-7, 9.6, 0.84, -0.9], [-3, 12.2, 0.8, -1.0], [1, 13.2, 0.77, -0.9], [5, 13.5, 0.75, -0.5],
      [9, 13.4, 0.73, 0], [13, 13.0, 0.72, 0.6], [18, 13.2, 0.73, 0.7], [23, 13.6, 0.74, 0.4], [28, 13.6, 0.74, 0], [31, 10.5, 0.74, 0]], depth: 0.76 }, [
      // Rectus abdominis: one long strap each side of the midline, lying flat on the abdominal wall.
      ...[1, -1].map((s) => ["abs", 13, s * 14, 0.6, [1.6, 11.5, 3.2], 0, 3.2, { t: "lin", o: [10, 26, 0], n: [0, 1, 0], c: [0, 0, 1], g: s }]),
      // External obliques run down and forward ("hands in pockets") to the iliac crest.
      ...[1, -1].map((s) => ["obliques", 12, s * 74, 0.5, [2.0, 8, 6], s * 0.25, 3.6, { t: "lin", o: [6, 2, s * 6], n: [0.7, -0.7, 0], c: [0.7, 0.7, 0], g: s }]),
      // Erectors run straight up beside the spine, leaving a shallow groove down the middle.
      ...[1, -1].map((s) => ["lower-back", 13, s * 162, 0.8, [1.8, 11.5, 2.8], 0, 3.4, { t: "lin", o: [-5, -2, s * 3], n: [0, 1, 0], c: [0, 0, 1], g: s }]),
      // Glute max: a broad, flattened quadrant from the sacrum down and out toward the thigh,
      // its lower edge forming the gluteal fold; glute med fills the side above it.
      ...[1, -1].map((s) => ["glutes", -2.5, s * 150, 1.6, [3.6, 8.6, 7.2], s * 0.35, 4.2, { t: "fan", o: [-1, -3, s * 12], n: [-1, 0, s * 0.5], g: s }]),
      ...[1, -1].map((s) => ["glutes", 6, s * 112, 0.5, [2.0, 5, 5.5], 0, 3.8, { t: "fan", o: [-1, -3, s * 12], n: [-1, 0, s * 0.5], g: s }]),
      // Abdominal wall: a shallow line down the middle and two faint lines across the rectus.
      { abs: ["cut", 11.4, 20, 0, 1.1, 7.5, 0.4, null, 1.2] },
      { abs: ["cut", 11.4, 17.5, 0, 0.9, 0.4, 6.0, null, 1.2] },
      { abs: ["cut", 11.8, 23, 0, 0.9, 0.4, 6.4, null, 1.2] },
      // Creases: the cleft between the glutes, and the gluteal fold where each glute meets the thigh.
      { abs: ["cut", -12.6, -3, 0, 2.6, 6.5, 0.55, null, 1.4] },
      ...[1, -1].map((s) => ({ abs: ["cut", -11.2, -10.6, s * 6.5, 3, 0.7, 5, [s * 0.18, 0, 0], 1.6] }))
    ], M([0, 0, 0]), 0, 6);

    // Ribcage, chest, lats and upper back (middle of the spine -> shoulders).
    const pec = (s) => ({ t: "fan", o: [3, 22, s * 15], n: [1, 0, 0], r: [0, -3, -s * 8], g: s });
    add("upperTorso", { lathe: [[-5, 10.07], [-2, 13.04], [1, 13.78], [6, 15.05], [12, 15.9], [17, 16.22], [21, 15.9], [23.5, 14.84], [25.5, 12.19], [27, 9.01], [28.5, 6.78], [30, 3.18]], depth: 0.74 }, [
      ...[1, -1].flatMap((s) => [
        // Pec major: a flat, curved plate over the ribs that narrows into a tendon at the armpit.
        ["chest", 16.5, s * 27, 1.3, [2.4, 5.0, 6.6], s * -0.12, 2.4, pec(s)],
        ["chest", 21.2, s * 32, 1.0, [2.0, 2.8, 6.2], s * 0.1, 2.8, pec(s)],
        ["chest", 20.4, s * 60, 0.9, [2.0, 2.4, 3.6], s * 0.3, 2.8, pec(s)],
        // Upper rectus abdominis, over the lower ribs up to the chest.
        ["abs", 4, s * 14, 0.8, [1.5, 6, 3.0], 0, 2.8, { t: "lin", o: [10, 0, 0], n: [0, 1, 0], c: [0, 0, 1], g: s }],
        // Serratus: slips running up and back toward the shoulder blade.
        ["obliques", 8, s * 80, 0.5, [1.6, 5, 3.4], s * 0.5, 2.6, { t: "lin", o: [-3, 14, s * 12], n: [-0.6, 0.8, 0], c: [0.8, 0.6, 0], g: s }],
        // Lats: from the low back and pelvis up under the armpit to the front of the upper arm.
        ["lats", 12, s * 128, 1.4, [2.6, 11, 6.2], s * -0.2, 3.2, { t: "fan", o: [0, 21, s * 13.5], n: [-1, 0, s * 0.6], g: s }],
        // Rhomboids and mid back: from the spine down and out to the shoulder blade.
        ["upper-back", 17, s * 158, 0.9, [2.0, 7, 4.6], 0, 2.8, { t: "lin", o: [-7, 22, 0], n: [0, -0.45, s * 0.9], c: [0, s * 0.9, 0.45], g: s }],
        // Middle and lower traps toward the shoulder blade spine.
        // Erectors fading out up the thoracic spine.
        ["lower-back", 3, s * 164, 0.45, [1.6, 9, 2.4], 0, 3.4, { t: "lin", o: [-5, -28, s * 3], n: [0, 1, 0], c: [0, 0, 1], g: s }],
        ["traps", 18, s * 172, 0.7, [1.8, 8, 2.8], 0, 2.8, { t: "fan", o: [-4, 25, s * 12], n: [-1, 0, 0], r: [0, -4, -s * 8], g: s }],
        // Upper traps: the slope from the neck out to the shoulder tip.
        { abs: ["traps", -1.6, 25.2, s * 8.2, 3.4, 2.8, 7.4, [s * 0.5, 0, 0], 3.6, { t: "fan", o: [-1, 27, s * 14], n: [-0.5, 1, 0], r: [0, 0, -s], g: s }] },
        // Shoulder girdle: collarbone, shoulder blade spine and acromion carry the slope out to the arm.
        { abs: [null, -0.4, 21.4, s * 13.6, 3.4, 2.0, 4.4, [s * 0.38, 0, 0], 3.8] }
      ])
    ], M([0, 26, 0]), 3, 6);

    // Neck (the head rides on it).
    add("neck", { lathe: [[-4, 6.9], [0, 6.0], [4, 5.3], [8, 5.0], [11, 4.9], [14, 3]], depth: 1.05 }, [
      ...[1, -1].map((s) => [null, 6, s * 42, 0.7, [1.4, 6, 1.5], s * 0.55, 1.8]), // sternocleidomastoids
      ["traps", 2, 180, 1, [2.6, 5, 5.6], 0, 2.6, { t: "lin", o: [-3, -3, 0], n: [0, 1, 0], c: [0, 0, 1] }],
      // Upper traps climb the sides of the neck, so the shoulders slope down from it.
      ...[1, -1].map((s) => ["traps", 3, s * 125, 2.0, [2.6, 5.5, 3.6], 0, 3, { t: "fan", o: [-1, -24, s * 14], n: [0.3, 1, 0], r: [0, 0, s], g: s }])
    ], M([0, 51, 0]), 3.5, 4);
    // Head: a plain oval, like an anatomy mannequin.
    // Cranium wider at the back and top, narrowing through the jaw to a soft chin.
    add("head", { ell: [0.2, 2.4, 0, 8.3, 9.4, 7.2] }, [
      { abs: [null, -2.2, 3.4, 0, 6.4, 6.4, 6.8, null, 3] },  // back of the skull
      { abs: [null, 2.2, -4.2, 0, 5.8, 5.4, 5.3, null, 3] }   // jaw and chin
    ], M([0, 66.5, 0]), 3, 2);

    [1, -1].forEach((side) => {
      const s = side > 0 ? "R" : "L";
      // Limbs hang down (local -x is the front of the body, th = 180), side * 90 is the outer side.
      const armQ = Q(-side * armOut, Math.PI), sh = new THREE.Vector3(0, 49, side * SH);
      const elbow = new THREE.Vector3(0, 30, 0).applyQuaternion(armQ).add(sh);
      add("upperArm" + s, { lathe: [[-1.5, 1.8], [0, 4.0], [2.5, 4.85], [6, 4.95], [12, 4.55], [20, 4.35], [27, 3.92], [31, 3.6], [33.5, 1.48]], depth: 0.95 }, [
        // Deltoid: front, side and rear heads wrap the joint and converge halfway down the outer arm.
        ["shoulders", 5.8, side * 140, 1.0, [2.2, 6.2, 4.2], side * 0.25, 3.4, { t: "fan", o: [0, 14, side * 3.6], n: [0, -14, -side * 3.6], r: [0, 0, side] }],
        ["shoulders", 6.4, side * 90, 1.25, [2.4, 6.4, 4.6], 0, 3.6, { t: "fan", o: [0, 14, side * 3.6], n: [0, -14, -side * 3.6], r: [0, 0, side] }],
        ["rear-delts", 5.8, side * 30, 1.0, [2.2, 6.2, 4.2], side * 0.25, 3.4, { t: "fan", o: [0, 14, side * 3.6], n: [0, -14, -side * 3.6], r: [0, 0, side] }],
        // Biceps in front, triceps behind: long fibers down to their tendons at the elbow.
        ["biceps", 16, 180, 1.2, [2.4, 8.6, 3.0], 0, 2.6, { t: "long", o: [0, 30, 0], n: [0, 1, 0], r: [-1, 0, 0] }],
        ["triceps", 12.5, side * 35, 1.0, [2.2, 9, 2.8], 0, 2.6, { t: "long", o: [0, 31, 0], n: [0, 1, 0], r: [1, 0, 0], g: "lat" }],
        ["triceps", 15.5, -side * 25, 0.9, [2.2, 8.5, 2.6], 0, 2.6, { t: "long", o: [0, 31, 0], n: [0, 1, 0], r: [1, 0, 0], g: "long" }],
        { abs: [null, 0, 30, 0, 3.3, 3.3, 3.3, null, 1.8] } // elbow
      ], M(sh.toArray(), armQ), 2.6, 3);
      add("forearm" + s, { lathe: [[-2.5, 3.15], [0, 4.09], [4, 4.51], [9, 4.2], [16, 3.36], [22, 2.62], [27, 2.31], [29.5, 1.68], [30.5, 0.11]], depth: 0.85 }, [
        ["forearms", 7, side * 115, 1.0, [2.0, 8, 2.6], 0, 2.6, { t: "long", o: [0, 27, 0], n: [0, 1, 0], g: "ext" }],
        ["forearms", 8, -side * 135, 0.9, [2.0, 8, 2.6], 0, 2.6, { t: "long", o: [0, 27, 0], n: [0, 1, 0], g: "flex" }]
      ], M(elbow.toArray(), armQ), 2.6, 3);
      // Palm (faces local -x, thumb toward side * z), joined to the forearm at the wrist.
      const wrist = new THREE.Vector3(0, 27, 0).applyQuaternion(armQ).add(elbow);
      add("hand" + s, { ell: [0, 4.8, 0, 1.4, 5.2, 3.95] }, [
        { abs: [null, -0.75, 1.8, side * 2.5, 1.55, 3.1, 1.85, null, 1.5] },  // thumb pad
        { abs: [null, -0.55, 2.6, -side * 2.5, 1.3, 3.5, 1.55, null, 1.5] }, // little-finger side pad
        { abs: [null, 0, 8.35, 0, 1.75, 1.3, 4.2, null, 1.1] }              // knuckles
      ], M(wrist.toArray(), armQ), 2, 2);

      const legQ = Q(-side * legOut, Math.PI), hip = new THREE.Vector3(0, 0, side * HH);
      const knee = new THREE.Vector3(0, 42, 0).applyQuaternion(legQ).add(hip);
      const ankle = new THREE.Vector3(0, 42, 0).applyQuaternion(legQ).add(knee);
      const quad = (g) => ({ t: "fan", o: [-5, 41.5, 0], n: [-1, 0, 0], r: [0, -1, 0], g });
      // Thigh (local x points back): full at the top, a long gradual taper to the knee, the quads
      // carrying the front forward through the middle and the hamstrings rounding the back above.
      add("thigh" + s, { lathe: [[-9, 3], [-7, 7.0], [-4, 8.5, 1.0, 0.3], [0, 8.9, 1.02, 0.5], [5, 8.8, 1.04, 0.4], [10, 8.5, 1.02, 0.1], [16, 8.0, 1.0, -0.3],
        [22, 7.5, 0.98, -0.45], [28, 6.8, 0.97, -0.35], [33, 6.0, 0.97, -0.1], [37, 5.4, 0.98, 0], [40, 5.1, 1.0, 0], [43, 5.0, 1.02, 0.1], [46.5, 2.2]], depth: 1 }, [
        // Quads: rectus femoris down the front, vastus lateralis sweeping the outside, vastus
        // medialis as the teardrop above the inner knee; all converge on the kneecap.
        ["quads", 18, 180, 0.7, [2.6, 13, 3.4], 0, 3.6, quad("rf")],
        ["quads", 21, side * 132, 0.8, [2.8, 13, 4.0], 0, 3.6, quad("vl")],
        ["quads", 34, -side * 145, 0.9, [2.2, 5.2, 3.0], -side * 0.3, 3, quad("vm")],
        [null, 8, -side * 95, 0.4, [2.2, 9, 4.2], 0, 3.6],                       // adductors on the inner thigh
        // Hamstrings: biceps femoris on the outer back, semitendinosus/membranosus on the inner back.
        ["hamstrings", 19, side * 30, 0.7, [2.6, 13, 3.4], 0, 3.6, { t: "fan", o: [3, 62, 0], n: [1, 0, 0], r: [0, -1, 0], g: "bf" }],
        ["hamstrings", 20, -side * 32, 0.7, [2.6, 13, 3.4], 0, 3.6, { t: "fan", o: [3, 62, 0], n: [1, 0, 0], r: [0, -1, 0], g: "st" }],
        // Knee: the kneecap stands slightly proud of the front, the femoral condyles widen it a little.
        { abs: [null, -4.7, 41.8, 0, 1.4, 2.4, 2.3, null, 1.5] },
        { abs: [null, -0.5, 42.5, -side * 3.6, 2.2, 2.6, 1.6, null, 1.8] }, { abs: [null, -0.2, 42.8, side * 3.4, 2.0, 2.4, 1.5, null, 1.8] }
      ], M(hip.toArray(), legQ), 3.2, 3.5);
      // Lower leg (local x points back): calf volume high on the back, tapering through the
      // Achilles to a narrow ankle; the shin bone runs straight down the front.
      add("shin" + s, { lathe: [[-3.5, 4.8, 1, 0], [0, 4.9, 1, 0.2], [3, 5.0, 1.02, 0.6], [7, 5.2, 1.05, 1.0], [11, 5.2, 1.05, 1.1], [15, 4.8, 1.0, 1.0],
        [20, 4.1, 0.95, 0.6], [25, 3.5, 0.92, 0.3], [30, 3.0, 0.95, 0.1], [35, 2.7, 1.0, 0.1], [39, 2.6, 1.08, 0.2], [42, 2.7, 1.15, 0.3], [44.5, 1.4]], depth: 1 }, [
        // Patellar tendon from the kneecap to the top of the shin.
        { abs: [null, -4.3, 3.2, 0, 0.9, 3.2, 1.4, null, 1.4] },
        // Gastrocnemius: the inner head bigger and lower than the outer; soleus wider below them.
        ["calves", 10, -side * 32, 1.2, [2.3, 7.5, 2.8], 0, 3, { t: "fan", o: [2, 37, 0], n: [1, 0, 0], r: [0, -1, 0], g: 1 }],
        ["calves", 8.5, side * 34, 0.9, [2.1, 6.5, 2.6], 0, 3, { t: "fan", o: [2, 37, 0], n: [1, 0, 0], r: [0, -1, 0], g: 2 }],
        ["calves", 19, 0, 0.4, [2.0, 8, 4.0], 0, 3.4, { t: "fan", o: [2, 37, 0], n: [1, 0, 0], r: [0, -1, 0], g: 3 }],
        ["calves", 35, 0, 0.35, [0.9, 6, 1.1], 0, 1.8, { t: "lin", o: [2, 42, 0], n: [0, 1, 0], c: [0, 0, 1], g: 4 }], // Achilles tendon
        [null, 12, 180 - side * 28, 0.4, [1.6, 9, 1.8], 0, 3],                   // tibialis anterior
        // Ankle bones: the inner one sits higher than the outer one.
        { abs: [null, 0.2, 41.6, -side * 2.9, 1.1, 1.4, 1.0, null, 1.2] }, { abs: [null, 0.5, 42.8, side * 2.8, 1.1, 1.4, 1.0, null, 1.2] }
      ], M(knee.toArray(), legQ), 3, 3);
      // Foot (local x points down, y forward): heel, arch, ball and toes, about 26 cm long and
      // 9-10 cm wide at the ball, with a flat sole about 7.5 cm below the ankle joint.
      add("foot" + s, { ell: [3.6, 6.5, 0, 3.0, 8.6, 3.9] }, [
        { abs: [null, 4.8, -2.6, 0, 2.7, 3.4, 2.9, null, 2.2] },                  // heel
        { abs: [null, 5.6, 13.6, side * 0.3, 1.8, 3.8, 4.6, null, 2.2] },          // ball of the foot
        { abs: [null, 6.0, 18.6, side * 0.5, 1.4, 2.6, 4.1, null, 1.6] }           // toes
      ], M(ankle.toArray(), Q(-side * legOut, -Math.PI / 2)), 2.6, 2.5);
    });
    // Clothing: matte black training shorts (male); fitted bike shorts and a sports top (female).
    defs.find((d) => d.name === "lowerTorso").cloth = sex === "female"
      ? { waist: 9.6, off: 0.32, hem: 21, top: { y0: 3.2, y1: 20.5, back: 22, strap: [6.4, 2.0], strapTop: 27.4, off: 0.28 } }
      : { waist: 7.3, off: 0.55, hem: 21 };
    return sex === "female" ? feminize(defs) : defs;
  }

  // Female athlete: the same skeleton and joints (so every exercise, pose and equipment fit works
  // unchanged), with her own body shape: a narrower ribcage and shoulders, a wider pelvis and
  // hips, a natural waist, fuller hips and glutes, slimmer arms, neck and calves, smaller hands
  // and feet, a chest under the sports top, and muscles that define the form more softly.
  function feminize(defs) {
    const D = (n) => defs.find((d) => d.name === n);
    const H = { chest: 0.55, shoulders: 0.55, "rear-delts": 0.55, traps: 0.6, lats: 0.7, "upper-back": 0.75, biceps: 0.65, triceps: 0.7,
      forearms: 0.8, abs: 0.6, obliques: 0.7, "lower-back": 0.8, glutes: 1.15, quads: 0.8, hamstrings: 0.85, calves: 0.85 };
    defs.forEach((d) => {
      d.feats = d.feats.filter((f) => !(f.abs && f.abs[0] === "cut" && d.name === "lowerTorso" && f.abs[1] > 0)); // softer abdomen: no carved lines
      d.feats.forEach((f) => {
        if (f.abs) return;
        f[3] *= H[f[0]] ?? 1;
        if (f[6]) f[6] *= 1.12; // softer blend into the body
      });
    });
    const scaleLathe = (d, k) => { d.base.lathe = d.base.lathe.map((r) => [r[0], typeof k === "function" ? k(r[0], r[1]) : r[1] * k, ...r.slice(2)]); };
    const scaleAbs = (d, k) => d.feats.forEach((f) => { if (f.abs && f.abs[0] !== "cut") { const a = f.abs; for (let i = 1; i <= 6; i++) a[i] *= k; } });
    // Her glutes sit a little further back: move the creases with them.
    D("lowerTorso").feats.forEach((f) => { if (f.abs && f.abs[0] === "cut" && f.abs[1] < 0) { f.abs[1] -= f.abs[2] > -6 ? 0.8 : 0.6; f.abs[3] *= 1.05; } });
    D("lowerTorso").base.lathe = [[-12, 2], [-10, 6.8, 0.9, -0.8], [-7, 10.8, 0.84, -1.2], [-3, 13.9, 0.8, -1.3], [1, 14.6, 0.78, -1.1], [5, 14.1, 0.76, -0.6],
      [9, 12.8, 0.75, 0.1], [13, 12.0, 0.76, 0.7], [18, 12.1, 0.77, 0.8], [23, 13.0, 0.77, 0.5], [28, 13.0, 0.77, 0], [31, 10, 0.77, 0]];
    D("upperTorso").base.lathe = [[-5, 9.6], [-2, 12.6], [1, 13.1], [6, 13.6], [12, 14.0], [17, 14.4], [21, 14.2], [23.5, 13.4], [25.5, 11.1], [27, 8.4], [28.5, 6.3], [30, 3.0]];
    D("upperTorso").base.depth = 0.76;
    // The chest: rounded forms over the pecs, held by the sports top.
    [1, -1].forEach((s) => D("upperTorso").feats.push([null, 14.0, s * 30, 2.7, [3.2, 4.6, 4.8], s * 0.1, 3.4]));
    scaleAbs(D("upperTorso"), 0.9);
    scaleLathe(D("neck"), 0.86);
    D("head").base.ell = D("head").base.ell.map((v) => v * 0.95); scaleAbs(D("head"), 0.95);
    ["R", "L"].forEach((s) => {
      scaleLathe(D("upperArm" + s), 0.84); scaleLathe(D("forearm" + s), 0.86);
      D("hand" + s).base.ell = D("hand" + s).base.ell.map((v) => v * 0.93); scaleAbs(D("hand" + s), 0.93);
      // Fuller hips and upper thighs, tapering to a slimmer knee.
      scaleLathe(D("thigh" + s), (y, r) => r + (y <= 6 ? 1.3 : y < 20 ? 1.3 * (20 - y) / 14 : -0.2));
      scaleLathe(D("shin" + s), 0.92);
      D("foot" + s).base.ell = D("foot" + s).base.ell.map((v) => v * 0.93); scaleAbs(D("foot" + s), 0.93);
    });
    return defs;
  }

  // Prepare a segment: its base shape, and every muscle as an ellipsoid in the segment's space.
  function prepSegment(d) {
    const seg = { name: d.name, k: d.k, tau: d.tau, inv: d.rest.clone().invert().elements, cloth: d.cloth || null };
    if (d.base.lathe) {
      const prof = d.base.lathe, curve = new THREE.SplineCurve(prof.map(([y, r]) => new THREE.Vector2(r, y)));
      const pts = curve.getPoints(prof.length * 40);
      // Open ends are closed with a rounded cap, so no flat disc ever shows inside a joint.
      const c0 = prof[0][1] * 0.85, c1 = prof[prof.length - 1][1] * 0.85;
      const ya = prof[0][0], yb = prof[prof.length - 1][0], y0 = ya - c0, y1 = yb + c1, N = 640, tab = new Float32Array(N + 1);
      for (let i = 0, j = 0; i <= N; i++) {
        const y = y0 + ((y1 - y0) * i) / N;
        if (y < ya) { const t = (ya - y) / c0; tab[i] = prof[0][1] * Math.sqrt(Math.max(0, 1 - t * t)); continue; }
        if (y > yb) { const t = (y - yb) / c1; tab[i] = prof[prof.length - 1][1] * Math.sqrt(Math.max(0, 1 - t * t)); continue; }
        while (j < pts.length - 2 && pts[j + 1].y < y) j++;
        const a = pts[j], b = pts[j + 1], t = b.y > a.y ? Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y))) : 0;
        tab[i] = Math.max(0, a.x + (b.x - a.x) * t);
      }
      // Optional per-row [y, r, depth, x offset]: eased between rows, held past the ends.
      const dtab = new Float32Array(N + 1), xtab = new Float32Array(N + 1), ease = (t) => t * t * (3 - 2 * t);
      for (let i = 0; i <= N; i++) {
        const y = y0 + ((y1 - y0) * i) / N;
        let k = 0; while (k < prof.length - 2 && prof[k + 1][0] < y) k++;
        const A = prof[k], B = prof[k + 1], t = ease(Math.min(1, Math.max(0, (y - A[0]) / (B[0] - A[0]))));
        const dA = A[2] ?? d.base.depth, dB = B[2] ?? d.base.depth, xA = A[3] ?? 0, xB = B[3] ?? 0;
        dtab[i] = dA + (dB - dA) * t; xtab[i] = xA + (xB - xA) * t;
      }
      seg.lathe = { y0, y1, N, tab, dtab, xtab, depth: d.base.depth };
    } else seg.ell = ellipsoid(null, ...d.base.ell, null, 1);
    seg.feats = d.feats.map((f) => {
      if (f.abs) {
        const [id, x, y, z, rx, ry, rz, rot, k, fiber] = f.abs;
        return ellipsoid(id, x, y, z, rx, ry, rz, new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), k, fiber);
      }
      // On the surface: find the base surface point at (y, th) and its outward normal there.
      const [id, y, th, h, [rn, ry, rt], spin, k, fiber] = f;
      const a = (th * Math.PI) / 180, r = skinLatheR(seg.lathe, y), [dp, xo] = skinLatheShape(seg.lathe, y), A = r * dp;
      const n = new THREE.Vector3(Math.cos(a) / A, 0, Math.sin(a) / r).normalize();
      const c = new THREE.Vector3(xo + A * Math.cos(a), y, r * Math.sin(a)).addScaledVector(n, h - rn);
      const up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3().crossVectors(n, up).normalize();
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(n, up, t));
      if (spin) q.premultiply(new THREE.Quaternion().setFromAxisAngle(n, spin));
      return ellipsoid(id, c.x, c.y, c.z, rn, ry, rt, q, k, fiber);
    });
    // { abs: ["cut", ...] } carves a soft crease instead of adding volume.
    seg.cuts = seg.feats.filter((f) => f.id === "cut"); seg.feats = seg.feats.filter((f) => f.id !== "cut");
    // World-space bounds (in the rest pose), so far-away segments are skipped quickly. Wider than
    // any blend, so skipping a segment never cuts a blend off.
    const box = new THREE.Box3(), r = seg.lathe ? Math.max(...seg.lathe.tab) * Math.max(1, ...seg.lathe.dtab) + Math.max(...seg.lathe.xtab.map(Math.abs)) : seg.ell.br, e = seg.ell;
    if (seg.lathe) box.set(new THREE.Vector3(-r, seg.lathe.y0, -r), new THREE.Vector3(r, seg.lathe.y1, r));
    else box.set(new THREE.Vector3(e.cx - r, e.cy - r, e.cz - r), new THREE.Vector3(e.cx + r, e.cy + r, e.cz + r));
    seg.feats.forEach((f) => { box.expandByPoint(new THREE.Vector3(f.cx - f.br, f.cy - f.br, f.cz - f.br)); box.expandByPoint(new THREE.Vector3(f.cx + f.br, f.cy + f.br, f.cz + f.br)); });
    box.expandByScalar(10).applyMatrix4(d.rest);
    seg.box = [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z];
    return seg;
  }
  function ellipsoid(id, x, y, z, rx, ry, rz, q, k, fiber) {
    const m = new THREE.Matrix4().makeRotationFromQuaternion(q || new THREE.Quaternion()).elements;
    return { id, cx: x, cy: y, cz: z, rx, ry, rz, br: Math.max(rx, ry, rz), k: k || 2.4, m: [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]],
      spec: plainFiber(prepFiber(fiber, new THREE.Vector3(x, y, z), (rx + ry + rz) / 3)), group: id && id + ":" + ((fiber && fiber.g) || "") };
  }
  const plainFiber = (sp) => sp && { t: sp.t, d: sp.d, O: sp.O.toArray(), N: sp.N.toArray(), C: sp.C && sp.C.toArray(), R: sp.R && sp.R.toArray(), B: sp.B && sp.B.toArray() };

  // Segment groups act as the skin's bones; the head rides on the neck.
  SKIN_DEFS.forEach((d) => { if (d.name !== "head" && !d.name.startsWith("hand")) seg(d.name); });
  const head = new THREE.Group(); head.position.y = 15.5; parts.neck.add(head); parts.head = head;
  // Hands keep their own jointed fingers, hung from each forearm; each palm is a bone of the skin.
  [1, -1].forEach((side) => { const s = side > 0 ? "R" : "L"; hands[s] = makeHand(parts["forearm" + s], side, -1); });
  const boneOf = (name) => (name.startsWith("hand") ? hands[name.slice(4)].pivot : parts[name]);
  const twistRest = [];
  ["R", "L"].forEach((s) => {
    hands[s].twist = [1, 2].map(() => { const g = new THREE.Group(); parts["forearm" + s].add(g); return g; });
    twistRest.push(...hands[s].twist.map(() => SKIN_DEFS.find((d) => d.name === "forearm" + s).rest.clone().invert()));
  });
  // The fingers show once the skin they belong to is ready.
  skinList.forEach((m) => { m.visible = false; });
  const body = { parts, skin: null, skinMeshes, skinList, hands, handQ: { R: new THREE.Quaternion(), L: new THREE.Quaternion() },
    boneNames: [...SKIN_DEFS.map((d) => d.name), "twistR1", "twistR2", "twistL1", "twistL2"],
    setHands: (grip) => Object.values(hands).forEach((h) => setHand(h, grip)),
    // cb(skin) runs once the skin mesh exists (later in the same frame at the soonest).
    onSkin(cb) { if (body.skin) Promise.resolve().then(() => cb(body.skin)); else skinWaiting.push(cb); } };
  const skinWaiting = [];
  const geoOf = (data) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(data.nor, 3));
    geo.setAttribute("skinIndex", new THREE.BufferAttribute(data.skinIndex, 4));
    geo.setAttribute("skinWeight", new THREE.BufferAttribute(data.skinWeight, 4));
    geo.setAttribute("fib", new THREE.BufferAttribute(data.fib, 4));
    geo.setAttribute("cloth", new THREE.BufferAttribute(data.cloth, 1));
    geo.setIndex(new THREE.BufferAttribute(data.index, 1));
    skinAttrs(geo);
    return geo;
  };
  // Both athletes share the skeleton (same bones, same rest pose), so switching athlete only
  // swaps the skin's surface; the pose, equipment fit and camera carry over.
  const prepared = {};
  const skinOf = (sex, cb) => requestSkin(prepared[sex] = prepared[sex] || defsFor(sex).map(prepSegment), cb, sex);
  body.athlete = athlete;
  skinOf(athlete, (data) => {
    const skin = new THREE.SkinnedMesh(geoOf(data), mats.skin);
    skin.bind(new THREE.Skeleton([...SKIN_DEFS.map((d) => boneOf(d.name)), ...hands.R.twist, ...hands.L.twist],
      [...SKIN_DEFS.map((d) => d.rest.clone().invert()), ...twistRest]), new THREE.Matrix4());
    skin.castShadow = true; skin.receiveShadow = true; skin.frustumCulled = false;
    skin.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4); // posed anywhere: never cull, raycast against triangles
    skin.userData.weights = data.weights; skin.userData.tone = 1;
    skinList.forEach((m) => { m.visible = true; });
    skinList.unshift(skin); skinMeshes.body = [skin];
    body.skin = skin;
    skinWaiting.splice(0).forEach((cb) => cb(skin));
    // Get the other athlete ready in the background, so switching is instant.
    const other = athlete === "male" ? "female" : "male";
    setTimeout(() => skinOf(other, () => {}), 1500);
  });
  // Switch athlete; cb runs once the new surface is in place.
  body.setAthlete = (sex, cb) => {
    sex = sex === "female" ? "female" : "male";
    body.athlete = sex;
    skinOf(sex, (data) => body.onSkin((skin) => {
      if (body.athlete !== sex) return;
      const old = skin.geometry;
      skin.geometry = geoOf(data); skin.userData.weights = data.weights;
      old.dispose();
      if (cb) cb();
    }));
  };
  return body;
}

// ---------- Viewer ----------
function createViewer3D(container, mode, opts = {}) {
  const THREE = window.THREE;
  if (!THREE) return null;
  let athlete = opts.athlete === "female" ? "female" : "male";
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = "figure3d";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 2000);
  // A commercial gym: reflections of overhead light panels on the metal, a soft key light from
  // above that casts the shadows, a cool fill, a rim light from behind.
  scene.environment = GYM3D.environment(renderer);
  const { key, rim } = GYM3D.lights(scene);

  const col = (name, fb) => new THREE.Color(css(name, fb));
  // Skin shader: fine fiber striations along each muscle's fiber direction, darker grooves where
  // muscles meet, and activation light that pulses along the fibers toward the attachment.
  // Per viewer: activation color (teal on the optimal form, blue on the mistake), the color of
  // muscles that take over in a mistake, the energy rim around a correct body, and the scan band
  // that sweeps up the body when an exercise is first analyzed.
  const fiberUniforms = {
    uTime: { value: 0 }, uEffort: { value: 1 }, uActScale: { value: 0 }, uFiber: { value: 0 },
    uActColor: { value: new THREE.Color(mode === "bad" ? VIEW3D.activeBad : VIEW3D.active) },
    uCompColor: { value: new THREE.Color(VIEW3D.compensate) },
    uRim: { value: 0 }, uRimColor: { value: new THREE.Color(mode === "bad" ? VIEW3D.bad : VIEW3D.good) },
    uScanY: { value: -999 }, uScanColor: { value: new THREE.Color(mode === "bad" ? VIEW3D.bad : VIEW3D.good) }
  };
  function patchSkin(mat) {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, fiberUniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec4 fib;\nattribute float act;\nattribute float cloth;\nvarying vec4 vFib;\nvarying float vAct;\nvarying float vWorldY;\nvarying float vCloth;\nvarying vec3 vObjP;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFib = fib; vAct = act; vCloth = cloth; vObjP = position;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
          varying vec4 vFib; varying float vAct; varying float vWorldY; varying float vCloth; varying vec3 vObjP;
          uniform float uTime, uEffort, uActScale, uRim, uScanY, uFiber;
          uniform vec3 uActColor, uCompColor, uRimColor, uScanColor;`)
        // Shorts: matte fabric, with soft folds bunched around the hips and crotch.
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.97, vCloth);")
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
          if (vCloth > 0.01) {
            vec3 q = vObjP;
            float fold = sin(q.y * 0.75 + 2.2 * sin(q.x * 0.21 + q.z * 0.17)) * (0.6 + 0.4 * sin(q.x * 0.09 - q.z * 0.13 + q.y * 0.05));
            fold += 0.45 * sin(q.y * 1.5 + q.z * 0.4 + 1.3 * sin(q.x * 0.33));
            normal = perturbNormalArb(-vViewPosition, normal, vec2(dFdx(fold), dFdy(fold)) * 0.32 * vCloth, faceDirection);
          }`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          {
            // Layers, in order: the body (charcoal skin), muscle form (soft boundary shading),
            // activation (a muted glow held inside the muscle), fiber direction (only on working
            // muscles, and fully only when fiber detail is on), then form feedback.
            // vFib: x = distance along the fiber from its attachment, y = fiber index,
            //       z = how much muscle is under this point, w = boundary between muscles.
            float belly = smoothstep(0.15, 0.85, vFib.z);
            float sep = vFib.w;
            float ndv = abs(dot(normal, normalize(vViewPosition)));
            // Muscle form at rest: bellies a touch lighter, a soft shallow valley between muscles.
            diffuseColor.rgb *= (1.0 + 0.06 * belly) * (1.0 - 0.15 * sep);
            // Shorts: near-black matte fabric, a faint stitched line at the waistband and hems.
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.028, 0.029, 0.032), vCloth);
            diffuseColor.rgb *= 1.0 - 0.45 * vCloth * (1.0 - vCloth) * 4.0;
            float a = clamp(abs(vAct) * uEffort * uActScale, 0.0, 1.0);
            vec3 actColor = vAct < 0.0 ? uCompColor : uActColor;
            if (a > 0.001) {
              // Activation travels along the fibers toward the attachment as broad, slow swells.
              float travel = 0.5 + 0.5 * sin(vFib.x * 0.11 - uTime * 2.2);
              float inside = belly * (1.0 - 0.7 * sep) * (1.0 - 0.82 * vCloth);
              diffuseColor.rgb = mix(diffuseColor.rgb, actColor * 0.34, 0.42 * a * inside);
              // Internal glow: strongest where the muscle faces the viewer, never a bright outline.
              float glow = a * inside * (0.55 + 0.45 * ndv) * (0.78 + 0.22 * travel);
              totalEmissiveRadiance += actColor * glow * 0.27;
              // Fiber direction: short, broken fascicle strands that fade in and out along the
              // muscle (not continuous strings), faint at most and clear only with fiber detail on.
              float fiberAmt = (1.0 - vCloth) * inside * mix(0.25 * smoothstep(0.5, 1.0, a), smoothstep(0.08, 0.6, a), uFiber);
              float fw = fwidth(vFib.y);
              if (fiberAmt > 0.01 && fw < 0.5) {
                float id = floor(vFib.y), rnd = fract(sin(id * 12.9898) * 43758.5453);
                float fv = fract(vFib.y), edge = min(fv, 1.0 - fv);
                float lineW = 0.07 + 0.05 * rnd;
                float strand = 1.0 - smoothstep(lineW - fw, lineW + fw, edge);
                float dash = smoothstep(0.25, 0.75, 0.5 + 0.5 * sin(vFib.x * (0.16 + 0.1 * rnd) + rnd * 37.0));
                float f = strand * dash * fiberAmt * (1.0 - smoothstep(0.2, 0.5, fw));
                diffuseColor.rgb *= 1.0 - 0.3 * f;
                totalEmissiveRadiance += actColor * f * (0.3 + 0.4 * travel) * (0.4 + 0.6 * a);
              }
            }
            // A barely-there edge light on a correct body, and a faint cool edge everywhere so the
            // dark silhouette reads against the dark stage.
            float rim = pow(1.0 - ndv, 4.0);
            totalEmissiveRadiance += vec3(0.5, 0.6, 0.75) * pow(1.0 - ndv, 3.0) * 0.035 * (1.0 - 0.5 * vCloth);
            totalEmissiveRadiance += uRimColor * rim * uRim;
            // Scan band sweeping up the body.
            float band = exp(-pow((vWorldY - uScanY) / 3.5, 2.0));
            totalEmissiveRadiance += uScanColor * band * (0.35 + 0.65 * rim) * 0.6;
          }`);
    };
    return mat;
  }
  function skinNoise() {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) { const v = 118 + Math.random() * 20; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
    return t;
  }
  const mats = {
    // Matte graphite skin: the shader below draws the muscle fibers, boundaries and activation.
    skin: patchSkin(new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.74, metalness: 0,
      sheen: 0.06, sheenColor: new THREE.Color(0xb8c2d0), sheenRoughness: 0.85, clearcoat: 0,
      envMapIntensity: 0.75, bumpMap: skinNoise(), bumpScale: 0.25 })),
  };

  // Rubber gym floor, fitted to the feet of each exercise.
  const floor = GYM3D.floor();
  scene.add(floor);

  const body = makeBody3D(THREE, mats, athlete);
  Object.values(body.parts).forEach((g) => { if (g !== body.parts.head) scene.add(g); });
  // The skin may arrive a moment later (it is built in the background): show it with the scan-in.
  body.onSkin((skin) => { scene.add(skin); if (ex) { setActivation(); fitScene(); } shownAt = 0; });
  const equipment = new THREE.Group();
  scene.add(equipment);

  const GOOD = new THREE.Color(VIEW3D.good), BAD = new THREE.Color(VIEW3D.bad);
  let ex = null, poseA = null, poseB = null, load = {}, focusId = null, form = null;
  let ghostA = null, ghostB = null, ghostEnds = null, period = 4600, shownAt = 0, ghostOn = true;
  let lastT = 0, lastNow = 0, effort = 0.7;
  let yaw = VIEW3D.yaw, pitch = VIEW3D.pitch, target = new THREE.Vector3(0, 90, 0), dist = 400;
  let raf = 0, disposed = false, fig3 = {}, fibersOn = false;

  // ----- Interaction -----
  let drag = null, downAt = null;
  const el = renderer.domElement;
  el.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; downAt = [e.clientX, e.clientY]; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    yaw = drag.yaw - (e.clientX - drag.x) * 0.01;
    pitch = Math.max(-0.2, Math.min(0.9, drag.pitch + (e.clientY - drag.y) * 0.006));
  });
  el.addEventListener("pointerup", () => { drag = null; });
  el.addEventListener("pointercancel", () => { drag = null; });
  el.addEventListener("dblclick", () => { [yaw, pitch] = fig3.view || [VIEW3D.yaw, VIEW3D.pitch]; });

  function resize() {
    const w = container.clientWidth || 300, h = container.clientHeight || w;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(container);

  // ----- Equipment -----
  // Each exercise names its kit (the real machine, bench, bar or dumbbells it uses; see
  // GYM3D.kits). The kit is fitted to where the body's skin really is over the whole rep,
  // so pads touch the back and seat, feet stand on the floor and bars sit in the hands, and
  // every frame it moves with the body: hand -> handle -> cable -> pulleys -> weight stack.
  let rig = null, floorY = 0, holdAt = null, fitted = false;
  function clearEquipment() {
    while (equipment.children.length) equipment.remove(equipment.children[0]);
    rig = null; paths = [];
  }
  const to3 = (p) => new THREE.Vector3(p[0] - 100, 189 - p[1], 0);

  // CPU skinning: world positions of skin vertices (all of them, or the listed ones).
  const boneM = [];
  function skinWorld(idx, out) {
    const skin = body.skin, geo = skin.geometry, pos = geo.attributes.position.array;
    const si = geo.attributes.skinIndex.array, sw = geo.attributes.skinWeight.array;
    Object.values(body.parts).forEach((p) => { if (p.parent === scene) p.updateMatrixWorld(true); });
    skin.skeleton.bones.forEach((b, i) => { boneM[i] = (boneM[i] || new THREE.Matrix4()).multiplyMatrices(b.matrixWorld, skin.skeleton.boneInverses[i]); });
    const n = idx ? idx.length : pos.length / 3;
    if (!out || out.length < n * 3) out = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) {
      const i = idx ? idx[k] : k, x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2];
      let ox = 0, oy = 0, oz = 0;
      for (let j = 0; j < 4; j++) {
        const w = sw[4 * i + j]; if (!w) continue;
        const e = boneM[si[4 * i + j]].elements;
        ox += w * (e[0] * x + e[4] * y + e[8] * z + e[12]);
        oy += w * (e[1] * x + e[5] * y + e[9] * z + e[13]);
        oz += w * (e[2] * x + e[6] * y + e[10] * z + e[14]);
      }
      out[3 * k] = ox; out[3 * k + 1] = oy; out[3 * k + 2] = oz;
    }
    return out;
  }
  // The bone that moves each vertex the most (its body part).
  let domBone = null;
  function dominantBones() {
    if (domBone) return domBone;
    const geo = body.skin.geometry, si = geo.attributes.skinIndex.array, sw = geo.attributes.skinWeight.array, n = si.length / 4;
    domBone = new Uint8Array(n);
    for (let i = 0; i < n; i++) { let b = 0; for (let j = 1; j < 4; j++) if (sw[4 * i + j] > sw[4 * i + b]) b = j; domBone[i] = si[4 * i + b]; }
    return domBone;
  }

  // The rep, sampled: skin points, grips and joints at evenly spaced moments.
  function sampleRep(n) {
    const S = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pose(lerpPose(poseA, poseB, t), fig3.ik ? t : null);
      S.push({ t, pts: skinWorld(null, null), grip: { R: gripPoint("R"), L: gripPoint("L") }, axis: { R: gripAxis("R"), L: gripAxis("L") },
        handQ: { R: body.handQ.R.clone(), L: body.handQ.L.clone() }, J: jointsOf(body) });
    }
    return S;
  }
  // What a kit can ask about the body while it fits itself.
  function makeCtx(S) {
    const names = body.boneNames, dom = dominantBones();
    const each = (fn, only) => S.forEach((s) => { const p = s.pts; for (let i = 0, v = 0; i < p.length; i += 3, v++) if (!only || only(names[dom[v]])) fn(p[i], p[i + 1], p[i + 2], s, v); });
    const inBox = (b, x, y, z) => x >= (b.x0 ?? -1e9) && x <= (b.x1 ?? 1e9) && z >= (b.z0 ?? -1e9) && z <= (b.z1 ?? 1e9) && y >= (b.y0 ?? -1e9) && y <= (b.y1 ?? 1e9);
    return {
      THREE, S, fig: fig3, mode, names, floorY,
      // Lowest / highest skin point over the whole rep inside a box (optionally only some body parts).
      lowest(b, only) { let m = Infinity; each((x, y, z) => { if (y < m && inBox(b, x, y, z)) m = y; }, only); return m; },
      highest(b, only) { let m = -Infinity; each((x, y, z) => { if (y > m && inBox(b, x, y, z)) m = y; }, only); return m; },
      // Closest the skin comes to a pad's face: the pad's centre o, outward normal n, length
      // along `along`, width across z. Only skin over the pad (and not far behind it) counts.
      gap(o, n, along, len, width, only) {
        const lat = new THREE.Vector3().crossVectors(along, n).normalize();
        let m = Infinity;
        each((x, y, z) => {
          const dx = x - o.x, dy = y - o.y, dz = z - o.z;
          const a = dx * along.x + dy * along.y + dz * along.z, l = dx * lat.x + dy * lat.y + dz * lat.z, h = dx * n.x + dy * n.y + dz * n.z;
          if (Math.abs(a) <= len / 2 && Math.abs(l) <= width / 2 && h > -12 && h < m) m = h;
        }, only);
        return m;
      },
      bounds(only) { const b = new THREE.Box3(); each((x, y, z) => b.expandByPoint(new THREE.Vector3(x, y, z)), only); return b; },
      // Vertices picked on the first sample, tracked live every frame.
      track(pred) {
        const idx = []; const p = S[0].pts;
        for (let v = 0; v < p.length / 3; v++) if (pred(p[3 * v], p[3 * v + 1], p[3 * v + 2], names[dom[v]])) idx.push(v);
        const list = Int32Array.from(idx); let out = null;
        return { count: list.length, now: () => (out = skinWorld(list, out)), at: (i) => S[i].pts && list };
      },
      to3
    };
  }

  // Soft contact shadows (ambient occlusion) where things meet the floor: equipment feet are
  // fixed; the body's feet (and flat hands) are followed every frame, darker the closer they are.
  const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const liveShadows = [];
  function shadowBlob(x, z, w, d, o) {
    const mat = GYM3D.materials().shadow.clone(); mat.opacity = o;
    const m = new THREE.Mesh(shadowGeo, mat);
    m.position.set(x, floorY + 0.08, z); m.scale.set(w, 1, d); m.renderOrder = 1;
    equipment.add(m); return m;
  }
  function contactShadows(list) {
    list.forEach((c) => shadowBlob(c.x, c.z, c.w, c.d, c.o));
    liveShadows.length = 0;
    ["R", "L"].forEach((s) => {
      const ft = body.parts["foot" + s];
      liveShadows.push({ m: shadowBlob(0, 0, 32, 15, 0), at: () => endOf(ft, 7), dir: () => endOf(ft, 12).sub(ft.position), base: 0.7, r: 3.5, len: 32, wid: 15 });
      if (fig3.hand === "flat") liveShadows.push({ m: shadowBlob(0, 0, 18, 14, 0), at: () => gripPoint(s), base: 0.55, r: 1.5, len: 18, wid: 14 });
    });
    liveShadows.forEach((l) => { l.m.visible = l.at().y - floorY < 30; });
  }
  function updateShadows() {
    liveShadows.forEach((l) => {
      if (!l.m.visible) return;
      const p = l.at(), h = Math.max(0, p.y - floorY - l.r), grow = 1 + h / 25;
      l.m.position.set(p.x, floorY + 0.08, p.z);
      if (l.dir) { const d = l.dir(); l.m.rotation.y = -Math.atan2(d.z, d.x); }
      l.m.scale.set(l.len * grow, 1, l.wid * grow);
      l.m.material.opacity = l.base * Math.exp(-h / 7);
    });
  }

  // Movement paths (optimal form only): a faint line along the path the working end travels over
  // a rep (both hands, else the feet, else the head and chest for hanging and supported moves),
  // with a bead riding it in time with the body.
  let paths = [];
  const PATH_SRC = {
    handR: () => gripPoint("R"), handL: () => gripPoint("L"),
    ankleR: () => endOf(body.parts.shinR, 42), ankleL: () => endOf(body.parts.shinL, 42),
    neck: () => body.parts.neck.position.clone()
  };
  function buildPaths() {
    paths = [];
    if (mode !== "good" || fig3.path === false) return;
    const tr = {}; Object.keys(PATH_SRC).forEach((k) => { tr[k] = []; });
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      pose(lerpPose(poseA, poseB, t), fig3.ik ? t : null);
      Object.keys(PATH_SRC).forEach((k) => tr[k].push(PATH_SRC[k]()));
    }
    const travel = (k) => tr[k].reduce((a, p, i) => a + (i ? p.distanceTo(tr[k][i - 1]) : 0), 0);
    let keys = fig3.path ? [].concat(fig3.path) : null;
    if (!keys) {
      const by = (ks) => ks.filter((k) => travel(k) > 9);
      keys = by(["handR", "handL"]);
      if (!keys.length) keys = by(["ankleR", "ankleL"]);
      if (!keys.length) keys = by(["neck"]);
    }
    const mat = new THREE.MeshBasicMaterial({ color: 0xbff7ea, transparent: true, opacity: 0.22, depthWrite: false });
    const beadMat = new THREE.MeshBasicMaterial({ color: 0xd8fff5, transparent: true, opacity: 0.85, depthWrite: false });
    keys.forEach((k) => {
      const curve = new THREE.CatmullRomCurve3(tr[k]);
      const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.32, 6, false), mat); line.renderOrder = 2;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(1.3, 14, 10), beadMat); bead.renderOrder = 3;
      // End ticks so the start and finish of the range read clearly.
      [0, 32].forEach((i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), mat); d.position.copy(tr[k][i]); equipment.add(d); });
      equipment.add(line, bead);
      paths.push({ bead, at: PATH_SRC[k] });
    });
  }

  // Fit the floor, then build the exercise's kit around the body.
  function fitScene() {
    clearEquipment();
    fitted = false;
    if (!body.skin || !ex) return;
    const kitName = fig3.kit || "none";
    const S = sampleRep(8);
    const ctx = makeCtx(S);
    const feet = (n) => n.startsWith("foot") || n.startsWith("shin");
    // The floor goes where the body stands: under the soles, under the whole body for floor
    // exercises, or below the hanging feet.
    const ground = GYM3D.kits.groundOf(kitName, fig3);
    if (typeof ground === "function") floorY = ground(ctx);
    else if (ground === "feet") floorY = ctx.lowest({}, feet);
    else if (ground === "body") floorY = ctx.lowest({}) - (fig3.mat ? 1.5 : 0);
    else if (ground === "hang") floorY = Math.min(ctx.lowest({}) - 18, (holdAt ? holdAt.y : 200) - GYM3D.kits.hangOf(kitName));
    else floorY = 0;
    ctx.floorY = floorY;
    floor.position.y = floorY;
    const P = GYM3D.Parts(equipment, floorY);
    ctx.P = P;
    rig = GYM3D.kits.build(kitName, ctx) || null;
    // Soft contact shadows under every foot of the equipment.
    contactShadows(P.shadows);
    buildPaths();
    fitted = true;
    pose(lerpPose(poseA, poseB, 0), fig3.ik ? 0 : null);
    frameScene(ctx);
  }

  // ----- Posing -----
  const Y = new THREE.Vector3(0, 1, 0);
  function dir2(angleDeg) { const r = (angleDeg * Math.PI) / 180; return new THREE.Vector3(Math.sin(r), Math.cos(r), 0); }
  // Bones move in the side-view plane: rotate local +y (up) to the bone's direction, then apply any arm-out swing.
  function placeAngle(group, start, angleDeg, extra) {
    group.position.copy(start);
    group.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (-angleDeg * Math.PI) / 180);
    if (extra) group.quaternion.premultiply(extra);
  }
  const endOf = (group, len) => new THREE.Vector3(0, len, 0).applyQuaternion(group.quaternion).add(group.position);

  // Upper arm and forearm from shoulder S to hand H, elbow bending toward the pole.
  function solveArm(ua, fa, S, H, pole, L2) {
    const L1 = 30, toH = H.clone().sub(S);
    const d = Math.min(Math.max(toH.length(), Math.abs(L1 - L2) + 0.5), L1 + L2 - 0.05);
    const u = toH.normalize();
    const w = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
    const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const E = S.clone().add(u.clone().multiplyScalar(L1 * cosA)).add(w.clone().multiplyScalar(L1 * sinA));
    const Hd = S.clone().add(u.clone().multiplyScalar(d));
    setBone(ua, S, E.clone().sub(S).normalize(), w);
    setBone(fa, E, Hd.sub(E).normalize(), w);
  }
  // Bone along y; local +x leans toward hint (the elbow side), so the biceps faces away from it.
  function setBone(g, at, y, hint) {
    const x = hint.clone().sub(y.clone().multiplyScalar(hint.dot(y)));
    if (x.lengthSq() < 1e-6) x.set(1, 0, 0).sub(y.clone().multiplyScalar(y.x));
    x.normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    g.position.copy(at);
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }
  // Turn the hand for the grip: overhand (thumbs in), underhand (thumbs out), neutral (palms in),
  // or flat on the floor with the fingers pointing toward the head.
  // The body being posed: the character, or the "optimal form" ghost drawn over a mistake.
  let cur = null, curEnds = null;
  const handQOf = () => cur.handQ;
  const Z = new THREE.Vector3(0, 0, 1);
  function orientHand(h, fa, side, torsoQ) {
    const y = new THREE.Vector3(0, 1, 0).applyQuaternion(fa.quaternion);
    const grip = fig3.grip || "over", mode = fig3.hand || "grip";
    let x, z;
    if (mode === "flat") {
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(torsoQ);
      y.set(up.x, 0, up.z); if (y.lengthSq() < 1e-4) y.set(1, 0, 0); y.normalize();
      x = new THREE.Vector3(0, 1, 0);
      z = new THREE.Vector3().crossVectors(x, y);
    } else if (grip === "neutral") {
      x = Z.clone().multiplyScalar(side);
      x.sub(y.clone().multiplyScalar(x.dot(y)));
      if (x.lengthSq() < 1e-4) x.set(1, 0, 0);
      x.normalize(); z = new THREE.Vector3().crossVectors(x, y);
    } else {
      // Overhand: thumbs point in toward each other; underhand: out. The left hand's thumb is on
      // its -z side, so the same z gives a mirror-image grip on both hands.
      z = Z.clone().multiplyScalar(grip === "under" ? 1 : -1);
      z.sub(y.clone().multiplyScalar(z.dot(y)));
      if (z.lengthSq() < 1e-4) z.set(1, 0, 0);
      z.normalize(); x = new THREE.Vector3().crossVectors(y, z);
    }
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    handQOf()[side > 0 ? "R" : "L"].copy(q);
    h.pivot.quaternion.copy(fa.quaternion).invert().multiply(q);
    // Spread the hand's roll about the forearm over the two twist bones (a third and two thirds).
    if (h.twist) {
      const p = h.pivot.quaternion, tw = new THREE.Quaternion(0, p.y, 0, p.w);
      if (tw.lengthSq() < 1e-8) tw.identity(); else { if (tw.w < 0) tw.set(0, -tw.y, 0, -tw.w); tw.normalize(); }
      h.twist[0].quaternion.identity().slerp(tw, 1 / 3); h.twist[1].quaternion.identity().slerp(tw, 2 / 3);
    }
  }
  // Centre of the closed fist (where a bar or handle runs through the hand), or the middle of
  // the palm for a flat hand.
  function gripPoint(s) {
    const fa = cur.parts["forearm" + s];
    const wrist = new THREE.Vector3(0, 27, 0).applyQuaternion(fa.quaternion).add(fa.position);
    const off = (fig3.hand === "flat") ? new THREE.Vector3(-1.76, 4.95, 0) : new THREE.Vector3(-3.08, 7.37, 0);
    return wrist.add(off.applyQuaternion(handQOf()[s]));
  }
  // The line a bar takes through the fist: across the palm, from the little finger to the index finger.
  function gripAxis(s) { return new THREE.Vector3(0, 0, s === "R" ? 1 : -1).applyQuaternion(handQOf()[s]); }
  // For reaching moves the hand travels on an arc around the shoulder between its start and end
  // positions, instead of following the 2D joint angles (which can swing the arm the long way round).
  let reachEnds = null;
  function reachTarget(pz, side) {
    const ends = curEnds.map(({ j, gz }) => ({
      S: to3(j.shoulder).add(new THREE.Vector3(0, 0, side * VIEW3D.shoulderHalf)),
      H: to3(j.hand).setZ(side * (gz ?? fig3.ik.grip ?? 22))
    }));
    const ra = ends[0].H.clone().sub(ends[0].S), rb = ends[1].H.clone().sub(ends[1].S);
    const len = ra.length() + (rb.length() - ra.length()) * pz;
    const q = new THREE.Quaternion().setFromUnitVectors(ra.clone().normalize(), rb.clone().normalize());
    const dir = ra.clone().normalize().applyQuaternion(new THREE.Quaternion().slerp(q, pz));
    return dir.multiplyScalar(len);
  }
  // Lever machines: the hands travel on a circle of radius ik.arc through the start and end hand
  // positions, centred above and behind them (where the lever's pivot is).
  function arcTarget(pz, side) {
    const [A, B] = curEnds.map(({ j, gz }) => to3(j.hand).setZ(side * (gz ?? fig3.ik.grip ?? 22)));
    const chord = B.clone().sub(A), h = chord.length() / 2, R = Math.max(fig3.ik.arc, h + 1);
    const perp = new THREE.Vector3(-chord.y, chord.x, 0).normalize();
    if (perp.y < 0) perp.negate();
    const C = A.clone().add(B).multiplyScalar(0.5).addScaledVector(perp, Math.sqrt(R * R - h * h));
    const a0 = Math.atan2(A.y - C.y, A.x - C.x); let a1 = Math.atan2(B.y - C.y, B.x - C.x);
    if (a1 - a0 > Math.PI) a1 -= 2 * Math.PI; else if (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
    const a = a0 + (a1 - a0) * pz;
    return new THREE.Vector3(C.x + Math.cos(a) * R, C.y + Math.sin(a) * R, A.z + (B.z - A.z) * pz);
  }
  function pose(p, t, target = body, ends = reachEnds) {
    cur = target; curEnds = ends;
    const j = solveSide(p);
    const hip = to3(j.hip), shoulderC = to3(j.shoulder), mid = to3(j.spineMid);
    const lowerA = Math.atan2(mid.x - hip.x, mid.y - hip.y) * 180 / Math.PI;
    const upperA = Math.atan2(shoulderC.x - mid.x, shoulderC.y - mid.y) * 180 / Math.PI;
    placeAngle(cur.parts.lowerTorso, hip, lowerA);
    const lowLen = hip.distanceTo(mid);
    cur.parts.lowerTorso.scale.set(1, lowLen / 26, 1);
    placeAngle(cur.parts.upperTorso, mid, upperA);
    cur.parts.upperTorso.scale.set(1, shoulderC.distanceTo(mid) / 26, 1);
    const neckBase = shoulderC.clone().add(dir2(upperA).multiplyScalar(-1));
    placeAngle(cur.parts.neck, neckBase, p.neck ?? p.torso);

    const torsoQ = cur.parts.upperTorso.quaternion;
    const ik = fig3.ik, handMode = fig3.hand || "grip";
    const lateral = new THREE.Vector3(0, 0, 1);
    const abd = ((p.abd || 0) * Math.PI) / 180;
    [1, -1].forEach((side) => {
      const s = side > 0 ? "R" : "L";
      // Shoulder joint: out to the side and slightly down from the top of the torso.
      const sh = shoulderC.clone().add(new THREE.Vector3(0, -3, 0).applyQuaternion(torsoQ)).add(lateral.clone().multiplyScalar(side * VIEW3D.shoulderHalf));
      let extra = null;
      if (abd) {
        const axis = p.abdAxis === "spine" ? new THREE.Vector3(0, 1, 0).applyQuaternion(torsoQ) : new THREE.Vector3(1, 0, 0).applyQuaternion(torsoQ);
        extra = new THREE.Quaternion().setFromAxisAngle(axis.normalize(), side * (p.abdAxis === "spine" ? -abd : abd));
      }
      const uaLen = ik ? 30 : 30 * (p.armsOut && !abd ? 0.8 : 1);
      cur.parts["upperArm" + s].scale.set(1, uaLen / 30, 1);
      if (ik) {
        // Two-bone reach: the hand goes where the 2D pose puts it, at the grip width,
        // and the elbow bends toward the pole (out to the side, like a real press).
        // Hanging and supported moves keep a fixed grip on the bar (the 2D hand, at the grip
        // width); lever machines move the hand on the lever's circle; others reach on an arc
        // around the shoulder.
        const H = t == null || fig3.hold === "hands" ? to3(j.hand).setZ(side * (p.gz ?? ik.grip ?? 22))
          : ik.arc ? arcTarget(t, side)
          : to3(j.shoulder).add(new THREE.Vector3(0, 0, side * VIEW3D.shoulderHalf)).add(reachTarget(t, side));
        // Both hands on one handle (Pallof press): one fist above the other at the midline.
        if (ik.stack) { H.z = side * 0.6; H.y += side * ik.stack; }
        if (handMode === "flat") H.y = Math.max(H.y, 2.6);
        const pole = new THREE.Vector3(...(ik.pole || [-0.5, -0.6, 1])); pole.z *= side; pole.applyQuaternion(torsoQ);
        solveArm(cur.parts["upperArm" + s], cur.parts["forearm" + s], sh, H, pole, handMode === "flat" ? 27 : 33);
      } else {
        // A far (left) arm with its own angles (p.arm2: { ua, fa, abd? }), e.g. a hand braced on a bench.
        const a2 = side < 0 && p.arm2;
        const ex2 = !a2 ? extra : a2.abd ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0).applyQuaternion(torsoQ).normalize(), (side * a2.abd * Math.PI) / 180) : null;
        placeAngle(cur.parts["upperArm" + s], sh, a2 ? a2.ua : p.ua, ex2);
        const elbow = endOf(cur.parts["upperArm" + s], uaLen);
        placeAngle(cur.parts["forearm" + s], elbow, a2 ? a2.fa : p.fa, ex2);
      }
      orientHand(cur.hands[s], cur.parts["forearm" + s], side, torsoQ);
      const hip3 = hip.clone().add(lateral.clone().multiplyScalar(side * VIEW3D.hipHalf));
      const far = side < 0 && p.t2 != null;
      const thighDir = far ? p.t2 : p.thigh + 180;
      const shinDir = far ? p.s2 : p.shin + 180;
      const footDir = far ? (p.f2 ?? 90) : (p.foot ?? 90);
      const legOut = fig3.legAbd ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0).applyQuaternion(cur.parts.lowerTorso.quaternion), (-side * fig3.legAbd * Math.PI) / 180) : null;
      placeAngle(cur.parts["thigh" + s], hip3, thighDir, legOut);
      const knee = endOf(cur.parts["thigh" + s], 42);
      placeAngle(cur.parts["shin" + s], knee, shinDir, legOut);
      const ankle = endOf(cur.parts["shin" + s], 42);
      placeAngle(cur.parts["foot" + s], ankle, footDir, legOut);
    });

    // Hanging and supported moves (pull-up, dips): the hands stay locked on the bar and the
    // body moves around them, like a real closed chain.
    if (fig3.hold === "hands" && holdAt) {
      const d = holdAt.clone().sub(gripPoint("R").add(gripPoint("L")).multiplyScalar(0.5));
      Object.values(cur.parts).forEach((g) => { if (g.parent === scene || !g.parent) g.position.add(d); });
    }
    if (target !== body || !rig || !fitted) return;
    // Equipment that moves with the body.
    rig.update({ t, grip: { R: gripPoint("R"), L: gripPoint("L") }, axis: { R: gripAxis("R"), L: gripAxis("L") }, handQ: body.handQ, J: jointsOf(body) });
    paths.forEach((p) => p.bead.position.copy(p.at()));
    updateShadows();
  }

  // ----- Form feedback -----
  // Optimal form: a soft teal energy rim, the key joint line held correctly, muscles lit along their fibers.
  // Mistake: a translucent "optimal form" ghost moves in sync over the body, and guides show exactly
  // what is off: the joint line yours vs optimal, an arrow toward the correct position, motion
  // paths for range errors, a motion trail and tempo meter for speed errors, and muscles that take
  // over the work in amber.
  const ghost = mode === "bad" ? makeGhost() : null;
  function makeGhost() {
    const mat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(0xa9d9cc) }, opacity: { value: 0 } },
      vertexShader: `#include <common>
        #include <skinning_pars_vertex>
        varying float vRim;
        void main() {
          #include <beginnormal_vertex>
          #include <skinbase_vertex>
          #include <skinnormal_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          vec3 n = normalize(normalMatrix * objectNormal); vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
          vRim = 1.0 - abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: "uniform vec3 color; uniform float opacity; varying float vRim; void main(){ gl_FragColor = vec4(color, opacity * (0.06 + 0.7 * pow(vRim, 2.6))); }",
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 3, polygonOffsetUnits: 3
    });
    const g = makeBody3D(THREE, { ...mats, skin: mat }, athlete);
    Object.values(g.parts).forEach((part) => { if (part !== g.parts.head) scene.add(part); });
    g.onSkin((skin) => { scene.add(skin); skin.castShadow = false; skin.receiveShadow = false; skin.renderOrder = 4; });
    g.skinList.forEach((m) => { m.castShadow = false; m.receiveShadow = false; m.renderOrder = 4; });
    g.mat = mat;
    return g;
  }

  const guides = new THREE.Group();
  scene.add(guides);
  const guideCyl = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true).translate(0, 0.5, 0);
  const dotGeo = new THREE.SphereGeometry(1, 16, 12);
  const coneGeo = new THREE.ConeGeometry(1, 1, 18).translate(0, 0.5, 0);
  const guideMat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, toneMapped: false });
  function segTo(m, a, b, r) {
    const d = b.clone().sub(a), len = d.length();
    m.position.copy(a);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), len > 1e-6 ? d.divideScalar(len) : new THREE.Vector3(0, 1, 0));
    m.scale.set(r, Math.max(len, 0.001), r);
  }
  // A joint line: thin bars between joints with a dot on each joint.
  function makeChain(n, color, opacity, r) {
    const mat = guideMat(color, 0);
    const segs = [...Array(n - 1)].map(() => new THREE.Mesh(guideCyl, mat));
    const dots = [...Array(n)].map(() => new THREE.Mesh(dotGeo, mat));
    [...segs, ...dots].forEach((m) => { m.renderOrder = 12; guides.add(m); });
    return {
      mat, base: opacity,
      set(pts) {
        segs.forEach((sg, i) => segTo(sg, pts[i], pts[i + 1], r));
        dots.forEach((d, i) => { d.position.copy(pts[i]); d.scale.setScalar(r * (i === 1 ? 3 : 2.2)); });
      }
    };
  }
  // Joint positions of the near (right) side, in world space.
  const angle3 = (a, b, c) => { const u = a.clone().sub(b), v = c.clone().sub(b); return (u.angleTo(v) * 180) / Math.PI; };
  // For metrics(): which joints this exercise moves, how much of the optimal range this rep
  // covers, and how stable it is (from the form analysis of the mistake).
  let measured = null;
  const JOINT_ANGLES = { knee: ["hip", "knee", "ankle"], hip: ["neck", "pelvis", "knee"], elbow: ["shoulder", "elbow", "hand"], shoulder: ["pelvis", "shoulder", "elbow"] };
  function measureRep() {
    const ends = (A, B, E) => [0, 1].map((t) => { pose(lerpPose(A, B, t), fig3.ik ? t : null, body, E); return jointsOf(body); });
    const mine = ends(poseA, poseB, reachEnds), best = ends(ghostA, ghostB, ghostEnds);
    const exc = (S, k) => { const [a, b, c] = JOINT_ANGLES[k]; return Math.abs(angle3(S[1][a], S[1][b], S[1][c]) - angle3(S[0][a], S[0][b], S[0][c])); };
    const moves = {}; let key = null, top = 0;
    Object.keys(JOINT_ANGLES).forEach((k) => { const e = exc(best, k); moves[k] = e > 8; if (e > top) { top = e; key = k; } });
    const err = mode === "bad" && form ? form.error : null;
    const jk = err && JOINT_ANGLES[err.joint] ? err.joint : key;
    let range = 100;
    if (mode === "bad" && jk) range = Math.min(100, Math.round((exc(mine, jk) / Math.max(1, exc(best, jk))) * 100));
    if (mode === "good" || !err || err.type !== "range") range = Math.max(range, 92 + ((ex.name.length * 7) % 7));
    const stability = !err ? "Excellent" : err.type === "posture" || err.type === "alignment" ? "Fair" : "Good";
    measured = { moves, range, stability };
    pose(lerpPose(poseA, poseB, 0), fig3.ik ? 0 : null);
  }
  function jointsOf(B) {
    const P = B.parts, ua = P.upperArmR;
    return {
      hip: P.thighR.position.clone(), knee: endOf(P.thighR, 42), ankle: endOf(P.shinR, 42), toe: endOf(P.footR, 10),
      shoulder: ua.position.clone(), elbow: endOf(ua, 30 * ua.scale.y), hand: endOf(P.forearmR, 29),
      pelvis: P.lowerTorso.position.clone(), spine: P.upperTorso.position.clone(), neck: P.neck.position.clone(), head: endOf(P.neck, 15.5)
    };
  }
  // The joint line that tells whether the form is right, per joint.
  const CHAINS = {
    knee: ["hip", "knee", "ankle"], ankle: ["knee", "ankle", "toe"], hip: ["neck", "pelvis", "knee"],
    spine: ["pelvis", "spine", "neck", "head"], head: ["spine", "neck", "head"],
    shoulder: ["spine", "shoulder", "elbow"], elbow: ["shoulder", "elbow", "hand"], hand: ["shoulder", "elbow", "hand"]
  };
  const KEY_POINT = { spine: "spine", head: "head", hand: "hand" };
  const angleAt = (a, m, c) => THREE.MathUtils.radToDeg(a.clone().sub(m).angleTo(c.clone().sub(m)));
  const METRIC = { knee: "Knee angle", ankle: "Ankle angle", hip: "Hip angle", shoulder: "Shoulder angle", elbow: "Elbow angle", hand: "Elbow angle", head: "Neck angle" };
  function measure(J, joint) {
    if (joint === "spine") {
      return [["Trunk angle", THREE.MathUtils.radToDeg(J.neck.clone().sub(J.pelvis).angleTo(new THREE.Vector3(0, 1, 0)))],
        ["Spine curve", 180 - angleAt(J.pelvis, J.spine, J.head)]];
    }
    const c = CHAINS[joint];
    return [[METRIC[joint], angleAt(J[c[0]], J[c[1]], J[c[2]])]];
  }

  // HTML overlay: labels pinned to 3D points, the tempo meter and the muscle tooltip.
  const hud = document.createElement("div");
  hud.className = "v3-hud";
  container.appendChild(hud);
  function tag(text, kind) {
    const t = document.createElement("span");
    t.className = "v3-tag v3-tag-" + kind; t.textContent = text;
    hud.appendChild(t);
    return t;
  }
  const tip = document.createElement("div");
  tip.className = "v3-tip"; tip.hidden = true;
  hud.appendChild(tip);

  let fb = null; // the guides built for the current exercise
  function clearFeedback() {
    while (guides.children.length) guides.remove(guides.children[0]);
    hud.querySelectorAll(".v3-tag, .v3-tempo").forEach((n) => n.remove());
    fb = null;
  }
  function tubeFor(points, color, r) {
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(24, points.length * 4), r, 8, false);
    const m = new THREE.Mesh(geo, guideMat(color, 0));
    m.renderOrder = 11; m.userData.count = geo.index.count; geo.setDrawRange(0, 0);
    guides.add(m);
    return m;
  }

  function setFeedback() {
    clearFeedback();
    const err = form && form.error;
    if (!err) return;
    const joint = CHAINS[err.joint] ? err.joint : "spine", chain = CHAINS[joint];
    fb = { joint, chain, type: err.type, chains: [], tubes: [], tags: [] };
    if (mode === "good") {
      // The joint line that goes wrong in the mistake, shown held correctly.
      fb.mine = makeChain(chain.length, GOOD, 0.38, 0.3);
      return;
    }
    fb.mine = makeChain(chain.length, BAD, 0.95, 0.5);
    fb.ideal = makeChain(chain.length, GOOD, 0.85, 0.42);
    if (err.type !== "range") fb.tags.push([tag("Your form", "bad"), () => fb.yourAt], [tag("Optimal", "good"), () => fb.idealAt]);
    // Arrow from where the joint is toward where it should be.
    const arrowMat = guideMat(GOOD, 0);
    fb.arrow = { shaft: new THREE.Mesh(guideCyl, arrowMat), head: new THREE.Mesh(coneGeo, arrowMat), mat: arrowMat };
    fb.arrow.shaft.renderOrder = fb.arrow.head.renderOrder = 13;
    guides.add(fb.arrow.shaft, fb.arrow.head);
    // A gently pulsing ring around the joint at fault.
    const ringMat = guideMat(BAD, 0);
    fb.ring = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.55, 12, 48), ringMat);
    fb.halo = new THREE.Mesh(dotGeo, guideMat(BAD, 0));
    fb.ring.renderOrder = 14; fb.halo.renderOrder = 10;
    guides.add(fb.ring, fb.halo);

    // Sample the whole rep, yours and optimal: the biggest difference becomes the headline number,
    // and the point that travels furthest becomes the motion path.
    const cands = ["hand", "knee", "hip", "ankle", "head", "elbow"];
    const yourPath = {}, idealPath = {};
    cands.forEach((c) => { yourPath[c] = []; idealPath[c] = []; });
    let best = null;
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      pose(lerpPose(ghostA, ghostB, t), fig3.ik ? t : null, ghost, ghostEnds);
      const G = jointsOf(ghost);
      pose(lerpPose(poseA, poseB, t), fig3.ik ? t : null);
      const Y = jointsOf(body);
      cands.forEach((c) => { yourPath[c].push(Y[c]); idealPath[c].push(G[c]); });
      const g = measure(G, joint), y = measure(Y, joint);
      g.forEach(([label, gv], k) => {
        const d = Math.abs(y[k][1] - gv);
        if (!best || d > best.d) best = { d, label, your: Math.round(y[k][1]), optimal: Math.round(gv) };
      });
    }
    const pathLen = (pts) => pts.reduce((sum, q, i) => sum + (i ? q.distanceTo(pts[i - 1]) : 0), 0);
    const trace = cands.reduce((a, c) => (pathLen(idealPath[c]) > pathLen(idealPath[a]) ? c : a), cands[0]);
    fb.trace = trace;
    viewer.analysis = err.type === "tempo"
      ? { label: "Time for one rep", your: (period / 1000).toFixed(1) + " s", optimal: "4.6 s" }
      : best && { label: best.label + " at the point of biggest difference", your: best.your + "°", optimal: best.optimal + "°" };

    if (err.type === "posture" || err.type === "alignment" || err.type === "activation") {
      // The faulty joint's path through the rep: yours in red, the recommended one as a teal guide.
      const key = cands.includes(joint) ? joint : trace;
      if (pathLen(yourPath[key]) > 4 || pathLen(idealPath[key]) > 4) fb.tubes.push(tubeFor(idealPath[key], GOOD, 0.42), tubeFor(yourPath[key], BAD, 0.48));
    }
    if (err.type === "range") {
      const ideal = idealPath[trace], mine = yourPath[trace];
      fb.tubes.push(tubeFor(ideal, GOOD, 0.5), tubeFor(mine, BAD, 0.56));
      const endDot = (q, color) => { const d = new THREE.Mesh(dotGeo, guideMat(color, 0)); d.position.copy(q); d.scale.setScalar(1.9); d.renderOrder = 13; guides.add(d); fb.tubes.push(d); };
      // End of range: the point of each path farthest from where the rep starts.
      const far = (pts) => pts.reduce((a, q) => (q.distanceTo(pts[0]) > a.distanceTo(pts[0]) ? q : a), pts[0]);
      const idealEnd = far(ideal), myEnd = far(mine);
      endDot(idealEnd, GOOD); endDot(myEnd, BAD);
      const shortRange = myEnd.distanceTo(mine[0]) < idealEnd.distanceTo(ideal[0]);
      fb.tags.push([tag(shortRange ? "Stops early" : "Too far", "bad"), () => myEnd], [tag("Full range", "good"), () => idealEnd]);
    }
    if (err.type === "tempo") {
      fb.trail = [...Array(16)].map(() => { const d = new THREE.Mesh(dotGeo, guideMat(BAD, 0)); d.renderOrder = 11; guides.add(d); return d; });
      fb.trailPts = [];
      const meter = document.createElement("div");
      meter.className = "v3-tempo";
      meter.innerHTML = `<span>Tempo</span><div class="v3-tempo-bar"><i></i><b></b></div><em>${err.tempo === "slow" ? "Too slow" : "Too fast"}</em>`;
      hud.appendChild(meter);
      fb.meter = meter.querySelector("b");
      fb.maxSpeed = Math.max(...idealPath[trace].map((q, i, a) => (i ? q.distanceTo(a[i - 1]) : 0))) * 32 / 1.5;
    }
  }

  // Per frame: move the guides with the bodies and fade them in after the scan.
  const smooth = (x) => { const v = Math.min(1, Math.max(0, x)); return v * v * (3 - 2 * v); };
  function updateFeedback(now, k) {
    if (!fb) return;
    const show = smooth((k - 650) / 450);
    const Y = jointsOf(body);
    fb.mine.set(fb.chain.map((n) => Y[n])); fb.mine.mat.opacity = fb.mine.base * show;
    if (mode === "good") return;
    const G = jointsOf(ghost);
    fb.ideal.set(fb.chain.map((n) => G[n])); fb.ideal.mat.opacity = fb.ideal.base * show * (ghostOn ? 1 : 0.6);
    const key = KEY_POINT[fb.joint] || fb.chain[1];
    const at = Y[key], to = G[key];
    fb.yourAt = Y[fb.chain[fb.chain.length - 1]]; fb.idealAt = G[fb.chain[fb.chain.length - 1]];
    // Ring, gently breathing (no flashing).
    const pulse = 0.5 + 0.5 * Math.sin(now / 520);
    fb.ring.position.copy(at); fb.ring.lookAt(camera.position); fb.ring.scale.setScalar(1 + 0.07 * pulse);
    fb.ring.material.opacity = (0.65 + 0.3 * pulse) * show;
    fb.halo.position.copy(at); fb.halo.scale.setScalar(7.5 + pulse); fb.halo.material.opacity = (0.08 + 0.1 * pulse) * show;
    // Correction arrow.
    const d = to.clone().sub(at), len = d.length();
    const vis = smooth((len - 2) / 3) * show;
    fb.arrow.mat.opacity = 0.95 * vis;
    if (len > 0.01) {
      const L = Math.min(len, 20), dir = d.divideScalar(len), from = at.clone().add(dir.clone().multiplyScalar(2.5));
      const tipAt = from.clone().add(dir.clone().multiplyScalar(Math.max(L - 2.5, 0.5)));
      const neck = tipAt.clone().sub(dir.clone().multiplyScalar(3.2));
      segTo(fb.arrow.shaft, from, neck, 0.45);
      fb.arrow.head.position.copy(neck);
      fb.arrow.head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      fb.arrow.head.scale.set(1.5, 3.2, 1.5);
    }
    // Motion paths draw themselves.
    const draw = smooth((k - 700) / 900);
    fb.tubes.forEach((m) => {
      if (m.userData.count) m.geometry.setDrawRange(0, Math.floor(m.userData.count * draw / 3) * 3);
      m.material.opacity = (m.userData.count ? 0.9 : 1) * smooth((k - 700) / 300);
    });
    // Motion trail and tempo meter.
    if (fb.trail) {
      const p = Y[fb.trace];
      const speed = fb.trailPts.length ? p.distanceTo(fb.trailPts[0]) / Math.max(1, now - (fb.lastNow || now)) * 1000 : 0;
      fb.lastNow = now;
      fb.trailPts.unshift(p);
      fb.trailPts.length = Math.min(fb.trailPts.length, fb.trail.length * 2);
      fb.trail.forEach((dot, i) => {
        const q = fb.trailPts[i * 2];
        dot.visible = !!q;
        if (q) { dot.position.copy(q); dot.scale.setScalar(1.3 * (1 - i / fb.trail.length)); dot.material.opacity = 0.75 * (1 - i / fb.trail.length) * show; }
      });
      fb.speed = (fb.speed || 0) + (speed - (fb.speed || 0)) * 0.15;
      fb.meter.style.left = (100 * Math.min(1, fb.speed / (fb.maxSpeed * 2.2 || 1))).toFixed(1) + "%";
    }
    // Labels pinned to 3D points.
    const w = container.clientWidth, h = container.clientHeight;
    const placed = [];
    fb.tags.forEach(([el, at3]) => {
      const q = at3();
      if (!q) return;
      const v = q.clone().project(camera);
      const x = (v.x + 1) / 2 * w;
      let y = (1 - v.y) / 2 * h;
      // Keep labels from sitting on top of each other.
      placed.forEach(([px, py]) => { if (Math.abs(px - x) < 80 && Math.abs(py - y) < 22) y = py + (y >= py ? 24 : -24); });
      placed.push([x, y]);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -150%)`;
      el.style.opacity = show;
    });
  }

  // The body stays charcoal; worked muscles light up along their fibers. Main movers get full
  // activation, helpers a softer one. On a mistake the main movers do less and the muscles that
  // take over glow amber. focusId (a picked muscle) shows just that muscle.
  function levelOf(id) {
    const err = form && form.error;
    let lv = ex.primary.includes(id) ? 1 : ex.secondary.includes(id) ? 0.42 : 0;
    if (mode === "bad" && err) {
      lv *= err.type === "activation" ? 0.4 : 0.75;
      if ((err.compensate || []).includes(id)) lv = -0.9;
    }
    if (focusId) return id === focusId ? (lv < 0 ? lv : Math.max(lv, 0.8)) : lv * 0.12;
    return lv;
  }
  function setActivation() {
    const skin = new THREE.Color(VIEW3D.skin), c = new THREE.Color();
    body.skinList.forEach((m) => {
      const colors = m.geometry.attributes.color, act = m.geometry.attributes.act, w = m.userData.weights, tone = m.userData.tone;
      const ids = Object.keys(w).map((id) => [w[id], levelOf(id)]).filter(([, lv]) => lv !== 0);
      c.copy(skin).multiplyScalar(tone);
      for (let i = 0; i < colors.count; i++) {
        let a = 0;
        ids.forEach(([wt, lv]) => { const v = wt[i] * lv; if (Math.abs(v) > Math.abs(a)) a = v; });
        act.setX(i, a);
        colors.setXYZ(i, c.r, c.g, c.b);
      }
      colors.needsUpdate = true; act.needsUpdate = true;
    });
  }

  // ----- Muscle hover and pick -----
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let hoverAt = null, pinned = null, hoverMiss = 0;
  function muscleAt(clientX, clientY) {
    const r = el.getBoundingClientRect();
    mouse.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(body.skinList, false)[0];
    if (!hit || !hit.face) return null;
    const w = hit.object.userData.weights;
    let best = null, bw = 0.35;
    Object.keys(w).forEach((id) => {
      const v = Math.max(w[id][hit.face.a], w[id][hit.face.b], w[id][hit.face.c]);
      if (v > bw) { bw = v; best = id; }
    });
    return best;
  }
  function roleOf(id) {
    const err = form && form.error;
    if (mode === "bad" && err && (err.compensate || []).includes(id)) return "Taking over";
    return ex.primary.includes(id) ? "Main mover · strong" : ex.secondary.includes(id) ? "Helper · moderate" : "Not targeted";
  }
  function showTip(id, x, y, full) {
    if (!id) { tip.hidden = true; return; }
    const r = container.getBoundingClientRect();
    const info = typeof MUSCLE_INFO !== "undefined" ? MUSCLE_INFO[id] : null;
    tip.innerHTML = `<b>${MUSCLES[id]}</b><span>${roleOf(id)}</span>${full && info ? `<p>${info.action}.</p><p class="v3-tip-fiber">${info.fibers}.</p>` : ""}`;
    tip.hidden = false;
    tip.classList.toggle("is-pinned", !!full);
    tip.style.left = Math.min(Math.max(8, x - r.left + 14), r.width - 200) + "px";
    tip.style.top = Math.max(8, y - r.top + 14) + "px";
  }
  el.addEventListener("pointermove", (e) => { if (!drag && !pinned) hoverAt = [e.clientX, e.clientY]; });
  el.addEventListener("pointerleave", () => { hoverAt = null; if (!pinned) tip.hidden = true; });
  el.addEventListener("pointerup", (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    const id = muscleAt(e.clientX, e.clientY);
    pinned = id && id !== pinned ? id : null;
    showTip(pinned, e.clientX, e.clientY, true);
    container.dispatchEvent(new CustomEvent("muscle-pick", { bubbles: true, detail: { id: pinned } }));
  });

  // First framing, from the joints alone (before the skin and equipment exist).
  function frameCamera() {
    const pts = [];
    [0, 0.5, 1].forEach((t) => {
      const j = solveSide(lerpPose(poseA, poseB, t));
      Object.values(j).forEach((v) => { if (Array.isArray(v)) pts.push(v); });
    });
    const xs = pts.map((p) => p[0] - 100), ys = pts.map((p) => 189 - p[1]);
    const minX = Math.min(...xs) - 20, maxX = Math.max(...xs) + 20, minY = Math.min(...ys) - 12, maxY = Math.max(...ys) + 16;
    target.set((minX + maxX) / 2, (minY + maxY) / 2, 0);
    const size = Math.max(maxX - minX, maxY - minY, 120);
    dist = size / 2 / Math.tan((camera.fov * Math.PI) / 360) * 1.12;
  }
  // Frame body, equipment and the whole movement for the exercise's camera angle: project the
  // scene's bounds onto the view and back the camera off until everything fits, with a margin.
  function frameScene(ctx) {
    const box = ctx.bounds();
    const eq = new THREE.Box3().setFromObject(equipment);
    if (!eq.isEmpty()) {
      // Take in the equipment, but not so much that the body gets small (tall towers are cropped).
      const near = box.clone().expandByVector(new THREE.Vector3(60, 45, 75));
      box.union(eq.intersect(near));
    }
    box.min.y = Math.max(box.min.y, floorY - 4);
    const c = box.getCenter(new THREE.Vector3());
    const f = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); // toward the camera
    const right = new THREE.Vector3(0, 1, 0).cross(f).normalize(), up = new THREE.Vector3().crossVectors(f, right);
    const tv = Math.tan((camera.fov * Math.PI) / 360), th = tv * Math.max(0.5, camera.aspect || 1);
    let need = 0;
    for (let i = 0; i < 8; i++) {
      const q = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(c);
      const z = q.dot(f);
      need = Math.max(need, z + Math.abs(q.dot(right)) / th, z + Math.abs(q.dot(up)) / tv);
    }
    target.copy(c);
    dist = Math.max(need * 1.06, 150);
    bodyTop = ctx.bounds().max.y;
  }

  // Rep tempo like a real lifter: pause, controlled move to b, brief hold, slower return.
  const TEMPO = [[0.1, 0, 0], [0.42, 0, 1], [0.54, 1, 1], [1, 1, 0]]; // [end of phase, from, to]
  const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  function easeT(now, len = 4600) {
    const raw = (now % len) / len;
    let start = 0;
    for (const [end, from, to] of TEMPO) {
      if (raw <= end) return from + (to - from) * smoother((raw - start) / (end - start));
      start = end;
    }
    return 0;
  }
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Stage colors follow the page style (a dark lab stage or a light studio).
  let frame = 0, stageDark = null, stageAt = -1e9;
  function readStage() {
    const dark = getComputedStyle(container).getPropertyValue("--stage").trim() === "dark";
    if (dark === stageDark) return;
    stageDark = dark;
    floor.material.color.setScalar(dark ? 1.3 : 1.9);
    rim.intensity = dark ? 2.2 : 1.3;
    renderer.toneMappingExposure = dark ? 1.15 : 1.05;
  }

  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (!ex || !container.isConnected) return;
    frame++;
    if (now - stageAt > 400) { stageAt = now; readStage(); }
    if (!shownAt) shownAt = now;
    const k = reduce ? 5000 : now - shownAt; // time since this exercise appeared
    const t = heldAt ?? (reduce ? 1 : easeT(now, period));
    if (ghost) {
      const gt = heldAt ?? (reduce ? 1 : easeT(now));
      pose(lerpPose(ghostA, ghostB, gt), fig3.ik ? gt : null, ghost, ghostEnds);
      ghost.mat.uniforms.opacity.value = (ghostOn ? 0.3 : 0) * smooth((k - 450) / 650);
    }
    pose(lerpPose(poseA, poseB, t), fig3.ik ? t : null);
    // Activation follows the effort of the rep: strongest while the weight is moving.
    const speed = lastNow ? Math.abs(t - lastT) / Math.max(1, now - lastNow) : 0;
    effort += ((reduce ? 1 : 0.55 + 0.45 * Math.min(1, speed / 0.0009)) - effort) * 0.08;
    lastT = t; lastNow = now;
    const u = fiberUniforms;
    u.uTime.value = reduce ? 0 : now / 1000; u.uEffort.value = effort;
    // Appear: a scan band sweeps up the body, then the muscles fill with activation and,
    // on correct form, a soft energy rim settles around the body.
    u.uScanY.value = k < 1100 ? floor.position.y - 10 + (k / 1000) * (bodyTop - floor.position.y + 20) : -999;
    u.uActScale.value = smooth((k - 350) / 700);
    u.uRim.value = mode === "good" ? 0.05 + 0.18 * Math.exp(-Math.pow((k - 1100) / 450, 2)) * smooth(k / 900) : 0;
    u.uFiber.value += ((fibersOn ? 1 : 0) - u.uFiber.value) * 0.08;
    // Breathing: the ribcage swells a little.
    const breath = 1 + 0.018 * Math.sin(now / 650);
    body.parts.upperTorso.scale.x = breath; body.parts.upperTorso.scale.z = 1 + 0.009 * Math.sin(now / 650);
    // The camera glides to each new framing instead of jumping (and follows a drag at once).
    const aim = closeUp ? closeUp.at : target, d = closeUp ? dist / closeUp.zoom : dist;
    const dt = Math.min(0.1, Math.max(0, (now - (cam.at || now)) / 1000)); cam.at = now;
    const kk = cam.snap || reduce ? 1 : 1 - Math.exp(-dt / 0.38);
    cam.snap = false;
    cam.aim.lerp(aim, kk); cam.d += (d - cam.d) * kk;
    if (drag) { cam.yaw = yaw; cam.pitch = pitch; } else { cam.yaw += (yaw - cam.yaw) * kk; cam.pitch += (pitch - cam.pitch) * kk; }
    camera.position.set(cam.aim.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.d, cam.aim.y + Math.sin(cam.pitch) * cam.d, cam.aim.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.d);
    camera.lookAt(cam.aim);
    camera.updateMatrixWorld();
    updateFeedback(now, k);
    if (hoverAt && frame % 3 === 0) {
      // The body is moving under the pointer, so keep the name up briefly between hits.
      const [x, y] = hoverAt, id = muscleAt(x, y);
      hoverMiss = id ? 0 : hoverMiss + 1;
      if (id || hoverMiss > 8) showTip(id, x, y, false);
    }
    renderer.render(scene, camera);
  }

  let bodyTop = 180, closeUp = null, heldAt = null;
  const cam = { aim: new THREE.Vector3(0, 90, 0), d: 400, yaw: VIEW3D.yaw, pitch: VIEW3D.pitch, at: 0, snap: true };
  function setExercise(next) {
    ex = next;
    form = (typeof FORM !== "undefined" ? FORM : {})[ex.name] || null;
    const fig = { ...ex.figure, ...(ex.figure3d || {}) };
    fig3 = fig;
    clearEquipment();
    const fault = mode === "bad" ? { ...ex.bad, ...(ex.bad3d || {}) } : null;
    const extra = { armsOut: fig.armsOut, abd: fig.abd, abdAxis: fig.abdAxis };
    // fig.mix: 3D-only joint angles applied to both ends of the rep (e.g. hands on a machine's handles).
    poseA = { ...extra, ...fig.a, ...fig.mix, ...(fault && fault.a) };
    poseB = { ...extra, ...fig.b, ...fig.mix, ...(fault && fault.b) };
    ghostA = { ...extra, ...fig.a, ...fig.mix }; ghostB = { ...extra, ...fig.b, ...fig.mix };
    poseA.view = poseB.view = ghostA.view = ghostB.view = undefined;
    reachEnds = [poseA, poseB].map((q) => ({ j: solveSide(q), gz: q.gz }));
    ghostEnds = [ghostA, ghostB].map((q) => ({ j: solveSide(q), gz: q.gz }));
    const err = form && form.error;
    period = mode === "bad" && err && err.type === "tempo" ? (err.tempo === "slow" ? 8000 : 2300) : 4600;
    const handMode = !fig.hand || fig.hand === "grip" ? true : fig.hand === "relaxed" ? "relaxed" : false;
    body.setHands(handMode);
    if (ghost) ghost.setHands(handMode);
    // A hanging or supported body holds the bar where its hands are at the start of the rep.
    holdAt = null;
    if (fig.hold === "hands") {
      pose(lerpPose(ghostA, ghostB, 0), fig.ik ? 0 : null);
      holdAt = gripPoint("R").add(gripPoint("L")).multiplyScalar(0.5);
    }
    resize();
    // Each exercise has its best camera angle; the camera glides there.
    [yaw, pitch] = fig.view || ex.view || [VIEW3D.yaw, VIEW3D.pitch];
    frameCamera();
    measureRep();
    viewer.analysis = null;
    pinned = null; tip.hidden = true; focusId = null;
    setFeedback();
    setActivation();
    fitScene();
    shownAt = 0;
  }

  raf = requestAnimationFrame(tick);
  const viewer = {
    setExercise,
    analysis: null, // after setExercise on a mistake: { label, your, optimal } for the biggest difference
    resetView() { [yaw, pitch] = (fig3 && fig3.view) || (ex && ex.view) || [VIEW3D.yaw, VIEW3D.pitch]; },
    // Male or female athlete: the body's surface changes under a scan sweep; the exercise, pose,
    // camera, activation and form analysis all stay as they are.
    get athlete() { return athlete; },
    setAthlete(sex) {
      sex = sex === "female" ? "female" : "male";
      if (sex === athlete) return;
      athlete = sex;
      body.setAthlete(sex, () => { domBone = null; if (ex) { setActivation(); fitScene(); } shownAt = 0; });
      if (ghost) ghost.setAthlete(sex);
    },
    // Live biomechanics at the current moment of the rep: joint angles in degrees (null for joints
    // this exercise doesn't move), spine shape, range of motion against the optimal rep, stability.
    metrics() {
      if (!ex || !measured) return null;
      const J = jointsOf(body), r = (v) => Math.round(v);
      const at = (k, a, b, c) => (measured.moves[k] ? r(angle3(J[a], J[b], J[c])) : null);
      const up = J.spine.clone().sub(J.pelvis), hi = J.neck.clone().sub(J.spine), dev = 180 - angle3(J.pelvis, J.spine, J.neck);
      const spine = dev < 20 ? "Neutral" : up.x * hi.y - up.y * hi.x > 0 ? "Flexed" : "Extended";
      return { knee: at("knee", "hip", "knee", "ankle"), hip: at("hip", "neck", "pelvis", "knee"), elbow: at("elbow", "shoulder", "elbow", "hand"),
        shoulder: at("shoulder", "pelvis", "shoulder", "elbow"), spine, range: measured.range, stability: measured.stability };
    },
    // Turn the camera to a given angle (radians around the body, and up/down).
    // zoom > 1 moves in on a point atY above the framed center (for close-ups of the body).
    setView(y, p, zoom, atY) { yaw = y; if (p != null) pitch = p; closeUp = zoom > 1 ? { zoom, at: new THREE.Vector3(target.x, target.y + (atY || 0), target.z) } : null; },
    // Show one muscle on its own (null for all the exercise's muscles).
    focusMuscle(id) { focusId = id || null; if (ex) setActivation(); },
    // Fiber detail: show each working muscle's fiber direction clearly (off: only a faint hint).
    setFibers(on) { fibersOn = !!on; },
    // Hold the rep still at a moment t (0 = start, 1 = end of the movement); null plays it.
    holdAt(t) { heldAt = t == null ? null : Math.min(1, Math.max(0, t)); },
    // Show or hide the optimal-form ghost over a mistake.
    setGhost(on) { ghostOn = !!on; },
    // Contact report (for automated checks): how the body meets the floor and the equipment.
    inspect() {
      if (!body.skin || !ex) return null;
      const S = sampleRep(8), ctx = makeCtx(S), r = (v) => Math.round(v * 10) / 10, v3 = (v) => [r(v.x), r(v.y), r(v.z)];
      const feet = (n) => n.startsWith("foot");
      const out = {
        floorY: r(floorY), bodyMin: r(ctx.lowest({})), feetMin: S.map((s) => r(Math.min(...[...Array(s.pts.length / 3).keys()].filter((v) => feet(ctx.names[dominantBones()[v]])).map((v) => s.pts[3 * v + 1])))),
        grips: S.map((s) => [v3(s.grip.R), v3(s.grip.L)]), joints: S.map((s) => Object.fromEntries(Object.entries(s.J).map(([k, v]) => [k, v3(v)]))),
        bounds: (() => { const b = ctx.bounds(); return [v3(b.min), v3(b.max)]; })(),
        report: rig && rig.report ? rig.report(ctx) : null
      };
      pose(lerpPose(poseA, poseB, 0), fig3.ik ? 0 : null);
      return out;
    },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); if (ro) ro.disconnect();
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      el.remove(); hud.remove();
    }
  };
  return viewer;
}

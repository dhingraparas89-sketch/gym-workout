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
  skin: "#3d4045",       // matte dark charcoal body
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
  // Clothing and hair, as masks over the rest-pose body. cloth(x, y, z, out) returns how much a
  // point is covered by fabric (0..1) and fills out = [fabric, how far fabric/hair stands off the
  // skin, hair (0..1), seam line (0..1)]. Edges ramp over about a grid cell so the shader can draw
  // them as a crisp line at the 0.5 crossing instead of a staircase of vertices.
  //   Shorts (both athletes): waist to mid-thigh, a thicker waistband and hems.
  //   CFG.top (female): a fitted sports bra, an elastic underband with a seam, scoop neckline,
  //   straps over the shoulders into a racerback.
  //   CFG.hair (female): hair combed back over the skull from a natural hairline to a high tie.
  const segIx = (n) => segs.findIndex((g) => g.name === n);
  const TORSO = segIx("lowerTorso"), CHEST = segIx("upperTorso"), HEAD = segIx("head"), THIGHS = [segIx("thighR"), segIx("thighL")], ARMS = [segIx("upperArmR"), segIx("upperArmL")];
  const CFG = (TORSO >= 0 && segs[TORSO].cloth) || { waist: 7.3, off: 0.55, hem: 21 };
  const clothOut = [0, 0, 0, 0];
  const band = (v, c, w) => Math.exp(-(((v - c) / w) ** 2));
  function cloth(x, y, z, out) {
    out[0] = 0; out[1] = 0; out[2] = 0; out[3] = 0;
    if (TORSO < 0) return 0;
    local(segs[TORSO], x, y, z, Q);
    const W = CFG.waist, hem = CFG.hem;
    let r = Math.hypot(Q[0], Q[2]), m = (1 - skinSmooth(W - 0.7, W + 0.7, Q[1])) * skinSmooth(-16, -14, Q[1]) * (1 - skinSmooth(21, 23, r));
    let lip = m * band(Q[1], W - 0.9, 0.9), seam = Q[1] - (W - 2.2), off = CFG.off;
    for (let i = 0; i < 2; i++) {
      const g = segs[THIGHS[i]];
      if (!g) continue;
      local(g, x, y, z, Q);
      r = Math.hypot(Q[0], Q[2]);
      const mt = (1 - skinSmooth(hem - 0.7, hem + 0.7, Q[1])) * skinSmooth(-4, -2, Q[1]) * (1 - skinSmooth(11, 13, r));
      if (mt > m) { m = mt; lip = mt * band(Q[1], hem - 0.9, 0.9); seam = Q[1] - (hem - 2.0); }
    }
    const T = CFG.top;
    if (T && CHEST >= 0) {
      local(segs[CHEST], x, y, z, Q);
      const front = Q[0] > 0, az0 = Math.abs(Q[2]);
      // Scoop neckline in front, a racerback dipping between the shoulder blades behind.
      const top = (front ? T.y1 : T.back) - (az0 < 9 ? (front ? 3.2 : 2) * Math.cos((az0 / 9) * Math.PI / 2) : 0);
      let mt = skinSmooth(T.y0 - 0.6, T.y0 + 0.6, Q[1]) * (1 - skinSmooth(top - 0.6, top + 0.6, Q[1])) * (1 - skinSmooth(19, 21, Math.hypot(Q[0], Q[2])));
      // Straps over the shoulders, from the top's edge to the back: wide where they leave the
      // neckline, narrowing as they climb outward over the shoulder.
      const az = Math.abs(Q[2]), sy = Q[1] - T.y1, sc = T.strap[0] + 0.3 * sy, sw = Math.max(1.3, T.strap[1] - 0.1 * sy);
      const strap = (1 - skinSmooth(sw - 0.6, sw + 0.6, Math.abs(az - sc))) * skinSmooth(top - 1.5, top, Q[1]) * (1 - skinSmooth(T.strapTop - 0.6, T.strapTop + 0.6, Q[1]));
      mt = Math.max(mt, strap);
      // Not on the arms: wherever the upper arm is nearer than the chest, the top stops.
      if (mt > 0 && az > 11) {
        const dc = skinLatheDist(segs[CHEST].lathe, Q[0], Q[1], Q[2]);
        for (let i = 0; i < 2; i++) {
          const g = segs[ARMS[i]]; if (!g) continue;
          local(g, x, y, z, Q);
          mt *= skinSmooth(-0.8, 0.8, skinLatheDist(g.lathe, Q[0], Q[1], Q[2]) - dc);
        }
      }
      if (mt > m) {
        m = mt; off = T.off;
        // Elastic underband: a little thicker, with a stitched seam along its top edge.
        lip = mt * 0.6 * (1 - skinSmooth(T.y0 + 2.6, T.y0 + 3.4, Q[1]));
        seam = Q[1] - (T.y0 + 3.0);
      }
    }
    out[0] = m; out[1] = m * off + lip * 0.22; out[3] = 0.5 + Math.max(-1.5, Math.min(1.5, seam)) / 3;
    const Hc = CFG.hair;
    if (Hc && HEAD >= 0) {
      local(segs[HEAD], x, y, z, Q);
      const dx = Q[0] - Hc.c[0], dy = Q[1] - Hc.c[1], dz = Q[2] - Hc.c[2], l = Math.hypot(dx, dy, dz) || 1;
      if (l < 16) {
        // Hairline: across the top of the forehead, down in front of the ears, behind them to the nape.
        const nx = dx / l, ny = dy / l, nz = dz / l;
        const s = ny * 0.85 - nx * 0.6 + 0.36 - 0.14 * Math.max(0, nx) * Math.abs(nz);
        const hm = skinSmooth(-0.07, 0.07, s);
        if (hm > 0) {
          const tx = Q[0] - Hc.tie[0], ty = Q[1] - Hc.tie[1], tz = Q[2] - Hc.tie[2];
          // Thin at the hairline, fuller over the crown and gathered toward the tie.
          const th = (0.3 + 0.32 * Math.max(0, ny) + 0.55 * Math.exp(-(tx * tx + ty * ty + tz * tz) / 14)) * skinSmooth(0, 0.35, s);
          out[2] = hm; out[1] = Math.max(out[1], th * hm);
        }
      }
    }
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
    const cm = Math.max(cloth(x, y, z, clothOut), clothOut[2]), off = clothOut[1];
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
  const aux = new Float32Array(nv * 4), AO_D = [1, 2.2, 4, 6.5], AO_W = [0.35, 0.3, 0.22, 0.15];
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
        weights[f.id][v] = Math.max(weights[f.id][v], 1 - skinSmooth(0.3, 2.6, e));
        if (!top || e < t1) { if (top && f.group !== top.group) t2 = Math.min(t2, t1); top = f; t1 = e; topSeg = s; }
        else if (f.group !== top.group) t2 = Math.min(t2, e);
      });
    }
    let sum = 0;
    for (let s = 0; s < S; s++) { const w = ds[s] >= BIG ? 0 : 1 - skinSmooth(0, segs[s].tau, ds[s] - dmin); bw[v * S + s] = w; sum += w; }
    for (let s = 0; s < S; s++) bw[v * S + s] /= sum || 1;
    // Two different muscles meeting near the surface: a faint groove between them.
    clothV[v] = cloth(x, y, z, clothOut);
    aux[v * 4 + 1] = clothOut[2]; aux[v * 4 + 2] = clothOut[3];
    const sep = (t2 < BIG ? (1 - skinSmooth(0, 1.4, t2 - t1)) * (1 - skinSmooth(0.8, 2.6, t2)) : 0) * (1 - clothV[v]) * (1 - clothOut[2]);
    fib[v * 4 + 3] = sep;
    // Ambient occlusion from the field: step out along the normal and see how much of the body
    // is still close (armpits, the crotch, between the glutes, under the chest stay darker).
    let occ = 0;
    for (let i = 0; i < AO_D.length; i++) {
      const d = AO_D[i], f = field(x + nor[v * 3] * d, y + nor[v * 3 + 1] * d, z + nor[v * 3 + 2] * d);
      occ += AO_W[i] * Math.max(0, d - f) / d;
    }
    aux[v * 4] = Math.max(0.3, 1 - 1.15 * occ);
    if (top && top.spec) {
      local(segs[topSeg], x, y, z, L);
      const [u, w] = skinFiberUV(top.spec, L[0], L[1], L[2]);
      fib[v * 4] = u; fib[v * 4 + 1] = w; fib[v * 4 + 2] = 1 - skinSmooth(0.3, 2.8, t1);
    }
    pos[v * 3] -= nor[v * 3] * 0.12 * sep; pos[v * 3 + 1] -= nor[v * 3 + 1] * 0.12 * sep; pos[v * 3 + 2] -= nor[v * 3 + 2] * 0.12 * sep;
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
  // Finer muscles also light their parent group (front and side delts -> "shoulders"), so data that
  // names the older ids keeps working.
  const PAR = (TORSO >= 0 && segs[TORSO].parents) || {};
  Object.keys(PAR).forEach((id) => {
    const p = PAR[id], w = weights[id]; if (!w) return;
    const pw = weights[p] || (weights[p] = new Float32Array(nv));
    for (let v = 0; v < nv; v++) if (w[v] > pw[v]) pw[v] = w[v];
  });
  return { pos, nor, index: new Uint32Array(index), fib, cloth: clothV, aux, weights, skinIndex, skinWeight };
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
    const src = SKIN_HELPERS.map(String).join("\n") + "\nonmessage = (e) => { const d = buildSkinData(e.data); postMessage(d, [d.pos.buffer, d.nor.buffer, d.index.buffer, d.fib.buffer, d.cloth.buffer, d.aux.buffer, d.skinIndex.buffer, d.skinWeight.buffer, ...Object.values(d.weights).map((w) => w.buffer)]); };";
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
    if (!geo.attributes.aux) { const a = new Float32Array(n * 4); for (let i = 0; i < n; i++) { a[i * 4] = 1; a[i * 4 + 2] = 1; } geo.setAttribute("aux", new THREE.Float32BufferAttribute(a, 4)); } // ao 1, no seam
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
  // Both athletes share the skeleton (joints, bones and rest pose, so every exercise, pose and
  // equipment fit works unchanged) but each has her or his own surface: v(male, female) picks the
  // number. The female body is not a rescaled male: a smaller ribcage and narrower shoulders over a
  // wider pelvis, a natural waist, fuller hips, glutes and upper thighs, slimmer arms and calves,
  // breasts under a sports bra, softer muscle separation, and hair.
  function skinDefs(sex) {
    const F = sex === "female", v = (m, f) => (F ? f : m);
    const SH = VIEW3D.shoulderHalf, HH = VIEW3D.hipHalf;
    const M = (pos, q) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), q || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    const Q = (x, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, 0, z, "XYZ"));
    const Qy = (y) => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, y, 0));
    const armOut = 0.35, legOut = 0.16; // rest pose: arms and legs held a little away from the body
    const defs = [];
    const add = (name, base, feats, rest, k, tau) => defs.push({ name, base, feats, rest, k, tau });
    const ro = (rows, k) => rows.map((r) => [r[0], r[1] * k, ...r.slice(2)]); // scale a lathe's widths

    // Pelvis, belly and lower back (hip -> middle of the spine, 26 units).
    // Rows are [y, half-width, depth/width, front offset]: the waist narrows above the iliac crest,
    // the lumbar curve brings the waist forward, and the pelvis tapers down into the crotch so the
    // hips' width comes from the tops of the thighs, not from a wide bowl.
    const glute = { t: "fan", o: [-1, -3, 12], n: [-1, 0, 0.5] };
    const gfib = (s) => ({ ...glute, o: [-1, -3, s * 12], n: [-1, 0, s * 0.5], g: s });
    add("lowerTorso", { lathe: v(
      [[-12, 2], [-10, 6.2, 0.9, -0.6], [-7, 9.6, 0.84, -0.9], [-3, 12.2, 0.8, -1.0], [1, 13.2, 0.77, -0.9], [5, 13.5, 0.75, -0.5],
        [9, 13.4, 0.73, 0], [13, 13.0, 0.72, 0.6], [18, 13.1, 0.73, 0.7], [23, 13.6, 0.74, 0.4], [28, 13.6, 0.74, 0], [31, 10.5, 0.74, 0]],
      // Hers: a broader, deeper pelvis, the waist narrowest a little above the navel, a deeper lumbar curve.
      [[-12, 2], [-10, 7.0, 0.92, -0.9], [-7, 11.2, 0.86, -1.4], [-3, 14.2, 0.8, -1.5], [1, 14.9, 0.78, -1.3], [5, 14.4, 0.77, -0.8],
        [9, 13.0, 0.77, 0.1], [13, 11.9, 0.78, 0.9], [17, 11.5, 0.79, 1.1], [21, 11.7, 0.8, 0.9], [25, 12.0, 0.8, 0.4], [28, 12.1, 0.8, 0], [31, 9.4, 0.8, 0]]),
    depth: v(0.76, 0.79) }, [
      // Rectus abdominis: one long strap each side of the midline, lying flat on the abdominal wall.
      ...[1, -1].map((s) => ["abs", 13, s * 14, v(0.6, 0.22), [1.6, 11.5, 3.2], 0, v(3.2, 4), { t: "lin", o: [10, 26, 0], n: [0, 1, 0], c: [0, 0, 1], g: s }]),
      // External obliques run down and forward ("hands in pockets") to the iliac crest.
      ...[1, -1].map((s) => ["obliques", 12, s * 74, v(0.55, 0.25), [2.0, 8, 6], s * 0.25, v(3.6, 4.4), { t: "lin", o: [6, 2, s * 6], n: [0.7, -0.7, 0], c: [0.7, 0.7, 0], g: s }]),
      // Erectors run straight up beside the spine, leaving a shallow groove down the middle.
      ...[1, -1].map((s) => ["lower-back", 13, s * 162, v(0.85, 0.55), [1.8, 11.5, 2.8], 0, 3.4, { t: "lin", o: [-5, -2, s * 3], n: [0, 1, 0], c: [0, 0, 1], g: s }]),
      // Glute max: a broad, rounded quadrant from the sacrum down and out toward the thigh, its lower
      // edge forming the gluteal fold; glute med fills the side above it. Hers fuller and rounder.
      ...[1, -1].map((s) => ["glutes", v(-2.5, -3.2), s * v(150, 147), v(1.6, 2.5), v([3.6, 8.6, 7.2], [4.4, 9.0, 7.9]), s * 0.35, v(4.2, 4.8), gfib(s)]),
      ...[1, -1].map((s) => ["glutes", v(6, 5), s * 112, v(0.5, 0.8), [2.0, 5, 5.5], 0, 3.8, gfib(s)]),
      // Tensor fasciae latae / hip: carries the outline from the waist over the hip to the thigh.
      ...[1, -1].map((s) => [null, v(1, 0.5), s * 94, v(0.5, 1.1), v([2.0, 6, 4], [2.6, 7, 5]), 0, 4]),
      ...(F ? [
        [null, 6, 0, 0.5, [2.2, 5, 8], 0, 4.5] // a softly rounded lower belly
      ] : [
        // Abdominal wall: a shallow line down the middle and two faint lines across the rectus.
        { abs: ["cut", 11.6, 20, 0, 0.7, 7.5, 0.4, null, 1.6] },
        { abs: ["cut", 11.6, 17.5, 0, 0.42, 0.45, 6.0, null, 1.8] },
        { abs: ["cut", 11.9, 23, 0, 0.42, 0.45, 6.4, null, 1.8] }
      ]),
      // Creases: the cleft between the glutes, and the gluteal fold where each glute meets the thigh.
      { abs: ["cut", v(-12.6, -14.2), v(-3, -3.8), 0, 2.6, 6.5, 0.55, null, 1.4] },
      ...[1, -1].map((s) => ({ abs: ["cut", v(-11.2, -12.2), v(-10.6, -11.6), s * v(6.5, 7), 3, 0.7, 5, [s * 0.18, 0, 0], v(1.6, 2)] }))
    ], M([0, 0, 0]), 0, 6);

    // Ribcage, chest, lats and upper back (middle of the spine -> shoulders).
    const pec = (s) => ({ t: "fan", o: [3, 22, s * 15], n: [1, 0, 0], r: [0, -3, -s * 8], g: s });
    const UT = [[-5, 10.07], [-2, 13.04], [1, 13.78], [6, 15.05], [12, 15.9], [17, 16.22], [21, 15.9], [23.5, 14.84], [25.5, 12.19], [27, 9.01], [28.5, 6.78], [30, 3.18]];
    add("upperTorso", { lathe: v(UT,
      // Hers: a smaller ribcage, narrowing more toward the shoulders.
      [[-5, 9.4], [-2, 12.0], [1, 12.4], [6, 13.0], [12, 13.6], [17, 13.9], [21, 13.6], [23.5, 12.9], [25.5, 10.9], [27, 8.3], [28.5, 6.2], [30, 2.9]]),
    depth: v(0.74, 0.78) }, [
      ...[1, -1].flatMap((s) => [
        // Pec major: a flat, curved plate over the ribs that narrows into a tendon at the armpit.
        ["chest", v(15.2, 16.2), s * 25, v(1.35, 0.55), v([2.4, 5.4, 6.8], [2.0, 4.6, 6.0]), s * -0.12, v(2.6, 3.4), pec(s)],
        ["chest", 20.8, s * 33, v(1.0, 0.45), [2.0, 3.0, 6.0], s * 0.12, v(2.8, 3.4), pec(s)],
        ["chest", 19.8, s * 58, v(0.9, 0.5), [2.0, 2.5, 3.8], s * 0.35, 2.8, pec(s)],
        // Upper rectus abdominis, over the lower ribs up to the chest.
        ["abs", 4, s * 14, v(0.7, 0.2), [1.5, 6, 3.0], 0, v(2.8, 4), { t: "lin", o: [10, 0, 0], n: [0, 1, 0], c: [0, 0, 1], g: s }],
        // Serratus: slips running up and back toward the shoulder blade.
        ["obliques", 8, s * 80, v(0.5, 0.2), [1.6, 5, 3.4], s * 0.5, 2.6, { t: "lin", o: [-3, 14, s * 12], n: [-0.6, 0.8, 0], c: [0.8, 0.6, 0], g: s }],
        // Lats: from the low back and pelvis up under the armpit to the front of the upper arm.
        ["lats", 12, s * 128, v(1.5, 0.6), [2.6, 11, 6.2], s * -0.2, v(3.2, 3.8), { t: "fan", o: [0, 21, s * 13.5], n: [-1, 0, s * 0.6], g: s }],
        // Rhomboids: from the spine down and out to the inner edge of the shoulder blade.
        ["rhomboids", 17, s * 160, v(0.8, 0.4), [2.0, 6.5, 4.0], 0, 2.8, { t: "lin", o: [-7, 22, 0], n: [0, -0.45, s * 0.9], c: [0, s * 0.9, 0.45], g: s }],
        // Infraspinatus and teres over the shoulder blade, under the rear delt.
        [null, 16, s * 142, v(0.6, 0.3), [1.8, 4.6, 4.0], s * 0.4, 3],
        // Erectors fading out up the thoracic spine.
        ["lower-back", 3, s * 164, v(0.45, 0.3), [1.6, 9, 2.4], 0, 3.4, { t: "lin", o: [-5, -28, s * 3], n: [0, 1, 0], c: [0, 0, 1], g: s }],
        // Middle and lower traps toward the shoulder blade spine.
        ["traps", 18, s * 172, v(0.7, 0.35), [1.8, 8, 2.8], 0, 2.8, { t: "fan", o: [-4, 25, s * 12], n: [-1, 0, 0], r: [0, -4, -s * 8], g: s }],
        // Upper traps: the slope from the neck out to the shoulder tip.
        { abs: ["traps", -1.6, 25.8, s * v(8.6, 8.0), v(3.4, 2.9), v(3.0, 2.4), v(7.6, 6.8), [s * 0.42, 0, 0], 3.8, { t: "fan", o: [-1, 27, s * 14], n: [-0.5, 1, 0], r: [0, 0, -s], g: s }] },
        // Shoulder girdle: collarbone, shoulder blade spine and acromion carry the slope out to the arm.
        { abs: [null, -0.5, 23.6, s * v(15.4, 15.0), v(3.6, 3.1), v(2.8, 2.4), v(4.2, 3.9), [s * 0.25, 0, 0], 4.0] },
        ...(F ? [
          // Breasts: a fuller lower curve (gravity), the upper slope melting into the pec, each turned
          // a little outward; held together by the sports bra, so only a shallow dip between them.
          { abs: [null, 8.8, 10.8, s * 8.4, 3.5, 5.0, 5.1, [0, s * 0.32, 0], 4.2] },
          { abs: [null, 9.5, 9.3, s * 8.7, 3.3, 3.5, 4.5, [s * 0.1, s * 0.35, 0], 2.4] },
          ...(s > 0 ? [{ abs: [null, 10.2, 9.8, 0, 1.7, 3.2, 4.6, null, 2.6] }] : [])
        ] : [])
      ])
    ], M([0, 26, 0]), 3, 6);

    // Neck (the head rides on it), leaning a little forward as it rises.
    add("neck", { lathe: ro([[-4, 6.9, 1.05, -0.6], [0, 6.0, 1.02, -0.4], [4, 5.4, 1.0, 0], [8, 5.1, 1.0, 0.3], [11, 5.0, 1.0, 0.3], [14, 3]], v(1, 0.86)), depth: 1.02 }, [
      ...[1, -1].map((s) => [null, 6, s * 42, v(0.6, 0.35), [1.4, 6, 1.5], s * 0.55, 1.8]), // sternocleidomastoids
      ["traps", 2, 180, v(1, 0.6), [2.6, 5, 5.6], 0, 2.6, { t: "lin", o: [-3, -3, 0], n: [0, 1, 0], c: [0, 0, 1] }],
      // Upper traps climb the sides of the neck, so the shoulders slope down from it.
      ...[1, -1].map((s) => ["traps", v(3.5, 2.5), s * 118, v(2.6, 1.3), [2.8, v(6.5, 5.5), 4.0], 0, 3.2, { t: "fan", o: [-1, -24, s * 14], n: [0.3, 1, 0], r: [0, 0, s], g: s }])
    ], M([0, 51, 0]), 3.5, 4);
    // Head: a plain faceless oval like an anatomy mannequin: the cranium fuller at the back, the
    // jaw narrower than the skull and the chin a little forward, so the neck meets it from below.
    add("head", { ell: v([0.2, 2.4, 0, 7.9, 9.0, 6.9], [0.2, 2.6, 0, 7.5, 8.6, 6.5]) }, [
      { abs: [null, v(-2.1, -2.0), 3.4, 0, v(6.1, 5.8), v(6.1, 5.8), v(6.6, 6.2), null, 3] },        // back of the skull
      { abs: [null, v(2.5, 2.3), v(-4.4, -4.0), 0, v(5.4, 5.0), v(4.9, 4.6), v(4.9, 4.4), [0, 0, -0.25], 2.6] } // jaw and chin
    ], M([0, 66.5, 0]), 3, 2);

    [1, -1].forEach((side) => {
      const s = side > 0 ? "R" : "L";
      // Limbs hang down (local -x is the front of the body, th = 180), side * 90 is the outer side.
      const armQ = Q(-side * armOut, Math.PI), sh = new THREE.Vector3(0, 49, side * SH);
      const elbow = new THREE.Vector3(0, 30, 0).applyQuaternion(armQ).add(sh);
      const delt = { t: "fan", o: [0, 14, side * 3.6], n: [0, -14, -side * 3.6], r: [0, 0, side] };
      const dm = v(1, 0.42), am = v(1, 0.5);
      add("upperArm" + s, { lathe: ro([[v(-1.2, -0.4), v(2.6, 2.4)], [0, 3.9], [1.5, 4.4], [3, 4.7], [6, 4.65], [12, 4.3], [20, 4.1], [26, 3.8], [30, 3.6], [33.5, 1.5]], v(1, 0.84)), depth: 0.95 }, [
        // Deltoid: front, side and rear heads cap the joint from above and converge on the outer arm
        // a third of the way down; each head's fibers run its own way to that insertion.
        ["front-delts", 3.8, side * 150, 1.0 * dm, [2.3, 7.4, 4.0], side * 0.3, 3.2, delt],
        ["side-delts", 4.0, side * 95, 1.2 * dm, [2.5, 7.6, 4.6], 0, 3.4, delt],
        ["rear-delts", 3.8, side * 38, 0.95 * dm, [2.3, 7.4, 4.0], -side * 0.3, 3.2, delt],
        // Biceps in front, triceps behind (long head inside, lateral head outside): long fibers down
        // to their tendons at the elbow; brachialis shows low on the outer side between them.
        ["biceps", 15.5, 180, 1.35 * am, [2.5, 7.6, 2.9], 0, 2.6, { t: "long", o: [0, 30, 0], n: [0, 1, 0], r: [-1, 0, 0] }],
        ["triceps", 11.5, side * 45, 1.05 * am, [2.2, 7, 2.8], 0, 2.6, { t: "long", o: [0, 31, 0], n: [0, 1, 0], r: [1, 0, 0], g: "lat" }],
        ["triceps", 14.5, -side * 25, 1.0 * am, [2.2, 8.5, 2.7], 0, 2.6, { t: "long", o: [0, 31, 0], n: [0, 1, 0], r: [1, 0, 0], g: "long" }],
        [null, 22, side * 140, 0.6 * am, [1.6, 5, 2.2], 0, 2.6],
        // Elbow: the joint, the point of the elbow behind, the two bony knobs either side.
        { abs: [null, 0.3, 30, 0, v(3.0, 2.6), v(3.0, 2.6), v(3.0, 2.6), null, 1.8] },
        { abs: [null, 2.4, 30.6, 0, 1.3, 1.7, 1.5, null, 1.4] },
        { abs: [null, 0.3, 29.4, -side * v(3.2, 2.8), 1.2, 1.4, 1.0, null, 1.4] }
      ], M(sh.toArray(), armQ), 2.6, 3);
      add("forearm" + s, { lathe: ro([[-2.5, 3.1], [0, 3.95], [4, 4.35], [9, 4.05], [16, 3.3], [22, 2.62], [27, 2.31], [29.5, 1.68], [30.5, 0.11]], v(1, 0.86)), depth: 0.85 }, [
        // Brachioradialis on the thumb side, extensors behind it, flexors on the inner front.
        ["forearms", 5, side * 140, v(1.0, 0.55), [1.9, 7.5, 2.4], 0, 2.6, { t: "long", o: [0, 27, 0], n: [0, 1, 0], g: "br" }],
        ["forearms", 8, side * 70, v(0.8, 0.45), [2.0, 8, 2.6], 0, 2.6, { t: "long", o: [0, 27, 0], n: [0, 1, 0], g: "ext" }],
        ["forearms", 8, -side * 140, v(0.9, 0.5), [2.0, 8, 2.6], 0, 2.6, { t: "long", o: [0, 27, 0], n: [0, 1, 0], g: "flex" }]
      ], M(elbow.toArray(), armQ), 2.6, 3);
      // Palm (faces local -x, thumb toward side * z), joined to the forearm at the wrist.
      const wrist = new THREE.Vector3(0, 27, 0).applyQuaternion(armQ).add(elbow), hk = v(1, 0.92);
      add("hand" + s, { ell: [0, 4.8 * hk, 0, 1.4 * hk, 5.2 * hk, 3.95 * hk] }, [
        { abs: [null, -0.75 * hk, 1.8 * hk, side * 2.5 * hk, 1.55 * hk, 3.1 * hk, 1.85 * hk, null, 1.5] },  // thumb pad
        { abs: [null, -0.55 * hk, 2.6 * hk, -side * 2.5 * hk, 1.3 * hk, 3.5 * hk, 1.55 * hk, null, 1.5] }, // little-finger side pad
        { abs: [null, 0, 8.35, 0, 1.75 * hk, 1.3 * hk, 4.2 * hk, null, 1.1] }                              // knuckles
      ], M(wrist.toArray(), armQ), 2, 2);

      const legQ = Q(-side * legOut, Math.PI), hip = new THREE.Vector3(0, 0, side * HH);
      const knee = new THREE.Vector3(0, 42, 0).applyQuaternion(legQ).add(hip);
      const ankle = new THREE.Vector3(0, 42, 0).applyQuaternion(legQ).add(knee);
      const quad = (g) => ({ t: "fan", o: [-5, 41.5, 0], n: [-1, 0, 0], r: [0, -1, 0], g });
      const qm = v(1, 0.55);
      // Thigh (local x points back): full at the top, a long gradual taper to the knee, the quads
      // carrying the front forward through the middle and the hamstrings rounding the back above.
      add("thigh" + s, { lathe: v(
        [[-9, 3], [-7, 7.0], [-4, 8.5, 1.0, 0.3], [0, 8.9, 1.02, 0.5], [5, 8.8, 1.04, 0.4], [10, 8.5, 1.02, 0.1], [16, 8.0, 1.0, -0.3],
          [22, 7.5, 0.98, -0.45], [28, 6.8, 0.97, -0.35], [33, 6.0, 0.97, -0.1], [37, 5.4, 0.98, 0], [40, 5.1, 1.0, 0], [43, 5.0, 1.02, 0.1], [46.5, 2.2]],
        // Hers: fuller at the hip and upper thigh, a smooth taper to a slimmer knee.
        [[-9, 3.3], [-7, 7.8], [-4, 9.6, 1.0, 0.4], [0, 10.0, 1.02, 0.6], [5, 9.7, 1.03, 0.5], [10, 9.1, 1.02, 0.2], [16, 8.3, 1.0, -0.2],
          [22, 7.5, 0.98, -0.35], [28, 6.6, 0.97, -0.3], [33, 5.7, 0.97, -0.1], [37, 5.1, 0.98, 0], [40, 4.8, 1.0, 0], [43, 4.7, 1.02, 0.1], [46.5, 2.1]]),
      depth: 1 }, [
        // Quads: rectus femoris down the front, vastus lateralis sweeping the outside, vastus
        // medialis as the teardrop above the inner knee; all converge on the kneecap.
        ["quads", 18, 180, 0.75 * qm, [2.6, 13, 3.4], 0, 3.6, quad("rf")],
        ["quads", 19, side * 128, 0.9 * qm, [2.8, 14, 4.0], 0, 3.6, quad("vl")],
        ["quads", 34, -side * 145, 0.95 * qm, [2.2, 5.4, 3.0], -side * 0.3, 3, quad("vm")],
        // Adductors on the inner thigh, fanning from the pubis down to the thigh bone.
        ["adductors", 8, -side * 95, v(0.5, 0.7), [2.2, 9, 4.2], 0, v(3.6, 4.2), { t: "fan", o: [0, -6, -side * 6], n: [1, 0, 0], r: [0, 1, 0] }],
        // Hamstrings: biceps femoris on the outer back, semitendinosus/membranosus on the inner back.
        ["hamstrings", 19, side * 30, v(0.75, 0.5), [2.6, 13, 3.4], 0, 3.6, { t: "fan", o: [3, 62, 0], n: [1, 0, 0], r: [0, -1, 0], g: "bf" }],
        ["hamstrings", 20, -side * 32, v(0.75, 0.5), [2.6, 13, 3.4], 0, 3.6, { t: "fan", o: [3, 62, 0], n: [1, 0, 0], r: [0, -1, 0], g: "st" }],
        // Knee: the kneecap stands slightly proud of the front, the femoral condyles widen it a little.
        { abs: [null, -4.6, 41.8, 0, 1.3, 2.3, 2.2, null, 1.8] },
        { abs: [null, -0.5, 42.5, -side * 3.5, 2.1, 2.6, 1.5, null, 2] }, { abs: [null, -0.2, 42.8, side * 3.3, 1.9, 2.4, 1.4, null, 2] }
      ], M(hip.toArray(), legQ), 3.2, 3.5);
      // Lower leg (local x points back): calf volume high on the back, tapering through the
      // Achilles to a narrow ankle; the shin bone runs straight down the front.
      const cfib = (g) => ({ t: "fan", o: [2, 37, 0], n: [1, 0, 0], r: [0, -1, 0], g });
      add("shin" + s, { lathe: v(
        [[-3.5, 4.8, 1, 0], [0, 4.9, 1, 0.2], [3, 5.0, 1.02, 0.6], [7, 5.2, 1.05, 1.0], [11, 5.2, 1.05, 1.1], [15, 4.8, 1.0, 1.0],
          [20, 4.1, 0.95, 0.6], [25, 3.55, 0.94, 0.35], [30, 3.15, 1.0, 0.3], [35, 2.9, 1.1, 0.4], [39, 2.85, 1.18, 0.5], [42, 2.95, 1.22, 0.5], [44.5, 1.5]],
        // Hers: a smoother, more evenly tapered calf with its fullest point a little lower.
        [[-3.5, 4.4, 1, 0], [0, 4.5, 1, 0.2], [3, 4.6, 1.02, 0.5], [7, 4.8, 1.04, 0.85], [11, 4.9, 1.05, 1.0], [15, 4.6, 1.0, 0.9],
          [20, 3.9, 0.95, 0.55], [25, 3.3, 0.94, 0.3], [30, 2.9, 1.0, 0.3], [35, 2.65, 1.1, 0.4], [39, 2.6, 1.18, 0.5], [42, 2.7, 1.22, 0.5], [44.5, 1.4]]),
      depth: 1 }, [
        // Patellar tendon from the kneecap to the top of the shin.
        { abs: [null, -4.2, 3.2, 0, 0.9, 3.2, 1.4, null, 1.6] },
        // Gastrocnemius: the inner head bigger and lower than the outer; soleus wider below them.
        ["calves", v(10, 11), -side * 32, v(1.2, 0.75), [2.3, 7.5, 2.8], 0, v(3, 3.6), cfib(1)],
        ["calves", v(8.5, 10), side * 34, v(0.9, 0.6), [2.1, 6.5, 2.6], 0, v(3, 3.6), cfib(2)],
        ["soleus", 19, 0, v(0.45, 0.35), [2.0, 8, 4.0], 0, 3.4, cfib(3)],
        ["soleus", 21, side * 80, v(0.4, 0.3), [1.6, 7, 2.6], 0, 3, cfib(3)],
        ["calves", 35, 0, 0.35, [0.9, 6, 1.1], 0, 1.8, { t: "lin", o: [2, 42, 0], n: [0, 1, 0], c: [0, 0, 1], g: 4 }], // Achilles tendon
        // Tibialis anterior beside the shin bone, down to the inner foot.
        ["tibialis", 13, 180 - side * 30, v(0.45, 0.3), [1.6, 9, 1.8], 0, 3, { t: "lin", o: [-3, 40, 0], n: [0, 1, 0], c: [0, 0, 1] }],
        // Ankle bones: the inner one sits higher than the outer one.
        { abs: [null, 0.2, 41.6, -side * 2.9, 1.1, 1.4, 1.0, null, 1.2] }, { abs: [null, 0.5, 42.8, side * 2.8, 1.1, 1.4, 1.0, null, 1.2] }
      ], M(knee.toArray(), legQ), 3, 3);
      // Foot (local x points down, y forward, z = outward for this side): heel, a high instep that
      // falls toward the toes, the ball, and toes with the big toe longest on the inside; about
      // 25 cm long, 9.5 wide at the ball, the sole 7.5 below the ankle joint.
      const fk = v(1, 0.93);
      add("foot" + s, { ell: [3.7 * fk, 6.2 * fk, 0, 3.6 * fk, 8.4 * fk, 3.6 * fk] }, [
        { abs: [null, 4.9 * fk, -1.9 * fk, 0, 2.6 * fk, 2.8 * fk, 2.6 * fk, null, 3] },                       // heel
        { abs: [null, 2.4 * fk, 4.4 * fk, -side * 0.4, 2.6 * fk, 5.4 * fk, 3.4 * fk, [0, 0, -0.3], 2.6] },    // instep
        { abs: [null, 5.5 * fk, 13.2 * fk, side * 0.3, 2.0 * fk, 3.4 * fk, 4.7 * fk, null, 2.4] },            // ball of the foot
        { abs: [null, 6.0 * fk, 17.4 * fk, side * 0.9, 1.45 * fk, 2.6 * fk, 3.3 * fk, null, 1.8] },           // small toes
        { abs: [null, 5.9 * fk, 18.4 * fk, -side * 2.0, 1.55 * fk, 2.4 * fk, 1.7 * fk, null, 1.6] }          // big toe
      ], M(ankle.toArray(), Q(-side * legOut, -Math.PI / 2)), 2.6, 2.5);
    });
    const lt = defs.find((d) => d.name === "lowerTorso");
    // Clothing: matte black training shorts (male); fitted shorts, a sports bra and hair (female).
    lt.cloth = F
      ? { waist: 10.2, off: 0.3, hem: 17, top: { y0: 2.8, y1: 20.6, back: 21.5, strap: [6.2, 2.1], strapTop: 32, off: 0.3 },
        hair: { c: [0.2, 2.6, 0], tie: [-6.9, 5.6, 0] } }
      : { waist: 8.2, off: 0.55, hem: 21 };
    // Finer muscles and the group each belongs to (see buildSkinData).
    lt.parents = { "front-delts": "shoulders", "side-delts": "shoulders", rhomboids: "upper-back", soleus: "calves" };
    return defs;
  }

  // Prepare a segment: its base shape, and every muscle as an ellipsoid in the segment's space.
  function prepSegment(d) {
    const seg = { name: d.name, k: d.k, tau: d.tau, inv: d.rest.clone().invert().elements, cloth: d.cloth || null, parents: d.parents || null };
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
    geo.setAttribute("aux", new THREE.BufferAttribute(data.aux, 4));
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
    body.hairOn = athlete === "female";
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
      body.hairOn = sex === "female";
      if (cb) cb();
    }));
  };
  // ----- Ponytail (female athlete) -----
  // Hair over the skull is part of the skin (see cloth() in buildSkinData). The ponytail hangs from
  // a band at the back of the crown: many tapered strand clumps that follow one guide chain, which
  // swings a little as the head moves (a damped spring; held still under reduced motion), stays out
  // of the head, neck and back, and lies flat along a bench (or the floor) when the athlete lies down.
  body.makeHair = () => {
    if (body.hair) return body.hair;
    const head = parts.head, HAIR_COLOR = new THREE.Color(0x15161a);
    const tieL = new THREE.Vector3(-7.4, 5.6, 0), dirL = new THREE.Vector3(-1, -0.42, 0).normalize();
    const K = 12, LEN = 25, SEG = LEN / K, NC = 18, RS = 6;
    // The band: a short elastic cylinder around the gathered hair.
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 1.3, 16, 1),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.75, metalness: 0 }));
    band.position.copy(tieL).addScaledVector(dirL, 0.9);
    band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirL);
    band.castShadow = true;
    head.add(band);
    // Clumps: each a tapered tube offset around the guide chain, fanning out after the band and
    // gathering again toward the tips; lengths, thickness and twist vary per clump.
    const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    const clumps = [...Array(NC)].map((_, j) => ({
      a: (j / NC) * Math.PI * 2 + rnd(j) * 0.5, r: 0.3 + 0.7 * rnd(j + 7), len: 0.75 + 0.25 * rnd(j + 13),
      th: 0.85 + 0.45 * rnd(j + 21), tw: (rnd(j + 31) - 0.5) * 1.2, shade: 0.8 + 0.4 * rnd(j + 41)
    }));
    const RING = K + 1, nv = NC * RING * RS;
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = [];
    clumps.forEach((c, j) => {
      for (let i = 0; i < RING; i++) for (let k = 0; k < RS; k++) {
        const v = (j * RING + i) * RS + k;
        const sh = c.shade * (0.9 + 0.1 * Math.cos(k * 2.1 + j));
        col[v * 3] = HAIR_COLOR.r * sh; col[v * 3 + 1] = HAIR_COLOR.g * sh; col[v * 3 + 2] = HAIR_COLOR.b * sh;
        if (i < K) {
          const a = v, b = (j * RING + i) * RS + (k + 1) % RS, c2 = a + RS, d = b + RS;
          idx.push(a, c2, b, b, c2, d);
        }
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.5, metalness: 0,
      sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x2c3038), specularIntensity: 0.25, envMapIntensity: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.visible = false;

    // Guide chain (world space): verlet points with a rod-like stiffness near the band.
    const P = [...Array(K + 1)].map(() => new THREE.Vector3());
    let ready = false, barA = null, barB = null, lastRoot = null;
    const swing = new THREE.Vector3(), swingV = new THREE.Vector3(), side = new THREE.Vector3();
    const V = new THREE.Vector3(), W = new THREE.Vector3(), root = new THREE.Vector3(), rdir = new THREE.Vector3();
    const tQ = new THREE.Quaternion(), fwd = new THREE.Vector3(), up = new THREE.Vector3(), inv = new THREE.Matrix4();
    const spheres = [[0.2, 2.6, 0, 7.6], [-2.0, 3.6, 0, 6.0], [1.6, -3.6, 0, 5.4]].map((s) => ({ c: new THREE.Vector3(s[0], s[1], s[2]), r: s[3], w: new THREE.Vector3() }));
    // Torso cross-section (local half-depth, half-width) by height, for pushing hair off the back.
    const torsoAt = (y) => (y > 31 ? null : y > 27 ? [7.5, 9] : y > 24 ? [9.8, 12.5] : [11.2, 14]);
    function collide(p, r) {
      spheres.forEach((s) => { V.subVectors(p, s.w); const d = V.length(), m = s.r + r; if (d < m && d > 1e-6) p.addScaledVector(V, (m - d) / d); });
      // Neck: a capsule from the base of the neck to the head.
      const n0 = W.setFromMatrixPosition(parts.neck.matrixWorld), n1 = V.setFromMatrixPosition(head.matrixWorld);
      const ab = n1.clone().sub(n0), t = Math.min(1, Math.max(0, p.clone().sub(n0).dot(ab) / ab.lengthSq()));
      const q = n0.clone().addScaledVector(ab, t), dq = p.clone().sub(q), dl = dq.length(), mr = 6.2 + r;
      if (dl < mr && dl > 1e-6) p.addScaledVector(dq, (mr - dl) / dl);
      // A bar held in both hands (back squat, presses): the line between the palms.
      if (barA && barB) {
        const bb = barB.clone().sub(barA), bt = Math.min(1, Math.max(0, p.clone().sub(barA).dot(bb) / bb.lengthSq()));
        const bq = barA.clone().addScaledVector(bb, bt), bd = p.clone().sub(bq), bl = bd.length(), br = 2.6 + r;
        if (bl < br && bl > 1e-6) p.addScaledVector(bd, (br - bl) / bl);
      }
      // Upper back: an elliptical cross-section in the ribcage's own frame.
      const ut = parts.upperTorso;
      inv.copy(ut.matrixWorld).invert();
      const l = p.clone().applyMatrix4(inv), e = torsoAt(l.y);
      if (e && l.y > -6) {
        const ax = e[0] + r, az = e[1] + r, k = (l.x / ax) ** 2 + (l.z / az) ** 2;
        if (k < 1) { const sc = 1 / Math.sqrt(k || 1e-6); l.x *= sc; l.z *= sc; p.copy(l.applyMatrix4(ut.matrixWorld)); }
      }
    }
    body.hair = {
      mesh, band, P, //DBGH
      update(dt, still, floorY) {
        const on = body.hairOn === true;
        mesh.visible = on; band.visible = on;
        if (!on) { ready = false; return; }
        head.updateWorldMatrix(true, false);
        root.copy(tieL).applyMatrix4(head.matrixWorld);
        head.getWorldQuaternion(tQ);
        spheres.forEach((s) => s.w.copy(s.c).applyMatrix4(head.matrixWorld));
        barA = hands.R.pivot.localToWorld(new THREE.Vector3(0, 5, 0)); barB = hands.L.pivot.localToWorld(new THREE.Vector3(0, 5, 0));
        if (barA.distanceTo(barB) > 120) barA = barB = null;
        // Lying face up: the ribcage's front points up; the tail is laid back past the crown and a
        // little to the side, along the bench, instead of under the neck.
        const ut = parts.upperTorso;
        fwd.set(1, 0, 0).applyQuaternion(ut.getWorldQuaternion(new THREE.Quaternion())).normalize();
        const supine = Math.min(1, Math.max(0, (fwd.y - 0.35) / 0.4));
        rdir.copy(dirL).lerp(V.set(-0.35, 1, 0.45).normalize(), supine * 0.85).normalize().applyQuaternion(tQ);
        const plane = supine > 0 ? W.set(-11.6, 18, 0).applyMatrix4(ut.matrixWorld).clone() : null;
        if (!ready) {
          for (let i = 0; i <= K; i++) P[i].copy(root).addScaledVector(rdir, Math.min(i, 2) * SEG).y -= Math.max(0, i - 2) * SEG;
          ready = true;
        }
        // The chain relaxes to where gravity and the body let it hang (no stored velocity, so it
        // never jitters or flies off); the sway is a separate damped spring: when the head moves,
        // the tail lags behind and swings back, more toward the tip.
        if (still || !lastRoot) { swing.set(0, 0, 0); swingV.set(0, 0, 0); }
        else {
          const h = Math.min(dt, 1 / 30);
          swing.addScaledVector(V.subVectors(root, lastRoot), -0.7);
          swingV.addScaledVector(swing, -70 * h).multiplyScalar(Math.max(0, 1 - 5 * h));
          swing.addScaledVector(swingV, h);
          if (swing.length() > 7) swing.setLength(7);
        }
        lastRoot = (lastRoot || new THREE.Vector3()).copy(root);
        side.set(0, 0, 1).applyQuaternion(tQ);
        P[0].copy(root);
        // Rod stiffness: near the band the hair keeps the direction it leaves the band in.
        for (let i = 1; i <= K; i++) {
          // Hair does not stand up: the band's hold gives way when it points upward (bent over).
          const stiff = (i === 1 ? 0.6 : i === 2 ? 0.15 : 0.035 * Math.exp(-(i - 3) / 2)) * (1 - 0.85 * Math.max(0, rdir.y));
          if (i === 1) up.copy(rdir); else up.subVectors(P[i - 1], P[i - 2]).normalize();
          P[i].lerp(W.copy(P[i - 1]).addScaledVector(up, SEG), stiff);
        }
        for (let it = 0; it < 10; it++) {
          P[0].copy(root);
          for (let i = 1; i <= K; i++) {
            P[i].y -= SEG * 0.15; // gravity, relaxed a little at every pass so it settles within a few frames
            P[i].addScaledVector(side, SEG * 0.03); // a slight sideways drift so it never balances on the crown
            V.subVectors(P[i], P[i - 1]); const d = V.length() || 1;
            P[i].copy(P[i - 1]).addScaledVector(V, SEG / d);
            const r = 1.6 * (1 - (0.6 * i) / K);
            if (i > 1) collide(P[i], i > 3 ? r : r * 0.4);
            if (plane && supine > 0) { V.subVectors(P[i], plane); const dd = V.dot(fwd) - r * 0.6; if (dd < 0) P[i].addScaledVector(fwd, -dd); }
            if (floorY != null && P[i].y < floorY + r) P[i].y = floorY + r;
          }
        }
        // Clump tubes along the chain: a parallel-transported frame, offsets fanning out after the band.
        const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), c0 = new THREE.Vector3(), q = new THREE.Vector3();
        N.set(0, 1, 0).applyQuaternion(tQ);
        let vi = 0;
        clumps.forEach((c) => {
          let n = N.clone();
          for (let i = 0; i <= K; i++) {
            const t = i / K, tc = Math.min(1, t / c.len);
            if (i < K) T.subVectors(P[i + 1], P[i]).normalize(); else T.subVectors(P[i], P[i - 1]).normalize();
            n.addScaledVector(T, -n.dot(T)).normalize(); B.crossVectors(T, n);
            // Along this clump's own length the chain is sampled at tc (shorter clumps end earlier).
            const f = tc * K, i0 = Math.min(K - 1, Math.floor(f)), fr = f - i0;
            c0.lerpVectors(P[i0], P[i0 + 1], fr).addScaledVector(swing, 0.6 * Math.pow(tc, 1.3));
            const spread = (0.45 + 1.25 * Math.sin(Math.min(1, tc * 1.4) * Math.PI * 0.7)) * c.r * (1 - 0.5 * tc * tc);
            const ang = c.a + c.tw * tc;
            c0.addScaledVector(n, Math.cos(ang) * spread).addScaledVector(B, Math.sin(ang) * spread);
            const rad = c.th * (0.75 + 0.3 * Math.sin(Math.min(1, tc * 2) * Math.PI * 0.5) - 0.85 * Math.pow(tc, 1.6)) + 0.08;
            for (let k = 0; k < RS; k++) {
              const a = (k / RS) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
              // Flattened clumps (ribbons) read as strands rather than tubes.
              q.copy(n).multiplyScalar(ca * Math.cos(ang) - sa * 0.45 * Math.sin(ang)).addScaledVector(B, ca * Math.sin(ang) + sa * 0.45 * Math.cos(ang));
              const o = vi * 3;
              pos[o] = c0.x + q.x * rad; pos[o + 1] = c0.y + q.y * rad; pos[o + 2] = c0.z + q.z * rad;
              q.normalize(); nor[o] = q.x; nor[o + 1] = q.y; nor[o + 2] = q.z;
              vi++;
            }
          }
        });
        geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
      }
    };
    return body.hair;
  };
  body.updateHair = (dt, still, floorY) => { if (body.hair) body.hair.update(dt, still, floorY); };
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
    uTime: { value: 0 }, uEffort: { value: 1 }, uActScale: { value: 0 }, uFiber: { value: 0 }, uMap: { value: 1 },
    uActColor: { value: new THREE.Color(mode === "bad" ? VIEW3D.activeBad : VIEW3D.active) },
    uCompColor: { value: new THREE.Color(VIEW3D.compensate) },
    uRim: { value: 0 }, uRimColor: { value: new THREE.Color(mode === "bad" ? VIEW3D.bad : VIEW3D.good) },
    uScanY: { value: -999 }, uScanColor: { value: new THREE.Color(mode === "bad" ? VIEW3D.bad : VIEW3D.good) },
    uHairTie: { value: new THREE.Vector3(-6.9, 72.1, 0) } // the ponytail's tie, rest pose (see skinDefs hair)
  };
  // Display modes: surface (bare body and clothing), map (activation), fiber (activation plus an
  // illustrative fiber-direction overlay). uMap and uFiber ease toward these targets every frame.
  const display = { mode: "map", map: 1 };
  // Skin shader, in layers: the body (dark charcoal, slightly varied roughness, a faint procedural
  // micro-surface, cavity occlusion from the skin builder), clothing (near-black matte fabric with
  // crisp edges, seams and soft folds) and hair (dark, combed back, a soft sheen), then activation
  // held inside the worked muscles, the fiber overlay, and form feedback.
  const SKIN_GLSL = `
    float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vn3(vec3 x) {
      vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
    }
    vec3 bumpN(vec3 p, vec3 n, float hgt, float fd) {
      vec3 sx = dFdx(p), sy = dFdy(p), r1 = cross(sy, n), r2 = cross(n, sx);
      float det = dot(sx, r1) * fd;
      vec3 g = sign(det) * (dFdx(hgt) * r1 + dFdy(hgt) * r2);
      return normalize(abs(det) * n - g);
    }`;
  function patchSkin(mat) {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, fiberUniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec4 fib;\nattribute float act;\nattribute float cloth;\nattribute vec4 aux;\nvarying vec4 vFib;\nvarying float vAct;\nvarying float vWorldY;\nvarying float vCloth;\nvarying vec4 vAux;\nvarying vec3 vObjP;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFib = fib; vAct = act; vCloth = cloth; vAux = aux; vObjP = position;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
          varying vec4 vFib; varying float vAct; varying float vWorldY; varying float vCloth; varying vec4 vAux; varying vec3 vObjP;
          uniform float uTime, uEffort, uActScale, uRim, uScanY, uFiber, uMap;
          uniform vec3 uActColor, uCompColor, uRimColor, uScanColor, uHairTie;
          ${SKIN_GLSL}`)
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
          // Crisp clothing and hair edges at the mask's 0.5 crossing.
          float cfw = max(fwidth(vCloth), 0.002), hfw = max(fwidth(vAux.y), 0.002);
          float clothM = smoothstep(0.5 - cfw, 0.5 + cfw, vCloth);
          float hairM = smoothstep(0.5 - hfw, 0.5 + hfw, vAux.y);
          float sd = (vAux.z - 0.5) * 3.0, sfw = max(fwidth(sd), 0.002);
          // A seam is a thin stitched line where the signed distance crosses zero (not where two pieces meet).
          float seamM = (1.0 - smoothstep(0.12 - sfw, 0.12 + sfw, abs(sd))) * (1.0 - smoothstep(1.6, 2.4, sfw / max(length(fwidth(vObjP)), 1e-4))) * clothM;
          float detail = 1.0 - smoothstep(0.25, 0.6, length(fwidth(vObjP))); // fade fine detail when far away
          vec3 hq = vObjP - uHairTie;
          float hairV = atan(hq.z, hq.y) * 40.0;
          {
            // Skin: a very fine, irregular surface (no pores); fabric: soft folds plus a knit; hair: strands.
            float skinH = (vn3(vObjP * 0.9) * 0.6 + vn3(vObjP * 2.3) * 0.4) * 0.05 * detail;
            vec3 q = vObjP;
            float fold = sin(q.y * 0.75 + 2.2 * sin(q.x * 0.21 + q.z * 0.17)) * (0.6 + 0.4 * sin(q.x * 0.09 - q.z * 0.13 + q.y * 0.05));
            fold += 0.45 * sin(q.y * 1.5 + q.z * 0.4 + 1.3 * sin(q.x * 0.33));
            float clothH = fold * 0.1 + vn3(q * 3.1) * 0.05 * detail - seamM * 0.1;
            float hfv = fwidth(hairV), hAA = 1.0 - smoothstep(0.4, 1.2, hfv);
            float hairH = (sin(hairV + 2.5 * vn3(vObjP * 0.5)) * 0.6 + sin(hairV * 0.37 + 3.0 * vn3(vObjP * 0.9)) * 0.4) * 0.05 * hAA;
            float hgt = mix(mix(skinH, clothH, clothM), hairH, hairM);
            normal = bumpN(-vViewPosition, normal, hgt, faceDirection);
          }`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          {
            // vFib: x = distance along the fiber from its attachment, y = fiber index,
            //       z = how much muscle is under this point, w = boundary between muscles.
            float belly = smoothstep(0.15, 0.85, vFib.z);
            float sep = vFib.w;
            float ndv = abs(dot(normal, normalize(vViewPosition)));
            float mottle = vn3(vObjP * 0.35);
            // Body: muscle bellies a touch lighter, a soft valley between muscles, a faint mottling.
            diffuseColor.rgb *= (1.0 + 0.05 * belly) * (1.0 - 0.06 * sep) * (0.95 + 0.1 * mottle);
            roughnessFactor = clamp(0.6 + 0.12 * (mottle - 0.5) + 0.06 * sep - 0.04 * belly, 0.45, 0.8);
            // Fabric: near-black matte knit, a slightly darker stitched seam line.
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.013, 0.0135, 0.015) * (1.0 - 0.3 * seamM), clothM);
            roughnessFactor = mix(roughnessFactor, 0.93, clothM);
            // Hair: very dark, combed back toward the tie, with a soft broken sheen along the strands.
            float strand = mix(0.5, 0.5 + 0.5 * sin(hairV * 0.37 + 3.0 * vn3(vObjP * 0.9)), 1.0 - smoothstep(0.4, 1.2, fwidth(hairV)));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.0085, 0.009, 0.011) * (0.85 + 0.3 * strand), hairM);
            roughnessFactor = mix(roughnessFactor, 0.42 + 0.16 * strand, hairM);
            float bare = (1.0 - clothM) * (1.0 - hairM);
            float a = clamp(abs(vAct) * uEffort * uActScale, 0.0, 1.0) * uMap;
            vec3 actColor = vAct < 0.0 ? uCompColor : uActColor;
            float inside = belly * (1.0 - 0.6 * sep) * bare;
            if (a > 0.001) {
              // Activation travels along the fibers toward the attachment as broad, slow swells.
              float travel = 0.5 + 0.5 * sin(vFib.x * 0.11 - uTime * 2.2);
              diffuseColor.rgb = mix(diffuseColor.rgb, actColor * 0.32, 0.4 * a * inside);
              float glow = a * inside * (0.55 + 0.45 * ndv) * (0.8 + 0.2 * travel);
              totalEmissiveRadiance += actColor * glow * 0.22;
            }
            // Illustrative fiber-direction overlay: short broken strands along each muscle's fibers.
            // Muscles that are not worked show them only faintly (fiber mode); worked and focused
            // muscles fade in with a restrained teal.
            float fw = fwidth(vFib.y);
            float fiberAmt = inside * max(0.22 * smoothstep(0.5, 1.0, a) * uMap, uFiber * (0.16 + 0.84 * smoothstep(0.05, 0.6, a)));
            if (fiberAmt > 0.01 && fw < 0.5) {
              float id = floor(vFib.y), rnd = fract(sin(id * 12.9898) * 43758.5453);
              float fv = fract(vFib.y), edge = min(fv, 1.0 - fv);
              float lineW = 0.06 + 0.04 * rnd;
              float st = 1.0 - smoothstep(lineW - fw, lineW + fw, edge);
              float dash = smoothstep(0.2, 0.7, 0.5 + 0.5 * sin(vFib.x * (0.16 + 0.1 * rnd) + rnd * 37.0));
              float f = st * dash * fiberAmt * (1.0 - smoothstep(0.2, 0.5, fw));
              vec3 fc = mix(vec3(0.55, 0.6, 0.62), actColor, smoothstep(0.05, 0.4, a));
              diffuseColor.rgb = mix(diffuseColor.rgb, fc * 0.18, 0.5 * f);
              totalEmissiveRadiance += fc * f * (0.04 + 0.2 * a);
            }
            // A soft cool edge everywhere so the dark silhouette reads against a dark stage, and a
            // barely-there energy rim on a correct body in the activation views.
            float rim = pow(1.0 - ndv, 4.0);
            totalEmissiveRadiance += vec3(0.62, 0.68, 0.76) * pow(1.0 - ndv, 3.0) * 0.03 * (1.0 - 0.6 * clothM) * (1.0 - 0.7 * hairM);
            totalEmissiveRadiance += uRimColor * rim * uRim * uMap * (1.0 - 0.8 * max(clothM, hairM));
            float band = exp(-pow((vWorldY - uScanY) / 3.5, 2.0));
            totalEmissiveRadiance += uScanColor * band * (0.35 + 0.65 * rim) * 0.6;
          }`)
        // Fabric and hair keep only a little of the skin's soft sheen.
        .replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\n#ifdef USE_SHEEN\nmaterial.sheenColor *= 1.0 - 0.7 * max(clothM, hairM);\n#endif")
        // Cavity occlusion (armpits, crotch, creases) on ambient light and softly on direct light.
        .replace("#include <aomap_fragment>", `#include <aomap_fragment>
          {
            float ao = mix(vAux.x, 1.0, 0.25 * hairM);
            reflectedLight.indirectDiffuse *= ao;
            reflectedLight.indirectSpecular *= ao * ao;
            reflectedLight.directDiffuse *= mix(1.0, ao, 0.45);
            reflectedLight.directSpecular *= mix(1.0, ao, 0.7);
          }`);
    };
    return mat;
  }
  const mats = {
    // Matte dark-charcoal skin, not rubber or plastic: soft broad specular, a light sheen at grazing angles.
    skin: patchSkin(new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.62, metalness: 0,
      specularIntensity: 0.42, sheen: 0.1, sheenColor: new THREE.Color(0x8a929d), sheenRoughness: 0.7, clearcoat: 0,
      envMapIntensity: 0.32 })),
  };


  // Rubber gym floor, fitted to the feet of each exercise.
  const floor = GYM3D.floor();
  scene.add(floor);

  const body = makeBody3D(THREE, mats, athlete);
  Object.values(body.parts).forEach((g) => { if (g !== body.parts.head) scene.add(g); });
  // The skin may arrive a moment later (it is built in the background): show it with the scan-in.
  body.onSkin((skin) => { scene.add(skin); if (ex) { setActivation(); fitScene(); } shownAt = 0; });
  scene.add(body.makeHair().mesh); window.__hair = body.hair; //DBGH
  // Per frame, just before drawing: ease the display mode in, and let the hair settle.
  let hairAt = 0;
  scene.onBeforeRender = () => {
    const u = fiberUniforms, now = performance.now(), dt = Math.min(0.05, Math.max(0, (now - (hairAt || now)) / 1000)); hairAt = now;
    u.uMap.value += (display.map - u.uMap.value) * (reduce ? 1 : 0.08);
    if (body.updateHair) body.updateHair(dt, reduce, floor.position.y); window.__fy = floor.position.y; //DBGH
  };
  const equipment = new THREE.Group();
  scene.add(equipment);

  const GOOD = new THREE.Color(VIEW3D.good), BAD = new THREE.Color(VIEW3D.bad);
  let ex = null, poseA = null, poseB = null, load = {}, focusId = null, form = null;
  let ghostA = null, ghostB = null, ghostEnds = null, period = 4600, shownAt = 0, ghostOn = true;
  let lastT = 0, lastNow = 0, effort = 0.7;
  let yaw = VIEW3D.yaw, pitch = VIEW3D.pitch, target = new THREE.Vector3(0, 90, 0), dist = 400;
  let raf = 0, disposed = false, fig3 = {}, fibersOn = false;

  // ----- Interaction -----
  // One pointer (left mouse / one finger): rotate. Right mouse, shift-drag or two fingers: pan.
  // Wheel or pinch: zoom. Double-click: back to the exercise's own view.
  let drag = null, downAt = null, zoomU = 1;
  const pan = new THREE.Vector3(), pointers = new Map();
  const el = renderer.domElement;
  const clampZoom = (z) => Math.min(3.2, Math.max(0.55, z));
  function panBy(dx, dy) {
    const s = (dist / zoomU) * 0.0018;
    const right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    pan.addScaledVector(right, -dx * s); pan.y += dy * s;
    pan.clampLength(0, 160);
  }
  function startDrag(e) {
    const pts = [...pointers.values()];
    if (pts.length >= 2) {
      const [a, b] = pts;
      drag = { two: true, d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, zoom: zoomU };
    } else {
      drag = { x: e.clientX, y: e.clientY, yaw, pitch, panning: e.button === 2 || e.shiftKey };
    }
  }
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downAt = pointers.size === 1 ? [e.clientX, e.clientY] : null;
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    startDrag(e);
  });
  el.addEventListener("pointermove", (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!drag) return;
    if (drag.two) {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomU = clampZoom(drag.zoom * d / Math.max(20, drag.d));
      panBy(mx - drag.mx, my - drag.my); drag.mx = mx; drag.my = my;
      return;
    }
    if (drag.panning) { panBy(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY; return; }
    yaw = drag.yaw - (e.clientX - drag.x) * 0.01;
    pitch = Math.max(-0.2, Math.min(0.9, drag.pitch + (e.clientY - drag.y) * 0.006));
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 1) { const [p] = [...pointers.values()]; drag = { x: p.x, y: p.y, yaw, pitch }; downAt = null; } else drag = null;
  };
  el.addEventListener("pointerup", endPointer);
  el.addEventListener("pointercancel", endPointer);
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoomU = clampZoom(zoomU * Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.0022));
  }, { passive: false });
  el.addEventListener("dblclick", () => { resetCamera(); });

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
      pose(lerp3(poseA, poseB, t), fig3.ik ? t : null);
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
      pose(lerp3(poseA, poseB, t), fig3.ik ? t : null);
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
    pose(lerp3(poseA, poseB, 0), fig3.ik ? 0 : null);
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
  // flatK (pose `flat`, 0..1): blend from the grip orientation to a hand flat on the floor, for
  // reps that put the hands down part of the way (burpee).
  function orientHand(h, fa, side, torsoQ, wrist, flatK) {
    const fk = flatK ?? (fig3.hand === "flat" ? 1 : 0);
    if (fk > 0 && fk < 1) {
      const qa = handBasis(fa, side, torsoQ, false), qb = handBasis(fa, side, torsoQ, true);
      return setHandQ(h, fa, side, qa.slerp(qb, fk), wrist);
    }
    setHandQ(h, fa, side, handBasis(fa, side, torsoQ, fk >= 1), wrist);
  }
  function handBasis(fa, side, torsoQ, flat) {
    const y = new THREE.Vector3(0, 1, 0).applyQuaternion(fa.quaternion);
    const grip = fig3.grip || (fig3.hand === "flat" ? "neutral" : "over");
    let x, z;
    if (flat) {
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
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }
  function setHandQ(h, fa, side, q, wrist) {
    // p.wrist: wrist flexion (+) / extension (-) in degrees, about the knuckle line (wrist curls).
    if (wrist) q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, (wrist * Math.PI) / 180));
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
  // Rep interpolation plus two 3D-only pose angles (degrees): `twist`, the chest and arms turned
  // about the spine (Russian twist, one-arm rows), and `roll`, the whole body turned about its
  // long axis (side plank).
  // Multi-key reps: when the exercise gives figure3d.keys (poses between a and b, each with
  // `at` in 0..1), the rep passes through every key in order, easing into each one (burpee,
  // box jump, walking lunge). The far arm (arm2) is interpolated too.
  function lerp3(a, b, t) {
    const ks = a._keys;
    if (ks && b._keys === ks) {
      let i = 1;
      while (i < ks.length - 1 && t > ks[i].at) i++;
      const k0 = ks[i - 1], k1 = ks[i], u = Math.min(1, Math.max(0, (t - k0.at) / Math.max(1e-6, k1.at - k0.at)));
      return pin(lerp2(k0, k1, fig3.keysEase === "linear" ? u : u * u * (3 - 2 * u)), k0, k1, u);
    }
    return pin(lerp2(a, b, t), a, b, t);
  }
  // `fix` on the end pose of a stretch (a joint name: ankle, toe, hand, knee, ankle2...): that
  // joint stays planted while the rest of the body moves (a foot on the floor, hands on a bench).
  function pin(p, a, b, u) {
    const k = b.fix;
    if (!k) return p;
    const ja = solveSide(a)[k], jb = solveSide(b)[k], jp = solveSide(p)[k];
    if (!ja || !jb || !jp) return p;
    p.x += ja[0] + (jb[0] - ja[0]) * u - jp[0]; p.y += ja[1] + (jb[1] - ja[1]) * u - jp[1];
    return p;
  }
  function lerp2(a, b, t) {
    const p = lerpPose(a, b, t);
    ["twist", "roll", "shrug", "wrist", "flat"].forEach((k) => { if (a[k] != null || b[k] != null) p[k] = (a[k] || 0) + ((b[k] || 0) - (a[k] || 0)) * t; });
    if (a.arm2 || b.arm2) {
      const m = (k) => { const x = (a.arm2 || a)[k] ?? 0, y = (b.arm2 || b)[k] ?? 0; return x + (y - x) * t; };
      p.arm2 = { ua: m("ua"), fa: m("fa"), abd: m("abd") };
    }
    return p;
  }
  // Key poses for a multi-key rep, built like poseA/poseB (`over` = the mistake's overrides).
  function withKeys(A, B, keys, over) {
    if (!keys || !keys.length) return;
    const list = [{ ...A, at: 0 }, ...keys.map((k, i) => ({ ...A, ...k, ...((over && over[i]) || {}), view: undefined })), { ...B, at: 1 }];
    // A key with `fix` starts where the previous key left that joint (the foot or hand stays put).
    for (let i = 1; i < list.length; i++) {
      const k = list[i].fix, was = k && solveSide(list[i - 1])[k], now = k && solveSide(list[i])[k];
      if (was && now) { list[i].x += was[0] - now[0]; list[i].y += was[1] - now[1]; }
    }
    A._keys = B._keys = list;
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
      const sh = shoulderC.clone().add(new THREE.Vector3(0, -3 + (p.shrug || 0), 0).applyQuaternion(torsoQ)).add(lateral.clone().multiplyScalar(side * VIEW3D.shoulderHalf));
      let extra = null;
      if (abd) {
        const axis = p.abdAxis === "spine" ? new THREE.Vector3(0, 1, 0).applyQuaternion(torsoQ) : new THREE.Vector3(1, 0, 0).applyQuaternion(torsoQ);
        extra = new THREE.Quaternion().setFromAxisAngle(axis.normalize(), side * (p.abdAxis === "spine" ? -abd : abd));
      }
      const uaLen = ik ? 30 : 30 * (p.armsOut && !abd ? 0.8 : 1);
      cur.parts["upperArm" + s].scale.set(1, uaLen / 30, 1);
      if (ik && !(ik.only && ik.only !== s)) {
        // Two-bone reach: the hand goes where the 2D pose puts it, at the grip width,
        // and the elbow bends toward the pole (out to the side, like a real press).
        // Hanging and supported moves keep a fixed grip on the bar (the 2D hand, at the grip
        // width); lever machines move the hand on the lever's circle; others reach on an arc
        // around the shoulder.
        // ik.fixed: the hands stay where the start pose puts them (on a bench, the floor or a fixed
        // bar) while the body moves; ik.direct: the hand follows the 2D pose (multi-key reps).
        const H = ik.fixed ? to3(curEnds[0].j.hand).setZ(side * (curEnds[0].gz ?? ik.grip ?? 22))
          : t == null || fig3.hold === "hands" || ik.direct ? to3(j.hand).setZ(side * (p.gz ?? ik.grip ?? 22))
          : ik.arc ? arcTarget(t, side)
          : to3(j.shoulder).add(new THREE.Vector3(0, 0, side * VIEW3D.shoulderHalf)).add(reachTarget(t, side));
        // Both hands on one handle (Pallof press): one fist above the other at the midline.
        if (ik.stack) { H.z = side * 0.6; H.y += side * ik.stack; }
        if (handMode === "flat") H.y = Math.max(H.y, 2.6);
        const pole = new THREE.Vector3(...(ik.pole || [-0.5, -0.6, 1])); pole.z *= side; pole.applyQuaternion(torsoQ);
        // ik.reach > 1 stretches the reach from the shoulder (the 2D arm is a little shorter than
        // the 3D one, so a hanging arm would otherwise stay bent).
        if (ik.reach) H.sub(sh).multiplyScalar(ik.reach).add(sh);
        solveArm(cur.parts["upperArm" + s], cur.parts["forearm" + s], sh, H, pole, handMode === "flat" ? 27 : 33);
      } else {
        // A far (left) arm with its own angles (p.arm2: { ua, fa, abd? }), e.g. a hand braced on a bench.
        const a2 = side < 0 && p.arm2;
        const ex2 = !a2 ? extra : a2.abd ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0).applyQuaternion(torsoQ).normalize(), (side * a2.abd * Math.PI) / 180) : null;
        placeAngle(cur.parts["upperArm" + s], sh, a2 ? a2.ua : p.ua, ex2);
        const elbow = endOf(cur.parts["upperArm" + s], uaLen);
        placeAngle(cur.parts["forearm" + s], elbow, a2 ? a2.fa : p.fa, ex2);
      }
      orientHand(cur.hands[s], cur.parts["forearm" + s], side, torsoQ, p.wrist, p.flat);
      const hip3 = hip.clone().add(lateral.clone().multiplyScalar(side * VIEW3D.hipHalf));
      const far = side < 0 && p.t2 != null;
      const thighDir = far ? p.t2 : p.thigh + 180;
      const shinDir = far ? p.s2 : p.shin + 180;
      const footDir = far ? (p.f2 ?? 90) : (p.foot ?? 90);
      const la = p.legAbd ?? fig3.legAbd;
      const legAxis = new THREE.Vector3(...(fig3.legAbdAxis === "spine" ? [0, 1, 0] : [1, 0, 0])).applyQuaternion(cur.parts.lowerTorso.quaternion);
      const legOut = la ? new THREE.Quaternion().setFromAxisAngle(legAxis, (-side * la * Math.PI) / 180) : null;
      placeAngle(cur.parts["thigh" + s], hip3, thighDir, legOut);
      let knee = endOf(cur.parts["thigh" + s], 42);
      placeAngle(cur.parts["shin" + s], knee, shinDir, legOut);
      const ankle = endOf(cur.parts["shin" + s], 42);
      // Knees out (or in, negative): turn thigh and shin about the hip-ankle line; the foot stays planted.
      const ko = p.kneeOut ?? fig3.kneeOut;
      if (ko) {
        const q = new THREE.Quaternion().setFromAxisAngle(ankle.clone().sub(hip3).normalize(), (side * ko * Math.PI) / 180);
        cur.parts["thigh" + s].quaternion.premultiply(q);
        knee = endOf(cur.parts["thigh" + s], 42);
        cur.parts["shin" + s].position.copy(knee);
        cur.parts["shin" + s].quaternion.premultiply(q);
      }
      placeAngle(cur.parts["foot" + s], ankle, footDir, legOut);
      if (ko) cur.parts["foot" + s].quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (-side * ko * 0.6 * Math.PI) / 180));
    });

    const turn = (list, pivot, q) => {
      list.forEach((g) => { g.position.sub(pivot).applyQuaternion(q).add(pivot); g.quaternion.premultiply(q); });
      cur.handQ.R.premultiply(q); cur.handQ.L.premultiply(q);
    };
    if (p.twist) {
      const P = cur.parts, axis = new THREE.Vector3(0, 1, 0).applyQuaternion(P.lowerTorso.quaternion).normalize();
      turn([P.upperTorso, P.neck, P.upperArmR, P.upperArmL, P.forearmR, P.forearmL], P.upperTorso.position.clone(),
        new THREE.Quaternion().setFromAxisAngle(axis, (p.twist * Math.PI) / 180));
    }
    if (p.roll) {
      const P = cur.parts, axis = new THREE.Vector3(0, 1, 0).applyQuaternion(P.lowerTorso.quaternion).normalize();
      turn(Object.values(P).filter((g) => g !== P.head), P.lowerTorso.position.clone(), new THREE.Quaternion().setFromAxisAngle(axis, (p.roll * Math.PI) / 180));
    }
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
    const ends = (A, B, E) => [0, 1].map((t) => { pose(lerp3(A, B, t), fig3.ik ? t : null, body, E); return jointsOf(body); });
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
    pose(lerp3(poseA, poseB, 0), fig3.ik ? 0 : null);
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
    if (err.type !== "range") fb.tags.push([tag("Common mistake", "bad"), () => fb.yourAt], [tag("Recommended", "good"), () => fb.idealAt]);
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
      pose(lerp3(ghostA, ghostB, t), fig3.ik ? t : null, ghost, ghostEnds);
      const G = jointsOf(ghost);
      pose(lerp3(poseA, poseB, t), fig3.ik ? t : null);
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
      if (typeof MUSCLES !== "undefined" && !MUSCLES[id]) return; // a finer id this page has no name for
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
  // raw: position in one rep cycle (0..1) -> blend between pose a (0) and pose b (1).
  function shapeT(raw) {
    let start = 0;
    for (const [end, from, to] of TEMPO) {
      if (raw <= end) return from + (to - from) * smoother((raw - start) / (end - start));
      start = end;
    }
    return 0;
  }
  function easeT(now, len = 4600) { return shapeT((now % len) / len); }
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const END_AT = (TEMPO[1][0] + TEMPO[2][0]) / 2; // the middle of the hold at pose b

  // ----- Playback clock -----
  // clockMs advances only while playing (times the speed); the rep position is clockMs / period.
  // With reduced motion the rep starts paused at its end position.
  const play = { on: !reduce, speed: 1, clockMs: 0, last: 0, rep: 0, cbs: [], phases: [], phaseIndex: -1 };
  const cycleOf = () => (period > 0 ? (play.clockMs % period) / period : 0);
  // Default phase labels from the tempo schedule and which way the rep goes: is a -> b the
  // working (concentric) half or the lowering (eccentric) half? Wording follows the movement.
  const WORDS = {
    push: ["Pressing", "Lowering", "Lockout", "Pause"], pull: ["Pulling", "Releasing", "Squeeze", "Stretch"],
    squat: ["Driving up", "Descending", "Stand tall", "Bottom"], lunge: ["Driving up", "Descending", "Stand tall", "Bottom"],
    hinge: ["Hips through", "Hinging down", "Lockout", "Stretch"], rotation: ["Rotating", "Returning", "End range", "Hold"],
    "anti-rotation": ["Pressing out", "Returning", "Hold", "Hold"], carry: ["Walking", "Walking", "Hold", "Hold"],
    plyometric: ["Exploding up", "Loading", "Top", "Landing"], conditioning: ["Driving", "Returning", "Top", "Reset"],
    isolation: ["Lifting", "Lowering", "Squeeze", "Stretch"]
  };
  function patternOf(e) {
    if (e.pattern && WORDS[e.pattern]) return e.pattern;
    const n = (e.name || "").toLowerCase();
    if (/squat|leg press|hack|wall sit/.test(n)) return "squat";
    if (/lunge|split|step-up/.test(n)) return "lunge";
    if (/deadlift|hinge|good morning|hip thrust|bridge|swing|hyperextension|back extension/.test(n)) return "hinge";
    if (/row|pull|chin|face|shrug/.test(n)) return "pull";
    if (/press|push|dip|bench/.test(n)) return "push";
    if (/twist|woodchop|rotation/.test(n)) return "rotation";
    return "isolation";
  }
  function defaultPhases() {
    const p = patternOf(ex), w = WORDS[p] || WORDS.isolation;
    // Concentric first when the working point rises against gravity (or, for pulls, comes in).
    let concentricFirst = true;
    try {
      const A = solveSide(poseA), B = solveSide(poseB), y = (j, k) => (j[k] ? j[k][1] : 0);
      const pick = (k) => Math.hypot((A[k] || [0])[0] - (B[k] || [0])[0], y(A, k) - y(B, k));
      const key = ["hand", "hip", "ankle"].reduce((a, k) => (pick(k) > pick(a) ? k : a), "hand");
      const rises = y(B, key) < y(A, key) - 1; // svg y grows downward
      if (p === "squat" || p === "lunge" || p === "hinge") concentricFirst = y(B, "hip") < y(A, "hip") - 1;
      else if (p === "pull") {
        const d = (J) => Math.hypot(J.hand[0] - J.shoulder[0], J.hand[1] - J.shoulder[1]);
        concentricFirst = A.hand && A.shoulder ? d(B) < d(A) : true;
      } else if (p === "push") {
        const d = (J) => Math.hypot(J.hand[0] - J.shoulder[0], J.hand[1] - J.shoulder[1]);
        concentricFirst = A.hand && A.shoulder ? d(B) > d(A) : true;
      } else if (ex.equip !== "cable") concentricFirst = rises || Math.abs(y(B, key) - y(A, key)) < 2;
    } catch (e) { concentricFirst = true; }
    const [con, ecc, topHold, lowHold] = w;
    const lab = concentricFirst ? ["Start", con, topHold, ecc] : ["Start", ecc, lowHold, con];
    let s = 0;
    return TEMPO.map(([end], i) => { const ph = { label: lab[i], t0: s, t1: end }; s = end; return ph; });
  }
  function phasesFor() {
    const tl = Array.isArray(ex.phaseTimeline) ? ex.phaseTimeline.filter((p) => p && p.label != null && isFinite(p.t0) && isFinite(p.t1)) : [];
    return tl.length ? tl.map((p) => ({ label: String(p.label), t0: +p.t0, t1: +p.t1 })) : defaultPhases();
  }
  function phaseAt(u) {
    const ph = play.phases;
    for (let i = 0; i < ph.length; i++) if (u >= ph[i].t0 && u < ph[i].t1) return i;
    return ph.length ? (u >= ph[ph.length - 1].t1 ? ph.length - 1 : 0) : -1;
  }
  function seekCycle(u) {
    u = Math.min(0.9999, Math.max(0, +u || 0));
    play.clockMs = play.rep * period + u * period;
  }

  // Stage colors follow the page style (a dark lab stage or a light studio).
  let frame = 0, stageDark = null, stageAt = -1e9;
  function readStage() {
    const dark = getComputedStyle(container).getPropertyValue("--stage").trim() === "dark";
    if (dark === stageDark) return;
    stageDark = dark;
    floor.material.color.setScalar(dark ? 1.3 : 1.9);
    rim.intensity = dark ? 1.6 : 1.1;
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
    // Playback: advance the rep clock, count completed reps, report the phase.
    const step = play.last ? Math.min(250, Math.max(0, now - play.last)) : 0;
    play.last = now;
    if (play.on && heldAt == null) play.clockMs += step * play.speed;
    play.rep = Math.floor(play.clockMs / period);
    const cyc = cycleOf();
    const t = heldAt ?? shapeT(cyc);
    const pi = phaseAt(cyc);
    if (play.cbs.length) {
      const info = { t: cyc, phase: pi >= 0 ? play.phases[pi].label : "", phaseIndex: pi, rep: play.rep, playing: play.on, ready: !!body.skin };
      play.cbs.forEach((cb) => { try { cb(info); } catch (e) {} });
    }
    if (ghost) {
      const gt = heldAt ?? shapeT(period === 4600 ? cyc : (play.clockMs % 4600) / 4600);
      pose(lerp3(ghostA, ghostB, gt), fig3.ik ? gt : null, ghost, ghostEnds);
      ghost.mat.uniforms.opacity.value = (ghostOn ? 0.3 : 0) * smooth((k - 450) / 650);
    }
    pose(lerp3(poseA, poseB, t), fig3.ik ? t : null);
    // Activation follows the effort of the rep: strongest while the weight is moving.
    const speed = lastNow ? Math.abs(t - lastT) / Math.max(1, now - lastNow) : 0;
    effort += ((reduce || !play.on ? 1 : 0.55 + 0.45 * Math.min(1, speed / 0.0009)) - effort) * 0.08;
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
    const aim = (closeUp ? closeUp.at : target).clone().add(pan), d = (closeUp ? dist / closeUp.zoom : dist) / zoomU;
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
    const fig = { ...ex.figure, ...(ex.figure3d || {}), ...((ex.figure3d || {}).x3d || {}) };
    fig3 = fig;
    clearEquipment();
    const fault = mode === "bad" ? { ...ex.bad, ...(ex.bad3d || {}), ...((ex.bad3d || {}).x3d || {}) } : null;
    const extra = { armsOut: fig.armsOut, abd: fig.abd, abdAxis: fig.abdAxis };
    // fig.mix: 3D-only joint angles applied to both ends of the rep (e.g. hands on a machine's handles).
    poseA = { ...extra, ...fig.a, ...fig.mix, ...(fault && fault.a) };
    poseB = { ...extra, ...fig.b, ...fig.mix, ...(fault && fault.b) };
    ghostA = { ...extra, ...fig.a, ...fig.mix }; ghostB = { ...extra, ...fig.b, ...fig.mix };
    poseA.view = poseB.view = ghostA.view = ghostB.view = undefined;
    // Multi-key reps (see lerp3): keys start from the extras and 3D-only angles of the start pose.
    if (fig.keys) {
      const base = { ...extra, ...fig.mix };
      withKeys(poseA, poseB, fig.keys.map((k) => ({ ...base, ...k })), fault && fault.keys);
      withKeys(ghostA, ghostB, fig.keys.map((k) => ({ ...base, ...k })));
    }
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
      pose(lerp3(ghostA, ghostB, 0), fig.ik ? 0 : null);
      holdAt = gripPoint("R").add(gripPoint("L")).multiplyScalar(0.5);
    }
    resize();
    // Each exercise has its best camera angle; the camera glides there.
    [yaw, pitch] = defaultView();
    zoomU = 1; pan.set(0, 0, 0); closeUp = null;
    // The rep starts from the top (paused at the end position with reduced motion).
    play.phases = phasesFor();
    play.rep = 0; play.clockMs = reduce ? END_AT * period : 0;
    frameCamera();
    measureRep();
    viewer.analysis = null;
    pinned = null; tip.hidden = true; focusId = null;
    setFeedback();
    setActivation();
    fitScene();
    shownAt = 0;
  }

  // Named camera views (the body faces +x; the camera at +z sees its right side).
  const NAMED_VIEWS = { front: Math.PI / 2, back: -Math.PI / 2, right: 0, side: 0, left: Math.PI, threeQuarter: 0.72, "three-quarter": 0.72, threequarter: 0.72 };
  function defaultView() {
    const c = ex && ex.camera;
    if (c && (isFinite(c.yaw) || NAMED_VIEWS[c.view] != null)) {
      return [isFinite(c.yaw) ? +c.yaw : NAMED_VIEWS[c.view], isFinite(c.pitch) ? +c.pitch : VIEW3D.pitch];
    }
    return (fig3 && fig3.view) || (ex && ex.view) || [VIEW3D.yaw, VIEW3D.pitch];
  }
  function resetCamera() { [yaw, pitch] = defaultView(); zoomU = 1; pan.set(0, 0, 0); closeUp = null; }

  raf = requestAnimationFrame(tick);
  const viewer = {
    setExercise,
    analysis: null, // after setExercise on a mistake: { label, your, optimal } for the biggest difference
    resetView() { resetCamera(); },
    // ----- Playback -----
    play() { play.on = true; heldAt = null; },
    pause() { play.on = false; },
    togglePlay() { play.on = !play.on; if (play.on) heldAt = null; return play.on; },
    get isPlaying() { return play.on; },
    setSpeed(x) { x = +x; play.speed = isFinite(x) && x > 0 ? Math.min(3, x) : 1; },
    get speed() { return play.speed; },
    // t in [0, 1] over one rep cycle (keeps the rep count).
    seek(t) { heldAt = null; seekCycle(t); },
    get time() { return cycleOf(); },
    get rep() { return play.rep; },
    get phases() { return play.phases.map((p) => ({ ...p })); },
    get phaseIndex() { return phaseAt(cycleOf()); },
    // Pause and move one twenty-fourth of the cycle forward (+1) or back (-1).
    step(dir) {
      play.on = false; heldAt = null;
      const n = 24, u = cycleOf(), i = Math.round(u * n) + (dir < 0 ? -1 : 1);
      seekCycle((((i % n) + n) % n) / n);
    },
    // The start position (pose a) or the end position (pose b, middle of its hold).
    jumpTo(where) { play.on = false; heldAt = null; seekCycle(where === "end" ? END_AT : 0); },
    restart() { heldAt = null; play.rep = 0; play.clockMs = 0; },
    // cb({ t, phase, phaseIndex, rep, playing, ready }) every frame; returns an unsubscribe function.
    onFrame(cb) { if (typeof cb !== "function") return () => {}; play.cbs.push(cb); return () => { play.cbs = play.cbs.filter((f) => f !== cb); }; },
    get ready() { return !!body.skin; },
    // ----- Camera -----
    zoomBy(f) { zoomU = clampZoom(zoomU * (+f || 1)); },
    getCamera() { return { yaw, pitch, zoom: zoomU, pan: [pan.x, pan.y, pan.z] }; },
    setCamera(c) {
      if (!c) return;
      if (isFinite(c.yaw)) yaw = +c.yaw; if (isFinite(c.pitch)) pitch = +c.pitch;
      if (isFinite(c.zoom)) zoomU = clampZoom(+c.zoom);
      if (Array.isArray(c.pan)) pan.set(+c.pan[0] || 0, +c.pan[1] || 0, +c.pan[2] || 0);
      cam.yaw = yaw; cam.pitch = pitch; cam.snap = true;
    },
    // Male or female athlete: the body's surface changes under a scan sweep; the exercise, pose,
    // camera, activation and form analysis all stay as they are.
    get athlete() { return athlete; },
    setAthlete(sex) {
      sex = sex === "female" ? "female" : "male";
      if (sex === athlete) return;
      athlete = sex;
      // Keep the framing the person is looking at (the new body is refitted, the camera is not).
      body.setAthlete(sex, () => {
        domBone = null;
        if (ex) { const keepT = target.clone(), keepD = dist; setActivation(); fitScene(); target.copy(keepT); dist = keepD; }
        shownAt = 0;
      });
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
    // Or a named view: "front" | "back" | "left" | "right" | "threeQuarter" | "reset".
    setView(y, p, zoom, atY) {
      if (typeof y === "string") {
        if (y === "reset") { resetCamera(); return; }
        if (NAMED_VIEWS[y] == null) return;
        const to = NAMED_VIEWS[y]; yaw = to + 2 * Math.PI * Math.round((cam.yaw - to) / (2 * Math.PI)); pitch = p != null ? p : y === "threeQuarter" ? 0.16 : 0.08; pan.set(0, 0, 0);
        return;
      }
      yaw = y; if (p != null) pitch = p; closeUp = zoom > 1 ? { zoom, at: new THREE.Vector3(target.x, target.y + (atY || 0), target.z) } : null;
    },
    // Show one muscle on its own (null for all the exercise's muscles).
    focusMuscle(id) { focusId = id || null; if (ex) setActivation(); },
    // Fiber detail: show each working muscle's fiber direction clearly (off: only a faint hint).
    setFibers(on) { fibersOn = !!on; },
    // Display mode (BODY): "surface" = bare body and clothing only, "map" = activation (default),
    // "fiber" = activation plus the illustrative fiber-direction overlay.
    setDisplayMode(m) { display.mode = m === "surface" || m === "fiber" ? m : "map"; display.map = display.mode === "surface" ? 0 : 1; fibersOn = display.mode === "fiber"; },
    get displayMode() { return display.mode; },
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
      pose(lerp3(poseA, poseB, 0), fig3.ik ? 0 : null);
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

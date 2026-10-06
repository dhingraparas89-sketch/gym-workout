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
  active: "#2ee6c4",     // muscle activation on the optimal form (main movers full, helpers softer)
  activeBad: "#4aa8ff",  // muscle activation on the mistake
  compensate: "#ffad33", // muscles taking over the work in a mistake
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
// Approximate signed distance to an ellipsoid (negative inside).
function skinEllDist(f, x, y, z) {
  const dx = x - f.cx, dy = y - f.cy, dz = z - f.cz, m = f.m;
  const ax = (m[0] * dx + m[1] * dy + m[2] * dz) / f.rx, ay = (m[3] * dx + m[4] * dy + m[5] * dz) / f.ry, az = (m[6] * dx + m[7] * dy + m[8] * dz) / f.rz;
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const bx = ax / f.rx, by = ay / f.ry, bz = az / f.rz, k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(f.rx, f.ry, f.rz);
}
function skinLatheDist(L, x, y, z) {
  const r = skinLatheR(L, y);
  if (r < 0.3) {
    const ey = y < L.y0 ? L.y0 - y : y > L.y1 ? y - L.y1 : 0;
    return Math.sqrt(x * x + z * z + ey * ey) - r;
  }
  const A = r * L.depth, ax = x / A, az = z / r, k0 = Math.sqrt(ax * ax + az * az);
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
  const P = [0, 0, 0];
  function field(x, y, z) {
    let F = BIG;
    for (let s = 0; s < S; s++) {
      const g = segs[s], b = g.box;
      if (x < b[0] || y < b[1] || z < b[2] || x > b[3] || y > b[4] || z > b[5]) continue;
      local(g, x, y, z, P);
      const d = skinSegDist(g, P[0], P[1], P[2]);
      F = F === BIG ? d : skinSmin(F, d, g.k || 3);
    }
    return F;
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
  const weights = {}, fib = new Float32Array(nv * 4), bw = new Float32Array(nv * S);
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
    const sep = t2 < BIG ? (1 - skinSmooth(0, 1.4, t2 - t1)) * (1 - skinSmooth(0.8, 2.6, t2)) : 0;
    fib[v * 4 + 3] = sep;
    if (top && top.spec) {
      local(segs[topSeg], x, y, z, L);
      const [u, w] = skinFiberUV(top.spec, L[0], L[1], L[2]);
      fib[v * 4] = u; fib[v * 4 + 1] = w; fib[v * 4 + 2] = 1 - skinSmooth(0.3, 2.8, t1);
    }
    pos[v * 3] -= nor[v * 3] * 0.2 * sep; pos[v * 3 + 1] -= nor[v * 3 + 1] * 0.2 * sep; pos[v * 3 + 2] -= nor[v * 3 + 2] * 0.2 * sep;
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
  return { pos, nor, index: new Uint32Array(index), fib, weights, skinIndex, skinWeight };
}

// Built once per page and shared by every viewer: in a background worker when the browser allows
// it, so the page stays responsive while the body is made, otherwise right here.
const SKIN = { data: null, waiting: [], started: false };
const SKIN_HELPERS = [skinLatheR, skinEllDist, skinLatheDist, skinSmin, skinSmooth, skinSegDist, skinFiberUV, buildSkinData];
function requestSkin(segs, done) {
  if (SKIN.data) { Promise.resolve().then(() => done(SKIN.data)); return; }
  SKIN.waiting.push(done);
  if (SKIN.started) return;
  SKIN.started = true;
  const finish = (data) => { if (SKIN.data) return; SKIN.data = data; SKIN.waiting.splice(0).forEach((cb) => cb(data)); };
  const here = () => setTimeout(() => finish(buildSkinData(segs)), 0);
  let worker = null;
  try {
    const src = SKIN_HELPERS.map(String).join("\n") + "\nonmessage = (e) => { const d = buildSkinData(e.data); postMessage(d, [d.pos.buffer, d.nor.buffer, d.index.buffer, d.fib.buffer, d.skinIndex.buffer, d.skinWeight.buffer, ...Object.values(d.weights).map((w) => w.buffer)]); };";
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  } catch (err) { worker = null; }
  if (!worker) { here(); return; }
  const fallback = setTimeout(() => { worker.terminate(); here(); }, 20000);
  worker.onmessage = (e) => { clearTimeout(fallback); worker.terminate(); finish(e.data); };
  worker.onerror = (e) => { if (e.preventDefault) e.preventDefault(); clearTimeout(fallback); worker.terminate(); here(); };
  worker.postMessage(segs);
}

function makeBody3D(THREE, mats) {
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
    const pivot = new THREE.Group(); pivot.position.y = 27; fa.add(pivot);
    const fingers = [];
    // [z offset (index first, on the thumb side), y of knuckle, phalanx lengths, radius]
    [[2.75, 8.2, [4.0, 2.5, 1.9], 0.92], [0.9, 8.6, [4.4, 2.8, 2.0], 0.95], [-0.95, 8.3, [4.1, 2.6, 1.9], 0.9], [-2.7, 7.6, [3.3, 2.0, 1.7], 0.8]]
      .forEach(([z, y, lens, r]) => {
        let parent = new THREE.Group(); parent.position.set(0, y, side * z); pivot.add(parent);
        const joints = [];
        lens.forEach((len, i) => {
          const j = i === 0 ? parent : new THREE.Group();
          if (i > 0) { j.position.y = lens[i - 1]; parent.add(j); }
          addSkin(j, "forearm", capsule(r * (1 - i * 0.1), len));
          joints.push(j); parent = j;
        });
        fingers.push(joints);
      });
    const thumbBase = new THREE.Group(); thumbBase.position.set(a * 0.9, 2.2, side * 3.0); pivot.add(thumbBase);
    const t2 = new THREE.Group(); t2.position.y = 3.2; thumbBase.add(t2);
    addSkin(thumbBase, "forearm", capsule(1.15, 3.2)); addSkin(t2, "forearm", capsule(1.0, 2.6));
    return { pivot, fingers, thumb: [thumbBase, t2], side };
  }
  // grip: fingers wrapped around a bar or handle; flat: open hand pressing on the floor.
  function setHand(h, grip) {
    const curl = grip ? [78, 88, 48] : [6, 6, 4];
    h.fingers.forEach((joints) => joints.forEach((j, i) => { j.rotation.set(0, 0, (curl[i] * Math.PI) / 180); }));
    h.thumb[0].rotation.set(-h.side * (grip ? 0.55 : -0.6), 0, grip ? 0.95 : 0.2);
    h.thumb[1].rotation.set(0, 0, grip ? 0.55 : 0.1);
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
  const SKIN_DEFS = skinDefs();
  function skinDefs() {
    const SH = VIEW3D.shoulderHalf, HH = VIEW3D.hipHalf;
    const M = (pos, q) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), q || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    const Q = (x, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, 0, z, "XYZ"));
    const armOut = 0.35, legOut = 0.16; // rest pose: arms and legs held a little away from the body
    const defs = [];
    const add = (name, base, feats, rest, k, tau) => defs.push({ name, base, feats, rest, k, tau });

    // Pelvis, belly and lower back (hip -> middle of the spine, 26 units).
    add("lowerTorso", { lathe: [[-9, 3], [-6.5, 10.4], [-2.5, 13.8], [2, 14.2], [7, 13.5], [12, 12.4], [17, 12.0], [22, 12.3], [26, 12.7], [29, 11], [31, 7]], depth: 0.75 }, [
      // Rectus abdominis: one long strap each side of the midline, lying flat on the abdominal wall.
      ...[1, -1].map((s) => ["abs", 13, s * 14, 0.9, [1.6, 11.5, 3.2], 0, 2.8, { t: "lin", o: [10, 26, 0], n: [0, 1, 0], c: [0, 0, 1], g: s }]),
      // External obliques run down and forward ("hands in pockets").
      ...[1, -1].map((s) => ["obliques", 9, s * 72, 0.6, [2.0, 8, 6], s * 0.25, 3.2, { t: "lin", o: [6, 2, s * 6], n: [0.7, -0.7, 0], c: [0.7, 0.7, 0], g: s }]),
      // Erectors run straight up beside the spine.
      ...[1, -1].map((s) => ["lower-back", 14, s * 164, 1.2, [2.0, 11, 2.8], 0, 2.6, { t: "lin", o: [-5, -2, s * 3], n: [0, 1, 0], c: [0, 0, 1], g: s }]),
      // Glute max: from the pelvis and sacrum down and out to the top of the thigh bone; glute med above it at the side.
      ...[1, -1].map((s) => ["glutes", -0.5, s * 142, 2.4, [4.4, 8, 6.4], s * 0.2, 3.6, { t: "fan", o: [-1, -3, s * 12], n: [-1, 0, s * 0.5], g: s }]),
      ...[1, -1].map((s) => ["glutes", 7, s * 112, 0.7, [2.2, 5, 5], 0, 3, { t: "fan", o: [-1, -3, s * 12], n: [-1, 0, s * 0.5], g: s }])
    ], M([0, 0, 0]), 0, 6);

    // Ribcage, chest, lats and upper back (middle of the spine -> shoulders).
    const pec = (s) => ({ t: "fan", o: [3, 22, s * 15], n: [1, 0, 0], r: [0, -3, -s * 8], g: s });
    add("upperTorso", { lathe: [[-5, 9.5], [-2, 12.3], [1, 13.0], [6, 14.2], [12, 15.0], [17, 15.3], [21, 15.0], [23.5, 14.0], [25.5, 11.5], [27, 8.5], [28.5, 6.4], [30, 3]], depth: 0.72 }, [
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
        ["traps", 18, s * 172, 0.7, [1.8, 8, 2.8], 0, 2.8, { t: "fan", o: [-4, 25, s * 12], n: [-1, 0, 0], r: [0, -4, -s * 8], g: s }],
        // Upper traps: the slope from the neck out to the shoulder tip.
        { abs: ["traps", -1.6, 24.6, s * 7.4, 3.8, 3.0, 7.0, [s * 0.42, 0, 0], 3, { t: "fan", o: [-1, 27, s * 14], n: [-0.5, 1, 0], r: [0, 0, -s], g: s }] },
        // Shoulder girdle: collarbone, shoulder blade spine and acromion carry the slope out to the arm.
        { abs: [null, -0.6, 22.6, s * 14.4, 4.2, 2.6, 4.8, [s * 0.25, 0, 0], 3.2] }
      ])
    ], M([0, 26, 0]), 3, 6);

    // Neck (the head rides on it).
    add("neck", { lathe: [[-4, 6.0], [0, 5.5], [4, 5.1], [8, 5.0], [11, 4.8], [14, 3]], depth: 1.05 }, [
      ...[1, -1].map((s) => [null, 6, s * 42, 0.7, [1.4, 6, 1.5], s * 0.55, 1.8]), // sternocleidomastoids
      ["traps", 2, 180, 1, [2.6, 5, 5.6], 0, 2.6, { t: "lin", o: [-3, -3, 0], n: [0, 1, 0], c: [0, 0, 1] }],
      // Upper traps climb the sides of the neck, so the shoulders slope down from it.
      ...[1, -1].map((s) => ["traps", 2.5, s * 125, 1.6, [2.6, 4.6, 3.6], 0, 3, { t: "fan", o: [-1, -24, s * 14], n: [0.3, 1, 0], r: [0, 0, s], g: s }])
    ], M([0, 51, 0]), 3.5, 4);
    // Head: a plain oval, like an anatomy mannequin.
    add("head", { ell: [0.5, 1.6, 0, 8.6, 10.6, 7.4] }, [], M([0, 66.5, 0]), 3, 2);

    [1, -1].forEach((side) => {
      const s = side > 0 ? "R" : "L";
      // Limbs hang down (local -x is the front of the body, th = 180), side * 90 is the outer side.
      const armQ = Q(-side * armOut, Math.PI), sh = new THREE.Vector3(0, 49, side * SH);
      const elbow = new THREE.Vector3(0, 30, 0).applyQuaternion(armQ).add(sh);
      add("upperArm" + s, { lathe: [[-1.5, 2.2], [0, 4.2], [2.5, 5.0], [6, 5.0], [12, 4.4], [20, 4.1], [27, 3.7], [31, 3.4], [33.5, 1.4]], depth: 0.95 }, [
        // Deltoid: front, side and rear heads wrap the joint and converge halfway down the outer arm.
        ["shoulders", 5, side * 140, 1.3, [2.4, 7.6, 4.4], side * 0.25, 3.2, { t: "fan", o: [0, 14, side * 3.6], n: [0, -14, -side * 3.6], r: [0, 0, side] }],
        ["shoulders", 6.5, side * 90, 1.7, [2.6, 7.6, 4.8], 0, 3.2, { t: "fan", o: [0, 14, side * 3.6], n: [0, -14, -side * 3.6], r: [0, 0, side] }],
        ["rear-delts", 5, side * 30, 1.2, [2.4, 7.4, 4.4], side * 0.25, 3.2, { t: "fan", o: [0, 14, side * 3.6], n: [0, -14, -side * 3.6], r: [0, 0, side] }],
        // Biceps in front, triceps behind: long fibers down to their tendons at the elbow.
        ["biceps", 16, 180, 1.2, [2.4, 8.6, 3.0], 0, 2.6, { t: "long", o: [0, 30, 0], n: [0, 1, 0], r: [-1, 0, 0] }],
        ["triceps", 12.5, side * 35, 1.0, [2.2, 9, 2.8], 0, 2.6, { t: "long", o: [0, 31, 0], n: [0, 1, 0], r: [1, 0, 0], g: "lat" }],
        ["triceps", 15.5, -side * 25, 0.9, [2.2, 8.5, 2.6], 0, 2.6, { t: "long", o: [0, 31, 0], n: [0, 1, 0], r: [1, 0, 0], g: "long" }],
        { abs: [null, 0, 30, 0, 3.3, 3.3, 3.3, null, 1.8] } // elbow
      ], M(sh.toArray(), armQ), 2.6, 3);
      add("forearm" + s, { lathe: [[-2.5, 3.0], [0, 3.9], [4, 4.3], [9, 4.0], [16, 3.2], [22, 2.5], [27, 2.2], [29.5, 1.6], [30.5, 0.1]], depth: 0.85 }, [
        ["forearms", 7, side * 115, 1.0, [2.0, 8, 2.6], 0, 2.6, { t: "long", o: [0, 27, 0], n: [0, 1, 0], g: "ext" }],
        ["forearms", 8, -side * 135, 0.9, [2.0, 8, 2.6], 0, 2.6, { t: "long", o: [0, 27, 0], n: [0, 1, 0], g: "flex" }]
      ], M(elbow.toArray(), armQ), 2.6, 3);
      // Palm (faces local -x, thumb toward side * z), joined to the forearm at the wrist.
      const wrist = new THREE.Vector3(0, 27, 0).applyQuaternion(armQ).add(elbow);
      add("hand" + s, { ell: [0, 4.2, 0, 1.45, 4.6, 3.5] }, [
        { abs: [null, -0.7, 1.6, side * 2.3, 1.4, 2.8, 1.7, null, 1.4] },  // thumb pad
        { abs: [null, -0.5, 2.4, -side * 2.3, 1.2, 3.2, 1.4, null, 1.4] }, // little-finger side pad
        { abs: [null, 0, 7.6, 0, 1.6, 1.2, 3.8, null, 1.0] }               // knuckles
      ], M(wrist.toArray(), armQ), 2, 2);

      const legQ = Q(-side * legOut, Math.PI), hip = new THREE.Vector3(0, 0, side * HH);
      const knee = new THREE.Vector3(0, 42, 0).applyQuaternion(legQ).add(hip);
      const ankle = new THREE.Vector3(0, 42, 0).applyQuaternion(legQ).add(knee);
      const quad = (g) => ({ t: "fan", o: [-2.6, 41.5, 0], n: [-1, 0, 0], r: [0, -1, 0], g });
      add("thigh" + s, { lathe: [[-8, 3], [-5, 8.4], [-1, 9.4], [6, 9.1], [16, 8.2], [26, 7.0], [34, 6.0], [40, 5.5], [44, 5.1], [46.5, 2]], depth: 0.98 }, [
        // Quads: all four heads converge on the kneecap.
        ["quads", 19, 180, 1.1, [3.0, 15, 3.8], 0, 3.2, quad("rf")],
        ["quads", 22, side * 128, 1.2, [3.0, 14, 4.2], 0, 3.2, quad("vl")],   // outer sweep
        ["quads", 33.5, -side * 140, 1.3, [2.8, 6.2, 3.4], 0, 2.8, quad("vm")], // teardrop above the knee
        [null, 10, -side * 90, 0.6, [2.6, 10, 4.2], 0, 3.2],                    // adductors
        // Hamstrings: down the back of the thigh to the knee, two bellies side by side.
        ["hamstrings", 20, side * 28, 1.1, [3.0, 14, 3.8], 0, 3.2, { t: "fan", o: [3, 62, 0], n: [1, 0, 0], r: [0, -1, 0], g: "bf" }],
        ["hamstrings", 21, -side * 30, 1.0, [3.0, 14, 3.6], 0, 3.2, { t: "fan", o: [3, 62, 0], n: [1, 0, 0], r: [0, -1, 0], g: "st" }],
        { abs: [null, -2.6, 41.5, 0, 2.0, 2.7, 3.0, null, 2.0] }                // kneecap
      ], M(hip.toArray(), legQ), 3.2, 3.5);
      add("shin" + s, { lathe: [[-3.5, 4.6], [-1, 5.2], [3, 5.3], [8, 5.4], [14, 4.9], [21, 3.8], [28, 3.0], [35, 2.6], [40, 2.5], [43, 2.3], [45, 1.0]], depth: 0.95 }, [
        // Calves: both heads of the gastrocnemius converge on the Achilles tendon; soleus underneath.
        ["calves", 10, -side * 28, 1.5, [2.5, 9, 3.0], 0, 2.8, { t: "fan", o: [2, 37, 0], n: [1, 0, 0], r: [0, -1, 0], g: 1 }],
        ["calves", 9.5, side * 30, 1.2, [2.4, 8.2, 2.8], 0, 2.8, { t: "fan", o: [2, 37, 0], n: [1, 0, 0], r: [0, -1, 0], g: 2 }],
        ["calves", 20, 0, 0.6, [2.2, 9, 3.6], 0, 3, { t: "fan", o: [2, 37, 0], n: [1, 0, 0], r: [0, -1, 0], g: 3 }],
        [null, 12, side * 150, 0.5, [1.8, 10, 2.0], 0, 3],                       // tibialis anterior
        { abs: [null, 0, 42, side * 2.4, 1.4, 1.6, 1.2, null, 1.2] }, { abs: [null, 0, 42, -side * 2.4, 1.4, 1.6, 1.2, null, 1.2] } // ankle bones
      ], M(knee.toArray(), legQ), 3, 3);
      add("foot" + s, { ell: [-1.2, 6.6, 0, 2.3, 7.4, 3.4] }, [
        { abs: [null, -0.6, 0.8, 0, 2.9, 3.4, 2.9, null, 1.4] },                // heel
        { abs: [null, -0.9, 12.2, 0, 1.6, 2.6, 3.4, null, 1.2] }                // toes
      ], M(ankle.toArray(), Q(-side * legOut, -Math.PI / 2)), 2.6, 2.5);
    });
    return defs;
  }

  // Prepare a segment: its base shape, and every muscle as an ellipsoid in the segment's space.
  function prepSegment(d) {
    const seg = { name: d.name, k: d.k, tau: d.tau, inv: d.rest.clone().invert().elements };
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
      seg.lathe = { y0, y1, N, tab, depth: d.base.depth };
    } else seg.ell = ellipsoid(null, ...d.base.ell, null, 1);
    seg.feats = d.feats.map((f) => {
      if (f.abs) {
        const [id, x, y, z, rx, ry, rz, rot, k, fiber] = f.abs;
        return ellipsoid(id, x, y, z, rx, ry, rz, new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), k, fiber);
      }
      // On the surface: find the base surface point at (y, th) and its outward normal there.
      const [id, y, th, h, [rn, ry, rt], spin, k, fiber] = f;
      const a = (th * Math.PI) / 180, r = skinLatheR(seg.lathe, y), A = r * seg.lathe.depth;
      const n = new THREE.Vector3(Math.cos(a) / A, 0, Math.sin(a) / r).normalize();
      const c = new THREE.Vector3(A * Math.cos(a), y, r * Math.sin(a)).addScaledVector(n, h - rn);
      const up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3().crossVectors(n, up).normalize();
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(n, up, t));
      if (spin) q.premultiply(new THREE.Quaternion().setFromAxisAngle(n, spin));
      return ellipsoid(id, c.x, c.y, c.z, rn, ry, rt, q, k, fiber);
    });
    // World-space bounds (in the rest pose), so far-away segments are skipped quickly. Wider than
    // any blend, so skipping a segment never cuts a blend off.
    const box = new THREE.Box3(), r = seg.lathe ? Math.max(...seg.lathe.tab) : seg.ell.br, e = seg.ell;
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
    setHands: (grip) => Object.values(hands).forEach((h) => setHand(h, grip)),
    // cb(skin) runs once the skin mesh exists (later in the same frame at the soonest).
    onSkin(cb) { if (body.skin) Promise.resolve().then(() => cb(body.skin)); else skinWaiting.push(cb); } };
  const skinWaiting = [];
  requestSkin(SKIN_DEFS.map(prepSegment), (data) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(data.nor, 3));
    geo.setAttribute("skinIndex", new THREE.BufferAttribute(data.skinIndex, 4));
    geo.setAttribute("skinWeight", new THREE.BufferAttribute(data.skinWeight, 4));
    geo.setAttribute("fib", new THREE.BufferAttribute(data.fib, 4));
    geo.setIndex(new THREE.BufferAttribute(data.index, 1));
    skinAttrs(geo);
    const skin = new THREE.SkinnedMesh(geo, mats.skin);
    skin.bind(new THREE.Skeleton([...SKIN_DEFS.map((d) => boneOf(d.name)), ...hands.R.twist, ...hands.L.twist],
      [...SKIN_DEFS.map((d) => d.rest.clone().invert()), ...twistRest]), new THREE.Matrix4());
    skin.castShadow = true; skin.receiveShadow = true; skin.frustumCulled = false;
    skin.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4); // posed anywhere: never cull, raycast against triangles
    skin.userData.weights = data.weights; skin.userData.tone = 1;
    skinList.forEach((m) => { m.visible = true; });
    skinList.unshift(skin); skinMeshes.body = [skin];
    body.skin = skin;
    skinWaiting.splice(0).forEach((cb) => cb(skin));
  });
  return body;
}

// ---------- Viewer ----------
function createViewer3D(container, mode) {
  const THREE = window.THREE;
  if (!THREE) return null;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = "figure3d";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 2000);
  // Soft studio reflections: a gradient dome baked into an environment map.
  {
    const envScene = new THREE.Scene();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
    const pos = dome.geometry.attributes.position, colors = [];
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) / 10 + 1) / 2;
      const c = new THREE.Color(0x3a332e).lerp(new THREE.Color(0xfff4e8), Math.pow(t, 1.6));
      colors.push(c.r, c.g, c.b);
    }
    dome.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    envScene.add(dome);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
  }
  scene.add(new THREE.HemisphereLight(0xfff6ee, 0x5a4a40, 0.55));
  const key = new THREE.DirectionalLight(0xfff1e2, 2.4);
  key.position.set(120, 260, 200);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.6;
  Object.assign(key.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 10, far: 800 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd4ff, 1.3);
  rim.position.set(-200, 120, -160);
  scene.add(rim);

  const col = (name, fb) => new THREE.Color(css(name, fb));
  // Skin shader: fine fiber striations along each muscle's fiber direction, darker grooves where
  // muscles meet, and activation light that pulses along the fibers toward the attachment.
  // Per viewer: activation color (teal on the optimal form, blue on the mistake), the color of
  // muscles that take over in a mistake, the energy rim around a correct body, and the scan band
  // that sweeps up the body when an exercise is first analyzed.
  const fiberUniforms = {
    uTime: { value: 0 }, uEffort: { value: 1 }, uActScale: { value: 0 },
    uActColor: { value: new THREE.Color(mode === "bad" ? VIEW3D.activeBad : VIEW3D.active) },
    uCompColor: { value: new THREE.Color(VIEW3D.compensate) },
    uRim: { value: 0 }, uRimColor: { value: new THREE.Color(mode === "bad" ? VIEW3D.bad : VIEW3D.good) },
    uScanY: { value: -999 }, uScanColor: { value: new THREE.Color(mode === "bad" ? VIEW3D.bad : VIEW3D.good) }
  };
  function patchSkin(mat) {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, fiberUniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec4 fib;\nattribute float act;\nvarying vec4 vFib;\nvarying float vAct;\nvarying float vWorldY;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFib = fib; vAct = act;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
          varying vec4 vFib; varying float vAct; varying float vWorldY;
          uniform float uTime, uEffort, uActScale, uRim, uScanY;
          uniform vec3 uActColor, uCompColor, uRimColor, uScanColor;`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          {
            // vFib: x = distance from the attachment, y = fiber index, z = how much muscle is on top, w = muscle boundary.
            float fw = fwidth(vFib.y);
            float fv = fract(vFib.y), edge = min(fv, 1.0 - fv);
            // Each fiber bundle varies a little in width and tone, like real fascicles.
            float id = floor(vFib.y), rnd = fract(sin(id * 12.9898) * 43758.5453);
            float wob = 0.5 + 0.5 * sin(vFib.x * (0.35 + 0.3 * rnd) + id * 2.17);
            float lineW = 0.09 + 0.09 * wob;
            float groove = 1.0 - smoothstep(lineW - fw, lineW + fw, edge);
            // Fibers sit inside the muscle: faint at rest, fading out toward its edges.
            float vis = smoothstep(0.35, 0.9, vFib.z) * (1.0 - smoothstep(0.3, 0.6, fw));
            float sep = vFib.w;
            // act > 0: a worked muscle; act < 0: a muscle taking over the work in a mistake.
            float a = abs(vAct) * uEffort * uActScale;
            // At rest the fibers are only a faint grain under the skin; they stand out as the muscle works.
            diffuseColor.rgb *= (1.0 - (0.05 + 0.22 * min(a, 1.0)) * groove * vis) * (1.0 + vis * (0.03 * rnd - 0.015)) * (1.0 - 0.2 * sep);
            vec3 actColor = vAct < 0.0 ? uCompColor : uActColor;
            if (a > 0.001) {
              // A soft wave of contraction runs along each fiber toward its attachment (u = 0);
              // neighbouring fibers fire slightly out of step.
              float wave = 0.5 + 0.5 * sin(vFib.x * 0.22 + uTime * 3.0 + rnd * 1.2);
              float ridge = 1.0 - 0.85 * groove * vis;
              float e = a * (0.45 + 0.55 * wave) * ridge * (0.8 + 0.3 * rnd * vis) * (1.0 - 0.75 * sep);
              diffuseColor.rgb = mix(diffuseColor.rgb, actColor * 0.3, min(1.0, a * 0.5));
              totalEmissiveRadiance += actColor * e * 1.05;
            }
            // Energy rim: a soft edge light around the whole body.
            float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
            totalEmissiveRadiance += uRimColor * rim * uRim;
            // Scan band sweeping up the body.
            float band = exp(-pow((vWorldY - uScanY) / 3.5, 2.0));
            totalEmissiveRadiance += uScanColor * band * (0.35 + 0.65 * rim) * 0.9;
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
    lips: new THREE.MeshStandardMaterial({ color: col("--skin-shade", "#c48a65").lerp(new THREE.Color(0x9a4a3c), 0.4), roughness: 0.5 }),
    eye: new THREE.MeshStandardMaterial({ color: 0xf2eee8, roughness: 0.2 }),
    shorts: new THREE.MeshStandardMaterial({ color: col("--shorts", "#222"), roughness: 0.85 }),
    hair: new THREE.MeshStandardMaterial({ color: col("--hair", "#2b1d14"), roughness: 0.9 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.4 }),
    equip: new THREE.MeshStandardMaterial({ color: col("--equip", "#8a8a85"), roughness: 0.5, metalness: 0.5 }),
    pad: new THREE.MeshStandardMaterial({ color: col("--pad", "#2b2b2b"), roughness: 0.8 }),
    plate: new THREE.MeshStandardMaterial({ color: col("--plate", "#2a2a2a"), roughness: 0.6, metalness: 0.2 }),
    floor: new THREE.MeshStandardMaterial({ color: 0xe9e9e6, roughness: 1 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.35, metalness: 0.7 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }),
    upholstery: new THREE.MeshPhysicalMaterial({ color: 0x1b1b1d, roughness: 0.62, clearcoat: 0.35, clearcoatRoughness: 0.4 })
  };

  // Floor that fades out at the edge, so there is no hard horizon.
  {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), grad = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, "#fff"); grad.addColorStop(0.55, "#bbb"); grad.addColorStop(1, "#000");
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    mats.floor.alphaMap = new THREE.CanvasTexture(c);
    mats.floor.transparent = true;
    mats.floor.depthWrite = false;
  }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(260, 64), mats.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const body = makeBody3D(THREE, mats);
  Object.values(body.parts).forEach((g) => { if (g !== body.parts.head) scene.add(g); });
  // The skin may arrive a moment later (it is built in the background): show it with the scan-in.
  body.onSkin((skin) => { scene.add(skin); if (ex) setActivation(); shownAt = 0; });
  const equipment = new THREE.Group();
  scene.add(equipment);

  const GOOD = new THREE.Color(VIEW3D.good), BAD = new THREE.Color(VIEW3D.bad);
  let ex = null, poseA = null, poseB = null, load = {}, focusId = null, form = null;
  let ghostA = null, ghostB = null, ghostEnds = null, period = 4600, shownAt = 0, ghostOn = true;
  let lastT = 0, lastNow = 0, effort = 0.7;
  let yaw = VIEW3D.yaw, pitch = VIEW3D.pitch, target = new THREE.Vector3(0, 90, 0), dist = 400;
  let raf = 0, disposed = false, fig3 = {};

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
  el.addEventListener("dblclick", () => { yaw = VIEW3D.yaw; pitch = VIEW3D.pitch; });

  function resize() {
    const w = container.clientWidth || 300, h = container.clientHeight || w;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(container);

  // ----- Equipment -----
  function clearEquipment() {
    while (equipment.children.length) equipment.remove(equipment.children[0]);
    load = {};
  }
  function cyl(r, len, mat, axis) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), mat);
    if (axis === "z") m.rotation.x = Math.PI / 2;
    if (axis === "x") m.rotation.z = Math.PI / 2;
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  const to3 = (p) => new THREE.Vector3(p[0] - 100, 189 - p[1], 0);

  // Upholstered pad with rounded edges: length along x, thickness along y, width along z.
  function padBox(len, thick, width) {
    const r = Math.min(3, width / 4, len / 4), b = Math.min(1.6, thick / 3);
    const w = width - 2 * b, l = len - 2 * b, shape = new THREE.Shape();
    shape.moveTo(-l / 2 + r, -w / 2); shape.lineTo(l / 2 - r, -w / 2); shape.quadraticCurveTo(l / 2, -w / 2, l / 2, -w / 2 + r);
    shape.lineTo(l / 2, w / 2 - r); shape.quadraticCurveTo(l / 2, w / 2, l / 2 - r, w / 2);
    shape.lineTo(-l / 2 + r, w / 2); shape.quadraticCurveTo(-l / 2, w / 2, -l / 2, w / 2 - r);
    shape.lineTo(-l / 2, -w / 2 + r); shape.quadraticCurveTo(-l / 2, -w / 2, -l / 2 + r, -w / 2);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.5, thick - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 8 });
    geo.rotateX(Math.PI / 2); geo.center();
    const m = new THREE.Mesh(geo, mats.upholstery);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  // ----- Cable stations -----
  // Built like real gym machines: steel frame, a selectorized weight stack on guide rods,
  // pulleys, and a steel cable for each handle. The top plates rise as the cable is pulled.
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.9 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dadc, roughness: 0.18, metalness: 1 });
  const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  function segment(mat, r) { const m = new THREE.Mesh(unitCyl, mat); m.userData.r = r; m.castShadow = true; equipment.add(m); return m; }
  function setSeg(m, a, b) {
    const d = b.clone().sub(a), len = d.length();
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), len > 1e-6 ? d.divideScalar(len) : new THREE.Vector3(0, 1, 0));
    m.scale.set(m.userData.r, Math.max(len, 0.01), m.userData.r);
  }
  function box(w, h, d, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    (parent || equipment).add(m); return m;
  }
  function wheel(r, parent, x, y, z, axis) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.4, 24), mats.plate); w.rotation.x = Math.PI / 2; g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, 1.8, 12), chrome); hub.rotation.x = Math.PI / 2; g.add(hub);
    if (axis) g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
    parent.add(g); return g;
  }
  // A single tower. It is built in its own frame (+x faces the lifter) and placed at (x, z).
  // Returns the world points the cable runs through and the moving part of the stack.
  function tower(x, z, faceTo, pulleyY, opts = {}) {
    const H = opts.height || Math.max(200, pulleyY + 26);
    const g = new THREE.Group(); g.position.set(x, floor.position.y, z);
    const dir = faceTo.clone().sub(new THREE.Vector3(x, 0, z)).setY(0).normalize();
    g.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    equipment.add(g);
    const py = pulleyY - floor.position.y;
    box(40, 2.6, 34, mats.frame, -6, 1.3, 0, g);                                 // base plate
    [-1, 1].forEach((s) => {
      box(4.4, H, 4.4, mats.frame, -22, H / 2, s * 13, g);                       // rear uprights
      box(4.4, H, 4.4, mats.frame, 6, H / 2, s * 13, g);                          // front uprights
      box(30, 3.6, 3.6, mats.frame, -8, H - 1.8, s * 13, g);                      // top rails
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, H - 16, 10), chrome);
      rod.position.set(-8, 4 + (H - 16) / 2, s * 5.2); g.add(rod);               // guide rods
    });
    box(30, 3.6, 30, mats.frame, -8, H - 1.8, 0, g);                              // top plate
    // Weight stack: 16 plates, the top six ride up when pulled.
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55, metalness: 0.3 });
    for (let i = 0; i < 10; i++) box(17, 2.5, 15, plateMat, -8, 5 + i * 2.65, 0, g);
    const moving = new THREE.Group(); g.add(moving);
    for (let i = 10; i < 16; i++) box(17, 2.5, 15, plateMat, -8, 5 + i * 2.65, 0, moving);
    const head = 5 + 16 * 2.65;
    box(18, 3.4, 16, chrome, -8, head + 0.6, 0, moving);                          // head plate
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 18, 8), chrome); pin.rotation.x = Math.PI / 2;
    pin.position.set(-8, 5 + 10 * 2.65, 0); moving.add(pin);                      // selector pin
    // Pulley column at the front with an adjustable carriage.
    if (!opts.noCarriage) {
      box(5, H - 6, 5, chrome, 12, (H - 6) / 2 + 3, 0, g);
      box(8, 11, 8, mats.frame, 12, py, 0, g);                                    // carriage
      wheel(3.6, g, 16.5, py, 0);
      wheel(3.2, g, 12, H - 6, 0);
    }
    wheel(3.2, g, -8, H - 6, 0);
    const W = (v) => g.localToWorld(v.clone());
    g.updateMatrixWorld(true);
    const route = [
      () => W(new THREE.Vector3(-8, head + 2.4 + moving.position.y, 0)),
      () => W(new THREE.Vector3(-8, H - 3, 0)), () => W(new THREE.Vector3(12, H - 3, 0)),
      () => W(new THREE.Vector3(14, py + 3, 0)), () => W(new THREE.Vector3(18.5, py, 0))
    ];
    return { g, moving, route, H, W };
  }
  function handleFor(kind) {
    const g = new THREE.Group();
    if (kind === "D") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.55, 8, 24, Math.PI * 1.25), mats.frame);
      ring.rotation.z = -Math.PI * 0.125 + Math.PI / 2; g.add(ring);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 8, 12), mats.rubber); grip.rotation.x = Math.PI / 2; g.add(grip);
    }
    equipment.add(g); return g;
  }
  function buildStation(fig) {
    const st = fig.station, cables = [];
    const hip = to3(solveSide(poseA).hip), person = new THREE.Vector3(hip.x, 0, 0);
    const L = fig.load || {}, from = L.from ? to3(L.from) : new THREE.Vector3(0, 150, 0);
    const pulleyY = st.pulleyY ?? from.y;
    if (st.kind === "crossover") {
      // Two towers, one each side, a cable to each hand.
      const tx = hip.x + (st.back ?? -14);
      [1, -1].forEach((side) => {
        const t = tower(tx, side * 78, new THREE.Vector3(tx, 0, 0), pulleyY);
        cables.push({ t, attach: side > 0 ? "R" : "L", handle: handleFor("D") });
      });
      // Overhead bar joining the towers.
      const bar = segment(mats.frame, 2.2); setSeg(bar, new THREE.Vector3(tx - 8, cables[0].t.H + floor.position.y, 70), new THREE.Vector3(tx - 8, cables[0].t.H + floor.position.y, -70));
      const pull = segment(chrome, 1.4); setSeg(pull, new THREE.Vector3(tx + 10, cables[0].t.H - 6, 60), new THREE.Vector3(tx + 10, cables[0].t.H - 6, -60));
    } else if (st.kind === "pulldown") {
      // Column behind the seat with an arm reaching over the head to the top pulley.
      const cx = hip.x - 36, t = tower(cx, 0, person.clone().setX(hip.x + 50), 40, { height: 214 });
      const top = new THREE.Vector3(from.x, 214 + floor.position.y - 10, 0);
      box(top.x - cx + 6, 5, 6, mats.frame, (cx + top.x) / 2, top.y + 4, 0);
      wheel(3.4, equipment, top.x, top.y, 0);
      t.route.splice(3, 2, () => new THREE.Vector3(top.x - 3, top.y + 3, 0), () => new THREE.Vector3(top.x, top.y - 3, 0));
      const bar = new THREE.Group(); equipment.add(bar);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 96, 14), chrome); rod.rotation.x = Math.PI / 2; bar.add(rod);
      [-1, 1].forEach((s) => { const end = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 14, 12), chrome); end.position.set(0, -3.5, s * 50); end.rotation.x = s * 0.5 + Math.PI / 2; bar.add(end); });
      cables.push({ t, attach: "mid", bar });
    } else if (st.kind === "press") {
      // Selectorized chest press: weight stack behind the seat, two lever arms swinging
      // from pivots above the shoulders down to upright handles.
      const sh = to3(solveSide(poseA).shoulder);
      const t = tower(hip.x - 40, 0, person.clone().setX(hip.x + 60), 60, { noCarriage: true, height: 190 });
      const pivotX = hip.x - 14, pivotY = sh.y + 36;
      box(6, 6, 78, mats.frame, pivotX, pivotY, 0);                                 // pivot shaft
      box(t.g.position.x - pivotX + 18, 5, 6, mats.frame, (t.g.position.x + pivotX) / 2 - 4, pivotY, 0);
      const levers = [1, -1].map((side) => {
        const P = new THREE.Vector3(pivotX, pivotY, side * 37);
        const arm = segment(mats.frame, 2.2), drop = segment(mats.frame, 1.8);
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 11, 14), mats.rubber); grip.castShadow = true; equipment.add(grip);
        return { side, P, arm, drop, grip };
      });
      // A cable from the stack runs up to the pivot so the plates rise as the arms move.
      cables.push({ t, attach: "mid", levers, press: true });
    } else {
      // A single tower facing the lifter (front, or to the side for the Pallof press).
      const at = st.at ? new THREE.Vector3(st.at[0] - 100, 0, st.at[1]) : new THREE.Vector3(from.x + (from.x > hip.x ? 22 : -22), 0, 0);
      const t = tower(at.x, at.z, person, pulleyY);
      cables.push({ t, attach: "mid", rope: st.handle === "rope", vbar: st.handle === "V", handle: st.handle === "D" ? handleFor("D") : null });
    }
    cables.forEach((c) => {
      c.segs = c.t.route.slice(0, c.press ? 2 : undefined).map(() => segment(cableMat, 0.6));
      if (c.rope) c.ropeSegs = [segment(ropeMat, 0.95), segment(ropeMat, 0.95)];
      if (c.vbar) c.ropeSegs = [segment(mats.frame, 1.1), segment(mats.frame, 1.1)];
    });
    load.cables = cables;
    // Rest length of each cable: the shortest it gets during the rep.
    const samples = [0, 0.25, 0.5, 0.75, 1];
    cables.forEach((c) => { c.rest = Infinity; });
    samples.forEach((t) => {
      pose(lerpPose(poseA, poseB, t), fig.ik ? t : null);
      cables.forEach((c) => { c.rest = Math.min(c.rest, c.press ? cableEnd(c).x : cableEnd(c).distanceTo(c.t.route[c.t.route.length - 1]())); });
    });
  }
  function cableEnd(c) {
    const R = gripPoint("R"), Lh = gripPoint("L");
    if (c.attach === "R") return R;
    if (c.attach === "L") return Lh;
    return R.add(Lh).multiplyScalar(0.5);
  }
  function updateCables() {
    (load.cables || []).forEach((c) => {
      const end = cableEnd(c), route = c.t.route;
      if (c.press) {
        c.levers.forEach((l) => {
          const s = l.side > 0 ? "R" : "L", hp = gripPoint(s);
          const up = new THREE.Vector3(0, 0, 1).applyQuaternion(body.handQ[s]);   // the grip runs along the hand's z
          if (up.y < 0) up.negate();
          l.grip.position.copy(hp); l.grip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
          const top = hp.clone().add(up.clone().multiplyScalar(5.5));
          const elbow = top.clone().add(new THREE.Vector3(0, 6, 0)).setZ(top.z + l.side * 4);
          setSeg(l.drop, top, elbow); setSeg(l.arm, elbow, l.P);
        });
        c.t.moving.position.y = Math.max(0, Math.min(40, (end.x - c.rest) * 0.8));
        const pts = route.slice(0, 3).map((f) => f());
        c.segs.forEach((m, i) => setSeg(m, pts[i], pts[i + 1]));
        return;
      }
      const pulley = route[route.length - 1]();
      const pullDir = pulley.clone().sub(end).normalize();
      let knot = end;
      if (c.rope || c.vbar) {
        knot = end.clone().add(pullDir.clone().multiplyScalar(c.rope ? 9 : 6));
        setSeg(c.ropeSegs[0], knot, gripPoint("R")); setSeg(c.ropeSegs[1], knot, gripPoint("L"));
      }
      if (c.bar) { c.bar.position.copy(end); }
      if (c.handle) {
        c.handle.position.copy(end);
        if (c.attach !== "mid") c.handle.quaternion.copy(body.handQ[c.attach]);
        knot = end.clone().add(pullDir.clone().multiplyScalar(4));
      }
      const lift = Math.max(0, Math.min(40, (knot.distanceTo(pulley) - c.rest) * 0.5));
      c.t.moving.position.y = lift;
      const pts = route.map((f) => f()).concat([knot]);
      c.segs.forEach((m, i) => setSeg(m, pts[i], pts[i + 1]));
    });
  }
  function buildEquipment(fig) {
    clearEquipment();
    const props = fig.props || [];
    // Pads: rectangles, and thick lines that don't reach the floor (backrests, seats).
    const isPad = (pr) => pr.rect || (pr.line && (pr.w || 0) >= 7 && Math.max(pr.line[1], pr.line[3]) < 186 && pr.axis !== "z");
    const pads = props.filter(isPad);
    const padTopAt = (x) => {                 // lowest pad underside above x, in 2D units
      let best = null;
      pads.forEach((pr) => {
        if (pr.rect) { const [rx, ry, rw, rh] = pr.rect; if (x >= rx - 2 && x <= rx + rw + 2) best = Math.max(best ?? -1e9, ry + rh); }
        else { const [x1, y1, x2, y2] = pr.line; const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
          if (x >= lo - 2 && x <= hi + 2) { const t = hi === lo ? 0 : (x - x1) / (x2 - x1); best = Math.max(best ?? -1e9, y1 + (y2 - y1) * t + 3.5); } }
      });
      return best;
    };
    const legs = [];
    props.forEach((pr) => {
      if (pr.rect) {
        const [x, y, w, h] = pr.rect;
        const pad = padBox(w, h, w > 60 ? 28 : 26);
        pad.position.set(x + w / 2 - 100, 189 - (y + h / 2), 0);
        equipment.add(pad);
        return;
      }
      if (!pr.line) return;
      const [x1, y1, x2, y2] = pr.line;
      const p1 = to3([x1, y1]), p2 = to3([x2, y2]);
      if (isPad(pr)) {
        // Backrest or seat pad laid along the line, with a steel rail behind it.
        const len = p1.distanceTo(p2), dir = p2.clone().sub(p1).normalize();
        const pad = padBox(len + 4, pr.w, 26);
        pad.position.copy(p1.clone().add(p2).multiplyScalar(0.5));
        pad.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
        equipment.add(pad);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len * 0.8, 3.6, 4.6), mats.frame);
        const normal = new THREE.Vector3(-dir.y, dir.x, 0); if (normal.y > 0 || (normal.y === 0 && normal.x > 0)) normal.negate();
        rail.position.copy(pad.position).add(normal.multiplyScalar(pr.w / 2 + 1.8));
        rail.quaternion.copy(pad.quaternion); rail.castShadow = true;
        equipment.add(rail);
        return;
      }
      // A cable station replaces the plain tower post.
      if (fig.station && Math.abs(x1 - x2) < 1 && Math.abs(y1 - y2) > 80) return;
      // Floor uprights under a pad become one steel leg with a wide stabilizer foot.
      const vertical = Math.abs(x1 - x2) < 1, bottom = Math.max(y1, y2), top = Math.min(y1, y2);
      const under = vertical && bottom >= 186 ? padTopAt(x1) : null;
      if (under != null && Math.abs(under - top) < 7) {
        legs.push({ x: x1 - 100, top: 189 - top });
        const leg = new THREE.Mesh(new THREE.BoxGeometry(4.6, 189 - top - 3, 4.6), mats.frame);
        leg.position.set(x1 - 100, 3 + (189 - top - 3) / 2, 0); leg.castShadow = true; equipment.add(leg);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.6, 40), mats.frame);
        foot.position.set(x1 - 100, 1.8 + 0.8, 0); foot.castShadow = true; foot.receiveShadow = true; equipment.add(foot);
        [-1, 1].forEach((sz) => {
          const cap = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 3.4), mats.rubber);
          cap.position.set(x1 - 100, 0.8, sz * 19); equipment.add(cap);
        });
        return;
      }
      const len = p1.distanceTo(p2), mid = p1.clone().add(p2).multiplyScalar(0.5);
      // Uprights that stand on the floor reach it even when the floor is lowered.
      [p1, p2].forEach((q) => { if (q.y <= 4) q.y = Math.min(q.y, floor.position.y); });
      if (pr.axis === "z") {
        // A bar across the body (pull-up bar): runs left-right.
        const bar = cyl(1.6, 110, mats.equip, "z"); bar.position.copy(mid); equipment.add(bar);
        return;
      }
      const zs = pr.pair ? [-23, 23] : (len > 80 && Math.abs(x1 - x2) < 1 ? [-34] : [-13, 13]);
      const len2 = p1.distanceTo(p2), mid2 = p1.clone().add(p2).multiplyScalar(0.5);
      zs.forEach((z) => {
        const c = cyl((pr.w || 6) / 2, len2, mats.equip);
        c.position.set(mid2.x, mid2.y, z);
        c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
        equipment.add(c);
      });
    });
    // A frame rail joins the legs under a long bench.
    if (legs.length >= 2) {
      legs.sort((p, q) => p.x - q.x);
      const l0 = legs[0], l1 = legs[legs.length - 1];
      const rail = new THREE.Mesh(new THREE.BoxGeometry(l1.x - l0.x + 4.6, 4, 4.6), mats.frame);
      rail.position.set((l0.x + l1.x) / 2, Math.min(l0.top, l1.top) - 2, 0); rail.castShadow = true;
      equipment.add(rail);
    }
    const L = fig.load || {};
    if (L.type === "barbell") {
      const g = new THREE.Group();
      const r = L.r || 13;
      g.add(cyl(1.3, 150, mats.equip, "z"));
      [-1, 1].forEach((s) => {
        const p = cyl(r, 5, mats.plate, "z"); p.position.z = s * 52; g.add(p);
        const p2 = cyl(r * 0.8, 4, mats.plate, "z"); p2.position.z = s * 57; g.add(p2);
        const c = cyl(2.6, 3, mats.equip, "z"); c.position.z = s * 47; g.add(c);
      });
      equipment.add(g); load.bar = g;
    }
    if (L.type === "dumbbell") {
      load.dbs = [1, -1].map(() => {
        const g = new THREE.Group();
        g.add(cyl(1.1, 14, mats.equip, "z"));
        [-1, 1].forEach((s) => { const p = cyl(5, 3.4, mats.plate, "z"); p.position.z = s * 5.6; g.add(p); });
        equipment.add(g); return g;
      });
    }
    if (fig.station) buildStation(fig);
    else if (L.type === "cable") {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      load.cable = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: css("--equip", "#888") }));
      load.from = to3(L.from); load.from.z = (fig.props || []).some((p) => p.line && Math.abs(p.line[0] - p.line[2]) < 1 && Math.abs(p.line[1] - p.line[3]) > 80) ? -34 : 0;
      equipment.add(load.cable);
      load.handle = cyl(1.2, 16, mats.equip, "z"); equipment.add(load.handle);
      const pulley = cyl(3.2, 2.4, mats.plate, "z"); pulley.position.copy(load.from); equipment.add(pulley);
    }
    if (L.type === "roller") { load.roller = cyl(4.5, 26, mats.pad, "z"); equipment.add(load.roller); }
    if (L.type === "footplate") {
      load.plate = new THREE.Mesh(new THREE.BoxGeometry(3, 30, 46), mats.equip);
      load.plate.castShadow = true; equipment.add(load.plate);
    }
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
      z = Z.clone().multiplyScalar(grip === "under" ? side : -side);
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
  function gripPoint(s) {
    const fa = cur.parts["forearm" + s];
    const wrist = new THREE.Vector3(0, 27, 0).applyQuaternion(fa.quaternion).add(fa.position);
    const off = (fig3.hand === "flat") ? new THREE.Vector3(-1.6, 4.5, 0) : new THREE.Vector3(-2.6, 6, 0);
    return wrist.add(off.applyQuaternion(handQOf()[s]));
  }
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
        const H = t == null ? to3(j.hand).setZ(side * (p.gz ?? ik.grip ?? 22))
          : to3(j.shoulder).add(new THREE.Vector3(0, 0, side * VIEW3D.shoulderHalf)).add(reachTarget(t, side));
        if (handMode === "flat") H.y = Math.max(H.y, 2.6);
        const pole = new THREE.Vector3(...(ik.pole || [-0.5, -0.6, 1])); pole.z *= side; pole.applyQuaternion(torsoQ);
        solveArm(cur.parts["upperArm" + s], cur.parts["forearm" + s], sh, H, pole, handMode === "flat" ? 27 : 33);
      } else {
        placeAngle(cur.parts["upperArm" + s], sh, p.ua, extra);
        const elbow = endOf(cur.parts["upperArm" + s], uaLen);
        placeAngle(cur.parts["forearm" + s], elbow, p.fa, extra);
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

    if (target !== body) return;
    // Equipment that moves with the body.
    const handR = gripPoint("R"), handL = gripPoint("L");
    const L = ex.figure.load || {};
    if (load.bar) {
      if (L.at === "shoulder") {
        const at = to3(j.shoulder); const off = L.offset || [0, 0];
        load.bar.position.set(at.x + off[0], at.y - off[1], 0);
      } else load.bar.position.set((handR.x + handL.x) / 2, (handR.y + handL.y) / 2, 0);
    }
    if (load.dbs) {
      [handR, handL].forEach((h, i) => {
        load.dbs[i].position.copy(h);
        load.dbs[i].quaternion.copy(body.handQ[i ? "L" : "R"]);
      });
    }
    if (load.cables) updateCables();
    if (load.cable) {
      const pos = load.cable.geometry.attributes.position;
      pos.setXYZ(0, load.from.x, load.from.y, load.from.z); pos.setXYZ(1, handR.x, handR.y, (handR.z + handL.z) / 2); pos.needsUpdate = true;
      load.handle.position.set(handR.x, handR.y, (handR.z + handL.z) / 2);
    }
    if (load.roller) { const a = endOf(cur.parts.shinR, 42); load.roller.position.set(a.x, a.y + 5, 0); }
    if (load.plate) {
      const ft = cur.parts.footR, toe = endOf(ft, 9);
      load.plate.position.copy(toe).add(new THREE.Vector3(-3, 0, 0).applyQuaternion(ft.quaternion)).setZ(0);
      load.plate.quaternion.copy(ft.quaternion);
    }

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
      uniforms: { color: { value: GOOD.clone() }, opacity: { value: 0 } },
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
      fragmentShader: "uniform vec3 color; uniform float opacity; varying float vRim; void main(){ gl_FragColor = vec4(color, opacity * (0.08 + 0.92 * pow(vRim, 2.0))); }",
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 3, polygonOffsetUnits: 3
    });
    const g = makeBody3D(THREE, { ...mats, skin: mat });
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
      fb.mine = makeChain(chain.length, GOOD, 0.75, 0.42);
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

    if (err.type === "range") {
      const ideal = idealPath[trace], mine = yourPath[trace];
      fb.tubes.push(tubeFor(ideal, GOOD, 0.75), tubeFor(mine, BAD, 0.85));
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

  function frameCamera() {
    // Fit the whole rep: sample the motion and take its bounds.
    const pts = [];
    [0, 0.5, 1].forEach((t) => {
      const j = solveSide(lerpPose(poseA, poseB, t));
      Object.values(j).forEach((v) => { if (Array.isArray(v)) pts.push(v); });
    });
    const xs = pts.map((p) => p[0] - 100), ys = pts.map((p) => 189 - p[1]);
    const minX = Math.min(...xs) - 20, maxX = Math.max(...xs) + 20, minY = Math.max(0, Math.min(...ys) - 12), maxY = Math.max(...ys) + 16;
    // Hanging exercises: drop the floor well below the feet.
    floor.position.y = ex.figure.noFloor ? Math.min(0, Math.min(...ys) - 40) : 0;
    target.set((minX + maxX) / 2, (minY + maxY) / 2, 0);
    const size = Math.max(maxX - minX, maxY - minY, 120);
    dist = size / 2 / Math.tan((camera.fov * Math.PI) / 360) * 1.12;
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
    mats.floor.color.set(dark ? 0x23272d : 0xe9e9e6);
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
    const t = reduce ? 1 : easeT(now, period);
    if (ghost) {
      const gt = reduce ? 1 : easeT(now);
      pose(lerpPose(ghostA, ghostB, gt), fig3.ik ? gt : null, ghost, ghostEnds);
      ghost.mat.uniforms.opacity.value = (ghostOn ? 0.42 : 0) * smooth((k - 450) / 650);
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
    u.uRim.value = mode === "good" ? 0.22 + 0.5 * Math.exp(-Math.pow((k - 1100) / 450, 2)) * smooth(k / 900) + 0.1 * smooth((k - 900) / 600) : 0;
    // Breathing: the ribcage swells a little.
    const breath = 1 + 0.018 * Math.sin(now / 650);
    body.parts.upperTorso.scale.x = breath; body.parts.upperTorso.scale.z = 1 + 0.009 * Math.sin(now / 650);
    const aim = closeUp ? closeUp.at : target, d = closeUp ? dist / closeUp.zoom : dist;
    camera.position.set(aim.x + Math.sin(yaw) * Math.cos(pitch) * d, aim.y + Math.sin(pitch) * d, aim.z + Math.cos(yaw) * Math.cos(pitch) * d);
    camera.lookAt(aim);
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

  let bodyTop = 180, closeUp = null;
  function setExercise(next) {
    ex = next;
    form = (typeof FORM !== "undefined" ? FORM : {})[ex.name] || null;
    const fig = { ...ex.figure, ...(ex.figure3d || {}) };
    fig3 = fig;
    const fault = mode === "bad" ? { ...ex.bad, ...(ex.bad3d || {}) } : null;
    const extra = { armsOut: fig.armsOut, abd: fig.abd, abdAxis: fig.abdAxis };
    poseA = { ...extra, ...fig.a, ...(fault && fault.a) };
    poseB = { ...extra, ...fig.b, ...(fault && fault.b) };
    ghostA = { ...extra, ...fig.a }; ghostB = { ...extra, ...fig.b };
    poseA.view = poseB.view = ghostA.view = ghostB.view = undefined;
    reachEnds = [poseA, poseB].map((q) => ({ j: solveSide(q), gz: q.gz }));
    ghostEnds = [ghostA, ghostB].map((q) => ({ j: solveSide(q), gz: q.gz }));
    const err = form && form.error;
    period = mode === "bad" && err && err.type === "tempo" ? (err.tempo === "slow" ? 8000 : 2300) : 4600;
    frameCamera();
    buildEquipment(fig);
    if (fig.station) {
      // Widen the view to take in the machine.
      const b = new THREE.Box3().setFromObject(equipment), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
      const span = Math.max(sz.x * 0.85 + sz.z * 0.55, sz.y) + 20;
      target.set((target.x + c.x) / 2, Math.max(target.y, sz.y / 2 + floor.position.y), 0);
      dist = Math.max(dist, span / 2 / Math.tan((camera.fov * Math.PI) / 360) * 1.1);
    }
    bodyTop = target.y + dist * Math.tan((camera.fov * Math.PI) / 360);
    body.setHands(!fig.hand || fig.hand === "grip");
    if (ghost) ghost.setHands(!fig.hand || fig.hand === "grip");
    viewer.analysis = null;
    pinned = null; tip.hidden = true; focusId = null;
    setFeedback();
    setActivation();
    shownAt = 0;
    resize();
  }

  raf = requestAnimationFrame(tick);
  const viewer = {
    setExercise,
    analysis: null, // after setExercise on a mistake: { label, your, optimal } for the biggest difference
    resetView() { yaw = VIEW3D.yaw; pitch = VIEW3D.pitch; },
    // Turn the camera to a given angle (radians around the body, and up/down).
    // zoom > 1 moves in on a point atY above the framed center (for close-ups of the body).
    setView(y, p, zoom, atY) { yaw = y; if (p != null) pitch = p; closeUp = zoom > 1 ? { zoom, at: new THREE.Vector3(target.x, target.y + (atY || 0), target.z) } : null; },
    // Show one muscle on its own (null for all the exercise's muscles).
    focusMuscle(id) { focusId = id || null; if (ex) setActivation(); },
    // Show or hide the optimal-form ghost over a mistake.
    setGhost(on) { ghostOn = !!on; },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); if (ro) ro.disconnect();
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      el.remove(); hud.remove();
    }
  };
  return viewer;
}

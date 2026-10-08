// Equipment kits for the lower exercises. Shared parts: GYM3D.kits.lib, GYM3D.Parts (see js/gym3d.js).
(() => {
  const G = GYM3D, K = G.kits.K, L = G.kits.lib, V = L.V, mid = L.mid;
  const T = () => window.THREE;
  const isFoot = (b) => b.startsWith("foot");
  const feetOrShins = (b) => b.startsWith("foot") || b.startsWith("shin");

  // Base rail on the floor along x, on rubber feet at both ends.
  function floorRail(P, x0, x1, z, w = 7.5, d = 6) {
    const fy = P.floorY;
    P.beam(P.V(x0, fy + 1.5 + w / 2, z), P.V(x1, fy + 1.5 + w / 2, z), w, d, P.V(0, 1, 0));
    P.foot(x0 + 3, z, 7, 7); P.foot(x1 - 3, z, 7, 7);
  }
  // Seat pad under the glutes and thighs (top at the lowest skin over the rep).
  function seat(ctx, x0, x1, w = 36, thick = 9, only) {
    const P = ctx.P;
    let top = ctx.lowest({ x0: x0 + 2, x1: x1 - 3, z0: -12, z1: 12 }, only || ((b) => /lowerTorso|thigh/.test(b))) + 0.4;
    if (!isFinite(top)) top = P.floorY + 48;
    P.pad(V((x0 + x1) / 2, top, 0), V(1, 0, 0), x1 - x0, w, thick);
    P.box(x1 - x0 - 6, 3, 10, P.M.steel, V((x0 + x1) / 2, top - thick - 1.5, 0));
    return top;
  }
  // Back pad along the back from just above the hips (fitted like the chest press).
  function backPad(ctx, J, len = 66, width = 34, start = 10) {
    const P = ctx.P, hip = J.pelvis, sh = J.neck;
    const d = sh.clone().sub(hip).setZ(0).normalize(), n = V(d.y, -d.x, 0);
    const cen = hip.clone().addScaledVector(d, start + len / 2), probe = cen.clone().addScaledVector(n, -40);
    const g = ctx.gap(probe, n, d, len - 8, 22);
    const face = probe.clone().addScaledVector(n, (isFinite(g) ? g : 30) - 0.4);
    face.z = 0;
    P.pad(face, d, len, width, 9, n);
    return { face, d, n, len };
  }
  // Grab handle through a fist along its grip axis, on a post down to the frame at height y0.
  function sideHandle(P, h, axis, y0) {
    const ax = axis.clone().normalize();
    P.rod(h.clone().addScaledVector(ax, -5.5), h.clone().addScaledVector(ax, 5.5), 1.6, P.M.grip);
    const lo = h.clone().addScaledVector(ax, ax.y > 0 ? -5.5 : 5.5);
    P.rod(h.clone().addScaledVector(ax, -6.8), h.clone().addScaledVector(ax, 6.8), 0.9, P.M.chrome);
    P.beam(V(lo.x, y0, lo.z), lo.clone().addScaledVector(ax, ax.y > 0 ? -1.2 : 1.2), 3.5, 3.5, V(0, 0, 1), { caps: [false, true] });
  }
  // A small selectorized stack with its own frame, at (x, z), facing +x.
  function stackTower(P, x, z, H, n = 14) {
    const fy = P.floorY;
    const st = P.stack(n, { rodH: H - 20 }); st.g.position.set(x, fy + 9, z);
    [-1, 1].forEach((s) => P.beam(V(x - 9, fy + 9, z + s * 17), V(x - 9, fy + H, z + s * 17), 6, 6, V(0, 0, 1), { caps: [false, true] }));
    P.beam(V(x - 9, fy + H + 3, z - 20), V(x - 9, fy + H + 3, z + 20), 6, 6, V(1, 0, 0));
    [-1, 1].forEach((s) => P.beam(V(x - 22, fy + 5.25, z + s * 17), V(x + 12, fy + 5.25, z + s * 17), 7.5, 6, V(0, 1, 0)));
    [-1, 1].forEach((s) => { P.foot(x - 19, z + s * 17, 7, 7); P.foot(x + 9, z + s * 17, 7, 7); });
    return st;
  }
  const stackTop = (st) => st.g.localToWorld(st.attach.clone().add(st.moving.position));

  // ----- Goblet / sumo squat: one dumbbell held vertically, the top head resting on the cupped hands -----
  K.loGoblet = { build(ctx) {
    const P = ctx.P, r = ctx.fig.db || [8.6, 7], db = P.add(G.dumbbell(P, r[0], r[1]));
    const q = new (T().Quaternion)().setFromUnitVectors(V(0, 0, 1), V(0, 1, 0));
    return { update(f) {
      const m = mid(f.grip.R, f.grip.L);
      db.position.set(m.x, m.y + 3.2 - 7.6, m.z); db.quaternion.copy(q);
    } };
  } };

  // ----- Bulgarian split squat: the rear instep on a flat bench, dumbbells in the hands -----
  K.loBulgarian = { build(ctx) {
    const fb = ctx.bounds((b) => b === "footL");
    const x1 = fb.max.x + 7;
    L.flatBench(ctx, x1 - 104, x1, { only: (b) => b === "footL" });
    const r = ctx.fig.db || [7, 6];
    return { update: L.dumbbells(ctx, r[0], r[1]) };
  } };

  // ----- Step-up: lead foot on a steel plyo box, dumbbells in the hands -----
  K.loStepUp = { build(ctx) {
    const P = ctx.P, M = P.M, fy = P.floorY;
    const fb = ctx.bounds((b) => b === "footR");
    const top = ctx.lowest({ x0: fb.min.x - 2, x1: fb.max.x + 2 }, (b) => b === "footR") - 0.2;
    const x0 = fb.min.x - 7, x1 = fb.max.x + 18, cx = (x0 + x1) / 2, h = top - fy, w = 62;
    // Box: steel shell with a rubber top and a darker kick plate band.
    P.box(x1 - x0, h - 1.4, w, M.graphite, V(cx, fy + (h - 1.4) / 2, 0));
    const lid = G.mesh(G.padGeo(x1 - x0 + 0.6, 1.4, w + 0.6), M.rubber); lid.position.set(cx, top - 1.4, 0); P.add(lid);
    [x0, x1].forEach((x, i) => P.box(0.5, h * 0.55, w - 8, M.steel, V(x + (i ? 0.26 : -0.26), fy + h * 0.45, 0)));
    [x0 + 4, x1 - 4].forEach((x) => [-1, 1].forEach((s) => P.foot(x, s * (w / 2 - 4), 5, 5)));
    const r = ctx.fig.db || [7, 6];
    return { update: L.dumbbells(ctx, r[0], r[1]) };
  } };

  // ----- Hack squat: tilted foot platform, a sled (back pad + shoulder pads + handles) riding
  // up and down two angled rails with the lifter's back, plates on the sled's horns -----
  K.loHackSquat = {
    ground(ctx) { return ctx.lowest({}, isFoot) - 16; },
    build(ctx) {
      const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J;
      // Foot platform under the soles, tilted like the feet.
      const fdir = J.toe.clone().sub(J.ankle).setZ(0).normalize(), np = V(-fdir.y, fdir.x, 0);
      const fc = mid(J.ankle, J.toe); fc.z = 0;
      const probe = fc.clone().addScaledVector(np, -25), gap = ctx.gap(probe, np, fdir, 34, 50, isFoot);
      const face = probe.clone().addScaledVector(np, (isFinite(gap) ? gap : 25) - 0.3);
      const plat = new THREE.Group(); P.add(plat);
      plat.position.copy(face).addScaledVector(fdir, 6);
      plat.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fdir, np, new THREE.Vector3().crossVectors(fdir, np)));
      P.box(50, 2.4, 76, M.steel, V(0, -1.2, 0), plat);
      P.box(46, 0.5, 72, M.rubber, V(0, 0.25, 0), plat);
      [-1, 1].forEach((s) => P.box(50, 6, 4, M.graphite, V(0, -5.4, s * 30), plat));
      plat.updateMatrixWorld(true);
      const pl = (x, y, z) => plat.localToWorld(V(x, y, z));
      // Platform legs: front edge short posts, back edge on the base frame.
      [-1, 1].forEach((s) => {
        const fr = pl(23, -8, s * 30), bk = pl(-23, -8, s * 30);
        P.beam(V(fr.x, fy + 9, fr.z), fr, 5, 5, V(0, 0, 1), { caps: false });
        P.beam(V(bk.x, fy + 9, bk.z), bk, 5, 5, V(0, 0, 1), { caps: false });
      });

      // Rails along the back, behind the pad.
      const bp = { hip: J.pelvis, neck: J.neck };
      const d = bp.neck.clone().sub(bp.hip).setZ(0).normalize(), n = V(d.y, -d.x, 0);
      const len = 80, cen = bp.hip.clone().addScaledVector(d, 4 + len / 2), pr = cen.clone().addScaledVector(n, -40);
      const g2 = ctx.gap(pr, n, d, len - 8, 22);
      const bface = pr.clone().addScaledVector(n, (isFinite(g2) ? g2 : 30) - 0.4); bface.z = 0;
      const sled = new THREE.Group(); P.add(sled);
      sled.attach(P.pad(bface, d, len, 38, 9, n));
      const back = bface.clone().addScaledVector(n, -9);
      // Sled frame behind the pad, with bearing blocks on the rails.
      [-1, 1].forEach((s) => {
        P.beam(back.clone().addScaledVector(d, -len / 2 + 4).add(V(0, 0, s * 16)), back.clone().addScaledVector(d, len / 2 + 10).add(V(0, 0, s * 16)), 5, 5, V(0, 0, 1), { parent: sled });
        [-len / 2 + 10, len / 2 - 6].forEach((a) => P.box(9, 8, 8, M.graphite, back.clone().addScaledVector(d, a).addScaledVector(n, -6).add(V(0, 0, s * 22)), sled, new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), d)));
      });
      // Shoulder pads: on the tops of the shoulders, their faces pointing down the rail.
      let aTop = -Infinity;
      const p0 = S[0].pts;
      for (let i = 0, v = 0; i < p0.length; i += 3, v++) {
        const x = p0[i], y = p0[i + 1], z = p0[i + 2];
        if (Math.abs(z) < 7 || Math.abs(z) > 21) continue;
        const rel = V(x, y, 0).sub(bp.hip), a = rel.dot(d), off = rel.dot(n);
        if (off > 2 && off < 20 && a > 40 && a < 80) aTop = Math.max(aTop, a);
      }
      if (!isFinite(aTop)) aTop = 64;
      [-1, 1].forEach((s) => {
        const c = bp.hip.clone().addScaledVector(d, aTop + 0.4).addScaledVector(n, 8); c.z = s * 13;
        sled.attach(P.pad(c, n, 20, 11, 6.5, d.clone().negate()));
        // Arm from the sled frame up and over to the pad.
        const pb = c.clone().addScaledVector(d, 7.5);
        P.beam(back.clone().addScaledVector(d, aTop + 7.5 - 4).add(V(0, 0, s * 13)), pb.clone().addScaledVector(n, 6), 5, 5, V(0, 0, 1), { parent: sled, caps: [false, true] });
      });
      // Handles beside the shoulder pads where the hands hold.
      ["R", "L"].forEach((k) => {
        const h = S[0].grip[k], ax = S[0].axis[k].clone().normalize();
        P.rod(h.clone().addScaledVector(ax, -5.5), h.clone().addScaledVector(ax, 5.5), 1.6, M.grip, sled);
        const end = h.clone().addScaledVector(ax, ax.dot(d) > 0 ? -5.5 : 5.5);
        P.rod(h.clone().addScaledVector(ax, -6.5), h.clone().addScaledVector(ax, 6.5), 0.9, M.chrome, sled);
        const base = back.clone().addScaledVector(d, end.clone().sub(bp.hip).dot(d)); base.z = Math.sign(h.z) * 16;
        P.beam(base, end, 3.5, 3.5, V(0, 0, 1), { parent: sled, caps: false });
      });
      // Weight horns on the sled sides with plates.
      [-1, 1].forEach((s) => {
        const hb = back.clone().addScaledVector(d, -len / 2 + 14).addScaledVector(n, -4); hb.z = s * 18;
        P.rod(hb, hb.clone().add(V(0, 0, s * 26)), 2.5, M.chrome, sled);
        [0, 1].forEach((i) => { const p = G.mesh(P.ironPlate(22.5, 4.6), M.iron); p.position.copy(hb).add(V(0, 0, s * (9 + i * 4.8))); p.rotation.x = Math.PI / 2; sled.add(p); });
      });
      // Two chrome rails behind the sled's travel, on a frame from the platform up and back.
      const railO = back.clone().addScaledVector(n, -11);
      let aLo = -len / 2 - 26, aHi = len / 2 + 70;
      // Keep the low end above the floor.
      while (railO.y + d.y * aLo < fy + 14) aLo += 1;
      [-1, 1].forEach((s) => {
        const r0 = railO.clone().addScaledVector(d, aLo).add(V(0, 0, s * 22)), r1 = railO.clone().addScaledVector(d, aHi).add(V(0, 0, s * 22));
        P.rod(r0, r1, 1.9, M.chrome);
        P.beam(r0.clone().addScaledVector(n, -4), r1.clone().addScaledVector(n, -4), 7.5, 6, V(0, 0, 1));
        P.beam(V(r1.x, fy + 9, s * 22), r1.clone().addScaledVector(n, -6), 7.5, 7.5, V(0, 0, 1), { caps: false });
        P.beam(V(r0.x, fy + 9, s * 22), r0.clone().addScaledVector(n, -6), 6, 6, V(0, 0, 1), { caps: false });
        const xs = [Math.min(r1.x, r0.x) - 8, Math.max(face.x + 30, r0.x + 10)];
        floorRail(P, xs[0], xs[1], s * 34);
        P.beam(V(r1.x, fy + 5.25, s * 22), V(r1.x, fy + 5.25, s * 34), 6, 6, V(1, 0, 0), { caps: false });
        P.beam(V(r0.x, fy + 5.25, s * 22), V(r0.x, fy + 5.25, s * 34), 6, 6, V(1, 0, 0), { caps: false });
      });
      P.beam(railO.clone().addScaledVector(d, aHi).add(V(0, 0, -22)).addScaledVector(n, -6), railO.clone().addScaledVector(d, aHi).add(V(0, 0, 22)).addScaledVector(n, -6), 6, 6, V(1, 0, 0), { caps: false });
      // The sled follows the hips along the rails.
      const h0 = bp.hip.clone();
      const update = (f) => { sled.position.copy(d).multiplyScalar(f.J.pelvis.clone().sub(h0).dot(d)); };
      return { update };
    }
  };

  // ----- Leg extension: seat, back pad, a lever pivoting on the knee axis with the shin roller
  // on the front of the lower shins; a cam on the lever's outer end winds the cable to the stack -----
  K.loLegExtension = { ground: "fixed", build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J, hip = J.pelvis, knee = J.knee;
    const seatTop = seat(ctx, hip.x - 16, knee.x - 6, 38);
    const bk = backPad(ctx, J, 62, 36, 12);
    // Roller on the front of the shins near the ankles, over the rep.
    const frontOff = (s) => {
      let best = -Infinity; const sd = s.J.ankle.clone().sub(s.J.knee).setZ(0).normalize(), fr = V(-sd.y, sd.x, 0);
      for (let i = 0; i < s.pts.length; i += 3) { const v = V(s.pts[i] - s.J.knee.x, s.pts[i + 1] - s.J.knee.y, 0), a = v.dot(sd); if (a > 31 && a < 37 && Math.abs(s.pts[i + 2]) < 16) best = Math.max(best, v.dot(fr)); }
      return best;
    };
    let off = -Infinity; S.forEach((s) => { off = Math.max(off, frontOff(s)); });
    const rr = 5.5, ra = V(34, off + rr, 0), zl = 25;
    const lever = new THREE.Group(); lever.position.set(knee.x, knee.y, 0); P.add(lever);
    [1, -1].forEach((s) => {
      P.beam(V(0, 0, s * zl), V(ra.x, ra.y, s * zl), 5, 4, V(0, 0, 1), { parent: lever });
      P.box(8, 8, 6, M.graphite, V(0, 0, s * zl), lever);
      const roll = G.mesh(new THREE.CylinderGeometry(rr, rr, 15, 28).rotateX(Math.PI / 2), M.upholstery); roll.position.set(ra.x, ra.y, s * 9.5); lever.add(roll);
    });
    P.rod(V(ra.x, ra.y, -zl), V(ra.x, ra.y, zl), 1.2, M.chrome, lever);
    P.rod(V(0, 0, -zl - 14), V(0, 0, zl + 4), 1.8, M.chrome, lever);
    const camR = 7, camZ = -zl - 11;
    const cam = P.pulley(camR, lever); cam.g.position.set(0, 0, camZ);
    // Bearing posts at the knee axis, on the base frame.
    [1, -1].forEach((s) => {
      P.beam(V(knee.x + 4, fy + 9, s * (zl + 5)), V(knee.x, knee.y - 4, s * (zl + 5)), 6, 6, V(0, 0, 1), { caps: [false, true] });
      P.box(6, 6, 6, M.graphite, V(knee.x, knee.y, s * (zl + 5)));
    });
    // Seat post, back support and base.
    P.beam(V(hip.x + 8, fy + 9, 0), V(hip.x + 8, seatTop - 12, 0), 7.5, 6, V(0, 0, 1), { caps: false });
    const bsup = bk.face.clone().addScaledVector(bk.n, -10);
    P.beam(V(bsup.x, fy + 9, 0), bsup.clone().addScaledVector(bk.d, -bk.len / 2 + 6), 6, 6, V(0, 0, 1), { caps: false });
    P.beam(bsup.clone().addScaledVector(bk.d, -bk.len / 2 + 4), bsup.clone().addScaledVector(bk.d, bk.len / 2 - 6), 5, 5, V(0, 0, 1));
    const x0 = Math.min(bsup.x, hip.x - 30) - 8, x1 = knee.x + 16;
    [1, -1].forEach((s) => floorRail(P, x0, x1, s * (zl + 5)));
    P.beam(V(hip.x, fy + 5.25, -zl - 5), V(hip.x, fy + 5.25, zl + 5), 7.5, 6, V(1, 0, 0), { caps: false });
    // Handles beside the seat where the hands hold.
    ["R", "L"].forEach((k) => sideHandle(P, S[0].grip[k], S[0].axis[k], seatTop - 10));
    // Weight stack on the outer side, the cable over a top pulley and down to the cam.
    const sx = hip.x - 26, sz = camZ, H = Math.max(140, knee.y - fy + 70);
    const st = stackTower(P, sx, sz, H);
    P.beam(V(sx + 12, fy + 5.25, sz), V(knee.x + 4, fy + 5.25, sz), 6, 6, V(0, 1, 0), { caps: false });
    P.beam(V(sx - 9, fy + H + 3, sz), V(sx - 9, fy + H + 3, -zl - 5), 6, 6, V(1, 0, 0), { caps: false });
    const p1 = P.pulley(4.6); p1.g.position.set(sx + 4.6, fy + H - 6, sz); p1.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, -1, 0), V(0, 0, 1)));
    // Down the stack's front, along the base and up to the cam.
    const p2 = P.pulley(4.6); p2.g.position.set(sx + 13.8, fy + 15, sz);
    const p3 = P.pulley(4.6); p3.g.position.set(knee.x - camR - 4.6, fy + 15, sz);
    [p2, p3].forEach((p) => P.box(6, 6, 7, M.graphite, V(p.g.position.x, fy + 9.5, sz)));
    const run = G.CableRun(P, M.cable, 0.36);
    let rest = Infinity;
    const update = (f) => {
      const sd = f.J.ankle.clone().sub(f.J.knee); lever.rotation.z = Math.atan2(sd.y, sd.x);
      const anchor = V(-camR, 0, camZ).applyAxisAngle(V(0, 0, 1), lever.rotation.z).add(lever.position);
      const Ln = run.update(stackTop(st), [{ C: p1.g.position.clone(), n: V(0, 0, 1), r: 4.6, pulley: p1 }, { C: p2.g.position.clone(), n: V(0, 0, 1), r: 4.6, pulley: p2 }, { C: p3.g.position.clone(), n: V(0, 0, 1), r: 4.6, pulley: p3 }, { C: V(knee.x, knee.y, camZ), n: V(0, 0, 1), r: camR }], anchor).length;
      rest = Math.min(rest, Ln);
      st.moving.position.y = Math.max(0, Math.min(st.travel, (Ln - rest) * 1.4));
    };
    S.forEach((s) => update(s));
    return { update };
  } };

  // ----- Seated calf raise: seat, a step under the balls of the feet, and a lever pivoting at
  // the front with the knee pad on the lower thighs and plates on its horn -----
  K.loSeatedCalf = { ground: "fixed", build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J, hip = J.pelvis, knee = J.knee;
    const seatTop = seat(ctx, hip.x - 18, hip.x + 20, 38, 9, (b) => b === "lowerTorso");
    // Step under the balls of the feet; the heels hang off its back edge.
    const ball = J.toe.x - 4;
    const stepTop = ctx.lowest({ x0: ball - 3, x1: ball + 14, z0: -22, z1: 22 }, isFoot) - 0.2;
    const step = G.mesh(G.padGeo(20, 2.2, 56), M.rubber); step.position.set(ball + 8, stepTop - 2.2, 0); P.add(step);
    P.box(22, stepTop - 2.2 - fy, 58, M.graphite, V(ball + 9, fy + (stepTop - 2.2 - fy) / 2, 0));
    // Knee pad: one long roller across both lower thighs, just behind the knees.
    const px = knee.x - 9;
    const tops = ctx.track((x, y, z, b) => b.startsWith("thigh") && Math.abs(x - px) < 3 && Math.abs(z) < 16);
    const topOf = () => { const p = tops.now(); let m = -Infinity; for (let i = 1; i < p.length; i += 3) m = Math.max(m, p[i]); return m; };
    const C = V(ball + 34, fy + 22, 0), padR = 5.5;
    const y0 = topOf() + padR - 0.3;
    const R = Math.hypot(px - C.x, y0 - C.y), base = Math.atan2(y0 - C.y, px - C.x);
    const lever = new THREE.Group(); lever.position.copy(C); P.add(lever);
    const pad0 = V(px - C.x, y0 - C.y, 0);
    const roll = G.mesh(new THREE.CylinderGeometry(padR, padR, 40, 28).rotateX(Math.PI / 2), M.upholstery); roll.position.copy(pad0); lever.add(roll);
    P.rod(pad0.clone().setZ(-23), pad0.clone().setZ(23), 1.2, M.chrome, lever);
    [1, -1].forEach((s) => {
      // Arms from the pivot up to the pad ends, on the outside of the legs.
      P.beam(V(0, 0, s * 24), pad0.clone().setZ(s * 24).add(V(4, 0, 0)), 6, 5, V(0, 0, 1), { parent: lever });
      P.box(6, 8, 6, M.graphite, pad0.clone().setZ(s * 24), lever);
    });
    // Plate horn just in front of the pad, and handles where the hands hold the pad.
    const horn = pad0.clone().add(V(16, 2, 0));
    P.beam(pad0.clone().add(V(4, 0, -24)), horn.clone().setZ(-24), 5, 5, V(0, 0, 1), { parent: lever, caps: false });
    P.beam(pad0.clone().add(V(4, 0, 24)), horn.clone().setZ(24), 5, 5, V(0, 0, 1), { parent: lever, caps: false });
    [1, -1].forEach((s) => P.rod(horn.clone().setZ(s * 24), horn.clone().setZ(s * 37), 2.5, M.chrome, lever));
    [0, 1, 2].forEach((i) => [1, -1].forEach((s) => { const p = G.mesh(P.ironPlate(11, 3), M.iron); p.position.copy(horn).setZ(s * (28 + i * 3.2)); p.rotation.x = Math.PI / 2; lever.add(p); }));
    ["R", "L"].forEach((k) => {
      const h = S[0].grip[k].clone().sub(C);
      P.rod(V(h.x, h.y, h.z - 5.5), V(h.x, h.y, h.z + 5.5), 1.6, M.grip, lever);
      P.beam(V(h.x, h.y, Math.sign(h.z) * 24), V(h.x, h.y, h.z + Math.sign(h.z) * 5.5), 3.2, 3.2, V(0, 1, 0), { parent: lever, caps: false });
      P.beam(V(h.x, pad0.y, Math.sign(h.z) * 24), V(h.x, h.y, Math.sign(h.z) * 24), 3.2, 3.2, V(1, 0, 0), { parent: lever, caps: false });
    });
    P.rod(V(0, 0, -30), V(0, 0, 30), 1.8, M.chrome, lever);
    [1, -1].forEach((s) => {
      P.beam(V(C.x, fy + 9, s * 30), V(C.x, C.y - 3, s * 30), 6, 6, V(0, 0, 1), { caps: [false, true] });
      P.box(7, 7, 6, M.graphite, V(C.x, C.y, s * 30));
      floorRail(P, hip.x - 30, C.x + 12, s * 30);
    });
    P.beam(V(hip.x + 2, fy + 9, 0), V(hip.x + 2, seatTop - 12, 0), 7.5, 6, V(0, 0, 1), { caps: false });
    P.beam(V(hip.x + 2, fy + 5.25, -30), V(hip.x + 2, fy + 5.25, 30), 7.5, 6, V(1, 0, 0), { caps: false });
    // Stop bar under the lever.
    P.beam(V(C.x - 18, fy + 9, 30), V(C.x - 18, C.y + 6, 30), 4, 4, V(0, 0, 1), { caps: [false, true] });
    const update = () => {
      const y = topOf() + padR - 0.3, a = Math.asin(Math.max(-1, Math.min(1, (y - C.y) / R)));
      lever.rotation.z = (Math.PI - a) - base;
    };
    S.forEach(() => update());
    return { update };
  } };

  // ----- Hip thrust: a flat bench side-on under the shoulder blades, a padded barbell on the hips -----
  K.loHipThrust = { build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S;
    // Bench edge under the shoulder blades over the rep.
    // The shoulders pivot on the bench's front edge: it sits just under the shoulder joints.
    const edge = S[S.length - 1].J.shoulder.x + 3;
    const x0 = edge - 31, x1 = edge;
    let top = ctx.lowest({ x0: x1 - 6, x1: x1 - 1, z0: -14, z1: 14 }, (b) => b === "upperTorso");
    if (!isFinite(top)) top = fy + 40;
    top += 0.4;
    const len = 112, thick = 9.5, cx = (x0 + x1) / 2;
    P.pad(V(cx, top, 0), V(0, 0, 1), len, x1 - x0, thick);
    const by = top - thick - 4.4;
    P.beam(V(cx, by, -len / 2 + 9), V(cx, by, len / 2 - 9), 7.5, 5, V(1, 0, 0));
    [-len / 2 + 15, len / 2 - 15].forEach((z) => {
      P.beam(V(cx, fy + 9, z), V(cx, by - 3.75, z), 7.5, 7.5, V(1, 0, 0), { caps: false });
      P.stabilizer(V(cx, fy, z), V(1, 0, 0), 46);
    });
    // Barbell through the fists with a foam pad round its middle.
    const upd = L.barbell(ctx, [[22.5, 4.6], [22.5, 4.6]], "iron");
    const foam = G.mesh(new THREE.CylinderGeometry(5.2, 5.2, 36, 28, 1, true).rotateX(Math.PI / 2), M.upholstery); P.add(foam);
    const ends = [1, -1].map(() => { const e = G.mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.6, 28).rotateX(Math.PI / 2), M.upholstery); P.add(e); return e; });
    const update = (f) => {
      upd(f);
      const m = mid(f.grip.R, f.grip.L), q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), f.grip.R.clone().sub(f.grip.L).normalize());
      foam.position.copy(m); foam.quaternion.copy(q);
      ends.forEach((e, i) => { e.position.copy(m).add(V(0, 0, (i ? -1 : 1) * 18).applyQuaternion(q)); e.quaternion.copy(q); });
    };
    return { update };
  } };

  // ----- Cable kickback: a cable column in front, an ankle strap on the working (far) leg -----
  K.loKickback = { build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S;
    const g0 = mid(S[0].grip.R, S[0].grip.L);
    const t = L.cableTower(ctx, { at: V(g0.x - 7, 0, 0), face: V(-1, 0, 0), carriageY: fy + 14, ratio: 0.35 });
    // Ankle: the lowest ring of the far shin at the start (the leg hangs down), and a ring higher up for its direction.
    const p0 = S[0].pts, names = ctx.names;
    let minY = Infinity;
    ctx.track((x, y, z, b) => { if (b === "shinL" && y < minY) minY = y; return false; });
    const lo = ctx.track((x, y, z, b) => b === "shinL" && y < minY + 5);
    const hi = ctx.track((x, y, z, b) => b === "shinL" && y > minY + 14 && y < minY + 19);
    void p0; void names;
    const cen = (tr) => { const p = tr.now(), c = V(0, 0, 0); for (let i = 0; i < p.length; i += 3) c.add(V(p[i], p[i + 1], p[i + 2])); return c.divideScalar(Math.max(1, p.length / 3)); };
    const cuff = new THREE.Group(); P.add(cuff);
    const strap = G.mesh(new THREE.CylinderGeometry(4.7, 4.9, 5.5, 28, 1, true), M.upholstery); strap.material = strap.material.clone(); strap.material.side = THREE.DoubleSide; cuff.add(strap);
    [1, -1].forEach((s) => { const rim = G.mesh(new THREE.TorusGeometry(4.8, 0.32, 8, 28).rotateX(Math.PI / 2), M.rubber); rim.position.y = s * 2.75; cuff.add(rim); });
    const ring = G.mesh(new THREE.TorusGeometry(1.5, 0.3, 8, 18), M.zinc); cuff.add(ring);
    const c = P.add(G.carabiner(P));
    const update = (f) => {
      const a = cen(lo), b = cen(hi), up = b.clone().sub(a).normalize();
      const A = a.clone().addScaledVector(up, 1.5);
      cuff.position.copy(A); cuff.quaternion.setFromUnitVectors(V(0, 1, 0), up);
      // D-ring on the side of the strap facing the pulley.
      const toward = t.A.clone().sub(A); toward.sub(up.clone().multiplyScalar(toward.dot(up))).normalize();
      const rp = A.clone().addScaledVector(toward, 5.6);
      ring.position.copy(toward).multiplyScalar(5.6).applyQuaternion(cuff.quaternion.clone().invert());
      ring.quaternion.setFromUnitVectors(V(0, 0, 1), up.clone().cross(toward).normalize().applyQuaternion(cuff.quaternion.clone().invert()));
      const dir = t.A.clone().sub(rp).normalize();
      G.between(c, rp.clone().addScaledVector(dir, 0.6), rp.clone().addScaledVector(dir, 1.6));
      t.update(rp.clone().addScaledVector(dir, 7.6));
    };
    S.forEach((s) => update(s));
    return { update };
  } };

  // ----- Seated hip abduction: seat, back pad, and two swing arms pivoting on vertical axes under
  // the hips, each with a pad on the outside of the knee and a foot peg; the stack behind -----
  K.loHipAbduction = { ground: "fixed", build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J, hip = J.pelvis, knee = J.knee;
    const seatTop = seat(ctx, hip.x - 16, knee.x - 10, 40);
    const bk = backPad(ctx, J, 62, 36, 12);
    const arms = [1, -1].map((s) => {
      const k = s > 0 ? "R" : "L", thigh = "thigh" + k;
      const outer = ctx.track((x, y, z, b) => b === thigh && x > knee.x - 14 && x < knee.x - 4 && s * z > 6);
      const out0 = (() => { const p = outer.now(); let m = -Infinity, cy = 0, n = 0; for (let i = 0; i < p.length; i += 3) { m = Math.max(m, s * p[i + 2]); cy += p[i + 1]; n++; } return { z: m, y: cy / Math.max(1, n) }; })();
      const piv = V(hip.x + 4, seatTop - 14, s * 9);
      const arm = new THREE.Group(); arm.position.copy(piv); P.add(arm);
      const padC = V(knee.x - 9 - piv.x, out0.y - piv.y, s * out0.z + s * 0.3 - piv.z);
      // Pad on the outside of the knee, its face pointing in at the leg.
      const pad = P.pad(padC.clone().add(piv), V(1, 0, 0), 20, 16, 6, V(0, 0, -s)); arm.attach(pad);
      const back = padC.clone().add(V(0, 0, s * 7));
      P.beam(V(0, -4, 0), V(back.x - 8, -4, back.z), 5, 5, V(0, 1, 0), { parent: arm });
      P.beam(V(back.x - 8, -4, back.z), V(back.x - 8, back.y, back.z), 5, 5, V(1, 0, 0), { parent: arm, caps: false });
      P.box(16, 10, 1.2, M.graphite, V(back.x, back.y, back.z - s * 0.6), arm);
      P.box(6, 6, 6, M.graphite, V(0, -4, 0), arm);
      // Foot peg under the foot.
      const ft = ctx.bounds((b) => b === "foot" + k), fp = V((ft.min.x + ft.max.x) / 2 - piv.x, ft.min.y - 1.6 - piv.y, (ft.min.z + ft.max.z) / 2 - piv.z);
      P.beam(V(back.x - 8, -4, back.z), V(fp.x - 4, fp.y - 2, back.z), 4, 4, V(0, 0, 1), { parent: arm, caps: false });
      P.rod(V(fp.x - 4, fp.y, back.z), V(fp.x - 4, fp.y, fp.z - s * 7), 1.6, M.grip, arm);
      return { arm, outer, s, a0: Math.atan2(padC.z, padC.x) };
    });
    [1, -1].forEach((s) => P.rod(V(hip.x + 4, seatTop - 14, s * 9), V(hip.x + 4, fy + 9, s * 9), 2.2, M.chrome));
    P.box(14, 8, 30, M.graphite, V(hip.x + 4, seatTop - 12, 0));
    P.beam(V(hip.x - 4, fy + 9, 0), V(hip.x - 4, seatTop - 16, 0), 7.5, 6, V(0, 0, 1), { caps: false });
    const bsup = bk.face.clone().addScaledVector(bk.n, -10);
    P.beam(V(bsup.x, fy + 9, 0), bsup.clone().addScaledVector(bk.d, -bk.len / 2 + 6), 6, 6, V(0, 0, 1), { caps: false });
    P.beam(bsup.clone().addScaledVector(bk.d, -bk.len / 2 + 4), bsup.clone().addScaledVector(bk.d, bk.len / 2 - 6), 5, 5, V(0, 0, 1));
    ["R", "L"].forEach((k) => sideHandle(P, S[0].grip[k], S[0].axis[k], seatTop - 10));
    // Stack behind the back pad, the cable down into the base.
    const sx = Math.min(bsup.x, hip.x - 24) - 30, H = 150;
    const st = stackTower(P, sx, 0, H);
    [1, -1].forEach((s) => floorRail(P, sx + 10, knee.x + 10, s * 26));
    P.beam(V(hip.x - 4, fy + 5.25, -26), V(hip.x - 4, fy + 5.25, 26), 7.5, 6, V(1, 0, 0), { caps: false });
    const p1 = P.pulley(4.6); p1.g.position.set(sx + 4.6, fy + H - 6, 0); p1.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, -1, 0), V(0, 0, 1)));
    const p2 = P.pulley(4.6); p2.g.position.set(sx + 22, fy + 16, 0);
    const run = G.CableRun(P, M.cable, 0.36);
    const update = () => {
      let spread = 0;
      arms.forEach((a) => {
        const p = a.outer.now(); let m = -Infinity, mx = 0, n = 0;
        for (let i = 0; i < p.length; i += 3) { if (a.s * p[i + 2] > m) m = a.s * p[i + 2]; mx += p[i]; n++; }
        const ang = Math.atan2(a.s * m - a.arm.position.z, mx / Math.max(1, n) - a.arm.position.x);
        const al = a.a0 - ang;
        a.arm.rotation.y = al; spread += Math.abs(al);
      });
      st.moving.position.y = Math.min(st.travel, spread * 22);
      run.update(stackTop(st), [{ C: p1.g.position.clone(), n: V(0, 0, 1), r: 4.6, pulley: p1 }, { C: p2.g.position.clone(), n: V(0, 0, 1), r: 4.6, pulley: p2 }], V(hip.x - 4, fy + 12, 0));
    };
    update();
    return { update };
  } };
})();

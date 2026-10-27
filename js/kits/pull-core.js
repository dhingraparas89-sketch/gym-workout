// Equipment kits for the pull-core exercises. Shared parts: GYM3D.kits.lib, GYM3D.Parts (see js/gym3d.js).
// Every kit is fitted to the body sampled over the rep (ctx.S) and returns { update(f) } for the
// parts that move with the body. Names are prefixed "pc" so they never clash with other files.
(() => {
  const G = GYM3D, K = G.kits.K, lib = G.kits.lib, V = lib.V, mid = lib.mid;
  const T = () => window.THREE;
  const isShin = (b) => /^(shin|foot)/.test(b);

  // A rigid piece built along local +x from the origin (length L), re-aimed every frame from a
  // fixed pivot toward a moving point: levers and bars that swing.
  function swingTo(g, pivot, target) {
    const d = target.clone().sub(pivot);
    g.position.copy(pivot);
    g.quaternion.setFromUnitVectors(V(1, 0, 0), d.normalize());
  }

  // ---------- Ab wheel: a mat under the knees, the wheel rolling on it under the hands ----------
  K.pcAbWheel = { ground: "body", build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S;
    const b = ctx.bounds(), matT = 1.5;
    let lo = Infinity, hi = -Infinity, x0 = Infinity, x1 = -Infinity;
    S.forEach((s) => { const m = mid(s.grip.R, s.grip.L); lo = Math.min(lo, m.y); hi = Math.max(hi, m.y); x0 = Math.min(x0, m.x); x1 = Math.max(x1, m.x); });
    lib.mat(ctx, (Math.min(b.min.x, x0) + Math.max(b.max.x, x1 + 12)) / 2, Math.min(200, Math.max(b.max.x, x1 + 12) - Math.min(b.min.x, x0) + 24), 62);
    // The axle runs through both fists; the wheel's radius is the axle's (mean) height over the mat.
    const R = Math.max(6, (lo + hi) / 2 - (fy + matT)), half = Math.abs(S[0].grip.R.z) + 6;
    const g = new THREE.Group(); P.add(g);
    const wheel = new THREE.Group(); g.add(wheel);
    const tire = G.mesh(new THREE.CylinderGeometry(R, R, 5.6, 40).rotateX(Math.PI / 2), M.rubber); wheel.add(tire);
    [-1, 1].forEach((s) => {
      const rim = G.mesh(new THREE.CylinderGeometry(R * 0.72, R * 0.72, 0.6, 32).rotateX(Math.PI / 2), M.plastic); rim.position.z = s * 2.95; wheel.add(rim);
      const hub = G.mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.8, 20).rotateX(Math.PI / 2), M.chrome); hub.position.z = s * 3.3; wheel.add(hub);
    });
    // Spokes cut into the rim faces so the wheel visibly turns.
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3, sp = G.mesh(new THREE.BoxGeometry(R * 0.5, 1.2, 6.2), M.graphite); sp.position.set(Math.cos(a) * R * 0.45, Math.sin(a) * R * 0.45, 0); sp.rotation.z = a; wheel.add(sp);
    }
    P.rod(V(0, 0, -half), V(0, 0, half), 0.9, M.chrome, g);
    [1, -1].forEach((s) => {
      P.rod(V(0, 0, s * 4), V(0, 0, s * (half - 1)), 1.7, M.foamGrip, g);
      P.rod(V(0, 0, s * (half - 1)), V(0, 0, s * half), 1.9, M.plastic, g);
    });
    const y = fy + matT + R, x00 = mid(S[0].grip.R, S[0].grip.L).x;
    return { update(f) {
      const m = mid(f.grip.R, f.grip.L);
      g.position.set(m.x, y, 0);
      wheel.rotation.z = -(m.x - x00) / R;
    } };
  } };

  // ---------- Captain's chair: back pad, forearm pads, vertical handles, foot steps ----------
  // Floor 128 below the forearm pads, so the hanging feet clear it.
  const chairPad = (ctx) => ctx.lowest({ z0: 4 }, (n) => /^(forearm|upperArm)/.test(n));
  K.pcCaptainChair = {
    ground(ctx) { return chairPad(ctx) - 0.4 - 132; },
    build(ctx) {
      const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J;
      const el = J.elbow, gR = S[0].grip.R, padTop = chairPad(ctx) + 0.4, half = Math.abs(gR.z);
      const px0 = el.x - 8, px1 = gR.x - 3;
      // Back pad: upright, behind the back, from the hips to the shoulder blades.
      const n = V(1, 0, 0), up = V(0, 1, 0);
      const probe = V(J.pelvis.x - 40, (J.pelvis.y + J.neck.y) / 2 - 4, 0);
      const len = Math.min(74, J.neck.y - J.pelvis.y + 8), gap = ctx.gap(probe, n, up, len - 8, 22, (b) => /Torso/.test(b));
      const face = probe.clone().addScaledVector(n, (isFinite(gap) ? gap : 30) - 0.3);
      P.pad(face, up, len, 30, 8, n);
      const bx = face.x - 8.5, frameZ = half + 11;
      // Spine of the frame behind the back pad, and a cross tube carrying it.
      P.beam(V(bx - 3, fy + 9, 0), V(bx - 3, padTop + 34, 0), 7.5, 7.5, V(0, 0, 1), { caps: [false, true] });
      [face.y - len / 2 + 8, face.y + len / 2 - 8].forEach((y) => P.box(4, 6, 20, M.graphite, V(bx - 1, y, 0)));
      P.beam(V(bx - 3, padTop - 7, -frameZ), V(bx - 3, padTop - 7, frameZ), 7.5, 7.5, V(1, 0, 0));
      [1, -1].forEach((s) => {
        const z = s * half, sideZ = s * frameZ;
        // Forearm pad and its arm.
        P.pad(V((px0 + px1) / 2, padTop, z), V(1, 0, 0), px1 - px0, 11, 6.5);
        P.beam(V(bx - 3, padTop - 7, sideZ), V(px1 + 2, padTop - 7, sideZ), 6, 6, V(0, 0, 1));
        P.box(px1 - px0 - 4, 1, Math.abs(sideZ - z) + 8, M.steel, V((px0 + px1) / 2, padTop - 6.6, (z + sideZ) / 2));
        // Vertical handle in the fist at the front of the pad.
        const h = S[0].grip[s > 0 ? "R" : "L"], ax = S[0].axis[s > 0 ? "R" : "L"].clone().normalize();
        if (ax.y < 0) ax.negate();
        P.rod(h.clone().addScaledVector(ax, -6), h.clone().addScaledVector(ax, 6), 1.7, M.grip);
        P.rod(h.clone().addScaledVector(ax, 6), h.clone().addScaledVector(ax, 7.2), 1.9, M.plastic);
        const foot = h.clone().addScaledVector(ax, -6);
        P.beam(V(foot.x, padTop - 7, foot.z), foot, 3.5, 3.5, V(1, 0, 0), { caps: false });
        P.beam(V(foot.x, padTop - 7, foot.z), V(foot.x, padTop - 7, sideZ), 3.5, 3.5, V(1, 0, 0), { caps: false });
        // Side upright down to the floor frame, and a front leg.
        P.beam(V(bx - 3, fy + 9, sideZ), V(bx - 3, padTop - 10, sideZ), 6, 6, V(0, 0, 1), { caps: false });
        P.beam(V(px1 + 2, fy + 9, sideZ), V(px1 + 2, padTop - 10, sideZ), 6, 6, V(0, 0, 1), { caps: false });
        P.beam(V(bx - 30, fy + 5.25, sideZ), V(px1 + 22, fy + 5.25, sideZ), 7.5, 6, V(0, 1, 0));
        P.foot(bx - 27, sideZ, 7, 7); P.foot(px1 + 19, sideZ, 7, 7);
        // Diagonal brace and a step to climb on, on the outside of each side.
        P.beam(V(bx - 26, fy + 9, sideZ), V(bx - 3, padTop - 48, sideZ), 4.5, 4.5, V(0, 0, 1), { caps: false });
        const stepY = fy + 34;
        P.beam(V(px1 + 2, stepY - 2, sideZ), V(px1 + 2, stepY - 2, sideZ + s * 22), 4, 4, V(1, 0, 0), { caps: false });
        P.box(22, 2.2, 20, M.rubber, V(px1 - 6, stepY, sideZ + s * 14));
        P.box(22, 1.2, 20, M.steel, V(px1 - 6, stepY - 1.7, sideZ + s * 14));
      });
      P.beam(V(bx - 30, fy + 5.25, -frameZ), V(bx - 30, fy + 5.25, frameZ), 7.5, 6, V(0, 1, 0), { caps: false });
      P.beam(V(px1 + 2, fy + 5.25, -frameZ), V(px1 + 2, fy + 5.25, frameZ), 7.5, 6, V(0, 1, 0), { caps: false });
      return { update() {} };
    }
  };

  // ---------- Straight-arm pulldown: cable tower in front, straight bar from the high pulley ----------
  function straightBarRig(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, g = new THREE.Group(); P.add(g);
    const half = Math.max(31, Math.abs(ctx.S[0].grip.R.z) + 13);
    const b = P.rod(V(0, 0, -half), V(0, 0, half), 1.45, M.knurl, g); G.worldUV(b.geometry = b.geometry.clone(), 2 * Math.PI * 1.45, 2 * half, 0.9);
    [1, -1].forEach((s) => { P.rod(V(0, 0, s * half), V(0, 0, s * (half + 1.6)), 1.9, M.chrome, g); P.rod(V(0, 0, s * 2.2), V(0, 0, s * 6), 1.6, M.chrome, g); });
    // Swivel in the middle: a block on the bar and a stem up to the eye.
    P.box(3.4, 3.4, 4.4, M.chrome, V(0, 0, 0), g);
    P.rod(V(0, 1.7, 0), V(0, 6.5, 0), 0.75, M.chrome, g);
    const eye = G.mesh(new THREE.TorusGeometry(1.1, 0.32, 8, 18), M.zinc); eye.position.y = 7.4; g.add(eye);
    const c = P.add(G.carabiner(P));
    return (f, toward) => {
      const m0 = mid(f.grip.R, f.grip.L), z = f.grip.R.clone().sub(f.grip.L).normalize();
      const y = toward.clone().sub(m0); y.sub(z.clone().multiplyScalar(y.dot(z))).normalize();
      g.position.copy(m0); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(y, z), y, z));
      const eyeAt = m0.clone().addScaledVector(y, 7.9), dir = toward.clone().sub(eyeAt).normalize();
      G.between(c, eyeAt, eyeAt.clone().add(dir));
      return eyeAt.clone().addScaledVector(dir, 6.6);
    };
  }
  K.pcStraightBar = { build(ctx) {
    const S = ctx.S, P = ctx.P;
    let top = -Infinity, fx = -Infinity;
    S.forEach((s) => { const m = mid(s.grip.R, s.grip.L); top = Math.max(top, m.y); fx = Math.max(fx, m.x); });
    const toe = S[0].J.toe.x;
    const at = V(Math.max(fx + 34, toe + 36), 0, 0);
    const t = lib.cableTower(ctx, { at, face: V(-1, 0, 0), carriageY: Math.min(P.floorY + 200, top + 22), ratio: 0.5 });
    return lib.cableKit(ctx, [t], [straightBarRig(ctx)]);
  } };

  // ---------- T-bar row: landmine on the floor behind, bar between the legs, V handle ----------
  K.pcTBar = { build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J;
    // Where the handle hooks the bar, over the hands, at the start and end of the rep.
    const hookOf = (f) => mid(f.grip.R, f.grip.L).add(V(0, 6.5, 0));
    const h0 = hookOf(S[0]), h1 = hookOf(S[S.length - 1]);
    // Landmine pivot on the floor behind the heels, equally far from both ends of the handle's
    // travel, so the handle stays at the same point on the bar.
    const ay = fy + 7.5, c = mid(h0, h1), d = h1.clone().sub(h0);
    // Point on the perpendicular bisector of h0-h1 with y = ay.
    const ax = Math.abs(d.x) < 1e-3 ? J.ankle.x - 130 : c.x + (d.y * (c.y - ay)) / d.x;
    const A = V(Math.max(J.ankle.x - 200, Math.min(ax, J.ankle.x - 90)), ay, 0), Lh = (A.distanceTo(h0) + A.distanceTo(h1)) / 2;
    // Base: a heavy plate on the floor with a sleeve that swivels on a post.
    P.box(34, 1.6, 34, M.graphite, V(A.x - 4, fy + 0.8, 0));
    [[-14, -14], [-14, 14], [14, -14], [14, 14]].forEach(([dx, dz]) => P.bolt(V(A.x - 4 + dx, fy + 1.6, dz), V(0, 1, 0), 0.7));
    P.rod(V(A.x - 4, fy + 1.6, 0), V(A.x - 4, ay, 0), 2.6, M.graphite);
    P.box(5, 5, 9, M.graphite, V(A.x - 4, ay, 0));
    P.rod(V(A.x - 4, ay, -5.2), V(A.x - 4, ay, 5.2), 1.1, M.chrome);
    // The bar: built along local +x from the pivot; the landmine sleeve around its end.
    const bar = new THREE.Group(); P.add(bar);
    P.rod(V(-4, 0, 0), V(16, 0, 0), 3.4, M.graphite, bar);
    P.rod(V(16, 0, 0), V(Lh + 11, 0, 0), 1.4, M.knurl, bar);
    P.rod(V(Lh + 11, 0, 0), V(Lh + 14, 0, 0), 2.9, M.chrome, bar);
    P.rod(V(Lh + 14, 0, 0), V(Lh + 57, 0, 0), 2.5, M.chrome, bar);
    // Plates sized so they clear the floor at the bottom of the rep and the body at the top
    // (skin points in the slab where the plates sit must stay outside their radius).
    let low = Infinity, clear = Infinity;
    S.forEach((s) => {
      const h = hookOf(s), dir = h.clone().sub(A).normalize();
      low = Math.min(low, A.y + dir.y * (Lh + 14));
      const p = s.pts;
      for (let i = 0; i < p.length; i += 3) {
        const v = V(p[i] - A.x, p[i + 1] - A.y, p[i + 2] - A.z), a = v.dot(dir);
        if (a < Lh + 13 || a > Lh + 26) continue;
        clear = Math.min(clear, v.addScaledVector(dir, -a).length());
      }
    });
    // Small-diameter plates (four 5 kg) so the handle can reach the body past them.
    const R = Math.max(8, Math.min(12.5, low - fy - 3, clear - 0.5));
    let x = Lh + 14.5;
    [0, 1, 2, 3].forEach(() => { const p = G.mesh(P.ironPlate(R, 2.6), M.iron); p.rotation.z = Math.PI / 2; p.position.x = x + 1.3; bar.add(p); x += 2.8; });
    const lj = G.mesh(new THREE.CylinderGeometry(3.9, 3.9, 3.6, 24).rotateZ(Math.PI / 2), M.plastic); lj.position.x = x + 1.8; bar.add(lj);
    // Close-grip V handle: two grips in the fists, steel legs up to a hook over the bar.
    const grips = [0, 1].map(() => { const m = G.mesh(new THREE.CylinderGeometry(1.55, 1.55, 11, 16).translate(0, 5.5, 0), M.grip); P.add(m); return m; });
    const legs = [0, 1].map(() => { const m = G.mesh(new THREE.CylinderGeometry(0.75, 0.75, 1, 10).translate(0, 0.5, 0), M.chrome); P.add(m); return m; });
    const hd = new THREE.Group(); P.add(hd);
    const hook = G.mesh(new THREE.TorusGeometry(2.3, 0.6, 8, 20, Math.PI * 1.25), M.chrome); hook.rotation.z = -Math.PI * 0.125; hd.add(hook);
    const setRod = (m, a, b) => { const len = G.between(m, a, b); m.scale.set(1, Math.max(0.01, len), 1); };
    return { report: () => ({ plateR: R, clear }), update(f) {
      const H = hookOf(f), dir = H.clone().sub(A).normalize();
      bar.position.copy(A); bar.quaternion.setFromUnitVectors(V(1, 0, 0), dir);
      // Hook ring round the bar, open at the bottom, in the plane across the bar.
      const y = V(0, 1, 0).sub(dir.clone().multiplyScalar(dir.y)).normalize(), x = new THREE.Vector3().crossVectors(y, dir);
      hd.position.copy(H); hd.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, dir));
      const foot = H.clone().addScaledVector(y, -1.2);
      ["R", "L"].forEach((s, i) => {
        const ax = f.axis[s].clone().normalize(), gp = f.grip[s];
        G.between(grips[i], gp.clone().addScaledVector(ax, -5.5), gp.clone().addScaledVector(ax, 5.5));
        const end = gp.clone().addScaledVector(ax, ax.dot(dir) > 0 ? 5.5 : -5.5);
        setRod(legs[i], end, foot.clone().addScaledVector(x, (i ? -1 : 1) * 1.6));
      });
    } };
  } };


  // Flat bench whose pad (length along x) sits at `top`, centred on (cx, cz): the same build as
  // the shared flat bench, off the body's midline.
  function benchAt(ctx, cx, cz, len, top, w = 29) {
    const P = ctx.P, M = P.M, fy = P.floorY, thick = 9.5, x0 = cx - len / 2, x1 = cx + len / 2;
    P.pad(V(cx, top, cz), V(1, 0, 0), len, w, thick);
    const by = top - thick - 4.4;
    P.beam(V(x0 + 9, by, cz), V(x1 - 9, by, cz), 7.5, 5, V(0, 0, 1));
    [x0 + 14, cx, x1 - 14].forEach((x) => P.box(14, 0.6, 18, M.graphite, V(x, top - thick - 0.3, cz)));
    [x1 - 15, x0 + 15].forEach((x, i) => {
      P.beam(V(x, fy + 9, cz), V(x, by - 3.75, cz), 7.5, 7.5, V(0, 0, 1), { caps: false });
      P.stabilizer(V(x, fy, cz), V(0, 0, 1), i ? 56 : 52);
      const dir = i ? 1 : -1;
      P.beam(V(x, by - 18, cz), V(x + dir * 13, by - 3.75, cz), 4, 4, V(0, 0, 1), { caps: false });
      [-1, 1].forEach((s) => P.bolt(V(x, by, cz + s * 2.55), V(0, 0, s), 0.7));
    });
  }

  // ---------- Dumbbell row: left knee and hand on a flat bench, one dumbbell ----------
  K.pcDbRow = { build(ctx) {
    const P = ctx.P, S = ctx.S;
    // The bench runs along the body under the left shin and the left hand.
    const knee = ctx.bounds((b) => b === "shinL"), hand = ctx.bounds((b) => b === "handL" || b === "forearmL");
    const top = ctx.lowest({ x1: knee.max.x }, (b) => b === "shinL") + 0.4;
    const x0 = knee.min.x + 6, x1 = Math.max(hand.max.x + 4, x0 + 100);
    const cz = Math.max(-18, Math.min(-12, (knee.min.z + knee.max.z) / 2));
    benchAt(ctx, (x0 + x1) / 2, cz, x1 - x0, top);
    const db = P.add(G.dumbbell(P, 7.6, 6.4));
    return { report: () => ({ top, handLow: ctx.lowest({}, (b) => b === "handL"), cz }),
      update(f) { db.position.copy(f.grip.R); db.quaternion.copy(f.handQ.R); } };
  } };

  // ---------- Single-arm cable row: tower in front, D-handle at mid height ----------
  K.pcCableRow1 = { build(ctx) {
    const P = ctx.P, S = ctx.S;
    let reach = -Infinity, y0 = 0;
    S.forEach((s) => { if (s.grip.R.x > reach) { reach = s.grip.R.x; y0 = s.grip.R.y; } });
    const toe = Math.max(S[0].J.toe.x, ctx.bounds((b) => b.startsWith("foot")).max.x);
    const t = lib.cableTower(ctx, { at: V(Math.max(reach + 44, toe + 30), 0, S[0].grip.R.z), face: V(-1, 0, 0), carriageY: y0 - 2, ratio: 0.5 });
    const d = lib.dHandleRig(ctx, "R");
    return lib.cableKit(ctx, [t], [(f, toward) => d(f, toward)]);
  } };

  // ---------- Russian twist: mat, weight plate held by its rim in both hands ----------
  K.pcPlateTwist = { ground: "body", build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, b = ctx.bounds();
    lib.mat(ctx, (b.min.x + b.max.x) / 2, Math.min(190, b.max.x - b.min.x + 40), 62);
    const half = Math.abs(ctx.S[0].grip.R.z), R = Math.max(11, half + 1.2);
    const plate = G.mesh(P.ironPlate(R, 2.8), M.iron); P.add(plate);
    return { update(f) {
      const c = mid(f.grip.R, f.grip.L), across = f.grip.R.clone().sub(f.grip.L).normalize();
      // The plate stands in the plane through both fists, facing out from the chest.
      const out = c.clone().sub(f.J.spine); out.sub(across.clone().multiplyScalar(out.dot(across)));
      const n = out.lengthSq() > 1e-6 ? out.normalize() : V(1, 0, 0);
      plate.position.copy(c);
      plate.quaternion.setFromUnitVectors(V(0, 1, 0), n);
    } };
  } };

  // ---------- Assisted pull-up machine ----------
  // The lifter faces the machine. High handles over the hands; the kneeling pad rides on a long
  // lever pivoting at the back of the base; a cable from the lever runs under a floor pulley and
  // over the top of the column to the weight stack, which rises as the pad goes down.
  K.pcAssistPullup = { ground: "hang", hang: 222, build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S;
    const g0 = mid(S[0].grip.R, S[0].grip.L), half = Math.abs(S[0].grip.R.z);
    // Kneeling pad: under the knees and shins, following them over the rep.
    const kneeOf = (s) => s.J.knee;
    let kLow = Infinity; S.forEach((s) => { kLow = Math.min(kLow, kneeOf(s).y); });
    // The pad's top follows the lowest point of the knees and shins (tracked on the skin).
    const k0 = S[0].J.knee;
    const shins = ctx.track((x, y, z, b) => (b.startsWith("shin") || b.startsWith("thigh")) && x > k0.x - 29 && x < k0.x + 5 && y < k0.y + 6);
    const lowNow = () => { const p = shins.now(); let m = Infinity; for (let i = 1; i < p.length; i += 3) m = Math.min(m, p[i]); return m; };
    const drop = kLow - ctx.lowest({ x0: k0.x - 29, x1: k0.x + 5 }, (b) => b.startsWith("shin")) + 0.3;
    const padLen = 34, padW = 40, padT = 7;
    const padAt = (s, live) => { const k = kneeOf(s); return V(k.x - 12, live ? lowNow() + 0.3 : k.y - drop, 0); };
    const pad = P.pad(padAt(S[0]), V(1, 0, 0), padLen, padW, padT);
    // Column in front of the face with the stack, uprights up to the handles.
    const cx = g0.x + 46, H = g0.y - fy + 14;
    [1, -1].forEach((s) => {
      const z = s * 20;
      P.beam(V(cx, fy + 9, z), V(cx, fy + H, z), 7.5, 7.5, V(0, 0, 1), { caps: [false, true] });
      P.beam(V(cx - 70, fy + 5.25, s * 30), V(cx + 34, fy + 5.25, s * 30), 7.5, 6, V(0, 1, 0));
      P.foot(cx - 67, s * 30, 7, 7); P.foot(cx + 31, s * 30, 7, 7);
    });
    P.beam(V(cx, fy + H - 3.75, -24), V(cx, fy + H - 3.75, 24), 7.5, 7.5, V(1, 0, 0), { caps: false });
    // Handle arms reaching back over the lifter, and the bar the hands hold.
    const hy = g0.y, hz = half + 13;
    [1, -1].forEach((s) => {
      P.beam(V(cx, fy + H - 10, s * 20), V(g0.x - 2, hy + 9, s * hz), 6, 6, V(0, 0, 1), { caps: [false, true] });
      P.beam(V(g0.x - 2, hy + 9, s * hz), V(g0.x, hy, s * hz), 4, 4, V(1, 0, 0), { caps: false });
    });
    P.rod(V(g0.x, hy, -hz), V(g0.x, hy, hz), 1.6, M.chrome);
    [1, -1].forEach((s) => P.rod(V(g0.x, hy, s * (half - 8)), V(g0.x, hy, s * (half + 9)), 2.0, M.foamGrip));
    // Neutral handles on the column (not used here, part of every machine).
    [1, -1].forEach((s) => P.rod(V(cx - 6, fy + H - 10, s * 20), V(cx - 26, fy + H - 10, s * 20), 1.8, M.grip));
    // Weight stack between the column's uprights, in front.
    const st = P.stack(14, { rodH: H - 30, w: 24, d: 11 }); st.g.position.set(cx + 18, fy + 9, 0);
    P.beam(V(cx + 18, fy + H - 18, -14), V(cx + 18, fy + H - 18, 14), 5, 5, V(1, 0, 0), { caps: false });
    [1, -1].forEach((s) => P.beam(V(cx + 18, fy + 9, s * 14), V(cx + 18, fy + H - 18, s * 14), 4, 4, V(0, 0, 1), { caps: false }));
    // Base rail from the column back to the lever pivot behind the knees.
    let kx = Infinity; S.forEach((s) => { kx = Math.min(kx, padAt(s).x); });
    const pivot = V(kx - 64, fy + 20, 0);
    P.beam(V(pivot.x - 6, fy + 5.25, 0), V(cx, fy + 5.25, 0), 7.5, 7.5, V(0, 1, 0));
    P.stabilizer(V(pivot.x, fy, 0), V(0, 0, 1), 56);
    P.beam(V(pivot.x, fy + 9, 0), V(pivot.x, pivot.y, 0), 6, 6, V(0, 0, 1), { caps: false });
    P.rod(V(pivot.x, pivot.y, -7), V(pivot.x, pivot.y, 7), 2.4, M.graphite);
    // Lever: from the pivot forward to under the pad's centre.
    const lever = new THREE.Group(); P.add(lever);
    const reach = (s) => padAt(s).clone().add(V(padLen / 2, -padT - 4, 0));
    const L = pivot.distanceTo(reach(S[0]));
    [1, -1].forEach((s) => P.beam(V(0, 0, s * 5.5), V(L, 0, s * 5.5), 6, 3, V(0, 0, 1), { parent: lever }));
    P.box(10, 8, 16, M.graphite, V(L - 2, 2, 0), lever);
    // Post from the lever's tip up to the pad (keeps the pad level as the lever swings).
    const post = G.mesh(new THREE.BoxGeometry(5, 1, 5).translate(0, 0.5, 0), M.steel); P.add(post);
    // Cable from the lever tip up to a pulley on the column's front, over the top and down to
    // the stack: as the pad goes down the cable is drawn out and the stack rises.
    const run = G.CableRun(P, M.cable, 0.36), pr = 4.6;
    const mount = (p, y, x) => { p.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, V(0, 0, 1))); return p; };
    const pm = mount(P.pulley(pr), V(-1, 0, 0), V(0, 1, 0)); pm.g.position.set(cx - 3.75 - pr - 1.5, fy + 118, 0);
    const pf = mount(P.pulley(pr), V(0, -1, 0), V(-1, 0, 0)); pf.g.position.set(cx - 3.75 - pr - 1.5, fy + H - 12, 0);
    const ps = mount(P.pulley(pr), V(0, -1, 0), V(-1, 0, 0)); ps.g.position.set(cx + 18, fy + H - 25, 0);
    P.box(8, 2, 6, M.graphite, V(cx - 7, fy + H - 12 + pr + 2, 0));
    const pulleys = [ps, pf, pm].map((p) => ({ C: p.g.position.clone(), n: V(0, 0, 1), r: pr, pulley: p }));
    const tipOf = (s) => pivot.clone().add(reach(s).sub(pivot).normalize().multiplyScalar(L + 4));
    let dMin = Infinity; S.forEach((s) => { dMin = Math.min(dMin, tipOf(s).distanceTo(pulleys[2].C)); });
    const update = (f, live) => {
      const top = padAt(f, live), r = reach(f);
      pad.position.copy(top).add(V(0, -padT, 0));
      swingTo(lever, pivot, r);
      post.position.copy(r); post.scale.set(1, Math.max(0.5, top.y - padT - r.y), 1);
      // The pad lower -> the tip farther from the column pulley -> the stack rises by as much.
      st.moving.position.y = Math.max(0, Math.min(st.travel, tipOf(f).distanceTo(pulleys[2].C) - dMin));
      run.update(st.g.localToWorld(st.attach.clone().add(st.moving.position)), pulleys, tipOf(f));
    };
    S.forEach((s) => update(s));
    return { update: (f) => update(f, true) };
  } };
})();

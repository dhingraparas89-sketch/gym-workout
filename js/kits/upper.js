// Equipment kits for the upper exercises. Shared parts: GYM3D.kits.lib, GYM3D.Parts (see js/gym3d.js).
// Every kit is built around the body (ctx, see figure3d.js) and returns { update(f) }.
(() => {
  const K = GYM3D.kits.K, L = GYM3D.kits.lib, G = GYM3D, V = L.V, mid = L.mid;
  const T = () => window.THREE;
  const isTrunk = (b) => /Torso|neck|head|pelvis/.test(b);

  // Utility bench with a seat and a back pad of length `len` along the spine (shorter than the
  // stock adjustable bench's, so a dumbbell can travel behind the head). Same build as lib.adjBench.
  function upBench(ctx, len) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, J = ctx.S[0].J;
    const hip = J.pelvis, sh = J.spine.clone().lerp(J.neck, 1.2);
    const d = sh.clone().sub(hip).setZ(0).normalize(), n = V(d.y, -d.x, 0);
    const sx0 = hip.x - 12, sx1 = hip.x + 26, sw = 32;
    const seatTop = ctx.lowest({ x0: sx0 + 2, x1: sx1 - 4, z0: -12, z1: 12 }) + 0.4;
    P.pad(V((sx0 + sx1) / 2, seatTop, 0), V(1, 0, 0), sx1 - sx0, sw, 8.5);
    const start = hip.clone().addScaledVector(d, 6), cen = start.clone().addScaledVector(d, len / 2);
    const probe = cen.clone().addScaledVector(n, -40), gap = ctx.gap(probe, n, d, len - 10, 22, isTrunk);
    const face = probe.clone().addScaledVector(n, (isFinite(gap) ? gap : 30) - 0.4);
    P.pad(face, d, len, 28, 8.5, n);
    const back0 = face.clone().addScaledVector(n, -9).addScaledVector(d, -len / 2);
    const rx0 = Math.min(back0.x, face.x + d.x * len / 2 - n.x * 9) - 12, rx1 = sx1 + 14, ry = fy + 1.5 + 3.75;
    P.beam(V(rx0, ry, 0), V(rx1, ry, 0), 7.5, 7.5, V(0, 1, 0));
    P.stabilizer(V(rx1 - 4, fy + 7.5, 0), V(0, 0, 1), 54, 6, 6);
    P.stabilizer(V(rx0 + 4, fy + 7.5, 0), V(0, 0, 1), 50, 6, 6);
    [-1, 1].forEach((s) => { const wh = G.mesh(new THREE.CylinderGeometry(4.2, 4.2, 3, 22).rotateX(Math.PI / 2), M.rubber); wh.position.set(rx0 - 1, fy + 4.6, s * 28); P.add(wh); });
    P.rod(V(rx0, ry + 4, 0), V(rx0 - 16, ry + 13, 0), 1.6, M.steel); P.rod(V(rx0 - 16, ry + 13, -10), V(rx0 - 16, ry + 13, 10), 1.6, M.grip);
    const seatUnder = seatTop - 8.5;
    P.beam(V(hip.x + 6, ry + 3.75, 0), V(hip.x + 6, seatUnder - 1, 0), 7.5, 6, V(0, 0, 1), { caps: false });
    P.box(sx1 - sx0 - 8, 4, 6, M.steel, V((sx0 + sx1) / 2, seatUnder - 2, 0));
    const hinge = back0.clone(); hinge.z = 0;
    P.rod(V(hinge.x, hinge.y, -9), V(hinge.x, hinge.y, 9), 2.2, M.graphite);
    P.beam(V(hinge.x, hinge.y, 0), V(sx0 + 6, seatUnder - 2, 0), 5, 5, V(0, 0, 1), { caps: false });
    const under = (s) => face.clone().addScaledVector(n, -9.5).addScaledVector(d, s);
    P.beam(under(-len / 2 + 4), under(len / 2 - 6), 5, 5, V(0, 0, 1));
    const sTop = under(len * 0.12), foot = V(sTop.x - Math.max(10, (sTop.y - ry) * 0.25), ry + 3.75, 0);
    P.beam(foot, sTop, 4.5, 4.5, V(0, 0, 1), { caps: false });
    P.rod(V(sTop.x, sTop.y, -4), V(sTop.x, sTop.y, 4), 1, M.chrome);
    for (let i = 0; i < 7; i++) P.box(1.4, 2.2, 6.6, M.graphite, V(foot.x - 18 + i * 6, ry + 4.8, 0));
    return { seatTop };
  }

  // Flat bench at z offset `cz` (pad length along x from x0 to x1), its top at `top`.
  function upFlatBenchAt(ctx, x0, x1, cz, top) {
    const P = ctx.P, fy = P.floorY, w = 29, thick = 9.5;
    P.pad(V((x0 + x1) / 2, top, cz), V(1, 0, 0), x1 - x0, w, thick);
    const by = top - thick - 4.4;
    P.beam(V(x0 + 9, by, cz), V(x1 - 9, by, cz), 7.5, 5, V(0, 0, 1));
    [x0 + 14, (x0 + x1) / 2, x1 - 14].forEach((x) => {
      P.box(14, 0.6, 18, P.M.graphite, V(x, top - thick - 0.3, cz));
      [-1, 1].forEach((s) => P.bolt(V(x + s * 4.5, top - thick - 0.6, cz + s * 6), V(0, -1, 0), 0.55));
    });
    [x1 - 15, x0 + 15].forEach((x, i) => {
      const sy = fy + 1.5 + 7.5;
      P.beam(V(x, sy, cz), V(x, by - 3.75, cz), 7.5, 7.5, V(0, 0, 1), { caps: false });
      P.stabilizer(V(x, fy, cz), V(0, 0, 1), i ? 56 : 52);
      const dir = i ? 1 : -1;
      P.beam(V(x, by - 18, cz), V(x + dir * 13, by - 3.75, cz), 4, 4, V(0, 0, 1), { caps: false });
      [-1, 1].forEach((s) => { P.bolt(V(x, by, cz + s * 2.55), V(0, 0, s), 0.7); P.bolt(V(x, sy + 4, cz + s * 3.8), V(0, 0, s), 0.7); });
    });
  }

  // One dumbbell in one hand (the other hand is free or braced).
  function oneDumbbell(ctx, side, r, w) {
    const P = ctx.P, db = P.add(G.dumbbell(P, r, w));
    return (f) => { db.position.copy(f.grip[side]); db.quaternion.copy(f.handQ[side]); };
  }

  // Lowest / highest grip over the rep.
  function gripRange(S) {
    let top = mid(S[0].grip.R, S[0].grip.L), low = top;
    S.forEach((s) => { const m = mid(s.grip.R, s.grip.L); if (m.y < low.y) low = m; if (m.y > top.y) top = m; });
    return { top, low };
  }

  // ----- Chest -----
  // Incline barbell bench: an adjustable bench set to about 45°, uprights with J-hooks behind it.
  K.upInclineBB = { build(ctx) {
    L.adjBench(ctx);
    const top = mid(ctx.S[0].grip.R, ctx.S[0].grip.L), low = gripRange(ctx.S).low;
    L.benchRack(ctx, top, low);
    return { update: L.barbell(ctx, [[22.5, 4.6], [22.5, 4.6]], "iron") };
  } };

  // Decline bench: a back pad sloping down to the head, a leg hold at the high end (one pair of
  // foam rollers over the thighs above the knees, one in front of the ankles), and a bench rack.
  K.upDecline = {
    ground(ctx) { return ctx.lowest({}, isTrunk) - 40; },
    build(ctx) {
      const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J;
      const hip = J.pelvis, sh = J.spine.clone().lerp(J.neck, 1.2);
      const d = sh.clone().sub(hip).setZ(0).normalize(), n = V(d.y, -d.x, 0); // n: out of the pad, up
      const len = 104, start = hip.clone().addScaledVector(d, -12), cen = start.clone().addScaledVector(d, len / 2);
      const probe = cen.clone().addScaledVector(n, -40), gap = ctx.gap(probe, n, d, len - 10, 22, isTrunk);
      const face = probe.clone().addScaledVector(n, (isFinite(gap) ? gap : 30) - 0.4);
      P.pad(face, d, len, 29, 9, n);
      const under = (s) => face.clone().addScaledVector(n, -10).addScaledVector(d, s);
      P.beam(under(-len / 2 + 6), under(len / 2 - 6), 7.5, 5, V(0, 0, 1));
      // Legs: one at the head end, one under the hips; a floor rail joins them to the leg-hold post.
      const ry = fy + 1.5 + 3.75;
      const headLeg = under(len / 2 - 14), hipLeg = under(-len / 2 + 14);
      // Leg hold: rollers in front of the ankles and over the thighs near the knees.
      const shins = ctx.bounds((b) => b.startsWith("shin"));
      const ankleR = V(shins.max.x + 4.6, J.ankle.y + 3, 0);
      const kneeTop = ctx.highest({ x0: J.knee.x - 12, x1: J.knee.x - 6 }, (b) => b.startsWith("thigh"));
      const thighR = V(J.knee.x - 9, (isFinite(kneeTop) ? kneeTop : J.knee.y + 8) + 4.6, 0);
      const postX = ankleR.x + 9;
      const rx0 = headLeg.x - 6, rx1 = postX + 12;
      P.beam(V(rx0, ry, 0), V(rx1, ry, 0), 7.5, 7.5, V(0, 1, 0));
      P.stabilizer(V(rx0 + 4, fy + 7.5, 0), V(0, 0, 1), 52, 6, 6);
      P.stabilizer(V(rx1 - 4, fy + 7.5, 0), V(0, 0, 1), 56, 6, 6);
      [headLeg, hipLeg].forEach((p) => {
        P.beam(V(p.x, ry + 3.75, 0), V(p.x, p.y - 3.75, 0), 7.5, 6, V(0, 0, 1), { caps: false });
        [-1, 1].forEach((s) => P.bolt(V(p.x, p.y - 8, s * 3.05), V(0, 0, s), 0.7));
      });
      // Post up from the rail to above the thighs, with an arm back over them.
      const postTop = thighR.y + 2;
      P.beam(V(postX, ry + 3.75, 0), V(postX, postTop, 0), 6.5, 6.5, V(0, 0, 1), { caps: [false, true] });
      P.holes(V(postX - 3.27, ry + 12, 0), V(0, 1, 0), Math.max(1, Math.floor((postTop - ry - 20) / 5)), 5, V(-1, 0, 0), 0.8);
      P.beam(V(postX - 3.25, thighR.y, 0), V(thighR.x, thighR.y, 0), 5, 5, V(0, 1, 0), { caps: [false, true] });
      P.beam(V(postX - 3.25, ankleR.y, 0), V(ankleR.x, ankleR.y, 0), 5, 5, V(0, 1, 0), { caps: false });
      // Brace from the hip leg up to the post.
      P.beam(V(hipLeg.x, hipLeg.y - 6, 0), V(postX - 3.25, Math.min(postTop - 6, hipLeg.y + 4), 0), 5, 5, V(0, 0, 1), { caps: false });
      [ankleR, thighR].forEach((c) => {
        P.rod(V(c.x, c.y, -17), V(c.x, c.y, 17), 1.1, M.chrome);
        [-1, 1].forEach((s) => {
          P.rod(V(c.x, c.y, s * 3.2), V(c.x, c.y, s * 16), 4.6, M.upholstery);
          P.rod(V(c.x, c.y, s * 16), V(c.x, c.y, s * 17.2), 1.6, M.plastic);
        });
      });
      void THREE;
      const { top, low } = gripRange(S);
      L.benchRack(ctx, mid(S[0].grip.R, S[0].grip.L), low);
      void top;
      return { update: L.barbell(ctx, [[22.5, 4.6], [22.5, 4.6]], "iron") };
    }
  };

  // Flat bench with a pair of dumbbells (dumbbell bench press, fly).
  K.upFlatDB = { build(ctx) {
    const head = ctx.S[0].J.head, hip = ctx.S[0].J.pelvis, r = ctx.fig.db || [8.4, 7];
    L.flatBench(ctx, Math.min(head.x - 34, hip.x - 116), hip.x + 16);
    return { update: L.dumbbells(ctx, r[0], r[1]) };
  } };

  // ----- Arms -----
  // Seated overhead triceps extension: a short-backed upright bench and one dumbbell held
  // vertically in both hands, the palms under its top head.
  K.upOverheadDB = { build(ctx) {
    upBench(ctx, 50);
    const P = ctx.P, db = P.add(G.dumbbell(P, 7.4, 6.2));
    const q = new (T().Quaternion)().setFromUnitVectors(V(0, 0, 1), V(0, 1, 0));
    return { update(f) {
      const m = mid(f.grip.R, f.grip.L);
      // Hands cup the underside of the top head; the handle hangs straight down between them.
      db.position.copy(m).add(V(0, -3.2, 0)); db.quaternion.copy(q);
    } };
  } };

  // One-arm kickback: the left knee and left hand braced on a flat bench to the lifter's left,
  // the right foot on the floor, one dumbbell in the right hand.
  K.upKickback = { build(ctx) {
    const S = ctx.S, J = S[0].J;
    const left = (b) => b === "shinL" || b === "thighL" || b === "handL";
    const box = ctx.bounds(left);
    // The pad carries the left shin; the bench ends at the ankle so the foot hangs off it.
    const shin = ctx.bounds((b) => b === "shinL");
    const top = ctx.lowest({}, (b) => b === "shinL" || b === "thighL") + 0.4;
    const cz = Math.max(-16, (box.max.z + box.min.z) / 2);
    upFlatBenchAt(ctx, shin.min.x + 3, Math.max(box.max.x, J.shoulder.x + 20) + 10, cz, top);
    return { update: oneDumbbell(ctx, "R", 6.6, 5.6) };
  } };

  // Incline dumbbell curl: the adjustable bench at about 45° and a pair of light dumbbells.
  K.upInclineCurl = { build(ctx) { L.adjBench(ctx); return { update: L.dumbbells(ctx, 6.6, 5.6) }; } };

  // Straight curl bar on a cable: a short knurled bar through both fists with a swivel eye.
  function curlBarRig(ctx) {
    const P = ctx.P, M = P.M, THREE = T(), g = new THREE.Group(); P.add(g);
    const half = Math.abs(ctx.S[0].grip.R.z) + 10;
    const b = P.rod(V(0, 0, -half), V(0, 0, half), 1.45, M.knurl, g); G.worldUV(b.geometry = b.geometry.clone(), 9, 2 * half, 0.9);
    [1, -1].forEach((s) => P.rod(V(0, 0, s * half), V(0, 0, s * (half + 1.2)), 1.9, M.plastic, g));
    P.rod(V(0, 0, -3), V(0, 0, 3), 2.4, M.chrome, g);
    P.rod(V(0, 0, 0), V(0, 5, 0), 0.8, M.chrome, g);
    const eye = G.mesh(new THREE.TorusGeometry(1.1, 0.32, 8, 18), M.zinc); eye.position.y = 6; g.add(eye);
    const c = P.add(G.carabiner(P));
    return (f, toward) => {
      const m0 = mid(f.grip.R, f.grip.L), z = f.grip.R.clone().sub(f.grip.L).normalize();
      const y = toward.clone().sub(m0); y.sub(z.clone().multiplyScalar(y.dot(z))).normalize();
      g.position.copy(m0); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(y, z), y, z));
      const eyeAt = m0.clone().addScaledVector(y, 6.5), dir = toward.clone().sub(eyeAt).normalize();
      G.between(c, eyeAt, eyeAt.clone().add(dir));
      return eyeAt.clone().addScaledVector(dir, 6.6);
    };
  }
  // Cable curl: one column in front of the lifter, pulley at the bottom, straight bar.
  K.upCableCurl = { ground: "feet", build(ctx) {
    const S = ctx.S, P = ctx.P, g0 = mid(S[0].grip.R, S[0].grip.L), toe = S[0].J.toe;
    const t = L.cableTower(ctx, { at: V(Math.max(g0.x + 44, toe.x + 42), 0, 0), face: V(-1, 0, 0), carriageY: P.floorY + 16, ratio: 0.5 });
    return L.cableKit(ctx, [t], [curlBarRig(ctx)]);
  } };

  // Preacher curl bench: a seat, and an arm pad sloping down and away from the chest that the
  // backs of the upper arms rest on; an EZ bar in the hands.
  K.upPreacher = { build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J;
    const hip = J.pelvis;
    // Seat under the glutes.
    const sx0 = hip.x - 16, sx1 = hip.x + 16;
    const seatTop = ctx.lowest({ x0: sx0 + 2, x1: sx1 - 2, z0: -12, z1: 12 }) + 0.4;
    P.pad(V(hip.x, seatTop, 0), V(1, 0, 0), sx1 - sx0, 30, 8);
    // Arm pad: along the upper arm (shoulder -> elbow at the start), under its back.
    const sh = J.shoulder, el = J.elbow;
    const d = el.clone().sub(sh).setZ(0).normalize(); // down the pad, away from the chest
    const n = V(-d.y, d.x, 0); if (n.y < 0) n.negate();   // the pad's face: up and toward the lifter
    const arms = (b) => b.startsWith("upperArm");
    const plen = 40, cen = sh.clone().addScaledVector(d, 19); cen.z = 0;
    const probe = cen.clone().addScaledVector(n, -40), gap = ctx.gap(probe, n, d, plen - 6, 54, arms);
    const face = probe.clone().addScaledVector(n, (isFinite(gap) ? gap : 30) - 0.3);
    P.pad(face, d, plen, 56, 7, n);
    // Pad support: a plate under the pad, a post down to the floor frame.
    const under = face.clone().addScaledVector(n, -7.6);
    P.box(plen - 10, 0.8, 30, M.graphite, under, null, new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), d));
    const postX = under.x + 4, ry = fy + 1.5 + 3.75;
    P.beam(V(postX, ry + 3.75, 0), V(postX, under.y - 0.5, 0), 7.5, 7.5, V(0, 0, 1), { caps: false });
    P.holes(V(postX - 3.77, ry + 14, 0), V(0, 1, 0), Math.max(1, Math.floor((under.y - ry - 26) / 5)), 5, V(-1, 0, 0), 0.8);
    // Bar catch (two hooks) at the far bottom edge of the pad.
    const lip = face.clone().addScaledVector(d, plen / 2 - 1);
    [-1, 1].forEach((s) => {
      P.beam(lip.clone().setZ(s * 22).addScaledVector(n, -7), lip.clone().setZ(s * 22).addScaledVector(n, 3), 2.5, 2.5, V(0, 0, 1), { caps: [false, true] });
    });
    // Seat post, floor rail and stabilizers.
    P.beam(V(hip.x, ry + 3.75, 0), V(hip.x, seatTop - 8.5, 0), 7.5, 6, V(0, 0, 1), { caps: false });
    P.box(sx1 - sx0 - 8, 4, 6, M.steel, V(hip.x, seatTop - 10.5, 0));
    const rx0 = hip.x - 26, rx1 = postX + 22;
    P.beam(V(rx0, ry, 0), V(rx1, ry, 0), 7.5, 7.5, V(0, 1, 0));
    P.stabilizer(V(rx0 + 4, fy + 7.5, 0), V(0, 0, 1), 54, 6, 6);
    P.stabilizer(V(rx1 - 4, fy + 7.5, 0), V(0, 0, 1), 60, 6, 6);
    // Brace from the seat post to the pad post.
    P.beam(V(hip.x + 3.75, ry + 12, 0), V(postX - 3.75, ry + 30, 0), 4.5, 4.5, V(0, 0, 1), { caps: false });
    return { update: L.barbell(ctx, [[12.6, 2.6]], "iron", true) };
  } };

  // ----- Shoulders -----
  // Cable lateral raise: one column to the lifter's left, its carriage at the bottom, a D-handle
  // in the right hand; the cable runs across in front of the body.
  K.upCableLateral = { ground: "feet", build(ctx) {
    const S = ctx.S, P = ctx.P, J = S[0].J;
    const t = L.cableTower(ctx, { at: V(J.ankle.x + 2, 0, -46), face: V(0, 0, 1), carriageY: P.floorY + 14, ratio: 0.5 });
    return L.cableKit(ctx, [t], [L.dHandleRig(ctx, "R")]);
  } };
})();

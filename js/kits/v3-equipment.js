// Equipment kits for the v3 exercises (data/library/v3-*.js): kettlebell, plyo box, sled,
// battle ropes, pec deck, 45° back extension, inverted-row rack, assisted dip machine, a bench
// for the hands, padded wall, support post, seated leg curl, Nordic bench, calf step, single
// dumbbell, chest-supported row bench, straight pushdown bar and seated wrist curl.
// Shared parts: GYM3D.kits.lib and GYM3D.Parts (js/gym3d.js). Units are cm; the lifter faces +x.
(() => {
  const G = GYM3D, K = G.kits.K, L = G.kits.lib, V = L.V, mid = L.mid;
  const T = () => window.THREE;
  const isFoot = (b) => b.startsWith("foot");
  const isHand = (b) => b.startsWith("hand");
  // Lowest / highest skin point of some body parts at one sample of the rep.
  function extremeAt(ctx, i, only, hi) {
    const tr = ctx.track((x, y, z, b) => only(b)), list = tr.at(i), p = ctx.S[i].pts;
    let m = hi ? -Infinity : Infinity;
    if (list) for (const v of list) { const y = p[3 * v + 1]; m = hi ? Math.max(m, y) : Math.min(m, y); }
    return m;
  }
  function boundsAt(ctx, i, only) {
    const tr = ctx.track((x, y, z, b) => only(b)), list = tr.at(i), p = ctx.S[i].pts, b = new (T().Box3)();
    if (list) for (const v of list) b.expandByPoint(V(p[3 * v], p[3 * v + 1], p[3 * v + 2]));
    return b;
  }
  // A rod mesh that can be moved every frame from a to b (radius r).
  function liveRod(P, r, mat) {
    const m = G.mesh(new (T().CylinderGeometry)(1, 1, 1, 14).translate(0, 0.5, 0), mat); P.add(m);
    return (a, b) => { const len = G.between(m, a, b); m.scale.set(r, Math.max(0.01, len), r); return m; };
  }

  // ---------- Kettlebell: cast-iron bell under a round handle (handle along local z, bell toward -y) ----------
  function kettlebell(P, R = 10.5) {
    const THREE = T(), M = P.M, g = new THREE.Group(), cy = -(R + 6.4);
    const bell = G.mesh(new THREE.SphereGeometry(R, 40, 28), M.iron); bell.position.y = cy; bell.scale.set(1, 0.94, 1); g.add(bell);
    const base = G.mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.62, 1.2, 32), M.iron); base.position.y = cy - R * 0.94 + 0.6; g.add(base);
    // Handle: horns rising from the shoulders of the bell, bridged by the grip.
    const pts = [V(0, cy + R * 0.62, -R * 0.62), V(0, -4.2, -8.4), V(0, -0.6, -7.2), V(0, 0, -4.5), V(0, 0, 0), V(0, 0, 4.5), V(0, -0.6, 7.2), V(0, -4.2, 8.4), V(0, cy + R * 0.62, R * 0.62)];
    const h = G.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 1.65, 12, false), M.iron); g.add(h);
    return g;
  }
  // fig.kb: "both" (one bell, both hands on the handle, the bell continuing the line of the arms)
  // or "each" (a bell hanging from each hand). fig.kbR: bell radius.
  K.v3Kettlebell = { build(ctx) {
    const THREE = T(), P = ctx.P, mode = ctx.fig.kb || "both", R = ctx.fig.kbR || 10.5;
    const bells = (mode === "both" ? ["B"] : ["R", "L"]).map(() => P.add(kettlebell(P, R)));
    const basis = (y, z) => { z = z.clone().sub(y.clone().multiplyScalar(z.dot(y))).normalize(); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(y, z), y, z)); };
    return { update(f) {
      if (mode === "both") {
        const m = mid(f.grip.R, f.grip.L), z = f.grip.R.clone().sub(f.grip.L).normalize();
        const y = f.J.elbow.clone().sub(f.J.hand).normalize();
        bells[0].position.copy(m); bells[0].quaternion.copy(basis(y, z));
      } else ["R", "L"].forEach((s, i) => { bells[i].position.copy(f.grip[s]); bells[i].quaternion.copy(basis(V(0, 1, 0), f.axis[s])); });
    } };
  } };

  // ---------- Plyo box: a steel box with a rubber top where the feet land at the end of the rep ----------
  function plyoBox(P, x0, x1, top, w = 66) {
    const M = P.M, fy = P.floorY, h = top - fy, cx = (x0 + x1) / 2;
    P.box(x1 - x0, h - 1.4, w, M.graphite, V(cx, fy + (h - 1.4) / 2, 0));
    const lid = G.mesh(G.padGeo(x1 - x0 + 0.6, 1.4, w + 0.6), M.rubber); lid.position.set(cx, top - 1.4, 0); P.add(lid);
    [-1, 1].forEach((s) => P.box(x1 - x0 - 10, h * 0.5, 0.5, M.steel, V(cx, fy + h * 0.45, s * (w / 2 + 0.26))));
    [x0 + 4, x1 - 4].forEach((x) => [-1, 1].forEach((s) => P.foot(x, s * (w / 2 - 4), 5, 5)));
  }
  K.v3PlyoBox = { build(ctx) {
    const last = ctx.S.length - 1, fb = boundsAt(ctx, last, isFoot);
    const top = fb.min.y - 0.2;
    plyoBox(ctx.P, fb.min.x - 10, fb.max.x + 16, top);
    return { update() {} };
  } };

  // ---------- Sled: two skids, a deck, a plate post, push poles (push) or straps (pull) ----------
  K.v3Sled = { build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, o = ctx.fig.sled || {};
    const g0 = S[0].grip, gm = mid(g0.R, g0.L), pull = o.mode === "pull";
    // Push: poles at the hands, the sled ahead of them. Pull: the sled in front of the lifter.
    const x0 = pull ? Math.max(S[0].J.toe.x, gm.x) + 120 : gm.x - 6, len = 104, x1 = x0 + len;
    [-1, 1].forEach((s) => {
      const z = s * 30;
      // Skid: a flat runner with an upturned front.
      P.beam(V(x0, fy + 2.2, z), V(x1 - 14, fy + 2.2, z), 4.4, 7, V(0, 1, 0), { caps: [true, false] });
      P.beam(V(x1 - 15, fy + 2.2, z), V(x1, fy + 10, z), 4.4, 7, V(0, 1, 0));
    });
    P.box(len - 26, 1.6, 66, M.steel, V(x0 + (len - 26) / 2 + 4, fy + 5.2, 0));
    [x0 + 10, x1 - 22].forEach((x) => P.beam(V(x, fy + 7, -34), V(x, fy + 7, 34), 5, 5, V(1, 0, 0), { caps: false }));
    // Plate post with plates.
    const pc = V(x0 + len * 0.5, fy, 0);
    P.rod(V(pc.x, fy + 6, 0), V(pc.x, fy + 48, 0), 2.5, M.chrome);
    [0, 1, 2].forEach((i) => { const pl = G.mesh(P.bumperPlate(22.5, 6.6), M.bumper); pl.position.set(pc.x, fy + 9.6 + i * 6.8, 0); P.add(pl); });
    shadows(P, (x0 + x1) / 2, 0, len + 10, 70);
    if (!pull) {
      // Two upright push poles where the hands hold them, braced to the deck.
      ["R", "L"].forEach((s) => {
        const h = g0[s];
        P.rod(V(h.x, fy + 6, h.z), V(h.x, h.y + 12, h.z), 2.1, M.steel);
        P.rod(V(h.x, h.y - 9, h.z), V(h.x, h.y + 9, h.z), 2.5, M.grip);
        P.rod(V(h.x, h.y + 12, h.z), V(h.x, h.y + 13.2, h.z), 2.3, M.plastic);
        P.beam(V(h.x, fy + 30, h.z), V(h.x + 34, fy + 7, h.z), 3.5, 3.5, V(0, 0, 1), { caps: false });
      });
      return { update() {} };
    }
    // Pull: a strap from each D-handle to a ring on the front of the sled.
    const ring = V(x0 + 2, fy + 12, 0);
    P.box(4, 8, 20, M.graphite, V(x0 + 3, fy + 9, 0));
    const handles = ["R", "L"].map(() => P.add(G.dHandle(P, 10)));
    const straps = ["R", "L"].map(() => liveRod(P, 1.1, M.rope));
    return { update(f) {
      ["R", "L"].forEach((s, i) => {
        const Gp = f.grip[s], z = f.axis[s].clone().normalize(), y = ring.clone().sub(Gp); y.sub(z.clone().multiplyScalar(y.dot(z))).normalize();
        handles[i].position.copy(Gp); handles[i].quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(y, z), y, z));
        straps[i](Gp.clone().addScaledVector(y, 11.2), ring);
      });
    } };
  } };
  function shadows(P, x, z, w, d) { P.shadows.push({ x, z, w, d, o: 0.45 }); }

  // ---------- Battle ropes: two rope ends in the hands, running to an anchor post ahead, waving ----------
  K.v3BattleRope = { build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, r = 1.9;
    const gm = mid(S[0].grip.R, S[0].grip.L), anchor = V(gm.x + 330, fy + 12, 0);
    // Anchor: a short steel post on a floor plate with the rope looped round it.
    P.box(30, 1.6, 30, M.steel, V(anchor.x, fy + 0.8, 0));
    P.beam(V(anchor.x, fy + 1.6, 0), V(anchor.x, fy + 40, 0), 9, 9, V(0, 0, 1), { caps: [false, true] });
    const loop = G.mesh(new THREE.TorusGeometry(6.4, r, 10, 28), M.rope); loop.position.set(anchor.x, anchor.y, 0); loop.rotation.x = Math.PI / 2; P.add(loop);
    const ropes = [null, null];
    const now = () => (typeof performance !== "undefined" ? performance.now() : 0) / 1000;
    const update = (f) => {
      const time = now();
      ["R", "L"].forEach((s, i) => {
        const h = f.grip[s], end = V(anchor.x - 4, anchor.y, (i ? -1 : 1) * 5), D = end.x - h.x, pts = [];
        const phase = time * 2 * Math.PI * 1.6 + (i ? Math.PI : 0);
        for (let k = 0; k <= 48; k++) {
          const u = k / 48, sx = D * u, x = h.x + sx;
          // Base line: from the fist down to the floor within ~70 cm, then along the floor.
          const rise = Math.exp(-sx / 26);
          let y = fy + r + (h.y - fy - r) * rise;
          // Travelling wave from the hands, fading toward the anchor.
          y += 13 * Math.min(1, sx / 30) * Math.exp(-sx / 170) * Math.sin(sx / 34 - phase);
          y = Math.max(y, fy + r);
          const z = h.z + (end.z - h.z) * Math.pow(u, 0.7);
          pts.push(V(x, k === 48 ? end.y : y, z));
        }
        pts[0] = h.clone().add(V(-6, 0, 0));
        const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, r, 10, false);
        if (!ropes[i]) { ropes[i] = G.mesh(geo, M.rope); P.add(ropes[i]); }
        else { ropes[i].geometry.dispose(); ropes[i].geometry = geo; }
      });
    };
    S.forEach((s) => update({ grip: s.grip }));
    return { update };
  } };

  // ---------- Pec deck / reverse pec deck: seat, back (or chest) pad, two arms swinging about
  // vertical pivots above the shoulders, vertical handles in the fists ----------
  K.v3PecDeck = { build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J, rev = !!(ctx.fig.deck || {}).reverse;
    const hip = J.pelvis, sh = J.neck;
    // Seat under the glutes and thighs.
    const sx0 = hip.x - 14, sx1 = hip.x + 24;
    const seatTop = ctx.lowest({ x0: sx0 + 2, x1: sx1 - 4, z0: -12, z1: 12 }, (b) => /lowerTorso|thigh/.test(b)) + 0.4;
    P.pad(V((sx0 + sx1) / 2, seatTop, 0), V(1, 0, 0), sx1 - sx0, 36, 9);
    P.beam(V(hip.x + 4, fy + 9, 0), V(hip.x + 4, seatTop - 9, 0), 7.5, 6, V(0, 0, 1), { caps: false });
    // Back pad behind the back, or chest pad in front of the chest (reverse).
    const d = sh.clone().sub(hip).setZ(0).normalize(), len = 62;
    const nOut = rev ? V(-d.y, d.x, 0) : V(d.y, -d.x, 0); // pad face normal, toward the body
    const cen = hip.clone().addScaledVector(d, (rev ? 16 : 10) + len / 2); cen.z = 0;
    const probe = cen.clone().addScaledVector(nOut, -40), gap = ctx.gap(probe, nOut, d, len - 8, 22, (b) => /Torso/.test(b));
    const face = probe.clone().addScaledVector(nOut, (isFinite(gap) ? gap : 30) - 0.4);
    P.pad(face, d, len, 32, 9, nOut);
    const padBack = face.clone().addScaledVector(nOut, -9);
    // Column behind the pad with the stack, up to a head beam carrying the two pivots.
    const colX = rev ? Math.max(padBack.x + 10, J.toe.x + 8) : Math.min(padBack.x - 10, hip.x - 30);
    let shY = -Infinity; S.forEach((s) => { shY = Math.max(shY, s.J.shoulder.y); });
    const pivY = shY + 34, half = Math.abs(J.shoulder.z) + 2;
    const pivX = J.shoulder.x + (rev ? 6 : -4);
    const H = pivY - fy + 10;
    P.beam(V(colX, fy + 9, 0), V(colX, fy + H, 0), 9, 9, V(0, 0, 1), { caps: [false, true] });
    P.beam(V(colX - 40, fy + 5.25, 0), V(Math.max(colX, sx1) + 30, fy + 5.25, 0), 7.5, 7.5, V(0, 1, 0));
    P.stabilizer(V(colX - 34, fy, 0), V(0, 0, 1), 60);
    P.stabilizer(V(Math.max(colX, sx1) + 24, fy, 0), V(0, 0, 1), 56);
    P.beam(V(colX, fy + H - 4, 0), V(pivX, pivY + 6, 0), 7.5, 7.5, V(0, 0, 1), { caps: false });
    P.beam(V(pivX, pivY + 6, -half - 6), V(pivX, pivY + 6, half + 6), 7.5, 7.5, V(1, 0, 0));
    P.beam(padBack.clone().addScaledVector(d, -len / 2 + 8), V(colX, padBack.y - len * 0.2, 0), 5, 5, V(0, 0, 1), { caps: false });
    const st = P.stack(12, { rodH: H - 40, w: 22, d: 10 }); st.g.position.set(colX + (rev ? 16 : -16), fy + 9, 0);
    P.beam(V(colX + (rev ? 16 : -16), fy + H - 26, -13), V(colX + (rev ? 16 : -16), fy + H - 26, 13), 4, 4, V(1, 0, 0), { caps: false });
    // Pivot hubs and the swinging arms.
    const arms = ["R", "L"].map((s) => {
      const z = (s === "R" ? 1 : -1) * half, piv = V(pivX, pivY, z);
      const hub = G.mesh(new THREE.CylinderGeometry(4.2, 4.2, 8, 24), M.graphite); hub.position.copy(piv); P.add(hub);
      return { s, piv, arm: liveRod(P, 2.0, M.steel), drop: liveRod(P, 1.6, M.steel), grip: liveRod(P, 1.9, M.grip), cap: liveRod(P, 2.1, M.plastic) };
    });
    const ang0 = arms.map((a) => { const h = S[0].grip[a.s]; return Math.atan2(h.z - a.piv.z, h.x - a.piv.x); });
    const update = (f) => {
      let moved = 0;
      arms.forEach((a, i) => {
        const h = f.grip[a.s], ax = f.axis[a.s].clone().normalize(); if (ax.y < 0) ax.negate();
        const top = h.clone().addScaledVector(ax, 7), over = V(top.x, a.piv.y, top.z);
        a.arm(a.piv, over); a.drop(over, top); a.grip(h.clone().addScaledVector(ax, -7), top); a.cap(h.clone().addScaledVector(ax, -8.2), h.clone().addScaledVector(ax, -7));
        moved += Math.abs(Math.atan2(h.z - a.piv.z, h.x - a.piv.x) - ang0[i]);
      });
      st.moving.position.y = Math.min(st.travel, moved * 14);
    };
    S.forEach(update);
    return { update };
  } };

  // ---------- 45° back extension: thigh pads at the hips, foot plate and heel roller ----------
  K.v3Hyper = {
    ground(ctx) { return ctx.lowest({}, isFoot) - 24; },
    build(ctx) {
      const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J;
      const dl = J.pelvis.clone().sub(J.ankle).setZ(0).normalize(), nUp = V(-dl.y, dl.x, 0); // nUp: from the front of the legs toward their back
      // Thigh pads under the front of the upper thighs, just below the hip crease.
      const padC = J.pelvis.clone().addScaledVector(dl, -15); padC.z = 0;
      const probe = padC.clone().addScaledVector(nUp, -40);
      const gap = ctx.gap(probe, nUp, dl, 22, 30, (b) => b.startsWith("thigh"));
      const face = probe.clone().addScaledVector(nUp, (isFinite(gap) ? gap : 30) - 0.4);
      [1, -1].forEach((s) => P.pad(face.clone().add(V(0, 0, s * 9.5)), dl, 26, 17, 8, nUp));
      // Foot plate under the soles (perpendicular to the legs).
      const fdir = J.toe.clone().sub(J.ankle).setZ(0).normalize(), np = V(-fdir.y, fdir.x, 0);
      const fc = mid(J.ankle, J.toe); fc.z = 0;
      const pr = fc.clone().addScaledVector(np, -25), g2 = ctx.gap(pr, np, fdir, 30, 40, isFoot);
      const fface = pr.clone().addScaledVector(np, (isFinite(g2) ? g2 : 25) - 0.3);
      const plat = new THREE.Group(); P.add(plat);
      plat.position.copy(fface).addScaledVector(fdir, 3);
      plat.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fdir, np, new THREE.Vector3().crossVectors(fdir, np)));
      P.box(34, 2.2, 44, M.steel, V(0, -1.1, 0), plat); P.box(32, 0.5, 42, M.rubber, V(0, 0.25, 0), plat);
      plat.updateMatrixWorld(true);
      // Heel roller over the backs of the lower shins.
      const rr = 5, rc0 = J.ankle.clone().addScaledVector(dl, 12); rc0.z = 0;
      const rpr = rc0.clone().addScaledVector(nUp, 40), g3 = ctx.gap(rpr, nUp.clone().negate(), dl, 6, 30, (b) => b.startsWith("shin"));
      const rc = rpr.clone().addScaledVector(nUp, -((isFinite(g3) ? g3 : 34) - 0.3) + rr);
      [1, -1].forEach((s) => { const roll = G.mesh(new THREE.CylinderGeometry(rr, rr, 14, 26).rotateX(Math.PI / 2), M.upholstery); roll.position.set(rc.x, rc.y, s * 8.5); P.add(roll); });
      P.rod(V(rc.x, rc.y, -17), V(rc.x, rc.y, 17), 1.2, M.chrome);
      // Frame: a spine beam under the pads and the plate, two legs and a floor base.
      const under = face.clone().addScaledVector(nUp, -9.5);
      const tail = plat.localToWorld(V(-14, -6, 0)); tail.z = 0;
      P.beam(tail, under.clone().addScaledVector(dl, 10), 7.5, 7.5, V(0, 0, 1));
      P.beam(V(rc.x, rc.y, 0), rc.clone().addScaledVector(nUp, -14), 4, 4, V(0, 0, 1), { caps: false });
      const fr = under.clone().addScaledVector(dl, 4), bk = tail.clone();
      P.beam(V(fr.x + 6, fy + 9, 0), fr, 7.5, 7.5, V(0, 0, 1), { caps: false });
      P.beam(V(bk.x - 4, fy + 9, 0), bk, 7.5, 7.5, V(0, 0, 1), { caps: false });
      P.beam(V(bk.x - 14, fy + 5.25, 0), V(fr.x + 22, fy + 5.25, 0), 7.5, 7.5, V(0, 1, 0));
      P.stabilizer(V(bk.x - 8, fy, 0), V(0, 0, 1), 60); P.stabilizer(V(fr.x + 16, fy, 0), V(0, 0, 1), 60);
      // Hand rails at the sides of the pads.
      [1, -1].forEach((s) => P.beam(V(fr.x + 6, fy + 40, s * 24), under.clone().add(V(0, 4, s * 24)), 4, 4, V(0, 0, 1)));
      return { update() {} };
    }
  };

  // ---------- Fixed bar in a rack (inverted row): two uprights with J-hooks at the bar ----------
  K.v3RackBar = { build(ctx) {
    const P = ctx.P, M = P.M, fy = P.floorY, bar = mid(ctx.S[0].grip.R, ctx.S[0].grip.L);
    const H = Math.max(140, bar.y - fy + 40);
    [1, -1].forEach((s) => {
      const z = s * 60;
      P.beam(V(bar.x - 7.5, fy + 9, z), V(bar.x - 7.5, fy + H, z), 7.5, 7.5, V(0, 0, 1), { caps: [false, true] });
      P.holes(V(bar.x - 7.5 + 3.77, fy + 22, z), V(0, 1, 0), Math.floor((H - 30) / 5), 5, V(1, 0, 0), 0.95);
      P.beam(V(bar.x - 60, fy + 5.25, z), V(bar.x + 40, fy + 5.25, z), 7.5, 7.5, V(0, 1, 0));
      P.foot(bar.x - 57, z, 8, 8); P.foot(bar.x + 37, z, 8, 8);
      P.box(10.2, 13, 10.2, M.graphite, V(bar.x - 7.5, bar.y - 4.4, z));
      P.box(8, 1.4, 6.5, M.graphite, V(bar.x + 1, bar.y - 2.1, z));
      P.box(1.4, 5.5, 6.5, M.graphite, V(bar.x + 5, bar.y - 0.1, z));
    });
    P.beam(V(bar.x - 60, fy + 5.25, -56), V(bar.x - 60, fy + 5.25, 56), 7.5, 7.5, V(0, 1, 0), { caps: false });
    P.beam(V(bar.x - 7.5, fy + H - 3.75, -56), V(bar.x - 7.5, fy + H - 3.75, 56), 7.5, 7.5, V(1, 0, 0), { caps: false });
    const b = G.olympicBar(P, []); b.position.copy(bar); P.add(b);
    return { update() {} };
  } };

  // ---------- Assisted dip machine: dip handles at the hands, a kneeling pad on a lever that
  // follows the knees, the stack in a column in front ----------
  K.v3AssistDip = { ground: "hang", hang: 136, build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, g = S[0].grip;
    const cx = g.R.x + 40, H = g.R.y - fy + 60;
    // Dip handles: short bars running forward from the column at the hands.
    [g.R, g.L].forEach((h) => {
      P.rod(V(h.x - 12, h.y, h.z), V(cx, h.y, h.z), 2.0, M.steel);
      P.rod(V(h.x - 12, h.y, h.z), V(h.x + 10, h.y, h.z), 2.5, M.grip);
      P.rod(V(h.x - 13.2, h.y, h.z), V(h.x - 12, h.y, h.z), 2.7, M.plastic);
    });
    [1, -1].forEach((s) => {
      const z = s * 24;
      P.beam(V(cx, fy + 9, z), V(cx, fy + H, z), 7.5, 7.5, V(0, 0, 1), { caps: [false, true] });
      P.beam(V(cx - 90, fy + 5.25, s * 30), V(cx + 40, fy + 5.25, s * 30), 7.5, 6, V(0, 1, 0));
      P.foot(cx - 87, s * 30, 7, 7); P.foot(cx + 37, s * 30, 7, 7);
      P.box(6, 8, Math.abs(z - (s > 0 ? g.R.z : g.L.z)) + 6, M.graphite, V(cx - 3, (s > 0 ? g.R : g.L).y, (z + (s > 0 ? g.R.z : g.L.z)) / 2));
    });
    P.beam(V(cx, fy + H - 3.75, -28), V(cx, fy + H - 3.75, 28), 7.5, 7.5, V(1, 0, 0), { caps: false });
    // Pull-up bar on top (part of every combo machine).
    P.rod(V(cx - 30, fy + H + 2, -40), V(cx - 30, fy + H + 2, 40), 1.6, M.knurl);
    [1, -1].forEach((s) => P.beam(V(cx, fy + H - 3.75, s * 36), V(cx - 30, fy + H + 2, s * 36), 5, 5, V(0, 0, 1)));
    const st = P.stack(14, { rodH: H - 34, w: 24, d: 11 }); st.g.position.set(cx + 20, fy + 9, 0);
    // Kneeling pad on a lever pivoting behind the knees.
    const shins = ctx.track((x, y, z, b) => b.startsWith("shin") || (b.startsWith("thigh")));
    const k0 = S[0].J.knee, padLen = 32, padT = 7;
    const pivot = V(k0.x - 60, fy + 24, 0);
    P.beam(V(pivot.x, fy + 9, 0), V(pivot.x, pivot.y, 0), 6, 6, V(0, 0, 1), { caps: false });
    P.beam(V(pivot.x - 8, fy + 5.25, 0), V(cx, fy + 5.25, 0), 7.5, 7.5, V(0, 1, 0));
    P.stabilizer(V(pivot.x, fy, 0), V(0, 0, 1), 56);
    const pad = P.pad(V(0, 0, 0), V(1, 0, 0), padLen, 40, padT);
    const lever = liveRod(P, 2.6, M.steel), post = liveRod(P, 2.0, M.steel);
    const lowKnees = () => { const p = shins.now(); let lo = Infinity; for (let i = 1; i < p.length; i += 3) lo = Math.min(lo, p[i]); return lo; };
    let first = true, x0 = 0;
    const update = (f) => {
      if (first) { x0 = f.J.knee.x - 6; first = false; }
      const y = (f.pts ? f.J.knee.y - 6 : lowKnees()) + 0.3;
      pad.position.set(x0, y - padT, 0);
      const under = V(x0, y - padT - 4, 0);
      lever(pivot, under.clone().add(V(-4, -6, 0))); post(under.clone().add(V(-4, -6, 0)), under);
      st.moving.position.y = Math.max(0, Math.min(st.travel, (S[0].J.knee.y - f.J.knee.y) * 0.8));
    };
    S.forEach((s) => update({ J: s.J, pts: true }));
    return { update };
  } };

  // ---------- Bench under the hands, set crosswise (incline push-up, bench dip) ----------
  K.v3HandBench = { build(ctx) {
    const P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, gm = mid(S[0].grip.R, S[0].grip.L);
    const top = ctx.lowest({ x0: gm.x - 14, x1: gm.x + 14 }, isHand) + 0.2;
    const len = 112, w = 29, thick = 9.5, o = ctx.fig.handBench || {};
    const cx = gm.x + (o.dx ?? 0);
    P.pad(V(cx, top, 0), V(0, 0, 1), len, w, thick);
    const by = top - thick - 4.4;
    P.beam(V(cx, by, -len / 2 + 9), V(cx, by, len / 2 - 9), 7.5, 5, V(1, 0, 0));
    [-1, 1].forEach((s) => {
      const z = s * (len / 2 - 15);
      P.beam(V(cx, fy + 9, z), V(cx, by - 3.75, z), 7.5, 7.5, V(1, 0, 0), { caps: false });
      P.stabilizer(V(cx, fy, z), V(1, 0, 0), 52);
    });
    return { update() {} };
  } };

  // ---------- Padded wall behind the back (wall sit) ----------
  K.v3Wall = { build(ctx) {
    const P = ctx.P, M = P.M, fy = P.floorY;
    const b = ctx.bounds((n) => /Torso|neck/.test(n)), x = b.min.x - 0.3;
    P.box(4, 214, 170, M.upholstery, V(x - 2, fy + 107, 0));
    P.box(3, 220, 176, M.steel, V(x - 5.5, fy + 110, 0));
    P.box(8, 8, 176, M.rubber, V(x - 4, fy + 4, 0));
    return { update() {} };
  } };

  // ---------- Support post: a round steel upright where one hand holds on (and an optional calf step) ----------
  function post(P, h) {
    const M = P.M, fy = P.floorY;
    P.box(34, 1.6, 34, M.steel, V(h.x, fy + 0.8, h.z));
    P.rod(V(h.x, fy + 1.6, h.z), V(h.x, fy + 196, h.z), 2.5, M.steel);
    P.rod(V(h.x, h.y - 10, h.z), V(h.x, h.y + 10, h.z), 2.75, M.grip);
    P.rod(V(h.x, fy + 196, h.z), V(h.x, fy + 197.2, h.z), 2.7, M.plastic);
  }
  K.v3Post = { build(ctx) {
    const s = (ctx.fig.post || {}).side || "R";
    post(ctx.P, ctx.S[0].grip[s]);
    return { update() {} };
  } };
  // Calf step: a rubber-topped block under the ball of the foot (the heel hangs off its edge).
  K.v3CalfStep = {
    ground(ctx) { return ctx.lowest({}, isFoot) - 14; },
    build(ctx) {
      const P = ctx.P, M = P.M, fy = P.floorY, J = ctx.S[0].J;
      const top = ctx.lowest({ x0: J.toe.x - 7, x1: J.toe.x + 6 }, isFoot) - 0.2;
      const x0 = J.toe.x - 6, x1 = x0 + 34, h = top - fy;
      P.box(x1 - x0, h - 1, 60, M.graphite, V((x0 + x1) / 2, fy + (h - 1) / 2, 0));
      const lid = G.mesh(G.padGeo(x1 - x0, 1, 60), M.rubber); lid.position.set((x0 + x1) / 2, top - 1, 0); P.add(lid);
      [x0 + 3, x1 - 3].forEach((x) => [-1, 1].forEach((s) => P.foot(x, s * 26, 5, 5)));
      if (ctx.fig.post) post(P, ctx.S[0].grip[ctx.fig.post.side || "R"]);
      return { update() {} };
    }
  };

  // ---------- Seated leg curl: seat, back pad, thigh pad over the knees, lever pivoting at the
  // knee with the roller behind the lower legs ----------
  K.v3SeatedCurl = { build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J, hip = J.pelvis, knee = J.knee;
    const sx0 = hip.x - 16, sx1 = knee.x - 12;
    const seatTop = ctx.lowest({ x0: sx0 + 2, x1: sx1 - 3, z0: -12, z1: 12 }, (b) => /lowerTorso|thigh/.test(b)) + 0.4;
    P.pad(V((sx0 + sx1) / 2, seatTop, 0), V(1, 0, 0), sx1 - sx0, 40, 9);
    // Back pad, reclined like the back.
    const d = J.neck.clone().sub(hip).setZ(0).normalize(), n = V(d.y, -d.x, 0), len = 64;
    const cen = hip.clone().addScaledVector(d, 10 + len / 2); cen.z = 0;
    const pr = cen.clone().addScaledVector(n, -40), gp = ctx.gap(pr, n, d, len - 8, 22, (b) => /Torso/.test(b));
    const face = pr.clone().addScaledVector(n, (isFinite(gp) ? gp : 30) - 0.4);
    P.pad(face, d, len, 36, 9, n);
    // Thigh pad pressing down on the thighs just above the knees.
    const tx = knee.x - 12, ty = ctx.highest({ x0: tx - 6, x1: tx + 6, z0: -18, z1: 18 }, (b) => b.startsWith("thigh")) + 0.3;
    const tp = G.mesh(G.padGeo(13, 8, 44), M.upholstery); tp.position.set(tx, ty + 8, 0); tp.rotation.x = Math.PI; P.add(tp);
    P.beam(V(tx, ty + 8, -24), V(tx, ty + 8, 24), 4, 4, V(1, 0, 0), { caps: false });
    // Lever pivoting on the knee axis; roller on the back of the lower legs (behind the ankles).
    const shinOff = (s) => { let best = -Infinity; const sd = s.J.ankle.clone().sub(s.J.knee).setZ(0).normalize(), back = V(-sd.y, sd.x, 0);
      for (let i = 0; i < s.pts.length; i += 3) { const v = V(s.pts[i] - s.J.knee.x, s.pts[i + 1] - s.J.knee.y, 0), a = v.dot(sd); if (a > 33 && a < 39 && Math.abs(s.pts[i + 2]) < 16) best = Math.max(best, v.dot(back)); }
      return best; };
    let off = -Infinity; S.forEach((s) => { off = Math.max(off, shinOff(s)); });
    const rr = 5.5, lever = new THREE.Group(); lever.position.set(knee.x, knee.y, 0); P.add(lever);
    // Lever frame: x along the shin (down toward the ankle), y = its back side.
    const ra = V(36, off + rr, 0);
    [1, -1].forEach((s) => {
      P.beam(V(0, 0, s * 25), V(ra.x, ra.y, s * 25), 5, 4, V(0, 0, 1), { parent: lever });
      P.box(8, 8, 6, M.graphite, V(0, 0, s * 25), lever);
      const roll = G.mesh(new THREE.CylinderGeometry(rr, rr, 15, 28).rotateX(Math.PI / 2), M.upholstery); roll.position.set(ra.x, ra.y, s * 9.5); lever.add(roll);
    });
    P.rod(V(ra.x, ra.y, -25), V(ra.x, ra.y, 25), 1.2, M.chrome, lever);
    P.rod(V(0, 0, -29), V(0, 0, 29), 1.8, M.chrome, lever);
    // Frame: posts to the knee pivots, base rails, a stack tower behind the back pad.
    [1, -1].forEach((s) => {
      P.beam(V(knee.x + 4, fy + 9, s * 30), V(knee.x, knee.y - 4, s * 30), 6, 6, V(0, 0, 1), { caps: [false, true] });
      P.box(6, 6, 6, M.graphite, V(knee.x, knee.y, s * 29));
      P.beam(V(tx, ty + 8, s * 24), V(knee.x, knee.y + 4, s * 29), 4, 4, V(0, 0, 1), { caps: false });
      P.beam(V(face.x - 44, fy + 5.25, s * 30), V(knee.x + 16, fy + 5.25, s * 30), 7.5, 6, V(0, 1, 0));
      P.foot(face.x - 41, s * 30, 7, 7); P.foot(knee.x + 13, s * 30, 7, 7);
      // Grab handles beside the seat.
      // Grab handles under the fists (the hands rest on them at the sides of the seat).
      const g = S[0].grip[s > 0 ? "R" : "L"], hy = Math.min(g.y, seatTop + 12), hz = s * Math.max(26, Math.abs(g.z));
      P.rod(V(g.x - 8, hy, hz), V(g.x + 8, hy, hz), 1.6, M.grip);
      P.beam(V(g.x + 8, fy + 9, hz), V(g.x + 8, hy, hz), 3.5, 3.5, V(0, 0, 1), { caps: [false, true] });
    });
    P.beam(V(hip.x + 4, fy + 9, 0), V(hip.x + 4, seatTop - 9, 0), 7.5, 6, V(0, 0, 1), { caps: false });
    const bsup = face.clone().addScaledVector(n, -10);
    P.beam(V(bsup.x, fy + 9, 0), bsup.clone().addScaledVector(d, -len / 2 + 6), 6, 6, V(0, 0, 1), { caps: false });
    const st = P.stack(14, { rodH: 120, w: 22, d: 10 }); st.g.position.set(face.x - 34, fy + 9, 0);
    [-1, 1].forEach((s) => P.beam(V(face.x - 34, fy + 9, s * 15), V(face.x - 34, fy + 140, s * 15), 4, 4, V(0, 0, 1), { caps: [false, true] }));
    let a0 = null;
    const update = (f) => {
      const sd = f.J.ankle.clone().sub(f.J.knee), a = Math.atan2(sd.y, sd.x);
      lever.rotation.z = a;
      if (a0 == null) a0 = a;
      st.moving.position.y = Math.max(0, Math.min(st.travel, Math.abs(a - a0) * 22));
    };
    S.forEach(update);
    return { update };
  } };

  // ---------- Nordic hamstring bench: a kneeling pad and padded rollers locking the ankles ----------
  K.v3Nordic = {
    ground(ctx) { return ctx.lowest({}, (b) => b.startsWith("shin")) - 0.4 - 46; },
    build(ctx) {
      const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J;
      const knee = J.knee, ankle = J.ankle;
      const top = ctx.lowest({}, (b) => b.startsWith("shin")) + 0.4;
      const x0 = ankle.x - 8, x1 = knee.x + 22;
      P.pad(V((x0 + x1) / 2, top, 0), V(1, 0, 0), x1 - x0, 40, 8);
      // Ankle rollers over the backs of the lower legs, just above the heels.
      const rx = ankle.x + 7, ry = ctx.highest({ x0: rx - 3, x1: rx + 3, z0: -18, z1: 18 }, (b) => b.startsWith("shin") || b.startsWith("foot")) + 5.2;
      [1, -1].forEach((s) => { const r = G.mesh(new THREE.CylinderGeometry(5, 5, 15, 26).rotateX(Math.PI / 2), M.upholstery); r.position.set(rx, ry, s * 9.5); P.add(r); });
      P.rod(V(rx, ry, -21), V(rx, ry, 21), 1.2, M.chrome);
      [1, -1].forEach((s) => P.beam(V(rx - 9, top - 12, s * 21), V(rx, ry, s * 21), 4, 4, V(0, 0, 1)));
      // Frame: a deck under the pad on two leg frames.
      const by = top - 8 - 4;
      P.beam(V(x0 - 8, by, 0), V(x1 - 4, by, 0), 7.5, 7.5, V(0, 0, 1));
      [x0 + 4, x1 - 12].forEach((x) => { P.beam(V(x, fy + 9, 0), V(x, by - 3.75, 0), 7.5, 7.5, V(0, 0, 1), { caps: false }); P.stabilizer(V(x, fy, 0), V(0, 0, 1), 60); });
      // Floor mat in front to land on.
      const m = G.mesh(G.padGeo(120, 1.5, 70), M.mat); m.position.set(x1 + 60, fy, 0); P.add(m);
      return { update() {} };
    }
  };

  // ---------- One dumbbell (in the right hand), with an optional bench to sit on ----------
  K.v3OneDB = { build(ctx) {
    const P = ctx.P, o = ctx.fig.one || {}, r = ctx.fig.db || [7, 6], s = o.side || "R";
    if (o.seat) {
      const hip = ctx.S[0].J.pelvis;
      L.flatBench(ctx, hip.x - 70, hip.x + 18, { only: (b) => /lowerTorso/.test(b) });
    }
    const db = P.add(G.dumbbell(P, r[0], r[1]));
    return { update(f) { db.position.copy(f.grip[s]); db.quaternion.copy(f.handQ[s]); } };
  } };

  // ---------- Chest-supported row: an incline pad under the chest, feet on the floor, dumbbells ----------
  K.v3ChestRow = { build(ctx) {
    const P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J, hip = J.pelvis;
    const d = J.neck.clone().sub(hip).setZ(0).normalize(), nIn = V(-d.y, d.x, 0); // nIn: from the chest pad toward the chest
    const len = 70, cen = hip.clone().addScaledVector(d, 18 + len / 2); cen.z = 0;
    const pr = cen.clone().addScaledVector(nIn, -40), gp = ctx.gap(pr, nIn, d, len - 10, 22, (b) => /Torso/.test(b));
    const face = pr.clone().addScaledVector(nIn, (isFinite(gp) ? gp : 30) - 0.4);
    P.pad(face, d, len, 32, 9, nIn);
    const under = (a) => face.clone().addScaledVector(nIn, -9.5).addScaledVector(d, a);
    P.beam(under(-len / 2 + 4), under(len / 2 - 6), 5, 5, V(0, 0, 1));
    // Front leg (under the top of the pad) and rear leg (under its low end), on a floor rail.
    const top = under(len / 2 - 12), low = under(-len / 2 + 8);
    P.beam(V(top.x + 6, fy + 9, 0), top, 6, 6, V(0, 0, 1), { caps: false });
    P.beam(V(low.x - 4, fy + 9, 0), low, 6, 6, V(0, 0, 1), { caps: false });
    P.beam(V(low.x - 14, fy + 5.25, 0), V(top.x + 22, fy + 5.25, 0), 7.5, 7.5, V(0, 1, 0));
    P.stabilizer(V(low.x - 8, fy, 0), V(0, 0, 1), 56); P.stabilizer(V(top.x + 16, fy, 0), V(0, 0, 1), 56);
    // Foot platform where the toes push.
    const r = ctx.fig.db || [7, 6];
    return { update: L.dumbbells(ctx, r[0], r[1]) };
  } };

  // ---------- Straight-bar triceps pushdown: high pulley column in front, short straight bar ----------
  function straightBarRig(ctx) {
    const P = ctx.P, M = P.M, THREE = T(), g = new THREE.Group(); P.add(g);
    const half = Math.abs(ctx.S[0].grip.R.z) + 9;
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
  K.v3Pushdown = { ground: "feet", build(ctx) {
    const o = ctx.fig.tower || {}, S = ctx.S, P = ctx.P, g0 = mid(S[0].grip.R, S[0].grip.L);
    const t = L.cableTower(ctx, { at: V(g0.x + (o.dx ?? 40), 0, 0), face: V(-1, 0, 0), carriageY: P.floorY + (o.y ?? 195), ratio: 0.5 });
    return L.cableKit(ctx, [t], [straightBarRig(ctx)]);
  } };

  // ---------- Seated wrist curl: flat bench to sit on, barbell in the hands ----------
  K.v3WristCurl = { build(ctx) {
    const hip = ctx.S[0].J.pelvis;
    L.flatBench(ctx, hip.x - 76, hip.x + 16, { only: (b) => /lowerTorso/.test(b) });
    return { update: L.barbell(ctx, [[12.6, 2.6]], "iron") };
  } };
})();

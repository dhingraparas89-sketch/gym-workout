// ---------- Round 7: upper-body mechanics (chest, back, shoulders, arms) ----------
// Loaded after v4-motion.js. Corrections to the 3D demonstrations of the upper-body exercises,
// measured with the contact/joint audit and checked in contact sheets of both athletes:
// elbow paths (forearms stacked under the load in presses), full but safe ranges (straight-but-soft
// elbows at the end of hangs, presses and flys), hands that stay on their handles, equipment that
// does not jump, and mistake demos that show one real, common fault.
// figure3d / bad3d fields: see data/SCHEMA.md and js/figure3d.js. Pole vectors are in the torso
// frame: [forward (chest side), up the spine, out to the side].
(() => {
  const find = (n) => EXERCISES.find((e) => e.name === n);
  // Side-view arm angles that put the hand `fwd` cm in front of and `up` cm above the shoulder
  // (2D bones: upper arm 30, forearm 28). For IK arms only the hand position matters; the elbow
  // solution with a natural (0..155 degree) bend is returned.
  const wrap = (x) => ((((x + 180) % 360) + 360) % 360) - 180;
  const deg = (r) => (r * 180) / Math.PI;
  // armsOut poses (wide-arm moves) use a 24 cm side-view upper arm and allow the folded elbow of a
  // side-view projection (see ARMS_OUT in js/figure.js).
  function armTo(fwd, up, out) {
    const L1 = out ? 24 : 30, L2 = 28, maxFlex = out ? 250 : 155;
    const r0 = Math.hypot(fwd, up) || 1;
    // The 2D elbow folds at most maxFlex degrees: a closer hand target is pushed out along its direction.
    const dMin = Math.sqrt(L1 * L1 + L2 * L2 - 2 * L1 * L2 * Math.cos(((180 - Math.min(maxFlex, 152)) * Math.PI) / 180)) + 0.5;
    const d = Math.min(L1 + L2 - 0.4, Math.max(dMin, r0));
    const hx = (d * fwd) / r0, hy = (d * up) / r0, th = deg(Math.atan2(hx, hy));
    const al = deg(Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)))));
    for (const s of [1, -1]) {
      const ua = th + s * al, ex = L1 * Math.sin((ua * Math.PI) / 180), ey = L1 * Math.cos((ua * Math.PI) / 180);
      const fa = deg(Math.atan2(hx - ex, hy - ey));
      const flex = wrap(ua - fa);
      if (flex >= 0 && flex <= 155) return { ua: Math.round((((ua % 360) + 360) % 360) * 10) / 10, fa: Math.round((((fa % 360) + 360) % 360) * 10) / 10 };
    }
    return { ua: th, fa: th };
  }
  const ik = (ex, o) => ({ ...((ex.figure3d || {}).ik || {}), ...o });
  // Merge a 3D patch into an exercise: figure3d fields (ik merged), mistake overrides, text.
  function patch(name, f) {
    const ex = find(name);
    if (!ex) return;
    const p = typeof f === "function" ? f(ex) : f;
    if (p.fig) ex.figure3d = { ...(ex.figure3d || {}), ...p.fig };
    if (p.bad3d) ex.bad3d = { ...(ex.bad3d || {}), ...p.bad3d };
    if (p.bad) ex.bad = { ...(ex.bad || {}), ...p.bad };
    if (p.error && typeof FORM !== "undefined" && FORM[name]) FORM[name].error = { ...FORM[name].error, ...p.error };
    if (p.demo) { ex.demo = p.demo[0]; if (p.demo[1]) ex.demoNote = p.demo[1]; else delete ex.demoNote; }
  }
  const pose = (ex, which) => ({ ...(((ex.figure3d || {})[which]) || ex.figure[which]) });

  // ----- Chest: barbell presses -----
  // The elbow sits under the bar at the bottom (forearms vertical from the front and the side),
  // tucked about 45-60 degrees from the torso, instead of flaring wider than the hands.
  const TUCK = [-1, -0.55, 0.45];
  patch("Barbell bench press", (ex) => ({ fig: { ik: ik(ex, { pole: TUCK }) } }));
  // Incline: the bar touches the upper chest (below the collarbones), not the throat.
  patch("Incline bench press", (ex) => ({ fig: { ik: ik(ex, { pole: [-1, -0.8, 0.35] }), b: { ...pose(ex, "b"), ...armTo(19.4, 1.2) } } }));
  // Decline: the bar touches the lower chest.
  patch("Decline bench press", (ex) => ({ fig: { ik: ik(ex, { pole: TUCK }), b: { ...pose(ex, "b"), ...armTo(14.3, 20.1) } } }));
  // Dumbbells: lowered beside the chest, forearms vertical.
  patch("Dumbbell bench press", (ex) => ({ fig: { ik: ik(ex, { pole: TUCK }) } }));
  patch("Incline dumbbell press", (ex) => ({ fig: { ik: ik(ex, { pole: [-1, -0.7, 0.5] }), b: { ...pose(ex, "b"), ...armTo(18.7, -5.2) } } }));

  // ----- Chest: flys (move at the shoulder only, a soft fixed bend in the elbow) -----
  patch("Dumbbell fly", (ex) => ({ fig: { ik: ik(ex, { reach: 1.12 }), b: { ...pose(ex, "b"), gz: 72 } } }));
  // Mid pulleys: open to about chest level with the hands slightly behind the chest (not far
  // behind the back), hug the hands together in front of the chest.
  patch("Cable fly", (ex) => ({ fig: { ik: ik(ex, { reach: 1.22 }), a: { ...pose(ex, "a"), ...armTo(-13, -4, 1), gz: 64 }, b: { ...pose(ex, "b"), ...armTo(51.5, -13, 1), gz: 13 } } }));
  // High pulleys: from up and out, sweep down to in front of the hips.
  patch("Cable crossover", (ex) => ({ fig: { ik: ik(ex, { reach: 1.21 }), a: { ...pose(ex, "a"), ...armTo(-4, 27, 1), gz: 57 }, b: { ...pose(ex, "b"), ...armTo(33, -40, 1), gz: 11 } } }));
  patch("Pec deck fly", (ex) => ({ fig: { legAbd: 12, thumb: "up", ik: ik(ex, { reach: 1.17 }), a: { ...pose(ex, "a"), ...armTo(-8, -1, 1), gz: 65 }, b: { ...pose(ex, "b"), ...armTo(51.5, -1, 1), gz: 13 } } }));

  // ----- Back -----
  // Hangs and pulldowns start from straight-but-soft elbows (the 3D arm is longer than the 2D one).
  patch("Pull-up", (ex) => ({ fig: { ik: ik(ex, { reach: 1.045 }) } }));
  patch("Assisted pull-up", (ex) => ({ fig: { ik: ik(ex, { reach: 1.07 }) } }));
  patch("Lat pulldown", (ex) => ({ fig: { ik: ik(ex, { reach: 1.06 }) } }));
  patch("T-bar row", (ex) => ({ fig: { ik: ik(ex, { reach: 1.12 }) } }));
  // Inverted row: the bar sits over the lower chest. At the bottom the arms hang perpendicular to
  // the straight body (they used to reach up past the head, so the bar met the face at the top).
  patch("Inverted row", (ex) => ({ fig: {
    ik: ik(ex, { grip: 36, pole: [-1, -0.7, 0.45] }),
    a: { ...pose(ex, "a"), ua: 34, fa: 34 },
    b: { ...pose(ex, "b"), foot: 38, shin: -52, thigh: -52, torso: -52, neck: -54 } } }));

  // Straight-arm pulldown: starts with the arms at about head height (shoulders flexed ~150
  // degrees), not straight overhead, and sweeps to the thighs with a fixed soft elbow.
  patch("Straight-arm pulldown", (ex) => ({ fig: { a: { ...pose(ex, "a"), ua: 55, fa: 49 } } }));
  // Chest-supported row: the head stays in line with the spine above the pad (it used to drop into it).
  patch("Chest-supported row", (ex) => ({ fig: { a: { ...pose(ex, "a"), neck: 48 }, b: { ...pose(ex, "b"), neck: 48 } } }));
  // Back extension: the hip crease sits just above the pads; at the bottom the trunk hangs in front
  // of the pads (about 110 degrees of hip flexion) instead of folding back into them.
  patch("Back extension", (ex) => ({ fig: { a: { ...pose(ex, "a"), torso: 155, neck: 162 } } }));

  // ----- Shoulders -----
  // Raises: a soft, fixed bend in the elbow (not locked straight).
  patch("Dumbbell lateral raise", (ex) => ({ fig: { a: { ...pose(ex, "a"), fa: 168 }, b: { ...pose(ex, "b"), fa: 166 } } }));
  patch("Rear delt fly", (ex) => ({ fig: { a: { ...pose(ex, "a"), fa: 168 }, b: { ...pose(ex, "b"), fa: 166 } } }));
  // Face pull: hands finish beside the head, apart, elbows high and out (not in front of the face).
  patch("Face pull", (ex) => ({ fig: { thumb: "up", ik: ik(ex, { reach: 1.16 }), a: { ...pose(ex, "a"), ...armTo(51.6, 2, 1), gz: 5 }, b: { ...pose(ex, "b"), ...armTo(3.7, 16.8, 1), gz: 29 } } }));
  // Upright row: shoulder-width grip; the bar stops at the lower chest with the elbows at
  // shoulder height (higher pinches the shoulder).
  patch("Upright row", (ex) => ({ fig: { ik: ik(ex, { grip: 22, pole: [-0.3, 0.3, 1] }), b: { ...pose(ex, "b"), ...armTo(12, -22) } } }));
  patch("Reverse pec deck", (ex) => ({ fig: { thumb: "up", ik: ik(ex, { reach: 1.15 }), a: { ...pose(ex, "a"), ...armTo(51, -8, 1), gz: 12 }, b: { ...pose(ex, "b"), ...armTo(-8, -2, 1), gz: 66 } } }));

  // ----- Arms -----
  patch("Dips", (ex) => ({ fig: { ik: ik(ex, { reach: 1.13 }) } }));
  patch("Assisted dip", (ex) => ({ fig: { ik: ik(ex, { reach: 1.13 }) } }));
  // Bench dip: arms nearly locked at the top (reach) and the elbows at about 90 degrees at the
  // bottom, the hips sliding down just in front of the bench edge.
  patch("Bench dip", (ex) => ({ fig: { handBench: { dx: -14.5 }, ik: ik(ex, { reach: 1.12 }), a: { ...pose(ex, "a"), ua: 205, fa: 205 }, b: { ...pose(ex, "b"), foot: 25, shin: -65, thigh: -65, torso: 3, neck: 3, ua: 205, fa: 205 } } }));
  // Overhead extension: upper arms stay close to vertical beside the head; full lockout on top.
  patch("Overhead triceps extension", (ex) => ({ fig: { ik: ik(ex, { reach: 1.06, pole: [0.1, 1, 0.15] }), b: { ...pose(ex, "b"), ...armTo(-18, 22) } } }));
  patch("Cable curl", { fig: { abd: 0 } });
  // Preacher curl: knees apart so the pad post stands between the thighs, not in them.
  patch("Preacher curl", { fig: { legAbd: 22, legAbdAxis: "spine" } });
  // Concentration curl: thighs spread (about the spine) so the arm hangs between the knees with the
  // back of the upper arm on the inner thigh, instead of outside the leg.
  patch("Concentration curl", (ex) => ({ fig: { legAbd: 26, legAbdAxis: "spine", b: { ...pose(ex, "b"), fa: 46 } } }));
  patch("Incline dumbbell curl", (ex) => ({ fig: { abd: -16, b: { ...pose(ex, "b"), fa: 50 } } }));

  // ----- Mistake demos rebuilt on the corrected poses (one real fault each) -----
  // Dumbbell bench: elbows flared straight out to 90 degrees (the elbow swings out to the side).
  patch("Dumbbell bench press", (ex) => ({ bad3d: { a: { ...pose(ex, "a"), pole: [-0.2, 0, 1] }, b: { ...pose(ex, "b"), ua: 96, fa: -6, gz: 46, pole: [-0.2, 0, 1] } } }));
  // Lateral raise: swinging above shoulder height with a shrug.
  patch("Dumbbell lateral raise", (ex) => ({ bad3d: { b: { ...pose(ex, "b"), abd: -124, fa: 160, neck: -6, shrug: 3.5 } } }));
  // Rear delt fly: the shoulders shrug up and the blades pinch, so the traps lift the weights.
  patch("Rear delt fly", (ex) => ({ bad3d: { a: { ...pose(ex, "a") }, b: { ...pose(ex, "b"), abd: 88, shrug: 3.5, neck: 48 } } }));
  // Reverse pec deck: shrugging and leaning back off the chest pad.
  patch("Reverse pec deck", (ex) => ({ bad3d: { b: { ...pose(ex, "b"), torso: -6, neck: -10, shrug: 3.5 } } }));

  // Decline bench: the bar drifts to the neck and the elbows flare out to the sides with it.
  const FLARE = [-0.2, 0, 1];
  patch("Decline bench press", (ex) => ({ bad3d: { a: { ...pose(ex, "a"), pole: FLARE }, b: { ...pose(ex, "b"), ...ex.bad.b, pole: FLARE } } }));
  // Lat pulldown: leaning back about 30 degrees past upright (a row), within the bar's reach.
  patch("Lat pulldown", { bad3d: { b: { torso: -32, neck: -22, ua: 172, fa: 40 } } });
  // Assisted dip: sinking well below parallel with the shoulders rolling forward (head clear of the frame).
  patch("Assisted dip", { bad3d: { b: { torso: 18, neck: 8, ua: 272, fa: 150 } } });
  // Overhead extension: the elbows drift forward as the weight lowers behind the head.
  patch("Overhead triceps extension", { bad3d: { b: { ua: 50, fa: -60 } } });

  // ----- Demonstration status after the round-7 review (audits + sheets of both athletes) -----
  [["Pec deck fly"], ["Chest-supported row"], ["Preacher curl"], ["Wrist curl"], ["Incline dumbbell curl"],
    ["Cable curl"], ["Reverse pec deck"]].forEach(([n]) => patch(n, { demo: ["ready"] }));
  patch("Back extension", { demo: ["beta", "At the bottom the crossed arms and chest press about 3 cm into the underside of the thigh pads."] });
  patch("Upright row", { demo: ["beta", "The fists are turned about 40 degrees across the bar."] });
  patch("Overhead triceps extension", { demo: ["beta", "The hands sit about 2 cm off the dumbbell handle with the fists turned across it, and the bench frame touches the shin (about 3 cm, male athlete)."] });

  // Expose the helper for the tuning tools (not used by the site).
  if (typeof window !== "undefined") window.__armTo = armTo;
  void pose;
})();

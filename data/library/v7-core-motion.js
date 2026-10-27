// ---------- Round 7 (CORE-MOTION): the core exercises, rebuilt for whole-rep biomechanics ----------
// Loaded after v4-motion.js and before meta.js (index.html). Overrides the 3D demonstration
// (figure3d / bad3d), tempo and phase labels, plus the mistake text where the mistake changed, for:
// squats, push-ups, lunges, the deadlift family (with a new Sumo deadlift), curls, presses, planks.
// Pose angles are side-view bone directions (js/figure.js). Hinge poses were solved so the bar
// (the grip point) stays close in front of the legs on a near-vertical path over the mid-foot, and
// checked with a kinematic trace of the whole rep (bar-to-shin clearance, foot slide, floor contact).
// New pose fields used here (js/figure3d.js plantLeg): heel (deg, heels lift about the ball of the
// foot), kneeOutR / kneeOutL (deg, one knee turned out (+) or caving in (-)).
(() => {
  const byName = (n) => EXERCISES.find((e) => e.name === n);
  const S0 = { x: 100, y: 186, shin: 0, thigh: 0, torso: 0, neck: 0, ua: 180, fa: 180 };
  // Tempos: segments [end of segment (cycle 0..1), from, to, ease]; "con" = drive, "ecc" = controlled
  // lowering. The lowering half always takes longer than the lifting half.
  const UP_FIRST = { ms: 4600, segs: [[0.06, 0, 0], [0.38, 0, 1, "con"], [0.47, 1, 1], [0.9, 1, 0, "ecc"], [1, 0, 0]] };
  const DOWN_FIRST = { ms: 4600, segs: [[0.06, 0, 0], [0.48, 0, 1, "ecc"], [0.55, 1, 1], [0.86, 1, 0, "con"], [1, 0, 0]] };
  const TL = (tp, labels) => { let s = 0; return tp.segs.map(([end], i) => { const p = { label: labels[i], t0: s, t1: end }; s = end; return p; }); };
  const setForm = (name, err) => { if (typeof FORM === "undefined") return; FORM[name] = FORM[name] || {}; FORM[name].error = { ...(FORM[name].error || {}), ...err }; };

  // ----- Deadlift family -----
  // Conventional: starts with the bar on the floor (hips above the knees, shoulders just ahead of
  // the bar, shins touching it), knees extend first while the back angle holds, then the hips come
  // through; the bar rises in a straight line close to the shins and thighs. Lowered under control.
  const DL_A = { ...S0, x: 96, shin: 12, thigh: -58.3, torso: 68.7, neck: 58, ua: 184, fa: 184 };
  const DL_B = { ...S0, x: 96, shin: 0, thigh: 0, torso: -1, neck: 0, ua: 166, fa: 166 };
  const dl = byName("Deadlift");
  if (dl) {
    Object.assign(dl.figure3d, {
      bar: { platform: true, fromFloor: true, bumper: true }, keysEase: "spline",
      a: DL_A, b: DL_B,
      keys: [{ at: 0.4, shin: 3, thigh: -35.9, torso: 56.3, neck: 46, ua: 184, fa: 184 },
        { at: 0.72, shin: 1, thigh: -18.5, torso: 32.6, neck: 26, ua: 180, fa: 180 }]
    });
    // Mistake: the lower back rounds and the bar drifts forward off the legs from the floor.
    dl.bad3d = {
      a: { shin: 12, thigh: -61.9, torso: 65.4, bend: 12, neck: 92, ua: 176, fa: 176 },
      keys: [{ shin: 4, thigh: -37.6, torso: 57.3, bend: 11, neck: 80, ua: 178, fa: 178 }, { bend: 6, neck: 40, ua: 176, fa: 176 }],
      b: { bend: 2 }
    };
    dl.bad = { ...dl.bad, cue: "The lower back rounds and the bar drifts away from the legs as it leaves the floor, so the spine, not the hips, takes the load." };
    dl.animation = { ...(dl.animation || {}), tempo: UP_FIRST };
    dl.phaseTimeline = TL(UP_FIRST, ["Set up over the bar", "Push the floor away", "Lockout", "Hinge down with control", "Bar on the floor"]);
    setForm("Deadlift", { title: "Back rounds, bar drifts away", detail: "Your lower back rounds and the bar swings forward away from your shins as it leaves the floor.",
      fix: "Pull the slack out of the bar, brace, squeeze your armpits so the bar drags up your shins, and push the floor away with a flat back.",
      why: "A rounded back with the bar out in front makes the lever arm on the spine much longer, so the discs and ligaments take load the hips and legs should carry. It is the most common way deadlifts cause back pain." });
  }

  // Romanian: from standing, soft knees (about 40 degrees at the bottom), the hips travel back and
  // the bar slides down the thighs to just below the knees; the back stays flat.
  const rdl = byName("Romanian deadlift");
  if (rdl) {
    Object.assign(rdl.figure3d, {
      bar: { platform: true }, keysEase: "spline",
      a: { ...S0, x: 104, ua: 166, fa: 166 },
      keys: [{ at: 0.45, shin: 3, thigh: -24.4, torso: 45.3, neck: 38, ua: 186, fa: 186 }],
      b: { ...S0, x: 104, shin: 4, thigh: -37.7, torso: 66.7, neck: 58, ua: 189, fa: 189 }
    });
    rdl.bad3d = { keys: [{ torso: 50, bend: 8, neck: 62, ua: 182, fa: 182 }], b: { torso: 72, bend: 14, neck: 104, ua: 178, fa: 178 } };
    rdl.bad = { ...rdl.bad, cue: "The back rounds to reach lower and the bar drifts out in front of the legs. The stretch leaves the hamstrings and goes to the spine." };
    rdl.animation = { ...(rdl.animation || {}), tempo: DOWN_FIRST };
    rdl.phaseTimeline = TL(DOWN_FIRST, ["Stand tall", "Hips back, bar down the thighs", "Hamstring stretch", "Hips forward", "Lockout"]);
    setForm("Romanian deadlift", { detail: "Your back rounds to reach lower and the bar drifts away from your legs.",
      fix: "Push the hips back, keep the bar touching your thighs and stop when your hamstrings stretch, usually just below the knee." });
  }

  // Stiff-leg: knees nearly straight (about 15 degrees) the whole rep; the trunk hinges almost to
  // horizontal and the bar goes lower (mid-shin), a little in front of the legs.
  const sldl = byName("Stiff-leg deadlift");
  if (sldl) {
    Object.assign(sldl.figure3d, {
      bar: { platform: true }, keysEase: "spline",
      a: { ...S0, x: 104, ua: 166, fa: 166 },
      keys: [{ at: 0.45, shin: -4, thigh: -17, torso: 44, neck: 38, ua: 185, fa: 185 }],
      b: { ...S0, x: 104, shin: -8, thigh: -23, torso: 84, neck: 76, ua: 191, fa: 191 }
    });
    sldl.bad3d = { keys: [{ torso: 50, bend: 8, neck: 62 }], b: { torso: 84, bend: 14, neck: 110, ua: 186, fa: 186 } };
    sldl.animation = { ...(sldl.animation || {}), tempo: DOWN_FIRST };
    sldl.phaseTimeline = TL(DOWN_FIRST, ["Stand tall", "Hinge, knees stay almost straight", "Bottom stretch", "Hips forward", "Lockout"]);
  }

  // Sumo deadlift (new): feet wide with the toes turned out, knees pushed out over the toes, hands
  // inside the knees, a more upright trunk with the hips closer to the bar; the bar starts on the floor.
  const SU_A = { x: 96, y: 186, shin: 26.4, thigh: -72.9, torso: 51.1, neck: 42, ua: 182, fa: 182 };
  const SU_B = { ...S0, x: 96, ua: 166, fa: 166 };
  if (!byName("Sumo deadlift")) {
    EXERCISES.push({
      name: "Sumo deadlift", group: "back", categories: ["glutes", "legs"], equipment: "Barbell", equip: "barbell",
      setup: "Barbell + bumper plates on a platform", difficulty: "intermediate", movementType: "compound", pattern: "hinge",
      sets: 4, reps: "4–6", rest: 180,
      primary: ["glutes", "quads", "hamstrings"], secondary: ["lower-back", "traps", "forearms", "upper-back"], stabilizers: ["abs", "obliques"],
      anatomy: { primary: ["Gluteus maximus", "Quadriceps", "Adductor magnus", "Hamstrings"], secondary: ["Erector spinae", "Trapezius", "Forearm flexors", "Upper back"] },
      activation: { glutes: 90, quads: 75, hamstrings: 70, "lower-back": 65, traps: 55, forearms: 60, "upper-back": 50, abs: 45 },
      movement: "Wide stance: the knees push out and the hips drive forward to stand up with the bar",
      aliases: ["Sumo pull"],
      phases: ["Setup: wide stance, toes out, shins to the bar", "Grip: hands inside the knees, arms straight down",
        "Brace: chest up, hips close to the bar, lats tight", "Drive: push the knees out and the floor away", "Lockout: hips through, stand tall, then lower with control"],
      instructions: ["Stand with your feet wide and toes turned out about 30 to 45 degrees, the bar over your mid-foot.",
        "Bend down and grip the bar with your hands inside your knees, arms hanging straight.",
        "Push your knees out over your toes, bring your hips toward the bar and lift your chest so your back is flat.",
        "Brace, then push the floor apart and away; the bar drags up your legs in a straight line.",
        "Finish standing tall with the hips through, then lower the bar the same way, hips back and knees out."],
      cues: ["Knees out over the toes", "Hips close to the bar", "Chest up, back flat", "Push the floor apart"],
      mistakes: ["Knees caving in", "Hips shooting up first", "Rounded lower back", "Bar drifting away from the legs"],
      formChecks: ["Spine position", "Knee alignment", "Bar over midfoot", "Hip position", "Lockout"], faultCheck: "Spine position",
      alternatives: ["Deadlift", "Sumo squat", "Romanian deadlift"],
      athlete: "female",
      good: { cue: "Wide stance, knees out over the toes, hips close to the bar, chest up. Push the floor apart.", highlight: ["knee", "spine"] },
      bad: { cue: "The lower back rounds and the bar drifts forward off the legs, so the spine takes the load instead of the hips and legs.", highlight: ["spine", "back"] },
      figure: { load: { type: "barbell", r: 22 }, hold: 1, a: { ...SU_A }, b: { ...SU_B } },
      figure3d: {
        kit: "barbell", bar: { platform: true, fromFloor: true, bumper: true }, keysEase: "spline",
        stance: { w: 32, toe: 42 },
        a: { ...SU_A },
        keys: [{ at: 0.4, shin: 21, thigh: -50.3, torso: 40.6, neck: 34, ua: 180, fa: 180 },
          { at: 0.72, shin: 11, thigh: -31.6, torso: 30.7, neck: 24, ua: 177, fa: 177 }],
        b: { ...SU_B }
      },
      bad3d: { a: { torso: 51, bend: 12, neck: 84, ua: 176, fa: 176 }, keys: [{ torso: 42, bend: 10, neck: 66, ua: 176, fa: 176 }, { bend: 5, neck: 34 }], b: { bend: 2 } },
      animation: { driver: "keys", kit: "barbell", contact: { hands: "both", feet: "planted", implement: "one" }, tempo: UP_FIRST },
      phaseTimeline: TL(UP_FIRST, ["Wide set up, hands inside the knees", "Push the floor apart", "Lockout", "Hips back, lower with control", "Bar on the floor"]),
      camera: { view: "threeQuarter" }
    });
  }
  if (typeof FORM !== "undefined") FORM["Sumo deadlift"] = {
    checks: ["Knees out over the toes", "Flat back", "Bar close", "Hips through at the top"],
    error: { type: "posture", joint: "spine", title: "Back rounds, bar drifts away",
      detail: "Your lower back rounds and the bar swings forward away from your legs as it leaves the floor.",
      fix: "Sit the hips closer to the bar, push the knees out, lift the chest and keep the bar dragging up your legs.",
      why: "In the sumo pull the upright trunk is what takes stress off the lower back; once the back rounds and the bar drifts forward, the spine takes the load the hips and legs should carry.",
      compensate: ["lower-back"] },
    scores: { posture: 54, alignment: 84, range: 92, tempo: 88, stability: 72, activation: 78 }
  };
  const dlAlt = dl && dl.alternatives; if (dlAlt && !dlAlt.includes("Sumo deadlift")) dlAlt.push("Sumo deadlift");

  // ----- Squats -----
  // Goblet squat mistake: the heels lift and the weight rolls onto the toes as the knees shoot forward.
  const gob = byName("Goblet squat");
  if (gob) {
    gob.bad3d = { b: { heel: 16, shin: 40, thigh: -84, torso: 22, neck: 12 } };
    gob.bad = { ...gob.bad, cue: "The heels lift off the floor and the weight rolls onto the toes as the knees shoot forward, so balance and the glutes are lost.", highlight: ["ankle", "knee"] };
    setForm("Goblet squat", { type: "alignment", joint: "ankle", title: "Heels lift off the floor",
      detail: "Your heels come up at the bottom and your weight rolls onto your toes.",
      fix: "Keep the whole foot down, push the hips back as you sit and let the dumbbell counterbalance you; widen the stance slightly if the ankles are stiff.",
      why: "With the heels up the knees take the load, the glutes do less and balance gets shaky; under heavier loads it strains the knees.",
      compensate: ["quads", "calves"] });
  }
  // Bodyweight squat mistake (knees caving in) now shows: the engine turns tracking knees by kneeOut.
  const bws = byName("Bodyweight squat");
  if (bws) bws.bad3d = { b: { kneeOut: -12 } };

  // ----- Push-ups -----
  // Push-up mistake: the hips sag; the shoulders stay over the hands so the hands stay planted
  // (the old sag pose lifted the hands about 15 cm off the floor).
  const pu = byName("Push-up");
  if (pu) {
    pu.bad = { ...pu.bad, a: { shin: 80, thigh: 80, torso: 61, neck: 65 }, b: { shin: 92, thigh: 92, torso: 86, neck: 89 } };
    pu.bad3d = { a: { shin: 80, thigh: 80, torso: 61, neck: 65 }, b: { shin: 92, thigh: 92, torso: 86, neck: 89 } };
  }
  // Incline push-up mistake: elbows flared straight out to the sides (about 80-90 degrees).
  const ipu = byName("Incline push-up");
  if (ipu) {
    ipu.bad3d = { a: { pole: [-0.05, -0.2, 1] }, b: { pole: [-0.05, -0.2, 1] } };
    ipu.bad = { cue: "The elbows flare straight out to the sides, which jams the front of the shoulders and takes work off the chest and triceps.", highlight: ["elbow", "shoulder"] };
    setForm("Incline push-up", { type: "alignment", joint: "elbow", title: "Elbows flared out",
      detail: "Your elbows point straight out to the sides as you lower.",
      fix: "Tuck the elbows to about 45 degrees from your body, as if pointing them toward your hips.",
      why: "Flared elbows put the shoulder joint in a pinched position at the bottom and shorten the range the chest works through; it is a common source of front-shoulder pain.",
      compensate: ["shoulders"] });
  }

  // ----- Lunges -----
  // Walking lunge: now alternates legs (right step, back to standing, left step), still in place.
  // The hips follow an explicit path (anchor "hip") and both feet are placed by toe targets, so the
  // rear foot stays on its ball with the heel up and the front foot lands and stays put.
  const wl = byName("Walking lunge");
  if (wl) {
    const T0 = [139.5, 193];
    // Hip path and leg angles of the round-5 right-leg lunge (step, land, lower), solved in 2D.
    const P = [
      { x: 120, y: 102, torso: 0, neck: 0, shin: 0, thigh: 0, foot: 90, t2: 180, s2: 180, f2: 90, toe: T0 },
      { x: 148, y: 105, torso: 3, neck: 3, thigh: -41.1, shin: 16.1, foot: 80, t2: 190.9, s2: 207, f2: 97, toe: [184.4, 180.5] },
      { x: 171, y: 113, torso: 4, neck: 4, shin: -21.6, thigh: -41.5, foot: 72, t2: 196.1, s2: 234.2, f2: 117, toe: [235, 184.1] },
      { x: 177, y: 126, torso: 5, neck: 5, shin: 0.9, thigh: -64.6, foot: 90, t2: 185.2, s2: 261.8, f2: 138, toe: [233.8, 193] },
      { x: 180, y: 139, torso: 6, neck: 6, shin: 10, thigh: -82.3, foot: 90, t2: 182.2, s2: 281.8, f2: 154, toe: [233.8, 193] }
    ];
    const R = (q) => ({ anchor: "hip", x: q.x, y: q.y, torso: q.torso, neck: q.neck, shin: q.shin, thigh: q.thigh, foot: q.foot, t2: q.t2, s2: q.s2, f2: q.f2, toeR: q.toe, toeL: T0 });
    // Left leg forward: the same lunge with the legs swapped (thigh = t2 - 180, shin = s2 - 180).
    const L = (q) => ({ anchor: "hip", x: q.x, y: q.y, torso: q.torso, neck: q.neck, shin: q.s2 - 180, thigh: q.t2 - 180, foot: q.f2,
      t2: q.thigh + 180, s2: q.shin + 180, f2: q.foot, toeR: T0, toeL: q.toe });
    const seq = [1, 2, 3, 4, 3, 2, 1];
    const at = [0.07, 0.13, 0.19, 0.25, 0.31, 0.37, 0.43];
    const keys = [...seq.map((i, n) => ({ at: at[n], ...R(P[i]) })), { at: 0.5, ...R(P[0]) }, ...seq.map((i, n) => ({ at: at[n] + 0.5, ...L(P[i]) }))];
    Object.assign(wl.figure3d, { keysEase: "spline", a: { ...S0, ...R(P[0]), ua: 180, fa: 180 }, keys, b: { ...S0, ...R(P[0]), ua: 180, fa: 180 } });
    // Per leg: step out, land and lower under control, pause, drive up on the front foot, step back.
    const tp = { ms: 9600, segs: [[0.03, 0, 0], [0.11, 0, 0.13], [0.25, 0.13, 0.25, "ecc"], [0.29, 0.25, 0.25], [0.37, 0.25, 0.31, "con"], [0.49, 0.31, 0.5], [0.53, 0.5, 0.5],
      [0.61, 0.5, 0.63], [0.75, 0.63, 0.75, "ecc"], [0.79, 0.75, 0.75], [0.87, 0.75, 0.81, "con"], [0.99, 0.81, 1], [1, 1, 1]] };
    wl.animation = { ...(wl.animation || {}), tempo: tp };
    wl.phaseTimeline = TL(tp, ["Stand", "Right leg steps out", "Lower: back knee toward the floor", "Bottom", "Drive up", "Step back", "Switch legs",
      "Left leg steps out", "Lower: back knee toward the floor", "Bottom", "Drive up", "Step back", "Stand"]);
    wl.demo = "beta";
    wl.demoNote = "Alternating legs shown in place: each foot steps forward and drives back to the start instead of travelling down the room.";
    // Mistake: the front knee caves in toward the midline as the body lowers (both legs).
    const bk = keys.map(() => ({}));
    [[2, -10], [3, -17], [4, -10]].forEach(([i, v]) => { bk[i] = { kneeOutR: v }; bk[i + 8] = { kneeOutL: v }; });
    wl.bad3d = { keys: bk, b: {} };
    wl.bad = { cue: "The front knee caves in toward the midline as you lower, twisting the knee and taking the work off the glutes.", highlight: ["knee"] };
    setForm("Walking lunge", { type: "alignment", joint: "knee", title: "Front knee caves in",
      detail: "Your front knee drifts inward past your big toe as you lower into the lunge.",
      fix: "Keep the front knee pointing over the second toe; push the knee slightly out and keep weight through the whole front foot.",
      why: "A caving knee twists the knee joint under load and lets the glutes switch off, so the knee and hip take strain they are not built for.",
      compensate: ["quads"] });
  }

  // Reverse lunge / Bulgarian split squat: the hanging dumbbells sat ~2 cm inside the female
  // athlete's rear thigh at the bottom; abd 11 -> 8 clears it (audit: 0 cm both athletes).
  ["Reverse lunge", "Bulgarian split squat"].forEach((n) => { const e = byName(n); if (e && e.figure3d && (e.figure3d.abd || 0) > 8) e.figure3d.abd = 8; });

  // ----- Curls -----
  // Dumbbell curl mistake: swinging. The hips hinge at the bottom, then the trunk throws back and
  // the elbows swing forward to heave the dumbbells up.
  const dc = byName("Dumbbell curl");
  if (dc) {
    dc.bad3d = { a: { torso: 7, neck: 6, ua: 184 }, b: { torso: -14, neck: -10, ua: 150, fa: 14 } };
    dc.bad = { cue: "The torso swings back and the elbows drift forward to heave the dumbbells up, so momentum and the shoulders do the work.", highlight: ["spine", "upperArm"] };
    setForm("Dumbbell curl", { type: "posture", joint: "spine", title: "Swinging the weight up",
      detail: "Your body rocks back and your elbows swing forward on every curl.",
      fix: "Stand tall with a braced core, pin the elbows by your sides and lower for a slow count of two to three.",
      why: "Swinging uses the hips and front shoulders to start the weight, so the biceps skip the hardest part of the curl and the lower back takes a jolt each rep.",
      compensate: ["shoulders", "lower-back"] });
  }
  // Alternating curl: right, then left, each with a slower lowering than the lift; it used to curl
  // the right arm twice per cycle and each curl took about 0.7 s up and down.
  const ac = byName("Alternating curl");
  if (ac) {
    const DN = { ua: 178, fa: 175 }, UP = { ua: 175, fa: 30 };
    Object.assign(ac.figure3d, {
      abd: 3, // was 6: the hanging dumbbell sat ~2 cm inside her thigh (audit, female)
      keysEase: "linear",
      a: { ...S0, ...DN, arm2: { ...DN } },
      keys: [{ at: 0.25, ...UP, arm2: { ...DN } }, { at: 0.5, ...DN, arm2: { ...DN } }, { at: 0.75, ...DN, arm2: { ...UP } }],
      b: { ...S0, ...DN, arm2: { ...DN } }
    });
    const SW = { torso: -12, neck: -8 };
    ac.bad3d = { keys: [{ ...SW, ua: 160 }, {}, { ...SW, arm2: { ua: 160, fa: 30 } }], b: {} };
    const tp = { ms: 7600, segs: [[0.04, 0, 0], [0.2, 0, 0.25, "con"], [0.26, 0.25, 0.25], [0.46, 0.25, 0.5, "ecc"], [0.54, 0.5, 0.5],
      [0.7, 0.5, 0.75, "con"], [0.76, 0.75, 0.75], [0.96, 0.75, 1, "ecc"], [1, 1, 1]] };
    ac.animation = { ...(ac.animation || {}), tempo: tp };
    ac.phaseTimeline = TL(tp, ["Start", "Right curl", "Squeeze", "Lower right slowly", "Switch", "Left curl", "Squeeze", "Lower left slowly", "Reset"]);
  }

  // ----- Presses -----
  // Overhead press: lockout over the shoulders and mid-foot (it finished about 6 cm behind it).
  const ohp = byName("Overhead press");
  if (ohp) ohp.figure3d.b = { ...ohp.figure3d.b, ua: 14, fa: -1 };
  // Seated presses mistake: the hips slide forward on the seat and the lower back arches off the
  // pad (the upper back stays on it), turning the press into an incline press. The legs re-solve so
  // the feet stay planted.
  const ARCH = { x: 90, shin: -3.7, thigh: -91, torso: -11, bend: -9, neck: -6 };
  const dsp = byName("Dumbbell shoulder press");
  if (dsp) {
    dsp.bad3d = { a: { ...ARCH }, b: { ...ARCH } };
    dsp.bad = { cue: "The hips slide forward and the lower back arches off the pad to get the dumbbells up, which squeezes the lumbar spine.", highlight: ["spine", "hip"] };
    setForm("Dumbbell shoulder press", { type: "posture", joint: "spine", title: "Lower back arches off the pad",
      detail: "Your hips slide forward and your lower back arches away from the bench as you press.",
      fix: "Sit back against the pad, ribs down, glutes and abs braced; use a weight you can press without leaning back.",
      why: "Arching turns the shoulder press into an incline press, so the upper chest takes over and the lumbar spine is pressed into extension under load.",
      compensate: ["lower-back", "chest"] });
  }
  const arn = byName("Arnold press");
  if (arn) {
    arn.bad3d = { a: { ...ARCH }, keys: [{ torso: -11, bend: -9, neck: -6 }], b: { ...ARCH } };
    arn.bad = { ...arn.bad, cue: "The hips slide forward and the lower back arches off the pad to push the weight up, compressing the lumbar spine." };
    setForm("Arnold press", { detail: "Your hips slide forward and your lower back arches away from the pad as you press.",
      fix: "Sit back against the pad with ribs down and press with the shoulders only; lighten the dumbbells if you have to lean back." });
  }

  // ----- Planks -----
  // Plank mistake: the hips sag while the elbows stay planted under the shoulders.
  const pl = byName("Plank");
  if (pl) pl.bad = { ...pl.bad, a: { shin: 84, thigh: 84, torso: 68, neck: 72 }, b: { shin: 85, thigh: 85, torso: 67, neck: 71 } };
})();

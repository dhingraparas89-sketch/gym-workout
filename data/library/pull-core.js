// pull-core exercises (see data/library/README in data/exercises.js header for the schema).
// Back: assisted pull-up, dumbbell row, T-bar row, single-arm cable row, straight-arm pulldown.
// Core: side plank, crunch, knee raise, Russian twist, ab wheel rollout.
// Kits named pc* live in js/kits/pull-core.js.

EXERCISES.push(
  // ---------- Back ----------
  {
    name: "Assisted pull-up", group: "back", categories: [],
    equipment: "Assisted pull-up machine", equip: "machine", setup: "Assisted pull-up machine: kneeling pad on a counterweight lever, weight stack, high handles",
    difficulty: "beginner", movementType: "compound", sets: 3, reps: "8–12", rest: 90,
    primary: ["lats"], secondary: ["biceps", "upper-back", "rear-delts", "forearms"],
    anatomy: { primary: ["Latissimus dorsi"], secondary: ["Biceps brachii & brachialis", "Rhomboids & middle trapezius", "Posterior deltoid", "Forearm flexors"] },
    activation: { lats: 88, biceps: 58, "upper-back": 62, "rear-delts": 38, forearms: 45, traps: 30, abs: 20 },
    movement: "The arms pull down and back, lifting the body to the handles while the pad helps",
    phases: [
      "Start: kneel on the pad, hands on the high handles, arms fully straight and shoulders long.",
      "Pull: draw the shoulder blades down, then drive the elbows down toward the ribs.",
      "Top: chin clears the handles, chest up, elbows tucked by the sides.",
      "Lower: control the pad back down for 2–3 seconds.",
      "Return: reach a full hang with straight arms before the next rep."
    ],
    cues: ["Shoulders down and away from the ears before the arms bend.", "Drive the elbows to the back pockets.", "Lower all the way to straight arms every rep."],
    mistakes: ["Half reps that never reach straight arms at the bottom.", "Shrugging the shoulders up toward the ears.", "Using so much assistance that the pad throws you up."],
    formChecks: ["Range of motion", "Shoulder position", "Elbow path", "Tempo", "Stability"],
    athlete: "female",
    good: { cue: "Start from straight arms, pull until the chin clears the handles, and lower under control.", highlight: ["arm"] },
    bad: { cue: "Half reps: the elbows never straighten at the bottom and the chin stops below the handles.", highlight: ["elbow", "upperArm"],
      a: { ua: 96, fa: 18 }, b: { ua: 128, fa: 6 } },
    figure3d: { kit: "pcAssistPullup", hold: "hands", path: "neck", ik: { grip: 44, pole: [0.2, -0.6, 1] }, view: [0.75, 0.1] },
    figure: { noFloor: true, armsOut: true, abd: 28, props: [{ line: [40, 14, 170, 14], w: 6, axis: "z" }, { rect: [56, 172, 52, 7] }], load: { type: "none" },
      a: { x: 100, y: 14, anchor: "hand", foot: -110, shin: 90, thigh: -4, torso: -4, neck: 0, ua: 4, fa: 0 },
      b: { x: 100, y: 14, anchor: "hand", foot: -110, shin: 90, thigh: -8, torso: -8, neck: 0, ua: 172, fa: -8 } }
  },
  {
    name: "Dumbbell row", group: "back", categories: [],
    equipment: "Dumbbell + flat bench", equip: "dumbbell", setup: "Flat bench: one knee and one hand on the bench, one dumbbell",
    difficulty: "beginner", movementType: "compound", sets: 3, reps: "10 each arm", rest: 75,
    primary: ["lats", "upper-back"], secondary: ["rear-delts", "biceps", "traps", "forearms"],
    anatomy: { primary: ["Latissimus dorsi", "Rhomboids & middle trapezius"], secondary: ["Posterior deltoid", "Biceps brachii", "Lower trapezius", "Forearm flexors"] },
    activation: { lats: 90, "upper-back": 74, "rear-delts": 48, biceps: 55, traps: 38, forearms: 40, obliques: 25, "lower-back": 20 },
    movement: "One elbow pulls back past the body while the braced torso stays square",
    phases: [
      "Start: one knee and the same-side hand on the bench, other foot planted, back flat, dumbbell hanging under the shoulder.",
      "Pull: drive the elbow up and back toward the hip.",
      "Top: dumbbell beside the lower ribs, shoulder blade squeezed back, chest still square to the bench.",
      "Lower: let the dumbbell down under control until the arm is straight.",
      "Return: let the shoulder blade reach forward a little before the next rep."
    ],
    cues: ["Back flat and parallel to the bench; hips and shoulders stay square.", "Pull the elbow to the hip, not the hand to the chest.", "Lower slowly to a full stretch."],
    mistakes: ["Twisting the torso open to swing the dumbbell up.", "Shrugging the shoulder up toward the ear.", "Cutting the stretch short at the bottom."],
    formChecks: ["Spine position", "Hip position", "Elbow path", "Range of motion", "Tempo"],
    athlete: "female",
    good: { cue: "Torso square and still; the elbow drives back to the hip and the dumbbell lowers to a full stretch.", highlight: ["spine", "elbow"] },
    bad: { cue: "The torso twists open and rises to heave the dumbbell up, so the back stops doing the work.", highlight: ["spine", "shoulder"],
      a: { torso: 72, neck: 80 }, b: { torso: 54, neck: 60 } },
    // 3D: staggered stance, left knee (t2/s2/f2) and left hand (arm2) braced on the bench.
    figure3d: { kit: "pcDbRow", grip: "neutral", legAbd: 12, view: [0.95, 0.12],
      a: { x: 100, y: 186, shin: 6, thigh: -6, torso: 78, neck: 86, ua: 180, fa: 178, t2: 202, s2: 270, f2: -110, arm2: { ua: 148, fa: 150 } },
      b: { x: 100, y: 186, shin: 6, thigh: -6, torso: 78, neck: 86, ua: 262, fa: 176, t2: 202, s2: 270, f2: -110, arm2: { ua: 148, fa: 150 } } },
    // twist: trunk rotation about the spine (needs the figure3d.js change in the report; ignored until then).
    bad3d: { a: { torso: 72, neck: 80, twist: 0 }, b: { torso: 62, neck: 68, twist: -30 } },
    figure: { props: [{ rect: [40, 140, 112, 8] }, { line: [56, 148, 56, 188], w: 5 }, { line: [136, 148, 136, 188], w: 5 }], load: { type: "dumbbell" },
      a: { x: 100, y: 186, shin: 6, thigh: -6, torso: 78, neck: 86, ua: 180, fa: 178, t2: 202, s2: 270, f2: -110 },
      b: { x: 100, y: 186, shin: 6, thigh: -6, torso: 78, neck: 86, ua: 262, fa: 176, t2: 202, s2: 270, f2: -110 } }
  },
  {
    name: "T-bar row", group: "back", categories: [],
    equipment: "Landmine barbell", equip: "barbell", setup: "Landmine T-bar: barbell anchored on the floor, plates on the free end, close-grip V handle",
    difficulty: "intermediate", movementType: "compound", sets: 4, reps: "8–10", rest: 120,
    primary: ["upper-back", "lats"], secondary: ["rear-delts", "biceps", "lower-back", "traps"],
    anatomy: { primary: ["Rhomboids & middle trapezius", "Latissimus dorsi"], secondary: ["Posterior deltoid", "Biceps brachii", "Erector spinae", "Trapezius"] },
    activation: { "upper-back": 88, lats: 80, "rear-delts": 52, biceps: 55, "lower-back": 50, traps: 48, forearms: 40, hamstrings: 25, glutes: 22 },
    movement: "The elbows pull back past the body while the hinged torso stays still",
    phases: [
      "Start: straddle the bar, hinge to about 45°, flat back, arms straight under the shoulders holding the V handle.",
      "Pull: drive the elbows back and up along the sides.",
      "Top: the handle touches the lower chest, shoulder blades squeezed together.",
      "Lower: let the bar down under control until the arms are straight.",
      "Return: keep the hinge and the flat back for the next rep."
    ],
    cues: ["Chest proud and back flat; the torso angle doesn't change.", "Pull the handle to the lower chest, elbows close to the ribs.", "Let the shoulder blades stretch forward at the bottom."],
    mistakes: ["Rounding the lower back to reach the bar.", "Standing up and heaving the bar with the hips.", "Cutting the pull short before the handle reaches the chest."],
    formChecks: ["Spine position", "Hip position", "Elbow path", "Range of motion", "Tempo"],
    athlete: "male",
    good: { cue: "Hinge with a flat back and row the handle to the lower chest without moving the torso.", highlight: ["spine", "elbow"] },
    bad: { cue: "The lower back rounds under the load, so the spine takes strain the back muscles should carry.", highlight: ["spine", "back"],
      a: { torso: 60, bend: 14, neck: 92 }, b: { torso: 56, bend: 11, neck: 86 } },
    figure3d: { kit: "pcTBar", ik: { grip: 5, pole: [-1, -0.25, 0.35] }, grip: "neutral", legAbd: 13 },
    figure: { load: { type: "barbell", r: 16 },
      a: { x: 96, y: 186, shin: 18, thigh: -42, torso: 40, neck: 50, ua: 166, fa: 170 },
      b: { x: 96, y: 186, shin: 18, thigh: -42, torso: 40, neck: 50, ua: 226, fa: 142 } }
  },
  {
    name: "Single-arm cable row", group: "back", categories: [],
    equipment: "Cable", equip: "cable", setup: "Cable tower, D-handle at mid height, split stance",
    difficulty: "beginner", movementType: "compound", sets: 3, reps: "12 each arm", rest: 60,
    primary: ["lats", "upper-back"], secondary: ["rear-delts", "biceps", "obliques"],
    anatomy: { primary: ["Latissimus dorsi", "Rhomboids & middle trapezius"], secondary: ["Posterior deltoid", "Biceps brachii", "Internal & external obliques"] },
    activation: { lats: 84, "upper-back": 75, "rear-delts": 50, biceps: 50, obliques: 40, forearms: 35, traps: 32, glutes: 20 },
    movement: "One arm pulls the handle back to the ribs while the trunk resists turning",
    phases: [
      "Start: split stance facing the tower, slight forward lean, working arm reaching long toward the pulley.",
      "Pull: draw the shoulder blade back, then drive the elbow past the ribs.",
      "End: handle beside the lower ribs, elbow close, chest tall.",
      "Return: let the arm reach forward slowly until the lat stretches.",
      "Reset: the torso angle and hips stay put rep after rep."
    ],
    cues: ["Lead with the elbow and keep it close to the side.", "Hips and torso stay still; only the arm and shoulder blade move.", "Reach long at the front for a full stretch."],
    mistakes: ["Rocking the torso back to yank the handle.", "Twisting the hips toward the cable.", "Shrugging the shoulder as the elbow comes back."],
    formChecks: ["Spine position", "Hip position", "Elbow path", "Range of motion", "Stability"],
    athlete: "male",
    good: { cue: "Hold the forward lean; the elbow drives back past the ribs while the torso stays still.", highlight: ["elbow", "upperArm"] },
    bad: { cue: "The torso rocks back to yank the handle, so momentum and the lower back move the weight.", highlight: ["spine", "hip"],
      a: { torso: 34, neck: 30 }, b: { torso: -6, neck: -8 } },
    // 3D: one hand on a single D-handle, the other arm (arm2) hangs at the side.
    figure3d: { kit: "pcCableRow1", grip: "neutral", view: [0.55, 0.12],
      a: { x: 80, y: 186, shin: 22, thigh: 14, torso: 20, neck: 14, ua: 112, fa: 108, t2: 157, s2: 186, f2: 90, arm2: { ua: 172, fa: 164 }, twist: 8 },
      b: { x: 80, y: 186, shin: 22, thigh: 14, torso: 20, neck: 14, ua: 228, fa: 112, t2: 157, s2: 186, f2: 90, arm2: { ua: 172, fa: 164 }, twist: 0 } },
    bad3d: { a: { torso: 34, neck: 30 }, b: { torso: -6, neck: -8 } },
    figure: { props: [{ line: [196, 20, 196, 188], w: 6 }], load: { type: "cable", from: [192, 78] },
      a: { x: 80, y: 186, shin: 22, thigh: 14, torso: 20, neck: 14, ua: 112, fa: 108, t2: 157, s2: 186, f2: 90 },
      b: { x: 80, y: 186, shin: 22, thigh: 14, torso: 20, neck: 14, ua: 228, fa: 112, t2: 157, s2: 186, f2: 90 } }
  },
  {
    name: "Straight-arm pulldown", group: "back", categories: [],
    equipment: "Cable", equip: "cable", setup: "Cable tower, high pulley, straight bar",
    difficulty: "beginner", movementType: "isolation", sets: 3, reps: "12–15", rest: 60,
    primary: ["lats"], secondary: ["triceps", "rear-delts", "abs"],
    anatomy: { primary: ["Latissimus dorsi", "Teres major"], secondary: ["Triceps (long head)", "Posterior deltoid", "Rectus abdominis"] },
    activation: { lats: 92, "upper-back": 35, triceps: 35, "rear-delts": 30, abs: 30, forearms: 25 },
    movement: "The straight arms sweep down from overhead to the thighs",
    phases: [
      "Start: face the high pulley, hinge slightly, arms straight up in front holding the bar.",
      "Sweep: pull the bar down in an arc with the elbows soft and fixed.",
      "Bottom: the bar touches the thighs, lats squeezed, ribs down.",
      "Return: let the arms rise slowly until you feel the lats stretch.",
      "Reset: keep the same hip hinge and elbow angle for the next rep."
    ],
    cues: ["Lock a soft bend in the elbows and keep it.", "Push the bar down and back toward the thighs.", "Torso still; only the shoulders move."],
    mistakes: ["Bending the elbows so it turns into a triceps pushdown.", "Rocking the torso to drive the bar down.", "Shrugging the shoulders up at the top."],
    formChecks: ["Elbow angle", "Range of motion", "Spine position", "Tempo", "Stability"],
    athlete: "female",
    good: { cue: "Arms stay long with a soft elbow; sweep the bar from overhead down to the thighs.", highlight: ["arm"] },
    bad: { cue: "The elbows bend and straighten, so the triceps push the bar instead of the lats pulling it.", highlight: ["elbow", "forearm"],
      a: { ua: 52, fa: -26 }, b: { ua: 150, fa: 152 } },
    figure3d: { kit: "pcStraightBar", grip: "over" },
    figure: { props: [{ line: [196, 6, 196, 188], w: 6 }], load: { type: "cable", from: [192, 14] },
      a: { x: 96, y: 186, shin: 10, thigh: -16, torso: 24, neck: 20, ua: 30, fa: 24 },
      b: { x: 96, y: 186, shin: 10, thigh: -16, torso: 24, neck: 20, ua: 166, fa: 162 } }
  },

  // ---------- Core ----------
  {
    name: "Side plank", group: "core", categories: ["glutes"],
    equipment: "Mat", equip: "bodyweight", setup: "Exercise mat, forearm support",
    difficulty: "beginner", movementType: "isolation", sets: 3, reps: "30 s each side", rest: 45,
    primary: ["obliques"], secondary: ["abs", "glutes", "shoulders", "lower-back"],
    anatomy: { primary: ["External & internal obliques"], secondary: ["Rectus abdominis & transversus", "Gluteus medius", "Deltoid & rotator cuff", "Quadratus lumborum"] },
    activation: { obliques: 88, abs: 55, glutes: 52, shoulders: 45, "lower-back": 40 },
    movement: "The trunk is held straight on its side against gravity",
    phases: [
      "Start: lie on one side, elbow under the shoulder, legs stacked.",
      "Lift: press the forearm into the mat and raise the hips off the floor.",
      "Hold: one straight line from head to feet, chest facing forward.",
      "Breathe: slow breaths while the hips stay high and square.",
      "Lower: set the hips down with control, then switch sides."
    ],
    cues: ["Elbow right under the shoulder.", "Hips high and stacked; don't let them roll forward.", "Squeeze the glutes and keep one straight line."],
    mistakes: ["The hips and chest roll forward toward the floor.", "The hips sag toward the mat.", "The shoulder collapses with the elbow out of line."],
    formChecks: ["Hip position", "Spine position", "Shoulder position", "Stability"],
    athlete: "female",
    good: { cue: "Hips high and stacked over each other, one straight line from head to feet.", highlight: ["spine", "hip"] },
    bad: { cue: "The hips and chest roll forward toward the floor, so the obliques let go and the shoulder takes the load.", highlight: ["hip", "spine"],
      a: { thigh: 74, torso: 70 }, b: { thigh: 74, torso: 70 } },
    // 3D: the body lies on its side (x3d roll, left forearm down, top hand on the hip). Without
    // that support the viewer falls back to a forearm plank.
    figure3d: { kit: "mat", hand: "open", view: [0.3, 0.2],
      a: { x: 36, y: 182, foot: 165, shin: 78, thigh: 78, torso: 78, neck: 82, ua: 180, fa: 90 },
      b: { x: 36, y: 182, foot: 165, shin: 79, thigh: 79, torso: 79, neck: 83, ua: 180, fa: 90 },
      x3d: {
        a: { x: 30, y: 180, foot: 164, shin: 74, thigh: 74, torso: 74, neck: 76, ua: -106, fa: -100, roll: -90, arm2: { ua: -112, fa: 164, abd: -88 } },
        b: { x: 30, y: 180, foot: 164, shin: 74, thigh: 74, torso: 74, neck: 76, ua: -106, fa: -100, roll: -90, arm2: { ua: -112, fa: 164, abd: -88 } } } },
    bad3d: { a: { shin: 84, thigh: 84, torso: 64 }, b: { shin: 85, thigh: 85, torso: 63 },
      x3d: { a: { roll: -58 }, b: { roll: -56 } } },
    figure: { hand: "open", load: { type: "none" },
      a: { x: 30, y: 182, foot: 164, shin: 74, thigh: 74, torso: 74, neck: 76, ua: 180, fa: 100 },
      b: { x: 30, y: 182, foot: 164, shin: 75, thigh: 75, torso: 75, neck: 77, ua: 180, fa: 100 } }
  },
  {
    name: "Crunch", group: "core", categories: [],
    equipment: "Mat", equip: "bodyweight", setup: "Exercise mat",
    difficulty: "beginner", movementType: "isolation", sets: 3, reps: "15–20", rest: 45,
    primary: ["abs"], secondary: ["obliques"],
    anatomy: { primary: ["Rectus abdominis"], secondary: ["External & internal obliques"] },
    activation: { abs: 88, obliques: 42 },
    movement: "The spine curls the ribs up toward the pelvis",
    phases: [
      "Start: lie on the mat, knees bent, feet flat, hands on the chest.",
      "Curl: breathe out and curl the head and shoulder blades off the mat.",
      "Top: ribs pulled toward the pelvis, lower back stays on the mat.",
      "Lower: uncurl one vertebra at a time.",
      "Return: shoulders touch down lightly before the next rep."
    ],
    cues: ["Curl the ribs toward the hips, not the chin to the chest.", "Keep a fist's space between chin and chest.", "Lower back stays pressed into the mat."],
    mistakes: ["Leading with the head and cranking the neck forward.", "Swinging up with momentum.", "Lifting so high the hip flexors take over."],
    formChecks: ["Neck position", "Spine curl", "Range of motion", "Tempo"],
    athlete: "male",
    good: { cue: "Curl the shoulder blades off the mat by shortening the abs; the head follows the spine.", highlight: ["spine"] },
    bad: { cue: "The head leads: the chin jams to the chest while the upper back barely curls.", highlight: ["neck", "head"],
      b: { torso: -80, bend: 2, neck: -12 } },
    figure3d: { kit: "mat", hand: "relaxed", grip: "neutral", ik: { grip: 5, pole: [-0.2, -0.6, 1] }, view: [0.9, 0.16] },
    figure: { hand: "open", load: { type: "none" },
      a: { x: 106, y: 186, foot: 90, shin: -30, thigh: -143, torso: -90, neck: -92, ua: 98, fa: -54 },
      b: { x: 106, y: 186, foot: 90, shin: -30, thigh: -143, torso: -64, bend: 8, neck: -48, ua: 124, fa: -28 } }
  },
  {
    name: "Knee raise", group: "core", categories: [],
    equipment: "Captain's chair", equip: "bodyweight", setup: "Captain's chair (vertical knee raise station) with back pad and forearm pads",
    difficulty: "beginner", movementType: "isolation", sets: 3, reps: "10–15", rest: 60,
    primary: ["abs"], secondary: ["obliques", "quads", "forearms"],
    anatomy: { primary: ["Rectus abdominis (lower fibers)"], secondary: ["External obliques", "Iliopsoas & rectus femoris (hip flexors)", "Forearm flexors"] },
    activation: { abs: 82, obliques: 45, quads: 35, forearms: 28, shoulders: 25, lats: 20 },
    movement: "The hips and lower spine curl the knees up toward the chest",
    phases: [
      "Start: back against the pad, forearms on the pads, legs hanging straight.",
      "Raise: bend the knees and lift them toward the chest.",
      "Top: knees above hip height, pelvis curled up off the pad's lower edge.",
      "Lower: let the legs down slowly without swinging.",
      "Return: legs hang still before the next rep."
    ],
    cues: ["Back flat on the pad the whole time.", "Curl the pelvis up at the top, not just the knees.", "Lower slowly; no swing."],
    mistakes: ["Arching off the back pad and swinging the legs.", "Stopping with the knees below the hips.", "Dropping the legs fast between reps."],
    formChecks: ["Back position", "Hip position", "Range of motion", "Tempo", "Stability"],
    athlete: "female",
    good: { cue: "Back stays on the pad; raise the knees above the hips and curl the pelvis up.", highlight: ["hip", "thigh"] },
    bad: { cue: "The lower back arches off the pad and the legs swing, so the hip flexors do the work.", highlight: ["spine", "hip"],
      a: { torso: -6, bend: -6 }, b: { thigh: -58, shin: -4, torso: -12, bend: -8, neck: -6 } },
    figure3d: { kit: "pcCaptainChair", grip: "neutral", path: ["ankleR"], view: [0.7, 0.12] },
    figure: { noFloor: true, props: [{ line: [78, 92, 132, 92], w: 6 }, { line: [80, 40, 80, 150], w: 7 }], load: { type: "none" },
      a: { x: 100, y: 64, anchor: "shoulder", foot: 150, shin: 0, thigh: 0, torso: 0, neck: 0, ua: 180, fa: 90 },
      b: { x: 100, y: 64, anchor: "shoulder", foot: 150, shin: -12, thigh: -102, torso: 0, bend: 5, neck: 4, ua: 180, fa: 90 } }
  },
  {
    name: "Russian twist", group: "core", categories: [],
    equipment: "Weight plate", equip: "bodyweight", setup: "Exercise mat, weight plate held in both hands",
    difficulty: "intermediate", movementType: "isolation", sets: 3, reps: "10 each side", rest: 45,
    primary: ["obliques"], secondary: ["abs", "quads", "lower-back"],
    anatomy: { primary: ["External & internal obliques"], secondary: ["Rectus abdominis", "Iliopsoas & rectus femoris (hip flexors)", "Erector spinae"] },
    activation: { obliques: 90, abs: 68, quads: 25, "lower-back": 30, shoulders: 22 },
    movement: "The ribcage turns side to side over a still pelvis",
    phases: [
      "Start: sit on the mat, lean back about 45°, chest up, feet just off the floor, plate at the chest.",
      "Turn: rotate the ribcage to one side and bring the plate beside the hip.",
      "Pass: turn back through the middle with control.",
      "Other side: rotate to the other hip, knees and feet staying still.",
      "Reset: keep the lean and the long spine for the next rep."
    ],
    cues: ["Turn the chest, not just the arms.", "Long spine; lean back from the hips.", "Knees and feet stay still while the ribcage turns."],
    mistakes: ["Rounding the back and slumping into the hips.", "Swinging only the arms while the chest stays put.", "Letting the knees sway side to side."],
    formChecks: ["Spine position", "Rotation", "Hip position", "Tempo", "Stability"],
    athlete: "male",
    good: { cue: "Lean back with a long spine and turn the whole ribcage from side to side.", highlight: ["spine"] },
    bad: { cue: "The back rounds and slumps, so the arms swing the plate while the obliques barely turn the trunk.", highlight: ["spine", "back"],
      a: { torso: -50, bend: 12, neck: -48 }, b: { torso: -50, bend: 12, neck: -48 } },
    // 3D: the trunk turns side to side (twist, needs the figure3d.js change in the report).
    // Without it the viewer shows the held lean.
    figure3d: { kit: "pcPlateTwist", ik: { grip: 11, pole: [-0.4, -0.7, 1] }, grip: "neutral", mat: true, view: [0.9, 0.18],
      a: { x: 90, y: 178, anchor: "hip", thigh: -118, shin: -64, foot: 40, torso: -40, neck: -22, ua: 152, fa: 68, twist: -42 },
      b: { x: 90, y: 178, anchor: "hip", thigh: -118, shin: -64, foot: 40, torso: -43, neck: -25, ua: 156, fa: 74, twist: 42 } },
    bad3d: { a: { torso: -50, bend: 12, neck: -48, twist: -12 }, b: { torso: -50, bend: 12, neck: -48, twist: 12 } },
    figure: { load: { type: "none" },
      a: { x: 90, y: 178, anchor: "hip", thigh: -118, shin: -64, foot: 40, torso: -40, neck: -22, ua: 152, fa: 68 },
      b: { x: 90, y: 178, anchor: "hip", thigh: -118, shin: -64, foot: 40, torso: -43, neck: -25, ua: 156, fa: 74 } }
  },
  {
    name: "Ab wheel rollout", group: "core", categories: [],
    equipment: "Ab wheel", equip: "bodyweight", setup: "Ab wheel on an exercise mat, kneeling",
    difficulty: "advanced", movementType: "compound", sets: 3, reps: "8–10", rest: 75,
    primary: ["abs"], secondary: ["obliques", "lats", "shoulders", "triceps"],
    anatomy: { primary: ["Rectus abdominis", "Transversus abdominis"], secondary: ["External obliques", "Latissimus dorsi", "Anterior deltoid", "Triceps brachii"] },
    activation: { abs: 95, obliques: 58, lats: 52, shoulders: 40, triceps: 32, "lower-back": 28, glutes: 30 },
    movement: "The trunk stays rigid while the arms roll out overhead and pull back",
    phases: [
      "Start: kneel on the mat, hands on the wheel under the shoulders, ribs down, glutes squeezed.",
      "Roll out: let the wheel travel forward as the hips and shoulders lower together.",
      "End: body long and nearly straight, arms reaching forward, back still flat.",
      "Pull back: press the wheel down and pull it back toward the knees with the abs.",
      "Return: finish kneeling tall over the wheel."
    ],
    cues: ["Ribs down and a slight round in the upper back.", "Hips move with the shoulders; don't let them drop.", "Only roll as far as the lower back stays flat."],
    mistakes: ["The lower back sags and arches at full extension.", "Piking the hips back instead of rolling out.", "Rolling farther than you can control."],
    formChecks: ["Spine position", "Hip position", "Range of motion", "Tempo", "Stability"],
    athlete: "male",
    good: { cue: "Hips and shoulders lower together; the back stays flat all the way out and back.", highlight: ["spine", "hip"] },
    bad: { cue: "At full extension the hips drop and the lower back arches, loading the spine instead of the abs.", highlight: ["spine", "back"],
      b: { thigh: 80, torso: 72, bend: -10, neck: 74 } },
    figure3d: { kit: "pcAbWheel", grip: "over", view: [0.6, 0.12] },
    figure: { load: { type: "none" },
      a: { x: 60, y: 181, anchor: "knee", foot: -110, shin: 90, thigh: 8, torso: 58, neck: 72, ua: 168, fa: 168 },
      b: { x: 60, y: 181, anchor: "knee", foot: -110, shin: 90, thigh: 62, torso: 75, neck: 82, ua: 112, fa: 114 } }
  }
);

Object.assign(FORM, {
  "Assisted pull-up": {
    checks: ["Full hang", "Chin over handles", "Shoulders down", "Controlled descent"],
    error: {
      type: "range", joint: "elbow",
      title: "Insufficient range of motion",
      detail: "Your elbows never straighten at the bottom and your chin stops below the handles.",
      fix: "Lower to straight arms every rep and pull until your chin clears the handles.",
      compensate: ["biceps"]
    },
    scores: { posture: 86, alignment: 84, range: 54, tempo: 80, stability: 85, activation: 70 }
  },
  "Dumbbell row": {
    checks: ["Square torso", "Flat back", "Elbow to hip", "Full stretch"],
    error: {
      type: "posture", joint: "spine",
      title: "Torso twisting to lift",
      detail: "Your torso twists open and rises to swing the dumbbell up.",
      fix: "Keep your hips and shoulders square to the bench and use a lighter dumbbell.",
      compensate: ["lower-back", "obliques"]
    },
    scores: { posture: 60, alignment: 62, range: 82, tempo: 72, stability: 66, activation: 70 }
  },
  "Single-arm cable row": {
    checks: ["Still torso", "Elbow close", "Full reach", "Square hips"],
    error: {
      type: "posture", joint: "hip",
      title: "Back angle is changing",
      detail: "Your torso rocks back on every rep to yank the handle.",
      fix: "Hold your forward lean and pull with the elbow only; lower the weight if needed.",
      compensate: ["lower-back"]
    },
    scores: { posture: 62, alignment: 80, range: 84, tempo: 70, stability: 64, activation: 72 }
  },
  "Side plank": {
    checks: ["Stacked hips", "Straight line", "Elbow under shoulder", "Steady breathing"],
    error: {
      type: "alignment", joint: "hip",
      title: "Hips rolling forward",
      detail: "Your hips and chest roll toward the floor instead of staying stacked.",
      fix: "Stack hip over hip and shoulder over shoulder, chest facing forward.",
      compensate: ["shoulders", "abs"]
    },
    scores: { posture: 74, alignment: 56, range: 88, tempo: 90, stability: 60, activation: 68 }
  },
  "Russian twist": {
    checks: ["Long spine", "Chest turns", "Still knees", "Controlled pace"],
    error: {
      type: "posture", joint: "spine",
      title: "Back rounding",
      detail: "Your back rounds and slumps and the arms swing the plate on their own.",
      fix: "Sit tall, lean back from the hips and turn your whole ribcage.",
      compensate: ["shoulders", "lower-back"]
    },
    scores: { posture: 56, alignment: 76, range: 64, tempo: 74, stability: 70, activation: 62 }
  },
  "T-bar row": {
    checks: ["Flat back", "Fixed hinge", "Handle to chest", "Elbows close"],
    error: {
      type: "posture", joint: "spine",
      title: "Lower back rounding",
      detail: "Your lower back rounds under the bar, so the spine takes the load.",
      fix: "Lighten the load, brace and keep your chest proud with a flat back.",
      compensate: ["lower-back"]
    },
    scores: { posture: 55, alignment: 80, range: 84, tempo: 82, stability: 70, activation: 72 }
  },
  "Straight-arm pulldown": {
    checks: ["Fixed elbows", "Full arc", "Still torso", "Shoulders down"],
    error: {
      type: "alignment", joint: "elbow",
      title: "Elbows bending",
      detail: "Your elbows bend and straighten, turning the move into a pushdown.",
      fix: "Lock a soft bend in the elbows and sweep from the shoulders only.",
      compensate: ["triceps"]
    },
    scores: { posture: 88, alignment: 58, range: 80, tempo: 86, stability: 86, activation: 66 }
  },
  "Crunch": {
    checks: ["Neutral neck", "Ribs to hips", "Lower back down", "Slow lowering"],
    error: {
      type: "posture", joint: "head",
      title: "Neck cranking forward",
      detail: "Your head leads and your chin jams toward your chest while the abs barely curl.",
      fix: "Keep a fist's space under the chin and curl from the ribs.",
      compensate: ["traps"]
    },
    scores: { posture: 60, alignment: 78, range: 70, tempo: 84, stability: 88, activation: 64 }
  },
  "Knee raise": {
    checks: ["Back on the pad", "Knees above hips", "Pelvis curls", "No swing"],
    error: {
      type: "posture", joint: "hip",
      title: "Back arching off the pad",
      detail: "Your lower back peels off the pad and your legs swing up only halfway.",
      fix: "Press your back into the pad and curl your pelvis up as the knees rise.",
      compensate: ["quads", "lower-back"]
    },
    scores: { posture: 58, alignment: 76, range: 62, tempo: 70, stability: 60, activation: 66 }
  },
  "Ab wheel rollout": {
    checks: ["Flat back", "Hips with shoulders", "Ribs down", "Controlled range"],
    error: {
      type: "posture", joint: "spine",
      title: "Lower back sagging",
      detail: "Your hips drop and your lower back arches at full extension.",
      fix: "Shorten the rollout and keep your ribs down and glutes tight.",
      compensate: ["lower-back"]
    },
    scores: { posture: 52, alignment: 78, range: 82, tempo: 80, stability: 58, activation: 70 }
  }
});

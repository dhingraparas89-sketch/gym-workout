// v3 fields for the original 69 exercises (schema: data/SCHEMA.md): movement pattern, stabilizers
// (estimated), alternatives, aliases and the default camera. `id` and `instructions` (from the
// phases) are filled for every exercise in data/library/meta.js fillDefaults.
// Loaded after every other data/library file and before meta.js.
(() => {
  const S = (...m) => m;
  // name: [pattern, stabilizers, alternatives, aliases?]
  const T = {
    // ---------- Chest ----------
    "Barbell bench press": ["push", S("upper-back", "lats", "forearms"), ["Dumbbell bench press", "Machine chest press", "Push-up"]],
    "Incline dumbbell press": ["push", S("upper-back", "forearms"), ["Incline bench press", "Dumbbell bench press", "Incline push-up"]],
    "Cable fly": ["isolation", S("abs", "forearms"), ["Cable crossover", "Dumbbell fly", "Pec deck fly"]],
    "Machine chest press": ["push", S("upper-back"), ["Barbell bench press", "Dumbbell bench press", "Push-up"]],
    "Push-up": ["push", S("abs", "glutes", "upper-back"), ["Incline push-up", "Barbell bench press", "Dumbbell bench press"]],
    "Incline bench press": ["push", S("upper-back", "forearms"), ["Incline dumbbell press", "Barbell bench press", "Machine chest press"]],
    "Decline bench press": ["push", S("upper-back", "forearms"), ["Barbell bench press", "Dips", "Assisted dip"]],
    "Dumbbell bench press": ["push", S("upper-back", "forearms"), ["Barbell bench press", "Incline dumbbell press", "Machine chest press"]],
    "Dumbbell fly": ["isolation", S("forearms", "abs"), ["Cable fly", "Pec deck fly", "Cable crossover"]],
    // ---------- Back ----------
    "Deadlift": ["hinge", S("abs", "obliques", "forearms", "traps"), ["Romanian deadlift", "Stiff-leg deadlift", "Kettlebell swing"], ["Conventional deadlift"]],
    "Pull-up": ["pull", S("abs", "forearms", "rear-delts"), ["Assisted pull-up", "Lat pulldown", "Inverted row"]],
    "Barbell row": ["pull", S("lower-back", "hamstrings", "abs"), ["Dumbbell row", "T-bar row", "Chest-supported row"], ["Bent-over barbell row"]],
    "Lat pulldown": ["pull", S("abs", "forearms"), ["Pull-up", "Assisted pull-up", "Straight-arm pulldown"]],
    "Seated cable row": ["pull", S("lower-back", "abs", "forearms"), ["Single-arm cable row", "Chest-supported row", "Barbell row"]],
    "Assisted pull-up": ["pull", S("abs", "forearms"), ["Pull-up", "Lat pulldown", "Inverted row"]],
    "Dumbbell row": ["pull", S("obliques", "lower-back", "forearms"), ["Barbell row", "Single-arm cable row", "Chest-supported row"], ["One-arm dumbbell row"]],
    "T-bar row": ["pull", S("lower-back", "hamstrings", "forearms"), ["Barbell row", "Chest-supported row", "Seated cable row"], ["Landmine row"]],
    "Single-arm cable row": ["pull", S("obliques", "abs", "forearms"), ["Dumbbell row", "Seated cable row", "Chest-supported row"]],
    "Straight-arm pulldown": ["pull", S("abs", "triceps"), ["Lat pulldown", "Pull-up", "Dumbbell row"]],
    // ---------- Legs ----------
    "Back squat": ["squat", S("abs", "lower-back", "upper-back", "calves"), ["Front squat", "Goblet squat", "Leg press"]],
    "Romanian deadlift": ["hinge", S("abs", "upper-back", "traps"), ["Stiff-leg deadlift", "Single-leg Romanian deadlift", "Good morning"]],
    "Leg press": ["squat", S("abs"), ["Hack squat", "Back squat", "Goblet squat"]],
    "Walking lunge": ["lunge", S("abs", "obliques", "calves", "forearms"), ["Reverse lunge", "Bulgarian split squat", "Step-up"]],
    "Leg curl": ["isolation", S("abs"), ["Seated leg curl", "Nordic hamstring curl", "Romanian deadlift"], ["Lying leg curl"]],
    "Standing calf raise": ["isolation", S("abs", "quads"), ["Single-leg calf raise", "Leg press calf raise", "Seated calf raise"]],
    "Front squat": ["squat", S("abs", "upper-back", "lower-back"), ["Back squat", "Goblet squat", "Hack squat"]],
    "Goblet squat": ["squat", S("abs", "upper-back", "forearms"), ["Front squat", "Bodyweight squat", "Sumo squat"]],
    "Hack squat": ["squat", S("abs"), ["Leg press", "Back squat", "Sissy squat"], ["Machine hack squat"]],
    "Bulgarian split squat": ["lunge", S("abs", "obliques", "forearms", "calves"), ["Reverse lunge", "Step-up", "Walking lunge"]],
    "Reverse lunge": ["lunge", S("abs", "obliques", "forearms"), ["Walking lunge", "Bulgarian split squat", "Step-up"]],
    "Leg extension": ["isolation", S(), ["Sissy squat", "Front squat", "Hack squat"]],
    "Seated calf raise": ["isolation", S(), ["Standing calf raise", "Leg press calf raise", "Single-leg calf raise"]],
    // ---------- Glutes ----------
    "Hip thrust": ["hinge", S("abs", "quads"), ["Glute bridge", "Romanian deadlift", "Cable kickback"], ["Barbell hip thrust"]],
    "Glute bridge": ["hinge", S("abs"), ["Hip thrust", "Single-leg Romanian deadlift", "Cable kickback"]],
    "Cable kickback": ["isolation", S("abs", "obliques"), ["Glute bridge", "Hip thrust", "Bird dog"]],
    "Step-up": ["lunge", S("abs", "obliques", "calves", "forearms"), ["Bulgarian split squat", "Reverse lunge", "Box jump"]],
    "Sumo squat": ["squat", S("abs", "lower-back"), ["Goblet squat", "Back squat", "Hip abduction"]],
    "Hip abduction": ["isolation", S(), ["Sumo squat", "Side plank", "Cable kickback"], ["Machine hip abduction"]],
    // ---------- Shoulders ----------
    "Overhead press": ["push", S("abs", "glutes", "upper-back"), ["Dumbbell shoulder press", "Arnold press", "Machine chest press"], ["Military press", "Barbell shoulder press"]],
    "Arnold press": ["push", S("abs", "upper-back"), ["Dumbbell shoulder press", "Overhead press", "Front raise"]],
    "Dumbbell lateral raise": ["isolation", S("traps", "abs"), ["Cable lateral raise", "Upright row", "Arnold press"]],
    "Face pull": ["pull", S("abs", "forearms"), ["Reverse pec deck", "Rear delt fly", "Inverted row"]],
    "Rear delt fly": ["isolation", S("lower-back", "hamstrings"), ["Reverse pec deck", "Face pull", "Chest-supported row"], ["Bent-over reverse fly"]],
    "Dumbbell shoulder press": ["push", S("abs", "upper-back"), ["Overhead press", "Arnold press", "Front raise"]],
    "Front raise": ["isolation", S("abs", "traps"), ["Dumbbell shoulder press", "Dumbbell lateral raise", "Cable lateral raise"]],
    "Cable lateral raise": ["isolation", S("obliques", "traps"), ["Dumbbell lateral raise", "Upright row", "Front raise"]],
    "Upright row": ["pull", S("abs", "forearms"), ["Dumbbell lateral raise", "Dumbbell shrug", "Cable lateral raise"]],
    // ---------- Arms ----------
    "Barbell curl": ["isolation", S("forearms", "abs"), ["Dumbbell curl", "Cable curl", "Preacher curl"]],
    "Hammer curl": ["isolation", S("abs"), ["Reverse curl", "Dumbbell curl", "Alternating curl"]],
    "Triceps rope pushdown": ["isolation", S("abs", "lats"), ["Cable pushdown", "Overhead triceps extension", "Dumbbell kickback"]],
    "Skull crusher": ["isolation", S("lats", "forearms"), ["Overhead triceps extension", "Close-grip bench press", "Triceps rope pushdown"], ["Lying triceps extension"]],
    "Dips": ["push", S("abs", "upper-back"), ["Assisted dip", "Bench dip", "Close-grip bench press"], ["Parallel-bar dip"]],
    "Close-grip bench press": ["push", S("upper-back", "forearms"), ["Dips", "Skull crusher", "Bench dip"]],
    "Overhead triceps extension": ["isolation", S("abs", "shoulders"), ["Skull crusher", "Triceps rope pushdown", "Dumbbell kickback"]],
    "Dumbbell kickback": ["isolation", S("rear-delts", "lower-back"), ["Triceps rope pushdown", "Cable pushdown", "Overhead triceps extension"]],
    "Dumbbell curl": ["isolation", S("forearms", "abs"), ["Alternating curl", "Barbell curl", "Hammer curl"]],
    "Incline dumbbell curl": ["isolation", S("forearms"), ["Dumbbell curl", "Concentration curl", "Cable curl"]],
    "Cable curl": ["isolation", S("forearms", "abs"), ["Barbell curl", "Dumbbell curl", "Preacher curl"]],
    "Preacher curl": ["isolation", S("forearms"), ["Concentration curl", "Barbell curl", "Cable curl"]],
    // ---------- Core ----------
    "Plank": ["anti-rotation", S("shoulders", "glutes", "quads"), ["Side plank", "Dead bug", "Ab wheel rollout"], ["Front plank"]],
    "Hanging leg raise": ["isolation", S("lats", "forearms", "shoulders"), ["Hanging knee raise", "Knee raise", "Reverse crunch"]],
    "Cable crunch": ["isolation", S("lats"), ["Crunch", "Reverse crunch", "Ab wheel rollout"], ["Kneeling cable crunch"]],
    "Pallof press": ["anti-rotation", S("glutes", "shoulders"), ["Side plank", "Dead bug", "Bird dog"]],
    "Dead bug": ["anti-rotation", S("lower-back"), ["Bird dog", "Plank", "Reverse crunch"]],
    "Side plank": ["anti-rotation", S("shoulders", "glutes"), ["Plank", "Pallof press", "Russian twist"]],
    "Crunch": ["isolation", S(), ["Cable crunch", "Reverse crunch", "Bicycle crunch"]],
    "Knee raise": ["isolation", S("forearms", "shoulders"), ["Hanging knee raise", "Hanging leg raise", "Reverse crunch"], ["Captain's chair knee raise"]],
    "Russian twist": ["rotation", S("lower-back"), ["Bicycle crunch", "Pallof press", "Side plank"]],
    "Ab wheel rollout": ["anti-rotation", S("lats", "shoulders", "glutes"), ["Plank", "Dead bug", "Cable crunch"]]
  };
  const byName = new Map(EXERCISES.map((e) => [e.name, e]));
  for (const [name, [pattern, stabilizers, alternatives, aliases]] of Object.entries(T)) {
    const ex = byName.get(name);
    if (!ex) continue;
    if (!ex.pattern) ex.pattern = pattern;
    if (!ex.stabilizers) ex.stabilizers = stabilizers.filter((m) => !(ex.primary || []).includes(m) && !(ex.secondary || []).includes(m));
    if (!ex.alternatives) ex.alternatives = alternatives.filter((a) => byName.has(a) && a !== name);
    if (aliases && !ex.aliases) ex.aliases = aliases;
  }
  // Calves get their own group (and stay listed under legs).
  ["Standing calf raise", "Seated calf raise"].forEach((n) => {
    const ex = byName.get(n);
    if (ex) { ex.group = "calves"; ex.categories = [...new Set([...(ex.categories || []), "legs"])]; }
  });
})();

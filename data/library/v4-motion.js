// v4 motion data for every exercise (schema: data/SCHEMA.md "animation"):
// - animation: what drives the 3D demonstration (pose keys, equipment kit) and the contacts it must
//   keep: which hands hold an implement or rest flat on a surface, and whether the feet stay planted.
//   tools/ and the contact audit read `animation.contact`; js/figure3d.js reads it for hand/foot pinning.
// - demo: "ready" (passes the contact audit and was checked in screenshots), "beta" (approximate),
//   "hidden" (kept out of the library until fixed).
// - phaseTimeline: exercise-specific phase labels over one rep cycle (u in 0..1; the viewer's tempo is
//   hold 0-0.1, start->end 0.1-0.42, hold 0.42-0.54, return 0.54-1).
// Loaded after v3-fields.js and before meta.js.
(() => {
  // hands: "both" (each hand on an implement; one bar or a pair), "R" (right hand only), "flat"
  // (palms on the floor or a bench), "free" (no implement). feet: "planted" (stay put all rep),
  // "moving" (step, jump or lift; checked only while in contact), "machine" (on a moving pad or
  // platform), "hang" (off the floor).
  const C = {
    "Barbell bench press": ["both", "planted"], "Incline dumbbell press": ["both", "planted"], "Cable fly": ["both", "planted"],
    "Machine chest press": ["both", "planted"], "Push-up": ["flat", "planted"], "Deadlift": ["both", "planted"],
    "Pull-up": ["both", "hang"], "Barbell row": ["both", "planted"], "Lat pulldown": ["both", "planted"],
    "Seated cable row": ["both", "planted"], "Back squat": ["both", "planted"], "Romanian deadlift": ["both", "planted"],
    "Leg press": ["both", "machine"], "Walking lunge": ["both", "moving"], "Leg curl": ["both", "machine"],
    "Standing calf raise": ["both", "planted"], "Overhead press": ["both", "planted"], "Arnold press": ["both", "planted"],
    "Dumbbell lateral raise": ["both", "planted"], "Face pull": ["both", "planted"], "Rear delt fly": ["both", "planted"],
    "Barbell curl": ["both", "planted"], "Hammer curl": ["both", "planted"], "Triceps rope pushdown": ["both", "planted"],
    "Skull crusher": ["both", "planted"], "Dips": ["both", "hang"], "Plank": ["free", "planted"],
    "Hanging leg raise": ["both", "hang"], "Cable crunch": ["both", "planted"], "Pallof press": ["both", "planted"],
    "Dead bug": ["free", "moving"], "Incline bench press": ["both", "planted"], "Decline bench press": ["both", "planted"],
    "Dumbbell bench press": ["both", "planted"], "Dumbbell fly": ["both", "planted"], "Close-grip bench press": ["both", "planted"],
    "Overhead triceps extension": ["both", "planted"], "Dumbbell kickback": ["R", "planted"], "Dumbbell shoulder press": ["both", "planted"],
    "Front raise": ["both", "planted"], "Cable lateral raise": ["R", "planted"], "Upright row": ["both", "planted"],
    "Dumbbell curl": ["both", "planted"], "Incline dumbbell curl": ["both", "planted"], "Cable curl": ["both", "planted"],
    "Preacher curl": ["both", "planted"], "Assisted pull-up": ["both", "machine"], "Dumbbell row": ["R", "planted"],
    "T-bar row": ["both", "planted"], "Single-arm cable row": ["R", "planted"], "Straight-arm pulldown": ["both", "planted"],
    "Side plank": ["free", "planted"], "Crunch": ["free", "planted"], "Knee raise": ["both", "moving"],
    "Russian twist": ["both", "planted"], "Ab wheel rollout": ["both", "planted"], "Front squat": ["both", "planted"],
    "Goblet squat": ["both", "planted"], "Hack squat": ["both", "planted"], "Bulgarian split squat": ["both", "planted"],
    "Reverse lunge": ["both", "moving"], "Leg extension": ["both", "machine"], "Seated calf raise": ["both", "planted"],
    "Hip thrust": ["both", "planted"], "Glute bridge": ["free", "planted"], "Cable kickback": ["both", "moving"],
    "Step-up": ["both", "moving"], "Sumo squat": ["both", "planted"], "Hip abduction": ["both", "machine"],
    "Cable crossover": ["both", "planted"], "Incline push-up": ["flat", "planted"], "Pec deck fly": ["both", "planted"],
    "Chest-supported row": ["both", "planted"], "Back extension": ["free", "machine"], "Inverted row": ["both", "planted"],
    "Reverse pec deck": ["both", "planted"], "Dumbbell shrug": ["both", "planted"], "Alternating curl": ["both", "planted"],
    "Concentration curl": ["R", "planted"], "Reverse curl": ["both", "planted"], "Wrist curl": ["both", "planted"],
    "Cable pushdown": ["both", "planted"], "Assisted dip": ["both", "machine"], "Bench dip": ["flat", "planted"],
    "Sissy squat": ["R", "planted"], "Wall sit": ["free", "planted"], "Stiff-leg deadlift": ["both", "planted"],
    "Seated leg curl": ["both", "machine"], "Single-leg Romanian deadlift": ["both", "moving"], "Good morning": ["both", "planted"],
    "Nordic hamstring curl": ["free", "planted"], "Leg press calf raise": ["both", "machine"], "Single-leg calf raise": ["R", "planted"],
    "Hanging knee raise": ["both", "hang"], "Bicycle crunch": ["free", "moving"], "Reverse crunch": ["free", "moving"],
    "Bird dog": ["flat", "moving"], "Bodyweight squat": ["free", "planted"], "Jump squat": ["free", "moving"],
    "Burpee": ["flat", "moving"], "Mountain climber": ["flat", "moving"], "Kettlebell swing": ["both", "planted"],
    "Farmer's carry": ["both", "moving"], "Battle rope": ["both", "planted"], "Box jump": ["free", "moving"],
    "Sled push": ["both", "moving"], "Sled pull": ["both", "moving"]
  };
  EXERCISES.forEach((ex) => {
    const c = C[ex.name];
    const f3 = ex.figure3d || {};
    const a = ex.animation || {};
    ex.animation = {
      driver: f3.keys ? `pose keys a → ${f3.keys.length} key${f3.keys.length > 1 ? "s" : ""} → b` : "two poses a ↔ b",
      kit: f3.kit || "none",
      ...a,
      contact: { hands: c ? c[0] : "free", feet: c ? c[1] : "planted", ...(a.contact || {}) }
    };
  });
})();

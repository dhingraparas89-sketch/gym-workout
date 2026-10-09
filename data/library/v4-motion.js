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
  // Phase labels over one rep cycle: [hold at a, a -> b, hold at b, b -> a, (last stretch of the return)].
  // Four labels end the return at 1; a fifth names the final 10% (lockout, settle).
  const P = {
    "Barbell bench press": ["Unrack position", "Lower to chest", "Touch", "Press", "Lockout"],
    "Incline dumbbell press": ["Arms extended", "Lower to chest", "Stretch", "Press", "Lockout"],
    "Cable fly": ["Arms open", "Hug together", "Squeeze", "Open under control"],
    "Machine chest press": ["Handles at chest", "Press", "Lockout", "Return", "Stretch"],
    "Push-up": ["Plank, arms long", "Lower", "Chest near floor", "Press up", "Lockout"],
    "Deadlift": ["Lockout", "Hinge the bar down", "Bar on the floor", "Pull and stand", "Lockout"],
    "Pull-up": ["Dead hang", "Pull up", "Chin over bar", "Lower", "Full hang"],
    "Barbell row": ["Hinged, arms long", "Row to torso", "Squeeze", "Lower"],
    "Lat pulldown": ["Arms extended", "Pull down", "Squeeze", "Return"],
    "Seated cable row": ["Arms long", "Row", "Squeeze", "Return", "Stretch"],
    "Back squat": ["Stand", "Descend", "Bottom", "Drive up", "Lockout"],
    "Romanian deadlift": ["Stand tall", "Hinge down", "Hamstring stretch", "Hips through", "Lockout"],
    "Leg press": ["Legs extended", "Lower the sled", "Bottom", "Press", "Lockout"],
    "Walking lunge": ["Stand", "Step and lower", "Bottom", "Drive up", "Stand tall"],
    "Leg curl": ["Legs long", "Curl", "Squeeze", "Lower"],
    "Standing calf raise": ["Heels low", "Rise", "Top", "Lower", "Stretch"],
    "Overhead press": ["Bar at shoulders", "Press", "Lockout overhead", "Lower", "Rack position"],
    "Arnold press": ["Palms facing you", "Rotate and press", "Lockout", "Lower and rotate"],
    "Dumbbell lateral raise": ["Arms at sides", "Raise", "Shoulder height", "Lower"],
    "Face pull": ["Arms long", "Pull to face", "Squeeze", "Return"],
    "Rear delt fly": ["Hinged, arms hanging", "Open", "Squeeze", "Lower"],
    "Barbell curl": ["Arms long", "Curl", "Squeeze", "Lower"],
    "Hammer curl": ["Arms long", "Curl", "Squeeze", "Lower"],
    "Triceps rope pushdown": ["Elbows bent", "Push down", "Lockout", "Return"],
    "Skull crusher": ["Arms over chest", "Lower to forehead", "Stretch", "Extend"],
    "Dips": ["Top, arms locked", "Lower", "Bottom", "Press up"],
    "Plank": ["Brace", "Hold", "Hold", "Breathe and hold"],
    "Hanging leg raise": ["Hang", "Raise legs", "Top", "Lower"],
    "Cable crunch": ["Kneel tall", "Crunch", "Squeeze", "Return"],
    "Pallof press": ["Handle at chest", "Press out", "Hold", "Return"],
    "Dead bug": ["Arms and knees up", "Extend opposite arm and leg", "Reach", "Return"],
    "Incline bench press": ["Unrack position", "Lower to upper chest", "Touch", "Press", "Lockout"],
    "Decline bench press": ["Unrack position", "Lower to lower chest", "Touch", "Press", "Lockout"],
    "Dumbbell bench press": ["Arms extended", "Lower", "Stretch", "Press", "Lockout"],
    "Dumbbell fly": ["Arms over chest", "Open wide", "Stretch", "Hug together"],
    "Close-grip bench press": ["Unrack position", "Lower to chest", "Touch", "Press", "Lockout"],
    "Overhead triceps extension": ["Arms overhead", "Lower behind head", "Stretch", "Extend"],
    "Dumbbell kickback": ["Elbow bent", "Extend back", "Lockout", "Return"],
    "Dumbbell shoulder press": ["Dumbbells at shoulders", "Press", "Lockout", "Lower"],
    "Front raise": ["Arms at sides", "Raise", "Shoulder height", "Lower"],
    "Cable lateral raise": ["Arm across body", "Raise", "Shoulder height", "Lower"],
    "Upright row": ["Arms long", "Pull up", "Elbows high", "Lower"],
    "Dumbbell curl": ["Arms long", "Curl", "Squeeze", "Lower"],
    "Incline dumbbell curl": ["Arms hang back", "Curl", "Squeeze", "Lower"],
    "Cable curl": ["Arms long", "Curl", "Squeeze", "Lower"],
    "Preacher curl": ["Arms long on pad", "Curl", "Squeeze", "Lower"],
    "Assisted pull-up": ["Arms long", "Pull up", "Chin over bar", "Lower"],
    "Dumbbell row": ["Arm long", "Row", "Squeeze", "Lower"],
    "T-bar row": ["Arms long", "Row", "Squeeze", "Lower"],
    "Single-arm cable row": ["Arm long", "Row", "Squeeze", "Return"],
    "Straight-arm pulldown": ["Arms up", "Sweep down", "Squeeze", "Return"],
    "Side plank": ["Brace", "Hold", "Hold", "Breathe and hold"],
    "Crunch": ["Lie back", "Curl up", "Squeeze", "Lower"],
    "Knee raise": ["Hang on the pads", "Knees up", "Squeeze", "Lower"],
    "Russian twist": ["Lean back", "Turn", "End range", "Turn back"],
    "Ab wheel rollout": ["Kneel, wheel under shoulders", "Roll out", "Extended", "Roll back"],
    "Front squat": ["Stand, elbows high", "Descend", "Bottom", "Drive up", "Lockout"],
    "Goblet squat": ["Stand", "Descend", "Bottom", "Drive up", "Lockout"],
    "Hack squat": ["Stand on the platform", "Descend", "Bottom", "Drive up", "Lockout"],
    "Bulgarian split squat": ["Split stance", "Lower", "Bottom", "Drive up"],
    "Reverse lunge": ["Stand", "Step back and lower", "Bottom", "Drive up", "Stand tall"],
    "Leg extension": ["Knees bent", "Extend", "Squeeze", "Lower"],
    "Seated calf raise": ["Heels low", "Rise", "Top", "Lower"],
    "Hip thrust": ["Hips low", "Drive up", "Lockout", "Lower"],
    "Glute bridge": ["Hips on the floor", "Bridge up", "Squeeze", "Lower"],
    "Cable kickback": ["Leg under hip", "Kick back", "Squeeze", "Return"],
    "Step-up": ["Foot on the box", "Step up", "Stand tall", "Step down"],
    "Sumo squat": ["Wide stance", "Descend", "Bottom", "Drive up", "Lockout"],
    "Hip abduction": ["Knees together", "Push out", "Squeeze", "Return"],
    "Cable crossover": ["Stretch", "Sweep down", "Squeeze", "Open"],
    "Incline push-up": ["Arms long", "Lower", "Chest to bench", "Press up"],
    "Pec deck fly": ["Stretch", "Bring together", "Squeeze", "Open"],
    "Chest-supported row": ["Arms hang", "Row", "Squeeze", "Lower"],
    "Back extension": ["Hinged down", "Raise", "Straight line", "Lower"],
    "Inverted row": ["Hang under the bar", "Pull", "Chest to bar", "Lower"],
    "Reverse pec deck": ["Arms forward", "Open", "Squeeze", "Return"],
    "Dumbbell shrug": ["Arms hang", "Shrug", "Hold", "Lower"],
    "Concentration curl": ["Arm long", "Curl", "Squeeze", "Lower"],
    "Reverse curl": ["Arms long", "Curl", "Top", "Lower"],
    "Wrist curl": ["Wrists back", "Curl", "Squeeze", "Lower"],
    "Cable pushdown": ["Elbows bent", "Push down", "Lockout", "Return"],
    "Assisted dip": ["Top, arms locked", "Lower", "Bottom", "Press up"],
    "Bench dip": ["Top, arms locked", "Lower", "Bottom", "Press up"],
    "Sissy squat": ["Tall on toes", "Knees forward", "Bottom", "Stand"],
    "Wall sit": ["Back on the wall", "Slide down", "Hold", "Slide up"],
    "Stiff-leg deadlift": ["Stand tall", "Hinge", "Stretch", "Hips through"],
    "Seated leg curl": ["Legs straight", "Curl", "Squeeze", "Return"],
    "Single-leg Romanian deadlift": ["Balance", "Hinge", "Level", "Stand"],
    "Good morning": ["Bar on back", "Hinge", "Stretch", "Stand"],
    "Nordic hamstring curl": ["Tall kneel", "Lower slowly", "Catch", "Curl back up"],
    "Leg press calf raise": ["Heels back", "Point", "Squeeze", "Return"],
    "Single-leg calf raise": ["Heel low", "Rise", "Top", "Lower"],
    "Hanging knee raise": ["Hang", "Knees up", "Squeeze", "Lower"],
    "Bodyweight squat": ["Stand", "Descend", "Bottom", "Drive up", "Stand tall"],
    "Kettlebell swing": ["Hike", "Hip snap", "Float", "Drop and hinge"]
  };
  const TL = (l) => {
    const e = [0, 0.1, 0.42, 0.54, l.length > 4 ? 0.9 : 1, 1];
    return l.map((label, i) => ({ label, t0: e[i], t1: e[i + 1] }));
  };
  // Kits where each hand holds its own implement (a pair), as opposed to one bar in both hands.
  const PAIR = /^(dumbbells|inclineDB|seatedDB|upFlatDB|upInclineCurl|upKickback|pcDbRow|v3OneDB|v3ChestRow|loBulgarian|loStepUp|crossover|v3PecDeck|chestPress|band)/;
  EXERCISES.forEach((ex) => {
    const c = C[ex.name];
    const f3 = ex.figure3d || {};
    const a = ex.animation || {};
    if (P[ex.name]) ex.phaseTimeline = TL(P[ex.name]);
    ex.animation = {
      driver: f3.keys ? `pose keys a → ${f3.keys.length} key${f3.keys.length > 1 ? "s" : ""} → b` : "two poses a ↔ b",
      kit: f3.kit || "none",
      ...a,
      contact: { hands: c ? c[0] : "free", feet: c ? c[1] : "planted", implement: PAIR.test(f3.kit || "") ? "pair" : "one", ...(a.contact || {}) }
    };
  });
})();

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
  // ---------- Resistance band exercises (kit "band" in js/kits/v3-equipment.js) ----------
  const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const BAND_TL = (a, b, c, d) => [{ label: a, t0: 0, t1: 0.1 }, { label: b, t0: 0.1, t1: 0.42 }, { label: c, t0: 0.42, t1: 0.54 }, { label: d, t0: 0.54, t1: 1 }];
  EXERCISES.push(
    {
      id: slug("Band biceps curl"), name: "Band biceps curl", aliases: ["Resistance band curl"], group: "arms", categories: [],
      equipment: "Resistance band", equip: "band", setup: "Long resistance band with handles, under both feet",
      difficulty: "beginner", movementType: "isolation", pattern: "isolation", sets: 3, reps: "12–15", rest: 60,
      primary: ["biceps"], secondary: ["forearms"], stabilizers: ["abs", "shoulders"],
      anatomy: { primary: ["Biceps brachii"], secondary: ["Brachialis", "Brachioradialis"] },
      activation: { biceps: 88, forearms: 46, abs: 16, shoulders: 14 },
      movement: "Standing on the band, the elbows bend with the palms up while the upper arms stay still; the band gets harder toward the top",
      phases: ["Start: stand on the band, feet hip width, a handle in each hand, palms forward", "Curl: bend the elbows and bring the handles up",
        "Top: forearms near vertical, squeeze the biceps against the band's peak tension", "Lowering: let the band pull the hands down slowly", "Bottom: arms straight before the next rep"],
      instructions: ["Stand on the middle of a long band with your feet hip width apart.", "Hold a handle in each hand, palms forward, arms straight by your sides.",
        "Pin your elbows to your sides and curl the handles toward your shoulders.", "Squeeze at the top, where the band pulls hardest.",
        "Lower slowly until your arms are straight; don't let the band snap you down."],
      cues: ["Elbows by your sides", "Fight the band on the way down", "Straighten the arms fully at the bottom"],
      mistakes: ["Elbows drifting forward", "Letting the band yank the hands down", "Half reps that never straighten the arm"],
      formChecks: ["Elbow path", "Range of motion", "Tempo", "Spine position"], faultCheck: "Elbow path",
      alternatives: ["Dumbbell curl", "Cable curl", "Hammer curl"],
      athlete: "female", camera: { view: "threeQuarter", yaw: 0.72, pitch: 0.12 },
      phaseTimeline: BAND_TL("Arms long", "Curl", "Peak tension", "Lower against the band"),
      demo: "ready",
      good: { cue: "Elbows stay at the sides while the forearms curl the handles up against the band.", highlight: ["forearm", "elbow"] },
      bad: { cue: "The elbows drift forward so the front delts help lift against the band.", highlight: ["upperArm", "shoulder"],
        b: { ua: 140, fa: 10 } },
      figure3d: { kit: "band", band: { anchor: "feet" }, grip: "under", abd: -12 },
      figure: { load: { type: "cable", from: [104, 186] },
        a: { ...STAND, ua: 178, fa: 175 }, b: { ...STAND, ua: 174, fa: 28 } }
    },
    {
      id: slug("Band triceps pushdown"), name: "Band triceps pushdown", aliases: ["Resistance band pushdown"], group: "arms", categories: [],
      equipment: "Resistance band", equip: "band", setup: "Resistance band with handles, anchored high on a rack upright or door anchor",
      difficulty: "beginner", movementType: "isolation", pattern: "isolation", sets: 3, reps: "12–15", rest: 60,
      primary: ["triceps"], secondary: ["forearms"], stabilizers: ["abs", "lats"],
      anatomy: { primary: ["Triceps brachii (lateral & medial heads)"], secondary: ["Anconeus", "Forearm extensors"] },
      activation: { triceps: 88, forearms: 28, abs: 18, lats: 16 },
      movement: "With the elbows pinned to the sides, the elbows straighten to stretch the band down to the thighs",
      phases: ["Start: band anchored above head height, a handle in each hand, elbows at the sides", "Push: straighten the elbows and stretch the band down",
        "Lockout: arms straight, triceps squeezed", "Return: let the band lift the hands until the forearms pass parallel", "Reset: elbows still pinned"],
      instructions: ["Anchor the band high on a rack upright or over a door.", "Hold a handle in each hand and step back until the band is taut with your elbows at your sides.",
        "Push the handles down until your arms are straight.", "Squeeze the triceps at the bottom.", "Let the band pull your forearms back up slowly, elbows staying put."],
      cues: ["Elbows glued to the ribs", "Only the forearms move", "Slow on the way up"],
      mistakes: ["Elbows drifting forward and up", "Leaning over the handles", "Short lockout"],
      formChecks: ["Elbow position", "Lockout", "Torso angle", "Tempo"], faultCheck: "Elbow position",
      alternatives: ["Cable pushdown", "Triceps rope pushdown", "Dumbbell kickback"],
      athlete: "male", camera: { view: "threeQuarter", yaw: 0.62, pitch: 0.12 },
      phaseTimeline: BAND_TL("Elbows bent", "Push down", "Lockout", "Return against the band"),
      demo: "ready",
      good: { cue: "Elbows stay pinned; only the forearms move to stretch the band to lockout.", highlight: ["forearm", "elbow"] },
      bad: { cue: "The elbows drift forward and up, so the shoulders and lats help pull the band down.", highlight: ["upperArm", "shoulder"],
        a: { ua: 140, fa: 40 } },
      figure3d: { kit: "band", band: { anchor: "post", y: 196, dx: 40 }, grip: "over" },
      figure: { load: { type: "cable", from: [140, 20] },
        a: { x: 92, y: 186, shin: 0, thigh: 0, torso: 8, neck: 8, ua: 172, fa: 52 }, b: { x: 92, y: 186, shin: 0, thigh: 0, torso: 8, neck: 8, ua: 172, fa: 172 } }
    },
    {
      id: slug("Band pull-apart"), name: "Band pull-apart", aliases: ["Resistance band pull apart"], group: "shoulders", categories: ["back"],
      equipment: "Resistance band", equip: "band", setup: "Light loop resistance band",
      difficulty: "beginner", movementType: "isolation", pattern: "pull", sets: 3, reps: "15–20", rest: 45,
      primary: ["rear-delts", "upper-back"], secondary: ["traps"], stabilizers: ["abs", "triceps"],
      anatomy: { primary: ["Posterior deltoid", "Rhomboids & middle trapezius"], secondary: ["Lower trapezius", "Infraspinatus & teres minor"] },
      activation: { "rear-delts": 86, "upper-back": 78, traps: 44, abs: 14, triceps: 12 },
      movement: "Arms straight at shoulder height, the hands sweep out to the sides and stretch the band across the chest",
      phases: ["Start: stand tall, arms straight in front at shoulder height, band taut between the hands", "Pull apart: sweep the hands out to the sides",
        "Squeeze: band at the chest, shoulder blades drawn together and down", "Return: let the hands come back together under control", "Reset: band stays taut"],
      instructions: ["Hold a light loop band with both hands, palms down, about shoulder width apart.", "Raise your straight arms to shoulder height in front of you.",
        "Pull the band apart by sweeping your hands out to the sides until it touches your chest.", "Squeeze your shoulder blades together and down for a moment.",
        "Bring the hands back together slowly, keeping a little tension in the band."],
      cues: ["Arms long, elbows soft", "Shoulders down, away from the ears", "Squeeze the shoulder blades at the end"],
      mistakes: ["Shrugging the shoulders up", "Bending the elbows to make it easier", "Arching the lower back"],
      formChecks: ["Shoulder position", "Arm path", "Range of motion", "Tempo"], faultCheck: "Shoulder position",
      alternatives: ["Rear delt fly", "Reverse pec deck", "Face pull"],
      athlete: "female", camera: { view: "threeQuarter", yaw: 1.0, pitch: 0.32 },
      phaseTimeline: BAND_TL("Arms forward", "Pull apart", "Squeeze", "Return together"),
      demo: "ready",
      good: { cue: "Straight arms sweep out to the sides with the shoulders down until the band meets the chest.", highlight: ["upperArm", "shoulder"] },
      bad: { cue: "The shoulders shrug toward the ears, so the upper traps take the work from the rear delts.", highlight: ["neck", "shoulder"],
        a: { shrug: 3 }, b: { shrug: 7 } },
      animation: { contact: { implement: "one" } }, // one loop band between both fists
      figure3d: { kit: "band", band: { anchor: "hands" }, grip: "over", abdAxis: "spine",
        a: { ...STAND, ua: 92, fa: 90, abd: 4 }, b: { ...STAND, ua: 92, fa: 90, abd: 80 } },
      figure: { armsOut: true, load: { type: "none" },
        a: { ...STAND, ua: 92, fa: 90 }, b: { ...STAND, ua: 92, fa: 90 } }
    }
  );
  Object.assign(FORM, {
    "Band biceps curl": {
      checks: ["Pinned elbows", "Full extension", "Slow lowering", "Still torso"],
      error: { type: "alignment", joint: "shoulder", title: "Elbows drifting forward",
        detail: "Your elbows swing forward as the handles rise, so the front delts help lift against the band.",
        fix: "Keep your elbows at your sides and stop the curl when they start to move.",
        why: "The band pulls hardest at the top. Letting the elbows travel there hands that hardest part to the shoulders, so the biceps miss the work the band adds.",
        compensate: ["shoulders"] },
      scores: { posture: 88, alignment: 58, range: 82, tempo: 80, stability: 86, activation: 64 }
    },
    "Band triceps pushdown": {
      checks: ["Elbows pinned", "Full lockout", "Torso steady", "Controlled return"],
      error: { type: "alignment", joint: "shoulder", title: "Elbows drifting forward",
        detail: "Your elbows swing forward and up as the band lifts your hands.",
        fix: "Pin the elbows to your sides and let only the forearms move.",
        why: "When the elbows move, the lats and shoulders pull the band down with the triceps, and the triceps never work through their full range.",
        compensate: ["lats", "shoulders"] },
      scores: { posture: 80, alignment: 56, range: 80, tempo: 80, stability: 82, activation: 62 }
    },
    "Band pull-apart": {
      checks: ["Shoulders down", "Straight arms", "Band to chest", "Slow return"],
      error: { type: "activation", joint: "shoulder", title: "Shrugging the shoulders",
        detail: "Your shoulders hike toward your ears as the band stretches.",
        fix: "Set the shoulders down and back first, then pull the band apart without letting them rise.",
        why: "Shrugging hands the pull to the upper traps, so the rear delts and the muscles between the shoulder blades, which this exercise is for, do less.",
        compensate: ["traps"] },
      scores: { posture: 84, alignment: 80, range: 78, tempo: 82, stability: 84, activation: 58 }
    }
  });
  // Why each exercise's common mistake matters (FORM[name].error.why), and clearer titles where the
  // old one was generic. Shown as "Why it matters" on the exercise page.
  const WHY = {
    "Barbell bench press": "The bottom of the rep is where the chest is stretched and works hardest. Stopping halfway leaves that range untrained and shifts more of the press onto the triceps.",
    "Incline dumbbell press": "The upper chest does most of its work in the lower half of the rep. Half reps at the top load the shoulders and triceps instead.",
    "Cable fly": "A fly trains the chest by moving only at the shoulder. Bending the elbows shortens the lever and turns it into a press, so the chest loses its stretch and the triceps help.",
    "Machine chest press": "With the shoulders rolled forward, the front delts take over the press and the shoulder joint sits in a less stable position under load.",
    "Push-up": "A sagging hip lets the lower back hang into an arch under body weight, and the trunk stops working as one braced plank.",
    "Deadlift": "A rounded lower back puts the load on the spinal discs and ligaments instead of the hips and back muscles. It is the most common way deadlifts cause back pain.",
    "Pull-up": "A leg kick builds momentum that lifts the body part of the way, so the lats and arms do less, and the swing is hard to control at the top and bottom.",
    "Barbell row": "Standing up turns the row into a hip swing. The upper back barely works and the lower back takes repeated jolts.",
    "Lat pulldown": "Past a slight lean the pull becomes a row: the mid back takes over from the lats, and the momentum of leaning back lifts the stack.",
    "Seated cable row": "Rounding forward and then yanking back loads the lower back repeatedly and lets momentum move the handle instead of the upper back.",
    "Back squat": "When the chest drops and the back rounds under the bar, the lower back takes load the hips and legs should carry, which is a common cause of back strain.",
    "Romanian deadlift": "Once the back rounds, the hinge stops at the hips and the spine bends instead. The hamstrings lose their stretch and the lower back takes the load.",
    "Leg press": "When the hips curl off the seat, the lower back rounds under the full sled load. That is far more strain on the spine than the extra depth is worth.",
    "Walking lunge": "A short step pushes the knee far forward and lifts the heel, so the knee takes more of the load and balance gets shaky.",
    "Leg curl": "Lifting the hips shortens the hamstrings at the hip and lets the lower back swing the pad, so the hamstrings do less of the curl.",
    "Standing calf raise": "Bending the knees lets the legs bounce the weight, and the calves skip the full stretch and full rise where they work hardest.",
    "Overhead press": "Leaning back turns the press into an incline press and arches the lower back, which compresses the lumbar spine under the bar.",
    "Arnold press": "Arching away from the weight shifts the work to the upper chest and puts the lower back in a compressed, extended position.",
    "Dumbbell lateral raise": "Above shoulder height and with a shrug, the upper traps lift the weight. The side delts, which the raise is for, do less.",
    "Face pull": "With the elbows low the move becomes a row for the mid back; the rear delts and the rotator cuff, which face pulls are for, get little work.",
    "Rear delt fly": "Squeezing the shoulder blades and shrugging hands the work to the traps, so the small rear delts get much less of it.",
    "Barbell curl": "Swinging the torso and elbows lets the hips and shoulders start the bar moving, so the biceps skip the hardest part of the curl.",
    "Hammer curl": "When the elbows drift forward, the front delts lift part of the weight and the elbow flexors lose tension at the top.",
    "Triceps rope pushdown": "Leaning over the rope lets body weight and the shoulders push it down, so the triceps work through less of their range.",
    "Skull crusher": "Swinging the upper arms moves the work to the lats and shoulders, and the triceps lose the stretch that makes this exercise effective.",
    "Dips": "Very deep dips with rounded shoulders stretch the front of the shoulder joint under body weight, a common source of shoulder pain.",
    "Plank": "Sagging hips let the lower back hang into an arch, so the abs stop holding the position the plank is meant to train.",
    "Hanging leg raise": "Swinging and half-lifting lets the hip flexors raise the legs. The pelvis never curls, so the abs do little.",
    "Cable crunch": "Sitting back and pulling with the arms moves the weight with the hips and shoulders; the spine never curls, so the abs barely work.",
    "Pallof press": "The exercise trains the trunk to resist rotation. Leaning or shifting away from the cable gives in to the pull, which is the opposite of the goal.",
    "Dead bug": "Once the lower back arches, the abs have lost control of the pelvis and the lower back takes the leg's weight.",
    "Incline bench press": "A high arch flattens the bench angle, so the press moves onto the mid chest and the upper chest the incline targets does less.",
    "Decline bench press": "A bar path toward the neck flares the elbows and loads the front of the shoulder in its least stable position.",
    "Dumbbell bench press": "Elbows flared to 90 degrees load the front of the shoulder joint; tucking them to about 45 degrees keeps the work on the chest.",
    "Dumbbell fly": "Bending the elbows shortens the lever and turns the fly into a press, so the chest loses its stretch.",
    "Close-grip bench press": "A very narrow grip bends the wrists back and flares the elbows, so the wrists and shoulders take strain without more triceps work.",
    "Overhead triceps extension": "When the elbows drift forward the shoulders move the weight and the long head of the triceps loses the stretch this exercise is chosen for.",
    "Dumbbell kickback": "A swinging upper arm lets the shoulder move the dumbbell, and the triceps never reach the full lockout where they work hardest.",
    "Dumbbell shoulder press": "The bottom of the press, with the dumbbells at ear level, is where the delts work through their full range. Short reps leave it out.",
    "Front raise": "Swinging the torso throws the weight up with the hips, so the front delts only control a small part of the lift.",
    "Cable lateral raise": "Bending the elbow as the arm rises turns the raise into a row, and the side delt does less of the lift.",
    "Upright row": "Pulling the bar to the chin raises the elbows high while the arm is turned in, which can pinch the tendons at the top of the shoulder.",
    "Dumbbell curl": "The biceps work hardest in the stretched part of the curl. Half reps never straighten the arms and skip that range.",
    "Incline dumbbell curl": "The incline curl exists to stretch the long head of the biceps behind the body. Elbows that drift forward give up that stretch and let the front delts help.",
    "Cable curl": "Leaning back starts the bar with the hips and lower back, so the biceps miss the start of the curl and the lower back takes repeated jolts.",
    "Preacher curl": "The pad fixes the upper arm so the biceps work alone. Lifting the elbows lets the front delts finish the curl.",
    "Assisted pull-up": "Partial reps skip the stretched bottom and the hardest top part of the pull, so the lats and arms train through only a small range.",
    "Dumbbell row": "Twisting open uses the torso to throw the dumbbell up, so the lats and upper back do less and the spine twists under load.",
    "T-bar row": "A rounded lower back under a heavy bar loads the spinal discs instead of the back muscles.",
    "Single-arm cable row": "Rocking the torso uses momentum and the lower back to move the handle, so the lat and mid back do less of the pull.",
    "Straight-arm pulldown": "Bending the elbows lets the triceps push the bar down, taking the work away from the lats.",
    "Side plank": "When the hips and chest roll forward, the obliques let go and the supporting shoulder takes more of the body weight.",
    "Crunch": "Pulling with the head strains the neck while the ribs barely move toward the pelvis, so the abs do little.",
    "Knee raise": "An arching back and swinging legs let the hip flexors lift the legs; the pelvis never curls, so the abs barely work.",
    "Russian twist": "Slumping lets the arms swing the plate while the ribcage stays still, so the obliques hardly turn the trunk.",
    "Ab wheel rollout": "At full extension the abs must hold the pelvis. Once the hips drop, the lower back arches under the whole body's weight.",
    "Front squat": "When the elbows drop the bar rolls forward and the chest folds, so the lower back takes over and the bar can slip.",
    "Goblet squat": "The glutes and quads work hardest in the deep part of the squat. Stopping high leaves that range untrained.",
    "Hack squat": "Going deeper than the hips allow curls the pelvis off the pad, so the lower back rounds under the sled's load.",
    "Bulgarian split squat": "Collapsing over the front thigh rounds the back and makes the lower back help lift you, instead of the front leg.",
    "Reverse lunge": "Leaning over the front leg moves the load onto the lower back and makes balance harder, so the front leg does less.",
    "Leg extension": "Kicking the weight up lets momentum carry it through the top, where the quads should work hardest, and the drop jars the knee.",
    "Seated calf raise": "The calves get most of their work in the full stretch at the bottom and the full rise at the top. Short bounces skip both.",
    "Hip thrust": "Arching the lower back raises the hips without extending them further, so the lower back takes over from the glutes at the top.",
    "Glute bridge": "The glutes contract hardest at full hip extension. Stopping halfway leaves the top of the movement untrained.",
    "Cable kickback": "Swinging the leg past the line of the body is done by arching the lower back, not by the glute, and the back takes the strain.",
    "Step-up": "Folding forward and pushing off the back foot lets the trailing leg do the lift, so the working leg's glute and quad do less.",
    "Sumo squat": "Reaching the weight down with a rounding back puts the load on the spine instead of the hips and legs.",
    "Hip abduction": "Rocking the torso uses momentum to push the pads apart, so the outer hip muscles work less.",
    "Cable crossover": "Bending and straightening the elbows turns the fly into a press, so the chest loses its stretch and the triceps help.",
    "Incline push-up": "A sagging hip lets the lower back hang into an arch, and the trunk stops working as one braced plank.",
    "Pec deck fly": "Rolling the shoulders forward at the squeeze shifts the work to the front delts and puts the shoulder joint in a weaker position.",
    "Chest-supported row": "The chest pad is there to take the lower back out of the row. Lifting off it brings momentum and the lower back back in.",
    "Back extension": "Past a straight line the lower back hyperextends and compresses the lumbar spine, with no extra work for the glutes or hamstrings.",
    "Inverted row": "Sagging hips make the body bend instead of rising as one piece, so the trunk stops bracing and the back does less of the pull.",
    "Reverse pec deck": "Shrugging and leaning back hand the work to the traps and momentum, so the rear delts do much less.",
    "Dumbbell shrug": "Bending the elbows lets the biceps help pull the weight up, and the traps lose their stretch at the bottom.",
    "Alternating curl": "Swinging the torso throws each dumbbell up with the hips, so the biceps skip the hardest part of the curl.",
    "Concentration curl": "Straightening the torso lifts the weight with the back, so the biceps, which the brace against the thigh is meant to isolate, do less.",
    "Reverse curl": "When the elbows drift forward the front delts lift the bar and the forearm and elbow flexors lose tension.",
    "Wrist curl": "Once the forearms leave the thighs, the elbows and biceps move the bar and the small wrist flexors barely work.",
    "Cable pushdown": "When the elbows move, the lats and shoulders help push the bar down and the triceps work through less of their range.",
    "Assisted dip": "Very deep dips with the shoulders rolled forward stretch the front of the shoulder joint under load.",
    "Bench dip": "With the shoulders rolled forward and the chest dropped, the front of the shoulder is pinched at the bottom of each rep.",
    "Sissy squat": "Folding at the hips turns it into an ordinary squat and takes away the long quad stretch the sissy squat is used for.",
    "Wall sit": "The quads work in proportion to how deep you sit. Sitting high takes most of the load off them.",
    "Stiff-leg deadlift": "Chasing depth by rounding moves the bend from the hips to the spine; the hamstrings lose their stretch and the lower back takes the load.",
    "Seated leg curl": "Leaning forward shortens the hamstrings at the hip, so they work through less range and the curl gets easier for the wrong reason.",
    "Single-leg Romanian deadlift": "A rounding back means the spine bends instead of the hip, so the hamstring and glute of the standing leg do less.",
    "Good morning": "Bending the knees turns the hinge into a squat, so the hamstrings lose the stretch the good morning is meant to load.",
    "Nordic hamstring curl": "Folding at the hips shortens the lever, so the hamstrings resist much less of the body's weight on the way down.",
    "Leg press calf raise": "Bending the knees lets the quads push the plate, so the calves move through a smaller range.",
    "Single-leg calf raise": "Bending the knee and bouncing lets the leg spring the body up, so the calf skips its full stretch and full rise.",
    "Hanging knee raise": "Below hip height the pelvis never curls, so the hip flexors lift the legs and the abs barely shorten.",
    "Bicycle crunch": "Pulling on the head strains the neck while the ribcage barely turns, so the obliques do little.",
    "Reverse crunch": "If the pelvis stays down, the hip flexors swing the knees and the abs never curl the lower spine.",
    "Bird dog": "Kicking the leg high arches the lower back, which is exactly the movement the bird dog trains you to resist.",
    "Bodyweight squat": "Knees caving inward twist the knee joint and take work away from the glutes; it is a habit that carries over to loaded squats and jumps.",
    "Jump squat": "Knees that collapse on landing load the knee ligaments instead of the muscles that should absorb the impact.",
    "Burpee": "As fatigue builds, a sagging plank lets the lower back take the load each time the feet land.",
    "Mountain climber": "Piked hips shorten the plank, so the abs stop bracing and the drill loses most of its core work.",
    "Kettlebell swing": "The swing is a hip hinge. Squatting it shifts the work to the quads and the hips never snap, so the bell is lifted by the arms and back.",
    "Farmer's carry": "Rounding under the load lets the spine hang on the ligaments instead of the trunk muscles holding it upright.",
    "Battle rope": "Stiff legs and a rounded back make the lower back absorb every wave instead of the legs and trunk.",
    "Box jump": "Landing with the knees caving in loads the knee ligaments instead of the hips and thighs, which should absorb the impact.",
    "Sled push": "With a rounded back the spine transmits the push instead of the legs and braced trunk driving it.",
    "Sled pull": "Rowing with the arms tires them long before the legs do the work the sled pull is for."
  };
  const TITLE = {
    "Dumbbell shoulder press": "Stopping above the head",
    "Dumbbell curl": "Arms never straighten",
    "Assisted pull-up": "Half reps at both ends",
    "Goblet squat": "Squat stops well above parallel",
    "Seated calf raise": "Short bouncing reps",
    "Hanging knee raise": "Knees stop below the hips"
  };
  Object.keys(WHY).forEach((n) => {
    const e = FORM[n] && FORM[n].error;
    if (!e) return;
    if (!e.why) e.why = WHY[n];
    if (TITLE[n]) e.title = TITLE[n];
  });
  // The 2D arm is shorter than the 3D one, so a press reaching for the 2D hand stops short of
  // lockout. ik.reach stretches the reach from the shoulder so the top of each press (and the
  // hang of each pull) is a straight-but-soft elbow (about 165 degrees), measured by the contact audit.
  const REACH = {
    "Barbell bench press": 1.09, "Machine chest press": 1.08, "Incline dumbbell press": 1.04, "Dips": 1.11,
    "Incline bench press": 1.04, "Decline bench press": 1.1, "Dumbbell bench press": 1.1, "Close-grip bench press": 1.1,
    "Dumbbell shoulder press": 1.04, "Assisted dip": 1.11, "Assisted pull-up": 1.03, "Inverted row": 1.04
  };
  EXERCISES.forEach((ex) => {
    const r = REACH[ex.name], f = ex.figure3d;
    if (r && f && f.ik && !f.ik.reach) f.ik = { ...f.ik, reach: r };
  });
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
    "Side plank": ["free", "planted"], "Crunch": ["free", "planted"], "Knee raise": ["both", "hang"],
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
    "Sled push": ["both", "moving"], "Sled pull": ["both", "moving"],
    "Band biceps curl": ["both", "planted"], "Band triceps pushdown": ["both", "planted"], "Band pull-apart": ["both", "planted"]
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

// ---------- Round 5: exercise-specific mechanics, tempo and honest demo flags ----------
// MOTION5[name] overrides the 3D demonstration only (figure3d: a / b / keys, stance, scapula, IK);
// the 2D figure keeps its own poses. Pose angles are side-view bone directions (js/figure.js).
// Checked with the contact audit and a biomechanics audit (centre of mass over the feet, bar over
// mid-foot, knee over toes, body line, joint ranges, acceleration) plus contact sheets.
// animation.tempo: { ms, segs: [[end of segment (cycle 0..1), from, to, ease]] } where from/to are
// the blend between pose a (0) and pose b (1); ease "ecc" = controlled lowering, "con" = drive.
(() => {
  const S0 = { x: 100, y: 186, shin: 0, thigh: 0, torso: 0, neck: 0, ua: 180, fa: 180 };
  // Floor under the flat (planted) foot: the rear foot's rigid toes would otherwise set it.
  const LUNGE_FLOOR = (bone) => (ctx) => ctx.lowest({}, (n) => n === bone);
  const MOTION5 = {
    // Squats: feet planted shoulder-width with the toes turned out; the knees bend toward the toes
    // (stance IK); the trunk leans so the bar stays over the mid-foot all the way down.
    "Back squat": { stance: { w: 17, toe: 22 }, keysEase: "spline",
      a: { ...S0, x: 94, shin: 5, thigh: -2, torso: 12, neck: 6, ua: 195, fa: -12 },
      keys: [{ at: 0.5, shin: 26, thigh: -55, torso: 38, neck: 22 }],
      b: { ...S0, x: 94, shin: 35, thigh: -82, torso: 45, neck: 26, ua: 235, fa: 28 } },
    "Front squat": { stance: { w: 16, toe: 18 } },
    "Goblet squat": { stance: { w: 18, toe: 22 } },
    "Bodyweight squat": { stance: { w: 15, toe: 16 } },
    // Sumo: wide stance, toes well out; the hips sink almost straight down between the heels.
    "Sumo squat": { stance: { w: 27, toe: 35 }, b: { ...S0, x: 96, shin: 47.2, thigh: -56, torso: 15, neck: 8, ua: 168, fa: 170 } },
    // Hinges: the bar travels straight up and down over the mid-foot, touching the legs; knees and
    // hips extend together off the floor (trunk angle nearly constant), then the hips come through.
    "Deadlift": { keysEase: "spline",
      a: { ...S0, x: 96, shin: 3, thigh: 3, torso: 2, neck: 2, ua: 180, fa: 180 },
      keys: [{ at: 0.34, shin: 2, thigh: -34, torso: 34, neck: 30, ua: 181, fa: 181 },
        { at: 0.64, shin: 3, thigh: -50.7, torso: 50, neck: 42, ua: 183, fa: 182 }],
      b: { ...S0, x: 96, shin: 10, thigh: -74.6, torso: 57.3, neck: 46, ua: 184, fa: 183 } },
    "Romanian deadlift": { keysEase: "spline",
      a: { ...S0, x: 104, ua: 180, fa: 180 },
      keys: [{ at: 0.5, shin: 5, thigh: -33, torso: 30.3, neck: 27, ua: 181, fa: 181 }],
      b: { ...S0, x: 104, shin: 7, thigh: -54.1, torso: 51.1, neck: 44, ua: 183, fa: 182 } },
    "Stiff-leg deadlift": { keysEase: "spline",
      a: { ...S0, x: 104, ua: 180, fa: 180 },
      keys: [{ at: 0.5, shin: 2, thigh: -30, torso: 34, neck: 30, ua: 182, fa: 182 }],
      b: { ...S0, x: 104, shin: 3, thigh: -59.8, torso: 61.5, neck: 52, ua: 184, fa: 183 } },
    // Barbell row: hips back so the hanging bar is over the mid-foot; the trunk holds still while
    // the elbows drive back.
    "Barbell row": { a: { ...S0, x: 96, shin: 12, thigh: -61.3, torso: 54.2, neck: 60, ua: 186, fa: 186 },
      b: { ...S0, x: 96, shin: 12, thigh: -61.3, torso: 54.2, neck: 60, ua: 251, fa: 161 } },
    // Good morning: the hips travel back (soft knees) as the trunk hinges, keeping the bar over the feet.
    "Good morning": { b: { ...S0, x: 94, shin: 8, thigh: -46, torso: 64, neck: 56, ua: 271, fa: 64 } },
    // Single-leg RDL: the stance hip travels back further so the weight stays over the mid-foot.
    "Single-leg Romanian deadlift": { b: { x: 104, y: 186, shin: 8, thigh: -24, torso: 80, neck: 74, ua: 180, fa: 180, t2: 262, s2: 264, f2: 172 } },
    // Overhead press: the bar leaves the front of the shoulders, the head moves back as it passes
    // the face, and the bar finishes over the shoulders and mid-foot with the head through.
    "Overhead press": { keysEase: "spline", ik: { direct: true, grip: 25, reach: 1.1, pole: [0.45, -1, 0.75] },
      a: { ...S0, torso: -3, neck: -3, ua: 117.8, fa: -26.6 },
      keys: [{ at: 0.3, torso: -3, neck: -14, ua: 99.6, fa: -47.3 }, { at: 0.56, torso: -2, neck: -10, ua: 69.1, fa: -51.9 },
        { at: 0.8, torso: -1, neck: 0, ua: 45.7, fa: -41.3 }],
      b: { ...S0, torso: 0, neck: 4, ua: 7.8, fa: -7.3 } },
    // Lunges step: the stepping foot leaves the floor, lands and stays put (foot IK targets); the
    // other foot keeps its toes down while its heel rises.
    "Walking lunge": { keysEase: "spline", ground: LUNGE_FLOOR("footR"),
      a: { ...S0, x: 139.5, y: 193, anchor: "ball2", t2: 180, s2: 180, f2: 90, ankR: [120, 186] },
      keys: [{ at: 0.24, torso: 3, neck: 3, thigh: -41.1, shin: 16.1, foot: 80, t2: 190.9, s2: 207, f2: 97, ankR: [164, 177] },
        { at: 0.5, torso: 4, neck: 4, shin: -21.6, thigh: -41.5, foot: 72, t2: 196.1, s2: 234.2, f2: 117, ankR: [214.3, 183.5] },
        { at: 0.72, torso: 5, neck: 5, shin: 0.9, thigh: -64.6, foot: 90, t2: 185.2, s2: 261.8, f2: 138, ankR: [214.3, 186] }],
      b: { ...S0, x: 139.5, y: 193, anchor: "ball2", torso: 6, neck: 6, shin: 10, thigh: -82.3, foot: 90, t2: 182.2, s2: 281.8, f2: 154, ankR: [214.3, 186] } },
    "Reverse lunge": { keysEase: "spline", ground: LUNGE_FLOOR("footR"),
      a: { ...S0, x: 120, t2: 180, s2: 180, f2: 90, toeL: [139.5, 193] },
      keys: [{ at: 0.26, shin: 13.9, thigh: -16.7, torso: 8, neck: 6, t2: 190.5, s2: 233.6, f2: 112, toeL: [92, 185] },
        { at: 0.45, shin: 24.5, thigh: -40.8, torso: 16, neck: 12, t2: 210.4, s2: 240.9, f2: 118, toeL: [66, 188] },
        { at: 0.6, shin: 25.9, thigh: -54.8, torso: 17, neck: 13, t2: 211.3, s2: 247.6, f2: 126, toeL: [55, 193] }],
      b: { ...S0, x: 120, shin: 18.6, thigh: -80.1, torso: 10, neck: 8, t2: 177.5, s2: 281.8, f2: 154, toeL: [55, 193] } },
    // Arnold press: dumbbells start in front of the face, palms toward you, elbows forward; the
    // elbows swing out to the sides as the palms turn forward, and the press finishes overhead.
    "Arnold press": { keysEase: "spline", grip: "neutral", ik: { direct: true, grip: 14, reach: 1.04, pole: [0.15, -0.55, 1] },
      a: { x: 84, y: 136, anchor: "hip", shin: -12, thigh: -90, torso: 0, neck: 0, ua: 135.3, fa: -12.6, gz: 11, sup: 90, pole: [1, -0.7, 0.15] },
      keys: [{ at: 0.45, ua: 75.5, fa: -63.5, gz: 32, sup: 10, pole: [0.15, -0.6, 1] }],
      b: { x: 84, y: 136, anchor: "hip", shin: -12, thigh: -90, torso: 0, neck: 0, ua: 1.5, fa: -0.6, gz: 17, sup: -80, pole: [0.1, -0.5, 1] } },
    // Curls: the forearm turns from palm-in at the bottom to palm-up at the top.
    "Dumbbell curl": { grip: "neutral", a: { ...S0, ua: 178, fa: 175, sup: 0 }, b: { ...S0, ua: 172, fa: 28, sup: 80 } },
    // Bulgarian split squat: the rear ankle stays planted on the bench edge while the
    // rear knee drops nearly straight down; trunk tall with a slight forward lean.
    "Bulgarian split squat": {
      a: { x: 120, y: 186, shin: -5, thigh: -17, torso: 8, neck: 6, ua: 180, fa: 180, t2: 202.5, s2: 272.5, f2: 257 },
      b: { x: 120, y: 186, shin: 10, thigh: -79.5, torso: 15, neck: 10, ua: 180, fa: 180, t2: 202.9, s2: 325.7, f2: 261 } },
    // Cable kickback: the working foot hovers just off the floor behind the standing foot at the
    // start (it never scuffs along the floor) and the heel drives back until the thigh lines up.
    "Cable kickback": {
      a: { x: 100, y: 186, shin: 6, thigh: -8, torso: 35, neck: 30, ua: 100, fa: 95, t2: 178, s2: 216, f2: 98 },
      b: { x: 100, y: 186, shin: 6, thigh: -8, torso: 35, neck: 30, ua: 100, fa: 95, t2: 218, s2: 226, f2: 150 } },
    // Standing calf raise: the body pivots about the tip of the foot on the step edge (the rig has
    // no toe joint), so the forefoot stays put while the heels drop below the step and rise. The
    // body leans just enough to keep the shoulders (and the machine's pads) straight above the
    // forefoot, so they rise vertically with the carriage.
    "Standing calf raise": {
      a: { x: 115.1, y: 188.4, anchor: "ball", shin: 6.9, thigh: 6.9, torso: 6.9, neck: 0, foot: 108, ua: 165, fa: 95 },
      b: { x: 115.1, y: 188.4, anchor: "ball", shin: 2.3, thigh: 2.3, torso: 2.3, neck: 0, foot: 145, ua: 165, fa: 95 } },
    // Face pull: the hands travel from the rope at arm's length straight in toward the forehead
    // (reach IK around the shoulder) while the elbows open out to the sides at shoulder height;
    // the elbows never drop through a row-like path.
    "Face pull": { ik: { grip: 5, reach: 1.22, pole: [-0.3, 0.25, 1] },
      a: { ...S0, x: 86, torso: -6, neck: -2, ua: 82, fa: 84, gz: 5 },
      b: { ...S0, x: 86, torso: -6, neck: -2, ua: 109, fa: -17.4, gz: 13 } },
    // Incline push-up: hands planted on the bench; the straight body pivots about the feet until
    // the chest is a few centimetres above the bench edge (it previously stopped ~30 cm short).
    "Incline push-up": {
      a: { x: 30, y: 182, foot: 144, shin: 46.5, thigh: 46.5, torso: 46.5, neck: 51, ua: 172.5, fa: 157.2 },
      b: { x: 30, y: 182, foot: 147, shin: 65.2, thigh: 65.2, torso: 65.2, neck: 70, ua: 235, fa: 140 } },
    // Mountain climber: a lower, straighter plank so the toes and the palms both reach the floor
    // (at 70 degrees the toes sat ~8 cm below the palms and the hands hovered).
    "Mountain climber": { keysEase: "spline",
      // Toe targets (foot IK): the driving foot travels forward a few cm above the floor instead
      // of swinging down through it.
      a: { anchor: "hand", x: 130, y: 187, foot: 165, shin: 74, thigh: 74, torso: 74, neck: 78, ua: 180, fa: 180, t2: 254, s2: 254, f2: 165, toeR: [-2.4, 187.1], toeL: [-2.4, 187.1] },
      keys: [{ at: 0.33, thigh: -45, shin: 95, foot: 150, toeR: [71.6, 181], toeL: [-2.4, 187.1] }, { at: 0.66, toeR: [-2.4, 187.1], toeL: [-2.4, 187.1] }],
      b: { anchor: "hand", x: 130, y: 187, foot: 165, shin: 74, thigh: 74, torso: 74, neck: 78, ua: 180, fa: 180, t2: 135, s2: 275, f2: 150, toeR: [-2.4, 187.1], toeL: [71.6, 181] } },
    // Burpee: one floor for every phase (the palms reach it in the squat, the toes in the plank
    // and at the bottom); the feet hop back and forward on toe targets (foot IK) instead of the
    // legs swinging through the floor, which had dropped the floor 40 cm below the hands.
    "Burpee": { keysEase: "spline", kneeFK: true,
      a: { ...S0, flat: 0, toeR: [119.5, 193], toeL: [119.5, 193] },
      keys: [{ at: 0.3, fix: "ankle", shin: 46, thigh: -86, torso: 66.4, neck: 80, ua: 176, fa: 168, flat: 1, toeR: [119.5, 193], toeL: [119.5, 193] },
        { at: 0.46, fix: "hand", foot: 140, shin: 75, thigh: 40, torso: 82, neck: 88, ua: 179, fa: 176, flat: 1, toeR: [58, 175], toeL: [58, 175] },
        { at: 0.62, fix: "hand", foot: 165, shin: 72.9, thigh: 72.9, torso: 72.9, neck: 77, ua: 180, fa: 180, flat: 1, toeR: [12.2, 193], toeL: [12.2, 193] }],
      b: { anchor: "hand", x: 143.9, y: 190.4, fix: "hand", foot: 165, shin: 86.7, thigh: 86.7, torso: 86.7, neck: 90, ua: 245, fa: 118, flat: 1, toeR: [8.9, 193], toeL: [8.9, 193] } },
    // Push-up: hands stay planted; the whole body lowers as one line until the chest is a few
    // centimetres off the floor (elbows about 40 degrees from the trunk via the elbow pole).
    "Push-up": { b: { x: 30, y: 166, foot: 160, shin: 90, thigh: 90, torso: 90, neck: 93, ua: 235, fa: 126 } },
    // Bench pressing keeps the shoulder blades pinned back and down.
    "Barbell bench press": { scap: { k: 0, prot: -1.6 } }, "Incline bench press": { scap: { k: 0, prot: -1.6 } },
    "Decline bench press": { scap: { k: 0, prot: -1.6 } }, "Close-grip bench press": { scap: { k: 0, prot: -1.6 } },
    "Dumbbell bench press": { scap: { k: 0, prot: -1.6 } }, "Incline dumbbell press": { scap: { k: 0, prot: -1.6 } },
    "Dumbbell fly": { scap: { k: 0, prot: -1.6 } }
  };
  // Rep tempo: lowering first (a -> b is the eccentric half) or lifting first.
  const ECC = { ms: 4200, segs: [[0.06, 0, 0], [0.46, 0, 1, "ecc"], [0.53, 1, 1], [0.84, 1, 0, "con"], [1, 0, 0]] };
  const CON = { ms: 3800, segs: [[0.06, 0, 0], [0.38, 0, 1, "con"], [0.47, 1, 1], [0.88, 1, 0, "ecc"], [1, 0, 0]] };
  const ISO = { ms: 4400, segs: [[0.5, 0, 1, "ecc"], [1, 1, 0, "ecc"]] }; // a held position, breathing
  const KEEP = /^(Jump squat|Burpee|Mountain climber|Farmer's carry|Battle rope|Box jump|Sled push|Sled pull|Alternating curl|Bicycle crunch|Kettlebell swing|Bird dog|Dead bug|Russian twist)$/;
  const LOWER_FIRST = /lower|descend|hinge|open wide|roll out|slide down|step back|knees forward|step and/i;
  // Honest demonstration status after the round-5 review (contact + biomechanics audits and
  // front/side/three-quarter contact sheets of both athletes). demoNote names the known defect.
  // Upholstery overlaps up to ~3 cm read as foam giving under the body and are not listed.
  const DEMO = {
    "Battle rope": ["hidden", "The rope does not follow the hands: the hands sit up to 17 cm off the rope ends and the rope slides about 45 cm through the grip."],
    "Walking lunge": ["beta", "Shown stepping in place: the stepping foot returns to the start each rep instead of travelling forward."],
    "Jump squat": ["beta", "Take-off and landing are approximate: the body jumps about 14 cm in one frame at take-off and the feet slide about 6 cm on landing."],
    "Box jump": ["beta", "Abrupt take-off (about 13 cm in one frame) and the hands flip about 26 degrees during the arm swing."],
    "Burpee": ["beta", "The hop back lands abruptly at the plank (about 12 cm in one frame) and the hands snap flat as they reach the floor."],
    "Mountain climber": ["beta", "The fast knee drive reverses abruptly at the chest (about 8 cm in one frame)."],
    "Farmer's carry": ["beta", "Walking is shown in place: the feet slide about 17 cm and each step jumps about 4 cm."],
    "Sled push": ["beta", "Steps are shown in place: the feet slide about 9 cm and each step jumps about 6 cm."],
    "Sled pull": ["beta", "Steps are shown in place: the feet slide about 15 cm and each step jumps about 9 cm."],
    "Bird dog": ["beta", "The supporting hand slides about 6 cm on the floor as the opposite arm reaches."],
    "Seated calf raise": ["beta", "The hands sit about 10 cm off the machine handles and the forearm passes about 5 cm into the knee pad."],
    "Standing calf raise": ["beta", "The hands sit about 4 cm off the handle bar with the fist turned across it; the foot pivots on the toe tip (the rig has no toe joint)."],
    "Cable crunch": ["beta", "The rope handle jumps about 10 cm at one point and the neck passes about 4 cm into the cable tower frame."],
    "Reverse pec deck": ["beta", "The machine arms jump about 17 cm at one point in the rep."],
    "Overhead triceps extension": ["beta", "The hands slide about 5 cm along the handle with the fists turned across it, and the weight touches the upper back."],
    "Upright row": ["beta", "The fists turn about 60 degrees across the bar and flip about 20 degrees near the top."],
    "Pallof press": ["beta", "The handle tilts about 9 cm between the two hands."],
    "Russian twist": ["beta", "The held weight tilts about 10 cm between the hands."],
    "Back extension": ["beta", "The head passes about 4 cm into the machine's steel frame near the bottom."],
    "Preacher curl": ["beta", "The thigh passes about 3.5 cm into the pad's steel frame."],
    "Leg curl": ["beta", "The upper arm passes about 4 cm into the pad at the start."],
    "Chest-supported row": ["beta", "The head passes about 4 cm into the chest pad."],
    "Wrist curl": ["beta", "The thigh passes about 4 cm into the bench pad."],
    "Incline dumbbell curl": ["beta", "The dumbbell grazes the side of the torso (about 3 cm) at the bottom."],
    "Sumo squat": ["beta", "The hanging dumbbell overlaps the front of the hips by about 3 cm."],
    "Pec deck fly": ["beta", "The foot overlaps the machine frame by about 2.5 cm."],
    "Cable curl": ["beta", "The hands slide about 3.5 cm along the straight bar."],
    "Seated leg curl": ["beta", "The hands sit about 3 cm off the seat handles."],
    "Leg press": ["beta", "The hands are turned about 75 degrees across the side handles."],
    "Leg press calf raise": ["beta", "The hands are turned about 75 degrees across the side handles."],
    "Sissy squat": ["beta", "The supporting hand is turned about 30 degrees across the upright and the feet slide about 4 cm."]
  };
  EXERCISES.forEach((ex) => {
    const d = DEMO[ex.name];
    if (d) { ex.demo = d[0]; ex.demoNote = d[1]; } else ex.demo = "ready";
  });
  // Mistake examples rebuilt on the round-5 poses (same fault, matched to the new keys and depth).
  const BAD5 = {
    "Burpee": { keys: [{}, {}, { thigh: 76, shin: 76, torso: 64 }] },
    "Incline push-up": { a: { shin: 49, thigh: 52, torso: 40, neck: 45 }, b: { shin: 68, thigh: 71, torso: 58, neck: 63 } }
  };
  EXERCISES.forEach((ex) => {
    const m = MOTION5[ex.name];
    if (m) ex.figure3d = { ...(ex.figure3d || {}), ...m };
    if (BAD5[ex.name]) ex.bad3d = { ...(ex.bad3d || {}), ...BAD5[ex.name] };
    if (KEEP.test(ex.name)) return;
    const tl = ex.phaseTimeline || [], labels = tl.map((p) => p.label);
    const iso = /^(Plank|Side plank)$/.test(ex.name);
    const ecc = !iso && labels.length > 1 && LOWER_FIRST.test(labels[1]);
    const tp = iso ? ISO : ecc ? ECC : CON;
    ex.animation = { ...(ex.animation || {}), tempo: tp };
    if (iso || labels.length < 4) return;
    // Phase labels on the tempo's five segments: start, first half, transition, second half, finish.
    const L5 = labels.length >= 5 ? labels.slice(0, 5) : [...labels.slice(0, 4), labels[0]];
    let s = 0;
    ex.phaseTimeline = tp.segs.map(([end], i) => { const ph = { label: L5[i], t0: s, t1: end }; s = end; return ph; });
  });
})();

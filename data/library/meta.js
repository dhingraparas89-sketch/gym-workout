// Catalog fields for the original exercises and defaults for every exercise (see data/SCHEMA.md).
// Loaded after every data/library/*.js file, so the defaults pass sees the whole library.

// ---------- Categories ----------
// The seven browse categories. An exercise belongs to its `group` plus any `categories`.
if (!GROUPS.some((g) => g.id === "glutes")) GROUPS.push({ id: "glutes", name: "Glutes" });
const CATEGORIES = [
  { id: "chest", name: "Chest" }, { id: "back", name: "Back" }, { id: "shoulders", name: "Shoulders" },
  { id: "arms", name: "Arms" }, { id: "legs", name: "Legs" }, { id: "glutes", name: "Glutes" }, { id: "core", name: "Core" }
];
const EQUIPMENT_TYPES = [
  { id: "barbell", name: "Barbell" }, { id: "dumbbell", name: "Dumbbell" }, { id: "cable", name: "Cable" },
  { id: "machine", name: "Machine" }, { id: "bodyweight", name: "Bodyweight" }
];
const DIFFICULTIES = [
  { id: "beginner", name: "Beginner" }, { id: "intermediate", name: "Intermediate" }, { id: "advanced", name: "Advanced" }
];

// ---------- Muscles: anatomy, function and common mistakes (muscle explorer) ----------
Object.assign(MUSCLE_INFO.chest, {
  name: "Pectoralis major", function: "Horizontal adduction and internal rotation of the arm; the main pressing muscle.",
  mistakes: ["Cutting the range short so the chest never stretches", "Letting the shoulders roll forward at lockout", "Flaring the elbows to 90° on presses"]
});
Object.assign(MUSCLE_INFO.shoulders, {
  name: "Anterior & lateral deltoid", function: "Raises the arm forward (flexion) and out to the side (abduction); drives every overhead press.",
  mistakes: ["Shrugging the traps into raises", "Leaning back to finish a press", "Swinging heavy dumbbells with momentum"]
});
Object.assign(MUSCLE_INFO["rear-delts"], {
  name: "Posterior deltoid", function: "Horizontal abduction and external rotation; balances the shoulder and holds posture.",
  mistakes: ["Pulling with the traps instead of the rear delts", "Going too heavy and rowing the weight", "Losing the flat back on bent-over raises"]
});
Object.assign(MUSCLE_INFO.traps, {
  name: "Trapezius", function: "Elevates, retracts and depresses the shoulder blades; stabilizes the neck and shoulder girdle.",
  mistakes: ["Rolling the shoulders on shrugs", "Letting the upper traps take over raises", "Neck pushed forward under load"]
});
Object.assign(MUSCLE_INFO["upper-back"], {
  name: "Rhomboids & middle trapezius", function: "Squeeze the shoulder blades together (scapular retraction) on every row.",
  mistakes: ["Pulling with the arms only, no squeeze", "Rounding forward to reach the handle", "Jerking the weight with the hips"]
});
Object.assign(MUSCLE_INFO.lats, {
  name: "Latissimus dorsi", function: "Shoulder extension and adduction: pulls the arm down and back toward the hip.",
  mistakes: ["Leaning far back and turning it into a row", "Half reps without a full stretch at the top", "Kipping or swinging for momentum"]
});
Object.assign(MUSCLE_INFO["lower-back"], {
  name: "Erector spinae", function: "Extends the spine and holds it neutral under load in hinges and squats.",
  mistakes: ["Rounding the lower back under the bar", "Hyperextending at the top of a lift", "Using the lower back to yank rows"]
});
Object.assign(MUSCLE_INFO.biceps, {
  name: "Biceps brachii", function: "Flexes the elbow and supinates the forearm (turns the palm up).",
  mistakes: ["Swinging the torso to lift the weight", "Elbows drifting forward", "Skipping the lowering phase"]
});
Object.assign(MUSCLE_INFO.triceps, {
  name: "Triceps brachii", function: "Extends the elbow; the long head also extends the shoulder.",
  mistakes: ["Elbows flaring out on extensions", "Leaning over the cable to push with bodyweight", "Not reaching full lockout"]
});
Object.assign(MUSCLE_INFO.forearms, {
  name: "Brachioradialis & forearm flexors", function: "Grip, wrist flexion and elbow flexion with a neutral grip.",
  mistakes: ["Letting the wrists bend back under load", "Relying on straps for every set", "Squeezing so hard the elbows lock up"]
});
Object.assign(MUSCLE_INFO.abs, {
  name: "Rectus abdominis", function: "Flexes the spine (curls ribs to pelvis) and braces the trunk against extension.",
  mistakes: ["Pulling with the arms or hip flexors", "Letting the lower back arch", "Holding the breath instead of bracing"]
});
Object.assign(MUSCLE_INFO.obliques, {
  name: "External & internal obliques", function: "Rotate and side-bend the trunk, and resist rotation.",
  mistakes: ["Twisting from the hips instead of the trunk", "Leaning away from the load", "Rushing reps without control"]
});
Object.assign(MUSCLE_INFO.glutes, {
  name: "Gluteus maximus", function: "Hip extension and external rotation; the strongest hip extensor.",
  mistakes: ["Hips shooting up first out of the hole", "Overarching the lower back at lockout", "Knees caving in"]
});
Object.assign(MUSCLE_INFO.quads, {
  name: "Quadriceps femoris", function: "Extends the knee; the rectus femoris also flexes the hip.",
  mistakes: ["Knees caving inward", "Cutting depth short", "Heels lifting off the floor"]
});
Object.assign(MUSCLE_INFO.hamstrings, {
  name: "Biceps femoris, semitendinosus, semimembranosus", function: "Flex the knee and extend the hip; brake the hip hinge.",
  mistakes: ["Rounding the back to reach lower", "Bending the knees too much on hinges", "Hips lifting off the pad on curls"]
});
Object.assign(MUSCLE_INFO.calves, {
  name: "Gastrocnemius & soleus", function: "Plantar flexion: points the foot and lifts the heel.",
  mistakes: ["Bouncing out of the bottom", "Partial reps without a full stretch", "Bending the knees to cheat"]
});

// The clickable regions of the muscle map, and the muscle ids each covers.
const MUSCLE_REGIONS = [
  { id: "chest", name: "Chest", muscles: ["chest"], side: "front" },
  { id: "shoulders", name: "Shoulders", muscles: ["shoulders"], side: "front" },
  { id: "biceps", name: "Biceps", muscles: ["biceps"], side: "front" },
  { id: "triceps", name: "Triceps", muscles: ["triceps"], side: "back" },
  { id: "forearms", name: "Forearms", muscles: ["forearms"], side: "front" },
  { id: "abs", name: "Abs", muscles: ["abs"], side: "front" },
  { id: "obliques", name: "Obliques", muscles: ["obliques"], side: "front" },
  { id: "back", name: "Back", muscles: ["lats", "upper-back", "traps", "lower-back", "rear-delts"], side: "back" },
  { id: "glutes", name: "Glutes", muscles: ["glutes"], side: "back" },
  { id: "quads", name: "Quads", muscles: ["quads"], side: "front" },
  { id: "hamstrings", name: "Hamstrings", muscles: ["hamstrings"], side: "back" },
  { id: "calves", name: "Calves", muscles: ["calves"], side: "back" }
];
const REGION_OF = {};
MUSCLE_REGIONS.forEach((r) => r.muscles.forEach((m) => { REGION_OF[m] = r.id; }));

// ---------- Catalog fields for the original exercises ----------
const META_ANAT = {
  chest: "Pectoralis major", shoulders: "Anterior deltoid", "rear-delts": "Posterior deltoid", traps: "Trapezius",
  "upper-back": "Rhomboids", lats: "Latissimus dorsi", "lower-back": "Erector spinae", biceps: "Biceps brachii",
  triceps: "Triceps brachii", forearms: "Forearm flexors", abs: "Rectus abdominis", obliques: "Obliques",
  glutes: "Gluteus maximus", quads: "Quadriceps", hamstrings: "Hamstrings", calves: "Gastrocnemius"
};

const META_CATALOG = {
  "Barbell bench press": {
    equip: "barbell", setup: "Barbell + flat bench with rack", difficulty: "intermediate", movementType: "compound",
    anatomy: { primary: ["Pectoralis major"], secondary: ["Anterior deltoid", "Triceps brachii"] },
    activation: { chest: 92, shoulders: 62, triceps: 68 },
    phases: ["Setup: eyes under the bar, shoulder blades pinned, feet planted", "Unrack: lock the bar out over the shoulders", "Descent: lower under control to mid-chest", "Bottom: light touch, elbows about 45° from the torso", "Press: drive up and slightly back to lockout"],
    cues: ["Pin the shoulder blades back and down", "Touch the middle of the chest every rep", "Elbows about 45°, not flared", "Drive the feet into the floor"],
    mistakes: ["Stopping halfway down", "Bouncing the bar off the chest", "Elbows flared to 90°", "Butt lifting off the bench"],
    formChecks: ["Full depth", "Retracted shoulders", "Bar path", "Elbow angle", "Planted feet", "Tempo"], faultCheck: "Full depth"
  },
  "Incline dumbbell press": {
    equip: "dumbbell", setup: "Dumbbells + bench at 30°", difficulty: "beginner", movementType: "compound",
    anatomy: { primary: ["Pectoralis major (clavicular head)"], secondary: ["Anterior deltoid", "Triceps brachii"] },
    activation: { chest: 88, shoulders: 70, triceps: 58 },
    phases: ["Setup: bench at 30°, dumbbells on the thighs", "Kick up: bring the weights to the shoulders", "Descent: lower beside the upper chest", "Bottom: forearms vertical, chest stretched", "Press: up and slightly in to lockout"],
    cues: ["Bench at 30°, not steeper", "Forearms vertical at the bottom", "Lower until the chest stretches", "Keep the shoulder blades back"],
    mistakes: ["Half reps at the top", "Bench too steep (turns into a shoulder press)", "Dumbbells drifting wide"],
    formChecks: ["Full depth", "Vertical forearms", "Bench angle", "Stable shoulders", "Tempo", "Symmetry"], faultCheck: "Full depth"
  },
  "Cable fly": {
    equip: "cable", setup: "Cable crossover, handles at chest height", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Pectoralis major"], secondary: ["Anterior deltoid"] },
    activation: { chest: 90, shoulders: 45 },
    phases: ["Setup: staggered stance, slight forward lean", "Open: arms wide, chest stretched", "Sweep: hug the hands together", "Squeeze: hands meet in front of the chest", "Return: open slowly to the stretch"],
    cues: ["Lock a soft bend in the elbows", "Move only at the shoulder", "Squeeze the chest as the hands meet"],
    mistakes: ["Bending and straightening the elbows", "Too heavy, so the torso rocks", "Shoulders rolling forward"],
    formChecks: ["Fixed elbows", "Chest stretch", "Hands meet", "Steady torso", "Tempo", "Shoulder position"], faultCheck: "Fixed elbows"
  },
  "Machine chest press": {
    equip: "machine", setup: "Seated chest press machine", difficulty: "beginner", movementType: "compound",
    anatomy: { primary: ["Pectoralis major"], secondary: ["Triceps brachii", "Anterior deltoid"] },
    activation: { chest: 88, triceps: 60, shoulders: 55 },
    phases: ["Setup: seat so the handles sit at mid-chest", "Brace: back and shoulders flat on the pad", "Press: push the handles forward", "Lockout: arms straight, shoulders still pinned", "Return: let the handles back slowly"],
    cues: ["Handles level with mid-chest", "Keep the shoulder blades on the pad", "Control the return"],
    mistakes: ["Shoulders rolling off the pad", "Seat too low or too high", "Letting the stack slam"],
    formChecks: ["Shoulders pinned", "Handle height", "Flat back", "Controlled lockout", "Tempo", "Range of motion"], faultCheck: "Shoulders pinned"
  },
  "Push-up": {
    equip: "bodyweight", setup: "Floor", difficulty: "beginner", movementType: "compound",
    anatomy: { primary: ["Pectoralis major", "Triceps brachii"], secondary: ["Anterior deltoid", "Rectus abdominis"] },
    activation: { chest: 85, triceps: 75, shoulders: 58, abs: 50 },
    phases: ["Setup: hands under the shoulders, body straight", "Brace: squeeze glutes and abs", "Descent: lower as one plank", "Bottom: chest just above the floor", "Press: push the floor away"],
    cues: ["One straight line from head to heels", "Elbows about 45° from the body", "Chest nearly touches the floor"],
    mistakes: ["Hips sagging", "Head poking forward", "Half reps"],
    formChecks: ["Straight body line", "Braced core", "Chest depth", "Elbow path", "Tempo", "Hip position"], faultCheck: "Straight body line"
  },
  "Deadlift": {
    equip: "barbell", setup: "Barbell + bumper plates on a platform", difficulty: "advanced", movementType: "compound", categories: ["glutes", "legs"],
    anatomy: { primary: ["Gluteus maximus", "Hamstrings", "Erector spinae"], secondary: ["Trapezius", "Forearm flexors", "Quadriceps", "Latissimus dorsi"] },
    activation: { glutes: 90, hamstrings: 85, "lower-back": 88, traps: 60, forearms: 62, quads: 55, lats: 50 },
    phases: ["Setup: bar over midfoot, shins to the bar", "Brace: flat back, lats tight, breath held", "Drive: push the floor away", "Lockout: hips through, stand tall", "Return: hinge back down with the bar close"],
    cues: ["Bar over the middle of the foot", "Keep the bar dragging up the legs", "Push the floor away", "Hips and shoulders rise together"],
    mistakes: ["Rounded lower back", "Bar drifting away from the legs", "Hips shooting up first", "Leaning back at lockout"],
    formChecks: ["Spine position", "Bar over midfoot", "Bar close", "Hip position", "Leg drive", "Lockout"], faultCheck: "Spine position"
  },
  "Pull-up": {
    equip: "bodyweight", setup: "Pull-up bar", difficulty: "intermediate", movementType: "compound",
    anatomy: { primary: ["Latissimus dorsi"], secondary: ["Biceps brachii", "Rhomboids", "Forearm flexors"] },
    activation: { lats: 92, biceps: 65, "upper-back": 60, forearms: 55 },
    phases: ["Hang: full dead hang, shoulders active", "Initiate: pull the shoulder blades down", "Pull: drive the elbows to the ribs", "Top: chin clears the bar", "Lower: all the way to a full hang"],
    cues: ["Start every rep from a full hang", "Drive the elbows down", "Keep the legs quiet"],
    mistakes: ["Kipping and swinging", "Half reps at the top", "Shrugging the shoulders to the ears"],
    formChecks: ["Full hang", "Chin over bar", "Still legs", "Elbows down", "Tempo", "Shoulder position"], faultCheck: "Still legs"
  },
  "Barbell row": {
    equip: "barbell", setup: "Barbell + plates", difficulty: "intermediate", movementType: "compound",
    anatomy: { primary: ["Latissimus dorsi", "Rhomboids"], secondary: ["Biceps brachii", "Posterior deltoid", "Erector spinae"] },
    activation: { lats: 86, "upper-back": 84, biceps: 58, "rear-delts": 55, "lower-back": 52 },
    phases: ["Setup: hinge to about 45°, back flat", "Brace: bar hanging under the shoulders", "Pull: elbows drive back past the body", "Top: bar to the belly button, squeeze", "Lower: under control to a full stretch"],
    cues: ["Torso stays at the same angle", "Pull to the belly button", "Squeeze the shoulder blades at the top"],
    mistakes: ["Standing up to yank the bar", "Rounded back", "Shrugging instead of rowing"],
    formChecks: ["Hip hinge", "Flat back", "Bar to navel", "Elbow drive", "Torso angle", "Tempo"], faultCheck: "Torso angle"
  },
  "Lat pulldown": {
    equip: "cable", setup: "Lat pulldown machine, wide bar", difficulty: "beginner", movementType: "compound",
    anatomy: { primary: ["Latissimus dorsi"], secondary: ["Biceps brachii", "Posterior deltoid", "Trapezius"] },
    activation: { lats: 90, biceps: 60, "rear-delts": 48, traps: 45, "upper-back": 52 },
    phases: ["Setup: thighs under the pads, wide grip", "Stretch: arms long, lats stretched", "Pull: elbows down toward the ribs", "Bottom: bar to the upper chest", "Return: let the bar rise to a full stretch"],
    cues: ["Lean back only slightly", "Lead with the elbows", "Bar to the upper chest"],
    mistakes: ["Leaning far back", "Pulling behind the neck", "Short range at the top"],
    formChecks: ["Upright torso", "Elbow lead", "Bar to chest", "Full stretch", "Tempo", "Shoulder position"], faultCheck: "Upright torso"
  },
  "Seated cable row": {
    equip: "cable", setup: "Seated row station, V-handle", difficulty: "beginner", movementType: "compound",
    anatomy: { primary: ["Rhomboids", "Latissimus dorsi"], secondary: ["Biceps brachii", "Posterior deltoid"] },
    activation: { "upper-back": 88, lats: 82, biceps: 55, "rear-delts": 50 },
    phases: ["Setup: knees soft, chest up", "Reach: arms long, shoulder blades forward", "Row: handle to the stomach", "Squeeze: hold the shoulder blades together", "Return: arms long without rounding"],
    cues: ["Chest up, torso still", "Pull to the stomach", "Pause and squeeze"],
    mistakes: ["Rounding forward then yanking", "Rocking the torso", "Shrugging"],
    formChecks: ["Chest up", "Still torso", "Handle to stomach", "Squeeze hold", "Spine position", "Tempo"], faultCheck: "Spine position"
  },
  "Back squat": {
    equip: "barbell", setup: "Barbell + squat rack", difficulty: "intermediate", movementType: "compound", categories: ["glutes"],
    anatomy: { primary: ["Quadriceps", "Gluteus maximus"], secondary: ["Hamstrings", "Erector spinae", "Rectus abdominis"] },
    activation: { quads: 94, glutes: 86, hamstrings: 55, "lower-back": 58, abs: 50 },
    phases: ["Setup: bar on the upper back, feet shoulder width", "Brace: big breath, ribs down", "Descent: hips and knees bend together", "Bottom: hip crease below the knee", "Drive: stand up through the whole foot"],
    cues: ["Knees track over the toes", "Chest up, back flat", "Hips below the knees", "Push through the whole foot"],
    mistakes: ["Back rounding at the bottom", "Knees caving in", "Heels lifting", "Cutting depth"],
    formChecks: ["Knee alignment", "Hip depth", "Spine position", "Foot pressure", "Tempo", "Stability"], faultCheck: "Spine position"
  },
  "Romanian deadlift": {
    equip: "barbell", setup: "Barbell + plates", difficulty: "intermediate", movementType: "compound", categories: ["glutes"],
    anatomy: { primary: ["Hamstrings", "Gluteus maximus"], secondary: ["Erector spinae", "Forearm flexors"] },
    activation: { hamstrings: 92, glutes: 84, "lower-back": 62, forearms: 50 },
    phases: ["Setup: stand tall, bar at the hips", "Hinge: push the hips back", "Descent: bar slides down the thighs", "Bottom: hamstrings stretched, back flat", "Drive: hips forward to stand"],
    cues: ["Push the hips back, not down", "Soft knees, almost straight", "Bar stays on the legs", "Stop when the hamstrings stretch"],
    mistakes: ["Rounding the back to reach lower", "Squatting instead of hinging", "Bar drifting forward"],
    formChecks: ["Hip hinge", "Spine position", "Soft knees", "Hamstring stretch", "Bar path", "Tempo"], faultCheck: "Spine position"
  },
  "Leg press": {
    equip: "machine", setup: "45° leg press", difficulty: "beginner", movementType: "compound",
    anatomy: { primary: ["Quadriceps", "Gluteus maximus"], secondary: ["Hamstrings"] },
    activation: { quads: 92, glutes: 74, hamstrings: 48 },
    phases: ["Setup: feet mid-platform, shoulder width", "Release: unlock the sled", "Descent: knees toward the chest", "Bottom: stop before the hips curl", "Press: push through the whole foot"],
    cues: ["Lower back stays on the seat", "Knees track over the toes", "Don't lock the knees hard"],
    mistakes: ["Going so deep the hips curl up", "Knees caving in", "Heels lifting"],
    formChecks: ["Controlled depth", "Back on seat", "Knee tracking", "Full foot", "Tempo", "Lockout"], faultCheck: "Controlled depth"
  },
  "Walking lunge": {
    equip: "dumbbell", setup: "Pair of dumbbells", difficulty: "intermediate", movementType: "compound", categories: ["glutes"],
    anatomy: { primary: ["Quadriceps", "Gluteus maximus"], secondary: ["Hamstrings", "Gastrocnemius"] },
    activation: { quads: 88, glutes: 84, hamstrings: 52, calves: 40 },
    phases: ["Setup: stand tall, dumbbells at the sides", "Step: long stride forward", "Descent: back knee toward the floor", "Bottom: front shin near vertical", "Drive: push up and step through"],
    cues: ["Long enough step", "Front knee over the ankle", "Torso upright"],
    mistakes: ["Knee shooting past the toes", "Short choppy steps", "Front heel lifting"],
    formChecks: ["Step length", "Knee alignment", "Upright torso", "Heel down", "Balance", "Tempo"], faultCheck: "Knee alignment"
  },
  "Leg curl": {
    equip: "machine", setup: "Lying leg curl machine", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Hamstrings"], secondary: ["Gastrocnemius"] },
    activation: { hamstrings: 94, calves: 42 },
    phases: ["Setup: knees just off the pad edge", "Brace: hips pressed down", "Curl: heels toward the glutes", "Top: squeeze the hamstrings", "Lower: slowly to straight legs"],
    cues: ["Hips stay down on the pad", "Full curl", "Lower slowly"],
    mistakes: ["Hips piking off the pad", "Half reps", "Dropping the weight"],
    formChecks: ["Hip position", "Full curl", "Slow lowering", "Steady torso", "Range of motion", "Tempo"], faultCheck: "Hip position"
  },
  "Standing calf raise": {
    equip: "machine", setup: "Standing calf raise machine", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Gastrocnemius", "Soleus"], secondary: [] },
    activation: { calves: 95 },
    phases: ["Setup: balls of the feet on the edge", "Stretch: heels below the step", "Rise: push up onto the toes", "Top: pause at full height", "Lower: slow to a full stretch"],
    cues: ["Full stretch at the bottom", "Pause at the top", "Knees straight"],
    mistakes: ["Bouncing out of the bottom", "Bent knees", "Partial reps"],
    formChecks: ["Full stretch", "Peak height", "Top pause", "Still knees", "Tempo", "Balance"], faultCheck: "Tempo"
  },
  "Overhead press": {
    equip: "barbell", setup: "Barbell + rack", difficulty: "intermediate", movementType: "compound",
    anatomy: { primary: ["Anterior deltoid", "Lateral deltoid"], secondary: ["Triceps brachii", "Trapezius", "Rectus abdominis"] },
    activation: { shoulders: 92, triceps: 70, traps: 55, abs: 48 },
    phases: ["Setup: bar on the front delts, grip just outside the shoulders", "Brace: ribs down, glutes tight", "Press: bar straight up past the face", "Lockout: head through, bar over midfoot", "Lower: back to the front delts"],
    cues: ["Ribs down, glutes squeezed", "Bar path straight up", "Head through at the top"],
    mistakes: ["Leaning back to finish", "Bar drifting forward", "Flared ribs"],
    formChecks: ["Spine position", "Glutes tight", "Vertical bar path", "Bar over midfoot", "Lockout", "Tempo"], faultCheck: "Spine position"
  },
  "Arnold press": {
    equip: "dumbbell", setup: "Dumbbells + upright bench", difficulty: "intermediate", movementType: "compound",
    anatomy: { primary: ["Anterior deltoid", "Lateral deltoid"], secondary: ["Triceps brachii"] },
    activation: { shoulders: 90, triceps: 62 },
    phases: ["Setup: dumbbells at the chin, palms facing you", "Rotate: open the arms as you press", "Press: palms turn forward overhead", "Top: arms straight over the shoulders", "Lower: rotate back to the start"],
    cues: ["Sit tall against the pad", "Rotate smoothly while pressing", "Control the descent"],
    mistakes: ["Arching away from the weight", "Rushing the rotation", "Short range"],
    formChecks: ["Spine position", "Palm rotation", "Full press", "Controlled descent", "Symmetry", "Tempo"], faultCheck: "Spine position"
  },
  "Dumbbell lateral raise": {
    equip: "dumbbell", setup: "Light dumbbells", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Lateral deltoid"], secondary: ["Upper trapezius"] },
    activation: { shoulders: 90, traps: 40 },
    phases: ["Setup: slight forward lean, dumbbells at the sides", "Raise: lead with the elbows", "Top: arms at shoulder height", "Pause: brief hold", "Lower: slowly to the sides"],
    cues: ["Lead with the elbows", "Stop at shoulder height", "Shoulders stay down"],
    mistakes: ["Shrugging the traps", "Swinging the weight", "Raising above shoulder height"],
    formChecks: ["Elbow lead", "Shoulder height", "Shoulders down", "Controlled tempo", "Muscle activation", "Steady torso"], faultCheck: "Shoulders down"
  },
  "Face pull": {
    equip: "cable", setup: "Cable tower + rope at eye level", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Posterior deltoid"], secondary: ["Rhomboids", "Trapezius"] },
    activation: { "rear-delts": 88, "upper-back": 66, traps: 55 },
    phases: ["Setup: rope at eye level, arms long", "Pull: elbows high and back", "Split: rope apart beside the ears", "Squeeze: rear delts and upper back", "Return: arms long under control"],
    cues: ["Elbows high", "Pull the rope apart", "Stand tall"],
    mistakes: ["Elbows dropping low", "Leaning back", "Too heavy"],
    formChecks: ["Elbow height", "Eye-level rope", "Rope split", "Upright torso", "Tempo", "Squeeze"], faultCheck: "Elbow height"
  },
  "Rear delt fly": {
    equip: "dumbbell", setup: "Light dumbbells", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Posterior deltoid"], secondary: ["Rhomboids"] },
    activation: { "rear-delts": 90, "upper-back": 58 },
    phases: ["Setup: hinge forward, back flat", "Hang: dumbbells under the chest", "Raise: sweep the arms out wide", "Top: arms in line with the shoulders", "Lower: slowly"],
    cues: ["Flat back", "Arms wide, elbows soft", "Shoulders away from the ears"],
    mistakes: ["Shrugging into the raise", "Rowing instead of flying", "Rounded back"],
    formChecks: ["Flat back", "Wide arms", "Shoulders down", "Light load", "Tempo", "Muscle activation"], faultCheck: "Shoulders down"
  },
  "Barbell curl": {
    equip: "barbell", setup: "Straight or EZ barbell", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Biceps brachii"], secondary: ["Brachioradialis"] },
    activation: { biceps: 92, forearms: 55 },
    phases: ["Setup: stand tall, arms straight", "Curl: bend the elbows", "Top: squeeze the biceps", "Lower: control down", "Bottom: full extension"],
    cues: ["Elbows pinned to the sides", "Torso still", "Full extension at the bottom"],
    mistakes: ["Leaning back to swing", "Elbows drifting forward", "Half reps"],
    formChecks: ["Pinned elbows", "Spine position", "Full extension", "Controlled lowering", "Tempo", "Wrist position"], faultCheck: "Spine position"
  },
  "Hammer curl": {
    equip: "dumbbell", setup: "Pair of dumbbells", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Brachialis", "Brachioradialis"], secondary: ["Biceps brachii"] },
    activation: { biceps: 80, forearms: 82 },
    phases: ["Setup: palms facing in", "Curl: thumbs lead up", "Top: forearm near vertical", "Lower: slowly", "Bottom: arms straight"],
    cues: ["Thumbs up the whole time", "Elbows fixed", "Full range"],
    mistakes: ["Elbows drifting forward", "Swinging", "Wrists bending"],
    formChecks: ["Fixed elbows", "Thumbs up", "Full range", "Steady torso", "Tempo", "Muscle activation"], faultCheck: "Fixed elbows"
  },
  "Triceps rope pushdown": {
    equip: "cable", setup: "Cable tower + rope", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Triceps brachii"], secondary: [] },
    activation: { triceps: 92 },
    phases: ["Setup: elbows tucked at the sides", "Push: straighten the elbows", "Spread: pull the rope apart", "Lockout: squeeze the triceps", "Return: forearms rise slowly"],
    cues: ["Elbows tucked and still", "Spread the rope at the bottom", "Stand upright"],
    mistakes: ["Leaning over the rope", "Elbows flaring", "Half lockout"],
    formChecks: ["Tucked elbows", "Upright torso", "Rope spread", "Full lockout", "Tempo", "Muscle activation"], faultCheck: "Upright torso"
  },
  "Skull crusher": {
    equip: "barbell", setup: "EZ bar + flat bench", difficulty: "intermediate", movementType: "isolation",
    anatomy: { primary: ["Triceps brachii (long head)"], secondary: [] },
    activation: { triceps: 94 },
    phases: ["Setup: bar over the shoulders, arms slightly back", "Lower: bend only the elbows", "Bottom: bar to the forehead", "Extend: straighten the elbows", "Lockout: squeeze the triceps"],
    cues: ["Upper arms stay still", "Arms slightly angled back", "Control the descent"],
    mistakes: ["Upper arms swinging", "Elbows flaring", "Dropping too fast"],
    formChecks: ["Still upper arms", "Arm angle", "Bar to forehead", "Elbow lockout", "Tempo", "Elbow alignment"], faultCheck: "Still upper arms"
  },
  "Dips": {
    equip: "bodyweight", setup: "Parallel dip bars", difficulty: "intermediate", movementType: "compound",
    anatomy: { primary: ["Triceps brachii", "Pectoralis major (lower)"], secondary: ["Anterior deltoid"] },
    activation: { triceps: 88, chest: 76, shoulders: 58 },
    phases: ["Setup: arms locked on the bars", "Descent: bend the elbows", "Bottom: upper arms about parallel", "Press: straighten the arms", "Lockout: tall and stable"],
    cues: ["Stop at parallel", "Shoulders back and down", "Full lockout"],
    mistakes: ["Sinking too deep", "Shoulders rolling forward", "Swinging"],
    formChecks: ["Upright torso", "Elbow depth", "Shoulders back", "Full lockout", "Tempo", "Stability"], faultCheck: "Elbow depth"
  },
  "Plank": {
    equip: "bodyweight", setup: "Floor or mat", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Rectus abdominis", "Transversus abdominis"], secondary: ["Obliques", "Anterior deltoid"] },
    activation: { abs: 82, obliques: 60, shoulders: 45 },
    phases: ["Setup: elbows under the shoulders", "Brace: ribs down, glutes tight", "Hold: straight line head to heels", "Breathe: short breaths behind the brace", "Finish: lower the knees with control"],
    cues: ["Elbows under the shoulders", "Squeeze the glutes", "Ribs down"],
    mistakes: ["Hips sagging", "Hips piked high", "Holding the breath"],
    formChecks: ["Straight line", "Ribs down", "Tight glutes", "Elbows stacked", "Hip position", "Stability"], faultCheck: "Hip position"
  },
  "Hanging leg raise": {
    equip: "bodyweight", setup: "Pull-up bar", difficulty: "advanced", movementType: "isolation",
    anatomy: { primary: ["Rectus abdominis"], secondary: ["Obliques", "Forearm flexors"] },
    activation: { abs: 90, obliques: 62, forearms: 50 },
    phases: ["Hang: still, shoulders active", "Curl: tilt the pelvis up", "Lift: legs rise with a curled spine", "Top: hips toward the chest", "Lower: slowly without swinging"],
    cues: ["Curl the pelvis first", "No swinging", "Lower slowly"],
    mistakes: ["Hip flexors take over", "Swinging", "Dropping the legs"],
    formChecks: ["Pelvic curl", "No swing", "Full lift", "Controlled lowering", "Muscle activation", "Grip"], faultCheck: "Pelvic curl"
  },
  "Cable crunch": {
    equip: "cable", setup: "Cable tower + rope, kneeling on a mat", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Rectus abdominis"], secondary: ["Obliques"] },
    activation: { abs: 92, obliques: 55 },
    phases: ["Setup: kneel, rope beside the head", "Brace: hips fixed", "Crunch: curl the ribs to the pelvis", "Bottom: elbows toward the thighs", "Return: uncurl slowly"],
    cues: ["Hips stay still", "Curl the spine", "Arms stay fixed"],
    mistakes: ["Pulling with the arms", "Sitting the hips back", "Too heavy"],
    formChecks: ["Still hips", "Spinal curl", "Fixed arms", "Full crunch", "Tempo", "Muscle activation"], faultCheck: "Still hips"
  },
  "Pallof press": {
    equip: "cable", setup: "Cable tower + D-handle at chest height", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Obliques"], secondary: ["Rectus abdominis"] },
    activation: { obliques: 88, abs: 66 },
    phases: ["Setup: side-on to the cable", "Brace: square hips, ribs down", "Press: handle straight out", "Hold: resist the twist", "Return: handle back to the chest"],
    cues: ["Square hips", "Press straight out", "Don't let it twist you"],
    mistakes: ["Leaning away from the cable", "Hips shifting", "Rotating with the handle"],
    formChecks: ["Square hips", "Braced core", "Straight press", "Tall stance", "Spine position", "Stability"], faultCheck: "Spine position"
  },
  "Dead bug": {
    equip: "bodyweight", setup: "Mat", difficulty: "beginner", movementType: "isolation",
    anatomy: { primary: ["Rectus abdominis", "Transversus abdominis"], secondary: ["Obliques"] },
    activation: { abs: 84, obliques: 58 },
    phases: ["Setup: on the back, arms up, knees at 90°", "Brace: lower back flat", "Reach: opposite arm and leg out", "Hold: back stays down", "Return: switch sides"],
    cues: ["Lower back pressed to the floor", "Reach long", "Move slowly"],
    mistakes: ["Lower back arching up", "Moving too fast", "Holding the breath"],
    formChecks: ["Flat back", "Ribs down", "Opposite reach", "Slow reach", "Spine position", "Stability"], faultCheck: "Spine position"
  }
};

EXERCISES.forEach((ex, i) => {
  const c = META_CATALOG[ex.name];
  if (!c) return;
  for (const k in c) if (ex[k] == null) ex[k] = c[k];
  if (!ex.athlete) ex.athlete = i % 2 ? "female" : "male";
});

// ---------- Defaults: fill any field an exercise leaves out ----------
(function fillDefaults() {
  const equipOf = (t) => {
    t = String(t || "").toLowerCase();
    if (/dumbbell|kettlebell/.test(t)) return "dumbbell";
    if (/cable|rope|band/.test(t)) return "cable";
    if (/machine|smith|press station|sled/.test(t)) return "machine";
    if (/barbell|ez|trap bar|bar\b/.test(t) && !/pull-up|dip/.test(t)) return "barbell";
    return "bodyweight";
  };
  const seen = new Set();
  let alt = 0;
  EXERCISES.forEach((ex) => {
    if (!ex || seen.has(ex.name)) return;
    seen.add(ex.name);
    ex.primary = ex.primary || [];
    ex.secondary = ex.secondary || [];
    ex.good = ex.good || { cue: "" };
    ex.bad = ex.bad || { cue: "" };
    if (!ex.group) ex.group = "core";
    if (!ex.equipment) ex.equipment = "Bodyweight";
    if (!ex.equip) ex.equip = equipOf(ex.equipment);
    if (!ex.setup) ex.setup = ex.equipment;
    const muscles = ex.primary.length + ex.secondary.length;
    if (!ex.movementType) ex.movementType = muscles >= 3 ? "compound" : "isolation";
    if (!ex.difficulty) ex.difficulty = ex.movementType === "compound" && ex.equip === "barbell" ? "intermediate" : "beginner";
    if (ex.sets == null) ex.sets = 3;
    if (ex.reps == null) ex.reps = "10–12";
    if (ex.rest == null) ex.rest = ex.movementType === "compound" ? 90 : 60;
    if (!ex.anatomy) ex.anatomy = {};
    if (!ex.anatomy.primary) ex.anatomy.primary = ex.primary.map((m) => META_ANAT[m] || MUSCLES[m] || m);
    if (!ex.anatomy.secondary) ex.anatomy.secondary = ex.secondary.map((m) => META_ANAT[m] || MUSCLES[m] || m);
    if (!ex.activation) ex.activation = {};
    ex.primary.forEach((m, i) => { if (ex.activation[m] == null) ex.activation[m] = 90 - i * 4; });
    ex.secondary.forEach((m, i) => { if (ex.activation[m] == null) ex.activation[m] = Math.max(35, 60 - i * 5); });
    const f = (typeof FORM !== "undefined" && FORM[ex.name]) || null;
    if (!ex.formChecks || !ex.formChecks.length) {
      const base = f && f.checks ? f.checks.slice() : ["Posture", "Joint alignment", "Range of motion"];
      ["Tempo", "Stability"].forEach((x) => { if (!base.includes(x)) base.push(x); });
      ex.formChecks = base;
    }
    if (!ex.phases || !ex.phases.length) {
      ex.phases = ["Setup: get into position and brace", "Lowering: control the weight through the full range",
        "Turnaround: pause briefly without bouncing", "Lifting: drive with the target muscles", "Finish: return to the start under control"];
    }
    if (!ex.cues || !ex.cues.length) ex.cues = [ex.good.cue].filter(Boolean);
    if (!ex.mistakes || !ex.mistakes.length) ex.mistakes = [(f && f.error && f.error.title) || ex.bad.cue].filter(Boolean);
    if (!ex.categories) ex.categories = [];
    if (!ex.athlete) ex.athlete = alt++ % 2 ? "female" : "male";
    if (!ex.movement) ex.movement = "";
  });
})();

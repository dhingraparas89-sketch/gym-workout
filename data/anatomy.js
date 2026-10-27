// Muscle anatomy for the muscle explorer and the 3D body (load after data/library/meta.js).
//
// Adds finer muscle ids that the 3D body draws on its own, each with `parent` naming the older
// group id it belongs to (exercise data may keep using the group id: lighting "shoulders" lights
// both front and side delts). Fills in location, actions, origin and insertion for every muscle.
// Standard textbook anatomy; the fiber notes describe the illustrative fiber overlay in 3D.

Object.assign(MUSCLES, {
  "front-delts": "Front delts", "side-delts": "Side delts", rhomboids: "Rhomboids",
  adductors: "Adductors", soleus: "Soleus", tibialis: "Tibialis anterior"
});

// Finer muscles: a complete entry each.
Object.assign(MUSCLE_INFO, {
  "front-delts": {
    name: "Anterior deltoid", parent: "shoulders",
    location: "Front of the shoulder cap, over the front of the shoulder joint",
    function: "Raises the arm forward and helps press overhead and on the bench.",
    action: "Lifts the arm forward and turns it inward",
    actions: ["Shoulder flexion", "Shoulder internal rotation", "Horizontal adduction"],
    origin: "Lateral third of the clavicle", insertion: "Deltoid tuberosity of the humerus",
    fibers: "Run down and slightly back from the collarbone to the outer upper arm",
    mistakes: ["Turning lateral raises into front raises", "Flaring the elbows on presses", "Shrugging as the arm rises"]
  },
  "side-delts": {
    name: "Lateral deltoid", parent: "shoulders",
    location: "Outer point of the shoulder cap",
    function: "Raises the arm out to the side; gives the shoulder its width.",
    action: "Lifts the arm out to the side",
    actions: ["Shoulder abduction"],
    origin: "Acromion of the scapula", insertion: "Deltoid tuberosity of the humerus",
    fibers: "Short, multipennate fibers run straight down from the acromion to the outer arm",
    mistakes: ["Swinging the weight up with the torso", "Shrugging the traps into the lift", "Leading with the hands instead of the elbows"]
  },
  rhomboids: {
    name: "Rhomboid major & minor", parent: "upper-back",
    location: "Between the spine and the inner edge of the shoulder blade, under the trapezius",
    function: "Pull the shoulder blades together and down on rows and pulls.",
    action: "Pulls the shoulder blade in toward the spine",
    actions: ["Scapular retraction", "Scapular downward rotation", "Scapular elevation (assist)"],
    origin: "Spinous processes of C7–T5 (minor C7–T1, major T2–T5)", insertion: "Medial border of the scapula",
    fibers: "Run down and out from the spine to the inner edge of the shoulder blade",
    mistakes: ["Pulling with the arms only, no squeeze", "Shrugging at the end of the row", "Rounding forward to reach the handle"]
  },
  adductors: {
    name: "Adductor longus, brevis & magnus",
    location: "Inner thigh, from the pubis to the back of the thigh bone",
    function: "Bring the thighs together and steady the pelvis; the adductor magnus also extends the hip in squats.",
    action: "Draws the thigh in toward the midline",
    actions: ["Hip adduction", "Hip extension (adductor magnus, posterior part)", "Pelvic stabilization"],
    origin: "Body and inferior ramus of the pubis; ischial tuberosity (adductor magnus)", insertion: "Linea aspera of the femur and adductor tubercle",
    fibers: "Fan from the pubis down and out to the back of the thigh bone",
    mistakes: ["Letting the knees cave in on squats", "Bouncing out of a deep stance", "Going too wide too soon"]
  },
  soleus: {
    name: "Soleus", parent: "calves",
    location: "Lower calf, under the gastrocnemius and wider at its sides",
    function: "Plantar flexes the ankle; works hardest with the knee bent (seated calf raises).",
    action: "Points the foot, especially with the knee bent",
    actions: ["Ankle plantar flexion", "Postural control in standing"],
    origin: "Posterior head and upper shaft of the fibula; soleal line of the tibia", insertion: "Calcaneus via the Achilles tendon",
    fibers: "Short, pennate fibers run down and in to the Achilles tendon",
    mistakes: ["Bouncing at the bottom", "Cutting the stretch short", "Rolling onto the outer foot"]
  },
  tibialis: {
    name: "Tibialis anterior",
    location: "Front of the shin, just outside the shin bone",
    function: "Lifts the foot and controls it as it lowers; steadies the ankle in squats and lunges.",
    action: "Lifts the front of the foot",
    actions: ["Ankle dorsiflexion", "Foot inversion"],
    origin: "Lateral condyle and upper lateral surface of the tibia; interosseous membrane", insertion: "Medial cuneiform and base of the first metatarsal",
    fibers: "Run straight down the front of the shin to a tendon over the inner ankle",
    mistakes: ["Letting the foot slap down", "Rising onto the toes in squats", "Ignoring it in calf-only training"]
  }
});

// Finer regions the 3D body's muscle chart draws (base mesh): each with its group.
Object.assign(MUSCLES, {
  "pec-clavicular": "Upper chest", "pec-sternal": "Mid & lower chest", brachialis: "Brachialis", brachioradialis: "Brachioradialis",
  "forearm-flexors": "Forearm flexors", "forearm-extensors": "Forearm extensors", serratus: "Serratus anterior",
  "teres-major": "Teres major", infraspinatus: "Infraspinatus", "glute-med": "Glute medius", "rectus-femoris": "Rectus femoris",
  "vastus-lateralis": "Vastus lateralis", "vastus-medialis": "Vastus medialis", "biceps-femoris": "Biceps femoris",
  semitendinosus: "Semitendinosus & semimembranosus", neck: "Sternocleidomastoid"
});
const ANAT_ENTRY = (name, parent, location, fn, action, actions, origin, insertion, fibers, mistakes) =>
  ({ name, parent, location, function: fn, action, actions, origin, insertion, fibers, mistakes });
Object.assign(MUSCLE_INFO, {
  "pec-clavicular": ANAT_ENTRY("Pectoralis major, clavicular head", "chest", "Upper chest, just below the collarbone",
    "Raises the arm forward and across; works hardest in incline presses and low-to-high flyes.", "Lifts the arm forward and across the body",
    ["Shoulder flexion", "Horizontal adduction", "Shoulder internal rotation"], "Medial half of the clavicle", "Lateral lip of the bicipital groove of the humerus",
    "Run down and out from the collarbone to the upper arm", ["Flaring the elbows straight out", "Shrugging the shoulders up on incline presses", "Cutting the range short at the bottom"]),
  "pec-sternal": ANAT_ENTRY("Pectoralis major, sternocostal head", "chest", "Middle and lower chest, from the breastbone to the armpit",
    "Brings the arm across the body and down; the main chest mover in flat and decline presses and dips.", "Brings the arm across and down",
    ["Horizontal adduction", "Shoulder extension from a raised arm", "Shoulder internal rotation"], "Sternum, costal cartilages 1–6 and the external oblique aponeurosis", "Lateral lip of the bicipital groove of the humerus",
    "Run across and up from the breastbone, twisting into a tendon at the front of the armpit", ["Bouncing the bar off the chest", "Losing the shoulder-blade set", "Elbows flared to 90 degrees"]),
  brachialis: ANAT_ENTRY("Brachialis", "biceps", "Low on the front of the upper arm, under the biceps and showing at its outer side",
    "The elbow's main flexor in every grip; hammer and reverse curls load it most.", "Bends the elbow",
    ["Elbow flexion"], "Lower half of the front of the humerus", "Coronoid process and tuberosity of the ulna",
    "Run straight down the front of the arm to the elbow", ["Swinging the torso to start the curl", "Letting the elbows drift forward", "Dropping the weight on the way down"]),
  brachioradialis: ANAT_ENTRY("Brachioradialis", "forearms", "Thumb side of the forearm, from above the elbow down to the wrist",
    "Bends the elbow, strongest with the thumb up (hammer curls, neutral-grip pulls).", "Bends the elbow with the thumb up",
    ["Elbow flexion (neutral grip)", "Returns the forearm to neutral"], "Lateral supracondylar ridge of the humerus", "Styloid process of the radius",
    "Run down the thumb side of the forearm into a long tendon", ["Bending the wrist to finish the curl", "Swinging the weight up", "Gripping with the fingertips only"]),
  "forearm-flexors": ANAT_ENTRY("Wrist and finger flexors", "forearms", "Inner (palm) side of the forearm",
    "Grip and bend the wrist; they hold the bar in every pull and carry.", "Grips and bends the wrist toward the palm",
    ["Finger flexion (grip)", "Wrist flexion", "Wrist stabilization"], "Medial epicondyle of the humerus (common flexor tendon)", "Carpals, metacarpals and phalanges",
    "Run from the inner elbow down to the wrist and fingers", ["Letting the wrist bend back under load", "Relying on straps for every set", "Gripping too loosely on heavy pulls"]),
  "forearm-extensors": ANAT_ENTRY("Wrist and finger extensors", "forearms", "Outer (back) side of the forearm",
    "Hold the wrist straight while you grip; they balance the flexors.", "Straightens and lifts the back of the hand",
    ["Wrist extension", "Finger extension", "Wrist stabilization"], "Lateral epicondyle of the humerus (common extensor tendon)", "Metacarpals and phalanges (back of the hand)",
    "Run from the outer elbow down the back of the forearm", ["Bending the wrist on presses", "Never training the opposite of grip", "Jerking the weight with the wrists"]),
  serratus: ANAT_ENTRY("Serratus anterior", null, "Side of the ribcage below the armpit, in saw-tooth slips",
    "Holds the shoulder blade on the ribs and turns it upward; reaching and pressing overhead depend on it.", "Pulls the shoulder blade forward around the ribs",
    ["Scapular protraction", "Scapular upward rotation", "Holds the scapula against the ribcage"], "Outer surfaces of ribs 1–8 or 9", "Underside of the medial border of the scapula",
    "Run back around the ribs from each slip to the inner edge of the shoulder blade", ["Letting the shoulder blades wing in push-ups", "Sagging between the shoulders in a plank", "Shrugging instead of reaching overhead"]),
  "teres-major": ANAT_ENTRY("Teres major", "lats", "Lower outer edge of the shoulder blade to the back of the armpit",
    "Works with the lats to pull the arm down and back.", "Pulls the arm down and back",
    ["Shoulder extension", "Shoulder adduction", "Shoulder internal rotation"], "Inferior angle of the scapula", "Medial lip of the bicipital groove of the humerus",
    "Run up and out from the bottom of the shoulder blade to the upper arm", ["Pulling with the hands instead of the elbows", "Shrugging at the top of a pull-down", "Cutting the stretch short"]),
  infraspinatus: ANAT_ENTRY("Infraspinatus & teres minor", "upper-back", "On the shoulder blade, below its spine",
    "Rotator cuff: turns the arm outward and keeps the ball of the shoulder centred in presses and pulls.", "Turns the arm outward",
    ["Shoulder external rotation", "Holds the humeral head in the socket"], "Infraspinous fossa and lateral border of the scapula", "Greater tubercle of the humerus",
    "Run out and up across the shoulder blade to the back of the shoulder", ["Letting the shoulders roll forward", "Going too heavy on rotation work", "Skipping rear-shoulder and rotation work"]),
  "glute-med": ANAT_ENTRY("Gluteus medius", "glutes", "Side of the hip, above the glute max",
    "Holds the pelvis level on one leg and keeps the knee from caving in.", "Lifts the leg out to the side and steadies the pelvis",
    ["Hip abduction", "Pelvic stabilization in single-leg stance", "Hip internal and external rotation (front and back fibers)"], "Outer surface of the ilium", "Greater trochanter of the femur",
    "Fan down from the pelvis to the top of the thigh bone", ["Letting the knee cave in", "The hip dropping on single-leg work", "Leaning the torso to lift the leg"]),
  "rectus-femoris": ANAT_ENTRY("Rectus femoris", "quads", "Straight down the middle of the front of the thigh",
    "Straightens the knee and helps lift the thigh; the only quad that crosses the hip.", "Straightens the knee and lifts the thigh",
    ["Knee extension", "Hip flexion"], "Anterior inferior iliac spine and the rim above the hip socket", "Patella, then the tibial tuberosity",
    "Run down from the hip in a feather (bipennate) pattern to the kneecap tendon", ["Leaning back to cheat leg extensions", "Short range in squats", "Letting the knees cave in"]),
  "vastus-lateralis": ANAT_ENTRY("Vastus lateralis", "quads", "Outer side of the thigh",
    "The largest quad: straightens the knee in squats, leg presses and lunges.", "Straightens the knee",
    ["Knee extension"], "Greater trochanter and lateral lip of the linea aspera", "Lateral patella, then the tibial tuberosity",
    "Run down and forward from the outer thigh bone to the kneecap", ["Letting the knees drift in", "Bouncing out of the bottom", "Locking the knees hard at the top"]),
  "vastus-medialis": ANAT_ENTRY("Vastus medialis", "quads", "Inner thigh just above the knee (the teardrop)",
    "Straightens the knee and keeps the kneecap tracking straight, especially near full extension.", "Straightens the knee",
    ["Knee extension", "Patellar stabilization"], "Medial lip of the linea aspera", "Medial patella, then the tibial tuberosity",
    "Run down and out from the inner thigh bone to the kneecap", ["Knees caving in", "Partial reps only", "Feet turned out too far"]),
  "biceps-femoris": ANAT_ENTRY("Biceps femoris", "hamstrings", "Outer back of the thigh",
    "Bends the knee and extends the hip; the outer hamstring.", "Bends the knee and drives the hip back",
    ["Knee flexion", "Hip extension (long head)", "Knee external rotation"], "Ischial tuberosity (long head); linea aspera (short head)", "Head of the fibula",
    "Run down and out to the outside of the knee", ["Rounding the lower back on hinges", "Hips rising first on curls", "Bouncing at the bottom"]),
  semitendinosus: ANAT_ENTRY("Semitendinosus & semimembranosus", "hamstrings", "Inner back of the thigh",
    "Bend the knee and extend the hip; the inner hamstrings.", "Bend the knee and drive the hip back",
    ["Knee flexion", "Hip extension", "Knee internal rotation"], "Ischial tuberosity", "Medial tibia (pes anserinus; posterior medial condyle)",
    "Run down the inner back of the thigh to below the inner knee", ["Rounding the lower back on hinges", "Locking the knees on Romanian deadlifts", "Short range on curls"]),
  neck: ANAT_ENTRY("Sternocleidomastoid", null, "Front and side of the neck, from behind the ear to the breastbone and collarbone",
    "Turns and bends the head and holds the neck steady when the head is lifted.", "Turns the head to the other side and tucks the chin",
    ["Neck rotation (to the opposite side)", "Neck flexion", "Lateral flexion of the neck"], "Manubrium of the sternum and medial clavicle", "Mastoid process of the skull",
    "Run up and back from the breastbone and collarbone to behind the ear", ["Craning the neck on crunches", "Pushing the head forward on presses", "Holding the breath and straining"])
});
Object.keys(MUSCLE_INFO).forEach((k) => { if (MUSCLE_INFO[k] && MUSCLE_INFO[k].parent === null) delete MUSCLE_INFO[k].parent; });

// Every older muscle id: where it is, what it does, where it attaches.
const ANATOMY_DETAIL = {
  chest: {
    location: "Front of the chest, from the collarbone and breastbone to the upper arm",
    actions: ["Horizontal adduction", "Shoulder internal rotation", "Shoulder flexion (clavicular head)"],
    origin: "Medial half of the clavicle; sternum and costal cartilages 1–6; external oblique aponeurosis", insertion: "Lateral lip of the intertubercular (bicipital) groove of the humerus"
  },
  shoulders: {
    location: "Front and outer shoulder cap", children: ["front-delts", "side-delts"],
    actions: ["Shoulder flexion", "Shoulder abduction", "Shoulder internal rotation (anterior fibers)"],
    origin: "Lateral third of the clavicle; acromion", insertion: "Deltoid tuberosity of the humerus"
  },
  "rear-delts": {
    location: "Back of the shoulder cap",
    actions: ["Horizontal abduction", "Shoulder extension", "Shoulder external rotation"],
    origin: "Spine of the scapula", insertion: "Deltoid tuberosity of the humerus"
  },
  traps: {
    location: "Upper back and neck, from the skull and spine to the shoulder blade",
    actions: ["Scapular elevation (upper)", "Scapular retraction (middle)", "Scapular depression (lower)", "Upward rotation of the scapula"],
    origin: "External occipital protuberance, nuchal ligament, spinous processes C7–T12", insertion: "Lateral third of the clavicle, acromion and spine of the scapula"
  },
  "upper-back": {
    location: "Between the shoulder blades", children: ["rhomboids"],
    actions: ["Scapular retraction", "Scapular downward rotation (rhomboids)"],
    origin: "Spinous processes of C7–T5 (rhomboids), T1–T5 (middle trapezius)", insertion: "Medial border of the scapula (rhomboids); acromion and scapular spine (middle trapezius)"
  },
  lats: {
    location: "Sides of the back, from the low back and pelvis up under the armpit",
    actions: ["Shoulder extension", "Shoulder adduction", "Shoulder internal rotation"],
    origin: "Spinous processes T7–L5, thoracolumbar fascia, iliac crest, lower 3–4 ribs", insertion: "Floor of the intertubercular groove of the humerus"
  },
  "lower-back": {
    location: "Columns either side of the spine, strongest in the low back",
    actions: ["Spinal extension", "Lateral flexion of the spine", "Holds the spine neutral under load"],
    origin: "Sacrum, iliac crest and lumbar spinous processes (common tendon)", insertion: "Ribs, vertebrae higher up the spine and the base of the skull"
  },
  biceps: {
    location: "Front of the upper arm",
    actions: ["Elbow flexion", "Forearm supination", "Shoulder flexion (weak)"],
    origin: "Short head: coracoid process; long head: supraglenoid tubercle of the scapula", insertion: "Radial tuberosity and bicipital aponeurosis"
  },
  triceps: {
    location: "Back of the upper arm",
    actions: ["Elbow extension", "Shoulder extension (long head)"],
    origin: "Long head: infraglenoid tubercle of the scapula; lateral and medial heads: back of the humerus", insertion: "Olecranon of the ulna"
  },
  forearms: {
    location: "Forearm, from the elbow to the wrist",
    actions: ["Grip (finger flexion)", "Wrist flexion and extension", "Elbow flexion with a neutral grip (brachioradialis)"],
    origin: "Medial epicondyle (flexors), lateral epicondyle (extensors), lateral supracondylar ridge (brachioradialis)", insertion: "Carpals, metacarpals and phalanges; radial styloid (brachioradialis)"
  },
  abs: {
    location: "Front of the abdomen, either side of the midline",
    actions: ["Trunk flexion", "Posterior pelvic tilt", "Bracing against spinal extension"],
    origin: "Pubic crest and pubic symphysis", insertion: "Xiphoid process and costal cartilages 5–7"
  },
  obliques: {
    location: "Sides of the waist",
    actions: ["Trunk rotation", "Lateral flexion", "Resisting rotation"],
    origin: "External: outer surfaces of ribs 5–12; internal: thoracolumbar fascia, iliac crest, inguinal ligament", insertion: "Linea alba, pubic tubercle, iliac crest; internal also ribs 10–12"
  },
  glutes: {
    location: "Buttock, from the back of the pelvis to the top of the thigh",
    actions: ["Hip extension", "Hip external rotation", "Hip abduction (upper fibers)"],
    origin: "Posterior ilium, sacrum, coccyx, sacrotuberous ligament", insertion: "Gluteal tuberosity of the femur and iliotibial tract"
  },
  quads: {
    location: "Front of the thigh",
    actions: ["Knee extension", "Hip flexion (rectus femoris)"],
    origin: "Rectus femoris: anterior inferior iliac spine; vasti: shaft of the femur", insertion: "Patella, then the tibial tuberosity via the patellar ligament"
  },
  hamstrings: {
    location: "Back of the thigh",
    actions: ["Knee flexion", "Hip extension"],
    origin: "Ischial tuberosity (biceps femoris short head: linea aspera)", insertion: "Head of the fibula (biceps femoris); medial tibia (semitendinosus, semimembranosus)"
  },
  calves: {
    location: "Back of the lower leg", children: ["soleus"],
    actions: ["Ankle plantar flexion", "Knee flexion (gastrocnemius)"],
    origin: "Gastrocnemius: medial and lateral femoral condyles; soleus: upper fibula and soleal line of the tibia", insertion: "Calcaneus via the Achilles tendon"
  }
};
Object.keys(ANATOMY_DETAIL).forEach((id) => { if (MUSCLE_INFO[id]) Object.assign(MUSCLE_INFO[id], ANATOMY_DETAIL[id]); });
// Older entries describe their action in one line; give every entry a function line too.
Object.values(MUSCLE_INFO).forEach((m) => { if (!m.function && m.action) m.function = m.action + "."; });

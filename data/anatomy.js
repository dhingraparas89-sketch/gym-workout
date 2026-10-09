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

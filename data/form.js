// Form assessment for each exercise, keyed by exercise name.
// Lists what good form gets right, the error the mistake shows, and scores for the mistake.

const FORM = {
  "Barbell bench press": {
    checks: ["Full depth", "Retracted shoulders", "Bar path", "Planted feet"],
    error: {
      type: "range", joint: "elbow",
      title: "Stopping halfway down",
      detail: "Your bar stops halfway, so your chest never fully stretches.",
      fix: "Lower the bar until it touches the middle of your chest.",
      compensate: ["triceps"]
    },
    scores: { posture: 91, alignment: 88, range: 56, tempo: 87, stability: 89, activation: 74 }
  },
  "Incline dumbbell press": {
    checks: ["Full depth", "Vertical forearms", "Bench angle", "Stable shoulders"],
    error: {
      type: "range", joint: "elbow",
      title: "Half reps at the top",
      detail: "Your dumbbells stop well above your chest on every rep.",
      fix: "Lower until the dumbbells sit beside your upper chest.",
      compensate: ["shoulders"]
    },
    scores: { posture: 92, alignment: 86, range: 59, tempo: 88, stability: 90, activation: 72 }
  },
  "Cable fly": {
    checks: ["Fixed elbows", "Chest stretch", "Hands meet", "Steady torso"],
    error: {
      type: "alignment", joint: "elbow",
      title: "Elbows bend and straighten",
      detail: "Your elbows bend and extend, turning the fly into a press.",
      fix: "Lock a soft bend in your elbows and hug your hands together.",
      compensate: ["triceps"]
    },
    scores: { posture: 93, alignment: 61, range: 78, tempo: 89, stability: 90, activation: 71 }
  },
  "Machine chest press": {
    checks: ["Shoulders pinned", "Handle height", "Flat back", "Controlled lockout"],
    error: {
      type: "alignment", joint: "shoulder",
      title: "Shoulders roll off pad",
      detail: "Your shoulders roll forward off the pad as you lock out.",
      fix: "Keep your back and shoulders flat against the pad throughout.",
      compensate: ["shoulders"]
    },
    scores: { posture: 82, alignment: 63, range: 90, tempo: 91, stability: 88, activation: 73 }
  },
  "Push-up": {
    checks: ["Straight body line", "Braced core", "Chest depth", "Elbow path"],
    error: {
      type: "posture", joint: "hip",
      title: "Hips sag to the floor",
      detail: "Your hips drop toward the floor and load your lower back.",
      fix: "Squeeze your glutes and brace to hold one straight line.",
      compensate: ["lower-back"]
    },
    scores: { posture: 58, alignment: 87, range: 89, tempo: 92, stability: 72, activation: 79 }
  },
  "Deadlift": {
    checks: ["Flat back", "Bar over midfoot", "Bar close", "Leg drive"],
    error: {
      type: "posture", joint: "spine",
      title: "Lower back rounds",
      detail: "Your lower back rounds while you pull the weight.",
      fix: "Brace hard and set a flat back before you pull.",
      compensate: ["lower-back"]
    },
    scores: { posture: 52, alignment: 86, range: 92, tempo: 88, stability: 70, activation: 76 }
  },
  "Pull-up": {
    checks: ["Full hang", "Chin over bar", "Still legs", "Elbows down"],
    error: {
      type: "tempo", joint: "hip",
      title: "Kicking and swinging",
      detail: "Your legs kick and swing to build momentum to the bar.",
      fix: "Start from a dead hang and pull with your legs still.",
      compensate: [],
      tempo: "fast"
    },
    scores: { posture: 88, alignment: 90, range: 86, tempo: 57, stability: 74, activation: 78 }
  },
  "Barbell row": {
    checks: ["Hip hinge", "Flat back", "Bar to navel", "Elbow drive"],
    error: {
      type: "posture", joint: "hip",
      title: "Standing up to yank",
      detail: "Your torso rises and your hips yank the bar up.",
      fix: "Hold a 45 degree hinge and pull the bar to your belly button.",
      compensate: ["lower-back"]
    },
    scores: { posture: 60, alignment: 89, range: 87, tempo: 80, stability: 86, activation: 71 }
  },
  "Lat pulldown": {
    checks: ["Upright torso", "Elbow lead", "Bar to chest", "Full stretch"],
    error: {
      type: "posture", joint: "spine",
      title: "Leaning too far back",
      detail: "Your torso leans far back, turning the pulldown into a row.",
      fix: "Sit tall with only a slight lean and lead with your elbows.",
      compensate: ["upper-back"]
    },
    scores: { posture: 64, alignment: 88, range: 90, tempo: 87, stability: 91, activation: 73 }
  },
  "Seated cable row": {
    checks: ["Chest up", "Still torso", "Handle to stomach", "Squeeze hold"],
    error: {
      type: "posture", joint: "spine",
      title: "Rounding then yanking",
      detail: "Your back rounds forward to reach, then your lower back yanks.",
      fix: "Keep your chest up and back still, pulling with your arms.",
      compensate: ["lower-back"]
    },
    scores: { posture: 59, alignment: 90, range: 88, tempo: 78, stability: 84, activation: 87 }
  },
  "Back squat": {
    checks: ["Knee tracking", "Hip depth", "Neutral spine", "Foot pressure"],
    error: {
      type: "posture", joint: "spine",
      title: "Back rounds at the bottom",
      detail: "Your chest drops and your lower back rounds as you reach depth.",
      fix: "Brace your core and keep your chest tall all the way down.",
      compensate: ["lower-back"]
    },
    scores: { posture: 64, alignment: 88, range: 90, tempo: 86, stability: 74, activation: 70 }
  },
  "Romanian deadlift": {
    checks: ["Hip hinge", "Flat back", "Soft knees", "Hamstring stretch"],
    error: {
      type: "posture", joint: "spine",
      title: "Back rounds to reach",
      detail: "Your back rounds to reach lower, moving the stretch to your spine.",
      fix: "Push your hips back and stop when your hamstrings stretch.",
      compensate: ["lower-back"]
    },
    scores: { posture: 55, alignment: 91, range: 82, tempo: 89, stability: 87, activation: 74 }
  },
  "Leg press": {
    checks: ["Controlled depth", "Back on seat", "Knee tracking", "Full foot"],
    error: {
      type: "range", joint: "hip",
      title: "Going too deep",
      detail: "Your hips curl off the seat and your lower back rounds.",
      fix: "Stop at about 90 degrees with your lower back pressed down.",
      compensate: ["lower-back"]
    },
    scores: { posture: 76, alignment: 89, range: 62, tempo: 90, stability: 86, activation: 88 }
  },
  "Walking lunge": {
    checks: ["Step length", "Knee over ankle", "Upright torso", "Heel down"],
    error: {
      type: "alignment", joint: "knee",
      title: "Knee shoots past toes",
      detail: "Your short step drives your knee past your toes and lifts your heel.",
      fix: "Take a long step so your front knee stays over your ankle.",
      compensate: ["quads"]
    },
    scores: { posture: 89, alignment: 60, range: 81, tempo: 92, stability: 75, activation: 87 }
  },
  "Leg curl": {
    checks: ["Hips down", "Full curl", "Slow lowering", "Steady torso"],
    error: {
      type: "activation", joint: "hip",
      title: "Hips pike off the pad",
      detail: "Your hips lift off the pad and your lower back swings the weight.",
      fix: "Press your hips into the pad and lower the weight slowly.",
      compensate: ["lower-back"]
    },
    scores: { posture: 79, alignment: 90, range: 88, tempo: 77, stability: 87, activation: 63 }
  },
  "Standing calf raise": {
    checks: ["Full stretch", "Peak height", "Top pause", "Still knees"],
    error: {
      type: "tempo", joint: "ankle",
      title: "Bouncing with bent knees",
      detail: "Your knees bend and you bounce out of the bottom.",
      fix: "Keep your knees still, pause at the top, and stretch fully.",
      compensate: ["quads"],
      tempo: "fast"
    },
    scores: { posture: 93, alignment: 88, range: 76, tempo: 54, stability: 90, activation: 72 }
  },
  "Overhead press": {
    checks: ["Ribs down", "Glutes tight", "Vertical bar path", "Bar over midfoot"],
    error: {
      type: "posture", joint: "spine",
      title: "Leaning back to finish",
      detail: "Your torso leans back and your lower back arches at the top.",
      fix: "Squeeze your glutes, keep your ribs down, and press straight up.",
      compensate: ["lower-back", "chest"]
    },
    scores: { posture: 57, alignment: 86, range: 91, tempo: 88, stability: 73, activation: 83 }
  },
  "Arnold press": {
    checks: ["Tall posture", "Palm rotation", "Full press", "Controlled descent"],
    error: {
      type: "posture", joint: "spine",
      title: "Arching away from weight",
      detail: "Your back arches and you lean away to push the weight up.",
      fix: "Sit tall against the bench and press with your shoulders only.",
      compensate: ["lower-back"]
    },
    scores: { posture: 62, alignment: 90, range: 89, tempo: 86, stability: 77, activation: 84 }
  },
  "Dumbbell lateral raise": {
    checks: ["Elbow lead", "Shoulder height", "Shoulders down", "Controlled tempo"],
    error: {
      type: "activation", joint: "shoulder",
      title: "Traps take over",
      detail: "Your weights swing above shoulder height and your shoulders shrug.",
      fix: "Lead with your elbows, stop at shoulder height, shoulders down.",
      compensate: ["traps"]
    },
    scores: { posture: 91, alignment: 87, range: 82, tempo: 74, stability: 89, activation: 58 }
  },
  "Face pull": {
    checks: ["High elbows", "Eye-level rope", "Rope split", "Upright torso"],
    error: {
      type: "alignment", joint: "elbow",
      title: "Elbows drop too low",
      detail: "Your elbows drop below your shoulders and it becomes a row.",
      fix: "Keep your elbows high and pull the rope apart toward your face.",
      compensate: ["lats"]
    },
    scores: { posture: 92, alignment: 62, range: 88, tempo: 90, stability: 87, activation: 75 }
  },
  "Rear delt fly": {
    checks: ["Flat back", "Wide arms", "Shoulders down", "Light load"],
    error: {
      type: "activation", joint: "shoulder",
      title: "Shrugging into the raise",
      detail: "Your shoulders shrug and squeeze back, shifting work to your traps.",
      fix: "Keep your shoulders down and reach the dumbbells out wide.",
      compensate: ["traps"]
    },
    scores: { posture: 87, alignment: 80, range: 90, tempo: 89, stability: 92, activation: 60 }
  },
  "Barbell curl": {
    checks: ["Pinned elbows", "Still torso", "Full extension", "Controlled lowering"],
    error: {
      type: "posture", joint: "spine",
      title: "Leaning back to swing",
      detail: "Your body leans back and your elbows swing forward to cheat.",
      fix: "Stand tall, pin your elbows and move only your forearms.",
      compensate: ["shoulders", "lower-back"]
    },
    scores: { posture: 60, alignment: 82, range: 90, tempo: 74, stability: 80, activation: 76 }
  },
  "Hammer curl": {
    checks: ["Fixed elbows", "Thumbs up", "Full range", "Steady torso"],
    error: {
      type: "activation", joint: "elbow",
      title: "Elbows drift forward",
      detail: "Your elbows drift forward so your front delts lift the weight.",
      fix: "Fix your elbows by your sides and keep your thumbs up.",
      compensate: ["shoulders"]
    },
    scores: { posture: 93, alignment: 79, range: 89, tempo: 91, stability: 87, activation: 65 }
  },
  "Triceps rope pushdown": {
    checks: ["Tucked elbows", "Upright torso", "Rope spread", "Full lockout"],
    error: {
      type: "activation", joint: "elbow",
      title: "Leaning over the rope",
      detail: "Your torso leans over and your elbows travel off your sides.",
      fix: "Stand tall, tuck your elbows, and spread the rope at the bottom.",
      compensate: ["chest", "shoulders"]
    },
    scores: { posture: 81, alignment: 76, range: 90, tempo: 88, stability: 91, activation: 61 }
  },
  "Skull crusher": {
    checks: ["Still upper arms", "Slight arm angle", "Bar to forehead", "Elbow lockout"],
    error: {
      type: "alignment", joint: "shoulder",
      title: "Upper arms swing",
      detail: "Your upper arms swing back and forth like a pullover.",
      fix: "Hold your upper arms still and bend only at the elbows.",
      compensate: ["lats"]
    },
    scores: { posture: 94, alignment: 59, range: 87, tempo: 89, stability: 86, activation: 72 }
  },
  "Dips": {
    checks: ["Upright torso", "Elbow depth", "Shoulders back", "Full lockout"],
    error: {
      type: "range", joint: "shoulder",
      title: "Sinking too deep",
      detail: "Your body sinks too low and your shoulders roll forward.",
      fix: "Stay upright and stop when your elbows reach 90 degrees.",
      compensate: ["shoulders"]
    },
    scores: { posture: 88, alignment: 74, range: 60, tempo: 90, stability: 80, activation: 87 }
  },
  "Plank": {
    checks: ["Straight line", "Ribs down", "Tight glutes", "Elbows stacked"],
    error: {
      type: "posture", joint: "hip",
      title: "Hips sag down",
      detail: "Your hips drop and your lower back arches toward the floor.",
      fix: "Tuck your ribs down and squeeze your glutes to stay straight.",
      compensate: ["lower-back"]
    },
    scores: { posture: 56, alignment: 89, range: 93, tempo: 95, stability: 71, activation: 80 }
  },
  "Hanging leg raise": {
    checks: ["Pelvic curl", "No swing", "Full lift", "Controlled lowering"],
    error: {
      type: "activation", joint: "hip",
      title: "Hip flexors take over",
      detail: "Your body swings and your knees only rise halfway.",
      fix: "Stop the swing and curl your pelvis up as your legs rise.",
      compensate: ["quads"]
    },
    scores: { posture: 87, alignment: 91, range: 76, tempo: 79, stability: 89, activation: 57 }
  },
  "Cable crunch": {
    checks: ["Still hips", "Spinal curl", "Fixed arms", "Full crunch"],
    error: {
      type: "activation", joint: "hip",
      title: "Pulling with the arms",
      detail: "Your hips sit back and your arms pull instead of your spine curling.",
      fix: "Keep your hips still and curl your ribs toward your hips.",
      compensate: ["lats"]
    },
    scores: { posture: 86, alignment: 90, range: 77, tempo: 88, stability: 92, activation: 62 }
  },
  "Pallof press": {
    checks: ["Square hips", "Braced core", "Straight press", "Tall stance"],
    error: {
      type: "posture", joint: "hip",
      title: "Leaning away from cable",
      detail: "Your torso leans away from the cable and your hips shift.",
      fix: "Stand square, brace hard, and press straight out without twisting.",
      compensate: []
    },
    scores: { posture: 66, alignment: 82, range: 91, tempo: 93, stability: 70, activation: 86 }
  },
  "Dead bug": {
    checks: ["Flat back", "Ribs down", "Opposite reach", "Slow reach"],
    error: {
      type: "posture", joint: "spine",
      title: "Lower back arches up",
      detail: "Your lower back lifts off the floor as your leg lowers.",
      fix: "Press your lower back flat and stop the leg before it lifts.",
      compensate: ["lower-back"]
    },
    scores: { posture: 61, alignment: 92, range: 88, tempo: 90, stability: 75, activation: 81 }
  }
};

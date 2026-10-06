// Exercise library.
// Each exercise lists the muscles it works, how to do it right, the most
// common mistake, and two poses (a = start, b = end) for the posture figure.
// See js/figure.js for how the pose angles work.

const MUSCLES = {
  chest: "Chest", shoulders: "Front & side delts", "rear-delts": "Rear delts", traps: "Traps",
  "upper-back": "Upper back", lats: "Lats", "lower-back": "Lower back",
  biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
  abs: "Abs", obliques: "Obliques", glutes: "Glutes", quads: "Quads", hamstrings: "Hamstrings", calves: "Calves"
};

const GROUPS = [
  { id: "chest", name: "Chest" }, { id: "back", name: "Back" }, { id: "legs", name: "Legs" },
  { id: "shoulders", name: "Shoulders" }, { id: "arms", name: "Arms" }, { id: "core", name: "Core" }
];

// Common starting poses.
const STAND = { x: 100, y: 186, shin: 0, thigh: 0, torso: 0, neck: 0, ua: 180, fa: 180 };
const FLAT_BENCH = [{ rect: [62, 134, 100, 8] }, { line: [72, 142, 72, 188], w: 5 }, { line: [152, 142, 152, 188], w: 5 }];
const LIE_ON_BENCH = { x: 40, y: 186, shin: 0, thigh: 70, torso: 90, neck: 95, bend: -2 };
const SEAT = (x, y) => [{ rect: [x - 16, y, 34, 7] }, { line: [x, y + 7, x, 188], w: 5 }];

const EXERCISES = [
  // ---------- Chest ----------
  {
    name: "Barbell bench press", group: "chest", equipment: "Barbell", sets: 4, reps: "6–8", rest: 150,
    primary: ["chest"], secondary: ["shoulders", "triceps"],
    good: { cue: "Shoulder blades pinned back, feet planted, bar touches the middle of your chest.", highlight: ["arm"] },
    bad: { cue: "Hips lift off the bench. The lower back over-arches and the chest does less work.", highlight: ["hip", "spine"],
      a: { thigh: 40, torso: 106 }, b: { thigh: 40, torso: 106 } },
    figure: { props: FLAT_BENCH, load: { type: "barbell" },
      a: { ...LIE_ON_BENCH, ua: 0, fa: 0 }, b: { ...LIE_ON_BENCH, ua: 245, fa: 25 } }
  },
  {
    name: "Incline dumbbell press", group: "chest", equipment: "Dumbbells", sets: 3, reps: "8–10", rest: 90,
    primary: ["chest"], secondary: ["shoulders", "triceps"],
    good: { cue: "Bench at 30°. Lower until the dumbbells sit beside your upper chest, forearms vertical.", highlight: ["arm"] },
    bad: { cue: "Half reps. The dumbbells stop well above the chest, so the chest never gets a full stretch.", highlight: ["elbow"],
      b: { ua: 310, fa: 15 } },
    figure: { props: [{ line: [76, 156, 104, 156], w: 7 }, { line: [74, 156, 40, 106], w: 7 }, { line: [86, 160, 86, 188], w: 5 }],
      load: { type: "dumbbell" },
      a: { x: 82, y: 150, anchor: "hip", shin: -8, thigh: -92, torso: -34, neck: -30, ua: 0, fa: 0 },
      b: { x: 82, y: 150, anchor: "hip", shin: -8, thigh: -92, torso: -34, neck: -30, ua: 235, fa: 2 } }
  },
  {
    name: "Cable fly", group: "chest", equipment: "Cable", sets: 3, reps: "12–15", rest: 60,
    primary: ["chest"], secondary: ["shoulders"],
    good: { cue: "Keep a soft, fixed bend in the elbows and hug the hands together in front of your chest.", highlight: ["elbow"] },
    bad: { cue: "Bending and straightening the elbows turns it into a press and takes the stretch off the chest.", highlight: ["elbow", "forearm"],
      b: { ua: 170, fa: 70 } },
    figure: { props: [{ line: [16, 20, 16, 188], w: 6 }], load: { type: "cable", from: [16, 34] },
      a: { ...STAND, x: 104, torso: 14, neck: 10, ua: 250, fa: 235, shin: 4, thigh: -4 },
      b: { ...STAND, x: 104, torso: 14, neck: 10, ua: 125, fa: 100, shin: 4, thigh: -4 } }
  },
  {
    name: "Machine chest press", group: "chest", equipment: "Machine", sets: 3, reps: "10–12", rest: 90,
    primary: ["chest"], secondary: ["triceps", "shoulders"],
    good: { cue: "Handles level with mid-chest. Back and shoulders stay flat against the pad.", highlight: ["spine"] },
    bad: { cue: "Shoulders roll forward off the pad at lockout, shifting the work to the front delts.", highlight: ["shoulder", "spine"],
      b: { torso: 22, bend: 8, neck: 25 } },
    figure: { props: [...SEAT(76, 142), { line: [62, 140, 58, 70], w: 7 }],
      load: { type: "cable", from: [150, 96] },
      a: { x: 76, y: 136, anchor: "hip", shin: 10, thigh: -90, torso: -6, neck: -2, ua: 210, fa: 88 },
      b: { x: 76, y: 136, anchor: "hip", shin: 10, thigh: -90, torso: -6, neck: -2, ua: 96, fa: 92 } }
  },
  {
    name: "Push-up", group: "chest", equipment: "Bodyweight", sets: 3, reps: "max", rest: 60,
    primary: ["chest", "triceps"], secondary: ["shoulders", "abs"],
    good: { cue: "Body in one straight line from head to heels. Lower until your chest nearly touches the floor.", highlight: ["spine", "leg"] },
    bad: { cue: "Hips sag toward the floor, which loads the lower back instead of the chest.", highlight: ["hip", "spine"],
      a: { thigh: 84, torso: 58 }, b: { thigh: 88, torso: 72 } },
    figure: { load: { type: "none" },
      a: { x: 30, y: 180, foot: 165, shin: 68, thigh: 68, torso: 68, neck: 72, ua: 180, fa: 180 },
      b: { x: 30, y: 180, foot: 165, shin: 80, thigh: 80, torso: 80, neck: 84, ua: 235, fa: 126 } }
  },

  // ---------- Back ----------
  {
    name: "Deadlift", group: "back", equipment: "Barbell", sets: 3, reps: "5", rest: 180,
    primary: ["glutes", "hamstrings", "lower-back"], secondary: ["traps", "forearms", "quads", "lats"],
    good: { cue: "Flat back, bar over the middle of the foot and close to the legs. Push the floor away.", highlight: ["spine"] },
    bad: { cue: "Rounded lower back under load. This is the most common way to get hurt deadlifting.", highlight: ["spine", "back"],
      b: { torso: 74, bend: 12, neck: 100, thigh: -60 } },
    figure: { load: { type: "barbell", r: 22 }, hold: 1,
      a: { ...STAND, x: 96, ua: 178, fa: 178 },
      b: { ...STAND, x: 96, shin: 20, thigh: -70, torso: 60, neck: 66, ua: 178, fa: 178 } }
  },
  {
    name: "Pull-up", group: "back", equipment: "Bodyweight", sets: 4, reps: "6–10", rest: 120,
    primary: ["lats"], secondary: ["biceps", "upper-back", "forearms"],
    good: { cue: "Start from a full hang and pull until your chin clears the bar.", highlight: ["arm"] },
    bad: { cue: "Kicking the legs and swinging for momentum. The lats only do part of the work.", highlight: ["hip", "thigh"],
      b: { thigh: -62, shin: 10, torso: -20 } },
    figure: { noFloor: true, props: [{ line: [40, 14, 170, 14], w: 6 }], load: { type: "none" },
      a: { x: 100, y: 14, anchor: "hand", shin: 70, thigh: -6, torso: -4, neck: 0, ua: 4, fa: 0 },
      b: { x: 100, y: 14, anchor: "hand", shin: 70, thigh: -6, torso: -8, neck: 0, ua: 172, fa: -8 } }
  },
  {
    name: "Barbell row", group: "back", equipment: "Barbell", sets: 4, reps: "8", rest: 120,
    primary: ["lats", "upper-back"], secondary: ["biceps", "rear-delts", "lower-back"],
    good: { cue: "Hinge to about 45°, back flat, pull the bar to your belly button.", highlight: ["spine", "elbow"] },
    bad: { cue: "Standing up and yanking with the hips. The back barely works and the lower back takes the strain.", highlight: ["hip", "spine"],
      b: { torso: 18, thigh: -10, shin: 6 } },
    figure: { load: { type: "barbell", r: 18 },
      a: { ...STAND, x: 96, shin: 14, thigh: -50, torso: 58, neck: 66, ua: 178, fa: 178 },
      b: { ...STAND, x: 96, shin: 14, thigh: -50, torso: 58, neck: 66, ua: 255, fa: 165 } }
  },
  {
    name: "Lat pulldown", group: "back", equipment: "Cable", sets: 3, reps: "10–12", rest: 90,
    primary: ["lats"], secondary: ["biceps", "upper-back"],
    good: { cue: "Sit tall with a slight lean back. Lead with the elbows and bring the bar to your upper chest.", highlight: ["arm"] },
    bad: { cue: "Leaning far back turns it into a row and takes the work off the lats.", highlight: ["spine", "hip"],
      b: { torso: -42, neck: -30 } },
    figure: { props: [...SEAT(84, 142), { rect: [96, 112, 20, 7] }], load: { type: "cable", from: [104, 0] },
      a: { x: 84, y: 136, anchor: "hip", shin: 0, thigh: -90, torso: -8, neck: -4, ua: 8, fa: 4 },
      b: { x: 84, y: 136, anchor: "hip", shin: 0, thigh: -90, torso: -14, neck: -6, ua: 200, fa: 18 } }
  },
  {
    name: "Seated cable row", group: "back", equipment: "Cable", sets: 3, reps: "10–12", rest: 90,
    primary: ["upper-back", "lats"], secondary: ["biceps", "rear-delts"],
    good: { cue: "Chest up, back still. Pull the handle to your stomach and squeeze for one second.", highlight: ["spine"] },
    bad: { cue: "Rounding forward to reach, then yanking back with the lower back.", highlight: ["spine", "back"],
      a: { torso: 50, bend: 12, neck: 70, ua: 120, fa: 115 } },
    figure: { props: [{ rect: [40, 160, 60, 7] }, { line: [70, 167, 70, 188], w: 5 }, { line: [150, 150, 150, 188], w: 6 }],
      load: { type: "cable", from: [176, 140] },
      a: { x: 66, y: 154, anchor: "hip", shin: -72, thigh: -98, torso: 6, neck: 6, ua: 96, fa: 92 },
      b: { x: 66, y: 154, anchor: "hip", shin: -72, thigh: -98, torso: -6, neck: -4, ua: 205, fa: 82 } }
  },

  // ---------- Legs ----------
  {
    name: "Back squat", group: "legs", equipment: "Barbell", sets: 4, reps: "6–8", rest: 180,
    primary: ["quads", "glutes"], secondary: ["hamstrings", "lower-back", "abs"],
    good: { cue: "Brace, sit down until your hips reach knee height, chest up, knees track over the toes.", highlight: ["knee", "thigh"] },
    bad: { cue: "The chest drops and the back rounds at the bottom, so the lower back takes the load.", highlight: ["spine", "back"],
      b: { torso: 66, bend: 12, neck: 90 } },
    figure: { load: { type: "barbell", at: "shoulder", offset: [-7, -1], r: 12 },
      a: { ...STAND, x: 94, ua: 215, fa: 30 },
      b: { ...STAND, x: 94, shin: 32, thigh: -80, torso: 40, neck: 30, ua: 250, fa: 70 } }
  },
  {
    name: "Romanian deadlift", group: "legs", equipment: "Barbell", sets: 3, reps: "8–10", rest: 120,
    primary: ["hamstrings", "glutes"], secondary: ["lower-back", "forearms"],
    good: { cue: "Soft knees. Push the hips back until you feel the hamstrings stretch, back flat.", highlight: ["hip", "thigh"] },
    bad: { cue: "Rounding the back to reach lower. The stretch leaves the hamstrings and goes to the spine.", highlight: ["spine", "back"],
      b: { bend: 14, torso: 90, neck: 120 } },
    figure: { load: { type: "barbell", r: 18 },
      a: { ...STAND, x: 104, ua: 178, fa: 178 },
      b: { ...STAND, x: 104, shin: 8, thigh: -26, torso: 72, neck: 80, ua: 182, fa: 182 } }
  },
  {
    name: "Leg press", group: "legs", equipment: "Machine", sets: 3, reps: "10–12", rest: 120,
    primary: ["quads", "glutes"], secondary: ["hamstrings"],
    good: { cue: "Lower until the knees reach about 90°, lower back pressed into the seat.", highlight: ["knee"] },
    bad: { cue: "Going too deep so the hips curl off the seat and the lower back rounds.", highlight: ["hip", "spine"],
      b: { torso: -18, bend: 10, neck: -10, thigh: 170, shin: 280 } },
    figure: { props: [{ line: [70, 150, 34, 104], w: 7 }, { line: [64, 152, 100, 152], w: 7 }, { line: [80, 156, 80, 188], w: 5 }],
      load: { type: "footplate" },
      a: { x: 76, y: 146, anchor: "hip", foot: 135, shin: 228, thigh: 228, torso: -40, neck: -30, ua: 170, fa: 120 },
      b: { x: 76, y: 146, anchor: "hip", foot: 135, shin: 290, thigh: 200, torso: -40, neck: -30, ua: 170, fa: 120 } }
  },
  {
    name: "Walking lunge", group: "legs", equipment: "Dumbbells", sets: 3, reps: "12 each leg", rest: 90,
    primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"],
    good: { cue: "Long step. Front knee over the ankle, back knee just above the floor, torso upright.", highlight: ["knee", "shin"] },
    bad: { cue: "Short step so the front knee shoots past the toes and the heel lifts.", highlight: ["knee", "shin"],
      b: { shin: 36, thigh: -62, t2: 205, s2: 245, f2: 150, foot: 115 } },
    figure: { load: { type: "dumbbell" },
      a: { ...STAND, x: 120, t2: 180, s2: 180 },
      b: { ...STAND, x: 120, shin: 4, thigh: -78, t2: 200, s2: 262, f2: 150 } }
  },
  {
    name: "Leg curl", group: "legs", equipment: "Machine", sets: 3, reps: "12", rest: 60,
    primary: ["hamstrings"], secondary: ["calves"],
    good: { cue: "Hips pressed into the pad. Curl the heels up, then lower slowly.", highlight: ["shin", "knee"] },
    bad: { cue: "Hips pike up off the pad and the lower back helps swing the weight.", highlight: ["hip", "spine"],
      b: { thigh: 62, torso: 108 } },
    figure: { props: [{ rect: [34, 142, 128, 8] }, { line: [60, 150, 60, 188], w: 5 }, { line: [140, 150, 140, 188], w: 5 }],
      load: { type: "roller", at: "ankle", offset: [0, -7] },
      a: { x: 92, y: 134, anchor: "hip", foot: 90, shin: 92, thigh: 92, torso: 92, neck: 85, ua: 165, fa: 150 },
      b: { x: 92, y: 134, anchor: "hip", foot: 30, shin: 175, thigh: 92, torso: 92, neck: 85, ua: 165, fa: 150 } }
  },
  {
    name: "Standing calf raise", group: "legs", equipment: "Machine", sets: 4, reps: "12–15", rest: 60,
    primary: ["calves"], secondary: [],
    good: { cue: "Full stretch at the bottom, rise as high as you can on the toes, pause at the top.", highlight: ["foot", "shin"] },
    bad: { cue: "Bending the knees and bouncing. The calves get a fraction of the work.", highlight: ["knee"],
      b: { shin: 22, thigh: -24 } },
    figure: { props: [{ rect: [96, 182, 40, 6] }], load: { type: "barbell", at: "shoulder", offset: [-2, -5], r: 8 },
      a: { ...STAND, x: 112, y: 183, anchor: "toe", foot: 108, ua: 200, fa: 10 },
      b: { ...STAND, x: 112, y: 183, anchor: "toe", foot: 145, ua: 200, fa: 10 } }
  },

  // ---------- Shoulders ----------
  {
    name: "Overhead press", group: "shoulders", equipment: "Barbell", sets: 4, reps: "6–8", rest: 120,
    primary: ["shoulders"], secondary: ["triceps", "traps", "abs"],
    good: { cue: "Squeeze glutes, ribs down, press straight up and finish with the bar over your mid-foot.", highlight: ["spine", "arm"] },
    bad: { cue: "Leaning back and arching the lower back to finish the press.", highlight: ["spine", "hip"],
      b: { torso: -20, bend: -9, neck: -18, thigh: 8 } },
    figure: { load: { type: "barbell", r: 16 },
      a: { ...STAND, ua: 160, fa: 8 },
      b: { ...STAND, ua: 2, fa: 0 } }
  },
  {
    name: "Arnold press", group: "shoulders", equipment: "Dumbbells", sets: 3, reps: "10", rest: 90,
    primary: ["shoulders"], secondary: ["triceps"],
    good: { cue: "Sit tall. Start palms facing you and rotate them forward as you press up.", highlight: ["arm"] },
    bad: { cue: "Arching the back and leaning away to get the weight up.", highlight: ["spine"],
      b: { torso: -22, bend: -9, neck: -16 } },
    figure: { props: [...SEAT(84, 142), { line: [70, 140, 70, 80], w: 7 }], load: { type: "dumbbell" },
      a: { x: 84, y: 136, anchor: "hip", shin: 0, thigh: -90, torso: 0, neck: 0, ua: 170, fa: 12 },
      b: { x: 84, y: 136, anchor: "hip", shin: 0, thigh: -90, torso: 0, neck: 0, ua: 4, fa: 0 } }
  },
  {
    name: "Dumbbell lateral raise", group: "shoulders", equipment: "Dumbbells", sets: 3, reps: "12–15", rest: 60,
    primary: ["shoulders"], secondary: ["traps"],
    good: { cue: "Raise the dumbbells out to shoulder height, leading with the elbows. Shoulders stay down.", highlight: ["upperArm"] },
    bad: { cue: "Swinging the weight above shoulder height and shrugging, so the traps take over.", highlight: ["neck", "shoulder"],
      b: { ua: 50, fa: 40 } },
    figure: { view: "front", load: { type: "dumbbell" },
      a: { y: 186, ua: 170, fa: 172 },
      b: { y: 186, ua: 95, fa: 98 } }
  },
  {
    name: "Face pull", group: "shoulders", equipment: "Cable", sets: 3, reps: "15", rest: 60,
    primary: ["rear-delts"], secondary: ["upper-back", "traps"],
    good: { cue: "Rope at eye height. Pull it toward your face, elbows high, and pull the ends apart.", highlight: ["upperArm", "elbow"] },
    bad: { cue: "Elbows drop below the shoulders and it turns into a row.", highlight: ["upperArm", "elbow"],
      b: { ua: 205, fa: 70 } },
    figure: { props: [{ line: [184, 20, 184, 188], w: 6 }], load: { type: "cable", from: [184, 44] },
      a: { ...STAND, x: 86, torso: -6, neck: -2, ua: 82, fa: 84 },
      b: { ...STAND, x: 86, torso: -6, neck: -2, ua: 280, fa: 40 } }
  },
  {
    name: "Rear delt fly", group: "shoulders", equipment: "Dumbbells", sets: 3, reps: "15", rest: 60,
    primary: ["rear-delts"], secondary: ["upper-back"],
    good: { cue: "Hinge forward with a flat back and raise the dumbbells out wide with light weight.", highlight: ["upperArm"] },
    bad: { cue: "Shrugging and squeezing the shoulder blades together so the traps take over.", highlight: ["neck", "shoulder"],
      b: { ua: 55, fa: 45 } },
    figure: { view: "front", load: { type: "dumbbell" },
      a: { y: 186, tl: 0.45, hy: 112, knees: 3, ua: 178, fa: 178 },
      b: { y: 186, tl: 0.45, hy: 112, knees: 3, ua: 92, fa: 96 } }
  },

  // ---------- Arms ----------
  {
    name: "Barbell curl", group: "arms", equipment: "Barbell", sets: 3, reps: "10", rest: 60,
    primary: ["biceps"], secondary: ["forearms"],
    good: { cue: "Elbows pinned at your sides. Only the forearms move.", highlight: ["upperArm", "elbow"] },
    bad: { cue: "Leaning back and swinging the elbows forward to cheat the weight up.", highlight: ["spine", "upperArm"],
      b: { torso: -18, neck: -12, ua: 140, fa: 10 } },
    figure: { load: { type: "barbell", r: 14 },
      a: { ...STAND, ua: 178, fa: 175 },
      b: { ...STAND, ua: 175, fa: 30 } }
  },
  {
    name: "Hammer curl", group: "arms", equipment: "Dumbbells", sets: 3, reps: "12", rest: 60,
    primary: ["biceps", "forearms"], secondary: [],
    good: { cue: "Thumbs up the whole way, elbows fixed by your sides.", highlight: ["upperArm", "elbow"] },
    bad: { cue: "Elbows drift forward so the front delts lift the weight.", highlight: ["upperArm", "shoulder"],
      b: { ua: 130, fa: 10 } },
    figure: { load: { type: "dumbbell" },
      a: { ...STAND, ua: 178, fa: 175 },
      b: { ...STAND, ua: 175, fa: 30 } }
  },
  {
    name: "Triceps rope pushdown", group: "arms", equipment: "Cable", sets: 3, reps: "12–15", rest: 60,
    primary: ["triceps"], secondary: [],
    good: { cue: "Elbows tucked at your sides. Push down and spread the rope at the bottom.", highlight: ["forearm", "elbow"] },
    bad: { cue: "Leaning over the rope and letting the elbows travel, so the chest and shoulders push it.", highlight: ["spine", "upperArm"],
      a: { torso: 34, neck: 40, ua: 130, fa: 50 }, b: { torso: 34, neck: 40, ua: 175, fa: 165 } },
    figure: { props: [{ line: [150, 10, 150, 188], w: 6 }], load: { type: "cable", from: [146, 18] },
      a: { ...STAND, x: 92, torso: 8, neck: 8, ua: 172, fa: 52 },
      b: { ...STAND, x: 92, torso: 8, neck: 8, ua: 172, fa: 172 } }
  },
  {
    name: "Skull crusher", group: "arms", equipment: "EZ bar", sets: 3, reps: "10", rest: 90,
    primary: ["triceps"], secondary: [],
    good: { cue: "Upper arms stay still, angled slightly back. Lower the bar to your forehead.", highlight: ["upperArm"] },
    bad: { cue: "Upper arms swing back and forth, turning it into a pullover.", highlight: ["upperArm", "shoulder"],
      a: { ua: -30, fa: -10 }, b: { ua: 60, fa: 150 } },
    figure: { props: FLAT_BENCH, load: { type: "barbell", r: 10 },
      a: { ...LIE_ON_BENCH, ua: 10, fa: 8 }, b: { ...LIE_ON_BENCH, ua: 12, fa: 140 } }
  },
  {
    name: "Dips", group: "arms", equipment: "Bodyweight", sets: 3, reps: "8–12", rest: 90,
    primary: ["triceps", "chest"], secondary: ["shoulders"],
    good: { cue: "Stay upright and lower until the elbows reach 90°.", highlight: ["elbow", "upperArm"] },
    bad: { cue: "Sinking too deep with the shoulders rolling forward. Hard on the shoulder joint.", highlight: ["shoulder"],
      b: { torso: 30, neck: 40, ua: 275, fa: 150 } },
    figure: { noFloor: true, props: [{ line: [60, 104, 150, 104], w: 6 }, { line: [140, 104, 140, 188], w: 5 }], load: { type: "none" },
      a: { x: 106, y: 104, anchor: "hand", shin: 80, thigh: 10, torso: 2, neck: 4, ua: 180, fa: 180 },
      b: { x: 106, y: 104, anchor: "hand", shin: 80, thigh: 10, torso: 10, neck: 10, ua: 245, fa: 160 } }
  },

  // ---------- Core ----------
  {
    name: "Plank", group: "core", equipment: "Bodyweight", sets: 3, reps: "45 s", rest: 60,
    primary: ["abs"], secondary: ["obliques", "shoulders"],
    good: { cue: "Elbows under shoulders, ribs down, glutes tight. One straight line.", highlight: ["spine", "leg"] },
    bad: { cue: "Hips sag and the lower back arches.", highlight: ["hip", "spine"],
      a: { thigh: 86, torso: 70 }, b: { thigh: 88, torso: 68 } },
    figure: { load: { type: "none" },
      a: { x: 36, y: 182, foot: 165, shin: 78, thigh: 78, torso: 78, neck: 82, ua: 180, fa: 90 },
      b: { x: 36, y: 182, foot: 165, shin: 79, thigh: 79, torso: 79, neck: 83, ua: 180, fa: 90 } }
  },
  {
    name: "Hanging leg raise", group: "core", equipment: "Pull-up bar", sets: 3, reps: "10–12", rest: 60,
    primary: ["abs"], secondary: ["obliques", "forearms"],
    good: { cue: "Curl the pelvis up as you raise the legs. No swinging.", highlight: ["hip", "thigh"] },
    bad: { cue: "Swinging and only lifting the knees halfway, so the hip flexors do the work.", highlight: ["hip", "spine"],
      b: { thigh: -40, shin: -10, torso: 14, bend: -6 } },
    figure: { noFloor: true, props: [{ line: [40, 14, 170, 14], w: 6 }], load: { type: "none" },
      a: { x: 100, y: 14, anchor: "hand", shin: 0, thigh: 0, torso: 0, neck: 0, ua: 0, fa: 0 },
      b: { x: 100, y: 14, anchor: "hand", shin: -20, thigh: -92, torso: -8, bend: 4, neck: 0, ua: -4, fa: 0 } }
  },
  {
    name: "Cable crunch", group: "core", equipment: "Cable", sets: 3, reps: "15", rest: 60,
    primary: ["abs"], secondary: ["obliques"],
    good: { cue: "Hips stay still. Curl the ribs down toward the hips.", highlight: ["spine", "back"] },
    bad: { cue: "Sitting the hips back and pulling with the arms instead of curling the spine.", highlight: ["hip", "thigh"],
      b: { thigh: -42, torso: 62, bend: 0 } },
    figure: { props: [{ line: [150, 6, 150, 188], w: 6 }], load: { type: "cable", from: [146, 12] },
      a: { x: 70, y: 186, anchor: "knee", foot: 90, shin: 92, thigh: 0, torso: 12, neck: 12, ua: 40, fa: 200 },
      b: { x: 70, y: 186, anchor: "knee", foot: 90, shin: 92, thigh: 0, torso: 80, bend: 10, neck: 120, ua: 120, fa: 280 } }
  },
  {
    name: "Pallof press", group: "core", equipment: "Cable", sets: 3, reps: "12 each side", rest: 45,
    primary: ["obliques"], secondary: ["abs"],
    good: { cue: "Stand side-on to the cable. Press the handle straight out and don't let it twist you.", highlight: ["spine"] },
    bad: { cue: "Leaning away from the cable and letting the hips shift.", highlight: ["spine", "hip"],
      b: { torso: -16, bend: -6, thigh: 10, shin: -6 } },
    figure: { props: [{ line: [16, 20, 16, 188], w: 6 }], load: { type: "cable", from: [16, 96] },
      a: { ...STAND, shin: 10, thigh: -10, ua: 200, fa: 70 },
      b: { ...STAND, shin: 10, thigh: -10, ua: 92, fa: 90 } }
  },
  {
    name: "Dead bug", group: "core", equipment: "Bodyweight", sets: 3, reps: "10 each side", rest: 45,
    primary: ["abs"], secondary: ["obliques"],
    good: { cue: "Lower back stays flat on the floor as you reach the opposite arm and leg away.", highlight: ["spine"] },
    bad: { cue: "The lower back arches off the floor as the leg goes down.", highlight: ["spine", "back"],
      b: { bend: -10, torso: -84 } },
    figure: { load: { type: "none" },
      a: { x: 96, y: 178, anchor: "hip", foot: 0, shin: -90, thigh: 180, torso: -90, neck: -92, ua: 0, fa: 0, t2: 0, s2: 90, f2: 0 },
      b: { x: 96, y: 178, anchor: "hip", foot: 80, shin: -80, thigh: 260, torso: -90, neck: -92, ua: -70, fa: -72, t2: 0, s2: 90, f2: 0 } }
  }
];

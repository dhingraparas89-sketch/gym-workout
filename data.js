// Exercise library and workout plans.
// Edit this file to add exercises or change sets, reps and rest.
//   sets: number of working sets
//   reps: text shown after "×" (e.g. "8–10", "45 s", "12 each leg")
//   rest: rest between sets, in seconds

const MUSCLE_GROUPS = [
  {
    id: "chest", name: "Chest",
    exercises: [
      { name: "Barbell bench press", equipment: "Barbell", sets: 4, reps: "6–8", rest: 150, tip: "Shoulder blades pinned back, bar touches mid-chest." },
      { name: "Incline dumbbell press", equipment: "Dumbbells", sets: 3, reps: "8–10", rest: 90, tip: "Bench at 30°. Lower slowly to chest level." },
      { name: "Cable fly", equipment: "Cable", sets: 3, reps: "12–15", rest: 60, tip: "Soft bend in the elbows; squeeze hands together." },
      { name: "Machine chest press", equipment: "Machine", sets: 3, reps: "10–12", rest: 90, tip: "Handles level with mid-chest. Good finisher." },
      { name: "Push-up", equipment: "Bodyweight", sets: 3, reps: "max", rest: 60, tip: "Body in one straight line, chest to the floor." }
    ]
  },
  {
    id: "back", name: "Back",
    exercises: [
      { name: "Deadlift", equipment: "Barbell", sets: 3, reps: "5", rest: 180, tip: "Bar over mid-foot, flat back, push the floor away." },
      { name: "Pull-up", equipment: "Bodyweight", sets: 4, reps: "6–10", rest: 120, tip: "Full hang at the bottom, chin over the bar." },
      { name: "Barbell row", equipment: "Barbell", sets: 4, reps: "8", rest: 120, tip: "Hinge to about 45°, pull the bar to your belly button." },
      { name: "Lat pulldown", equipment: "Cable", sets: 3, reps: "10–12", rest: 90, tip: "Lead with the elbows, bar to upper chest." },
      { name: "Seated cable row", equipment: "Cable", sets: 3, reps: "10–12", rest: 90, tip: "Chest up, pause one second at full squeeze." }
    ]
  },
  {
    id: "legs", name: "Legs",
    exercises: [
      { name: "Back squat", equipment: "Barbell", sets: 4, reps: "6–8", rest: 180, tip: "Brace, sit between the hips, knees track over toes." },
      { name: "Romanian deadlift", equipment: "Barbell", sets: 3, reps: "8–10", rest: 120, tip: "Push hips back until you feel the hamstrings stretch." },
      { name: "Leg press", equipment: "Machine", sets: 3, reps: "10–12", rest: 120, tip: "Lower until knees reach 90°. Don't lock out hard." },
      { name: "Walking lunge", equipment: "Dumbbells", sets: 3, reps: "12 each leg", rest: 90, tip: "Long step, back knee just above the floor." },
      { name: "Leg curl", equipment: "Machine", sets: 3, reps: "12", rest: 60, tip: "Control the way back up; no swinging." },
      { name: "Standing calf raise", equipment: "Machine", sets: 4, reps: "12–15", rest: 60, tip: "Full stretch at the bottom, pause at the top." }
    ]
  },
  {
    id: "shoulders", name: "Shoulders",
    exercises: [
      { name: "Overhead press", equipment: "Barbell", sets: 4, reps: "6–8", rest: 120, tip: "Squeeze glutes, press straight up past the face." },
      { name: "Arnold press", equipment: "Dumbbells", sets: 3, reps: "10", rest: 90, tip: "Rotate palms from facing you to facing forward." },
      { name: "Dumbbell lateral raise", equipment: "Dumbbells", sets: 3, reps: "12–15", rest: 60, tip: "Lift to shoulder height, lead with the elbows." },
      { name: "Face pull", equipment: "Cable", sets: 3, reps: "15", rest: 60, tip: "Rope to the eyes, pull the ends apart." },
      { name: "Rear delt fly", equipment: "Dumbbells", sets: 3, reps: "15", rest: 60, tip: "Bent over, arms wide, light weight." }
    ]
  },
  {
    id: "arms", name: "Arms",
    exercises: [
      { name: "Barbell curl", equipment: "Barbell", sets: 3, reps: "10", rest: 60, tip: "Elbows stay pinned at your sides." },
      { name: "Hammer curl", equipment: "Dumbbells", sets: 3, reps: "12", rest: 60, tip: "Thumbs up the whole way." },
      { name: "Triceps rope pushdown", equipment: "Cable", sets: 3, reps: "12–15", rest: 60, tip: "Spread the rope at the bottom." },
      { name: "Skull crusher", equipment: "EZ bar", sets: 3, reps: "10", rest: 90, tip: "Lower to the forehead, upper arms still." },
      { name: "Dips", equipment: "Bodyweight", sets: 3, reps: "8–12", rest: 90, tip: "Stay upright to keep the work on the triceps." }
    ]
  },
  {
    id: "core", name: "Core",
    exercises: [
      { name: "Plank", equipment: "Bodyweight", sets: 3, reps: "45 s", rest: 60, tip: "Ribs down, glutes tight, breathe." },
      { name: "Hanging leg raise", equipment: "Pull-up bar", sets: 3, reps: "10–12", rest: 60, tip: "Curl the pelvis up; don't swing." },
      { name: "Cable crunch", equipment: "Cable", sets: 3, reps: "15", rest: 60, tip: "Crunch the ribs toward the hips." },
      { name: "Pallof press", equipment: "Cable", sets: 3, reps: "12 each side", rest: 45, tip: "Press out and resist the twist." },
      { name: "Dead bug", equipment: "Bodyweight", sets: 3, reps: "10 each side", rest: 45, tip: "Lower back stays flat on the floor." }
    ]
  }
];

// Each day lists exercise names from the library above.
const PLANS = [
  {
    id: "full", name: "Full body", perWeek: 3,
    who: "Beginners, or anyone training 3 days a week.",
    days: [
      { name: "Day A", exercises: ["Back squat", "Barbell bench press", "Barbell row", "Dumbbell lateral raise", "Plank"] },
      { name: "Day B", exercises: ["Deadlift", "Overhead press", "Pull-up", "Walking lunge", "Hanging leg raise"] },
      { name: "Day C", exercises: ["Leg press", "Incline dumbbell press", "Seated cable row", "Barbell curl", "Triceps rope pushdown", "Pallof press"] }
    ]
  },
  {
    id: "ppl", name: "Push / Pull / Legs", perWeek: 3,
    who: "Intermediate lifters. Run it twice for 6 days.",
    days: [
      { name: "Push", exercises: ["Barbell bench press", "Overhead press", "Incline dumbbell press", "Dumbbell lateral raise", "Triceps rope pushdown", "Cable fly"] },
      { name: "Pull", exercises: ["Deadlift", "Pull-up", "Seated cable row", "Face pull", "Barbell curl", "Hammer curl"] },
      { name: "Legs", exercises: ["Back squat", "Romanian deadlift", "Leg press", "Leg curl", "Standing calf raise", "Cable crunch"] }
    ]
  },
  {
    id: "ul", name: "Upper / Lower", perWeek: 4,
    who: "4 days a week with more volume per muscle.",
    days: [
      { name: "Upper 1", exercises: ["Barbell bench press", "Barbell row", "Overhead press", "Lat pulldown", "Skull crusher", "Barbell curl"] },
      { name: "Lower 1", exercises: ["Back squat", "Romanian deadlift", "Walking lunge", "Standing calf raise", "Plank"] },
      { name: "Upper 2", exercises: ["Incline dumbbell press", "Pull-up", "Arnold press", "Seated cable row", "Dips", "Hammer curl"] },
      { name: "Lower 2", exercises: ["Deadlift", "Leg press", "Leg curl", "Standing calf raise", "Hanging leg raise"] }
    ]
  }
];

// The three visual styles. Each id matches a block in styles/themes.css.
const STYLES = [
  { id: "plate", name: "Iron Plate" },
  { id: "chalk", name: "Chalkboard" },
  { id: "clean", name: "Clean Studio" }
];

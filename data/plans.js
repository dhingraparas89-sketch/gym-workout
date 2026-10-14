// Weekly workout plans. Each day lists exercise names from data/exercises.js.

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
  { id: "lab", name: "Biomech Lab" },
  { id: "plate", name: "Iron Plate" },
  { id: "chalk", name: "Chalkboard" },
  { id: "clean", name: "Clean Studio" }
];

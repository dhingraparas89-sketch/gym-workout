# Exercise data

Every exercise is one object in the global `EXERCISES` array. The same UI renders any exercise
from its data: cards, filters, search, the 3D scene, muscle activation and form analysis.
Adding an exercise means adding one object (and its `FORM` entry); no new page or code.

Files, in load order:
- `data/exercises.js`: the original exercises, `MUSCLES`, `MUSCLE_INFO`, `GROUPS`, pose helpers.
- `data/form.js`: `FORM[name]`, the form analysis of each exercise.
- `data/library/*.js`: more exercises (`EXERCISES.push(...)`, `Object.assign(FORM, {...})`).
- `data/library/meta.js`: catalog fields for the original exercises, and defaults for any field
  an exercise leaves out. Loaded last.
- `js/kits/*.js`: extra equipment kits (`GYM3D.kits.K.<name> = { build(ctx) }`), reusing
  `GYM3D.kits.lib` (benches, racks, bars, dumbbells, cable towers, handles).

## Fields

```js
{
  name: "Front squat",                 // unique, sentence case; also the FORM key
  group: "legs",                       // main category: chest|back|shoulders|arms|legs|glutes|core
  categories: ["glutes"],              // optional extra categories it also appears under
  equipment: "Barbell",                // display text
  equip: "barbell",                    // filter key: barbell|dumbbell|cable|machine|bodyweight
  setup: "Barbell + squat rack",       // equipment shown in the scene
  difficulty: "intermediate",          // beginner|intermediate|advanced
  movementType: "compound",            // compound|isolation
  sets: 4, reps: "6–8", rest: 150,     // seconds
  primary: ["quads", "glutes"],        // muscle ids from MUSCLES (drive the 3D activation)
  secondary: ["abs", "lower-back"],
  anatomy: { primary: ["Quadriceps", "Gluteus maximus"], secondary: ["Rectus abdominis", "Erector spinae"] },
  activation: { quads: 95, glutes: 80, abs: 50, "lower-back": 55 },   // % per muscle id
  phases: ["Start: ...", "Descent: ...", "Bottom: ...", "Drive: ...", "Return: ..."],
  cues: ["...", "..."],                // recommended cues
  mistakes: ["...", "..."],            // common mistakes
  formChecks: ["Knee alignment", "Hip position", "Spine position", "Depth", "Tempo", "Stability"],
  athlete: "female",                   // featured athlete on cards (both can do every exercise)
  view: [0.62, 0.12],                  // optional camera [yaw, pitch]
  good: { cue, highlight }, bad: { cue, highlight, a?, b? },   // as in data/exercises.js
  figure: { ... },                     // 2D poses a (start) / b (end), see js/figure.js
  figure3d: { kit: "...", ... }        // 3D overrides and equipment kit, see js/figure3d.js
}
```

`FORM[name]`: `{ checks: [4 short strings], error: { type: posture|alignment|range|tempo|activation,
joint, title, detail, fix, compensate: [muscle ids] }, scores: { posture, alignment, range, tempo,
stability, activation } }`. The error is the common mistake the "Your form" view shows; `bad`
in the exercise holds its pose overrides.

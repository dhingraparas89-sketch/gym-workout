# Exercise data

Every exercise is one object in the global `EXERCISES` array. The same UI renders any exercise
from its data: cards, filters, search, the 3D scene, muscle activation and form analysis.
Adding an exercise means adding one object (and its `FORM` entry); no new page or code.

Files, in load order:
- `data/exercises.js`: the original exercises, `MUSCLES`, `MUSCLE_INFO`, `GROUPS`, pose helpers.
- `data/form.js`: `FORM[name]`, the form analysis of each exercise.
- `data/library/*.js`: more exercises (`EXERCISES.push(...)`, `Object.assign(FORM, {...})`).
  The v3 files load after the others and before meta.js: `v3-upper.js`, `v3-lower.js`,
  `v3-core-full.js`, then `v3-fields.js` (v3 fields for the original 69 exercises).
- `data/library/meta.js`: catalog fields for the original exercises, and defaults for any field
  an exercise leaves out. Loaded last.
- `js/kits/*.js`: extra equipment kits (`GYM3D.kits.K.<name> = { build(ctx) }`), reusing
  `GYM3D.kits.lib` (benches, racks, bars, dumbbells, cable towers, handles).
  `js/kits/v3-equipment.js`: kettlebell, plyo box, sled, battle ropes, pec deck / reverse pec deck,
  back-extension bench, rack bar, assisted dip machine, bench under the hands, wall, support post,
  calf step, seated leg curl, Nordic bench, one-dumbbell seat, chest-supported row, pushdown, wrist curl.

## Fields

```js
{
  id: "front-squat",                   // URL slug (#/exercise/<id>); meta.js derives it from name
  name: "Front squat",                 // unique, sentence case; also the FORM key
  aliases: ["..."],                    // optional other names (search), e.g. Deadlift: "Conventional deadlift"
  group: "legs",                       // main category: chest|back|shoulders|arms|legs|glutes|calves|core|fullbody
  categories: ["glutes"],              // optional extra categories it also appears under
  equipment: "Barbell",                // display text
  equip: "barbell",                    // filter key: barbell|dumbbell|kettlebell|cable|machine|bodyweight|other
  setup: "Barbell + squat rack",       // equipment shown in the scene
  difficulty: "intermediate",          // beginner|intermediate|advanced
  movementType: "compound",            // compound|isolation
  pattern: "squat",                    // push|pull|squat|hinge|lunge|carry|rotation|anti-rotation|isolation|plyometric|conditioning
  sets: 4, reps: "6–8", rest: 150,     // seconds
  primary: ["quads", "glutes"],        // muscle ids from MUSCLES (drive the 3D activation)
  secondary: ["abs", "lower-back"],
  stabilizers: ["upper-back"],         // muscles that hold position (estimated); not in primary/secondary
  anatomy: { primary: ["Quadriceps", "Gluteus maximus"], secondary: ["Rectus abdominis", "Erector spinae"] },
  activation: { quads: 95, glutes: 80, abs: 50, "lower-back": 55 },   // estimated involvement, % per muscle id
  phases: ["Start: ...", "Descent: ...", "Bottom: ...", "Drive: ...", "Return: ..."],
  instructions: ["Step one.", "..."],  // numbered how-to steps; meta.js derives them from phases if absent
  alternatives: ["Back squat", "..."], // names of other exercises in the library
  cues: ["...", "..."],                // recommended cues
  mistakes: ["...", "..."],            // common mistakes
  formChecks: ["Knee alignment", "Hip position", "Spine position", "Depth", "Tempo", "Stability"],
  athlete: "female",                   // featured athlete on cards (both can do every exercise)
  view: [0.62, 0.12],                  // optional camera [yaw, pitch]
  camera: { view: "threeQuarter", yaw: 0.62, pitch: 0.12 },  // view: side|threeQuarter|front; defaults from figure3d.view
  phaseTimeline: [{ label: "Descent", t0: 0.1, t1: 0.42 }],  // optional labels in rep-cycle time (0..1, see easeT)
  demo: "ready",                       // ready|beta (beta: approximate, e.g. travelling moves shown in place)
  good: { cue, highlight }, bad: { cue, highlight, a?, b? },   // as in data/exercises.js
  figure: { ... },                     // 2D poses a (start) / b (end), see js/figure.js
  figure3d: { kit: "...", ... }        // 3D overrides and equipment kit, see js/figure3d.js
}
```

`FORM[name]`: `{ checks: [4 short strings], error: { type: posture|alignment|range|tempo|activation,
joint, title, detail, fix, compensate: [muscle ids] }, scores: { posture, alignment, range, tempo,
stability, activation } }`. The error is the common mistake the "Your form" view shows; `bad`
in the exercise holds its pose overrides.

## v3 3D pose options (js/figure3d.js)

- `figure3d.keys: [{ at, fix?, ...pose }]`: extra poses between a and b; the rep passes through
  each in order (`at` in 0..1). `fix: "ankle" | "ankle2" | "hand" | ...` shifts that key so the named
  joint stays where the previous key put it (planted feet or hands). `keysEase: "linear"` for steady
  cycles. `bad3d.keys` gives per-key mistake overrides.
- `ik.fixed`: the hands stay where the start pose puts them (bench, floor, fixed bar). `ik.direct`:
  the hands follow the 2D pose. `ik.only: "R"`: only that arm uses IK (the other uses `arm2`).
  `ik.reach`: scales the reach from the shoulder (straightens hanging arms).
- Pose fields: `shrug` (cm, shoulder elevation), `wrist` (deg, wrist flexion), `flat` (0..1, hand
  opens flat), `arm2: { ua, fa, abd? }` (far arm angles).
- The mistake view (`bad`/`bad3d`) is an instructional example of a common mistake; it should
  change only the joint(s) its `highlight` names.
